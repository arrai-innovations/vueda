"""The action-grouped history response contract.

One action that renamed a distributor and added one of its products, read as the distributor's
history. These assertions are the public contract, so changing one changes the response an
integrator depends on.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from vueda.core.audit import audited_action


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
