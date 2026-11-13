"""The workflow tool finds the recorded workflow changes that no generated workflow migration holds yet.

Each test builds a workflow for ``erring.EnabledWithoutWorkflow``, which enables workflow but has none, and edits
it through the ORM the way the workflow screens do. The earlier migrations are passed in directly, so no migration
files are involved. ``erring`` has workflows of its own, so each test reads back only the changes recorded after
it started.
"""

import copy
import io
from pathlib import Path

import pytest
from django.apps import apps as django_apps
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import BaseCommand
from django.db import connection
from django.db import transaction

from tests.erring.models import EnabledWithoutWorkflow
from vueda.user.migration_generation.existing import GeneratedMigration
from vueda.user.migration_generation.existing import generated_migrations
from vueda.workflow.migration_generation.operations import MIGRATION_MODIFIED_COMMENTS
from vueda.workflow.migration_generation.operations import WorkflowChangeTypes
from vueda.workflow.migration_generation.operations import workflow_migration_action
from vueda.workflow.migration_generation.tool import WorkflowChangeTool
from vueda.workflow.models import InitialState
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Transition
from vueda.workflow.models import TransitionPermission
from vueda.workflow.models import TransitionSource
from vueda.workflow.models import Workflow
from vueda.workflow.models import WorkflowPermission


def database_now():
    """Return the database clock, which stamps every workflow event, so a test can read only its own changes."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT clock_timestamp()")
        return cursor.fetchone()[0]


def pending_changes_since(started_at, *earlier_migrations):
    """Return the pending ``erring`` changes recorded since ``started_at``, in recorded order.

    The tool sees the app's real generated migrations followed by ``earlier_migrations``.
    """
    tool = WorkflowChangeTool(BaseCommand(stdout=io.StringIO()))
    tool.configure({"dry_run": True, "import_instead": False, "workflow_debug": []})
    existing = (*generated_migrations("erring", MIGRATION_MODIFIED_COMMENTS), *earlier_migrations)
    pending = tool.pending_changes(selected_apps=("erring",), existing_changed_data={"erring": existing})
    return tuple(
        sorted(
            (change for change in pending if change.recorded_at >= started_at),
            key=lambda change: (change.recorded_at, change.tiebreak),
        )
    )


def migration_holding(name, pending):
    """Return a generated migration named ``name`` whose changed_data holds the ``pending`` changes."""
    return GeneratedMigration(
        name=name, path=Path(f"{name}.py"), changed_data=tuple(copy.deepcopy(change.data) for change in pending)
    )


class _UndoEditError(Exception):
    """Raised to roll back an edit after reading the changes that it recorded."""


def changes_that_an_edit_records(started_at, edit):
    """Run ``edit`` in a savepoint, return the pending changes that it adds, then roll it back.

    This gives the changed_data that a teammate's generated migration would hold for the same edit.
    """
    before = pending_changes_since(started_at)
    recorded = ()
    try:
        with transaction.atomic():
            edit()
            recorded = tuple(change for change in pending_changes_since(started_at) if change not in before)
            raise _UndoEditError
    except _UndoEditError:
        pass
    return recorded


def build_workflow(code):
    """Build a workflow with every kind of workflow row for ``EnabledWithoutWorkflow``, and return it."""
    content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
    read = Permission.objects.get(content_type=content_type, codename="read_enabledwithoutworkflow")
    update = Permission.objects.get(content_type=content_type, codename="update_enabledwithoutworkflow")
    reviewers = Group.objects.create(name=f"{code} reviewers")

    workflow = Workflow.objects.create(code=code, name=code.title(), content_type=content_type)
    WorkflowPermission.objects.create(workflow=workflow, permission=read)
    draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
    approved = State.objects.create(workflow=workflow, code="approved", name="Approved")
    InitialState.objects.create(workflow=workflow, state=draft)
    StatePermission.objects.create(state=draft, permission=update, group=reviewers, grant_or_deny=True)
    approve = Transition.objects.create(workflow=workflow, code="approve", name="Approve", target=approved)
    TransitionSource.objects.create(transition=approve, source=draft)
    TransitionPermission.objects.create(transition=approve, permission=update)
    return workflow


def change_kinds(pending):
    """Return each pending change as its workflow model name and its kind: added, changed, or deleted."""
    return tuple((change.data["model_name"], change.data["history_type"]) for change in pending)


@pytest.mark.django_db
class TestWorkflowChangeTool:
    def test_a_new_workflow_is_pending_as_one_added_change_per_row(self):
        started_at = database_now()
        build_workflow("built")

        pending = pending_changes_since(started_at)

        added = WorkflowChangeTypes.ADDED.value
        assert sorted(change_kinds(pending)) == sorted(
            (
                ("workflow", added),
                ("workflowpermission", added),
                ("state", added),
                ("state", added),
                ("initialstate", added),
                ("statepermission", added),
                ("transition", added),
                ("transitionsource", added),
                ("transitionpermission", added),
            )
        )
        assert {change.app_label for change in pending} == {"erring"}

    def test_changes_that_an_earlier_migration_holds_are_not_pending(self):
        started_at = database_now()
        build_workflow("migrated")
        earlier = migration_holding("0901_workflow_migrations", pending_changes_since(started_at))

        assert pending_changes_since(started_at, earlier) == ()

    def test_only_the_edits_made_after_the_earlier_migration_are_pending(self):
        started_at = database_now()
        workflow = build_workflow("edited")
        earlier = migration_holding("0902_workflow_migrations", pending_changes_since(started_at))

        State.objects.filter(workflow=workflow, code="approved").update(name="Approved Once")
        approved = State.objects.get(workflow=workflow, code="approved")
        approved.name = "Approved Twice"
        approved.save()
        # A transition's sources protect it, so they go first, as they do in the workflow screens.
        approve = Transition.objects.get(workflow=workflow, code="approve")
        TransitionSource.objects.filter(transition=approve).delete()
        approve.delete()

        pending = pending_changes_since(started_at, earlier)

        assert change_kinds(pending)[:2] == (
            ("state", WorkflowChangeTypes.CHANGED.value),
            ("state", WorkflowChangeTypes.CHANGED.value),
        )
        # Each write is described against the write just before it on the same row, not against the insert.
        assert pending[1].data["changes"]["name"] == ("Approved Once", "Approved Twice")
        assert change_kinds(pending)[2:] == (
            ("transitionsource", WorkflowChangeTypes.DELETED.value),
            ("transitionpermission", WorkflowChangeTypes.DELETED.value),
            ("transition", WorkflowChangeTypes.DELETED.value),
        )

    def test_a_state_removed_and_added_again_with_its_code_is_pending_again(self):
        """Identical inserts of one code: the earlier migration claims the first, and the second stays new."""
        started_at = database_now()
        workflow = build_workflow("reused")
        archived = State.objects.create(workflow=workflow, code="archived", name="Archived")
        archived.delete()
        earlier = migration_holding("0903_workflow_migrations", pending_changes_since(started_at))

        State.objects.create(workflow=workflow, code="archived", name="Archived")

        pending = pending_changes_since(started_at, earlier)

        assert change_kinds(pending) == (("state", WorkflowChangeTypes.ADDED.value),)
        assert pending[0].data["changes"]["code"] == "archived"

    def test_writes_that_a_migration_makes_here_are_not_pending(self):
        started_at = database_now()
        with workflow_migration_action(django_apps, "Workflow Migration - 0904_workflow_migrations"):
            build_workflow("received")

        assert pending_changes_since(started_at) == ()

    def test_an_edit_made_after_a_received_migration_ran_is_not_claimed_by_it(self):
        """A teammate's migration added a state, and ran here. A later identical edit is still new."""
        started_at = database_now()
        workflow = build_workflow("teammate")
        earlier = migration_holding("0904_workflow_migrations", pending_changes_since(started_at))
        teammates_migration = migration_holding(
            "0905_workflow_migrations",
            changes_that_an_edit_records(
                started_at, lambda: State.objects.create(workflow=workflow, code="holiday", name="Holiday")
            ),
        )
        # Applying the teammate's migration here writes the state under the migration's own action.
        with workflow_migration_action(django_apps, "Workflow Migration - 0905_workflow_migrations"):
            holiday = State.objects.create(workflow=workflow, code="holiday", name="Holiday")

        holiday.delete()
        State.objects.create(workflow=workflow, code="holiday", name="Holiday")

        pending = pending_changes_since(started_at, earlier, teammates_migration)

        assert change_kinds(pending) == (
            ("state", WorkflowChangeTypes.DELETED.value),
            ("state", WorkflowChangeTypes.ADDED.value),
        )

    def test_a_state_permission_names_its_group_as_the_write_recorded_it(self):
        started_at = database_now()
        build_workflow("renamed_group")
        Group.objects.filter(name="renamed_group reviewers").update(name="renamed_group approvers")

        pending = pending_changes_since(started_at)

        (permission_change,) = (change for change in pending if change.data["model_name"] == "statepermission")
        assert permission_change.data["changes"]["historical_group_name"] == "renamed_group reviewers"

    def test_a_model_whose_workflow_is_turned_off_still_has_its_changes_written(self):
        """erring.NotEnabledWithWorkflow keeps a recorded workflow while its model no longer enables workflow."""
        started_at = database_now()
        Workflow.objects.filter(content_type__model="notenabledwithworkflow").update(name="Renamed After Turning Off")

        pending = pending_changes_since(started_at)

        assert change_kinds(pending) == (("workflow", WorkflowChangeTypes.CHANGED.value),)

    def test_debug_names_list_models_with_recorded_workflows_and_skip_models_without(self):
        tool = WorkflowChangeTool(BaseCommand(stdout=io.StringIO()))

        names = tool.debug_names()

        assert names[0] == "all"
        assert "tests.erring.enabledwithworkflow.state" in names
        assert "tests.erring.notenabledwithworkflow.state" in names
        assert not any(".notenabledwithoutworkflow." in name for name in names)
