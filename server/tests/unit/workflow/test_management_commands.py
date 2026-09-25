import ast
import datetime
import importlib.util
import io
import os
import time
from collections import Counter
from pathlib import Path
from pprint import pformat
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db.migrations.recorder import MigrationRecorder

from tests.conftest import BaseTestCallCommand
from tests.utils import BaseTestMigrations
from tests.utils import append_installed_apps
from tests.utils import expect_one_migration_generated_today
from tests.utils import info_registry_clear_with_appended_apps
from vueda import workflow as workflow_module
from vueda.user.management.commands.utils import update_operation_function_names
from vueda.workflow import models
from vueda.workflow.management.commands import makeworkflowmigrations
from vueda.workflow.management.commands.makeworkflowmigrations import MIGRATION_ACTION_KIND
from vueda.workflow.models import WorkflowEvent


def convert_data_to_list_of_dicts_without_id_fields(queryset):
    data = []

    for values in queryset:
        item = {}

        for key, value in values.items():
            if not (key == "id" or key.endswith("_id")):
                item[key] = value

        data.append(item)

    return data


def strip_database_creation_and_deletion_from_stderr(stderr, db_name):
    stderr = stderr.replace(f"Creating test database for alias 'default' ('{db_name}')...\n", "")
    stderr = stderr.replace(f"Destroying test database for alias 'default' ('{db_name}')...\n", "")
    return stderr


class BaseAddedWorkflow:
    def assert_added_workflow_migration_round_trips(self, migration_dir, results):
        # Reload 0003, because we rewrote it after it would have imported it.
        assert results, "No results were captured when makeworkflowmigrations was called."
        self.reload_module(results, migration_dir)

        # The migration writes through the workflow triggers, so it has to depend on the migration
        # that installs them. Depending on the newest vueda_workflow migration is what guarantees it.
        migration_name = expect_one_migration_generated_today(migration_dir, "0003_workflow_migrations")
        migration_filepath = os.path.join(migration_dir, migration_name)
        with open(migration_filepath, encoding="utf-8") as f:
            generated_migration = f.read()
        workflow_migrations = Path(workflow_module.__file__).parent / "migrations"
        newest = sorted(path.stem for path in workflow_migrations.glob("0*.py"))[-1]
        assert f'("vueda_workflow", "{newest}")' in generated_migration

        results = frozenset([line.strip() for line in results if line.strip()])
        assert "Creating empty migration for workflow changes." in results
        assert f"Modified migration '{migration_name}' to migrate workflow for workflow_added." in results

        # Roll back 0002.
        succeeded, results = self.call_command("migrate", "workflow_added", "0001")
        if not succeeded:
            pytest.fail("".join(results))

        # Did the migrations roll back?
        assert not models.Workflow.objects.filter(code="added_workflow").exists(), (
            "'added_workflow' appears to exist when it should not."
        )

        # We should have run migration 0001.
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 1

        # Fake 0002, so we can run 0003 instead.
        succeeded, results = self.call_command("migrate", "workflow_added", "0002", "--fake")
        if not succeeded:
            pytest.fail("".join(results))

        # We should have run migration 0001 and 0002 (faked).
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 2  # noqa: PLR2004

        # Run migration 0003 forwards.
        succeeded, results = self.call_command("migrate", "workflow_added", "0003")
        if not succeeded:
            pytest.fail("".join(results))

        # We should have run migration 0001, 0002 (faked), and 0003.
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 3  # noqa: PLR2004

        # Verify the data is correct.
        data = convert_data_to_list_of_dicts_without_id_fields(
            models.Workflow.objects.filter(code="added_workflow").values()
        )
        assert data == [
            {
                "code": "added_workflow",
                "historical_app_label": "workflow_added",
                "historical_model": "workflowadded",
                "name": "Added Workflow",
            },
        ]

        # If the assert above passes, then we definitely have a workflow id.
        workflow_pk = models.Workflow.objects.filter(code="added_workflow").first().id

        # The migration's writes record events, and they name the migration that made them.
        events = WorkflowEvent.objects.filter(pgh_obj_id=workflow_pk)
        assert [event.pgh_label for event in events] == ["insert"]
        metadata = events[0].pgh_context.metadata
        assert metadata["kind"] == "migration"
        assert metadata["action"].startswith("Workflow Migration - 0003_workflow_migrations_")
        assert metadata["user"] == get_user_model().objects.get(is_system=True).pk

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
        )
        assert data == [
            {
                "historical_permission_codename": "can_do_something",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
            {
                "historical_permission_codename": "can_do_something_else",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
        ]

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.InitialState.objects.filter(workflow_id=workflow_pk).values("state__code", "state__name")
        )
        assert data == [
            {"state__code": "state_1", "state__name": "State 1"},
        ]

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.State.objects.filter(workflow_id=workflow_pk).values("code", "name")
        )
        assert data == [
            {
                "code": "state_1",
                "name": "State 1",
            },
            {
                "code": "state_2",
                "name": "State 2",
            },
            {
                "code": "state_3",
                "name": "State 3",
            },
        ]

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
        )
        assert data == [
            {
                "grant_or_deny": False,
                "historical_group_name": "WorkflowAddedAdmin",
                "historical_permission_codename": "can_do_something",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
            {
                "grant_or_deny": True,
                "historical_group_name": "WorkflowAddedWorker",
                "historical_permission_codename": "can_do_something_else",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
            {
                "grant_or_deny": True,
                "historical_group_name": "WorkflowAddedAdmin",
                "historical_permission_codename": "update_workflowadded",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
        ]

        # Converting the data uses id, so it is stripped from the data.
        data = convert_data_to_list_of_dicts_without_id_fields(
            models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
        )
        assert data == [
            {
                "code": "go_to_state_1",
                "name": "Go To State 1",
                "target__code": "state_1",
            },
            {
                "code": "go_to_state_2",
                "name": "Go To State 2",
                "target__code": "state_2",
            },
            {
                "code": "go_to_state_3",
                "name": "Go To State 3",
                "target__code": "state_3",
            },
        ]

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
        )
        assert data == [
            {
                "historical_permission_codename": "can_do_something",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
            {
                "historical_permission_codename": "can_do_something_else",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
            {
                "historical_permission_codename": "update_workflowadded",
                "historical_permission_content_type_app_label": "workflow_added",
                "historical_permission_content_type_model_name": "workflowadded",
            },
        ]

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                "transition__code", "source__code"
            )
        )
        assert data == [
            {
                "source__code": "state_1",
                "transition__code": "go_to_state_2",
            },
            {
                "source__code": "state_2",
                "transition__code": "go_to_state_1",
            },
            {
                "source__code": "state_3",
                "transition__code": "go_to_state_1",
            },
        ]

        # Run migration 0003 backwards
        succeeded, results = self.call_command("migrate", "workflow_added", "0002")
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        # We should have run migration 0001 and 0002 (faked).
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 2  # noqa: PLR2004

        # Verify the data is back in the original state.
        assert models.Workflow.objects.filter(code="added_workflow").first() is None, models.Workflow.objects.filter(
            code="added_workflow"
        ).values()
        assert models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).first() is None, (
            models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
        )
        assert models.InitialState.objects.filter(workflow_id=workflow_pk).first() is None, (
            models.InitialState.objects.filter(workflow_id=workflow_pk).values()
        )
        assert models.State.objects.filter(workflow_id=workflow_pk).first() is None, models.State.objects.filter(
            workflow_id=workflow_pk
        ).values()
        assert models.StatePermission.objects.filter(state__workflow_id=workflow_pk).first() is None, (
            models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
        )
        assert models.Transition.objects.filter(workflow_id=workflow_pk).first() is None, (
            models.Transition.objects.filter(workflow_id=workflow_pk).values()
        )
        assert models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).first() is None, (
            models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
        )
        assert models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).first() is None, (
            models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values()
        )


class TestManagementCommandWorkflowTests(BaseAddedWorkflow, BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_no_app_label_specified(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_added": "tests.workflow_added",
        }
        append_installed_apps(settings, "tests.workflow_added")

        with self.temporary_migration_module(settings, app_label="workflow_added"):
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app__in=("workflow_added",)).count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_added")
            if not succeeded:
                pytest.fail("".join(results))

            # 2 migrations should have run.
            assert (
                MigrationRecorder.Migration.objects.filter(app__in=("workflow_added",)).count() == 2  # noqa: PLR2004
            )

            succeeded, results = self.call_command("makeworkflowmigrations")
            if not succeeded:
                pytest.fail("".join(results), pytrace=False)

            results = frozenset([line.strip() for line in results if line.strip()])

            assert "Migrations for 'workflow_added':" in results, results

    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_bad_app_label(self):
        with pytest.raises(SystemExit):
            self.call_command("makeworkflowmigrations", "app_that_does_not_exist")

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_comment_removed(self, settings):
        """
        This test doesn't use --import-instead, so we can verify that
        the noqa comments are stripped from the generated migration.
        """
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_added": "tests.workflow_added",
        }
        append_installed_apps(settings, "tests.workflow_added")

        with self.temporary_migration_module(settings, app_label="workflow_added") as migration_dir:
            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_added")
            if not succeeded:
                pytest.fail("".join(results))

            # Create the generated migration 0003.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_added")
            if not succeeded:
                pytest.fail("".join(results))

            # Verify that the noqa comments are gone.
            migration_filepath = os.path.join(
                migration_dir, expect_one_migration_generated_today(migration_dir, "0003_workflow_migrations")
            )

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            assert (
                "    forwards_migrate_workflow(apps, copy.deepcopy(changed_data), history_change_reason)\n"
                in migration_content
            )
            assert (
                "    backwards_migrate_workflow(apps, copy.deepcopy(changed_data), history_change_reason)\n"
                in migration_content
            )
            assert "    make_sure_permissions_exist(migration_app_label)\n" in migration_content

            self.assert_added_workflow_migration_round_trips(migration_dir, results)

    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_dry_run_no_changes(self):
        succeeded, results = self.call_command("makeworkflowmigrations", "--dry-run")
        if not succeeded:
            pytest.fail("".join(results))

        assert "No workflow changes detected.\n" in results


class TestManagementCommandWorkflowAdded(BaseAddedWorkflow, BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_added(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_added": "tests.workflow_added",
        }
        append_installed_apps(settings, "tests.workflow_added")

        with self.temporary_migration_module(settings, app_label="workflow_added") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_added")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 and 0002.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 2  # noqa: PLR2004

            # Create the generated migration 0003.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_added", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            self.assert_added_workflow_migration_round_trips(migration_dir, results)


class TestManagementCommandWorkflowChanged(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_changed(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_changed": "tests.workflow_changed",
        }
        append_installed_apps(settings, "tests.workflow_changed")

        with self.temporary_migration_module(settings, app_label="workflow_changed") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_changed")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0004.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 4  # noqa: PLR2004

            # Create the generated migration 0005.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_changed", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0005, because we rewrote it after it would have imported it.
            assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            results = frozenset([line.strip() for line in results if line.strip()])
            assert "Creating empty migration for workflow changes." in results
            migration_name = expect_one_migration_generated_today(migration_dir, "0005_workflow_migrations")
            assert f"Modified migration '{migration_name}' to migrate workflow for workflow_changed." in results

            # Roll back 0004.
            succeeded, results = self.call_command("migrate", "workflow_changed", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003 now.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 3  # noqa: PLR2004

            # Gather the data for the changed workflow, so we can validate it is the same after we migrate backwards.
            orig_data_workflow = convert_data_to_list_of_dicts_without_id_fields(
                models.Workflow.objects.filter(code="changed_workflow").values()
            )
            assert orig_data_workflow == [
                {
                    "code": "changed_workflow",
                    "historical_app_label": "workflow_changed",
                    "historical_model": "workflowchanged",
                    "name": "Changed Workflow",
                },
            ]

            workflow_pk = models.Workflow.objects.filter(code="changed_workflow").first().id

            orig_data_workflow_permission = convert_data_to_list_of_dicts_without_id_fields(
                models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
            )
            assert orig_data_workflow_permission == [
                {
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
            ]

            orig_data_initial_state = convert_data_to_list_of_dicts_without_id_fields(
                models.InitialState.objects.filter(workflow_id=workflow_pk).values("state__code", "state__name")
            )
            assert orig_data_initial_state == [
                {"state__code": "state_1", "state__name": "State 1"},
            ]

            orig_data_state = convert_data_to_list_of_dicts_without_id_fields(
                models.State.objects.filter(workflow_id=workflow_pk).values("code", "name")
            )
            assert orig_data_state == [
                {
                    "code": "state_1",
                    "name": "State 1",
                },
                {
                    "code": "state_2",
                    "name": "State 2",
                },
                {
                    "code": "state_3",
                    "name": "State 3",
                },
            ]

            orig_data_state_permission = convert_data_to_list_of_dicts_without_id_fields(
                models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
            )
            assert orig_data_state_permission == [
                {
                    "grant_or_deny": False,
                    "historical_group_name": "WorkflowChangedAdmin",
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowChangedWorker",
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowChangedAdmin",
                    "historical_permission_codename": "update_workflowchanged",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
            ]

            orig_data_transition = convert_data_to_list_of_dicts_without_id_fields(
                models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
            )
            assert orig_data_transition == [
                {
                    "code": "go_to_state_1",
                    "name": "Go To State 1",
                    "target__code": "state_1",
                },
                {
                    "code": "go_to_state_2",
                    "name": "Go To State 2",
                    "target__code": "state_2",
                },
                {
                    "code": "go_to_state_3",
                    "name": "Go To State 3",
                    "target__code": "state_3",
                },
            ]

            orig_data_transition_permission = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
            )
            assert orig_data_transition_permission == [
                {
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "historical_permission_codename": "update_workflowchanged",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
            ]

            orig_data_transition_source = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                    "transition__code", "source__code"
                )
            )
            assert orig_data_transition_source == [
                {
                    "source__code": "state_1",
                    "transition__code": "go_to_state_2",
                },
                {
                    "source__code": "state_2",
                    "transition__code": "go_to_state_1",
                },
                {
                    "source__code": "state_3",
                    "transition__code": "go_to_state_1",
                },
            ]

            # Fake 0004, so we can run 0005 instead.
            succeeded, results = self.call_command("migrate", "workflow_changed", "0004", "--fake")
            if not succeeded:
                pytest.fail("".join(results))

            # Run migration 0005 forwards.
            succeeded, results = self.call_command("migrate", "workflow_changed", "0005")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003, 0004 (faked), and 0005.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 5  # noqa: PLR2004

            # Verify the data is correct.
            data = convert_data_to_list_of_dicts_without_id_fields(
                models.Workflow.objects.filter(code="changed_workflow_2").values()
            )
            assert data == [
                {
                    "code": "changed_workflow_2",
                    "historical_app_label": "workflow_changed",
                    "historical_model": "workflowchanged",
                    "name": "Changed Workflow 2",
                },
            ]

            # If the assert above passes, then we definitely have a workflow id.
            workflow_pk = models.Workflow.objects.filter(code="changed_workflow_2").first().id

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
            )
            assert data == [
                {
                    "historical_permission_codename": "can_do_another_thing",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
            ]

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.InitialState.objects.filter(workflow_id=workflow_pk).values("state__code", "state__name")
            )
            assert data == [
                {"state__code": "state_2", "state__name": "State 2"},
            ]

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.State.objects.filter(workflow_id=workflow_pk).values("code", "name")
            )
            assert data == [
                {
                    "code": "state_1_a",
                    "name": "State 1 A",
                },
                {
                    "code": "state_2",
                    "name": "State 2",
                },
                {
                    "code": "state_3",
                    "name": "State 3",
                },
            ]

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
            )
            assert data == [
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowChangedWorker",
                    "historical_permission_codename": "can_do_another_thing",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowChangedWorker",
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowChangedAdmin",
                    "historical_permission_codename": "update_workflowchanged",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
            ]

            # Converting the data uses id, so it is stripped from the data.
            data = convert_data_to_list_of_dicts_without_id_fields(
                models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
            )
            assert data == [
                {
                    "code": "go_to_state_1",
                    "name": "Go To State 1",
                    "target__code": "state_1_a",
                },
                {
                    "code": "go_to_state_1_a",
                    "name": "Go To State 1 A",
                    "target__code": "state_1_a",
                },
                {
                    "code": "go_to_state_3",
                    "name": "Go To State 3",
                    "target__code": "state_3",
                },
            ]

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
            )
            assert data == [
                {
                    "historical_permission_codename": "can_do_another_thing",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
                {
                    "historical_permission_codename": "update_workflowchanged",
                    "historical_permission_content_type_app_label": "workflow_changed",
                    "historical_permission_content_type_model_name": "workflowchanged",
                },
            ]

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                    "transition__code", "source__code"
                )
            )
            assert data == [
                {
                    "source__code": "state_2",
                    "transition__code": "go_to_state_1",
                },
                {
                    "source__code": "state_2",
                    "transition__code": "go_to_state_1_a",
                },
                {
                    "source__code": "state_3",
                    "transition__code": "go_to_state_1",
                },
            ]

            # Run migration 0005 backwards
            succeeded, results = self.call_command("migrate", "workflow_changed", "0004")
            if not succeeded:
                pytest.fail("".join(results), pytrace=False)

            # We should have run migration 0001 to 0003 and 0004 (faked).
            assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 4  # noqa: PLR2004

            # Verify the data is back in the original state.
            data = convert_data_to_list_of_dicts_without_id_fields(
                models.Workflow.objects.filter(code="changed_workflow").values()
            )
            assert data == orig_data_workflow

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
            )
            assert data == orig_data_workflow_permission

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.InitialState.objects.filter(workflow_id=workflow_pk).values("state__code", "state__name")
            )
            assert data == orig_data_initial_state

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.State.objects.filter(workflow_id=workflow_pk).values("code", "name")
            )
            assert data == orig_data_state

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
            )
            assert data == orig_data_state_permission

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
            )
            assert data == orig_data_transition

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
            )
            assert data == orig_data_transition_permission

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                    "transition__code", "source__code"
                )
            )
            assert data == orig_data_transition_source


class TestManagementCommandWorkflowDeleted(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_deleted(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_deleted": "tests.workflow_deleted",
        }
        append_installed_apps(settings, "tests.workflow_deleted")

        with self.temporary_migration_module(settings, app_label="workflow_deleted") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_deleted")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0004.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 4  # noqa: PLR2004

            # Create the generated migration 0005.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_deleted", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0005, because we rewrote it after it would have imported it.
            assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            results = frozenset([line.strip() for line in results if line.strip()])
            assert "Creating empty migration for workflow changes." in results
            migration_name = expect_one_migration_generated_today(migration_dir, "0005_workflow_migrations")
            assert f"Modified migration '{migration_name}' to migrate workflow for workflow_deleted." in results

            # Roll back 0004.
            succeeded, results = self.call_command("migrate", "workflow_deleted", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003 now.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 3  # noqa: PLR2004

            # Gather the data for the deleted workflow, so we can validate it is the same after we migrate backwards.
            orig_data_workflow = convert_data_to_list_of_dicts_without_id_fields(
                models.Workflow.objects.filter(code="deleted_workflow").values()
            )
            assert orig_data_workflow == [
                {
                    "code": "deleted_workflow",
                    "historical_app_label": "workflow_deleted",
                    "historical_model": "workflowdeleted",
                    "name": "Deleted Workflow",
                },
            ]

            workflow_pk = models.Workflow.objects.filter(code="deleted_workflow").first().id

            orig_data_workflow_permission = convert_data_to_list_of_dicts_without_id_fields(
                models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
            )
            assert orig_data_workflow_permission == [
                {
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
                {
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
            ]

            orig_data_initial_state = convert_data_to_list_of_dicts_without_id_fields(
                models.InitialState.objects.filter(workflow_id=workflow_pk).values("state__code", "state__name")
            )
            assert orig_data_initial_state == [
                {"state__code": "state_1", "state__name": "State 1"},
            ]

            orig_data_state = convert_data_to_list_of_dicts_without_id_fields(
                models.State.objects.filter(workflow_id=workflow_pk).values("code", "name")
            )
            assert orig_data_state == [
                {
                    "code": "state_1",
                    "name": "State 1",
                },
                {
                    "code": "state_2",
                    "name": "State 2",
                },
                {
                    "code": "state_3",
                    "name": "State 3",
                },
            ]

            orig_data_state_permission = convert_data_to_list_of_dicts_without_id_fields(
                models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
            )
            assert orig_data_state_permission == [
                {
                    "grant_or_deny": False,
                    "historical_group_name": "WorkflowDeletedAdmin",
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowDeletedWorker",
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
                {
                    "grant_or_deny": True,
                    "historical_group_name": "WorkflowDeletedAdmin",
                    "historical_permission_codename": "update_workflowdeleted",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
            ]

            orig_data_transition = convert_data_to_list_of_dicts_without_id_fields(
                models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
            )
            assert orig_data_transition == [
                {
                    "code": "go_to_state_1",
                    "name": "Go To State 1",
                    "target__code": "state_1",
                },
                {
                    "code": "go_to_state_2",
                    "name": "Go To State 2",
                    "target__code": "state_2",
                },
                {
                    "code": "go_to_state_3",
                    "name": "Go To State 3",
                    "target__code": "state_3",
                },
            ]

            orig_data_transition_permission = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
            )
            assert orig_data_transition_permission == [
                {
                    "historical_permission_codename": "can_do_something",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
                {
                    "historical_permission_codename": "can_do_something_else",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
                {
                    "historical_permission_codename": "update_workflowdeleted",
                    "historical_permission_content_type_app_label": "workflow_deleted",
                    "historical_permission_content_type_model_name": "workflowdeleted",
                },
            ]

            orig_data_transition_source = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                    "transition__code", "source__code"
                )
            )
            assert orig_data_transition_source == [
                {
                    "source__code": "state_1",
                    "transition__code": "go_to_state_2",
                },
                {
                    "source__code": "state_2",
                    "transition__code": "go_to_state_1",
                },
                {
                    "source__code": "state_3",
                    "transition__code": "go_to_state_1",
                },
            ]

            # Fake 0004, so we can run 0005 instead.
            succeeded, results = self.call_command("migrate", "workflow_deleted", "0004", "--fake")
            if not succeeded:
                pytest.fail("".join(results))

            assert models.Workflow.objects.filter(code="deleted_workflow").exists(), (
                "'deleted_workflow' should exist when it does not."
            )

            # Run migration 0005 forwards.
            succeeded, results = self.call_command("migrate", "workflow_deleted", "0005")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003, 0004 (faked), and 0005.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 5  # noqa: PLR2004

            # Verify the data is correct.
            assert models.Workflow.objects.filter(code="deleted_workflow").first() is None, (
                models.Workflow.objects.filter(code="deleted_workflow").values()
            )
            assert models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).first() is None, (
                models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
            )
            assert models.InitialState.objects.filter(workflow_id=workflow_pk).first() is None, (
                models.InitialState.objects.filter(workflow_id=workflow_pk).values()
            )
            assert models.State.objects.filter(workflow_id=workflow_pk).first() is None, models.State.objects.filter(
                workflow_id=workflow_pk
            ).values()
            assert models.StatePermission.objects.filter(state__workflow_id=workflow_pk).first() is None, (
                models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
            )
            assert models.Transition.objects.filter(workflow_id=workflow_pk).first() is None, (
                models.Transition.objects.filter(workflow_id=workflow_pk).values()
            )
            assert models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).first() is None, (
                models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
            )
            assert models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).first() is None, (
                models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values()
            )

            # Run migration 0005 backwards
            succeeded, results = self.call_command("migrate", "workflow_deleted", "0004")
            if not succeeded:
                pytest.fail("".join(results), pytrace=False)

            # We should have run migration 0001 to 0003 and 0004 (faked).
            assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 4  # noqa: PLR2004

            # Verify the data is back in the original state.
            data = convert_data_to_list_of_dicts_without_id_fields(
                models.Workflow.objects.filter(code="deleted_workflow").values()
            )
            assert data == orig_data_workflow

            # If the assert above passes, then we definitely have a workflow id.
            workflow_pk = models.Workflow.objects.filter(code="deleted_workflow").first().id

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
            )
            assert data == orig_data_workflow_permission

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.InitialState.objects.filter(workflow_id=workflow_pk).values("state__code", "state__name")
            )
            assert data == orig_data_initial_state

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.State.objects.filter(workflow_id=workflow_pk).values("code", "name")
            )
            assert data == orig_data_state

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
            )
            assert data == orig_data_state_permission

            # Converting the data uses id, so it is stripped from the data.
            data = convert_data_to_list_of_dicts_without_id_fields(
                models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
            )
            assert data == orig_data_transition

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
            )
            assert data == orig_data_transition_permission

            data = convert_data_to_list_of_dicts_without_id_fields(
                models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                    "transition__code", "source__code"
                )
            )
            assert data == orig_data_transition_source


class TestManagementCommandWorkflowDuplicates(BaseTestMigrations, BaseTestCallCommand):
    def get_unmatched_events_by_label(self, unmatched_history_data):
        """Group the codes of the events no migration captured, by what each event recorded.

        Grouping used to be by date, because the fixture wrote its own. A real write is stamped with
        the moment it happened, so every event in one test shares a date and only the event type
        separates them.
        """
        events_by_label = {}
        for record in unmatched_history_data:
            events_by_label.setdefault(record["pgh_label"], set()).add(record["code"])

        return events_by_label

    def _group_results(self, results):
        grouped_results = []

        previous_index = None
        for index, line in enumerate(results):
            if line.strip() and not line.startswith(" "):
                if previous_index is not None:
                    grouped_results.append("".join(results[previous_index:index]).strip())
                previous_index = index
        grouped_results.append("".join(results[previous_index:]).strip())

        return grouped_results

    @staticmethod
    def parse_debug_history_literal(ast_data):
        for remove_word in (
            "tzinfo=",
            "datetime",
            "timezone",
            "utc",
            ".",
        ):
            ast_data = ast_data.replace(remove_word, "")

        try:
            ast_data = ast.literal_eval(ast_data)
        except Exception:
            pytest.fail(f"unparseable debug history line: {ast_data}")

        return ast_data

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_duplicates(self, settings):
        """
        This test validates the matching of historical records to existing workflow migration
        changes works correctly when there are multiple add and delete records to work with.
        It uses the debugging to verify that the correct records were matched up.
        """
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_duplicates": "tests.workflow_duplicates",
        }
        append_installed_apps(settings, "tests.workflow_duplicates")

        with self.temporary_migration_module(settings, app_label="workflow_duplicates") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_duplicates").count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_duplicates")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_duplicates").count() == 3  # noqa: PLR2004

            # Create the generated migration 0004.
            succeeded, results = self.call_command(
                "makeworkflowmigrations",
                "workflow_duplicates",
                "--import-instead",
                "--debug",
                "all",
            )
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0004, because we rewrote it after it would have imported it.
            assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            grouped_results = self._group_results(results)

            num_changes_matching_history_records = {
                "num": 0,
                "sub_nums": [],
            }
            num_changes_not_matching_history_records = 0
            num_unmatched_history = 0
            unmatched_history_data = []
            for result in grouped_results:
                if " - " not in result:
                    # Ignore the lines that don't contain debug data.
                    continue
                heading, lines = result.split(" - ", 1)

                match heading:
                    case "Changes matching history records":
                        num_changes_matching_history_records["num"] += 1

                        change_data = None
                        history_pk = None
                        previous_line = None

                        num = 0
                        for line in lines.split("\n"):
                            line = line.strip()
                            if not line:
                                continue

                            if "matches history pk" in line:
                                _, history_pk = line.split("matches history pk")
                                history_pk = history_pk.strip(" :")

                            match previous_line:
                                case "Change:":
                                    change_data = line
                                case "History:":
                                    num += 1

                                    history_data = line

                                    # Make sure the history pk is in the change and history data.
                                    assert f"'matches_history': {history_pk}" in change_data
                                    assert f"'pgh_id': {history_pk}" in history_data
                                    # The two dates no longer agree, and should not. A change in a
                                    # migration file carries the date the edit was recorded under
                                    # the old backend; an event carries the moment the write really
                                    # happened, which for these fixtures is when the test ran.
                                    assert "datetime." in change_data
                                    assert "datetime." in history_data

                            previous_line = line

                        num_changes_matching_history_records["sub_nums"].append(num)

                    case "Changes not matching history records":
                        num_changes_not_matching_history_records += 1

                    case "Unmatched history":
                        num_unmatched_history += 1

                        previous_line = None
                        for line in lines.split("\n"):
                            line = line.strip()
                            if not line:
                                continue

                            if previous_line == "History which will be added to the migration:":
                                beginning_index = line.find("[")
                                ending_index = line.find("]")
                                ast_data = line[beginning_index + 1 : ending_index]
                                ast_data = self.parse_debug_history_literal(ast_data)
                                unmatched_history_data.append(ast_data)

                            previous_line = line

            # Nothing matches by value any more. Every change 0002 carries was applied by 0002
            # itself, and a generated migration's own writes are dropped by the action they record
            # before matching runs at all.
            assert num_changes_matching_history_records == {"num": 0, "sub_nums": []}
            # Three of 0002's own changes match nothing, and should not: a write a generated
            # migration made is dropped by the action it recorded, before anything is matched by
            # value. Only the states 0002 added and this test then re-added need matching at all.
            assert num_changes_not_matching_history_records == 3  # noqa: PLR2004
            assert num_unmatched_history == 1, unmatched_history_data

            events_by_label = self.get_unmatched_events_by_label(unmatched_history_data)

            # The deletes are what no migration has captured. The three re-adds are not here,
            # because they matched the three adds 0002 carries, one event each, which is the
            # duplicate matching this test exists for.
            assert set(events_by_label) == {"delete"}, events_by_label
            assert events_by_label["delete"] == frozenset(("delete_1", "delete_2", "delete_3", "delete_4")), (
                events_by_label
            )

            # Roll back 0003.
            succeeded, results = self.call_command("migrate", "workflow_duplicates", "0002")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003 now.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_duplicates").count() == 2  # noqa: PLR2004

            assert not models.State.objects.filter(code="add_1").exists(), (
                "states appears to exist when they should not."
            )

            # Fake 0003, so we can run 0004 instead.
            succeeded, results = self.call_command("migrate", "workflow_duplicates", "0003", "--fake")
            if not succeeded:
                pytest.fail("".join(results))

            # Run migration 0004 forwards.
            succeeded, results = self.call_command("migrate", "workflow_duplicates", "0004")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0002, 0003 (faked), and 0004.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_duplicates").count() == 4  # noqa: PLR2004

            # Verify the data is correct.
            workflow = models.Workflow.objects.filter(code="duplicates_workflow")
            assert workflow.exists(), models.Workflow.objects.values()

            state_codes = frozenset(models.State.objects.filter(workflow=workflow.get()).values_list("code", flat=True))

            # Replaying the generated migration lands on what the fixture's writes left behind:
            # all four delete_N states removed, leaving only the state 0002 added and kept.
            assert state_codes == {"not_used_by_test"}

            # Run migration 0004 backwards
            succeeded, results = self.call_command("migrate", "workflow_duplicates", "0003")
            if not succeeded:
                pytest.fail("".join(results), pytrace=False)

            # We should have run migration 0001 to 0002 and 0003 (faked).
            assert MigrationRecorder.Migration.objects.filter(app="workflow_duplicates").count() == 3  # noqa: PLR2004

            # Verify the data is back in the original state.
            state_codes = frozenset(models.State.objects.filter(workflow=workflow.get()).values_list("code", flat=True))

            assert state_codes == {"delete_1", "delete_2", "delete_3", "delete_4", "not_used_by_test"}


class TestManagementCommandWorkflowInitialState(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_object_states_created(self, settings):
        """
        This test validates that workflow object state objects are
        successfully created when they don't exist for objects when:
            1. During the creation of a workflow migration.
            2. When a workflow migration is run.
        """
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_initial_state": "tests.workflow_initial_state",
        }
        append_installed_apps(settings, "tests.workflow_initial_state")

        # Because there are 2 tests that use workflow_initial_state,
        # we need to clear the cache or the second test will fail.
        ContentType.objects.clear_cache()

        with self.temporary_migration_module(settings, app_label="workflow_initial_state") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_initial_state").count() == 0

            # Migrate forwards to 0003.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_initial_state").count() == 3  # noqa: PLR2004

            workflow = models.Workflow.objects.get(code="initial_state_workflow_test")
            assert models.ObjectState.objects.filter(workflow=workflow).count() == 0

            # Create the generated migration 0004.
            succeeded, results = self.call_command(
                "makeworkflowmigrations",
                "workflow_initial_state",
                "--import-instead",
            )
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0004, because we rewrote it after it would have imported it.
            # assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004
            assert set(models.ObjectState.objects.filter(workflow=workflow).values_list("state__code", flat=True)) == {
                "first"
            }

            # Roll back to 0001.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0001")
            if not succeeded:
                pytest.fail("".join(results))

            # Migrate to 0002.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0002")
            if not succeeded:
                pytest.fail("".join(results))

            # Fake 0003.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0003", "--fake")
            if not succeeded:
                pytest.fail("".join(results))

            # Workflow was deleted when rolling back to 0002.
            assert models.ObjectState.objects.count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_initial_state")
            if not succeeded:
                pytest.fail("".join(results))

            workflow = models.Workflow.objects.get(code="initial_state_workflow_test")
            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004
            assert set(models.ObjectState.objects.filter(workflow=workflow).values_list("state__code", flat=True)) == {
                "first"
            }

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_initial_state_changed(self, settings):
        """
        This test validates that when an initial state changes, any objects that haven't been
        modified from the previous initial state will be transitioned to the new initial state.
        Some objects have been moved into different states, to verify that
        """
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_initial_state": "tests.workflow_initial_state",
        }
        append_installed_apps(settings, "tests.workflow_initial_state")

        from tests.workflow_initial_state.models import WorkflowInitialState

        # Because there are 2 tests that use workflow_initial_state,
        # we need to clear the cache or the second test will fail.
        ContentType.objects.clear_cache()

        with self.temporary_migration_module(settings, app_label="workflow_initial_state") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_initial_state").count() == 0

            # Migrate forwards to 0003.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_initial_state").count() == 3  # noqa: PLR2004

            workflow = models.Workflow.objects.get(code="initial_state_workflow_test")
            assert models.ObjectState.objects.filter(workflow=workflow).count() == 0

            state_first = models.State.objects.get(code="first")
            state_second = models.State.objects.get(code="second")
            state_third = models.State.objects.get(code="third")
            state_fourth = models.State.objects.get(code="fourth")

            test_1 = WorkflowInitialState.objects.get(name="Test1")
            test_2 = WorkflowInitialState.objects.get(name="Test2")
            test_3 = WorkflowInitialState.objects.get(name="Test3")
            test_4 = WorkflowInitialState.objects.get(name="Test4")
            test_5 = WorkflowInitialState.objects.get(name="Test5")

            test_1.create_object_state()
            test_2.create_object_state()
            test_3.create_object_state()
            test_4.create_object_state()
            test_5.create_object_state()

            workflow = models.Workflow.objects.get(code="initial_state_workflow_test")
            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004

            # test_1 remains in the original object state
            test_2.update_object_state(state_second)
            test_3.update_object_state(state_third)
            test_4.update_object_state(state_fourth)
            test_5.update_object_state(state_fourth)
            test_5.update_object_state(state_first)

            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004

            # Change the initial state to fourth.
            initial_state = workflow.initial_state
            initial_state.state = state_fourth
            initial_state.save()

            # Run makeworkflowmigrations, which should update initial object states, when applicable.
            succeeded, results = self.call_command(
                "makeworkflowmigrations",
                "workflow_initial_state",
                "--dry-run",
            )
            if not succeeded:
                pytest.fail("".join(results))

            assert test_1.object_state.state.code == "fourth"
            assert test_2.object_state.state.code == "second"
            assert test_3.object_state.state.code == "third"
            assert test_4.object_state.state.code == "fourth"
            assert test_5.object_state.state.code == "first"

            # Clean up the object states, so we can start fresh.
            models.ObjectState.objects.filter(workflow=workflow).delete()

            # Reset initial_state.
            initial_state = workflow.initial_state
            initial_state.state = state_first
            initial_state.save()

            # Roll back to 0001.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0001")
            if not succeeded:
                pytest.fail("".join(results))

            # Migrate forwards to 0003.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 to 0003.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_initial_state").count() == 3  # noqa: PLR2004

            # Create the generated migration 0004.
            succeeded, results = self.call_command(
                "makeworkflowmigrations",
                "workflow_initial_state",
                "--import-instead",
            )
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0004, because we rewrote it after it would have imported it.
            # assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            state_fourth = models.State.objects.get(code="fourth")

            workflow = models.Workflow.objects.get(code="initial_state_workflow_test")
            assert set(models.ObjectState.objects.filter(workflow=workflow).values_list("state__code", flat=True)) == {
                "first"
            }

            # Change the initial state to fourth.
            initial_state = workflow.initial_state
            initial_state.state = state_fourth
            initial_state.save()

            assert set(models.ObjectState.objects.filter(workflow=workflow).values_list("state__code", flat=True)) == {
                "first"
            }

            time.sleep(0.1)

            # Create the generated migration 0005.
            succeeded, results = self.call_command(
                "makeworkflowmigrations",
                "workflow_initial_state",
                "--import-instead",
            )
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0005, because we rewrote it after it would have imported it.
            # assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            # Clean up the object states, so we can start fresh.
            models.ObjectState.objects.filter(workflow=workflow).delete()

            # Roll back to 0001.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0001")
            if not succeeded:
                pytest.fail("".join(results))

            # Migrate to 0002.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0002")
            if not succeeded:
                pytest.fail("".join(results))

            # Fake 0003.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0003", "--fake")
            if not succeeded:
                pytest.fail("".join(results))

            # Migrate to 0004.
            succeeded, results = self.call_command("migrate", "workflow_initial_state", "0004")
            if not succeeded:
                pytest.fail("".join(results))

            workflow = models.Workflow.objects.get(code="initial_state_workflow_test")
            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004

            state_first = models.State.objects.get(code="first")
            state_second = models.State.objects.get(code="second")
            state_third = models.State.objects.get(code="third")
            state_fourth = models.State.objects.get(code="fourth")

            test_1 = WorkflowInitialState.objects.get(name="Test1")
            test_2 = WorkflowInitialState.objects.get(name="Test2")
            test_3 = WorkflowInitialState.objects.get(name="Test3")
            test_4 = WorkflowInitialState.objects.get(name="Test4")
            test_5 = WorkflowInitialState.objects.get(name="Test5")

            # test_1 remains in the original object state
            test_2.update_object_state(state_second)
            test_3.update_object_state(state_third)
            test_4.update_object_state(state_fourth)
            test_5.update_object_state(state_fourth)
            test_5.update_object_state(state_first)

            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_initial_state")
            if not succeeded:
                pytest.fail("".join(results))

            # The historical counts should stay the same, since we should have updated test_1 to the new initial state.
            assert models.ObjectState.objects.filter(workflow=workflow).count() == 5  # noqa: PLR2004

            assert test_1.object_state.state.code == "fourth"
            assert test_2.object_state.state.code == "second"
            assert test_3.object_state.state.code == "third"
            assert test_4.object_state.state.code == "fourth"
            assert test_5.object_state.state.code == "first"


class TestManagementCommandWorkflowUpdating(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_updating": "tests.workflow_updating",
        }
        append_installed_apps(settings, "tests.workflow_updating")

        with self.temporary_migration_module(settings, app_label="workflow_updating") as migration_dir:
            migration_filepath = os.path.join(migration_dir, "0002_workflow_migrations_2026_06_29.py")

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Kept: the change reason and app label exactly, and every change changed_data records.
            assert (
                'history_change_reason = "Workflow Migration - 0002_workflow_migrations_2026_06_29"'
                in migration_content
            )
            assert 'migration_app_label = "workflow_updating"' in migration_content
            assert "changed_data = [" in migration_content

            # Original
            assert "def forwards_migrate_workflow(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_workflow(apps, schema_editor):" in migration_content
            assert "def make_sure_permissions_exist(apps, schema_editor):" in migration_content
            assert "def handle_workflow(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_workflow_permission(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_state(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_state_permission(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_initial_state(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_transition(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_transition_permission(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_transition_source(apps, changed_item, *, reversing=False):" in migration_content
            assert "code=make_sure_permissions_exist," in migration_content
            assert "code=forwards_migrate_workflow," in migration_content
            assert "reverse_code=backwards_migrate_workflow," in migration_content

            # Unchanged
            assert "def apply_and_save_changes(obj, data, *, reversing=False):" in migration_content
            assert "def get_id_values_from_item(values, reversing=False):" in migration_content
            assert "def get_id_values_from_dict(id_data, reversing=False):" in migration_content

            # New
            assert (
                "def forwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert (
                "def backwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert (
                "def make_sure_permissions_exist_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert "class WorkflowChangeTypes(enum.Enum):" not in migration_content
            assert "def workflow_migration_action(apps, change_reason):" not in migration_content
            assert "def forwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def _forwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def backwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def _backwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def make_sure_permissions_exist(app_label):" not in migration_content
            assert (
                "def handle_workflow(apps, changed_item, change_reason, *, reversing=False):" not in migration_content
            )
            assert (
                "def handle_workflow_permission(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert "def handle_state(apps, changed_item, change_reason, *, reversing=False):" not in migration_content
            assert (
                "def handle_state_permission(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert (
                "def handle_initial_state(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert (
                "def handle_transition(apps, changed_item, change_reason, *, reversing=False):" not in migration_content
            )
            assert (
                "def handle_transition_permission(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert (
                "def handle_transition_source(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert "def handle_state_objects(apps, *, reversing=False):" not in migration_content
            assert (
                "def manage_state_objects(workflow, obj_class, workflow_obj_state_class, object_state_event_class, "
                "*, reversing=False):" not in migration_content
            )
            assert "code=make_sure_permissions_exist_through_imports," not in migration_content
            assert "code=forwards_migrate_workflow_through_imports," not in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," not in migration_content

            succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Kept: the change reason and app label exactly, and every change changed_data records.
            assert (
                'history_change_reason = "Workflow Migration - 0002_workflow_migrations_2026_06_29"'
                in migration_content
            )
            assert 'migration_app_label = "workflow_updating"' in migration_content
            assert "changed_data = [" in migration_content

            # Removed Original
            assert "def forwards_migrate_workflow(apps, schema_editor):" not in migration_content
            assert "def backwards_migrate_workflow(apps, schema_editor):" not in migration_content
            assert "def make_sure_permissions_exist(apps, schema_editor):" not in migration_content
            assert "def handle_workflow(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_workflow_permission(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_state(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_state_permission(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_initial_state(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_transition(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_transition_permission(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_transition_source(apps, changed_item, *, reversing=False):" not in migration_content
            assert "code=make_sure_permissions_exist," not in migration_content
            assert "code=forwards_migrate_workflow," not in migration_content
            assert "reverse_code=backwards_migrate_workflow," not in migration_content

            # Unchanged
            assert "def apply_and_save_changes(obj, data, *, reversing=False):" in migration_content
            assert "def get_id_values_from_item(values, reversing=False):" in migration_content
            assert "def get_id_values_from_dict(id_data, reversing=False):" in migration_content

            # Added New
            assert (
                "def forwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert (
                "def backwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert (
                "def make_sure_permissions_exist_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert "class WorkflowChangeTypes(enum.Enum):" in migration_content
            assert "def workflow_migration_action(apps, change_reason):" in migration_content
            assert "def forwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def _forwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def backwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def _backwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def make_sure_permissions_exist(app_label):" in migration_content
            assert "def handle_workflow(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            assert (
                "def handle_workflow_permission(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert "def handle_state(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            assert (
                "def handle_state_permission(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert (
                "def handle_initial_state(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            )
            assert "def handle_transition(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            assert (
                "def handle_transition_permission(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert (
                "def handle_transition_source(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert "def handle_state_objects(apps, *, reversing=False):" in migration_content
            assert (
                "def manage_state_objects(workflow, obj_class, workflow_obj_state_class, object_state_event_class, "
                "*, reversing=False):" in migration_content
            )
            assert "code=make_sure_permissions_exist_through_imports," in migration_content
            assert "code=forwards_migrate_workflow_through_imports," in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," in migration_content

            # Every workflow these changes name by code now names the app and model as well, so a
            # code another model takes over later still resolves to the workflow the change meant.
            identity = {"historical_app_label": "workflow_updating", "historical_model": "workflowupdating"}
            workflow_id = {"code": "workflow_updating_workflow", **identity}

            changed_data = self.load_changed_data(migration_filepath)
            by_model = {changed_item["model_name"]: changed_item["changes"] for changed_item in changed_data}

            assert by_model["workflow"]["id"] == workflow_id
            assert by_model["state"]["workflow_id"] == workflow_id
            assert by_model["state"]["id"] == {"code": "state_b", "workflow_id": workflow_id}
            assert by_model["initialstate"]["state_id"]["workflow_id"] == workflow_id
            assert by_model["transition"]["workflow_id"] == workflow_id
            assert by_model["transitionpermission"]["transition_id"]["workflow_id"] == workflow_id
            assert by_model["transitionsource"]["source_id"]["workflow_id"] == workflow_id
            assert by_model["transitionsource"]["transition_id"]["workflow_id"] == workflow_id

            # Nothing else about a change moves.
            assert by_model["state"]["code"] == "state_b"
            assert by_model["state"]["name"] == "State B"

            # 0004 names a workflow whose own change is recorded in 0002, so what a code meant is
            # answered across the app's migrations rather than within one file.
            later_changed_data = self.load_changed_data(
                os.path.join(migration_dir, "0004_workflow_migrations_2026_07_01.py")
            )
            assert later_changed_data[0]["changes"]["workflow_id"] == workflow_id

    @staticmethod
    def load_changed_data(filepath):
        """Read the changes a rewritten migration records, as the objects they are."""
        spec = importlib.util.spec_from_file_location("updated_workflow_migration", filepath)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        return module.changed_data

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_direct_runpython_import(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_updating": "tests.workflow_updating",
        }
        append_installed_apps(settings, "tests.workflow_updating")

        with self.temporary_migration_module(settings, app_label="workflow_updating") as migration_dir:
            migration_filepath = os.path.join(migration_dir, "0003_workflow_migrations_2026_06_30.py")

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Kept: the change reason and app label exactly, and every change changed_data records.
            assert (
                'history_change_reason = "Workflow Migration - 0003_workflow_migrations_2026_06_30"'
                in migration_content
            )
            assert 'migration_app_label = "workflow_updating"' in migration_content
            assert "changed_data = [" in migration_content

            # Original

            assert "def forwards_migrate_workflow(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_workflow(apps, schema_editor):" in migration_content
            assert "def make_sure_permissions_exist(apps, schema_editor):" in migration_content
            assert "def handle_workflow(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_workflow_permission(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_state(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_state_permission(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_initial_state(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_transition(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_transition_permission(apps, changed_item, *, reversing=False):" in migration_content
            assert "def handle_transition_source(apps, changed_item, *, reversing=False):" in migration_content
            assert "code=make_sure_permissions_exist," in migration_content
            assert "code=forwards_migrate_workflow," in migration_content
            assert "reverse_code=backwards_migrate_workflow," in migration_content

            # Unchanged
            assert "from django.db.migrations import RunPython" in migration_content

            assert "def apply_and_save_changes(obj, data, *, reversing=False):" in migration_content
            assert "def get_id_values_from_item(values, reversing=False):" in migration_content
            assert "def get_id_values_from_dict(id_data, reversing=False):" in migration_content

            # New
            assert (
                "def forwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert (
                "def backwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert (
                "def make_sure_permissions_exist_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert "class WorkflowChangeTypes(enum.Enum):" not in migration_content
            assert "def workflow_migration_action(apps, change_reason):" not in migration_content
            assert "def forwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def _forwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def backwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def _backwards_migrate_workflow(apps, changed_items, change_reason):" not in migration_content
            assert "def make_sure_permissions_exist(app_label):" not in migration_content
            assert (
                "def handle_workflow(apps, changed_item, change_reason, *, reversing=False):" not in migration_content
            )
            assert (
                "def handle_workflow_permission(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert "def handle_state(apps, changed_item, change_reason, *, reversing=False):" not in migration_content
            assert (
                "def handle_state_permission(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert (
                "def handle_initial_state(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert (
                "def handle_transition(apps, changed_item, change_reason, *, reversing=False):" not in migration_content
            )
            assert (
                "def handle_transition_permission(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert (
                "def handle_transition_source(apps, changed_item, change_reason, *, reversing=False):"
                not in migration_content
            )
            assert "def handle_state_objects(apps, *, reversing=False):" not in migration_content
            assert (
                "def manage_state_objects(workflow, obj_class, workflow_obj_state_class, object_state_event_class, "
                "*, reversing=False):" not in migration_content
            )
            assert "code=make_sure_permissions_exist_through_imports," not in migration_content
            assert "code=forwards_migrate_workflow_through_imports," not in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," not in migration_content

            succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Kept: the change reason and app label exactly, and every change changed_data records.
            assert (
                'history_change_reason = "Workflow Migration - 0003_workflow_migrations_2026_06_30"'
                in migration_content
            )
            assert 'migration_app_label = "workflow_updating"' in migration_content
            assert "changed_data = [" in migration_content

            # Removed Original
            assert "def forwards_migrate_workflow(apps, schema_editor):" not in migration_content
            assert "def backwards_migrate_workflow(apps, schema_editor):" not in migration_content
            assert "def make_sure_permissions_exist(apps, schema_editor):" not in migration_content
            assert "def handle_workflow(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_workflow_permission(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_state(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_state_permission(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_initial_state(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_transition(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_transition_permission(apps, changed_item, *, reversing=False):" not in migration_content
            assert "def handle_transition_source(apps, changed_item, *, reversing=False):" not in migration_content
            assert "code=make_sure_permissions_exist," not in migration_content
            assert "code=forwards_migrate_workflow," not in migration_content
            assert "reverse_code=backwards_migrate_workflow," not in migration_content

            # Unchanged
            assert "from django.db.migrations import RunPython" in migration_content

            assert "def apply_and_save_changes(obj, data, *, reversing=False):" in migration_content
            assert "def get_id_values_from_item(values, reversing=False):" in migration_content
            assert "def get_id_values_from_dict(id_data, reversing=False):" in migration_content

            # Added New
            assert (
                "def forwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert (
                "def backwards_migrate_workflow_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert (
                "def make_sure_permissions_exist_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert "class WorkflowChangeTypes(enum.Enum):" in migration_content
            assert "def workflow_migration_action(apps, change_reason):" in migration_content
            assert "def forwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def _forwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def backwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def _backwards_migrate_workflow(apps, changed_items, change_reason):" in migration_content
            assert "def make_sure_permissions_exist(app_label):" in migration_content
            assert "def handle_workflow(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            assert (
                "def handle_workflow_permission(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert "def handle_state(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            assert (
                "def handle_state_permission(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert (
                "def handle_initial_state(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            )
            assert "def handle_transition(apps, changed_item, change_reason, *, reversing=False):" in migration_content
            assert (
                "def handle_transition_permission(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert (
                "def handle_transition_source(apps, changed_item, change_reason, *, reversing=False):"
                in migration_content
            )
            assert "def handle_state_objects(apps, *, reversing=False):" in migration_content
            assert (
                "def manage_state_objects(workflow, obj_class, workflow_obj_state_class, object_state_event_class, "
                "*, reversing=False):" in migration_content
            )
            assert "code=make_sure_permissions_exist_through_imports," in migration_content
            assert "code=forwards_migrate_workflow_through_imports," in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," in migration_content

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_no_changes(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_updating": "tests.workflow_updating",
        }
        append_installed_apps(settings, "tests.workflow_updating")

        with self.temporary_migration_module(settings, app_label="workflow_updating") as migration_dir:
            migration_filepath = os.path.join(migration_dir, "0004_workflow_migrations_2026_07_01.py")

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Kept: the change reason and app label exactly, and every change changed_data records.
            assert (
                'history_change_reason = "Workflow Migration - 0004_workflow_migrations_2026_07_01"'
                in migration_content
            )
            assert 'migration_app_label = "workflow_updating"' in migration_content
            assert "changed_data = [" in migration_content

            # Unchanged
            assert (
                "from vueda.workflow.management.commands.makeworkflowmigrations import backwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.management.commands.makeworkflowmigrations import make_sure_permissions_exist"
                in migration_content
            )

            assert "def forwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def make_sure_permissions_exist_through_imports(apps, schema_editor):" in migration_content

            succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Kept: the change reason and app label exactly, and every change changed_data records.
            assert (
                'history_change_reason = "Workflow Migration - 0004_workflow_migrations_2026_07_01"'
                in migration_content
            )
            assert 'migration_app_label = "workflow_updating"' in migration_content
            assert "changed_data = [" in migration_content

            # Unchanged
            assert (
                "from vueda.workflow.management.commands.makeworkflowmigrations import backwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.management.commands.makeworkflowmigrations import make_sure_permissions_exist"
                in migration_content
            )

            assert "def forwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def make_sure_permissions_exist_through_imports(apps, schema_editor):" in migration_content

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_keeps_changed_data_with_nothing_to_add(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_updating": "tests.workflow_updating",
        }
        append_installed_apps(settings, "tests.workflow_updating")

        with self.temporary_migration_module(settings, app_label="workflow_updating") as migration_dir:
            migration_filepath = os.path.join(migration_dir, "0004_workflow_migrations_2026_07_01.py")

            # The first run gives every workflow reference the app and model it can find.
            succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # A note an author wrote inside the list, which rewriting the list would drop.
            assert migration_content.count("changed_data = [") == 1
            migration_content = migration_content.replace(
                "changed_data = [", "changed_data = [  # A note kept by updateworkflowmigrations.\n"
            )
            with open(migration_filepath, "w", encoding="utf-8") as f:
                f.write(migration_content)

            # Nothing is left to add, so the second run writes the list back exactly as it found it.
            succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                assert f.read() == migration_content

    @pytest.mark.parametrize("missing_key", ["history_date", "model_name", "changes"])
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_changed_data_missing_a_key(self, settings, missing_key):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_updating": "tests.workflow_updating",
        }
        append_installed_apps(settings, "tests.workflow_updating")

        err = io.StringIO()
        out = io.StringIO()

        with self.temporary_migration_module(settings, app_label="workflow_updating") as migration_dir:
            broken_filepath = os.path.join(migration_dir, "0004_workflow_migrations_2026_07_01.py")
            other_filepath = os.path.join(migration_dir, "0002_workflow_migrations_2026_06_29.py")

            # The file still imports, but one change no longer holds a key the command reads.
            with open(broken_filepath, "a", encoding="utf-8") as f:
                f.write(f'\nchanged_data[0].pop("{missing_key}")\n')
            with open(broken_filepath, encoding="utf-8") as f:
                broken_content = f.read()

            with pytest.raises(SystemExit):
                self.call_command("updateworkflowmigrations", "workflow_updating", stdout=out, stderr=err)

            err.seek(0)
            errors = err.read()
            out.seek(0)
            output = out.read()

            # The file and the change are named, rather than a traceback naming neither.
            assert f"  Could not read changed_data in {broken_filepath}: change 0 has no '{missing_key}'\n" in errors, (
                errors
            )
            assert "Traceback" not in errors, errors
            assert "Failed updating 1 workflow migration(s).\n" in output, output

            # The file it could not read is left as it was.
            with open(broken_filepath, encoding="utf-8") as f:
                assert f.read() == broken_content

            # The migrations it could read are still updated.
            assert "Updated 2 workflow migration(s).\n" in output, output
            with open(other_filepath, encoding="utf-8") as f:
                assert "def forwards_migrate_workflow_through_imports(apps, schema_editor):" in f.read()

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_naive_history_dates(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_updating": "tests.workflow_updating",
        }
        append_installed_apps(settings, "tests.workflow_updating")

        with self.temporary_migration_module(settings, app_label="workflow_updating") as migration_dir:
            # 0002 records the workflow's own change, and 0004 names that workflow by code.
            migration_filepath = os.path.join(migration_dir, "0002_workflow_migrations_2026_06_29.py")
            later_filepath = os.path.join(migration_dir, "0004_workflow_migrations_2026_07_01.py")

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Dates written by hand, without the time zone every generated date carries. 0004 keeps
            # its generated dates, so the two files have to be ordered against each other.
            with open(migration_filepath, "w", encoding="utf-8") as f:
                f.write(migration_content.replace(", tzinfo=datetime.timezone.utc)", ")"))

            succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            output = "".join(results)

            assert f"  Naive dates found in changed_data in {migration_filepath}. Treating as UTC.\n" in output

            # Read as UTC, a naive date still orders against the dates other migrations recorded, so
            # both files name the workflow the code meant.
            identity = {"historical_app_label": "workflow_updating", "historical_model": "workflowupdating"}
            workflow_id = {"code": "workflow_updating_workflow", **identity}

            changed_data = self.load_changed_data(migration_filepath)
            by_model = {changed_item["model_name"]: changed_item["changes"] for changed_item in changed_data}

            assert by_model["workflow"]["id"] == workflow_id
            assert by_model["state"]["workflow_id"] == workflow_id
            assert self.load_changed_data(later_filepath)[0]["changes"]["workflow_id"] == workflow_id

            # The date itself is left as it was written.
            assert all(changed_item["history_date"].tzinfo is None for changed_item in changed_data)

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_bad_migrations(self, settings):
        settings.MIGRATION_MODULES = {
            "workflow_updating_bad_migrations": "tests.workflow_updating_bad_migrations",
        }
        append_installed_apps(settings, "tests.workflow_updating_bad_migrations")

        err = io.StringIO()
        out = io.StringIO()

        with self.temporary_migration_module(settings, app_label="workflow_updating_bad_migrations") as migration_dir:
            with pytest.raises(SystemExit):
                self.call_command(
                    "updateworkflowmigrations", "workflow_updating_bad_migrations", stdout=out, stderr=err
                )

            err.seek(0)
            results = err.read()

            assert (
                f"  Could not parse required sections in {migration_dir}"
                "/0002_workflow_migrations_2026_06_29.py, skipping.\n"
            ) in results
            assert (
                f"  Unable to parse migration at {migration_dir}/0003_workflow_migrations_2026_06_29.py"
                " due to syntax error '[' was never closed"
            ) in results

            out.seek(0)
            results = out.read()

            assert "Failed updating 2 workflow migration(s).\n" in results

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_no_migrations(self, settings):
        settings.MIGRATION_MODULES = {
            "workflow_updating_no_migrations": None,
        }
        append_installed_apps(settings, "tests.workflow_updating_no_migrations")

        succeeded, results = self.call_command("updateworkflowmigrations", "workflow_updating_no_migrations")
        if not succeeded:
            pytest.fail("".join(results))

        assert "No workflow migrations found to update.\n" in results

    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_bad_app_label(self):
        err = io.StringIO()

        with pytest.raises(SystemExit):
            self.call_command("updateworkflowmigrations", "app_that_does_not_exist", stderr=err)

        err.seek(0)
        results = err.read()

        assert "No installed app with label 'app_that_does_not_exist'.\n" in results


class GeneratesWorkflowMigrations:
    """For tests that generate workflow migrations for their own app, named by ``workflow_app_label``."""

    workflow_app_label: ClassVar[str]

    def generate_workflow_migration_or_fail(self, migration_dir):
        """Generate the next workflow migration, failing the test if that fails, and return its module."""
        succeeded, results = self.call_command("makeworkflowmigrations", self.workflow_app_label, "--import-instead")
        if not succeeded:
            pytest.fail("".join(results))

        assert results, "No results were captured when makeworkflowmigrations was called."

        module = self.reload_module(results, migration_dir)
        assert module is not None, "".join(results)

        return module


class TestManagementCommandWorkflowReusedCodes(GeneratesWorkflowMigrations, BaseTestMigrations, BaseTestCallCommand):
    """A state and the transition that names it, removed and added again under the same code.

    Each round of changes is written through the models with no action context, the way a person's
    edit in the workflow screens is written, so history records it as an edit rather than as a
    migration's replay. Each round then ends in a generated migration that is faked, which is what
    the command instructs the author to do and what leaves the round's own writes as the only record
    of it. Generating the next migration therefore has to match the earlier rounds' changes against
    writes that differ only in the row each one names.

    The transition is the only thing naming the state, as its target and as one transition's source,
    and both carry a permission, so a change reaches a reused code through every reference that can
    hold one: ``target_id``, ``source_id``, ``transition_id``, and ``state_id``.

    Rounds one and two remove the state and the transition again, which mixes deleted rows with the
    live ones the workflow keeps. Round three adds the same codes and keeps them, renaming the
    state. Round four gives both codes up to newer rows by renaming rather than removing, so that
    round three's permission and source rows are left naming a state and a transition that hold
    neither code, which is what matching round three's changes has to work out.

    Each round is asserted against its complete ordered change list rather than against the absence
    of the earlier rounds' writes, so that a write going missing fails as loudly as one appearing
    twice.
    """

    workflow_app_label = "workflow_reused_codes"

    WORKFLOW_CODE = "reused_codes_workflow"
    STATE_CODE = "reused_state"
    STATE_NAME = "Reused State"
    RENAMED_STATE_CODE = "renamed_state"
    RENAMED_STATE_NAME = "Renamed State"
    TRANSITION_CODE = "use_reused_state"
    TRANSITION_NAME = "Use Reused State"
    RENAMED_TRANSITION_CODE = "renamed_transition"
    RENAMED_TRANSITION_NAME = "Renamed Transition"
    BASE_TRANSITION_CODE = "go_to_state_1"
    GROUP_NAME = "ReusedCodesAdmin"
    PERMISSION_CODENAME = "update_workflowreusedcodes"

    @classmethod
    def workflow_id(cls):
        return {
            "code": cls.WORKFLOW_CODE,
            "historical_app_label": "workflow_reused_codes",
            "historical_model": "workflowreusedcodes",
        }

    @classmethod
    def state_id(cls, code):
        return {"code": code, "workflow_id": cls.workflow_id()}

    @classmethod
    def transition_id(cls, code):
        return {"code": code, "workflow_id": cls.workflow_id()}

    @classmethod
    def permission_id_fields(cls):
        return {
            "historical_permission_codename": cls.PERMISSION_CODENAME,
            "historical_permission_content_type_app_label": "workflow_reused_codes",
            "historical_permission_content_type_model_name": "workflowreusedcodes",
        }

    @classmethod
    def state_permission_id(cls, state_code):
        return {
            "group_id": {"name": cls.GROUP_NAME},
            "historical_group_name": cls.GROUP_NAME,
            **cls.permission_id_fields(),
            "state_id": cls.state_id(state_code),
        }

    @classmethod
    def transition_permission_id(cls, transition_code):
        return {**cls.permission_id_fields(), "transition_id": cls.transition_id(transition_code)}

    @classmethod
    def workflow_permission_id(cls):
        return {**cls.permission_id_fields(), "workflow_id": cls.workflow_id()}

    @classmethod
    def transition_source_id(cls, transition_code, source_code):
        return {
            "source_id": cls.state_id(source_code),
            "transition_id": cls.transition_id(transition_code),
        }

    @classmethod
    def expected_base_workflow_changes(cls):
        """The workflow 0002 creates, which the first generated migration captures ahead of round one."""
        return [
            ("workflow", "added", cls.workflow_id()),
            ("workflowpermission", "added", cls.workflow_permission_id()),
            ("state", "added", cls.state_id("state_1")),
            ("state", "added", cls.state_id("state_2")),
            ("initialstate", "added", {"state_id": cls.state_id("state_1"), "workflow_id": cls.workflow_id()}),
            ("statepermission", "added", cls.state_permission_id("state_1")),
            ("transition", "added", cls.transition_id(cls.BASE_TRANSITION_CODE)),
            ("transitionpermission", "added", cls.transition_permission_id(cls.BASE_TRANSITION_CODE)),
            ("transitionsource", "added", cls.transition_source_id(cls.BASE_TRANSITION_CODE, "state_2")),
        ]

    @classmethod
    def flatten_id(cls, value, prefix=""):
        """Render an id block as sorted ``path=value`` pairs, keeping every value it holds.

        Comparing the blocks as nested dictionaries is correct but unreadable when it fails: one
        change spans twenty lines of a diff, and a missing change reads as a reordering of the ones
        around it. Flattened, a change is one line, and sorting the keys keeps two equal blocks equal
        whatever order they were built in.
        """
        if isinstance(value, dict):
            pairs = []
            for key in sorted(value):
                pairs.extend(cls.flatten_id(value[key], f"{prefix}.{key}" if prefix else key))
            return pairs

        if type(value) is tuple:
            old, new = value
            if isinstance(old, dict) or isinstance(new, dict):
                return [*cls.flatten_id(old, f"{prefix}.old"), *cls.flatten_id(new, f"{prefix}.new")]
            return [f"{prefix}={old}->{new}"]

        return [f"{prefix}={value}"]

    @classmethod
    def describe(cls, entries):
        """Render ``(model, kind, id)`` entries one readable line each."""
        return [f"{model} {kind} " + " ".join(cls.flatten_id(identity)) for model, kind, identity in entries]

    @classmethod
    def describe_changes(cls, changed_data):
        """Reduce a generated migration's changes to the model, the kind of write, and the row named.

        A change carries its own field values, which say what the write did rather than which row it
        did it to: ``grant_or_deny`` on a state permission may be the very thing that changed. The
        ``id`` block is the data the command uses to find the row again, so that is what a change is
        recognised by here, and a field the write changed appears in it as a before-and-after pair.
        """
        return cls.describe(
            (changed_item["model_name"], changed_item["history_type"], changed_item["changes"]["id"])
            for changed_item in changed_data
        )

    @classmethod
    def check_changes(cls, label, migration, expected_entries, previous_migration=None):
        """Return how a generated migration differs from the round it should describe.

        Problems are collected rather than asserted so that one run reports every migration it
        generated. A round's edits and the migration built from them do not depend on the previous
        round's migration being right, so stopping at the first mismatch would hide the rest.
        """
        problems = []

        found = cls.describe_changes(migration.changed_data)
        expected = cls.describe(expected_entries)

        missing = list((Counter(expected) - Counter(found)).elements())
        unexpected = list((Counter(found) - Counter(expected)).elements())

        problems.extend(f"{label} is missing: {line}" for line in missing)
        problems.extend(f"{label} should not carry: {line}" for line in unexpected)

        if not missing and not unexpected and found != expected:
            problems.append(f"{label} holds the right changes out of order:\n    " + "\n    ".join(found))

        if previous_migration is not None:
            # Each round writes rows that are identical to the round before it apart from the row
            # each one names, so what a change describes cannot tell the two apart. When a change is
            # matched to another round's write, the migration still reads as a plausible one. The
            # moment each write was recorded is what separates them.
            earliest = min(changed_item["history_date"] for changed_item in migration.changed_data)
            previous_latest = max(changed_item["history_date"] for changed_item in previous_migration.changed_data)
            if earliest <= previous_latest:
                problems.append(
                    f"{label} carries a write recorded at {earliest}, before the previous migration's "
                    f"last write at {previous_latest}, so it describes a round that is already captured"
                )

        return problems

    @classmethod
    def expected_round_that_deletes(cls):
        """A round that adds the state and the transition, modifies it, and removes both again.

        Every write the round makes belongs here, permissions and source rows included. The command
        currently reaches a generated migration with only some of them, because
        ``_get_historical_queryset_for_model`` selects each model's events by joining through the
        live related row and falls back to selecting by recorded ids only when that finds nothing at
        all. One live row keeps the query non-empty, so the events of rows this round deleted are
        dropped before matching begins. Asserting the whole list is what makes that visible, and
        keeps a fix from trading missing old writes for missing new ones.
        """
        return [
            ("state", "added", cls.state_id(cls.STATE_CODE)),
            ("transition", "added", cls.transition_id(cls.TRANSITION_CODE)),
            ("transitionsource", "added", cls.transition_source_id(cls.TRANSITION_CODE, "state_1")),
            ("transitionsource", "added", cls.transition_source_id(cls.BASE_TRANSITION_CODE, cls.STATE_CODE)),
            ("transitionpermission", "added", cls.transition_permission_id(cls.TRANSITION_CODE)),
            ("statepermission", "added", cls.state_permission_id(cls.STATE_CODE)),
            ("transition", "changed", cls.transition_id(cls.TRANSITION_CODE)),
            ("transitionsource", "deleted", cls.transition_source_id(cls.TRANSITION_CODE, "state_1")),
            ("transitionsource", "deleted", cls.transition_source_id(cls.BASE_TRANSITION_CODE, cls.STATE_CODE)),
            ("transitionpermission", "deleted", cls.transition_permission_id(cls.TRANSITION_CODE)),
            ("transition", "deleted", cls.transition_id(cls.TRANSITION_CODE)),
            ("statepermission", "deleted", cls.state_permission_id(cls.STATE_CODE)),
            ("state", "deleted", cls.state_id(cls.STATE_CODE)),
        ]

    @classmethod
    def expected_round_that_renames(cls):
        """A round that adds the same codes, modifies the transition, then renames the state.

        Nothing is removed, so every row still has a live parent and the whole round is recorded.
        The rename shows up as a before-and-after pair on the code the row is found by.
        """
        return [
            ("state", "added", cls.state_id(cls.STATE_CODE)),
            ("transition", "added", cls.transition_id(cls.TRANSITION_CODE)),
            ("transitionsource", "added", cls.transition_source_id(cls.TRANSITION_CODE, "state_1")),
            ("transitionsource", "added", cls.transition_source_id(cls.BASE_TRANSITION_CODE, cls.STATE_CODE)),
            ("transitionpermission", "added", cls.transition_permission_id(cls.TRANSITION_CODE)),
            ("statepermission", "added", cls.state_permission_id(cls.STATE_CODE)),
            ("transition", "changed", cls.transition_id(cls.TRANSITION_CODE)),
            (
                "state",
                "changed",
                {"code": (cls.STATE_CODE, cls.RENAMED_STATE_CODE), "workflow_id": cls.workflow_id()},
            ),
        ]

    @classmethod
    def expected_round_that_takes_over_codes(cls):
        """A round that gives both codes to new rows, by renaming what held them rather than removing it.

        Nothing is deleted, so nothing is dropped, and the round leaves the previous round's
        permission and source rows naming a row that no longer holds the code they were written
        under. The transition's rename is a before-and-after pair on the code it is found by; the
        two additions are ordinary adds under codes that are free again.
        """
        return [
            ("state", "added", cls.state_id(cls.STATE_CODE)),
            (
                "transition",
                "changed",
                {"code": (cls.TRANSITION_CODE, cls.RENAMED_TRANSITION_CODE), "workflow_id": cls.workflow_id()},
            ),
            ("transition", "added", cls.transition_id(cls.TRANSITION_CODE)),
        ]

    def add_state_and_transition(self, workflow, permission, group):
        """Add the state, the transition that names it, and the rows that hang off both."""
        state_1 = models.State.objects.get(workflow=workflow, code="state_1")
        base_transition = models.Transition.objects.get(workflow=workflow, code="go_to_state_1")

        state = models.State.objects.create(workflow=workflow, code=self.STATE_CODE, name=self.STATE_NAME)
        transition = models.Transition.objects.create(
            workflow=workflow,
            code=self.TRANSITION_CODE,
            name=self.TRANSITION_NAME,
            target=state,
        )
        models.TransitionSource.objects.create(transition=transition, source=state_1)
        models.TransitionSource.objects.create(transition=base_transition, source=state)
        models.TransitionPermission.objects.create(transition=transition, permission=permission)
        models.StatePermission.objects.create(state=state, permission=permission, group=group, grant_or_deny=True)

        return state, transition

    def delete_state_and_transition(self, workflow):
        """Remove them one statement at a time, so history orders the writes the way they were made."""
        state = models.State.objects.get(workflow=workflow, code=self.STATE_CODE)
        transition = models.Transition.objects.get(workflow=workflow, code=self.TRANSITION_CODE)
        base_transition = models.Transition.objects.get(workflow=workflow, code="go_to_state_1")

        models.TransitionSource.objects.get(transition=transition).delete()
        models.TransitionSource.objects.get(transition=base_transition, source=state).delete()
        models.TransitionPermission.objects.get(transition=transition).delete()
        transition.delete()
        models.StatePermission.objects.get(state=state).delete()
        state.delete()

    def rename_transition(self, workflow, round_name):
        """Change the transition in the round that created it, so each round modifies it as well."""
        transition = models.Transition.objects.get(workflow=workflow, code=self.TRANSITION_CODE)
        transition.name = f"{self.TRANSITION_NAME} ({round_name})"
        transition.save()

    def assert_no_workflow_changes(self, migration_dir, failure):
        """Fail when a run finds changes to generate, showing the changes it would have generated.

        A dry run first, because it writes no file. Only a run that finds changes generates the
        migration, so the failure can say what those changes were.
        """
        succeeded, results = self.call_command(
            "makeworkflowmigrations", "workflow_reused_codes", "--import-instead", "--dry-run"
        )
        if not succeeded:
            pytest.fail("".join(results))

        if "No workflow changes detected." in "".join(results):
            return

        module = self.generate_workflow_migration_or_fail(migration_dir)
        pytest.fail(f"{failure}:\n{pformat(module.changed_data)}", pytrace=False)

    def fake_migration_or_fail(self, target):
        """Record migrations up to a target without running them, the way the command instructs."""
        succeeded, results = self.call_command("migrate", "workflow_reused_codes", target, "--fake")
        if not succeeded:
            pytest.fail("".join(results))

    HANDLER_NAMES = (
        "handle_workflow",
        "handle_workflow_permission",
        "handle_state",
        "handle_state_permission",
        "handle_initial_state",
        "handle_transition",
        "handle_transition_permission",
        "handle_transition_source",
    )

    def record_applied_changes(self, monkeypatch):
        """Return a list that a running migration appends to as it applies each change.

        A migration that raises says nothing about which of its changes it had reached; the
        traceback names the handler and the row it could not find, and leaves the rest to be worked
        out. Wrapping the handlers records the change on the way in, while its ``id`` block is still
        intact, so a failure can name what the migration was applying. Reversing flips a change's
        kind before dispatching, so a recorded kind is what the migration is doing, not what the
        change was written as.
        """
        applied = []

        def recorded(original):
            def handler(apps, changed_item, change_reason, *, reversing=False):
                applied.append(self.describe_changes([changed_item])[0])
                return original(apps, changed_item, change_reason, reversing=reversing)

            return handler

        for name in self.HANDLER_NAMES:
            monkeypatch.setattr(makeworkflowmigrations, name, recorded(getattr(makeworkflowmigrations, name)))

        return applied

    @staticmethod
    def migrate_or_fail_naming_applied_change(call, label, applied):
        """Run one migration, naming the change it was applying if it raises."""
        applied.clear()
        try:
            succeeded, results = call()
        except Exception as error:
            reached = applied[-1] if applied else "no change at all"
            pytest.fail(
                f"{label} raised on change {len(applied)}, {reached}\n    {error!r}",
                pytrace=False,
            )

        if not succeeded:
            pytest.fail(f"{label} failed:\n{''.join(results)}", pytrace=False)

    @classmethod
    def describe_snapshot_difference(cls, found, expected):
        """Name what differs between two snapshots, a row at a time."""
        if found == expected:
            return []

        if expected is None:
            return ["there is a workflow, where there should be none"]

        if found is None:
            return ["there is no workflow at all"]

        differences = []
        for key in sorted(expected):
            found_value = found.get(key)
            expected_value = expected[key]

            if found_value == expected_value:
                continue

            if isinstance(expected_value, list) and isinstance(found_value, list):
                differences.extend(
                    f"{key} is missing {row}" for row in (Counter(expected_value) - Counter(found_value)).elements()
                )
                differences.extend(
                    f"{key} should not have {row}"
                    for row in (Counter(found_value) - Counter(expected_value)).elements()
                )
            else:
                differences.append(f"{key} is {found_value}, where it should be {expected_value}")

        return differences

    @classmethod
    def snapshot_workflow(cls):
        """Everything the workflow holds, named by code rather than by id.

        Ids differ between the rows a round of edits wrote and the rows a migration writes replaying
        it, so a snapshot names every row the way a migration does. Taken after each round and again
        after the migration generated for that round is applied, two snapshots that differ say the
        migration did not reproduce the round, whatever the rows at the end of the run look like.
        """
        workflow = models.Workflow.objects.filter(code=cls.WORKFLOW_CODE).first()
        if workflow is None:
            return None

        initial_state = models.InitialState.objects.filter(workflow=workflow).first()

        return {
            "workflow": (workflow.code, workflow.name, workflow.historical_app_label, workflow.historical_model),
            "initial_state": initial_state and initial_state.state.code,
            "workflow_permissions": sorted(
                models.WorkflowPermission.objects.filter(workflow=workflow).values_list(
                    "historical_permission_codename", flat=True
                )
            ),
            "states": sorted(models.State.objects.filter(workflow=workflow).values_list("code", "name")),
            "state_permissions": sorted(
                models.StatePermission.objects.filter(state__workflow=workflow).values_list(
                    "state__code", "historical_permission_codename", "historical_group_name", "grant_or_deny"
                )
            ),
            "transitions": sorted(
                models.Transition.objects.filter(workflow=workflow).values_list("code", "name", "target__code")
            ),
            "transition_permissions": sorted(
                models.TransitionPermission.objects.filter(transition__workflow=workflow).values_list(
                    "transition__code", "historical_permission_codename"
                )
            ),
            "transition_sources": sorted(
                models.TransitionSource.objects.filter(transition__workflow=workflow).values_list(
                    "transition__code", "source__code", "ignored"
                )
            ),
        }

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_reused_codes(self, settings, monkeypatch):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_reused_codes": "tests.workflow_reused_codes",
        }
        append_installed_apps(settings, "tests.workflow_reused_codes")

        with self.temporary_migration_module(settings, app_label="workflow_reused_codes") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_reused_codes").count() == 0

            succeeded, results = self.call_command("migrate", "workflow_reused_codes")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 and 0002.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_reused_codes").count() == 2  # noqa: PLR2004

            workflow = models.Workflow.objects.get(code=self.WORKFLOW_CODE)
            permission = Permission.objects.get(
                codename="update_workflowreusedcodes",
                content_type__app_label="workflow_reused_codes",
            )
            group = Group.objects.get(name="ReusedCodesAdmin")

            # Round one: added, modified, and removed again. Each round's workflow is kept as it
            # stands when the round ends, so replaying the round's migration can be held to it.
            self.add_state_and_transition(workflow, permission, group)
            self.rename_transition(workflow, "One")
            self.delete_state_and_transition(workflow)
            snapshots = [self.snapshot_workflow()]

            first_migration = self.generate_workflow_migration_or_fail(migration_dir)

            # The workflow 0002 created has no generated migration of its own yet, so this one
            # captures that as well, ahead of round one's own writes.
            problems = self.check_changes(
                "0003",
                first_migration,
                [*self.expected_base_workflow_changes(), *self.expected_round_that_deletes()],
            )

            # The whole of one change, rather than the row it names. A workflow is recorded by its
            # code, by the content type it was written for, and by the app and model that outlive
            # that content type, and the date is the moment the write was really recorded.
            first_change = first_migration.changed_data[0]
            assert first_change["changes"] == {
                "code": self.WORKFLOW_CODE,
                "content_type_id": {"app_label": "workflow_reused_codes", "model": "workflowreusedcodes"},
                "historical_app_label": "workflow_reused_codes",
                "historical_model": "workflowreusedcodes",
                "id": self.workflow_id(),
                "name": "Reused Codes Workflow",
            }, first_change
            assert isinstance(first_change["history_date"], datetime.datetime)

            # Round two: the same codes added, modified, and removed again.
            self.add_state_and_transition(workflow, permission, group)
            self.rename_transition(workflow, "Two")
            self.delete_state_and_transition(workflow)
            snapshots.append(self.snapshot_workflow())

            second_migration = self.generate_workflow_migration_or_fail(migration_dir)

            # Round one is already captured by 0003, whose changes name rows that no longer exist and
            # whose codes now belong to round two's rows as well. Only round two belongs here, and
            # round two's writes are the only ones recorded after 0003's last.
            problems += self.check_changes(
                "0004", second_migration, self.expected_round_that_deletes(), previous_migration=first_migration
            )

            # Round three: the same codes added and modified, then the state renamed and kept.
            self.add_state_and_transition(workflow, permission, group)
            self.rename_transition(workflow, "Three")
            state = models.State.objects.get(workflow=workflow, code=self.STATE_CODE)
            state.code = self.RENAMED_STATE_CODE
            state.name = self.RENAMED_STATE_NAME
            state.save()
            snapshots.append(self.snapshot_workflow())

            third_migration = self.generate_workflow_migration_or_fail(migration_dir)

            # Three rows have now been added under the state's code and three under the
            # transition's. Both earlier rounds are captured by a migration, so only round three
            # belongs here.
            problems += self.check_changes(
                "0005", third_migration, self.expected_round_that_renames(), previous_migration=second_migration
            )

            # Round four takes both codes over with newer rows, without removing anything: the state
            # code round three renamed away from is free again, and renaming round three's transition
            # frees its code the same way. Round three's permission and source rows are left naming
            # a state and a transition that hold neither code any more, which is what matching
            # 0005's changes now has to work out.
            fourth_state = models.State.objects.create(workflow=workflow, code=self.STATE_CODE, name=self.STATE_NAME)
            renamed_transition = models.Transition.objects.get(workflow=workflow, code=self.TRANSITION_CODE)
            renamed_transition.code = self.RENAMED_TRANSITION_CODE
            renamed_transition.name = self.RENAMED_TRANSITION_NAME
            renamed_transition.save()
            models.Transition.objects.create(
                workflow=workflow,
                code=self.TRANSITION_CODE,
                name=self.TRANSITION_NAME,
                target=fourth_state,
            )
            snapshots.append(self.snapshot_workflow())

            fourth_migration = self.generate_workflow_migration_or_fail(migration_dir)

            # Four rows have now been added under the state's code and four under the transition's,
            # and the three earlier rounds are each captured by a migration. Matching 0005's changes
            # is what reaches a reused code through ``state_id`` and ``transition_id``, on the
            # permission and source rows that only a round keeping its rows can carry.
            problems += self.check_changes(
                "0006",
                fourth_migration,
                self.expected_round_that_takes_over_codes(),
                previous_migration=third_migration,
            )

            # Every round is captured by a migration now, so a further run has nothing left to find.
            self.assert_no_workflow_changes(
                migration_dir, "a run with every round already captured still found changes to generate"
            )

            # Nothing has replayed any of this yet: the rounds were edits, and no generated migration
            # has been applied. The author fakes them, because the rounds are already here, and then
            # rolls back to 0002, which runs every generated migration backwards for real. 0003
            # carries the workflow 0002 created, so the workflow goes with it and the generated
            # migrations can replay every round onto an empty workflow.
            # 0001 and 0002 stay applied. Reversing them would write outside any migration's action:
            # 0002's SQL records its deletes the way history records a person's edit, and 0001
            # recreates the group under a new id, which the rounds' permission writes no longer name.
            # Either would read as an edit no migration captures.
            self.fake_migration_or_fail("0006")

            succeeded, results = self.call_command("migrate", "workflow_reused_codes", "0002")
            if not succeeded:
                pytest.fail("".join(results))

            rolled_back = models.Workflow.objects.filter(code=self.WORKFLOW_CODE)
            assert not rolled_back.exists(), rolled_back.values()

            # Replay one round at a time, holding each against the workflow that round left behind.
            # A run that only checks the rows at the end would pass while an earlier migration put
            # the workflow somewhere it never was, so long as a later one happened to correct it.
            applied = self.record_applied_changes(monkeypatch)

            for round_number, snapshot in enumerate(snapshots, start=1):
                migration_name = f"000{round_number + 2}"

                self.migrate_or_fail_naming_applied_change(
                    lambda name=migration_name: self.call_command("migrate", "workflow_reused_codes", name),
                    migration_name,
                    applied,
                )

                differences = self.describe_snapshot_difference(self.snapshot_workflow(), snapshot)
                if differences:
                    pytest.fail(
                        f"{migration_name} left the workflow somewhere round {round_number} never put it:"
                        "\n    " + "\n    ".join(differences),
                        pytrace=False,
                    )

            # We should have run migration 0001 to 0006.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_reused_codes").count() == 6  # noqa: PLR2004

            # Replaying wrote every round again, under each migration's own action, beside the edits
            # the rounds were generated from. Those edits are still captured by the migrations, so a
            # run here has nothing left to find either.
            self.assert_no_workflow_changes(
                migration_dir, "a run after replaying every round found changes to generate"
            )

            # Reverse one migration at a time, holding each against the round before it. The
            # snapshots say what the workflow looked like at every point going back, so a migration
            # that reverses into a shape the workflow was never in fails where it happens.
            for round_number in range(len(snapshots), 0, -1):
                migration_name = f"000{round_number + 2}"

                self.migrate_or_fail_naming_applied_change(
                    lambda number=round_number: self.call_command(
                        "migrate", "workflow_reused_codes", f"000{number + 1}"
                    ),
                    f"reversing {migration_name}",
                    applied,
                )

                if round_number > 1:
                    expected = snapshots[round_number - 2]
                    failure = f"did not put the workflow back where round {round_number - 1} left it"
                else:
                    expected = None
                    failure = "left a workflow behind, though it carries the one 0002 creates"

                differences = self.describe_snapshot_difference(self.snapshot_workflow(), expected)
                if differences:
                    pytest.fail(
                        f"reversing {migration_name} {failure}:\n    " + "\n    ".join(differences),
                        pytrace=False,
                    )

            # We should be back to migration 0001 and 0002.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_reused_codes").count() == 2  # noqa: PLR2004

            # The changes each generated migration carries are reported last, so that a difference in
            # the workflow a migration produces is what a run shows first.
            if problems:
                pytest.fail("\n".join(problems), pytrace=False)


class TestManagementCommandWorkflowReceivedCodes(BaseTestMigrations, BaseTestCallCommand):
    """Local edits on a database that received a generated migration rather than writing one.

    The author of a workflow migration fakes it, because the changes are already in their database.
    Everyone else applies it, and the writes it makes are recorded under the action it opens. Those
    writes are excluded as matching candidates, deliberately, so on a database that applied a
    migration its changes have no record of their own to be matched against. What is left for them
    to reach is the edits the person at that database has since made, and a change that consumes one
    of those marks a local write as already captured, dropping it from the migration they generate.

    0002 is committed rather than generated here, because a migration the test generated would carry
    the edits that produced it, which is the situation this is the opposite of.
    """

    WORKFLOW_CODE = "received_codes_workflow"
    SHARED_STATE_CODE = "shared_code"
    SHARED_STATE_NAME = "Shared Code"

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_received_codes(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_received_codes": "tests.workflow_received_codes",
        }
        append_installed_apps(settings, "tests.workflow_received_codes")

        with self.temporary_migration_module(settings, app_label="workflow_received_codes") as migration_dir:
            # Apply the received migration rather than faking it, which is what everyone but its
            # author does. The workflow is written by the migration, under the action it opens.
            succeeded, results = self.call_command("migrate", "workflow_received_codes")
            if not succeeded:
                pytest.fail("".join(results))

            workflow = models.Workflow.objects.get(code=self.WORKFLOW_CODE)

            # 0002 adds the shared state and removes it again, so applying it leaves no trace of the
            # state in the workflow, and every event naming it belongs to the migration.
            state_codes = frozenset(models.State.objects.filter(workflow=workflow).values_list("code", flat=True))
            assert state_codes == {"state_1"}

            recorded = models.StateEvent.objects.filter(code=self.SHARED_STATE_CODE)
            assert recorded.count() == 2, recorded.values()  # noqa: PLR2004
            assert all(event.pgh_context.metadata["kind"] == MIGRATION_ACTION_KIND for event in recorded)

            # The local edit: the state the received migration removed, added back under the same
            # code. Its event is the only one in the workflow that is not a migration's.
            models.State.objects.create(workflow=workflow, code=self.SHARED_STATE_CODE, name=self.SHARED_STATE_NAME)

            succeeded, results = self.call_command(
                "makeworkflowmigrations", "workflow_received_codes", "--import-instead"
            )
            if not succeeded:
                pytest.fail("".join(results))

            assert "No workflow changes detected." not in "".join(results), (
                "the local write was taken as already captured by a change 0002 carries, so nothing "
                "was left to generate a migration from"
            )

            module = self.reload_module(results, migration_dir)
            assert module is not None, "".join(results)

            described = [
                (changed_item["model_name"], changed_item["history_type"], changed_item["changes"]["id"])
                for changed_item in module.changed_data
            ]
            assert described == [
                (
                    "state",
                    "added",
                    {
                        "code": self.SHARED_STATE_CODE,
                        "workflow_id": {
                            "code": self.WORKFLOW_CODE,
                            "historical_app_label": "workflow_received_codes",
                            "historical_model": "workflowreceivedcodes",
                        },
                    },
                ),
            ]


class TestManagementCommandWorkflowMovedCodes(GeneratesWorkflowMigrations, BaseTestMigrations, BaseTestCallCommand):
    """A workflow code given up by one model and taken over by another.

    A workflow code is unique among live workflows, not over time: delete a workflow and another
    model can take its code. Every change names a workflow by code alone, so deciding which app a
    change belongs to, and which workflow its rows hang off, has to survive a code that two content
    types have held.
    """

    workflow_app_label = "workflow_moved_codes"

    WORKFLOW_CODE = "moved_workflow"
    WORKFLOW_NAME = "Moved Workflow"

    @classmethod
    def workflow_id(cls, model_name):
        """Name the workflow the way a change does, by the model it was written for."""
        return {
            "code": cls.WORKFLOW_CODE,
            "historical_app_label": "workflow_moved_codes",
            "historical_model": model_name,
        }

    @classmethod
    def state_id(cls, model_name):
        return {"code": "state_1", "workflow_id": cls.workflow_id(model_name)}

    @classmethod
    def initial_state_id(cls, model_name):
        return {"state_id": cls.state_id(model_name), "workflow_id": cls.workflow_id(model_name)}

    def make_workflow_for(self, model_name):
        """Create the workflow, a state and an initial state against one of the two models."""
        content_type = ContentType.objects.get(app_label="workflow_moved_codes", model=model_name)
        workflow = models.Workflow.objects.create(
            code=self.WORKFLOW_CODE,
            name=self.WORKFLOW_NAME,
            content_type=content_type,
            historical_app_label="workflow_moved_codes",
            historical_model=model_name,
        )
        state = models.State.objects.create(workflow=workflow, code="state_1", name="State 1")
        models.InitialState.objects.create(workflow=workflow, state=state)

        return workflow

    @staticmethod
    def remove_workflow(workflow):
        """Take the workflow apart in the order the protected relations allow."""
        models.InitialState.objects.filter(workflow=workflow).delete()
        models.State.objects.filter(workflow=workflow).delete()
        workflow.delete()

    @staticmethod
    def describe(changed_data):
        return [
            (changed_item["model_name"], changed_item["history_type"], changed_item["changes"]["id"])
            for changed_item in changed_data
        ]

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_moved_codes(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_moved_codes": "tests.workflow_moved_codes",
        }
        append_installed_apps(settings, "tests.workflow_moved_codes")

        with self.temporary_migration_module(settings, app_label="workflow_moved_codes") as migration_dir:
            succeeded, results = self.call_command("migrate", "workflow_moved_codes")
            if not succeeded:
                pytest.fail("".join(results))

            # The code belongs to the first model, and a migration captures that.
            moved_from = self.make_workflow_for("workflowmovedfrom")
            first_migration = self.generate_workflow_migration_or_fail(migration_dir)

            assert self.describe(first_migration.changed_data) == [
                ("workflow", "added", self.workflow_id("workflowmovedfrom")),
                ("state", "added", self.state_id("workflowmovedfrom")),
                ("initialstate", "added", self.initial_state_id("workflowmovedfrom")),
            ]

            # The code is given up, and taken over by the second model.
            self.remove_workflow(moved_from)
            self.make_workflow_for("workflowmovedto")

            second_migration = self.generate_workflow_migration_or_fail(migration_dir)

            # Only the handover belongs here. Deciding which content type a change belongs to reads
            # the workflow its rows hang off, and both workflows answer to the same code, so a change
            # from 0002 must not be read as the second model's, nor its rows as the first model's.
            assert self.describe(second_migration.changed_data) == [
                ("initialstate", "deleted", self.initial_state_id("workflowmovedfrom")),
                ("state", "deleted", self.state_id("workflowmovedfrom")),
                ("workflow", "deleted", self.workflow_id("workflowmovedfrom")),
                ("workflow", "added", self.workflow_id("workflowmovedto")),
                ("state", "added", self.state_id("workflowmovedto")),
                ("initialstate", "added", self.initial_state_id("workflowmovedto")),
            ]

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_renamed_code_then_new_transition(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_moved_codes": "tests.workflow_moved_codes",
        }
        append_installed_apps(settings, "tests.workflow_moved_codes")

        with self.temporary_migration_module(settings, app_label="workflow_moved_codes") as migration_dir:
            succeeded, results = self.call_command("migrate", "workflow_moved_codes")
            if not succeeded:
                pytest.fail("".join(results))

            workflow = self.make_workflow_for("workflowmovedfrom")
            state = models.State.objects.get(workflow=workflow, code="state_1")
            self.generate_workflow_migration_or_fail(migration_dir)

            # The workflow is renamed, then a transition is added to the state it already had. The
            # state's own last event predates the rename, so it was recorded under the old code.
            workflow.code = "after_rename"
            workflow.save()
            models.Transition.objects.create(workflow=workflow, target=state, code="go", name="Go")

            renamed_workflow_id = {
                "code": "after_rename",
                "historical_app_label": "workflow_moved_codes",
                "historical_model": "workflowmovedfrom",
            }
            second_migration = self.generate_workflow_migration_or_fail(migration_dir)

            assert self.describe(second_migration.changed_data) == [
                (
                    "workflow",
                    "changed",
                    {
                        "code": (self.WORKFLOW_CODE, "after_rename"),
                        "historical_app_label": "workflow_moved_codes",
                        "historical_model": "workflowmovedfrom",
                    },
                ),
                ("transition", "added", {"code": "go", "workflow_id": renamed_workflow_id}),
            ]

            # The transition names its target state under the new workflow code. Matching has to
            # read the state's workflow as it stood when the transition was recorded, not when the
            # state was, or the transition is taken for an edit no migration has captured yet.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_moved_codes", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            assert "No workflow changes detected." in "".join(results), "".join(results)

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_faked_migration_rolled_back_and_reapplied(self, settings):
        settings.MIGRATION_MODULES = {
            "no_migrations": None,
            "workflow_moved_codes": "tests.workflow_moved_codes",
        }
        append_installed_apps(settings, "tests.workflow_moved_codes")

        with self.temporary_migration_module(settings, app_label="workflow_moved_codes") as migration_dir:
            succeeded, results = self.call_command("migrate", "workflow_moved_codes")
            if not succeeded:
                pytest.fail("".join(results))

            # The author's edits, captured by 0002 and faked, because they are already here.
            self.make_workflow_for("workflowmovedfrom")
            self.generate_workflow_migration_or_fail(migration_dir)

            succeeded, results = self.call_command("migrate", "workflow_moved_codes", "--fake")
            if not succeeded:
                pytest.fail("".join(results))

            # Rolling back runs 0002 backwards for real, and reapplying runs it forwards, so its own
            # writes now sit beside the edits it was generated from.
            succeeded, results = self.call_command("migrate", "workflow_moved_codes", "0001")
            if not succeeded:
                pytest.fail("".join(results))

            succeeded, results = self.call_command("migrate", "workflow_moved_codes")
            if not succeeded:
                pytest.fail("".join(results))

            # That 0002 ran here does not mean the edits it was generated from are missing, so they
            # are still captured by it, and nothing is left for a new migration.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_moved_codes", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            assert "No workflow changes detected." in "".join(results), "".join(results)


class TestManagementCommandUtils:
    def test_workflow_update_operation_function_name_with_conflicting_dependency_names(self):
        from vueda.workflow.management.commands.updateworkflowmigrations import OPERATION_FUNCTION_RENAMES

        results = update_operation_function_names(
            """
class Migration(migrations.Migration):
    dependencies = [
        ("test", "0001_make_sure_permissions_exist"),
        ("test", "0002_forwards_migrate_workflow"),
        ("test", "0003_backwards_migrate_workflow"),
    ]

    operations = [
        migrations.RunPython(
            code=make_sure_permissions_exist,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            code=forwards_migrate_workflow,
            reverse_code=backwards_migrate_workflow,
        ),
    ]
""",
            OPERATION_FUNCTION_RENAMES,
        )

        assert "code=make_sure_permissions_exist_through_imports," in results
        assert "code=forwards_migrate_workflow_through_imports," in results
        assert "reverse_code=backwards_migrate_workflow_through_imports," in results
        assert '("test", "0001_make_sure_permissions_exist"),' in results
        assert '("test", "0002_forwards_migrate_workflow"),' in results
        assert '("test", "0003_backwards_migrate_workflow"),' in results
