import ast
import datetime
import io
import os
import re
from pprint import pformat

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.migrations.recorder import MigrationRecorder

from tests.conftest import BaseTestCallCommand
from tests.utils import BaseTestMigrations
from tests.utils import append_installed_apps
from tests.utils import info_registry_clear_with_appended_apps
from vueda.user.management.commands.makegroupmigrations import migrate_step
from vueda.user.management.commands.utils import format_changed_data
from vueda.user.management.commands.utils import update_operation_function_names
from vueda.user.models import GroupChange


class BaseAddedGroup:
    def continue_added_group_test(self, migration_dir, results):
        # Reload 0003, because we rewrote it after it would have imported it.
        assert results, "No results were captured when makegroupmigrations was called."
        self.reload_module(results, migration_dir)

        results_set = frozenset([line.strip() for line in results if line.strip()])
        assert "Creating empty migration for group permission changes." in results_set
        assert any(
            f"group_permission_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py" in r for r in results_set
        )

        # GroupAddedWorkers should not exist before running the generated migration.
        assert not Group.objects.filter(name="GroupAddedWorkers").exists()

        # Delete the GroupChange objects.  Running the migration should create them.
        GroupChange.objects.all().delete()

        # Run the generated migration forwards.
        succeeded, results = self.call_command("migrate", "group_added", "0003")
        if not succeeded:
            pytest.fail("".join(results))

        group = Group.objects.filter(name="GroupAddedWorkers").first()
        assert group is not None, "'GroupAddedWorkers' was not created."

        assert group.permissions.filter(
            codename="read_groupaddeduser",
            content_type__app_label="group_added",
            content_type__model="groupaddeduser",
        ).exists(), "'read_groupaddeduser' not associated with 'GroupAddedWorkers'."

        assert group.permissions.filter(
            codename="list_groupaddeduser",
            content_type__app_label="group_added",
            content_type__model="groupaddeduser",
        ).exists(), "'list_groupaddeduser' not associated with 'GroupAddedWorkers'."

        # Verify the GroupChange objects got recreated.
        assert GroupChange.objects.count() == 2  # noqa PLR2004

        assert GroupChange.objects.filter(
            group_name="GroupAddedWorkers",
            change_type="added",
            historical_permission_codename="list_groupaddeduser",
            historical_permission_content_type_app_label="group_added",
            historical_permission_content_type_model_name="groupaddeduser",
        ).exists(), (
            f"GroupChange object wasn't created while running the group migration: {GroupChange.objects.values()}"
        )

        assert GroupChange.objects.filter(
            group_name="GroupAddedWorkers",
            change_type="associated",
            historical_permission_codename="read_groupaddeduser",
            historical_permission_content_type_app_label="group_added",
            historical_permission_content_type_model_name="groupaddeduser",
        ).exists(), (
            f"GroupChange object wasn't created while running the group migration: {GroupChange.objects.values()}"
        )

        # Run the generated migration backwards.
        succeeded, results = self.call_command("migrate", "group_added", "0002")
        if not succeeded:
            pytest.fail("".join(results))

        # Rolling back removes the permissions and keeps the group, whose memberships a migration
        # cannot restore.
        group = Group.objects.filter(name="GroupAddedWorkers").first()
        assert group is not None, "'GroupAddedWorkers' was deleted by rolling back."
        assert not group.permissions.exists(), "'GroupAddedWorkers' kept a permission after rolling back."


class TestManagementCommandGroupTests(BaseAddedGroup, BaseTestMigrations, BaseTestCallCommand):
    """
    This test doesn't use --import-instead, so we can verify that
    the noqa comments are stripped from the generated migration.
    """

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_comment_removed(self, settings):
        settings.MIGRATION_MODULES = {
            "group_added": "tests.group_added",
        }
        settings.AUTH_USER_MODEL = "group_added.GroupAddedUser"
        append_installed_apps(settings, "tests.group_added")

        with self.temporary_migration_module(settings, app_label="group_added") as migration_dir:
            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "group_added")
            if not succeeded:
                pytest.fail("".join(results))

            # Create the generated migration 0003.
            succeeded, results = self.call_command("makegroupmigrations")
            if not succeeded:
                pytest.fail("".join(results))

            # Verify that the noqa comments are gone.
            migration_filepath = os.path.join(
                migration_dir, f"0003_group_permission_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py"
            )

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            assert "    forwards_migrate_groups(apps, copy.deepcopy(changed_data))\n" in migration_content
            assert "    backwards_migrate_groups(apps, copy.deepcopy(changed_data))\n" in migration_content

            self.continue_added_group_test(migration_dir, results)

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_changed_data_follows_the_migrations_project_settings(self, settings):
        """The formatter reads the settings that apply to the migration's own path.

        Only the changed_data assignment is checked, so the rest of the file cannot match. A formatter keeps the
        trailing comma after the last change, which pformat never writes. With the formatter shown to have run,
        single quotes show it read the migration's settings, since neither ruff nor black defaults to them.
        """
        settings.MIGRATION_MODULES = {
            "group_added": "tests.group_added",
        }
        settings.AUTH_USER_MODEL = "group_added.GroupAddedUser"
        append_installed_apps(settings, "tests.group_added")

        with self.temporary_migration_module(settings, app_label="group_added") as migration_dir:
            with open(os.path.join(os.path.dirname(migration_dir), "pyproject.toml"), "w", encoding="utf-8") as f:
                f.write('[tool.ruff.format]\nquote-style = "single"\n')

            succeeded, results = self.call_command("migrate", "group_added")
            if not succeeded:
                pytest.fail("".join(results))

            succeeded, results = self.call_command("makegroupmigrations")
            if not succeeded:
                pytest.fail("".join(results))

            migration_filepath = os.path.join(
                migration_dir, f"0003_group_permission_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py"
            )
            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            assignment = next(
                node
                for node in ast.parse(migration_content).body
                if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "changed_data"
            )
            changed_data_source = ast.get_source_segment(migration_content, assignment)
            assert re.search(r",\s*\]$", changed_data_source)
            assert "'group_name'" in changed_data_source

    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_dry_run_no_changes(self):
        succeeded, results = self.call_command("makegroupmigrations", "--dry-run")
        if not succeeded:
            pytest.fail("".join(results))

        assert "No group changes detected.\n" in results


class TestManagementCommandGroupAdded(BaseAddedGroup, BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_added(self, settings):
        settings.MIGRATION_MODULES = {
            "group_added": "tests.group_added",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_added.GroupAddedUser"
        append_installed_apps(settings, "tests.group_added")

        with self.temporary_migration_module(settings, app_label="group_added") as migration_dir:
            # No migrations should have run yet.
            assert MigrationRecorder.Migration.objects.filter(app="group_added").count() == 0

            # Migrate forwards.
            succeeded, results = self.call_command("migrate", "group_added")
            if not succeeded:
                pytest.fail("".join(results))

            # We should have run migration 0001 and 0002.
            assert MigrationRecorder.Migration.objects.filter(app="group_added").count() == 2  # noqa: PLR2004

            # Create the generated migration 0003.
            succeeded, results = self.call_command("makegroupmigrations", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            self.continue_added_group_test(migration_dir, results)


class TestManagementCommandGroupChanged(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_changed(self, settings):
        settings.MIGRATION_MODULES = {
            "group_changed": "tests.group_changed",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_changed.GroupChangedUser"
        append_installed_apps(settings, "tests.group_changed")

        with self.temporary_migration_module(settings, app_label="group_changed") as migration_dir:
            assert MigrationRecorder.Migration.objects.filter(app="group_changed").count() == 0

            succeeded, results = self.call_command("migrate", "group_changed")
            if not succeeded:
                pytest.fail("".join(results))

            assert MigrationRecorder.Migration.objects.filter(app="group_changed").count() == 3  # noqa: PLR2004

            # Verify the initial state: old name exists, new name does not.
            assert Group.objects.filter(name="GroupChangedWorkers").exists()
            assert not Group.objects.filter(name="GroupChangedSeniorWorkers").exists()

            # Verify the number of GroupChange objects.
            assert GroupChange.objects.count() == 3  # noqa PLR2004

            succeeded, results = self.call_command("makegroupmigrations", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            assert results, "No results were captured when makegroupmigrations was called."
            self.reload_module(results, migration_dir)

            results_set = frozenset([line.strip() for line in results if line.strip()])
            assert "Creating empty migration for group permission changes." in results_set
            assert any(
                f"group_permission_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py" in r for r in results_set
            )

            # Run the generated migration forwards.
            succeeded, results = self.call_command("migrate", "group_changed", "0004")
            if not succeeded:
                pytest.fail("".join(results))

            assert not Group.objects.filter(name="GroupChangedWorkers").exists(), (
                "'GroupChangedWorkers' still exists after rename."
            )
            group = Group.objects.filter(name="GroupChangedSeniorWorkers").first()
            assert group is not None, "'GroupChangedSeniorWorkers' was not created."

            assert group.permissions.filter(
                codename="list_groupchangeduser",
                content_type__app_label="group_changed",
                content_type__model="groupchangeduser",
            ).exists(), "'list_groupchangeduser' not associated with 'GroupChangedSeniorWorkers'."

            # Verify the number of GroupChange objects hasn't changed.
            assert GroupChange.objects.count() == 3  # noqa PLR2004

            # Run the generated migration backwards.
            succeeded, results = self.call_command("migrate", "group_changed", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            assert not Group.objects.filter(name="GroupChangedSeniorWorkers").exists(), (
                "'GroupChangedSeniorWorkers' still exists after rolling back."
            )
            group = Group.objects.filter(name="GroupChangedWorkers").first()
            assert group is not None, "'GroupChangedWorkers' was not restored after rolling back."

            assert group.permissions.filter(
                codename="list_groupchangeduser",
                content_type__app_label="group_changed",
                content_type__model="groupchangeduser",
            ).exists(), "'list_groupchangeduser' not associated with 'GroupChangedWorkers' after rolling back."


class TestManagementCommandGroupDeleted(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_deleted(self, settings):
        settings.MIGRATION_MODULES = {
            "group_deleted": "tests.group_deleted",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_deleted.GroupDeletedUser"
        append_installed_apps(settings, "tests.group_deleted")

        with self.temporary_migration_module(settings, app_label="group_deleted") as migration_dir:
            assert MigrationRecorder.Migration.objects.filter(app="group_deleted").count() == 0

            succeeded, results = self.call_command("migrate", "group_deleted", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            assert MigrationRecorder.Migration.objects.filter(app="group_deleted").count() == 3  # noqa: PLR2004

            # Verify the initial state: group exists with its permission.
            group = Group.objects.filter(name="GroupDeletedWorkers").first()
            assert group is not None, "'GroupDeletedWorkers' should exist before deletion test."
            assert group.permissions.filter(
                codename="list_groupdeleteduser",
                content_type__app_label="group_deleted",
                content_type__model="groupdeleteduser",
            ).exists(), "'list_groupdeleteduser' should be associated before deletion test."
            assert group.permissions.filter(
                codename="read_groupdeleteduser",
                content_type__app_label="group_deleted",
                content_type__model="groupdeleteduser",
            ).exists(), "'read_groupdeleteduser' should be associated before deletion test."

            succeeded, results = self.call_command("makegroupmigrations", "--import-instead")
            if not succeeded:
                pytest.fail("".join(results))

            assert results, "No results were captured when makegroupmigrations was called."
            self.reload_module(results, migration_dir)

            results_set = frozenset([line.strip() for line in results if line.strip()])
            assert "Creating empty migration for group permission changes." in results_set
            assert any(
                f"group_permission_migrations_{datetime.date.today().strftime('%Y_%m_%d')}.py" in r for r in results_set
            )

            # Run the generated migration forwards.
            succeeded, results = self.call_command("migrate", "group_deleted", "0004")
            if not succeeded:
                pytest.fail("".join(results))

            # A `deleted` change removes the last permission and keeps the group.
            group = Group.objects.filter(name="GroupDeletedWorkers").first()
            assert group is not None, "'GroupDeletedWorkers' was deleted by replaying a `deleted` change."
            assert not group.permissions.exists(), "'GroupDeletedWorkers' kept a permission after the migration."

            # Run the generated migration backwards.
            succeeded, results = self.call_command("migrate", "group_deleted", "0003")
            if not succeeded:
                pytest.fail("".join(results))

            assert Group.objects.filter(name="GroupDeletedWorkers").exists()

            group = Group.objects.get(name="GroupDeletedWorkers")
            assert group.permissions.filter(
                codename="list_groupdeleteduser",
                content_type__app_label="group_deleted",
                content_type__model="groupdeleteduser",
            ).exists(), "'list_groupdeleteduser' not restored after rolling back."
            assert group.permissions.filter(
                codename="read_groupdeleteduser",
                content_type__app_label="group_deleted",
                content_type__model="groupdeleteduser",
            ).exists(), "'read_groupdeleteduser' not restored after rolling back."


@pytest.mark.django_db
class TestCreateUserCommand:
    def test_missing_single_group_raises(self):
        with pytest.raises(CommandError, match='The Group with name "nonexistent" does not exist!'):
            call_command(
                "createuser",
                interactive=False,
                email="user@domain.invalid",
                name="Test User",
                groups="nonexistent",
            )

    def test_missing_multiple_groups_raises(self):
        with pytest.raises(CommandError, match=r'The Groups with names "bar" and "foo" do not exist!'):
            call_command(
                "createuser",
                interactive=False,
                email="user@domain.invalid",
                name="Test User",
                groups="foo,bar",
            )

    def test_success(self):
        Group.objects.create(name="TestGroup")
        call_command(
            "createuser",
            interactive=False,
            email="newuser@domain.invalid",
            name="New User",
            groups="TestGroup",
        )
        user = get_user_model().objects.get(email="newuser@domain.invalid")
        assert not user.is_superuser
        assert user.groups.filter(name="TestGroup").exists()


class TestManagementCommandGroupUpdating(BaseTestMigrations, BaseTestCallCommand):
    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_updating(self, settings):
        settings.MIGRATION_MODULES = {
            "group_updating": "tests.group_updating",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_updating.GroupUpdatingUser"
        append_installed_apps(settings, "tests.group_updating")

        with self.temporary_migration_module(settings, app_label="group_updating") as migration_dir:
            migration_filepath = os.path.join(migration_dir, "0002_group_permission_migrations_2026_06_29.py")

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Untouched
            assert "changed_data = [" in migration_content
            assert "# Stray comment for testing." in migration_content
            assert "# Stray import 1 for testing." in migration_content
            assert "# Stray import 2 for testing." in migration_content
            assert "import os" in migration_content
            assert "import sys" in migration_content

            # Original
            assert "def forwards_migrate_groups(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_groups(apps, schema_editor):" in migration_content
            assert "            forwards_migrate_groups," in migration_content
            assert "            backwards_migrate_groups," in migration_content

            # Unchanged
            assert "def create_group_change(change, group_change_model):" in migration_content
            assert "class GroupChangeTypes(enum.Enum):" in migration_content
            assert "def get_matching_record(change, group_change_model):" in migration_content
            assert (
                """def migrate_step(
    content_types,
    groups,
    permissions,
    group_name,
    group_name_old,
    change_type,
    historical_permission_codename,
    historical_permission_content_type_app_label,
    historical_permission_content_type_model_name,
    historical_permission_name,
):"""
                in migration_content
            )
            assert "def make_sure_permissions_exist(apps, schema_editor):" in migration_content
            assert "code=make_sure_permissions_exist," in migration_content

            # New
            assert (
                "def forwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert (
                "def backwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert "def forwards_migrate_groups(apps, changed_items):" not in migration_content
            assert "def backwards_migrate_groups(apps, changed_items):" not in migration_content
            assert "            forwards_migrate_groups_through_imports," not in migration_content
            assert "            backwards_migrate_groups_through_imports," not in migration_content

            succeeded, results = self.call_command("updategroupmigrations")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Untouched
            assert "# Stray comment for testing." in migration_content
            assert "# Stray import 1 for testing." in migration_content
            assert "# Stray import 2 for testing." in migration_content
            assert "changed_data = [" in migration_content
            assert "import os" in migration_content
            assert "import sys" in migration_content

            # Removed Original
            assert "def forwards_migrate_groups(apps, schema_editor):" not in migration_content
            assert "def backwards_migrate_groups(apps, schema_editor):" not in migration_content
            assert "            forwards_migrate_groups," not in migration_content
            assert "            backwards_migrate_groups," not in migration_content

            # Unchanged
            assert "def create_group_change(change, group_change_model):" in migration_content
            assert "class GroupChangeTypes(enum.Enum):" in migration_content
            assert "def get_matching_record(change, group_change_model):" in migration_content
            assert (
                """def migrate_step(
    content_types,
    groups,
    permissions,
    group_name,
    group_name_old,
    change_type,
    historical_permission_codename,
    historical_permission_content_type_app_label,
    historical_permission_content_type_model_name,
    historical_permission_name,
):"""
                in migration_content
            )
            assert "def make_sure_permissions_exist(apps, schema_editor):" in migration_content
            assert "code=make_sure_permissions_exist," in migration_content

            # Added New
            assert (
                "def forwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert (
                "def backwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert "def forwards_migrate_groups(apps, changed_items):" in migration_content
            assert "def backwards_migrate_groups(apps, changed_items):" in migration_content
            assert "            forwards_migrate_groups_through_imports," in migration_content
            assert "            backwards_migrate_groups_through_imports," in migration_content

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_updating_direct_runpython_import(self, settings):
        settings.MIGRATION_MODULES = {
            "group_updating": "tests.group_updating",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_updating.GroupUpdatingUser"
        append_installed_apps(settings, "tests.group_updating")

        with self.temporary_migration_module(settings, app_label="group_updating") as migration_dir:
            migration_filepath = os.path.join(migration_dir, "0003_group_permission_migrations_2026_06_30.py")

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Untouched
            assert "changed_data = [" in migration_content

            # Original
            assert "def forwards_migrate_groups(apps, schema_editor):" in migration_content
            assert "def backwards_migrate_groups(apps, schema_editor):" in migration_content
            assert "code=forwards_migrate_groups," in migration_content
            assert "reverse_code=backwards_migrate_groups," in migration_content

            # Unchanged
            assert "def create_group_change(change, group_change_model):" in migration_content
            assert "class GroupChangeTypes(enum.Enum):" in migration_content
            assert "def get_matching_record(change, group_change_model):" in migration_content
            assert (
                """def migrate_step(
    content_types,
    groups,
    permissions,
    group_name,
    group_name_old,
    change_type,
    historical_permission_codename,
    historical_permission_content_type_app_label,
    historical_permission_content_type_model_name,
    historical_permission_name,
):"""
                in migration_content
            )
            assert "def make_sure_permissions_exist(apps, schema_editor):" in migration_content
            assert "code=make_sure_permissions_exist," in migration_content

            # New
            assert (
                "def forwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert (
                "def backwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                not in migration_content
            )
            assert "def forwards_migrate_groups(apps, changed_items):" not in migration_content
            assert "def backwards_migrate_groups(apps, changed_items):" not in migration_content
            assert "code=forwards_migrate_groups_through_imports," not in migration_content
            assert "reverse_code=backwards_migrate_groups_through_imports," not in migration_content

            succeeded, results = self.call_command("updategroupmigrations")
            if not succeeded:
                pytest.fail("".join(results))

            with open(migration_filepath, encoding="utf-8") as f:
                migration_content = f.read()

            # Untouched
            assert "changed_data = [" in migration_content

            # Removed Original
            assert "def forwards_migrate_groups(apps, schema_editor):" not in migration_content
            assert "def backwards_migrate_groups(apps, schema_editor):" not in migration_content
            assert "code=forwards_migrate_groups," not in migration_content
            assert "reverse_code=backwards_migrate_groups," not in migration_content

            # Unchanged
            assert "def create_group_change(change, group_change_model):" in migration_content
            assert "class GroupChangeTypes(enum.Enum):" in migration_content
            assert "def get_matching_record(change, group_change_model):" in migration_content
            assert (
                """def migrate_step(
    content_types,
    groups,
    permissions,
    group_name,
    group_name_old,
    change_type,
    historical_permission_codename,
    historical_permission_content_type_app_label,
    historical_permission_content_type_model_name,
    historical_permission_name,
):"""
                in migration_content
            )
            assert "def make_sure_permissions_exist(apps, schema_editor):" in migration_content
            assert "code=make_sure_permissions_exist," in migration_content

            # Added New
            assert (
                "def forwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert (
                "def backwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover"
                in migration_content
            )
            assert "def forwards_migrate_groups(apps, changed_items):" in migration_content
            assert "def backwards_migrate_groups(apps, changed_items):" in migration_content
            assert "code=forwards_migrate_groups_through_imports," in migration_content
            assert "reverse_code=backwards_migrate_groups_through_imports," in migration_content

            # Run update again.  There should be no renames.
            succeeded, results = self.call_command("updategroupmigrations")
            if not succeeded:
                pytest.fail("".join(results))

            assert f"  Nothing to rename found in {migration_filepath}.\n" in results

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_updating_bad_migrations(self, settings):
        settings.MIGRATION_MODULES = {
            "group_updating_bad_migrations": "tests.group_updating_bad_migrations",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_updating_bad_migrations.GroupUpdatingBadMigrationsUser"
        append_installed_apps(settings, "tests.group_updating_bad_migrations")

        err = io.StringIO()
        out = io.StringIO()

        with self.temporary_migration_module(settings, app_label="group_updating_bad_migrations") as migration_dir:
            with pytest.raises(SystemExit):
                self.call_command("updategroupmigrations", stdout=out, stderr=err)

            err.seek(0)
            results = err.read()

            assert (
                f"  Could not parse required sections in {migration_dir}"
                "/0002_group_permission_migrations_2026_06_29.py, skipping.\n"
            ) in results
            assert (
                f"  Unable to parse migration at {migration_dir}/0003_group_permission_migrations_2026_06_29.py"
                " due to syntax error '[' was never closed"
            ) in results

            out.seek(0)
            results = out.read()

            assert "Failed updating 2 group migration(s).\n" in results

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_updating_no_migrations(self, settings):
        settings.MIGRATION_MODULES = {
            "group_updating_no_migrations": None,
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_updating_no_migrations.GroupUpdatingNoMigrationsUser"
        append_installed_apps(settings, "tests.group_updating_no_migrations")

        succeeded, results = self.call_command("updategroupmigrations")
        if not succeeded:
            pytest.fail("".join(results))

        assert "No group migrations found to update.\n" in results

    @info_registry_clear_with_appended_apps()
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_changes_syncing(self, settings):
        settings.MIGRATION_MODULES = {
            "group_changes_syncing": "tests.group_changes_syncing",
            "no_migrations": None,
        }
        settings.AUTH_USER_MODEL = "group_changes_syncing.GroupChangesSyncingUser"
        append_installed_apps(settings, "tests.group_changes_syncing")

        with self.temporary_migration_module(settings, app_label="group_changes_syncing"):
            assert GroupChange.objects.count() == 0

            succeeded, results = self.call_command("sync_group_changes")
            if not succeeded:
                pytest.fail("".join(results))

            assert GroupChange.objects.count() == 2, GroupChange.objects.values()  # noqa: PLR2004
            assert dict(
                *GroupChange.objects.filter(historical_permission_codename="read_contenttype").values(
                    "group_name",
                    "group_name_old",
                    "change_type",
                    "historical_permission_codename",
                    "historical_permission_content_type_app_label",
                    "historical_permission_content_type_model_name",
                )
            ) == {
                "group_name": "Member",
                "group_name_old": "",
                "change_type": "added",
                "historical_permission_codename": "read_contenttype",
                "historical_permission_content_type_app_label": "contenttypes",
                "historical_permission_content_type_model_name": "contenttype",
            }
            assert dict(
                *GroupChange.objects.filter(historical_permission_codename="list_permission").values(
                    "group_name",
                    "group_name_old",
                    "change_type",
                    "historical_permission_codename",
                    "historical_permission_content_type_app_label",
                    "historical_permission_content_type_model_name",
                )
            ) == {
                "group_name": "Member",
                "group_name_old": "",
                "change_type": "associated",
                "historical_permission_codename": "list_permission",
                "historical_permission_content_type_app_label": "auth",
                "historical_permission_content_type_model_name": "permission",
            }


class TestManagementCommandUtils:
    def test_group_update_operation_function_name_with_conflicting_dependency_names(self):
        from vueda.user.management.commands.updategroupmigrations import OPERATION_FUNCTION_RENAMES

        results = update_operation_function_names(
            """
class Migration(migrations.Migration):
    dependencies = [
        ("test", "0001_make_sure_permissions_exist"),
        ("test", "0002_forwards_migrate_groups"),
        ("test", "0003_backwards_migrate_groups"),
    ]

    operations = [
        migrations.RunPython(
            code=make_sure_permissions_exist,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            code=forwards_migrate_groups,
            reverse_code=backwards_migrate_groups,
        ),
    ]
""",
            OPERATION_FUNCTION_RENAMES,
        )

        assert "code=make_sure_permissions_exist," in results
        assert "code=forwards_migrate_groups_through_imports," in results
        assert "reverse_code=backwards_migrate_groups_through_imports," in results
        assert '("test", "0001_make_sure_permissions_exist"),' in results
        assert '("test", "0002_forwards_migrate_groups"),' in results
        assert '("test", "0003_backwards_migrate_groups"),' in results

    # Each format_changed_data test writes its pyproject.toml into its own tmp_path. black caches a parsed
    # pyproject.toml and a found project root by path for the life of the process, so a test that rewrote a
    # path another test had already read would get that test's settings.
    #
    # black and ruff test their own layout, so these tests only check that a formatter ran and which one. A
    # formatter keeps the trailing comma after the last change, which pformat never writes. With a formatter
    # shown to have run, the quote style shows which formatter and settings applied.
    def test_format_changed_data_evaluates_to_the_same_values(self, tmp_path):
        # black is installed but not configured, so ruff formats.
        (tmp_path / "pyproject.toml").write_text("[tool.ruff]\nline-length = 120\n")
        changed_data = [
            {
                "changes": {"code": ("old", "new"), "id": {"code": "new"}, "media_url": ("one",), "tags": []},
                "history_date": datetime.datetime(2026, 1, 2, 3, 4, 5, tzinfo=datetime.UTC),
                "model_name": "workflow",
            }
        ]
        errors = io.StringIO()

        source = format_changed_data(changed_data, tmp_path / "migrations" / "0002_workflow.py", stderr=errors)

        assert re.search(r",\s*\]\s*$", source)
        # A pair has no trailing comma to split it, so it stays on one line.
        assert '("old", "new")' in source
        namespace = {"datetime": datetime}
        exec(source, namespace)
        assert namespace["changed_data"] == changed_data
        assert errors.getvalue() == ""

    def test_format_changed_data_follows_the_project_configuration_even_when_it_excludes_migrations(self, tmp_path):
        # Skipping the magic trailing comma would join the list onto one line and drop the last comma, so a
        # trailing comma shows it stayed off.
        (tmp_path / "pyproject.toml").write_text(
            '[tool.ruff]\nforce-exclude = true\nextend-exclude = ["migrations"]\n\n'
            '[tool.ruff.format]\nquote-style = "single"\nskip-magic-trailing-comma = true\n'
        )
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], tmp_path / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert "'model_name'" in source
        assert errors.getvalue() == ""

    def test_format_changed_data_uses_ruff_when_black_is_not_installed(self, tmp_path, monkeypatch):
        monkeypatch.setattr("vueda.user.management.commands.utils.black", None)
        (tmp_path / "pyproject.toml").write_text('[tool.ruff.format]\nquote-style = "single"\n')
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], tmp_path / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert "'model_name'" in source
        assert errors.getvalue() == ""

    def test_format_changed_data_uses_ruff_when_black_only_infers_settings(self, tmp_path):
        # black infers a target version from requires-python, which is not [tool.black] configuration.
        (tmp_path / "pyproject.toml").write_text(
            '[project]\nname = "project"\nrequires-python = ">=3.11,<3.15"\n\n[tool.ruff.format]\nquote-style = "single"\n'
        )
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], tmp_path / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert "'model_name'" in source
        assert errors.getvalue() == ""

    def test_format_changed_data_prefers_black_when_the_project_configures_it(self, tmp_path):
        # The ruff settings ask for double quotes, so single quotes show black formatted. Skipping the magic
        # trailing comma would drop the last comma, so a trailing comma shows it stayed off.
        (tmp_path / "pyproject.toml").write_text(
            "[tool.black]\nline-length = 120\nskip-string-normalization = true\nskip-magic-trailing-comma = true\n\n"
            '[tool.ruff.format]\nquote-style = "double"\n'
        )
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], tmp_path / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert "'model_name'" in source
        assert errors.getvalue() == ""

    def test_format_changed_data_uses_black_defaults_when_ruff_is_not_installed(self, tmp_path, monkeypatch):
        monkeypatch.setattr("vueda.user.management.commands.utils.find_ruff", lambda: None)
        # Without ruff, its single quotes do not apply, and black's default normalizes them to double.
        (tmp_path / "pyproject.toml").write_text('[tool.ruff.format]\nquote-style = "single"\n')
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], tmp_path / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert '"model_name"' in source
        assert errors.getvalue() == ""

    def test_format_changed_data_uses_black_defaults_for_an_empty_black_section(self, tmp_path):
        # An empty [tool.black] still chooses black. Its defaults normalize to double quotes, where ruff
        # would follow the project's single quotes.
        (tmp_path / "pyproject.toml").write_text('[tool.black]\n\n[tool.ruff.format]\nquote-style = "single"\n')
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], tmp_path / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert '"model_name"' in source
        assert errors.getvalue() == ""

    def test_format_changed_data_ignores_a_user_level_black_configuration(self, tmp_path, monkeypatch):
        # The project has no pyproject.toml and configures ruff in ruff.toml. black's command line would fall
        # back to the developer's own black configuration, and its double quotes would show black formatted.
        project = tmp_path / "project"
        (project / ".git").mkdir(parents=True)
        (project / "ruff.toml").write_text('[format]\nquote-style = "single"\n')
        user_configuration = tmp_path / "user_black"
        user_configuration.write_text("[tool.black]\nline-length = 120\n")
        monkeypatch.setattr("black.files.find_user_pyproject_toml", lambda: user_configuration)
        errors = io.StringIO()

        source = format_changed_data(
            [{"model_name": "workflow"}], project / "migrations" / "0002_workflow.py", stderr=errors
        )

        assert re.search(r",\s*\]\s*$", source)
        assert "'model_name'" in source
        assert errors.getvalue() == ""

    def test_format_changed_data_uses_pformat_quietly_when_neither_is_installed(self, tmp_path, monkeypatch):
        monkeypatch.setattr("vueda.user.management.commands.utils.black", None)
        monkeypatch.setattr("vueda.user.management.commands.utils.find_ruff", lambda: None)
        changed_data = [{"changes": {"code": "new"}, "model_name": "workflow"}]
        errors = io.StringIO()

        source = format_changed_data(changed_data, tmp_path / "migrations" / "0002_workflow.py", stderr=errors)

        assert source == f"changed_data = {pformat(changed_data, width=20)}\n"
        assert errors.getvalue() == ""

    @pytest.mark.parametrize(
        ("pyproject", "black_installed", "formatter", "explanation"),
        [
            # The configuration cannot be read at all.
            ("[tool.black\nline-length = 120\n", True, "black", "Could not read the pyproject.toml that applies to"),
            # black is configured but fails, so ruff, which would succeed, is not used in its place.
            ('[tool.black]\nline-length = "long"\n', True, "black", ""),
            ('[tool.ruff]\nline-length = "long"\n', False, "ruff", "Failed to parse"),
        ],
    )
    def test_format_changed_data_reports_a_failing_formatter_and_uses_pformat(
        self, tmp_path, monkeypatch, pyproject, black_installed, formatter, explanation
    ):
        if not black_installed:
            monkeypatch.setattr("vueda.user.management.commands.utils.black", None)
        (tmp_path / "pyproject.toml").write_text(pyproject)
        migration_path = tmp_path / "migrations" / "0002_workflow.py"
        changed_data = [{"changes": {"code": "new"}, "model_name": "workflow"}]
        errors = io.StringIO()

        source = format_changed_data(changed_data, migration_path, stderr=errors)

        assert source == f"changed_data = {pformat(changed_data, width=20)}\n"
        assert errors.getvalue().startswith(f"  {formatter} could not format changed_data for {migration_path}:\n")
        assert explanation in errors.getvalue()
        assert errors.getvalue().endswith(
            f"  Wrote changed_data with pprint instead. Fix the problem above, then format {migration_path} manually."
        )


@pytest.mark.django_db
@pytest.mark.parametrize("change_type", ["unassociated", "deleted"])
def test_migrate_step_removal_without_the_group_does_not_raise(change_type):
    """Replaying a removal against a database that has no group of that name leaves nothing to do."""
    migrate_step(
        ContentType,
        Group,
        Permission,
        "GroupThatDoesNotExist",
        "",
        change_type,
        "read_group",
        "auth",
        "group",
        "Can read group",
    )

    assert not Group.objects.filter(name="GroupThatDoesNotExist").exists()
