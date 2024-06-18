import json
import os
import subprocess

import pytest
from django.db.migrations.recorder import MigrationRecorder

from tests.conftest import BaseTestCallCommand
from tests.custom_migration_operations import clean_migrations
from vueda.workflow import models


# Since these tests make files on disk, we can't have multiple tests running at
# the same time, or they will step on each other.  So, to test this  properly, we
# have a single test with sections that rely on previous section to run successfully.
# We will test migration creation, migrating forwards, and migrating backwards.
SUBPROCESS_EXCEPTION_TEXT = "\n\nException when calling pytest through subprocess:\n\n"


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


@pytest.mark.django_db
class TestManagementCommandWorkflowAdded(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow added.
        clean_migrations("workflow_added")

    def test_workflow_added(self):
        succeeded, results = self.call_command("makeworkflowmigrations", "workflow_added", "--env-guarded-operations")
        if not succeeded:
            pytest.fail("".join(results), pytrace=False)

        results = frozenset([line.strip() for line in results if line.strip()])

        assert "Creating empty migration for workflow changes." in results
        assert (
            "Modified migration '0003_workflow_migrations_2024_06_18.py' to migrate workflow for workflow_added."
            in results
        )

        os.environ["workflow_test_type"] = "added"
        os.environ["skip_migration_when_setting_up_db"] = "true"

        if os.path.exists("pytest_running_workflow_migrations_added.json"):
            os.remove("pytest_running_workflow_migrations_added.json")

        # Run the investigate_running_migration_forwards_and_backwards test.
        results = subprocess.run(
            [
                "pytest",
                "-vv",
                "-s",
                "--json-report",
                "--json-report-file=pytest_running_workflow_migrations_added.json",
                "-c",
                "tests/unit/workflow/pytest_running_workflow_migrations.ini",
                "--rootdir",
                os.getcwd(),
                "tests/unit/workflow/test_management_commands.py::TestManagementCommandWorkflowAdded",
            ],
            capture_output=True,
        )

        # Database creation and deletion are added to stderr.  We don't want those messages in stderr.
        test_db_name = "vueda_workflow_management_command_migration_testing_added"
        stderr = strip_database_creation_and_deletion_from_stderr(results.stderr.decode("utf-8"), test_db_name)

        if stderr:
            pytest.fail(SUBPROCESS_EXCEPTION_TEXT + stderr, pytrace=False)

        with open("pytest_running_workflow_migrations_added.json", "rb") as f:
            json_results = json.load(f)

        if os.path.exists("pytest_running_workflow_migrations_added.json"):
            os.remove("pytest_running_workflow_migrations_added.json")

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
        # The operations in 0002 and the generated 0003 will be empty, so we can roll back and then run them manually.
        succeeded, results = self.call_command("migrate", "workflow_added", "0001_initial")
        assert succeeded, results

        # Did the migrations roll back?
        # assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 1

        # Now we want to manually migrate forwards, skipping certain tests by using 'migration_skip_workflow_added'.
        os.environ.pop("skip_migration_when_setting_up_db")
        os.environ["migration_skip_workflow_added"] = "true"

        assert not models.Workflow.objects.filter(
            code="added_workflow"
        ).exists(), "'added_workflow' appears to exist when it should not."

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

        # This uses id, so it is stripped from the data.
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

        os.environ["migration_skip_workflow_added"] = "false"

        # Did the migration reverse?
        assert succeeded, results
        assert MigrationRecorder.Migration.objects.filter(app="workflow_added").count() == 2

        assert models.Workflow.objects.filter(code="added_workflow").first() is None
        assert models.WorkflowPermission.objects.filter(workflow_id=workflow_pk).first() is None
        assert models.State.objects.filter(workflow_id=workflow_pk).first() is None
        assert models.StatePermission.objects.filter(state__workflow_id=workflow_pk).first() is None
        assert models.Transition.objects.filter(workflow_id=workflow_pk).first() is None
        assert models.TransitionPermission.objects.filter(transition__workflow_id=workflow_pk).first() is None
        assert models.TransitionSource.objects.filter(transition__workflow_id=workflow_pk).first() is None


class TestManagementCommandWorkflowChanged(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow changed.
        clean_migrations("workflow_changed")

    def test_workflow_changed(self):
        # Not Finished
        pass

    # This is a test that will be run by pytest when we call pytest within test_workflow_added.
    @pytest.mark.django_db
    def investigate_running_migration_forwards_and_backwards(self):
        # Not Finished
        pass


@pytest.mark.django_db
class TestManagementCommandWorkflowDeleted(BaseTestCallCommand):
    @classmethod
    def teardown_class(cls):
        # Delete test created migrations, for workflow deleted.
        clean_migrations("workflow_deleted")

    def test_workflow_deleted(self):
        # Not Finished
        pass

    # This is a test that will be run by pytest when we call pytest within test_workflow_added.
    @pytest.mark.django_db
    def investigate_running_migration_forwards_and_backwards(self):
        # Not Finished
        pass
