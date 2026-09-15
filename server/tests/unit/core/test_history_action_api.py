"""The action-grouped history response contract.

One action that renamed a distributor and added one of its products, read as the distributor's
history. These assertions are the public contract, so changing one changes the response an
integrator depends on.
"""

from datetime import timedelta
from http import HTTPStatus
from typing import ClassVar
from unittest import mock

import pgtrigger
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import NoReverseMatch
from django.urls import reverse
from django.utils import timezone

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import viewsets as store_viewsets
from vueda.core.audit import audited_action
from vueda.core.permissions import check_action_permission
from vueda.core.utils import AvailableActionsRequest
from vueda.workflow.models import StatePermission


@pytest.mark.django_db
class TestHistoryActionGroups(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """One action that writes two models is one group carrying both events."""

    groups_to_create: ClassVar[dict] = {
        "History Reader": [
            ("store", "Distributor", "read"),
            ("store", "Distributor", "update"),
            ("store", "Product", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "history_reader@domain.invalid": {
            "name": "History Reader",
            "password": "testpass",
            "groups": ["History Reader"],
        },
    }

    @pytest.fixture
    def reader(self):
        return self.users["history_reader@domain.invalid"]

    @pytest.fixture
    def reader_client(self, api_client, reader):
        api_client.force_authenticate(user=reader)
        return api_client

    @pytest.fixture
    def written(self):
        """A create with no action, then one action that updates it and adds a related row."""
        distributor = store_models.Distributor.objects.create(
            name="Widget Co.",
            description="Fine widgets since 1984.",
        )
        with audited_action("distributor.restock", kind="command"):
            distributor.description = "Fine widgets since 1985."
            distributor.save()
            product = store_models.Product.objects.create(
                name="Stuffed Animal",
                description="Soft and fluffy.",
                quantity=10,
                distributor=distributor,
                order_between=[1, 3],
                tangible_type=store_models.TangibleType.objects.get(code="physical"),
                condition="new",
            )
        return distributor, product

    def history(self, client, distributor):
        response = client.get(reverse("store.distributor-history-list", kwargs={"pk": distributor.pk}))
        self.assert_response(response, HTTPStatus.OK)
        return response.data

    def test_the_page_uses_vuedas_pagination_envelope(self, reader_client, written):
        distributor, _ = written
        data = self.history(reader_client, distributor)

        assert set(data) == {"results", "columnTotals", "perPage", "totalPages", "totalRecords"}
        assert data["totalRecords"] == 2, "one action group plus the context-less create"  # noqa: PLR2004
        assert data["totalPages"] == 1

    def test_groups_are_newest_first(self, reader_client, written):
        distributor, _ = written
        results = self.history(reader_client, distributor)["results"]

        assert [group["label"] for group in results] == ["distributor.restock", None]

    def test_group_order_is_stable(self, reader_client, written):
        """A page boundary must land in the same place on every request."""
        distributor, _ = written
        first = [group["id"] for group in self.history(reader_client, distributor)["results"]]
        second = [group["id"] for group in self.history(reader_client, distributor)["results"]]

        assert first == second

    def action_group(self, client, distributor, label):
        results = self.history(client, distributor)["results"]
        return next(row for row in results if row["label"] == label)

    def test_one_action_carries_both_of_its_events(self, reader_client, written):
        distributor, product = written
        group = self.action_group(reader_client, distributor, "distributor.restock")

        assert group["action_id"] is not None
        assert group["id"] == group["action_id"]
        assert group["kind"] == "command"
        assert group["label"] == "distributor.restock"
        assert group["actor"] is None, "an action outside a request records no user"
        assert [(event["model"], event["type"], event["relation"]) for event in group["events"]] == [
            ("store.Distributor", "updated", "self"),
            ("store.Product", "created", "related"),
        ]
        assert [event["object_id"] for event in group["events"]] == [str(distributor.pk), str(product.pk)]

    def test_an_event_identifier_names_the_tracked_model(self, reader_client, written):
        distributor, _ = written
        group = self.action_group(reader_client, distributor, "distributor.restock")
        event = group["events"][0]

        model, _, event_id = event["id"].rpartition(":")
        assert model == "store.Distributor", "the tracked model, never the event model"
        assert event_id.isdigit()

    def test_an_update_reports_only_the_fields_that_changed(self, reader_client, written):
        distributor, _ = written
        group = self.action_group(reader_client, distributor, "distributor.restock")
        update = group["events"][0]

        assert update["changes"] == [
            {
                "field": "description",
                "old": "Fine widgets since 1984.",
                "new": "Fine widgets since 1985.",
            }
        ]

    def test_a_create_reports_no_changes(self, reader_client, written):
        distributor, _ = written
        results = self.history(reader_client, distributor)["results"]
        action = next(row for row in results if row["label"] == "distributor.restock")
        create = next(row for row in results if row["label"] is None)

        assert action["events"][1]["changes"] == [], "an insert has no preceding snapshot"
        assert create["events"][0]["changes"] == []

    def test_a_write_outside_an_action_is_its_own_group(self, reader_client, written):
        distributor, _ = written
        results = self.history(reader_client, distributor)["results"]
        create = next(row for row in results if row["action_id"] is None)

        assert create["action_id"] is None
        assert create["kind"] is None
        assert create["label"] is None
        assert create["actor"] is None
        assert len(create["events"]) == 1
        assert create["id"] == create["events"][0]["id"], "the single event's identifier keys the group"

    def test_the_group_time_is_its_earliest_event(self, reader_client, written):
        distributor, _ = written
        group = self.action_group(reader_client, distributor, "distributor.restock")

        assert group["recorded_at"] == min(event["recorded_at"] for event in group["events"])

    def test_events_follow_the_order_they_were_written(self, reader_client, reader):
        """Write the later-named model first, so alphabetical order would give the wrong answer.

        Each event carries the moment of its own write, not its transaction's start, which is what
        lets one action's events be ordered at all.
        """
        distributor = store_models.Distributor.objects.create(name="Order Co.", description="First.")
        with audited_action("distributor.reorder", kind="command"):
            store_models.Product.objects.create(
                name="Written First",
                description="A product created before the distributor changed.",
                quantity=1,
                distributor=distributor,
                order_between=[1, 2],
                tangible_type=store_models.TangibleType.objects.get(code="physical"),
                condition="new",
            )
            distributor.description = "Second."
            distributor.save()

        group = self.action_group(reader_client, distributor, "distributor.reorder")

        assert [event["model"] for event in group["events"]] == ["store.Product", "store.Distributor"]

    def test_a_request_records_its_actor_kind_and_action_name(self, reader_client, reader, written):
        distributor, _ = written
        response = reader_client.patch(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"description": "Fine widgets since 1986."},
            format="json",
        )
        assert response.status_code == HTTPStatus.OK, response_body(response)

        results = self.history(reader_client, distributor)["results"]
        group = next(row for row in results if row["label"] == "partial_update")

        assert group["kind"] == "request"
        assert group["label"] == "partial_update"
        assert group["actor"] == {"id": reader.pk, "display": reader.formatted_name, "missing": False}

    def test_repeated_updates_in_one_action_are_separate_events(self, reader_client, reader, written):
        distributor, _ = written
        with audited_action("distributor.rename", kind="command"):
            distributor.name = "Widget Co. Ltd."
            distributor.save()
            distributor.name = "Widget Company Ltd."
            distributor.save()
        group = self.action_group(reader_client, distributor, "distributor.rename")

        assert [(event["relation"], event["type"]) for event in group["events"]] == [("self", "updated")] * 2
        # The generated formatted_name column changes alongside name, so pick the name change out.
        assert [[c for c in event["changes"] if c["field"] == "name"] for event in group["events"]] == [
            [{"field": "name", "old": "Widget Co.", "new": "Widget Co. Ltd."}],
            [{"field": "name", "old": "Widget Co. Ltd.", "new": "Widget Company Ltd."}],
        ]

    def test_a_deleted_actor_is_marked_missing(self, reader_client, written):
        distributor, _ = written
        actor = get_user_model().objects.create_user(email="gone@domain.invalid", name="Gone", password="x")
        actor_pk = actor.pk
        with audited_action("distributor.touch", kind="request", user=actor_pk):
            distributor.description = "Touched by someone who has since left."
            distributor.save()
        actor.delete()
        group = self.action_group(reader_client, distributor, "distributor.touch")

        assert group["actor"] == {"id": actor_pk, "display": None, "missing": True}

    def record_event(self, instance, recorded_at):
        """Write an event row directly, as a replay of older history would, with a chosen time.

        ``pgh_created_at`` is ``auto_now_add``, so the time is set after the insert, inside the
        named append-only ignore the purge guide uses.
        """
        event_model = type(instance).pgh_event_model
        snapshot = {field.attname: getattr(instance, field.attname) for field in type(instance)._meta.concrete_fields}
        event = event_model.objects.create(pgh_label="update", pgh_obj_id=instance.pk, **snapshot)
        with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
            event_model.objects.filter(pk=event.pk).update(pgh_created_at=recorded_at)
        return event

    def test_groups_sharing_a_time_order_by_their_earliest_event(self, reader_client, written):
        """The published tie rule: tracked model label, then numeric event id, never the id as text."""
        distributor, product = written
        # A moment no recorded group shares, so the tie is only among the three written here.
        same_moment = timezone.now() - timedelta(days=1)
        # Written in the reverse of the expected order, so insertion order cannot pass this by luck.
        later_id = self.record_event(distributor, same_moment)
        product_event = self.record_event(product, same_moment)
        earlier_id = self.record_event(distributor, same_moment)
        assert earlier_id.pgh_id > later_id.pgh_id, "the test needs the higher id written first"

        results = self.history(reader_client, distributor)["results"]
        tied = [group["id"] for group in results if group["recorded_at"] == results[-1]["recorded_at"]]

        assert tied == [
            f"store.Distributor:{later_id.pgh_id}",
            f"store.Distributor:{earlier_id.pgh_id}",
            f"store.Product:{product_event.pgh_id}",
        ]

    def test_history_requires_authentication(self, api_client, written):
        distributor, _ = written
        response = api_client.get(reverse("store.distributor-history-list", kwargs={"pk": distributor.pk}))

        assert response.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED), response_body(response)

    def test_an_action_never_splits_across_pages(self, reader_client, written):
        """The page unit is the action, so a group is whole or absent."""
        distributor, _ = written
        url = reverse("store.distributor-history-list", kwargs={"pk": distributor.pk})

        first = reader_client.get(url, data={"ps": 1, "p": 1})
        second = reader_client.get(url, data={"ps": 1, "p": 2})
        self.assert_response(first, HTTPStatus.OK)
        self.assert_response(second, HTTPStatus.OK)

        assert first.data["totalRecords"] == 2, "two groups, not three events"  # noqa: PLR2004
        assert len(first.data["results"]) == 1
        assert len(second.data["results"]) == 1

        action = next(
            row for row in first.data["results"] + second.data["results"] if row["label"] == "distributor.restock"
        )
        assert len(action["events"]) == 2, "both of the action's events stayed together"  # noqa: PLR2004


@pytest.mark.django_db
class TestHistoryReferenceValues(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """A field that points at another row publishes that row structurally, not as text.

    The reader can read product options but not option types. The display names still resolve,
    because a value inside an authorized event is part of that event. The ordinary object read
    behaves the same way: it resolves related display names without a second permission check.
    """

    groups_to_create: ClassVar[dict] = {
        "Product Option Reader": [
            ("store", "ProductOption", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "option_reader@domain.invalid": {
            "name": "Option Reader",
            "password": "testpass",
            "groups": ["Product Option Reader"],
        },
    }

    @pytest.fixture
    def reader_client(self, api_client):
        api_client.force_authenticate(user=self.users["option_reader@domain.invalid"])
        return api_client

    @pytest.fixture
    def size(self):
        return store_models.OptionType.objects.get(code="size")

    @pytest.fixture
    def colour(self):
        return store_models.OptionType.objects.get(code="colour")

    @pytest.fixture
    def product_option(self, size, colour):
        distributor = store_models.Distributor.objects.create(
            name="FK Test Distributor",
            description="Used for the reference test.",
        )
        product = store_models.Product.objects.create(
            distributor=distributor,
            name="FK Test Product",
            tangible_type=store_models.TangibleType.objects.get(code="physical"),
            order_between=(1, 10),
        )
        product_option = store_models.ProductOption.objects.create(
            product=product,
            option_type=size,
            name="Test Option",
            sku="FKTEST-001",
            gtin="0000000000001",
            price="9.99",
        )
        with audited_action("option.recategorize", kind="command"):
            product_option.option_type = colour
            product_option.save()
        return product_option

    def change_of(self, client, product_option, field):
        response = client.get(reverse("store.productoption-history-list", kwargs={"pk": product_option.pk}))
        self.assert_response(response, HTTPStatus.OK)
        group = next(row for row in response.data["results"] if row["label"] == "option.recategorize")
        return next(change for change in group["events"][0]["changes"] if change["field"] == field)

    def test_a_reference_carries_its_id_and_current_display(self, reader_client, product_option, size, colour):
        change = self.change_of(reader_client, product_option, "option_type")

        assert change["old"] == {"id": size.pk, "display": size.formatted_name, "missing": False}
        assert change["new"] == {"id": colour.pk, "display": colour.formatted_name, "missing": False}

    def test_a_referent_the_requester_cannot_read_still_resolves(self, reader_client, product_option):
        """The reader holds no option type permission, and the live object read shows these too."""
        reader = self.users["option_reader@domain.invalid"]
        assert not reader.has_perm("store.read_optiontype")

        change = self.change_of(reader_client, product_option, "option_type")

        assert change["old"]["display"] is not None
        assert change["new"]["display"] is not None

    def test_a_deleted_referent_is_marked_missing(self, reader_client, product_option, size):
        """The client owns the wording, so the server publishes the absence structurally."""
        size_pk = size.pk
        size.delete()

        change = self.change_of(reader_client, product_option, "option_type")

        assert change["old"] == {"id": size_pk, "display": None, "missing": True}
        assert change["new"]["missing"] is False


@pytest.mark.django_db
class TestHistoryVisibility(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """An event the requester may not read is removed before pagination and leaves no trace.

    A customer's history reaches two related models with different rules. A cart has no row
    rules, so its events follow model-level read alone and survive the cart's deletion. An order
    participates in a workflow, so its events follow the row's current state and vanish with it.
    """

    groups_to_create: ClassVar[dict] = {
        "Customer Reader": [
            ("store", "Customer", "read"),
            ("store", "Cart", "read"),
            ("store", "CustomerOrder", "read"),
        ],
        "Customer Only": [
            ("store", "Customer", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "full_reader@domain.invalid": {"name": "Full Reader", "password": "testpass", "groups": ["Customer Reader"]},
        "customer_only@domain.invalid": {"name": "Customer Only", "password": "testpass", "groups": ["Customer Only"]},
        "the_customer@domain.invalid": {"name": "The Customer", "password": "testpass", "groups": []},
    }

    @pytest.fixture
    def written(self):
        """A customer, then one action that creates a cart and an order for it.

        The onboarding action writes only related rows, so a requester who may read none of them
        must not see the action at all.
        """
        customer = store_models.Customer.objects.create(user=self.users["the_customer@domain.invalid"])
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        with audited_action("customer.onboard", kind="command"):
            cart = store_models.Cart.objects.create(customer=customer)
            order = store_models.CustomerOrder.objects.create(
                order_number=1001, customer=customer, order_state=order_state, shipping_method="free"
            )
        return customer, cart, order

    def history(self, client, email, customer):
        client.force_authenticate(user=get_user_model().objects.get(email=email))
        response = client.get(reverse("store.customer-history-list", kwargs={"pk": customer.pk}))
        self.assert_response(response, HTTPStatus.OK)
        return response.data

    @staticmethod
    def models_seen(data):
        return [(event["model"], event["type"]) for group in data["results"] for event in group["events"]]

    def test_a_reader_of_every_model_sees_every_event(self, api_client, written):
        customer, _, _ = written
        data = self.history(api_client, "full_reader@domain.invalid", customer)

        assert data["totalRecords"] == 2, "the onboarding action plus the context-less create"  # noqa: PLR2004
        assert self.models_seen(data) == [
            ("store.Cart", "created"),
            ("store.CustomerOrder", "created"),
            ("store.Customer", "created"),
        ]

    def test_a_related_event_needs_model_level_read(self, api_client, written):
        customer, cart, _ = written
        with audited_action("cart.reserve", kind="command"):
            cart.reserved_until = "12:00"
            cart.save()

        data = self.history(api_client, "customer_only@domain.invalid", customer)

        assert self.models_seen(data) == [("store.Customer", "created")]
        assert data["totalRecords"] == 1, "a group whose only events are hidden does not count"
        assert [group["label"] for group in data["results"]] == [None], "nor does it appear"

    def test_a_state_denied_related_row_hides_its_events(self, api_client, written):
        customer, _, order = written
        StatePermission.objects.create(
            state=order.object_state.state,
            permission=Permission.objects.get(codename="read_customerorder", content_type__app_label="store"),
            group=Group.objects.get(name="Customer Reader"),
            grant_or_deny=False,
        )

        data = self.history(api_client, "full_reader@domain.invalid", customer)

        assert ("store.CustomerOrder", "created") not in self.models_seen(data)
        assert ("store.Cart", "created") in self.models_seen(data), "the deny reaches only the order"

    def test_a_deleted_row_without_row_rules_keeps_its_events(self, api_client, written):
        customer, cart, _ = written
        cart_pk = cart.pk
        with audited_action("cart.abandon", kind="command"):
            cart.delete()

        data = self.history(api_client, "full_reader@domain.invalid", customer)
        abandon = next(group for group in data["results"] if group["label"] == "cart.abandon")

        assert self.models_seen(data).count(("store.Cart", "created")) == 1
        assert [(e["model"], e["type"], e["relation"], e["object_id"], e["changes"]) for e in abandon["events"]] == [
            ("store.Cart", "deleted", "related", str(cart_pk), [])
        ]

    def test_a_deleted_row_with_row_rules_loses_its_events(self, api_client, written):
        customer, _, order = written
        with audited_action("order.void", kind="command"):
            order.delete()

        data = self.history(api_client, "full_reader@domain.invalid", customer)

        assert "store.CustomerOrder" not in {model for model, _ in self.models_seen(data)}
        assert "order.void" not in [group["label"] for group in data["results"]], (
            "a group left with no visible event does not appear"
        )
        assert data["totalRecords"] == 2, "onboarding still shows its cart event"  # noqa: PLR2004


@pytest.mark.django_db
class TestHistoryQueryCost(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """A page must cost the same whether it carries one change or a hundred.

    Grouping and reference resolution both happen in bulk, so the reads a page needs depend on the
    shape of the models, not on how much history exists.
    """

    groups_to_create: ClassVar[dict] = {
        "Cost Reader": [
            ("store", "Distributor", "read"),
            ("store", "Product", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "cost_reader@domain.invalid": {
            "name": "Cost Reader",
            "password": "testpass",
            "groups": ["Cost Reader"],
        },
    }

    @pytest.fixture
    def reader_client(self, api_client):
        api_client.force_authenticate(user=self.users["cost_reader@domain.invalid"])
        return api_client

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(name="Cost Co.", description="Start.")

    def add_actions(self, distributor, count, prefix):
        """Each action updates the distributor and adds one of its products."""
        for index in range(count):
            with audited_action(f"{prefix}.{index}", kind="command"):
                distributor.description = f"{prefix} revision {index}."
                distributor.save()
                store_models.Product.objects.create(
                    name=f"{prefix} product {index}",
                    description="Bulk resolution fodder.",
                    quantity=index,
                    distributor=distributor,
                    order_between=[1, 2],
                    tangible_type=store_models.TangibleType.objects.get(code="physical"),
                    condition="new",
                )

    def read_history(self, client, distributor):
        # A fresh user object each time, because Django caches permissions on the one it checked,
        # which would otherwise make the second read look cheaper than the first.
        client.force_authenticate(user=get_user_model().objects.get(email="cost_reader@domain.invalid"))
        response = client.get(reverse("store.distributor-history-list", kwargs={"pk": distributor.pk}))
        self.assert_response(response, HTTPStatus.OK)
        return response.data

    def test_a_page_costs_the_same_however_many_events_it_carries(self, reader_client, distributor):
        self.add_actions(distributor, 2, "small")
        with CaptureQueriesContext(connection) as small:
            small_data = self.read_history(reader_client, distributor)

        self.add_actions(distributor, 8, "large")
        with CaptureQueriesContext(connection) as large:
            large_data = self.read_history(reader_client, distributor)

        assert small_data["totalRecords"] == 3, "two actions plus the context-less create"  # noqa: PLR2004
        assert large_data["totalRecords"] == 11  # noqa: PLR2004
        assert sum(len(group["events"]) for group in large_data["results"]) > sum(
            len(group["events"]) for group in small_data["results"]
        ), "the larger page really does carry more events"
        assert len(large.captured_queries) == len(small.captured_queries), (
            "a page of history must not cost one query per event or per referenced row"
        )


@pytest.mark.django_db
class TestOptedOutModels:
    """A model that records no history offers none, rather than an endpoint that fails."""

    def test_a_tracked_model_offers_the_history_action(self):
        from tests.store import viewsets as store_viewsets

        names = {action.__name__ for action in store_viewsets.DistributorViewSet.get_extra_actions()}
        assert "history_list" in names

    def test_an_opted_out_model_offers_no_history_action(self):
        from tests.store import viewsets as store_viewsets

        names = {action.__name__ for action in store_viewsets.OrderItemCompositePKViewSet.get_extra_actions()}
        assert "history_list" not in names

    def test_an_opted_out_model_has_no_history_route(self):
        reverse("store.orderitemcompositepk-detail", kwargs={"pk": "1,1"})  # the model is routed
        with pytest.raises(NoReverseMatch):
            reverse("store.orderitemcompositepk-history-list", kwargs={"pk": "1,1"})


@pytest.mark.django_db
class TestHistoryActionObjectAvailability(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """
    An object's own ``available_actions`` follows read authorization for ``history-list``,
    independently of whichever action produced the response carrying that object. Reproduces
    #280 at the per-object discovery path: a write response must not let the write's own
    permission stand in for read.
    """

    groups_to_create: ClassVar[dict] = {
        "Distributor Updater": [
            ("store", "Distributor", "update"),
        ],
        "Distributor Update Reader": [
            ("store", "Distributor", "update"),
            ("store", "Distributor", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "updater@domain.invalid": {
            "name": "Updater",
            "password": "testpass",
            "groups": ["Distributor Updater"],
        },
        "update_reader@domain.invalid": {
            "name": "Update Reader",
            "password": "testpass",
            "groups": ["Distributor Update Reader"],
        },
    }

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(name="Widget Co.", description="Fine widgets.")

    def patch_description(self, client, distributor):
        response = client.patch(
            reverse(
                "store.distributor-detail",
                kwargs={"pk": distributor.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "available_actions"},
            ),
            data={"description": "Fine widgets, updated."},
            format="json",
        )
        self.assert_response(response, HTTPStatus.OK)
        return response.data

    def test_update_permission_alone_does_not_grant_history_access(self, api_client, distributor):
        api_client.force_authenticate(user=self.users["updater@domain.invalid"])

        data = self.patch_description(api_client, distributor)

        assert "history-list" not in data["available_actions"]

    def test_read_permission_grants_history_access_on_a_write_response(self, api_client, distributor):
        api_client.force_authenticate(user=self.users["update_reader@domain.invalid"])

        data = self.patch_description(api_client, distributor)

        assert "history-list" in data["available_actions"]

    def test_direct_history_request_denied_without_read_permission(self, api_client, distributor):
        """Endpoint enforcement is unchanged by this fix -- only its advertisement was wrong."""
        api_client.force_authenticate(user=self.users["updater@domain.invalid"])

        response = api_client.get(reverse("store.distributor-history-list", kwargs={"pk": distributor.pk}))

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    def test_direct_history_request_succeeds_with_read_permission(self, api_client, distributor):
        api_client.force_authenticate(user=self.users["update_reader@domain.invalid"])

        response = api_client.get(reverse("store.distributor-history-list", kwargs={"pk": distributor.pk}))

        self.assert_response(response, HTTPStatus.OK)


@pytest.mark.django_db
class TestHistoryActionObjectAvailabilityUnderWorkflowState(
    BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin
):
    """
    An object's own workflow state overrides its model-level read permission for
    ``history-list`` availability, the same as it overrides read for any other purpose.
    Reproduces #280's object-level-restriction acceptance criterion: model-level permission
    alone must not decide a specific object's ``history-list`` availability when that object's
    current state says otherwise.
    """

    groups_to_create: ClassVar[dict] = {
        "Order Reader": [
            ("store", "CustomerOrder", "read"),
            ("store", "CustomerOrder", "list"),
        ],
        "Order Non Reader": [],
    }

    users_to_create: ClassVar[dict] = {
        "reader@domain.invalid": {
            "name": "Reader",
            "password": "testpass",
            "groups": ["Order Reader"],
        },
        "non_reader@domain.invalid": {
            "name": "Non Reader",
            "password": "testpass",
            "groups": ["Order Non Reader"],
        },
        "the_customer@domain.invalid": {"name": "The Customer", "password": "testpass", "groups": []},
    }

    @pytest.fixture
    def order(self):
        customer = store_models.Customer.objects.create(user=self.users["the_customer@domain.invalid"])
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=1001, customer=customer, order_state=order_state, shipping_method="free"
        )

    def available_actions(self, client, order):
        response = client.get(
            reverse(
                "store.customerorder-detail",
                kwargs={"pk": order.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "available_actions"},
            ),
        )
        self.assert_response(response, HTTPStatus.OK)
        return response.data["available_actions"]

    def test_a_state_denial_overrides_model_level_read(self, api_client, order):
        """
        A state-denied object is unreadable outright -- its own detail response 404s, the same as
        any other state-denied read. Its row-level availability is instead observed through a list
        response, which does not 404 a single denied row the way a detail retrieve does.
        """
        StatePermission.objects.create(
            state=order.object_state.state,
            permission=Permission.objects.get(codename="read_customerorder", content_type__app_label="store"),
            group=Group.objects.get(name="Order Reader"),
            grant_or_deny=False,
        )
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        detail_response = api_client.get(reverse("store.customerorder-detail", kwargs={"pk": order.pk}))
        self.assert_response(detail_response, HTTPStatus.NOT_FOUND)

        list_response = api_client.get(
            reverse(
                "store.customerorder-list",
                query={
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,available_actions",
                    settings.REST_FRAMEWORK["ORDERING_PARAM"]: "order_number",
                },
            ),
        )
        self.assert_response(list_response, HTTPStatus.OK)
        row = next(row for row in list_response.data["results"] if row["id"] == order.pk)

        assert "history-list" not in row["available_actions"]

    def test_a_state_grant_overrides_a_model_level_denial(self, api_client, order):
        StatePermission.objects.create(
            state=order.object_state.state,
            permission=Permission.objects.get(codename="read_customerorder", content_type__app_label="store"),
            group=Group.objects.get(name="Order Non Reader"),
            grant_or_deny=True,
        )
        api_client.force_authenticate(user=self.users["non_reader@domain.invalid"])

        assert "history-list" in self.available_actions(api_client, order)


@pytest.mark.django_db
class TestAvailableActionsQueryCost(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """
    ``available_actions`` must not cost anything on a response that doesn't carry it, and the
    ``history-list`` read gate must reuse the CRUD loop's own ``retrieve`` decision for the same
    row rather than running a second permission pass for it.

    ``store.customerorder`` is under the ``order_fulfillment`` workflow, so its ``retrieve`` check
    resolves through ``has_matching_state_grant`` / ``check_state_permission``, the exact path a
    duplicate permission pass would pay for twice. That is the model and the workflow-state-grant
    shape PR #288's review measured its query-cost numbers against.
    """

    groups_to_create: ClassVar[dict] = {
        # "list" is a static grant so the list endpoint itself is reachable; "read" comes only
        # from the workflow-state grant each test row shares, so every row's own retrieve check
        # -- and therefore its history-list gate -- goes through has_matching_state_grant.
        "Order Non Reader": [
            ("store", "CustomerOrder", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "non_reader@domain.invalid": {
            "name": "Non Reader",
            "password": "testpass",
            "groups": ["Order Non Reader"],
        },
        "the_customer@domain.invalid": {"name": "The Customer", "password": "testpass", "groups": []},
    }

    def make_orders(self, count, order_state, start_at):
        if not hasattr(self, "_customer"):
            self._customer = store_models.Customer.objects.create(user=self.users["the_customer@domain.invalid"])
        customer = self._customer
        return [
            store_models.CustomerOrder.objects.create(
                order_number=start_at + index, customer=customer, order_state=order_state, shipping_method="free"
            )
            for index in range(count)
        ]

    def grant_read_by_state(self, order):
        self.users  # noqa: B018 -- creates groups_to_create's groups before Group.objects.get() below
        StatePermission.objects.create(
            state=order.object_state.state,
            permission=Permission.objects.get(codename="read_customerorder", content_type__app_label="store"),
            group=Group.objects.get(name="Order Non Reader"),
            grant_or_deny=True,
        )

    def list_query_count(self, client, fields):
        # A fresh user object each time, because Django caches permissions on the one it checked,
        # which would otherwise make a later read look cheaper than the first (see
        # TestHistoryQueryCost.read_history for the same concern).
        client.force_authenticate(user=get_user_model().objects.get(email="non_reader@domain.invalid"))
        with CaptureQueriesContext(connection) as ctx:
            response = client.get(
                reverse(
                    "store.customerorder-list",
                    query={
                        settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: fields,
                        settings.REST_FRAMEWORK["ORDERING_PARAM"]: "order_number",
                    },
                ),
            )
        self.assert_response(response, HTTPStatus.OK)
        return len(ctx.captured_queries)

    def test_a_response_without_available_actions_costs_the_same_at_any_row_count(self, api_client):
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        first_order = self.make_orders(1, order_state, start_at=999)[0]
        self.grant_read_by_state(first_order)

        self.make_orders(2, order_state, start_at=1000)
        small = self.list_query_count(api_client, "id")

        self.make_orders(6, order_state, start_at=2000)
        large = self.list_query_count(api_client, "id")

        assert large == small, (
            "a response that never carries available_actions must not pay its per-row permission "
            "cost -- computing the field and discarding it afterward would grow with row count"
        )

    def test_the_history_list_gate_reuses_the_crud_loops_retrieve_check(self):
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        order = self.make_orders(1, order_state, start_at=999)[0]
        self.grant_read_by_state(order)

        user = get_user_model().objects.get(email="non_reader@domain.invalid")
        request = AvailableActionsRequest(user=user)
        viewset = store_viewsets.CustomerOrderViewSet()

        with CaptureQueriesContext(connection) as first_check:
            permitted = check_action_permission(viewset, request, order, "retrieve")
        assert permitted is True
        assert len(first_check.captured_queries) > 0, "the first check must actually touch the database"

        with CaptureQueriesContext(connection) as second_check:
            permitted_again = check_action_permission(viewset, request, order, "retrieve")
        assert permitted_again is True
        assert len(second_check.captured_queries) == 0, (
            "a second check for the same (action, instance) on the same viewset instance must be "
            "served from cache -- this is what lets history-list availability reuse the CRUD loop's "
            "own retrieve check instead of running a second permission pass for the same row"
        )

    def test_the_cache_is_not_shared_across_different_actions_or_instances(self):
        """
        A cache key too coarse to separate actions or instances would still pass a test that only
        ever asks the identical question twice. Guards specifically against that: a *different*
        action for the same row, and the *same* action for a *different* row, must each still
        reach the database, not silently reuse another entry's answer.
        """
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        order_a, order_b = self.make_orders(2, order_state, start_at=999)
        self.grant_read_by_state(order_a)

        user = get_user_model().objects.get(email="non_reader@domain.invalid")
        request = AvailableActionsRequest(user=user)
        viewset = store_viewsets.CustomerOrderViewSet()

        assert check_action_permission(viewset, request, order_a, "retrieve") is True

        with CaptureQueriesContext(connection) as different_action:
            check_action_permission(viewset, request, order_a, "list")
        assert len(different_action.captured_queries) > 0, (
            "checking a different action for the same row must not be served from retrieve's cache entry"
        )

        with CaptureQueriesContext(connection) as different_instance:
            check_action_permission(viewset, request, order_b, "retrieve")
        assert len(different_instance.captured_queries) > 0, (
            "checking the same action for a different row must not be served from order_a's cache entry"
        )

    def test_the_crud_loop_and_the_history_list_gate_check_retrieve_on_the_same_viewset_instance(self, api_client):
        """
        The cache-sharing unit test above assumes the CRUD loop behind ``available_actions``
        (``AvailableActionsField.get_value``) and the history-list gate
        (``VuedaViewSet.get_allowed_extra_actions`` / ``_read_permitted``) check ``retrieve`` on
        the very same viewset instance -- that assumption is what makes the cache in
        ``check_action_permission`` actually pay off. This test drives a real detail request
        through both call sites and verifies that assumption holds in production, rather than
        only in a test that constructs the shared instance by hand.
        """
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        order = self.make_orders(1, order_state, start_at=999)[0]
        self.grant_read_by_state(order)
        api_client.force_authenticate(user=get_user_model().objects.get(email="non_reader@domain.invalid"))

        retrieve_calls = []

        def spy(viewset, request, instance, action):
            if action == "retrieve" and instance is not None and instance.pk == order.pk:
                retrieve_calls.append(id(viewset))
            return check_action_permission(viewset, request, instance, action)

        with (
            mock.patch("vueda.core.serializers.fields.check_action_permission", side_effect=spy),
            mock.patch("vueda.core.viewsets.check_action_permission", side_effect=spy),
        ):
            response = api_client.get(
                reverse(
                    "store.customerorder-detail",
                    kwargs={"pk": order.pk},
                    query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "available_actions"},
                ),
            )
        self.assert_response(response, HTTPStatus.OK)
        assert "history-list" in response.data["available_actions"]

        assert len(retrieve_calls) >= 2, (  # noqa: PLR2004
            "expected both the CRUD loop and the history-list gate to check retrieve for this row"
        )
        assert len(set(retrieve_calls)) == 1, (
            "the CRUD loop and the history-list gate checked retrieve on different viewset instances "
            "-- check_action_permission's per-instance cache cannot pay off across them"
        )
