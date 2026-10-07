"""
Reversing a workflow migration changes object states only for the workflows it names.

Each test reverses hand-built ``changed_data`` against the live models, the same way a generated
migration made with ``--import-instead`` calls ``backwards_migrate_workflow``.
"""

import copy
import importlib
import json
from decimal import Decimal
from typing import ClassVar

import pytest
from django.apps import apps as django_apps
from django.core.management import call_command

from tests.conftest import BaseTestUserMixin
from tests.erring import models as erring_models
from tests.store import models as store_models
from vueda.workflow.management.commands.makeworkflowmigrations import backwards_migrate_workflow
from vueda.workflow.models import InitialState
from vueda.workflow.models import ObjectState
from vueda.workflow.models import ObjectStateEvent
from vueda.workflow.models import State
from vueda.workflow.models import Transition
from vueda.workflow.models import Workflow


ORDER_WORKFLOW = {"code": "order_fulfillment"}


def reverse(changed_data):
    backwards_migrate_workflow(django_apps, copy.deepcopy(changed_data), "reverse test migration")


def object_states():
    """Every object state as ``{row id: (workflow code, object id, state code)}``."""
    return {
        row["id"]: (row["workflow__code"], row["object_id"], row["state__code"])
        for row in ObjectState.objects.values("id", "workflow__code", "object_id", "state__code")
    }


def state_of(obj):
    return ObjectState.objects.get(workflow__code=type(obj).__name__.lower(), object_id=obj.pk)


def order_state_of(order):
    return ObjectState.objects.get(workflow__code="order_fulfillment", object_id=order.pk)


def move(object_state, state):
    """Move an object the way a transition does, so its history records the move."""
    ObjectState.objects.filter(pk=object_state.pk).update(state=state)


def added_state(code, workflow_id=ORDER_WORKFLOW):
    return {
        "changes": {
            "code": code,
            "id": {"code": code, "workflow_id": workflow_id},
            "name": code.title(),
            "workflow_id": workflow_id,
        },
        "history_type": "added",
        "model_name": "state",
    }


def changed_initial_state(old_code, new_code, workflow_id=ORDER_WORKFLOW):
    def states():
        # Separate dicts for each use, as a migration's literal changed_data has; the handler
        # replaces identifying data with primary keys in place.
        return (
            {"code": old_code, "workflow_id": dict(workflow_id)},
            {"code": new_code, "workflow_id": dict(workflow_id)},
        )

    return {
        "changes": {"id": {"state_id": states(), "workflow_id": dict(workflow_id)}, "state_id": states()},
        "history_type": "changed",
        "model_name": "initialstate",
    }


def erring_workflow_changed_data(code):
    """The items of the erring app's workflow migration that create the workflow named ``code``."""
    migration = importlib.import_module("tests.erring.migrations.0002_workflow_migrations_2026_03_24")
    return [item for item in migration.changed_data if f'"{code}"' in json.dumps(item["changes"])]


@pytest.mark.django_db
class TestReverseWorkflowObjectStates(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "reverse-user@domain.invalid": {"name": "Reverse User", "password": "password", "groups": []},
    }

    @pytest.fixture
    def orders(self):
        customer = store_models.Customer.objects.create(user=self.users["reverse-user@domain.invalid"])
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        orders = [
            store_models.CustomerOrder.objects.create(
                order_number=Decimal(number), customer=customer, order_state=order_state
            )
            for number in ("3001", "3002")
        ]
        orders[0].fast_transition("pack_order")
        return orders

    @pytest.fixture
    def erring_objects(self):
        objects = [erring_models.EnabledWithWorkflow.objects.create(name=name) for name in ("first", "second")]
        move(state_of(objects[0]), State.objects.get(workflow__code="enabledwithworkflow", code="approved"))
        return objects

    @pytest.fixture
    def inspected(self):
        """A state the reversed migration added to the order workflow."""
        return State.objects.create(workflow=Workflow.objects.get(**ORDER_WORKFLOW), code="inspected", name="Inspected")

    def test_other_workflows_keep_their_object_states(self, orders, erring_objects, inspected):
        before = object_states()

        reverse([added_state("inspected")])

        assert object_states() == before
        assert not State.objects.filter(pk=inspected.pk).exists()

    def test_a_reversal_that_only_removes_a_transition_changes_no_object_state(self, orders, erring_objects):
        workflow = Workflow.objects.get(**ORDER_WORKFLOW)
        Transition.objects.create(
            workflow=workflow, code="recheck", name="Recheck", target=State.objects.get(workflow=workflow, code="new")
        )
        before = object_states()

        reverse(
            [
                {
                    "changes": {
                        "code": "recheck",
                        "id": {"code": "recheck", "workflow_id": ORDER_WORKFLOW},
                        "name": "Recheck",
                        "target_id": {"code": "new", "workflow_id": ORDER_WORKFLOW},
                        "workflow_id": ORDER_WORKFLOW,
                    },
                    "history_type": "added",
                    "model_name": "transition",
                }
            ]
        )

        assert object_states() == before
        assert not Transition.objects.filter(workflow=workflow, code="recheck").exists()

    def test_an_object_in_a_removed_state_returns_to_its_previous_state(
        self, orders, erring_objects, inspected, capsys
    ):
        packed_order = order_state_of(orders[0])
        move(packed_order, inspected)
        others = {pk: row for pk, row in object_states().items() if pk != packed_order.pk}

        reverse([added_state("inspected")])

        restored = ObjectState.objects.get(pk=packed_order.pk)
        assert restored.state.code == "packed"
        assert {pk: row for pk, row in object_states().items() if pk != packed_order.pk} == others
        assert not ObjectStateEvent.objects.filter(pgh_obj_id__in=object_states(), pgh_label="delete").exists()
        assert "Workflow order_fulfillment: 1 object state(s) restored from history." in capsys.readouterr().out

    def test_an_object_with_no_surviving_state_in_its_history_gets_the_restored_initial_state(self, orders, capsys):
        workflow = Workflow.objects.get(**ORDER_WORKFLOW)
        intake = State.objects.create(workflow=workflow, code="intake", name="Intake")
        InitialState.objects.filter(workflow=workflow).update(state=intake)
        late_order = store_models.CustomerOrder.objects.create(
            order_number=Decimal("3003"), customer=orders[0].customer, order_state=orders[0].order_state
        )
        late_state = order_state_of(late_order)
        assert late_state.state == intake

        reverse([added_state("intake"), changed_initial_state("new", "intake")])

        assert ObjectState.objects.get(pk=late_state.pk).state.code == "new"
        assert InitialState.objects.get(workflow=workflow).state.code == "new"
        assert order_state_of(orders[0]).state.code == "packed"
        assert "Workflow order_fulfillment: 1 object state(s) reset to the initial state." in capsys.readouterr().out

    def test_a_removed_workflow_loses_only_its_own_object_states(self, orders, erring_objects, capsys):
        order_states = {pk: row for pk, row in object_states().items() if row[0] == "order_fulfillment"}

        reverse(erring_workflow_changed_data("enabledwithworkflow"))

        assert not Workflow.objects.filter(code="enabledwithworkflow").exists()
        assert not ObjectState.objects.filter(
            object_id__in=[obj.pk for obj in erring_objects], workflow__code="enabledwithworkflow"
        )
        assert {pk: row for pk, row in object_states().items() if row[0] == "order_fulfillment"} == order_states
        assert "Workflow enabledwithworkflow: 2 object state(s) deleted with the workflow." in capsys.readouterr().out

    def test_a_removed_workflow_renamed_after_it_was_added_loses_its_object_states(
        self, orders, erring_objects, capsys
    ):
        Workflow.objects.filter(code="enabledwithworkflow").update(code="enabledwithworkflow_renamed")
        renamed = {
            "changes": {
                "code": ("enabledwithworkflow", "enabledwithworkflow_renamed"),
                "id": {"code": ("enabledwithworkflow", "enabledwithworkflow_renamed")},
            },
            "history_type": "changed",
            "model_name": "workflow",
        }

        reverse([*erring_workflow_changed_data("enabledwithworkflow"), renamed])

        assert not Workflow.objects.filter(code__in=["enabledwithworkflow", "enabledwithworkflow_renamed"]).exists()
        out = capsys.readouterr().out
        assert "Workflow enabledwithworkflow_renamed: 2 object state(s) deleted with the workflow." in out
        assert "left without a state" not in out

    def test_a_re_created_workflow_gives_its_objects_the_initial_state(self, orders, erring_objects, capsys):
        added = erring_workflow_changed_data("enabledwithworkflow")
        reverse(added)
        capsys.readouterr()
        deleted = [{**copy.deepcopy(item), "history_type": "deleted"} for item in reversed(added)]

        reverse(deleted)

        assert {state_of(obj).state.code for obj in erring_objects} == {"unapproved"}
        assert "Workflow enabledwithworkflow: 2 object state(s) given the initial state." in capsys.readouterr().out

    @pytest.mark.parametrize(
        ("migration_name", "removed_workflows"),
        [("0002_workflow_migrations_2025_09_22", {"queueitem"}), ("0005_workflow_migrations_2025_11_21", set())],
    )
    def test_a_shipped_vdq_migration_deletes_only_the_object_states_of_workflows_it_removes(
        self, orders, erring_objects, migration_name, removed_workflows
    ):
        """
        The shipped migrations' own reverse code also reads models that only exist part-way through
        reversing ``vueda_workflow``, so only their scoping step runs here against the live models.
        """
        migration = importlib.import_module(f"vueda.vdq.migrations.{migration_name}")
        before = object_states()

        migration.delete_object_states_of_removed_workflows(django_apps, copy.deepcopy(migration.changed_data))

        assert object_states() == {pk: row for pk, row in before.items() if row[0] not in removed_workflows}

    def test_the_vdq_migrations_still_reverse_and_apply(self):
        call_command("migrate", "vueda_vdq", "0001", verbosity=0)
        assert not Workflow.objects.filter(code="queueitem").exists()

        call_command("migrate", "vueda_vdq", verbosity=0)

        assert Workflow.objects.filter(code="queueitem").exists()
