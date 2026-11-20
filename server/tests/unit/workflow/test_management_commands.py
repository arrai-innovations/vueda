import importlib.util
import io
import os

import pytest

from tests.conftest import BaseTestCallCommand
from tests.utils import BaseTestMigrations
from tests.utils import append_installed_apps
from tests.utils import clear_info_registry_before_test
from vueda.user.management.commands.utils import update_operation_function_names


def convert_data_to_list_of_dicts_without_id_fields(queryset):
    data = []

    for values in queryset:
        item = {}

        for key, value in values.items():
            if not (key == "id" or key.endswith("_id")):
                item[key] = value

        data.append(item)

    return data


class TestManagementCommandWorkflowUpdating(BaseTestMigrations, BaseTestCallCommand):
    @clear_info_registry_before_test()
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
            assert "def manage_state_objects(" not in migration_content
            assert "code=make_sure_permissions_exist_through_imports," not in migration_content
            assert "code=forwards_migrate_workflow_through_imports," not in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," not in migration_content

            succeeded, results = self.call_command_capturing_output("updateworkflowmigrations", "workflow_updating")
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
            assert "def manage_state_objects(" in migration_content
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

    @clear_info_registry_before_test()
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
            assert "def manage_state_objects(" not in migration_content
            assert "code=make_sure_permissions_exist_through_imports," not in migration_content
            assert "code=forwards_migrate_workflow_through_imports," not in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," not in migration_content

            succeeded, results = self.call_command_capturing_output("updateworkflowmigrations", "workflow_updating")
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
            assert "def manage_state_objects(" in migration_content
            assert "code=make_sure_permissions_exist_through_imports," in migration_content
            assert "code=forwards_migrate_workflow_through_imports," in migration_content
            assert "reverse_code=backwards_migrate_workflow_through_imports," in migration_content

    @clear_info_registry_before_test()
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
                "from vueda.workflow.migration_generation.operations import backwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.migration_generation.operations import forwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.migration_generation.operations import make_sure_permissions_exist"
                in migration_content
            )

            assert "def forwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def make_sure_permissions_exist_through_imports(apps, schema_editor):" in migration_content

            succeeded, results = self.call_command_capturing_output("updateworkflowmigrations", "workflow_updating")
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
                "from vueda.workflow.migration_generation.operations import backwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.migration_generation.operations import forwards_migrate_workflow"
                in migration_content
            )
            assert (
                "from vueda.workflow.migration_generation.operations import make_sure_permissions_exist"
                in migration_content
            )

            assert "def forwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_workflow_through_imports(apps, schema_editor):" in migration_content
            assert "def make_sure_permissions_exist_through_imports(apps, schema_editor):" in migration_content

    @clear_info_registry_before_test()
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
            succeeded, results = self.call_command_capturing_output("updateworkflowmigrations", "workflow_updating")
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
            succeeded, results = self.call_command_capturing_output("updateworkflowmigrations", "workflow_updating")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                assert f.read() == migration_content

    @pytest.mark.parametrize("missing_key", ["history_date", "model_name", "changes"])
    @clear_info_registry_before_test()
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
                self.call_command_capturing_output(
                    "updateworkflowmigrations", "workflow_updating", stdout=out, stderr=err
                )

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

    @clear_info_registry_before_test()
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

            succeeded, results = self.call_command_capturing_output("updateworkflowmigrations", "workflow_updating")
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

    @clear_info_registry_before_test()
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
                self.call_command_capturing_output(
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

    @clear_info_registry_before_test()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_workflow_updating_no_migrations(self, settings):
        settings.MIGRATION_MODULES = {
            "workflow_updating_no_migrations": None,
        }
        append_installed_apps(settings, "tests.workflow_updating_no_migrations")

        succeeded, results = self.call_command_capturing_output(
            "updateworkflowmigrations", "workflow_updating_no_migrations"
        )
        if not succeeded:
            pytest.fail("".join(results))

        assert "No workflow migrations found to update.\n" in results

    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_updateworkflowmigrations_rejects_unknown_app_label(self):
        err = io.StringIO()

        with pytest.raises(SystemExit):
            self.call_command_capturing_output("updateworkflowmigrations", "app_that_does_not_exist", stderr=err)

        err.seek(0)
        results = err.read()

        assert "No installed app with label 'app_that_does_not_exist'.\n" in results


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
