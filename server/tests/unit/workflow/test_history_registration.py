"""Coverage for the pghistory event models workflow registers for its own records.

Workflow's models sit outside the ``class Vueda`` feature-policy family, so the policy contributor
never sees them and they call the history app's registration path themselves. These tests hold that
call to the same backend behaviour a policy-driven model gets: an event model per record, the three
write triggers, append-only event tables, and one action context across the tables one edit touches.
"""

from decimal import Decimal
from typing import ClassVar

import pytest
from django.apps import apps
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.db import DatabaseError
from django.db import connection

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.core.audit import audited_action
from vueda.workflow.models import State
from vueda.workflow.models import Transition


pytestmark = pytest.mark.django_db


# Every record workflow keeps. ``Workflow`` reaches pghistory through the feature policy because it
# subclasses ``Lookup``; the rest register directly. Naming all nine here means a model added later
# fails these tests until someone decides whether it records history.
TRACKED_MODELS = (
    "Workflow",
    "WorkflowPermission",
    "State",
    "StatePermission",
    "InitialState",
    "Transition",
    "TransitionPermission",
    "TransitionSource",
    "ObjectState",
)


def trigger_names(table):
    """Return the triggers on ``table``, less pgtrigger's per-table hash suffix.

    pgtrigger installs ``pgtrigger_<name>_<hash>``, and the hash changes with the trigger's SQL. The
    logical name is what these tests are about, so the suffix comes off.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT tgname FROM pg_trigger JOIN pg_class ON pg_class.oid = tgrelid "
            "WHERE relname = %s AND NOT tgisinternal",
            [table],
        )
        return sorted(row[0].rsplit("_", 1)[0] for row in cursor.fetchall())


def events_for(instance):
    """Return the event rows for one object, oldest first."""
    event_model = apps.get_model("vueda_workflow", f"{instance.__class__.__name__}Event")
    return list(event_model.objects.filter(pgh_obj_id=instance.pk).order_by("pgh_id"))


class TestRegisteredArtifacts:
    """What registration produces for every workflow record."""

    @pytest.mark.parametrize("name", TRACKED_MODELS)
    def test_a_workflow_model_has_an_event_model(self, name):
        event_model = apps.get_model("vueda_workflow", f"{name}Event")

        assert event_model._meta.db_table in connection.introspection.table_names()

    @pytest.mark.parametrize("name", TRACKED_MODELS)
    def test_a_workflow_model_has_its_write_triggers(self, name):
        table = apps.get_model("vueda_workflow", name)._meta.db_table

        assert trigger_names(table) == [
            "pgtrigger_delete_delete",
            "pgtrigger_insert_insert",
            "pgtrigger_update_update",
        ]

    @pytest.mark.parametrize("name", TRACKED_MODELS)
    def test_a_workflow_event_table_is_append_only(self, name):
        table = apps.get_model("vueda_workflow", f"{name}Event")._meta.db_table

        assert trigger_names(table) == ["pgtrigger_append_only"]


class TestObjectStateEvents:
    """Object state is the workflow record that changes during ordinary traffic."""

    @pytest.fixture
    def customer_order(self, django_user_model):
        user = django_user_model.objects.create(email="workflow-history@domain.invalid", name="Workflow History")
        customer = store_models.Customer.objects.create(user=user)
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("2001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    def test_creating_an_object_records_its_initial_state(self, customer_order):
        events = events_for(customer_order.object_state)

        assert [event.pgh_label for event in events] == ["insert"]
        assert events[0].state_id == customer_order.object_state.state_id

    def test_a_state_change_records_the_state_it_moved_to(self, customer_order):
        shipped = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = shipped
        object_state.save()

        events = events_for(object_state)
        assert [event.pgh_label for event in events] == ["insert", "update"]
        assert events[-1].state_id == shipped.pk

    def test_a_deleted_object_state_keeps_its_events_and_records_the_delete(self, customer_order):
        object_state = customer_order.object_state
        pk = object_state.pk
        object_state.delete()

        event_model = apps.get_model("vueda_workflow", "ObjectStateEvent")
        labels = list(event_model.objects.filter(pgh_obj_id=pk).order_by("pgh_id").values_list("pgh_label", flat=True))
        assert labels == ["insert", "delete"]

    def test_an_event_row_cannot_be_updated(self, customer_order):
        event = events_for(customer_order.object_state)[0]

        event.pgh_label = "rewritten"
        with pytest.raises(DatabaseError, match="Cannot update or delete rows"):
            event.save()


class TestActionContext:
    """One edit shares one action across the tables it touches."""

    def test_a_configuration_edit_shares_one_action_across_tables(self):
        state = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        transition = Transition.objects.get(code="pack_order", workflow__code="order_fulfillment")

        with audited_action("workflow.edit", kind="command"):
            state.name = "Shipped Out"
            state.save()
            transition.name = "Pack The Order"
            transition.save()

        contexts = {events_for(state)[-1].pgh_context_id, events_for(transition)[-1].pgh_context_id}
        assert len(contexts) == 1
        assert None not in contexts


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestTransitionContext(BaseTestGroupMixin, BaseTestUserMixin):
    """A transition's object-state write belongs to the action that asked for the transition."""

    groups_to_create: ClassVar[dict] = {"Order Workflow Managers": []}
    users_to_create: ClassVar[dict] = {
        "workflow-user@domain.invalid": {
            "name": "Workflow User",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        },
    }

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        self._groups = []
        group, _ = Group.objects.get_or_create(name="Order Workflow Managers")
        group.permissions.set(Permission.objects.filter(codename__in=["fulfill_orders", "delete_customerorder"]))
        self._groups.append(group)
        return self._groups

    @pytest.fixture
    def workflow_user(self):
        return self.users["workflow-user@domain.invalid"]

    @pytest.fixture
    def customer_order(self, workflow_user):
        customer = store_models.Customer.objects.create(user=workflow_user)
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("2002"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    def test_a_transition_joins_the_action_that_applied_it(self, customer_order, workflow_user):
        with audited_action("order.pack", kind="command"):
            customer_order.apply_transition("pack_order", user=workflow_user)
            customer_order.shipping_method = "express"
            customer_order.save()

        state_event = events_for(customer_order.object_state)[-1]
        order_event = (
            apps.get_model("store", "CustomerOrderEvent")
            .objects.filter(
                pgh_obj_id=customer_order.pk,
            )
            .order_by("pgh_id")
            .last()
        )

        assert state_event.pgh_label == "update"
        assert state_event.pgh_context_id is not None
        assert state_event.pgh_context_id == order_event.pgh_context_id


class TestHistoryRecordsStayOutOfPermissionChoices:
    """A history record is not a thing a project grants permission on."""

    def test_the_permission_picker_offers_no_event_model_permission(self):
        from vueda.workflow.forms import RemoveHistoricalPermissionsForm

        offered = RemoveHistoricalPermissionsForm().fields["permission"].queryset

        assert offered.exists()
        assert not offered.filter(
            content_type__app_label="vueda_workflow",
            content_type__model__in=[f"{name.lower()}event" for name in TRACKED_MODELS],
        ).exists()
        assert not offered.filter(content_type__model__startswith="historical").exists()
