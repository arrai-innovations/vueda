"""An object's workflow state changes in its ``history-list`` response.

A customer order on the ``order_fulfillment`` workflow, read as the order's own history. A state
change is an event with ``relation: "state"``, and it shares one action with the other writes of
the transition that caused it.
"""

from decimal import Decimal
from http import HTTPStatus
from typing import ClassVar
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.db import connection
from django.db.models import Q
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.core.audit import audited_action
from vueda.core.utils import get_system_user
from vueda.workflow.models import ObjectState
from vueda.workflow.models import State
from vueda.workflow.models import WorkflowPermission


def set_regular_shipping(self, transition, user=None, dry_run=False):
    """An ``on_transition`` hook that edits the object it moves."""
    self.shipping_method = "regular"
    self.save()


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestWorkflowStateHistory(BaseTestAssertResponseMixin, BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {}
    users_to_create: ClassVar[dict] = {
        "state-history-manager@domain.invalid": {
            "name": "Order Manager",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        },
        "state-history-reader@domain.invalid": {
            "name": "Order Reader",
            "password": "password",
            "groups": ["Order Readers"],
        },
        "state-history-outsider@domain.invalid": {
            "name": "Outsider",
            "password": "password",
            "groups": [],
        },
    }

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        self._groups = []
        # A manager holds the workflow's configured permissions, the permission that pack_order
        # requires, read_workflow, and the order's own read permission, so it can run transitions.
        manager_group, _ = Group.objects.get_or_create(name="Order Workflow Managers")
        configured_workflow_permission_ids = WorkflowPermission.objects.filter(
            workflow__content_type__app_label="store",
            workflow__content_type__model="customerorder",
        ).values_list("permission_id", flat=True)
        manager_group.permissions.set(
            Permission.objects.filter(
                Q(codename__in=["fulfill_orders", "read_customerorder", "read_workflow"])
                | Q(pk__in=configured_workflow_permission_ids)
            )
        )
        self._groups.append(manager_group)

        # A reader can read orders and holds no workflow permission at all.
        reader_group, _ = Group.objects.get_or_create(name="Order Readers")
        reader_group.permissions.set(
            Permission.objects.filter(codename="read_customerorder", content_type__app_label="store")
        )
        self._groups.append(reader_group)
        return self._groups

    @pytest.fixture
    def manager(self):
        return self.users["state-history-manager@domain.invalid"]

    @pytest.fixture
    def reader(self):
        return self.users["state-history-reader@domain.invalid"]

    @pytest.fixture
    def outsider(self):
        return self.users["state-history-outsider@domain.invalid"]

    @pytest.fixture
    def order_state(self):
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        return order_state

    @pytest.fixture
    def customer(self, manager):
        return store_models.Customer.objects.create(user=manager)

    def make_order(self, customer, order_state, number):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal(number),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def order(self, customer, order_state):
        return self.make_order(customer, order_state, "3001")

    @pytest.fixture
    def another_order(self, customer, order_state):
        return self.make_order(customer, order_state, "3002")

    def execute_transition_expecting_ok(self, client, order, **headers):
        response = client.patch(
            reverse(
                "workflow.workflow-execute-transition",
                kwargs={"app_label": "store", "model": "customerorder", "object_id": order.pk},
            ),
            {"transition_code": "pack_order"},
            format="json",
            **headers,
        )
        self.assert_response(response, HTTPStatus.OK)

    def get_history(self, client, order):
        return client.get(reverse("store.customerorder-history-list", kwargs={"pk": order.pk}))

    def get_history_expecting_ok(self, client, order):
        response = self.get_history(client, order)
        self.assert_response(response, HTTPStatus.OK)
        return response.data

    def get_group_expecting_ok(self, client, order, label):
        results = self.get_history_expecting_ok(client, order)["results"]
        return next(group for group in results if group["label"] == label)

    @staticmethod
    def state_events(group):
        return [event for event in group["events"] if event["relation"] == "state"]

    def test_a_state_only_transition_is_one_action(self, api_client, manager, order):
        api_client.force_authenticate(manager)
        self.execute_transition_expecting_ok(api_client, order)

        group = self.get_group_expecting_ok(api_client, order, "pack_order")

        assert group["kind"] == "request"
        assert group["actor"]["id"] == manager.pk
        assert [(event["model"], event["relation"], event["type"]) for event in group["events"]] == [
            ("vueda_workflow.ObjectState", "state", "updated"),
        ]
        new = State.objects.get(code="new", workflow__code="order_fulfillment")
        packed = State.objects.get(code="packed", workflow__code="order_fulfillment")
        assert group["events"][0]["changes"] == [
            {
                "field": "state",
                "old": {"id": new.pk, "display": "New", "missing": False},
                "new": {"id": packed.pk, "display": "Packed", "missing": False},
            }
        ]

    def test_a_transitions_side_effect_shares_its_action(self, api_client, manager, order):
        api_client.force_authenticate(manager)
        with mock.patch.object(store_models.CustomerOrder, "on_transition", new=set_regular_shipping):
            self.execute_transition_expecting_ok(api_client, order)

        group = self.get_group_expecting_ok(api_client, order, "pack_order")

        assert [(event["relation"], event["type"]) for event in group["events"]] == [
            ("state", "updated"),
            ("self", "updated"),
        ]
        assert group["events"][1]["changes"] == [{"field": "shipping_method", "old": "free", "new": "regular"}]

    def test_a_transition_with_no_open_action_opens_one_named_by_its_code(self, api_client, manager, order):
        with mock.patch.object(store_models.CustomerOrder, "on_transition", new=set_regular_shipping):
            order.fast_transition("pack_order")

        api_client.force_authenticate(manager)
        group = self.get_group_expecting_ok(api_client, order, "pack_order")

        assert group["kind"] == "system"
        assert group["actor"]["id"] == get_system_user().pk, "a transition given no user acts as the system user"
        assert [event["relation"] for event in group["events"]] == ["state", "self"]

    def test_a_transition_with_no_open_action_records_the_user_it_was_given(self, api_client, manager, order):
        order.apply_transition("pack_order", user=manager)

        api_client.force_authenticate(manager)
        group = self.get_group_expecting_ok(api_client, order, "pack_order")

        assert group["kind"] == "system"
        assert group["actor"]["id"] == manager.pk

    def test_a_transition_inside_another_action_keeps_that_actions_label(self, api_client, manager, order):
        with audited_action("vdq.send_message", kind="task"):
            order.fast_transition("pack_order")

        api_client.force_authenticate(manager)
        group = self.get_group_expecting_ok(api_client, order, "vdq.send_message")

        assert group["kind"] == "task"
        assert len(self.state_events(group)) == 1

    def test_a_bulk_transition_shows_each_object_only_its_own_events(self, api_client, manager, order, another_order):
        api_client.force_authenticate(manager)
        response = api_client.patch(
            reverse("workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}),
            {"transition_code": "pack_order", "object_ids": [order.pk, another_order.pk]},
            format="json",
        )
        self.assert_response(response, HTTPStatus.OK)

        groups = {}
        for each_order in (order, another_order):
            group = self.get_group_expecting_ok(api_client, each_order, "pack_order")
            assert [event["relation"] for event in group["events"]] == ["state"]
            assert group["events"][0]["object_id"] == str(each_order.object_state.pk)
            groups[each_order.pk] = group

        assert groups[order.pk]["action_id"] == groups[another_order.pk]["action_id"], "one request, one action"

    def test_the_initial_state_is_not_a_history_entry(self, api_client, manager, order):
        api_client.force_authenticate(manager)
        results = self.get_history_expecting_ok(api_client, order)["results"]

        assert [[(event["relation"], event["type"]) for event in group["events"]] for group in results] == [
            [("self", "created")],
        ]

    def test_an_object_without_a_state_row_shows_only_its_own_events(self, api_client, manager, order):
        ObjectState.objects.filter(pk=order.object_state.pk).delete()

        api_client.force_authenticate(manager)
        results = self.get_history_expecting_ok(api_client, order)["results"]

        assert [[(event["relation"], event["type"]) for event in group["events"]] for group in results] == [
            [("self", "created")],
        ]

    def test_a_dry_run_transition_adds_nothing(self, api_client, manager, order):
        api_client.force_authenticate(manager)
        before = self.get_history_expecting_ok(api_client, order)

        self.execute_transition_expecting_ok(api_client, order, HTTP_DRY_RUN="true")

        after = self.get_history_expecting_ok(api_client, order)
        assert after["totalRecords"] == before["totalRecords"]
        assert not any(self.state_events(group) for group in after["results"])

    def test_a_reader_with_no_workflow_permission_sees_state_changes(self, api_client, reader, order):
        order.fast_transition("pack_order")

        api_client.force_authenticate(reader)
        group = self.get_group_expecting_ok(api_client, order, "pack_order")

        assert len(self.state_events(group)) == 1

    def test_a_requester_who_cannot_read_the_object_is_refused(self, api_client, outsider, order):
        order.fast_transition("pack_order")

        api_client.force_authenticate(outsider)
        response = self.get_history(api_client, order)

        self.assert_response(response, HTTPStatus.FORBIDDEN)

    def read_history_as_fresh_reader(self, client, order):
        # A fresh user object each time, because Django caches permissions on the one it checked,
        # which would otherwise make the second read look cheaper than the first.
        client.force_authenticate(user=get_user_model().objects.get(email="state-history-reader@domain.invalid"))
        return self.get_history_expecting_ok(client, order)

    def add_state_changes(self, order, count, prefix):
        """Each action moves the order to the other of two states, so every action records a change."""
        packed = State.objects.get(code="packed", workflow__code="order_fulfillment")
        new = State.objects.get(code="new", workflow__code="order_fulfillment")
        for index in range(count):
            with audited_action(f"{prefix}.{index}", kind="command"):
                order.update_object_state(new if order.workflow_state == packed else packed)

    def test_a_page_costs_the_same_however_many_state_changes_it_carries(self, api_client, reader, order):
        self.add_state_changes(order, 1, "small")
        with CaptureQueriesContext(connection) as small:
            small_data = self.read_history_as_fresh_reader(api_client, order)

        self.add_state_changes(order, 8, "large")
        with CaptureQueriesContext(connection) as large:
            large_data = self.read_history_as_fresh_reader(api_client, order)

        assert small_data["totalRecords"] == 2, "one state change plus the create"  # noqa: PLR2004
        assert large_data["totalRecords"] == 10  # noqa: PLR2004
        assert len(large.captured_queries) == len(small.captured_queries), (
            "a page of history must not cost one query per state change"
        )
