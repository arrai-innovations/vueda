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

    def test_one_action_carries_both_of_its_events(self, reader_client, written):
        distributor, product = written
        group = self.history(reader_client, distributor)["results"][0]

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
        group = self.history(reader_client, distributor)["results"][0]
        event = group["events"][0]

        model, _, event_id = event["id"].rpartition(":")
        assert model == "store.Distributor", "the tracked model, never the event model"
        assert event_id.isdigit()

    def test_an_update_reports_only_the_fields_that_changed(self, reader_client, written):
        distributor, _ = written
        group = self.history(reader_client, distributor)["results"][0]
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

        assert results[0]["events"][1]["changes"] == [], "an insert has no preceding snapshot"
        assert results[1]["events"][0]["changes"] == []

    def test_a_write_outside_an_action_is_its_own_group(self, reader_client, written):
        distributor, _ = written
        create = self.history(reader_client, distributor)["results"][1]

        assert create["action_id"] is None
        assert create["kind"] is None
        assert create["label"] is None
        assert create["actor"] is None
        assert len(create["events"]) == 1
        assert create["id"] == create["events"][0]["id"], "the single event's identifier keys the group"

    def test_the_group_time_is_its_earliest_event(self, reader_client, written):
        distributor, _ = written
        group = self.history(reader_client, distributor)["results"][0]

        assert group["recorded_at"] == min(event["recorded_at"] for event in group["events"])

    def test_a_request_records_its_actor_kind_and_action_name(self, reader_client, reader, written):
        distributor, _ = written
        response = reader_client.patch(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"description": "Fine widgets since 1986."},
            format="json",
        )
        assert response.status_code == HTTPStatus.OK, response_body(response)

        group = self.history(reader_client, distributor)["results"][0]

        assert group["kind"] == "request"
        assert group["label"] == "partial_update"
        assert group["actor"] == {"id": reader.pk, "display": reader.formatted_name, "missing": False}
