import datetime

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.migrations.recorder import MigrationRecorder
from django.test import override_settings

from tests.conftest import BaseTestCallCommand
from tests.utils import BaseTestMigrations
from tests.utils import info_register_aware_modify_settings
from vueda.user.models import GroupChange


class TestManagementCommandGroupAdded(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "group_added": "tests.group_added",
        },
        AUTH_USER_MODEL="group_added.GroupAddedUser",
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.group_added",
            ],
        }
    )
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_added(self):
        with self.temporary_migration_module(app_label="group_added") as migration_dir:
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

            assert not Group.objects.filter(name="GroupAddedWorkers").exists(), (
                "'GroupAddedWorkers' still exists after rolling back."
            )


class TestManagementCommandGroupChanged(BaseTestMigrations, BaseTestCallCommand):
    @override_settings(
        MIGRATION_MODULES={
            "group_changed": "tests.group_changed",
        },
        AUTH_USER_MODEL="group_changed.GroupChangedUser",
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.group_changed",
            ],
        }
    )
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_changed(self):
        with self.temporary_migration_module(app_label="group_changed") as migration_dir:
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
    @override_settings(
        MIGRATION_MODULES={
            "group_deleted": "tests.group_deleted",
        },
        AUTH_USER_MODEL="group_deleted.GroupDeletedUser",
    )
    @info_register_aware_modify_settings(
        INSTALLED_APPS={
            "append": [
                "tests.group_deleted",
            ],
        }
    )
    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db
    def test_group_deleted(self):
        with self.temporary_migration_module(app_label="group_deleted") as migration_dir:
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

            # Group should be deleted, because there are no more permissions associated to it.
            assert not Group.objects.filter(name="GroupDeletedWorkers").exists(), (
                "'GroupDeletedWorkers' still exists after deletion migration."
            )

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
