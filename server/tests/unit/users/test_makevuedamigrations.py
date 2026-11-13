"""makevuedamigrations writes group and workflow migrations in the order that the changes were made.

These tests write real migration files and apply them, so they run in a transaction of their own. Group
migrations go into the app of AUTH_USER_MODEL (``employee``), and the workflow migrations of
``erring.EnabledWithoutWorkflow`` go into ``erring``. Both apps get a temporary migrations module, so the
tests never write into the source tree.
"""

import importlib
import io
import json
import sys
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import BaseCommand
from django.core.management import call_command
from django.test import RequestFactory

from tests.erring.models import EnabledWithoutWorkflow
from tests.utils import BaseTestMigrations
from vueda.user.migration_generation.groups import GroupChangeTool
from vueda.user.views import PermissionSaveView
from vueda.workflow.migration_generation.tool import WorkflowChangeTool
from vueda.workflow.models import InitialState
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


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

            call_command("makevuedamigrations", "--import-instead", stdout=io.StringIO())

            employee_new = new_migration_names(employee_dir, employee_before)
            erring_new = new_migration_names(erring_dir, erring_before)
            assert [name.split("_", 1)[1] for name in employee_new] == [
                "group_permission_migrations",
                "group_permission_migrations",
            ]
            assert [name.split("_", 1)[1] for name in erring_new] == ["workflow_migrations", "workflow_migrations"]
            first_group, second_group = employee_new
            first_workflow, second_workflow = erring_new

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

            # The developer's database already has the changes, so the new migrations are faked here.
            call_command("migrate", "erring", second_workflow, fake=True, verbosity=0)

            call_command("migrate", "erring", erring_last_before, verbosity=0)
            call_command("migrate", "employee", employee_last_before, verbosity=0)
            assert permission_snapshot(group_names, "interleaved") == before_changes

            call_command("migrate", "erring", second_workflow, verbosity=0)
            assert permission_snapshot(group_names, "interleaved") == after_changes
