"""The object-state sync gives objects their workflow's initial state, and keeps untouched objects there.

The tests use ``erring.EnabledWithWorkflow``, whose workflow starts objects in ``unapproved``.
"""

from io import StringIO

import pgtrigger
import pytest
from django.core.management import call_command
from django.db import models

from tests.erring.models import EnabledWithWorkflow
from vueda.workflow.migration_generation.operations import manage_state_objects
from vueda.workflow.models import InitialState
from vueda.workflow.models import InitialStateEvent
from vueda.workflow.models import ObjectState
from vueda.workflow.models import ObjectStateEvent
from vueda.workflow.models import State
from vueda.workflow.models import Workflow


@pytest.mark.django_db
class TestObjectStateSync:
    @pytest.fixture
    def workflow(self):
        return Workflow.objects.get(code="enabledwithworkflow")

    @pytest.fixture
    def review(self, workflow):
        return State.objects.create(workflow=workflow, code="review", name="Review")

    def test_objects_without_a_state_get_the_initial_state_even_when_the_default_manager_hides_them(
        self, workflow, monkeypatch
    ):
        shown = EnabledWithWorkflow.objects.create(name="shown")
        hidden = EnabledWithWorkflow.objects.create(name="hidden")
        ObjectState.objects.filter(workflow=workflow, object_id__in=(shown.pk, hidden.pk)).delete()

        class HidingManager(models.Manager):
            def get_queryset(self):
                return super().get_queryset().exclude(name="hidden")

        hiding = HidingManager()
        hiding.model = EnabledWithWorkflow
        monkeypatch.setattr(EnabledWithWorkflow, "objects", hiding)
        monkeypatch.setitem(EnabledWithWorkflow._meta.__dict__, "default_manager", hiding)

        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)

        assert ObjectState.objects.get(workflow=workflow, object_id=shown.pk).state.code == "unapproved"
        assert ObjectState.objects.get(workflow=workflow, object_id=hidden.pk).state.code == "unapproved"

    def test_an_untouched_state_moves_to_a_changed_initial_state_and_a_moved_one_stays(self, workflow, review):
        untouched = EnabledWithWorkflow.objects.create(name="untouched")
        moved = EnabledWithWorkflow.objects.create(name="moved")
        ObjectState.objects.filter(workflow=workflow, object_id=moved.pk).update(
            state=State.objects.get(workflow=workflow, code="approved")
        )
        InitialState.objects.filter(workflow=workflow).update(state=review)
        workflow.refresh_from_db()

        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)

        assert ObjectState.objects.get(workflow=workflow, object_id=untouched.pk).state.code == "review"
        assert ObjectState.objects.get(workflow=workflow, object_id=moved.pk).state.code == "approved"

    def test_a_state_created_outside_the_initial_state_stays_when_the_initial_state_changes(self, workflow, review):
        """An import can place an object in a later state. Its creation is its only event, and the sync leaves it."""
        imported = EnabledWithWorkflow.objects.create(name="imported")
        ObjectState.objects.filter(workflow=workflow, object_id=imported.pk).delete()
        approved = State.objects.get(workflow=workflow, code="approved")
        ObjectState.objects.create(workflow=workflow, object_id=imported.pk, state=approved)
        InitialState.objects.filter(workflow=workflow).update(state=review)
        workflow.refresh_from_db()

        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)

        assert ObjectState.objects.get(workflow=workflow, object_id=imported.pk).state == approved

    def test_changing_the_initial_state_back_moves_untouched_states_back(self, workflow, review):
        """The sync's own move does not count as someone moving the state, so a second change moves it again."""
        untouched = EnabledWithWorkflow.objects.create(name="untouched")
        unapproved = workflow.initial_state.state
        InitialState.objects.filter(workflow=workflow).update(state=review)
        workflow.refresh_from_db()
        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)
        assert ObjectState.objects.get(workflow=workflow, object_id=untouched.pk).state.code == "review"

        InitialState.objects.filter(workflow=workflow).update(state=unapproved)
        workflow.refresh_from_db()
        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)

        assert ObjectState.objects.get(workflow=workflow, object_id=untouched.pk).state.code == "unapproved"
        events = ObjectStateEvent.objects.filter(workflow_id=workflow.pk, object_id=untouched.pk).order_by("pgh_id")
        assert [event.pgh_label for event in events] == ["insert", "update", "update"]
        assert all(event.pgh_context.metadata["initial_state_sync"] for event in events[1:])
        # With no action open, the sync opens one, and gives it the system kind as audited_action would.
        assert all(event.pgh_context.metadata["kind"] == "system" for event in events[1:])

    def test_a_move_made_after_the_sync_in_the_same_transaction_still_counts_as_someone_moving_it(
        self, workflow, review
    ):
        """pghistory keeps a context for the rest of its transaction, so the sync clears the tag that it set."""
        moved = EnabledWithWorkflow.objects.create(name="moved after the sync")
        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)
        ObjectState.objects.filter(workflow=workflow, object_id=moved.pk).update(
            state=State.objects.get(workflow=workflow, code="approved")
        )
        InitialState.objects.filter(workflow=workflow).update(state=review)
        workflow.refresh_from_db()

        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)

        assert ObjectState.objects.get(workflow=workflow, object_id=moved.pk).state.code == "approved"

    def test_a_state_without_events_stays_where_it_is(self, workflow, review):
        """A state with no events may predate the event triggers, so nothing shows that nobody moved it."""
        with pgtrigger.ignore("vueda_workflow.ObjectState:insert_insert"):
            carried_over = EnabledWithWorkflow.objects.create(name="carried over")
        assert not ObjectStateEvent.objects.filter(workflow_id=workflow.pk, object_id=carried_over.pk).exists()
        InitialState.objects.filter(workflow=workflow).update(state=review)
        workflow.refresh_from_db()

        manage_state_objects(workflow, EnabledWithWorkflow, ObjectState, ObjectStateEvent, InitialStateEvent)

        assert ObjectState.objects.get(workflow=workflow, object_id=carried_over.pk).state.code == "unapproved"

    def test_the_backfill_command_creates_missing_states_and_moves_untouched_ones(self, workflow, review):
        missing = EnabledWithWorkflow.objects.create(name="missing")
        ObjectState.objects.filter(workflow=workflow, object_id=missing.pk).delete()
        untouched = EnabledWithWorkflow.objects.create(name="untouched")
        InitialState.objects.filter(workflow=workflow).update(state=review)
        output = StringIO()

        call_command("backfillworkflowstates", "erring.EnabledWithWorkflow", stdout=output, stderr=StringIO())

        assert (
            "erring.EnabledWithWorkflow: created 1 object state(s), moved 1 to the initial state." in output.getvalue()
        )
        assert ObjectState.objects.get(workflow=workflow, object_id=missing.pk).state.code == "review"
        assert ObjectState.objects.get(workflow=workflow, object_id=untouched.pk).state.code == "review"

        again = StringIO()
        call_command("backfillworkflowstates", "erring.EnabledWithWorkflow", stdout=again, stderr=StringIO())
        assert (
            "erring.EnabledWithWorkflow: created 0 object state(s), moved 0 to the initial state." in again.getvalue()
        )
