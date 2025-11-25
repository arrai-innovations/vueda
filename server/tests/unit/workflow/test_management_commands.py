import ast
import datetime

import pytest
from django.db.migrations.recorder import MigrationRecorder
from django.test import override_settings

from tests.conftest import BaseTestCallCommand
from tests.utils import BaseTestMigrations
from tests.utils import info_register_aware_modify_settings
from vueda.workflow import models


# TODO: When there is time, a good test to have, would be one where we run
# "makeworkflowmigrations" twice, so we can confirm that works correctly.


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


def strip_registered_info_from_stderr(stderr):
    for msg in stderr.split("\n"):
        if msg.startswith("INFO Registered") and " with <" in msg and "> and <" in msg:
            stderr = stderr.replace(msg + "\n", "")
        elif msg.startswith("INFO Registered") and " with <" in msg:
            stderr = stderr.replace(msg + "\n", "")
    return stderr


class TestManagementCommandWorkflow(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "workflow_added": "tests.workflow_added",
            "workflow_changed": "tests.workflow_changed",
            "workflow_deleted": "tests.workflow_deleted",
            "workflow_duplicates": "tests.workflow_duplicates",
            "workflow_multi": "tests.workflow_multi",
        },
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.workflow_added",
                "tests.workflow_changed",
                "tests.workflow_deleted",
                "tests.workflow_duplicates",
                "tests.workflow_multi",
            ],
        }
    )
    @pytest.mark.django_db
    def test_no_app_label_specified(self):
        with (
            self.temporary_migration_module(app_label="workflow_added"),
            self.temporary_migration_module(app_label="workflow_changed"),
            self.temporary_migration_module(app_label="workflow_deleted"),
            self.temporary_migration_module(app_label="workflow_duplicates"),
            self.temporary_migration_module(app_label="workflow_multi"),
        ):
            # No migrations should have run yet.
            assert (
                MigrationRecorder.Migration.objects.filter(
                    app__in=(
                        "workflow_added",
                        "workflow_changed",
                        "workflow_deleted",
                        "workflow_duplicates",
                        "workflow_multi",
                    )
                ).count()
                == 0
            )

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_added")
            if not succeeded:
                pytest.fail("".join(results))

            succeeded, results = self.call_command("migrate", "workflow_changed")
            if not succeeded:
                pytest.fail("".join(results))

            succeeded, results = self.call_command("migrate", "workflow_deleted")
            if not succeeded:
                pytest.fail("".join(results))

            succeeded, results = self.call_command("migrate", "workflow_duplicates")
            if not succeeded:
                pytest.fail("".join(results))

            succeeded, results = self.call_command("migrate", "workflow_multi")
            if not succeeded:
                pytest.fail("".join(results))

            # 15 migrations should have run.
            assert (
                MigrationRecorder.Migration.objects.filter(
                    app__in=(
                        "workflow_added",
                        "workflow_changed",
                        "workflow_deleted",
                        "workflow_duplicates",
                        "workflow_multi",
                    )
                ).count()
                == 15  # noqa: PLR2004
            )

            succeeded, results = self.call_command("makeworkflowmigrations")
            if not succeeded:
                pytest.fail("".join(results), pytrace=False)

            results = frozenset([line.strip() for line in results if line.strip()])

            assert "Migrations for 'workflow_added':" in results, results
            assert "Migrations for 'workflow_changed':" in results, results
            assert "Migrations for 'workflow_deleted':" in results, results
            assert "Migrations for 'workflow_duplicates':" in results, results
            assert "Migrations for 'workflow_multi':" in results, results


class TestManagementCommandWorkflowAdded(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "workflow_added": "tests.workflow_added",
        },
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.workflow_added",
            ],
        }
    )
    @pytest.mark.django_db
    def test_workflow_added(self):
        with self.temporary_migration_module(app_label="workflow_added") as migration_dir:
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

            # Reload 0003, because we rewrote it after it would have imported it.
            assert results, "No results were captured when makeworkflowmigrations was called."
            self.reload_module(results, migration_dir)

            results = frozenset([line.strip() for line in results if line.strip()])
            assert "Creating empty migration for workflow changes." in results
            assert (
                f"Modified migration '0003_workflow_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py' "
                f"to migrate workflow for workflow_added." in results
            )

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
                models.State.objects.filter(workflow_id=workflow_pk).values()
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
            assert models.Workflow.objects.filter(code="added_workflow").first() is None, (
                models.Workflow.objects.filter(code="added_workflow").values()
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


class TestManagementCommandWorkflowChanged(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "workflow_changed": "tests.workflow_changed",
        },
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.workflow_changed",
            ],
        }
    )
    @pytest.mark.django_db
    def test_workflow_changed(self):
        with self.temporary_migration_module(app_label="workflow_changed") as migration_dir:
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
            assert (
                f"Modified migration '0005_workflow_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py' "
                f"to migrate workflow for workflow_changed." in results
            )

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
                models.State.objects.filter(workflow_id=workflow_pk).values()
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
                models.State.objects.filter(workflow_id=workflow_pk).values()
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
                models.State.objects.filter(workflow_id=workflow_pk).values()
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


@pytest.mark.django_db
class TestManagementCommandWorkflowDeleted(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "workflow_deleted": "tests.workflow_deleted",
        },
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.workflow_deleted",
            ],
        }
    )
    @pytest.mark.django_db
    def test_workflow_deleted(self):
        with self.temporary_migration_module(app_label="workflow_deleted") as migration_dir:
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
            assert (
                f"Modified migration '0005_workflow_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py' "
                f"to migrate workflow for workflow_deleted." in results
            )

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
                models.State.objects.filter(workflow_id=workflow_pk).values()
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
                models.State.objects.filter(workflow_id=workflow_pk).values()
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


class TestManagementCommandWorkflowMulti(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "workflow_multi": "tests.workflow_multi",
        },
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.workflow_multi",
            ],
        }
    )
    @pytest.mark.django_db
    def test_workflow_multi(self):
        with self.temporary_migration_module(app_label="workflow_multi") as migration_dir:
            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "workflow_multi")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 and 0002.
            assert MigrationRecorder.Migration.objects.filter(app="workflow_multi").count() == 2  # noqa: PLR2004

            # Create the generated migration 0003.
            succeeded, results = self.call_command("makeworkflowmigrations", "workflow_multi", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            # Reload 0003, because we rewrote it after it would have imported it.
            assert results, "No results were captured when makeworkflowmigrations was called."
            migration = self.reload_module(results, migration_dir)

            results = frozenset([line.strip() for line in results if line.strip()])
            assert "Creating empty migration for workflow changes." in results
            assert (
                f"Modified migration '0003_workflow_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py' "
                f"to migrate workflow for workflow_multi." in results
            )

            assert len(migration.changed_data) == 10, migration.changed_data  # noqa: PLR2004

            # The workflow added record should be the first record, and it should have a specific history date.
            first_change = migration.changed_data[0]
            assert first_change == {
                "changes": {
                    "code": "complete",
                    "content_type_id": {"app_label": "workflow_multi", "model": "workflowmulti"},
                    "historical_app_label": "workflow_multi",
                    "historical_model": "workflowmulti",
                    "id": {"code": "complete"},
                    "name": "complete",
                },
                "history_date": datetime.datetime(2024, 7, 17, 19, 53, 55, 857366, tzinfo=datetime.UTC),
                "history_type": "added",
                "model_name": "workflow",
            }, first_change


class TestManagementCommandWorkflowDuplicates(BaseTestMigrations, BaseTestCallCommand):
    def get_unmatched_history_records_by_date(self, unmatched_history_data):
        history_records_by_date = {}
        for record in unmatched_history_data:
            key = (record["history_type"], record["history_date"])
            if key not in history_records_by_date:
                history_records_by_date[key] = set()

            history_records_by_date[key].add(record["code"])

        return history_records_by_date

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
    def _handle_ast_data(ast_data):
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
            raise Exception(ast_data)

        return ast_data

    @override_settings(
        MIGRATION_MODULES={
            "workflow_duplicates": "tests.workflow_duplicates",
        },
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.workflow_duplicates",
            ],
        }
    )
    @pytest.mark.django_db
    def test_workflow_duplicates(self):
        """
        This test validates the matching of historical records to existing workflow migration
        changes works correctly when there are multiple add and delete records to work with.
        It uses the debugging to verify that the correct records were matched up.
        """
        with self.temporary_migration_module(app_label="workflow_duplicates") as migration_dir:
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

            # Reload 0005, because we rewrote it after it would have imported it.
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
                                    assert f"'history_id': {history_pk}" in history_data
                                    # Make sure the history dates are the same.
                                    # [1] should contain a string like 'datetime(2025, 1, 1, 1, 0, tzinfo='
                                    assert change_data.split("datetime.")[1] == history_data.split("datetime.")[1]

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
                                ast_data = self._handle_ast_data(ast_data)
                                unmatched_history_data.append(ast_data)

                            previous_line = line

            assert num_changes_matching_history_records == {"num": 3, "sub_nums": [1, 5, 1]}
            # There should be no changes not matching history records.
            assert not num_changes_not_matching_history_records
            assert num_unmatched_history == 1, unmatched_history_data

            history_records_by_date = self.get_unmatched_history_records_by_date(unmatched_history_data)

            assert history_records_by_date[("-", (2025, 1, 1, 1, 0, 10))] == frozenset(
                ("delete_1", "delete_2", "delete_3", "delete_4")
            ), history_records_by_date
            assert history_records_by_date[("+", (2025, 1, 1, 1, 0, 11))] == frozenset(
                ("add_1", "add_2", "add_3", "add_4", "delete_2", "delete_3", "delete_4")
            ), history_records_by_date
            assert history_records_by_date[("~", (2025, 1, 1, 1, 0, 12))] == frozenset(
                ("add_2a", "add_3a", "add_4a", "delete_3a", "delete_4a")
            ), history_records_by_date
            assert history_records_by_date[("-", (2025, 1, 1, 1, 0, 13))] == frozenset(
                ("add_3a", "add_4a", "delete_4a")
            ), history_records_by_date
            assert history_records_by_date[("+", (2025, 1, 1, 1, 0, 14))] == frozenset(("add_4",)), (
                history_records_by_date
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

            assert state_codes == {"add_1", "add_2a", "add_4", "delete_2", "delete_3a", "not_used_by_test"}

            # Run migration 0004 backwards
            succeeded, results = self.call_command("migrate", "workflow_duplicates", "0003")
            if not succeeded:
                pytest.fail("".join(results), pytrace=False)

            # We should have run migration 0001 to 0002 and 0003 (faked).
            assert MigrationRecorder.Migration.objects.filter(app="workflow_duplicates").count() == 3  # noqa: PLR2004

            # Verify the data is back in the original state.
            state_codes = frozenset(models.State.objects.filter(workflow=workflow.get()).values_list("code", flat=True))

            assert state_codes == {"delete_1", "delete_2", "delete_3", "delete_4", "not_used_by_test"}
