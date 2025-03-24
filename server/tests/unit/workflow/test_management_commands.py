import datetime
import json
import os
import subprocess
from importlib import import_module

import pytest
from django.db.migrations.recorder import MigrationRecorder
from django.utils.timezone import now

from tests.conftest import BaseTestCallCommand
from tests.utils import clean_migrations
from vueda.workflow import models


# There are 6 tests in this file, 2 per test class.
#   TestManagementCommandWorkflowAdded
#       test_workflow_added, investigate_running_migration_forwards_and_backwards
#   TestManagementCommandWorkflowChanged
#       test_workflow_changed, investigate_running_migration_forwards_and_backwards
#   TestManagementCommandWorkflowDeleted
#       test_workflow_deleted, investigate_running_migration_forwards_and_backwards
#
# The main tests are prefixed with "test_".
# The subtests are prefixed with "investigate_".
#
# Each of the main tests creates a workflow migration by using the "makeworkflowmigrations"
# management command.  They then call pytest with the following arguments:
#
#   -vv
#       So we get verbose errors, if any occur.  The side effect of this,
#       is that database creation and teardown messages end up in stderr.
#   -s
#       So we can capture all the output.
#   --json-report
#   --json-report-file
#       To help parse the pytest output, so we can easily know if the test
#       passed, failed, or errored.
#   -c tests/unit/workflow/pytest_running_workflow_migrations.ini
#       To use this ini file for pytest config.  This allows us to tell
#       pytest that we want to run the tests that are prefixed with
#       "investigate_" and use a different settings file
#       (settings_running_workflow_migrations.py), so we can specify through
#       an environment variable the name of the test database.  We can't import
#       from test settings, or clean_migrations will run, and remove the migration
#       we are in the process of testing.
#   --rootdir os.getcwd()
#       This is needed, because the root directory otherwise becomes the same
#       as the location of the .ini file.
#
#   And then we specify the classname where the tests are we are running, so
#   we only run the corresponding subtest for each main test.
#
# In the main tests, before the subtest is run, we set the environment variable
# "skip_migration_when_setting_up_db", so that when migrations are run, it
# skips running the sql for specific migrations, so we can easily roll those
# migrations back.  The reason we skip them at that time, is because we want
# to run them in the tests, so we can verify the data before, after migrating
# forwards, and after migrating backwards.  That is the purpose of the subtests.


# Since these tests create migrations on disk, we can't have multiple tests in the
# same class running at the same time, or they would step on each other.
SUBPROCESS_EXCEPTION_TEXT = "\n\nException when calling pytest through subprocess:\n\n"


# TODO: When there is time, a good test to have, would be one where we run # noqa T101
# "makeworkflowmigrations" twice, so we can confirm that works correctly.


def convert_data_to_list_of_dicts_without_id_fields(queryset):
    data = []

    for values in queryset.order_by("id"):
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


class TestManagementCommandWorkflow(BaseTestCallCommand):
    @pytest.mark.django_db
    def test_no_app_label_specified(self):
        succeeded, results = self.call_command("makeworkflowmigrations", "--dry-run")
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        results = frozenset([line.strip() for line in results if line.strip()])

        assert "Migrations for 'workflow_added':" in results, results
        assert "Migrations for 'workflow_changed':" in results, results
        assert "Migrations for 'workflow_deleted':" in results, results


class TestManagementCommandWorkflowAdded(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow added.
        clean_migrations("workflow_added")

    @pytest.mark.django_db
    def test_workflow_added(self):
        succeeded, results = self.call_command(
            "makeworkflowmigrations", "workflow_added", "--env-guarded-operations", "--import-instead"
        )
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        results = frozenset([line.strip() for line in results if line.strip()])

        assert "Creating empty migration for workflow changes." in results
        assert (
            f"Modified migration '0003_workflow_migrations_{now().date().strftime('%Y_%m_%d')}.py' "
            f"to migrate workflow for workflow_added." in results
        )

        test_db_name = "vueda_workflow_management_command_migration_testing_added"
        os.environ["workflow_test_type"] = "added"  # This is added to the end of the db name in settings.
        os.environ["skip_migration_when_setting_up_db"] = "true"

        json_report_file = "pytest_running_workflow_migrations_added.json"

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        # Run the investigate_running_migration_forwards_and_backwards test.
        results = subprocess.run(
            [
                "pytest",
                "-vv",
                "-s",
                "--json-report",
                f"--json-report-file={json_report_file}",
                "-c",
                "tests/unit/workflow/pytest_running_workflow_migrations.ini",
                "--rootdir",
                os.getcwd(),
                "tests/unit/workflow/test_management_commands.py::TestManagementCommandWorkflowAdded",
            ],
            capture_output=True,
        )

        # Database creation and deletion are added to stderr.  We don't want those messages in stderr.
        stderr = strip_database_creation_and_deletion_from_stderr(results.stderr.decode("utf-8"), test_db_name)

        if stderr:
            pytest.fail(SUBPROCESS_EXCEPTION_TEXT + stderr, pytrace=False)

        with open(json_report_file, "rb") as f:
            json_results = json.load(f)

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        summary = json_results["summary"]

        if "error" in summary:
            for test in json_results["tests"]:
                if test["outcome"] == "error":
                    if "longrepr" in test["setup"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire error object back.
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + str(test))

        if "failed" in summary:
            for test in json_results["tests"]:
                if test["outcome"] == "failed":
                    if "longrepr" in test["setup"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire dictionary as the error.
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + str(test))

        # Migrating forwards and backwards passed!

    # This is a test that will be run by pytest when we call pytest within test_workflow_added.
    @pytest.mark.django_db
    def investigate_running_migration_forwards_and_backwards(self):
        # The operations in 0002 and the generated 0003 will not run the
        # sql forwards, so we can roll back and then run them manually.
        succeeded, results = self.call_command("migrate", "workflow_added", "0001")
        assert succeeded, results

        # Did the migrations roll back?
        # assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 1

        # Now we want to manually migrate forwards, skipping certain tests by using 'migration_skip_workflow_added'.
        os.environ.pop("skip_migration_when_setting_up_db")
        skip_some_migrations_forward_env_name = "migration_skip_workflow_added"
        os.environ[skip_some_migrations_forward_env_name] = "true"

        assert not models.Workflow.objects.filter(code="added_workflow").exists(), (
            "'added_workflow' appears to exist when it should not."
        )

        # Run migration 0003 forwards
        succeeded, results = self.call_command("migrate", "workflow_added", "0003")

        # Did the migration run?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 3

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

        os.environ[skip_some_migrations_forward_env_name] = "false"

        # Did the migration reverse?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 2

        assert models.Workflow.objects.filter(code="added_workflow").first() is None, models.Workflow.objects.filter(
            code="added_workflow"
        ).values()
        assert models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).first() is None, (
            models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
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


class TestManagementCommandWorkflowChanged(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow changed.
        clean_migrations("workflow_changed")

    @pytest.mark.django_db
    def test_workflow_changed(self):
        succeeded, results = self.call_command(
            "makeworkflowmigrations", "workflow_changed", "--env-guarded-operations", "--import-instead"
        )
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        results = frozenset([line.strip() for line in results if line.strip()])

        assert "Creating empty migration for workflow changes." in results
        assert (
            f"Modified migration '0005_workflow_migrations_{now().date().strftime('%Y_%m_%d')}.py' "
            f"to migrate workflow for workflow_changed." in results
        )

        test_db_name = "vueda_workflow_management_command_migration_testing_changed"
        os.environ["workflow_test_type"] = "changed"  # This is added to the end of the db name in settings.
        os.environ["skip_migration_when_setting_up_db"] = "true"

        json_report_file = "pytest_running_workflow_migrations_changed.json"

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        # Run the investigate_running_migration_forwards_and_backwards test.
        results = subprocess.run(
            [
                "pytest",
                "-vv",
                "-s",
                "--json-report",
                f"--json-report-file={json_report_file}",
                "-c",
                "tests/unit/workflow/pytest_running_workflow_migrations.ini",
                "--rootdir",
                os.getcwd(),
                "tests/unit/workflow/test_management_commands.py::TestManagementCommandWorkflowChanged",
            ],
            capture_output=True,
        )

        # Database creation and deletion are added to stderr.  We don't want those messages in stderr.
        stderr = strip_database_creation_and_deletion_from_stderr(results.stderr.decode("utf-8"), test_db_name)

        if stderr:
            pytest.fail(SUBPROCESS_EXCEPTION_TEXT + stderr, pytrace=False)

        with open(json_report_file, "rb") as f:
            json_results = json.load(f)

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        summary = json_results["summary"]

        if "error" in summary:
            for test in json_results["tests"]:
                if test["outcome"] == "error":
                    if "longrepr" in test["setup"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire error object back.
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + str(test))

        if "failed" in summary:
            for test in json_results["tests"]:
                if test["outcome"] == "failed":
                    if "longrepr" in test["setup"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire dictionary as the error.
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + str(test))

        # Migrating forwards and backwards passed!

    # This is a test that will be run by pytest when we call pytest within test_workflow_added.
    @pytest.mark.django_db
    def investigate_running_migration_forwards_and_backwards(self):
        # The operations in 0004 and the generated 0005 will not run the
        # sql forwards, so we can roll back and then run them manually.
        succeeded, results = self.call_command("migrate", "workflow_changed", "0003")
        assert succeeded, results

        # Did the migrations roll back?
        # assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 3

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

        # Now we want to manually migrate forwards, skipping certain tests by using 'migration_skip_workflow_changed'.
        os.environ.pop("skip_migration_when_setting_up_db")
        skip_some_migrations_forward_env_name = "migration_skip_workflow_changed"
        os.environ[skip_some_migrations_forward_env_name] = "true"

        # Run migration 0005 forwards
        succeeded, results = self.call_command("migrate", "workflow_changed", "0005")

        # Did the migration run?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 5

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
                "historical_permission_codename": "can_do_something",
                "historical_permission_content_type_app_label": "workflow_changed",
                "historical_permission_content_type_model_name": "workflowchanged",
            },
            {
                "historical_permission_codename": "can_do_another_thing",
                "historical_permission_content_type_app_label": "workflow_changed",
                "historical_permission_content_type_model_name": "workflowchanged",
            },
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
                "transition__code": "go_to_state_1_a",
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

        # Run migration 0005 backwards
        succeeded, results = self.call_command("migrate", "workflow_changed", "0004")

        os.environ[skip_some_migrations_forward_env_name] = "false"

        # Did the migration reverse?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_changed").count() == 4

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.Workflow.objects.filter(code="changed_workflow").values()
        )
        assert data == orig_data_workflow

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
        )
        # Because these workflow permissions have an add and delete, as well as a change, the order of the data changes.
        assert data == list(reversed(orig_data_workflow_permission))

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
class TestManagementCommandWorkflowDeleted(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow deleted.
        clean_migrations("workflow_deleted")

    @pytest.mark.django_db
    def test_workflow_deleted(self):
        succeeded, results = self.call_command(
            "makeworkflowmigrations", "workflow_deleted", "--env-guarded-operations", "--import-instead"
        )
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        results = frozenset([line.strip() for line in results if line.strip()])

        assert "Creating empty migration for workflow changes." in results
        assert (
            f"Modified migration '0005_workflow_migrations_{now().date().strftime('%Y_%m_%d')}.py' "
            f"to migrate workflow for workflow_deleted." in results
        )

        test_db_name = "vueda_workflow_management_command_migration_testing_deleted"
        os.environ["workflow_test_type"] = "deleted"  # This is deleted to the end of the db name in settings.
        os.environ["skip_migration_when_setting_up_db"] = "true"

        json_report_file = "pytest_running_workflow_migrations_deleted.json"

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        # Run the investigate_running_migration_forwards_and_backwards test.
        results = subprocess.run(
            [
                "pytest",
                "-vv",
                "-s",
                "--json-report",
                f"--json-report-file={json_report_file}",
                "-c",
                "tests/unit/workflow/pytest_running_workflow_migrations.ini",
                "--rootdir",
                os.getcwd(),
                "tests/unit/workflow/test_management_commands.py::TestManagementCommandWorkflowDeleted",
            ],
            capture_output=True,
        )

        # Database creation and deletion are deleted to stderr.  We don't want those messages in stderr.
        stderr = strip_database_creation_and_deletion_from_stderr(results.stderr.decode("utf-8"), test_db_name)

        if stderr:
            pytest.fail(SUBPROCESS_EXCEPTION_TEXT + stderr, pytrace=False)

        with open(json_report_file, "rb") as f:
            json_results = json.load(f)

        if os.path.exists(json_report_file):
            os.remove(json_report_file)

        summary = json_results["summary"]

        if "error" in summary:
            for test in json_results["tests"]:
                if test["outcome"] == "error":
                    if "longrepr" in test["setup"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire error object back.
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + str(test))

        if "failed" in summary:
            for test in json_results["tests"]:
                if test["outcome"] == "failed":
                    if "longrepr" in test["setup"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["setup"]["longrepr"])

                    elif "longrepr" in test["call"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["call"]["longrepr"])

                    elif "longrepr" in test["teardown"]:
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + test["teardown"]["longrepr"])

                    else:
                        # Not sure what the error was in, so give the entire dictionary as the error.
                        pytest.fail(SUBPROCESS_EXCEPTION_TEXT + str(test))

        # Migrating forwards and backwards passed!

    # This is a test that will be run by pytest when we call pytest within test_workflow_deleted.
    @pytest.mark.django_db
    def investigate_running_migration_forwards_and_backwards(self):
        # The operations in 0004 and the generated 0005 will not run the
        # sql forwards, so we can roll back and then run them manually.
        succeeded, results = self.call_command("migrate", "workflow_deleted", "0003")
        assert succeeded, results

        # Did the migrations roll back?
        # assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 3

        # Gather the data for the changed workflow, so we can validate it is the same after we migrate backwards.
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

        orig_data_state = convert_data_to_list_of_dicts_without_id_fields(
            models.State.objects.filter(workflow_id=workflow_pk).values()
        )
        assert orig_data_state == [
            {
                "code": "state_3",
                "name": "State 3",
            },
            {
                "code": "state_1",
                "name": "State 1",
            },
            {
                "code": "state_2",
                "name": "State 2",
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
                "code": "go_to_state_3",
                "name": "Go To State 3",
                "target__code": "state_3",
            },
            {
                "code": "go_to_state_2",
                "name": "Go To State 2",
                "target__code": "state_2",
            },
            {
                "code": "go_to_state_1",
                "name": "Go To State 1",
                "target__code": "state_1",
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

        # Now we want to manually migrate forwards, skipping certain tests by using 'migration_skip_workflow_deleted'.
        os.environ.pop("skip_migration_when_setting_up_db")
        skip_some_migrations_forward_env_name = "migration_skip_workflow_deleted"
        os.environ[skip_some_migrations_forward_env_name] = "true"

        assert models.Workflow.objects.filter(code="deleted_workflow").exists(), (
            "'deleted_workflow' should exist when it does not."
        )

        # Run migration 0005 forwards
        succeeded, results = self.call_command("migrate", "workflow_deleted", "0005")

        # Did the migration run?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 5

        assert models.Workflow.objects.filter(code="deleted_workflow").first() is None, models.Workflow.objects.filter(
            code="deleted_workflow"
        ).values()
        assert models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).first() is None, (
            models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
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

        os.environ[skip_some_migrations_forward_env_name] = "false"

        # Did the migration reverse?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_deleted").count() == 4

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.Workflow.objects.filter(code="deleted_workflow").values()
        )
        assert data == orig_data_workflow

        # If the assert above passes, then we definitely have a workflow id.
        workflow_pk = models.Workflow.objects.filter(code="deleted_workflow").first().id

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).values()
        )
        # Because we delete and add objects during these migrations, the order changes.
        assert data == list(reversed(orig_data_workflow_permission))

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.State.objects.filter(workflow_id=workflow_pk).values()
        )
        # Because we delete and add objects during these migrations, the order changes.
        assert data == list(reversed(orig_data_state))

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.StatePermission.objects.filter(state__workflow_id=workflow_pk).values()
        )
        # Because we delete and add objects during these migrations, the order changes.
        assert data == list(reversed(orig_data_state_permission))

        # Converting the data uses id, so it is stripped from the data.
        data = convert_data_to_list_of_dicts_without_id_fields(
            models.Transition.objects.filter(workflow_id=workflow_pk).values("id", "code", "name", "target__code")
        )
        # Because we delete and add objects during these migrations, the order changes.
        assert data == list(reversed(orig_data_transition))

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).values()
        )
        # Because we delete and add objects during these migrations, the order changes.
        # In this case, they are not entirely reversed, so we need to do more work.
        orig_data_transition_permission = list(reversed(orig_data_transition_permission))
        orig_data_transition_permission.append(orig_data_transition_permission.pop(0))
        assert data == orig_data_transition_permission

        data = convert_data_to_list_of_dicts_without_id_fields(
            models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).values(
                "transition__code", "source__code"
            )
        )
        # Because we delete and add objects during these migrations, the order changes.
        orig_data_transition_source = list(reversed(orig_data_transition_source))
        orig_data_transition_source.append(orig_data_transition_source.pop(0))
        assert data == orig_data_transition_source


class TestManagementCommandWorkflowMulti(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow multi.
        clean_migrations("workflow_multi")

    @pytest.mark.django_db
    def test_workflow_multi(self):
        succeeded, results = self.call_command(
            "makeworkflowmigrations", "workflow_multi", "--env-guarded-operations", "--import-instead"
        )
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        results = frozenset([line.strip() for line in results if line.strip()])

        assert "Creating empty migration for workflow changes." in results
        assert (
            f"Modified migration '0003_workflow_migrations_{now().date().strftime('%Y_%m_%d')}.py' "
            f"to migrate workflow for workflow_multi." in results
        )

        # Import the migration, so we can verify the first record.
        # When the records are not ordered correctly, weird things happen to the changed data.
        migration = import_module(
            f"tests.workflow_multi.migrations.0003_workflow_migrations_{now().date().strftime('%Y_%m_%d')}"
        )

        assert len(migration.changed_data) == 10, migration.changed_data

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
            "history_date": datetime.datetime(2024, 7, 17, 19, 53, 55, 857366, tzinfo=datetime.timezone.utc),
            "history_type": "added",
            "model_name": "workflow",
        }, first_change
