"""makevuedamigrations writes group and workflow migrations in the order that the changes were made.

These tests write real migration files and apply them, so they run in a transaction of their own. Group
migrations go into the app of AUTH_USER_MODEL (``employee``), and the workflow migrations of
``erring.EnabledWithoutWorkflow`` go into ``erring``. Both apps get a temporary migrations module, so the
tests never write into the source tree.
"""

import argparse
import ast
import importlib
import io
import json
import os
import re
import sys
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ImproperlyConfigured
from django.core.management import BaseCommand
from django.core.management import CommandError
from django.core.management import call_command
from django.db.migrations.loader import MigrationLoader
from django.test import RequestFactory

from tests.erring.models import EnabledWithoutWorkflow
from tests.utils import BaseTestMigrations
from vueda.user.management.commands.makevuedamigrations import Command as MakeVuedaMigrationsCommand
from vueda.user.management.commands.makevuedamigrations import _PrefixedArgumentGroup
from vueda.user.migration_generation import operations as group_operations
from vueda.user.migration_generation import utils as migration_utils
from vueda.user.migration_generation import writer
from vueda.user.migration_generation.tools import GroupChangeTool
from vueda.user.migration_generation.utils import is_generated_migration
from vueda.user.models import GroupChange
from vueda.user.views import PermissionDeleteView
from vueda.user.views import PermissionSaveView
from vueda.workflow.migration_generation import operations as workflow_operations
from vueda.workflow.migration_generation.tools import WorkflowChangeTool
from vueda.workflow.models import InitialState
from vueda.workflow.models import ObjectState
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Transition
from vueda.workflow.models import TransitionPermission
from vueda.workflow.models import TransitionSource
from vueda.workflow.models import Workflow
from vueda.workflow.models import WorkflowPermission


def apps_with_pending_changes():
    """Return the labels of every app that has a pending group or workflow change."""
    command = BaseCommand(stdout=io.StringIO())
    group_tool = GroupChangeTool(command)
    group_tool.configure({"import_instead": True})
    workflow_tool = WorkflowChangeTool(command)
    workflow_tool.configure({"dry_run": True, "import_instead": True, "workflow_debug": []})
    pending = (*group_tool.pending_changes(), *workflow_tool.pending_changes())
    return {change.app_label for change in pending}


def save_group_permission(user, permission, group_name, group=None):
    """Grant ``permission`` to a group the way the Group Management Page does, creating or renaming the group.

    The page's URLs exist only with DEBUG on, so the view is called directly.
    """
    request = RequestFactory().post(
        "/",
        data=json.dumps({"permissionId": str(permission.pk), "groupId": group and group.pk, "groupName": group_name}),
        content_type="application/json",
    )
    request.user = user
    response = PermissionSaveView.as_view()(request)
    assert response.status_code == 200, response.content  # noqa: PLR2004
    return Group.objects.get(name=group_name)


def permission_snapshot(group_names, workflow_code):
    """Return the groups' permissions and the workflow's state permissions, named so that no pk shows.

    A group without permissions is left out. Reversing a group migration keeps a group it created, so that its
    user memberships survive, and such a group grants nothing.
    """
    groups = {
        group.name: sorted(f"{p.content_type.app_label}.{p.codename}" for p in group.permissions.all())
        for group in Group.objects.filter(name__in=group_names)
        if group.permissions.exists()
    }
    state_permissions = sorted(
        (
            state_permission.state.code,
            state_permission.permission.codename,
            state_permission.group.name,
            state_permission.historical_group_name,
            state_permission.grant_or_deny,
        )
        for state_permission in StatePermission.objects.filter(state__workflow__code=workflow_code)
    )
    workflow = Workflow.objects.filter(code=workflow_code).values("code", "name").first()
    return {"groups": groups, "workflow": workflow, "state_permissions": state_permissions}


def remove_group_permission(user, permission, group):
    """Remove ``permission`` from ``group`` the way the Group Management Page does.

    The page's URLs exist only with DEBUG on, so the view is called directly.
    """
    request = RequestFactory().delete("/")
    request.user = user
    response = PermissionDeleteView.as_view()(request, permission_id=permission.pk, group_id=group.pk)
    assert response.status_code == 200, response.content  # noqa: PLR2004


def workflow_rows_snapshot(workflow_code):
    """Return every workflow row that hangs off the workflow ``workflow_code``, named so that no pk shows.

    It covers the rows that ``workflow_snapshot`` leaves out: workflow permissions, state permissions,
    transition permissions, and each transition's name, target, and sources.
    """
    return {
        "workflow_permissions": sorted(
            WorkflowPermission.objects.filter(workflow__code=workflow_code).values_list(
                "permission__codename", flat=True
            )
        ),
        "state_permissions": sorted(
            StatePermission.objects.filter(state__workflow__code=workflow_code).values_list(
                "state__code", "permission__codename", "group__name", "historical_group_name", "grant_or_deny"
            )
        ),
        "transitions": sorted(
            Transition.objects.filter(workflow__code=workflow_code).values_list("code", "name", "target__code")
        ),
        "transition_permissions": sorted(
            TransitionPermission.objects.filter(transition__workflow__code=workflow_code).values_list(
                "transition__code", "permission__codename"
            )
        ),
        "transition_sources": sorted(
            TransitionSource.objects.filter(transition__workflow__code=workflow_code).values_list(
                "transition__code", "source__code", "ignored"
            )
        ),
    }


def workflow_snapshot(workflow_code):
    """Return the model, states, initial state and transitions of the workflow ``workflow_code``, named by code.

    The result is ``None`` when no workflow has that code.
    """
    workflow = Workflow.objects.filter(code=workflow_code).select_related("content_type").first()
    if workflow is None:
        return None

    return {
        "model": f"{workflow.content_type.app_label}.{workflow.content_type.model}",
        "states": sorted(State.objects.filter(workflow=workflow).values_list("code", "name")),
        "initial_state": InitialState.objects.get(workflow=workflow).state.code,
        "transitions": sorted(
            (source.transition.code, source.source.code, source.transition.target.code)
            for source in TransitionSource.objects.filter(transition__workflow=workflow).select_related(
                "transition__target", "source"
            )
        ),
    }


def new_migration_names(migration_dir, before):
    """Return the names of the migrations written to ``migration_dir`` since ``before``, in name order."""
    return sorted(path.stem for path in Path(migration_dir).glob("0*.py") if path not in before)


def migration_dependencies(migration_dir, name):
    """Return the dependencies of the generated migration ``name``, read from its file."""
    package = Path(migration_dir).parent.name
    module_name = f"{package}.migrations.{name}"
    sys.modules.pop(module_name, None)
    importlib.invalidate_caches()
    return importlib.import_module(module_name).Migration.dependencies


@pytest.mark.xdist_group(name="management_command_tests")
@pytest.mark.django_db(transaction=True)
class TestMakeVuedaMigrations(BaseTestMigrations):
    def test_interleaved_group_and_workflow_changes_round_trip_in_the_order_made(self, settings):
        """#727: create group A, grant it a state permission, rename it to B, grant B another state permission.

        The four changes become four migrations: group, workflow, group, workflow, each depending on the one
        before. Reversing them all restores the state before the changes, and applying them again restores the
        state after.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read = Permission.objects.get(content_type=content_type, codename="read_enabledwithoutworkflow")
        update = Permission.objects.get(content_type=content_type, codename="update_enabledwithoutworkflow")
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")
        group_names = ("Interleaved A", "Interleaved B")

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"employee", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            employee_last_before = max(path.stem for path in employee_before if path.stem[0].isdigit())
            erring_last_before = max(path.stem for path in erring_before if path.stem[0].isdigit())
            before_changes = permission_snapshot(group_names, "interleaved")

            group_a = save_group_permission(admin, read, "Interleaved A")
            workflow = Workflow.objects.create(code="interleaved", name="Interleaved", content_type=content_type)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            InitialState.objects.create(workflow=workflow, state=draft)
            StatePermission.objects.create(state=draft, permission=update, group=group_a, grant_or_deny=True)
            group_b = save_group_permission(admin, read, "Interleaved B", group=group_a)
            approved = State.objects.create(workflow=workflow, code="approved", name="Approved")
            StatePermission.objects.create(state=approved, permission=update, group=group_b, grant_or_deny=True)
            after_changes = permission_snapshot(group_names, "interleaved")

            call_command("makevuedamigrations", stdout=io.StringIO())

            employee_new = new_migration_names(employee_dir, employee_before)
            erring_new = new_migration_names(erring_dir, erring_before)
            # A generated migration's name ends in a random suffix of 8 hex characters.
            assert [
                re.fullmatch(r"\d{4}_group_permission_migrations_[0-9a-f]{8}", name) is not None
                for name in employee_new
            ] == [True, True], employee_new
            assert [
                re.fullmatch(r"\d{4}_workflow_migrations_[0-9a-f]{8}", name) is not None for name in erring_new
            ] == [
                True,
                True,
            ], erring_new
            first_group, second_group = employee_new
            first_workflow, second_workflow = erring_new
            # Migration names carry no date, so the action that a workflow migration opens names its app too.
            assert f'history_change_reason = "Workflow Migration - erring.{first_workflow}"' in (
                (Path(erring_dir) / f"{first_workflow}.py").read_text()
            )

            assert ("employee", first_group) in migration_dependencies(erring_dir, first_workflow)
            assert ("erring", first_workflow) in migration_dependencies(employee_dir, second_group)
            assert ("employee", second_group) in migration_dependencies(erring_dir, second_workflow)
            for directory, name in (
                (employee_dir, first_group),
                (erring_dir, first_workflow),
                (employee_dir, second_group),
                (erring_dir, second_workflow),
            ):
                assert not any("__first__" in str(dependency) for dependency in migration_dependencies(directory, name))
                # No dependency names AUTH_USER_MODEL by setting, so a migration that imports its functions needs
                # no settings import, which a project's linter would report as unused.
                assert "from django.conf import settings" not in (Path(directory) / f"{name}.py").read_text()

            # The developer's database already has the changes, so the new migrations are faked here.
            call_command("migrate", "erring", second_workflow, fake=True, verbosity=0)

            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            assert permission_snapshot(group_names, "interleaved") == before_changes

            call_command("migrate", "erring", second_workflow, verbosity=0)
            assert permission_snapshot(group_names, "interleaved") == after_changes

    def test_a_migration_generated_again_after_its_file_was_deleted_leaves_nothing_pending(self, settings):
        """A developer generates a migration, runs it back and forth, deletes it, edits more, and generates again.

        The new migration gets the deleted one's number. Its name must still differ, because the tool finds when a
        migration first ran by its name. With the deleted file's run, the edit made after that run would stay
        pending, and the next run would write it again.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)

        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert apps_with_pending_changes() <= {"erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            erring_before = set(Path(erring_dir).glob("*.py"))
            erring_last_before = max(path.stem for path in erring_before if path.stem[0].isdigit())
            workflow = Workflow.objects.create(
                code="generated_again", name="Generated Again", content_type=content_type
            )
            first = State.objects.create(workflow=workflow, code="first", name="First")
            InitialState.objects.create(workflow=workflow, state=first)

            call_command("makevuedamigrations", stdout=io.StringIO())
            (deleted,) = new_migration_names(erring_dir, erring_before)
            call_command("migrate", "erring", deleted, fake=True, verbosity=0)
            # Running it back and forth records its writes under its own action.
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "erring", deleted, verbosity=0)
            call_command("migrate", "erring", erring_last_before, fake=True, verbosity=0)
            (Path(erring_dir) / f"{deleted}.py").unlink()

            State.objects.create(workflow=Workflow.objects.get(code="generated_again"), code="second", name="Second")
            call_command("makevuedamigrations", stdout=io.StringIO())

            (generated_again,) = new_migration_names(erring_dir, erring_before)
            assert generated_again.split("_", 1)[0] == deleted.split("_", 1)[0]
            assert generated_again != deleted
            assert apps_with_pending_changes() == set()

    def test_changed_data_follows_the_formatter_settings_of_each_migrations_directory(self, settings):
        """The formatter reads the settings that apply to each migration's own path.

        Only the changed_data assignment is checked, so the rest of the file cannot match. A formatter keeps the
        trailing comma after the last change, which pformat never writes. With the formatter shown to have run,
        single quotes show that it read the migration's settings, since neither ruff nor black defaults to them.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read = Permission.objects.get(content_type=content_type, codename="read_enabledwithoutworkflow")
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"employee", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            for directory in (employee_dir, erring_dir):
                (Path(directory).parent / "pyproject.toml").write_text('[tool.ruff.format]\nquote-style = "single"\n')
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            save_group_permission(admin, read, "Formatted Readers")
            workflow = Workflow.objects.create(code="formatted", name="Formatted", content_type=content_type)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            InitialState.objects.create(workflow=workflow, state=draft)

            call_command("makevuedamigrations", stdout=io.StringIO())

            (group_migration,) = new_migration_names(employee_dir, employee_before)
            (workflow_migration,) = new_migration_names(erring_dir, erring_before)
            for directory, name, quoted_key in (
                (employee_dir, group_migration, "'group_name'"),
                (erring_dir, workflow_migration, "'code'"),
            ):
                source = (Path(directory) / f"{name}.py").read_text(encoding="utf-8")
                assignment = next(
                    node
                    for node in ast.parse(source).body
                    if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "changed_data"
                )
                changed_data_source = ast.get_source_segment(source, assignment)
                assert re.search(r",\s*\]$", changed_data_source), (name, changed_data_source)
                assert quoted_key in changed_data_source, (name, changed_data_source)

    def test_a_new_migration_follows_earlier_ones_with_the_old_and_the_new_name_formats(self, settings):
        """Projects keep the migrations that the old commands wrote, so the next run must follow both formats.

        The first pair of migrations is turned into the old format: a name that ends in a date, the old marker
        comments, and a workflow action named without the app. It then runs back and forth, so that action is
        recorded. The second pair has the new format. The third pair must then hold only the newest changes, follow
        the second pair, and leave nothing pending. Reversing all three pairs and applying them again checks that
        migrate handles both formats too.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read, update, list_ = (
            Permission.objects.get(content_type=content_type, codename=f"{action}_enabledwithoutworkflow")
            for action in ("read", "update", "list")
        )
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")
        group_names = ("Formats Group",)

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"employee", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            employee_last_before = max(path.stem for path in employee_before if path.stem[0].isdigit())
            erring_last_before = max(path.stem for path in erring_before if path.stem[0].isdigit())
            before_changes = (permission_snapshot(group_names, "formats"), workflow_snapshot("formats"))

            # The first pair, rewritten into the format that the old commands used.
            save_group_permission(admin, read, "Formats Group")
            workflow = Workflow.objects.create(code="formats", name="Formats", content_type=content_type)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            InitialState.objects.create(workflow=workflow, state=draft)
            call_command("makevuedamigrations", stdout=io.StringIO())
            (new_group_name,) = new_migration_names(employee_dir, employee_before)
            (new_workflow_name,) = new_migration_names(erring_dir, erring_before)
            old_group = f"{new_group_name.split('_', 1)[0]}_group_permission_migrations_2026_06_29"
            old_workflow = f"{new_workflow_name.split('_', 1)[0]}_workflow_migrations_2026_06_29"
            for directory, new_name, old_name, operations in (
                (employee_dir, new_group_name, old_group, group_operations),
                (erring_dir, new_workflow_name, old_workflow, workflow_operations),
            ):
                source = (Path(directory) / f"{new_name}.py").read_text()
                assert source.count(operations.MIGRATION_MODIFIED_COMMENT) == 1
                source = source.replace(
                    operations.MIGRATION_MODIFIED_COMMENT, operations.LEGACY_MIGRATION_MODIFIED_COMMENT
                )
                # The workflow migration depends on the group migration, and named its action without the app.
                source = source.replace(new_group_name, old_group).replace(
                    f"Workflow Migration - erring.{new_workflow_name}", f"Workflow Migration - {old_workflow}"
                )
                (Path(directory) / f"{old_name}.py").write_text(source)
                (Path(directory) / f"{new_name}.py").unlink()
            assert ("employee", old_group) in migration_dependencies(erring_dir, old_workflow)
            call_command("migrate", "erring", old_workflow, fake=True, verbosity=0)
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            call_command("migrate", "erring", old_workflow, verbosity=0)
            after_old = set(Path(employee_dir).glob("*.py")), set(Path(erring_dir).glob("*.py"))

            # The second pair, in the new format.
            # Without a group id, the page grants the permission to the existing group with that name.
            save_group_permission(admin, update, "Formats Group")
            State.objects.create(workflow=Workflow.objects.get(code="formats"), code="review", name="Review")
            call_command("makevuedamigrations", stdout=io.StringIO())
            (second_group,) = new_migration_names(employee_dir, after_old[0])
            (second_workflow,) = new_migration_names(erring_dir, after_old[1])
            call_command("migrate", "erring", second_workflow, fake=True, verbosity=0)
            after_second = set(Path(employee_dir).glob("*.py")), set(Path(erring_dir).glob("*.py"))

            # The third pair follows both formats.
            save_group_permission(admin, list_, "Formats Group")
            State.objects.create(workflow=Workflow.objects.get(code="formats"), code="done", name="Done")
            after_changes = (permission_snapshot(group_names, "formats"), workflow_snapshot("formats"))
            call_command("makevuedamigrations", stdout=io.StringIO())

            (third_group,) = new_migration_names(employee_dir, after_second[0])
            (third_workflow,) = new_migration_names(erring_dir, after_second[1])
            for previous, latest, migration_name in (
                (second_group, third_group, "group_permission_migrations"),
                (second_workflow, third_workflow, "workflow_migrations"),
            ):
                assert re.fullmatch(rf"\d{{4}}_{migration_name}_[0-9a-f]{{8}}", latest), latest
                assert int(latest.split("_", 1)[0]) == int(previous.split("_", 1)[0]) + 1, (previous, latest)
            assert ("erring", second_workflow) in migration_dependencies(employee_dir, third_group)
            assert ("employee", third_group) in migration_dependencies(erring_dir, third_workflow)
            third_workflow_source = (Path(erring_dir) / f"{third_workflow}.py").read_text()
            assert '"done"' in third_workflow_source
            assert '"draft"' not in third_workflow_source
            assert '"review"' not in third_workflow_source
            assert apps_with_pending_changes() == set()

            call_command("migrate", "erring", third_workflow, fake=True, verbosity=0)
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            assert (permission_snapshot(group_names, "formats"), workflow_snapshot("formats")) == before_changes

            call_command("migrate", "erring", third_workflow, verbosity=0)
            assert (permission_snapshot(group_names, "formats"), workflow_snapshot("formats")) == after_changes

    def test_a_workflow_that_changes_after_its_first_migration_round_trips(self, settings):
        """A state is renamed, a transition and its target state are removed, and both come back with their codes.

        The second migration replays those writes in the order made, across the state and transition models.
        Reversing it restores the workflow that the first migration wrote, and applying it again restores the
        changed one.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)

        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert apps_with_pending_changes() <= {"erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            erring_before = set(Path(erring_dir).glob("*.py"))
            erring_last_before = max(path.stem for path in erring_before if path.stem[0].isdigit())
            workflow = Workflow.objects.create(code="changing", name="Changing", content_type=content_type)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            approved = State.objects.create(workflow=workflow, code="approved", name="Approved")
            InitialState.objects.create(workflow=workflow, state=draft)
            approve = Transition.objects.create(workflow=workflow, code="approve", name="Approve", target=approved)
            TransitionSource.objects.create(transition=approve, source=draft)
            call_command("makevuedamigrations", stdout=io.StringIO())
            (first,) = new_migration_names(erring_dir, erring_before)
            call_command("migrate", "erring", first, fake=True, verbosity=0)
            after_first = workflow_snapshot("changing")
            after_first_run = set(Path(erring_dir).glob("*.py"))

            State.objects.filter(workflow=workflow, code="draft").update(name="Draft Renamed")
            draft = State.objects.get(workflow=workflow, code="draft")
            draft.name = "Draft Renamed Again"
            draft.save()
            # A transition's sources protect it, and the transition protects its target, as in the workflow screens.
            TransitionSource.objects.filter(transition=approve).delete()
            approve.delete()
            approved.delete()
            approved = State.objects.create(workflow=workflow, code="approved", name="Approved Again")
            approve = Transition.objects.create(workflow=workflow, code="approve", name="Approve", target=approved)
            TransitionSource.objects.create(transition=approve, source=draft)
            after_second = workflow_snapshot("changing")
            call_command("makevuedamigrations", stdout=io.StringIO())
            (second,) = new_migration_names(erring_dir, after_first_run)
            call_command("migrate", "erring", second, fake=True, verbosity=0)

            call_command("migrate", "erring", first, verbosity=0)
            assert workflow_snapshot("changing") == after_first
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            assert workflow_snapshot("changing") is None
            call_command("migrate", "erring", second, verbosity=0)
            assert workflow_snapshot("changing") == after_second

    def test_edits_to_every_kind_of_workflow_row_and_group_permission_round_trip(self, settings):
        """Each kind of workflow row is edited after its first migration, and a group loses a permission.

        The second pair of migrations replays a changed workflow permission, state permission (its grant and its
        group's new name), transition (name and target), transition permission, and transition source. Reversing
        it restores every row that the first pair wrote, and applying it again restores the edits.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read, update, list_, delete = (
            Permission.objects.get(content_type=content_type, codename=f"{action}_enabledwithoutworkflow")
            for action in ("read", "update", "list", "delete")
        )
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")
        group_names = ("Edited Reviewers", "Edited Approvers")

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"employee", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            employee_last_before = max(path.stem for path in Path(employee_dir).glob("0*.py"))
            erring_last_before = max(path.stem for path in Path(erring_dir).glob("0*.py"))
            before_changes = (permission_snapshot(group_names, "edited"), workflow_rows_snapshot("edited"))

            reviewers = save_group_permission(admin, read, "Edited Reviewers")
            save_group_permission(admin, list_, "Edited Reviewers")
            workflow = Workflow.objects.create(code="edited", name="Edited", content_type=content_type)
            workflow_permission = WorkflowPermission.objects.create(workflow=workflow, permission=read)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            approved = State.objects.create(workflow=workflow, code="approved", name="Approved")
            InitialState.objects.create(workflow=workflow, state=draft)
            state_permission = StatePermission.objects.create(
                state=draft, permission=update, group=reviewers, grant_or_deny=True
            )
            approve = Transition.objects.create(workflow=workflow, code="approve", name="Approve", target=approved)
            transition_permission = TransitionPermission.objects.create(transition=approve, permission=update)
            transition_source = TransitionSource.objects.create(transition=approve, source=draft)
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            call_command("makevuedamigrations", stdout=io.StringIO())
            (first_group,) = new_migration_names(employee_dir, employee_before)
            (first_workflow,) = new_migration_names(erring_dir, erring_before)
            call_command("migrate", "erring", first_workflow, fake=True, verbosity=0)
            after_first = (permission_snapshot(group_names, "edited"), workflow_rows_snapshot("edited"))
            employee_after_first = set(Path(employee_dir).glob("*.py"))
            erring_after_first = set(Path(erring_dir).glob("*.py"))

            # The group is renamed before the state permission that names it changes, so the replay needs both
            # names in the order made.
            approvers = save_group_permission(admin, read, "Edited Approvers", group=reviewers)
            remove_group_permission(admin, list_, approvers)
            workflow_permission.permission = list_
            workflow_permission.save()
            state_permission.refresh_from_db()
            state_permission.grant_or_deny = False
            state_permission.save()
            review = State.objects.create(workflow=workflow, code="review", name="Review")
            approve.name = "Approve It"
            approve.target = review
            approve.save()
            transition_permission.permission = delete
            transition_permission.save()
            transition_source.ignored = True
            transition_source.save()
            after_second = (permission_snapshot(group_names, "edited"), workflow_rows_snapshot("edited"))
            call_command("makevuedamigrations", stdout=io.StringIO())
            assert new_migration_names(employee_dir, employee_after_first), "The group edits wrote no migration."
            second_workflows = new_migration_names(erring_dir, erring_after_first)
            assert second_workflows, "The workflow edits wrote no migration."
            call_command("migrate", "erring", second_workflows[-1], fake=True, verbosity=0)
            assert apps_with_pending_changes() == set()

            # The second workflow migration depends on the second group migration, not the other way round.
            call_command("migrate", "erring", first_workflow, verbosity=0)
            call_command("migrate", "employee", first_group, verbosity=0)
            assert (permission_snapshot(group_names, "edited"), workflow_rows_snapshot("edited")) == after_first
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            assert (permission_snapshot(group_names, "edited"), workflow_rows_snapshot("edited")) == before_changes

            call_command("migrate", "erring", second_workflows[-1], verbosity=0)
            assert (permission_snapshot(group_names, "edited"), workflow_rows_snapshot("edited")) == after_second

    def test_rows_moved_to_another_state_transition_permission_or_group_round_trip(self, settings):
        """Rows that point at a state, transition, permission, or group are moved to another one.

        A moved row's change names it by its old and new targets. Replaying the change finds the row by the
        target that it has at that moment: the old one going forwards, the new one in reverse. Reversing the
        second migration puts every row back, and applying it again moves them again.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read, update, delete = (
            Permission.objects.get(content_type=content_type, codename=f"{action}_enabledwithoutworkflow")
            for action in ("read", "update", "delete")
        )
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")
        group_names = ("Moving Reviewers", "Moving Approvers")

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"employee", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            employee_last_before = max(path.stem for path in Path(employee_dir).glob("0*.py"))
            erring_last_before = max(path.stem for path in Path(erring_dir).glob("0*.py"))
            before_changes = (permission_snapshot(group_names, "moving"), workflow_rows_snapshot("moving"))

            reviewers = save_group_permission(admin, read, "Moving Reviewers")
            approvers = save_group_permission(admin, read, "Moving Approvers")
            workflow = Workflow.objects.create(code="moving", name="Moving", content_type=content_type)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            approved = State.objects.create(workflow=workflow, code="approved", name="Approved")
            review = State.objects.create(workflow=workflow, code="review", name="Review")
            InitialState.objects.create(workflow=workflow, state=draft)
            state_permission = StatePermission.objects.create(
                state=draft, permission=update, group=reviewers, grant_or_deny=True
            )
            approve = Transition.objects.create(workflow=workflow, code="approve", name="Approve", target=approved)
            reject = Transition.objects.create(workflow=workflow, code="reject", name="Reject", target=draft)
            transition_permission = TransitionPermission.objects.create(transition=approve, permission=update)
            transition_source = TransitionSource.objects.create(transition=approve, source=draft)
            TransitionSource.objects.create(transition=reject, source=approved)
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            call_command("makevuedamigrations", stdout=io.StringIO())
            assert len(new_migration_names(employee_dir, employee_before)) == 1
            (first_workflow,) = new_migration_names(erring_dir, erring_before)
            call_command("migrate", "erring", first_workflow, fake=True, verbosity=0)
            after_first = (permission_snapshot(group_names, "moving"), workflow_rows_snapshot("moving"))
            erring_after_first = set(Path(erring_dir).glob("*.py"))

            state_permission.state = approved
            state_permission.permission = delete
            state_permission.group = approvers
            state_permission.save()
            transition_permission.transition = reject
            transition_permission.save()
            transition_source.transition = reject
            transition_source.source = review
            transition_source.save()
            after_second = (permission_snapshot(group_names, "moving"), workflow_rows_snapshot("moving"))
            assert after_second != after_first
            call_command("makevuedamigrations", stdout=io.StringIO())
            second_workflows = new_migration_names(erring_dir, erring_after_first)
            assert second_workflows, "The moves wrote no migration."
            call_command("migrate", "erring", second_workflows[-1], fake=True, verbosity=0)
            assert apps_with_pending_changes() == set()

            call_command("migrate", "erring", first_workflow, verbosity=0)
            assert (permission_snapshot(group_names, "moving"), workflow_rows_snapshot("moving")) == after_first
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            assert (permission_snapshot(group_names, "moving"), workflow_rows_snapshot("moving")) == before_changes

            call_command("migrate", "erring", second_workflows[-1], verbosity=0)
            assert (permission_snapshot(group_names, "moving"), workflow_rows_snapshot("moving")) == after_second

    def test_group_migrations_create_their_groups_and_change_records_in_another_environment(self, settings):
        """Another environment has neither the groups nor the GroupChange rows that the developer's database has.

        Applying the group migrations there creates the group, renames it, grants its permissions, and records
        each change, so that environment has nothing pending either.
        """
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read, list_ = (
            Permission.objects.get(content_type=content_type, codename=f"{action}_enabledwithoutworkflow")
            for action in ("read", "list")
        )
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")
        group_names = ("Fresh Readers", "Fresh Listers")

        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            assert apps_with_pending_changes() <= {"employee"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            employee_before = set(Path(employee_dir).glob("*.py"))
            employee_last_before = max(path.stem for path in employee_before if path.stem[0].isdigit())
            readers = save_group_permission(admin, read, "Fresh Readers")
            save_group_permission(admin, list_, "Fresh Listers", group=readers)
            after_changes = permission_snapshot(group_names, "")
            call_command("makevuedamigrations", stdout=io.StringIO())
            (group_migration,) = new_migration_names(employee_dir, employee_before)
            call_command("migrate", "employee", group_migration, fake=True, verbosity=0)

            # Reversing keeps the group, so remove it and its change records as another environment would lack them.
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            Group.objects.filter(name__in=group_names).delete()
            GroupChange.objects.filter(group_name__in=group_names).delete()

            call_command("migrate", "employee", group_migration, verbosity=0)

            assert permission_snapshot(group_names, "") == after_changes
            assert sorted(
                GroupChange.objects.filter(group_name__in=group_names).values_list("change_type", flat=True)
            ) == [
                GroupChange.ADDED,
                GroupChange.CHANGED,
            ]
            assert apps_with_pending_changes() == set()

    def test_a_workflow_code_that_moves_to_another_app_round_trips(self, settings):
        """A workflow code given up by a model in one app and taken over by a model in another app.

        Workflow codes are unique, so the migration that deletes the workflow in ``store`` must run before the one
        that adds it again in ``erring``. The two migrations are written in that order, and the second depends on
        the first. Reversing them puts the workflow back on ``store.Parcel``, and applying them again moves it.
        """
        with (
            self.temporary_migration_module(settings, app_label="store") as store_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"store", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            store_before = set(Path(store_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            store_last_before = max(path.stem for path in store_before if path.stem[0].isdigit())
            before_changes = workflow_snapshot("parcel_delivery")
            assert before_changes["model"] == "store.parcel", before_changes

            # Take the workflow apart in the order that its protected relations allow.
            moved_from = Workflow.objects.get(code="parcel_delivery")
            TransitionSource.objects.filter(transition__workflow=moved_from).delete()
            Transition.objects.filter(workflow=moved_from).delete()
            InitialState.objects.filter(workflow=moved_from).delete()
            State.objects.filter(workflow=moved_from).delete()
            moved_from.delete()
            moved_to = Workflow.objects.create(
                code="parcel_delivery",
                name="Parcel Delivery",
                content_type=ContentType.objects.get_for_model(EnabledWithoutWorkflow),
            )
            received = State.objects.create(workflow=moved_to, code="received", name="Received")
            InitialState.objects.create(workflow=moved_to, state=received)
            after_changes = workflow_snapshot("parcel_delivery")

            call_command("makevuedamigrations", stdout=io.StringIO())

            (given_up,) = new_migration_names(store_dir, store_before)
            (taken_over,) = new_migration_names(erring_dir, erring_before)
            assert ("store", given_up) in migration_dependencies(erring_dir, taken_over)
            # The first step depends on every project app's latest migration from before the run, never on a new one.
            assert ("erring", taken_over) not in migration_dependencies(store_dir, given_up)

            # The developer's database already has the changes, so the new migrations are faked here.
            call_command("migrate", "erring", taken_over, fake=True, verbosity=0)

            # Reversing the store migration first reverses the erring migration that depends on it.
            call_command("migrate", "store", store_last_before, verbosity=0)
            assert workflow_snapshot("parcel_delivery") == before_changes

            call_command("migrate", "erring", taken_over, verbosity=0)
            assert workflow_snapshot("parcel_delivery") == after_changes

    def test_migrations_with_copied_code_round_trip(self, settings, monkeypatch):
        """Projects get migrations that copy the functions they run, rather than import them from VUEDA."""
        monkeypatch.setattr(MakeVuedaMigrationsCommand, "_import_instead", False)
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        read = Permission.objects.get(content_type=content_type, codename="read_enabledwithoutworkflow")
        admin = get_user_model().objects.create_superuser(email="admin@domain.invalid", password="pw", name="Admin")
        group_names = ("Copied Readers",)

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() <= {"employee", "erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            employee_last_before = max(path.stem for path in employee_before if path.stem[0].isdigit())
            erring_last_before = max(path.stem for path in erring_before if path.stem[0].isdigit())
            before_changes = permission_snapshot(group_names, "copied")

            save_group_permission(admin, read, "Copied Readers")
            workflow = Workflow.objects.create(code="copied", name="Copied", content_type=content_type)
            draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
            InitialState.objects.create(workflow=workflow, state=draft)
            after_changes = permission_snapshot(group_names, "copied")

            call_command("makevuedamigrations", stdout=io.StringIO())

            (group_migration,) = new_migration_names(employee_dir, employee_before)
            (workflow_migration,) = new_migration_names(erring_dir, erring_before)
            for directory, name, entry_point in (
                (employee_dir, group_migration, "def forwards_migrate_groups("),
                (erring_dir, workflow_migration, "def forwards_migrate_workflow("),
            ):
                source = (Path(directory) / f"{name}.py").read_text()
                assert entry_point in source
                assert "migration_generation" not in source
                assert "noqa: F821" not in source
            group_source = (Path(employee_dir) / f"{group_migration}.py").read_text()
            assert "from django.conf import settings" not in group_source

            call_command("migrate", "erring", workflow_migration, fake=True, verbosity=0)
            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            assert permission_snapshot(group_names, "copied") == before_changes

            call_command("migrate", "erring", workflow_migration, verbosity=0)
            assert permission_snapshot(group_names, "copied") == after_changes

    def test_a_new_initial_state_reaches_untouched_objects_again_after_a_round_trip(self, settings):
        """A migration adds a state and makes it the initial state. Reversing it moves objects back, and
        applying it again moves them forward again: the reversal's own move does not count as someone's."""
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)

        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert apps_with_pending_changes() <= {"erring"}, (
                "Another app has pending changes, so the command would write into the source tree."
            )
            erring_before = set(Path(erring_dir).glob("*.py"))
            workflow = Workflow.objects.create(code="round_trip", name="Round Trip", content_type=content_type)
            first = State.objects.create(workflow=workflow, code="first", name="First")
            InitialState.objects.create(workflow=workflow, state=first)
            untouched = EnabledWithoutWorkflow.objects.create(name="untouched")
            call_command("makevuedamigrations", stdout=io.StringIO())
            (workflow_created,) = new_migration_names(erring_dir, erring_before)
            call_command("migrate", "erring", workflow_created, fake=True, verbosity=0)
            after_first_run = set(Path(erring_dir).glob("*.py"))

            second = State.objects.create(workflow=workflow, code="second", name="Second")
            InitialState.objects.filter(workflow=workflow).update(state=second)
            call_command("makevuedamigrations", stdout=io.StringIO())
            (initial_changed,) = new_migration_names(erring_dir, after_first_run)
            call_command("migrate", "erring", initial_changed, fake=True, verbosity=0)
            assert ObjectState.objects.get(workflow=workflow, object_id=untouched.pk).state.code == "second"

            call_command("migrate", "erring", workflow_created, verbosity=0)
            assert ObjectState.objects.get(workflow__code="round_trip", object_id=untouched.pk).state.code == "first"

            call_command("migrate", "erring", initial_changed, verbosity=0)
            assert ObjectState.objects.get(workflow__code="round_trip", object_id=untouched.pk).state.code == "second"

    def test_a_project_migration_written_before_a_migration_that_vueda_ships_runs_before_it(self, settings):
        """In VUEDA's own repository, a test app's change made before a vueda_vdq change is written first.

        The vueda_vdq migration ships in the package, so it cannot depend on the test app's migration. The test
        app's migration gets a run_before on it instead, so Django still applies the two in the order made.
        """
        erring_content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        shipped_workflow = Workflow.objects.filter(content_type__app_label="vueda_vdq").first()

        with (
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
            self.temporary_migration_module(settings, app_label="vueda_vdq") as vdq_dir,
        ):
            assert apps_with_pending_changes() == set()
            erring_before = set(Path(erring_dir).glob("*.py"))
            vdq_before = set(Path(vdq_dir).glob("*.py"))
            Workflow.objects.create(code="project_first", name="Project First", content_type=erring_content_type)
            State.objects.create(workflow=shipped_workflow, code="shipped_second", name="Shipped Second")

            output = io.StringIO()
            call_command("makevuedamigrations", stdout=output)

            (project,) = new_migration_names(erring_dir, erring_before)
            (shipped,) = new_migration_names(vdq_dir, vdq_before)
            assert not any(dependency[0] == "erring" for dependency in migration_dependencies(vdq_dir, shipped))
            module_name = f"{Path(erring_dir).parent.name}.migrations.{project}"
            sys.modules.pop(module_name, None)
            importlib.invalidate_caches()
            assert importlib.import_module(module_name).Migration.run_before == [("vueda_vdq", shipped)]
            assert f"Made erring.{project} run before vueda_vdq.{shipped}" in output.getvalue()
            plan = MigrationLoader(None, ignore_no_migrations=True).graph.forwards_plan(("vueda_vdq", shipped))
            assert ("erring", project) in plan, plan

    def test_a_migration_that_vueda_ships_depends_only_on_what_every_project_has(self, settings):
        """In VUEDA's own repository, vueda_vdq's workflow migrations ship in the package.

        Such a migration must not depend on this repository's test apps or its test user app. It depends on the
        user model through the swappable setting, and on VUEDA's own apps.
        """
        workflow = Workflow.objects.filter(content_type__app_label="vueda_vdq").first()

        with self.temporary_migration_module(settings, app_label="vueda_vdq") as vdq_dir:
            assert apps_with_pending_changes() == set()
            vdq_before = set(Path(vdq_dir).glob("*.py"))
            State.objects.create(workflow=workflow, code="shipped_state", name="Shipped State")

            call_command("makevuedamigrations", stdout=io.StringIO())

            (shipped,) = new_migration_names(vdq_dir, vdq_before)
            source = (Path(vdq_dir) / f"{shipped}.py").read_text()
            assert "migrations.swappable_dependency(settings.AUTH_USER_MODEL)" in source
            assert "from django.conf import settings" in source
            dependencies = migration_dependencies(vdq_dir, shipped)
            # The swappable dependency resolves to the user app's first migration, never its latest one.
            assert ("employee", "__first__") in dependencies
            assert all(
                dependency[0] == "auth" or dependency[0].startswith("vueda_") or dependency == ("employee", "__first__")
                for dependency in dependencies
            ), dependencies


@pytest.mark.xdist_group(name="management_command_tests")
@pytest.mark.django_db
class TestMakeVuedaMigrationsCommand(BaseTestMigrations):
    def test_an_app_is_a_package_when_its_migrations_directory_is_installed(self, settings, monkeypatch):
        """The check follows the migrations directory that MIGRATION_MODULES names, not only the app's own."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert not migration_utils.is_installed_package_app("erring")

            monkeypatch.setattr(
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(Path(erring_dir).parent))),
            )

            assert migration_utils.is_installed_package_app("erring")

    def test_no_pending_changes_writes_nothing(self, settings):
        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() == set()
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            output = io.StringIO()

            call_command("makevuedamigrations", stdout=output)

            assert "No changes detected." in output.getvalue()
            assert new_migration_names(employee_dir, employee_before) == []
            assert new_migration_names(erring_dir, erring_before) == []

    def test_a_dry_run_names_the_migrations_without_writing_them(self, settings):
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        Workflow.objects.create(code="dry_run", name="Dry Run", content_type=content_type)

        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert apps_with_pending_changes() == {"erring"}
            erring_before = set(Path(erring_dir).glob("*.py"))
            output = io.StringIO()

            call_command("makevuedamigrations", "--dry-run", stdout=output)

            assert "Would write migration '" in output.getvalue()
            assert "for workflow changes in erring." in output.getvalue()
            assert new_migration_names(erring_dir, erring_before) == []

    def test_a_migration_that_cannot_be_filled_in_is_deleted_and_earlier_steps_are_kept(self, settings, monkeypatch):
        """A group change, then a workflow change. Filling in the workflow migration fails.

        The empty workflow migration still holds its placeholder operations, so it is deleted. The finished group
        migration stays, because its change matches on the next run.
        """
        GroupChange.objects.create(
            group_name="Kept Group",
            change_type=GroupChange.ADDED,
            historical_permission_codename="read_group",
            historical_permission_content_type_app_label="auth",
            historical_permission_content_type_model_name="group",
        )
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        Workflow.objects.create(code="unfilled", name="Unfilled", content_type=content_type)

        def fail_to_build_content(self, app_label, migration_name, changed_data):
            raise RuntimeError("content could not be built")

        monkeypatch.setattr(WorkflowChangeTool, "migration_content", fail_to_build_content)

        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            assert apps_with_pending_changes() == {"employee", "erring"}
            employee_before = set(Path(employee_dir).glob("*.py"))
            erring_before = set(Path(erring_dir).glob("*.py"))
            errors = io.StringIO()

            with pytest.raises(RuntimeError, match="content could not be built"):
                call_command("makevuedamigrations", stdout=io.StringIO(), stderr=errors)

            (kept,) = new_migration_names(employee_dir, employee_before)
            assert re.fullmatch(r"\d{4}_group_permission_migrations_[0-9a-f]{8}", kept), kept
            assert new_migration_names(erring_dir, erring_before) == []
            assert f"Kept the migrations already written: employee.{kept}." in errors.getvalue()
            assert "An error occurred while writing the migration for workflow changes in erring" in errors.getvalue()
            assert "run it with --keep-failed-migration" in errors.getvalue()

    def test_migrations_written_before_the_local_state_sync_fails_are_reported(self, settings, monkeypatch):
        """The local object-state sync runs after the migrations are written. When it fails, the database work
        rolls back, but the files stay, so the command names them and says what to do."""
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        Workflow.objects.create(code="unsynced", name="Unsynced", content_type=content_type)

        def fail_to_sync(self, *, dry_run):
            raise RuntimeError("local states could not be synced")

        monkeypatch.setattr(WorkflowChangeTool, "finish", fail_to_sync)

        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert apps_with_pending_changes() == {"erring"}
            erring_before = set(Path(erring_dir).glob("*.py"))
            errors = io.StringIO()

            with pytest.raises(RuntimeError, match="local states could not be synced"):
                call_command("makevuedamigrations", stdout=io.StringIO(), stderr=errors)

            (kept,) = new_migration_names(erring_dir, erring_before)
            assert f"giving local objects their workflow states failed: erring.{kept}." in errors.getvalue()
            assert "run backfillworkflowstates" in errors.getvalue()

    def test_keep_failed_migration_keeps_the_unfinished_migration_for_debugging(self, settings, monkeypatch):
        content_type = ContentType.objects.get_for_model(EnabledWithoutWorkflow)
        Workflow.objects.create(code="kept_unfinished", name="Kept Unfinished", content_type=content_type)

        def fail_to_build_content(self, app_label, migration_name, changed_data):
            raise RuntimeError("content could not be built")

        monkeypatch.setattr(WorkflowChangeTool, "migration_content", fail_to_build_content)

        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            assert apps_with_pending_changes() == {"erring"}
            erring_before = set(Path(erring_dir).glob("*.py"))
            errors = io.StringIO()

            with pytest.raises(RuntimeError, match="content could not be built"):
                call_command(
                    "makevuedamigrations",
                    "--keep-failed-migration",
                    stdout=io.StringIO(),
                    stderr=errors,
                )

            (unfinished,) = new_migration_names(erring_dir, erring_before)
            unfinished_path = Path(erring_dir) / f"{unfinished}.py"
            # The kept file still holds the placeholder operations that the writer fills in.
            assert "code=str" in unfinished_path.read_text()
            assert f"Kept the unfinished migration at {unfinished_path} for debugging." in errors.getvalue()
            assert "delete it before you run migrate." in errors.getvalue()

    def test_a_migration_left_by_a_failing_makemigrations_is_deleted(self, settings, monkeypatch):
        """makemigrations can write its file and then fail, for example by writing to stderr."""
        GroupChange.objects.create(
            group_name="Interrupted Group",
            change_type=GroupChange.ADDED,
            historical_permission_codename="read_group",
            historical_permission_content_type_app_label="auth",
            historical_permission_content_type_model_name="group",
        )
        real_create_empty_migration = writer.create_empty_migration

        def create_then_fail(command, app_label, migration_name):
            real_create_empty_migration(command, app_label, migration_name)
            raise SystemExit(2)

        monkeypatch.setattr(writer, "create_empty_migration", create_then_fail)

        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            assert apps_with_pending_changes() == {"employee"}
            employee_before = set(Path(employee_dir).glob("*.py"))

            with pytest.raises(SystemExit):
                call_command("makevuedamigrations", stdout=io.StringIO(), stderr=io.StringIO())

            assert new_migration_names(employee_dir, employee_before) == []

    def test_workflow_debug_without_a_name_lists_the_names_it_accepts(self):
        output = io.StringIO()

        call_command("makevuedamigrations", "--workflow-debug", stdout=output)

        lines = output.getvalue().splitlines()
        assert lines[0] == "Names that --workflow-debug accepts:"
        assert "  all" in lines
        assert "  tests.erring.enabledwithworkflow.statepermission" in lines

    def test_workflow_debug_refuses_an_unknown_name(self):
        with pytest.raises(CommandError, match=r"Unknown --workflow-debug name\(s\): nope\.model\.state\."):
            call_command("makevuedamigrations", "--dry-run", "--workflow-debug", "nope.model.state")


def test_a_tool_option_must_start_with_the_tool_key():
    parser = argparse.ArgumentParser()
    group = _PrefixedArgumentGroup(parser.add_argument_group("group changes"), "group")

    group.add_argument("--group-verbose", action="store_true")
    with pytest.raises(ImproperlyConfigured, match="must start with '--group-'"):
        group.add_argument("--verbose", action="store_true")


def test_the_new_and_the_old_marker_comments_identify_a_generated_migration(tmp_path):
    for name, first_lines in (
        ("current", (group_operations.MIGRATION_MODIFIED_COMMENT,)),
        ("legacy", (group_operations.LEGACY_MIGRATION_MODIFIED_COMMENT,)),
        ("unmarked", ("# A hand-written migration.\n",)),
    ):
        (tmp_path / f"{name}.py").write_text("# Generated by Django 6.1 on 2026-11-13 09:00\n" + "".join(first_lines))

    assert is_generated_migration(tmp_path / "current.py", group_operations.MIGRATION_MODIFIED_COMMENTS)
    assert is_generated_migration(tmp_path / "legacy.py", group_operations.MIGRATION_MODIFIED_COMMENTS)
    assert not is_generated_migration(tmp_path / "unmarked.py", group_operations.MIGRATION_MODIFIED_COMMENTS)
    # A workflow marker does not mark a group migration.
    (tmp_path / "workflow.py").write_text(workflow_operations.MIGRATION_MODIFIED_COMMENT)
    assert not is_generated_migration(tmp_path / "workflow.py", group_operations.MIGRATION_MODIFIED_COMMENTS)
