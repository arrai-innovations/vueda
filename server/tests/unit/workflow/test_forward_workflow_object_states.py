"""Workflow migrations preserve existing states unless recorded creation is their only event."""

import io
from pathlib import Path

import pgtrigger
import pytest
from django.core.management import call_command

from tests.erring.models import EnabledWithWorkflow
from tests.utils import BaseTestMigrations
from vueda.workflow.models import InitialState
from vueda.workflow.models import ObjectState
from vueda.workflow.models import ObjectStateEvent
from vueda.workflow.models import State
from vueda.workflow.models import Workflow


def state_for(obj):
    return ObjectState.objects.get(workflow__code="enabledwithworkflow", object_id=obj.pk)


def create_carried_over_states():
    """Rows that predate event tracking, both at and outside the original initial state."""
    approved = State.objects.get(workflow__code="enabledwithworkflow", code="approved")
    with pgtrigger.ignore("vueda_workflow.ObjectState:insert_insert", "vueda_workflow.ObjectState:update_update"):
        initial = state_for(EnabledWithWorkflow.objects.create(name="carried over at initial state"))
        moved = state_for(EnabledWithWorkflow.objects.create(name="carried over after transition"))
        ObjectState.objects.filter(pk=moved.pk).update(state=approved)
        moved.refresh_from_db()
    states = {row.pk: row.state_id for row in (initial, moved)}
    assert not ObjectStateEvent.objects.filter(pgh_obj_id__in=states).exists()
    return states


def assert_carried_over_states_unchanged(states):
    assert dict(ObjectState.objects.filter(pk__in=states).values_list("pk", "state_id")) == states
    assert not ObjectStateEvent.objects.filter(pgh_obj_id__in=states).exists()


@pytest.mark.django_db
class TestForwardWorkflowObjectStates(BaseTestMigrations):
    @pytest.mark.parametrize("migration_kind", ["copied", "imported", "updated"])
    @pytest.mark.parametrize("change_initial", [False, True], ids=["unrelated-workflow", "changed-initial"])
    def test_generated_migration_preserves_carried_over_states(self, settings, migration_kind, change_initial):
        app_label = "erring" if change_initial else "store"
        workflow = Workflow.objects.get(code="enabledwithworkflow" if change_initial else "order_fulfillment")
        original_initial = workflow.initial_state.state_id

        with self.temporary_migration_module(settings, app_label=app_label) as directory:
            replacement = State.objects.create(workflow=workflow, code="intake", name="Intake")
            if change_initial:
                InitialState.objects.filter(workflow=workflow).update(state=replacement)
            existing = set(Path(directory).glob("*.py"))
            output = io.StringIO()
            call_command(
                "makeworkflowmigrations", app_label, import_instead=migration_kind == "imported", stdout=output
            )
            [migration] = set(Path(directory).glob("*.py")) - existing
            if migration_kind == "updated":
                # An older embedded implementation must be replaced before this migration runs.
                source = migration.read_text()
                start = source.index("def manage_state_objects(")
                end = source.index("\n\ndef ", start)
                migration.write_text(
                    source[:start]
                    + 'def manage_state_objects(*args, **kwargs):\n    raise AssertionError("stale state sync")\n'
                    + source[end:]
                )
                call_command("updateworkflowmigrations", app_label, stdout=io.StringIO())
            # Generation imports a provisional module before writing the final migration body.
            self.reload_module(output.getvalue().splitlines(), directory)

            # Restore the pre-migration definition, then add objects as on an upgraded database.
            if change_initial:
                InitialState.objects.filter(workflow=workflow).update(state_id=original_initial)
            replacement.delete()
            carried_over = create_carried_over_states()
            approved = State.objects.get(workflow__code="enabledwithworkflow", code="approved")

            untouched = state_for(EnabledWithWorkflow.objects.create(name="insert only"))
            transitioned = state_for(EnabledWithWorkflow.objects.create(name="insert and update"))
            ObjectState.objects.filter(pk=transitioned.pk).update(state=approved)
            assert list(
                ObjectStateEvent.objects.filter(pgh_obj_id=untouched.pk).values_list("pgh_label", flat=True)
            ) == ["insert"]
            assert set(
                ObjectStateEvent.objects.filter(pgh_obj_id=transitioned.pk).values_list("pgh_label", flat=True)
            ) == {"insert", "update"}

            call_command("migrate", app_label, migration.stem, verbosity=0)

            assert_carried_over_states_unchanged(carried_over)
            untouched.refresh_from_db()
            transitioned.refresh_from_db()
            assert untouched.state.code == ("intake" if change_initial else "unapproved")
            assert transitioned.state_id == approved.pk

    @pytest.mark.parametrize("dry_run", [False, True], ids=["normal", "dry-run"])
    def test_generation_without_workflow_changes_preserves_states(self, dry_run):
        carried_over = create_carried_over_states()
        output = io.StringIO()
        call_command("makeworkflowmigrations", "employee", dry_run=dry_run, stdout=output)

        assert "No workflow changes detected." in output.getvalue()
        assert_carried_over_states_unchanged(carried_over)
