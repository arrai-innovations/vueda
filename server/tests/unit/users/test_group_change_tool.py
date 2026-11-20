"""The group tool finds the recorded group changes that no generated group migration holds yet.

Each test passes the ``changed_data`` of the earlier migrations in directly, so no migration files are involved.
The test database can hold group changes of its own, so each test names its groups uniquely and reads back only
the pending changes for them.
"""

import datetime
import io

import pytest
from django.apps import apps as django_apps
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.core.management import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext

from vueda.user.management.commands.utils import create_group_change
from vueda.user.migration_generation.operations import backwards_migrate_groups
from vueda.user.migration_generation.operations import forwards_migrate_groups
from vueda.user.migration_generation.tools import GroupChangeTool
from vueda.user.models import GroupChange


START = datetime.datetime(2026, 11, 13, 9, 0, tzinfo=datetime.UTC)
MINUTE = datetime.timedelta(minutes=1)

# The fields of a GroupChange row that a migration's changed_data holds.
RECORDED_FIELDS = (
    "group_name",
    "group_name_old",
    "change_type",
    "when",
    "historical_permission_codename",
    "historical_permission_content_type_app_label",
    "historical_permission_content_type_model_name",
)


def record_group_change(group_name, change_type, when, *, group_name_old=""):
    """Record a change to ``auth.read_group`` the way the Group Management Page does, at the moment ``when``."""
    change = GroupChange.objects.create(
        group_name=group_name,
        group_name_old=group_name_old,
        change_type=change_type,
        historical_permission_codename="read_group",
        historical_permission_content_type_app_label="auth",
        historical_permission_content_type_model_name="group",
    )
    # `when` is set when the row is created, so a chosen moment is written afterwards.
    GroupChange.objects.filter(pk=change.pk).update(when=when)
    return GroupChange.objects.values(*RECORDED_FIELDS).get(pk=change.pk)


def pending_changes_for(group_names, existing_changed_data):
    """Return the group tool's pending changes for ``group_names``, given the earlier migrations' changed_data."""
    tool = GroupChangeTool(BaseCommand(stdout=io.StringIO()))
    tool.configure({"import_instead": False})
    pending = tool.pending_changes_given(existing_changed_data)
    return tuple(change for change in pending if change.data["group_name"] in group_names)


@pytest.mark.django_db
def test_create_group_change_writes_when_rather_than_the_database_default():
    """vueda_user 0005 runs sync_group_changes with the current model before 0007 gives `when` a database default.

    An INSERT that left `when` to that default would then write NULL, so it must always carry the value.
    """
    change = {
        "group_name": "Inserted With When",
        "group_name_old": "",
        "change_type": GroupChange.ADDED,
        "when": START,
        "historical_permission_codename": "read_group",
        "historical_permission_content_type_app_label": "auth",
        "historical_permission_content_type_model_name": "group",
    }

    with CaptureQueriesContext(connection) as queries:
        pk = create_group_change(change, GroupChange)

    insert = next(query["sql"] for query in queries if query["sql"].startswith("INSERT"))
    columns, values = insert.split("VALUES", 1)
    # Left to the database default, the column is still named, but its value is the DEFAULT keyword.
    assert '"when"' in columns, insert
    assert "DEFAULT" not in values, insert
    assert GroupChange.objects.get(pk=pk).when == START


@pytest.mark.django_db
def test_a_deleted_change_from_an_older_migration_reverses_into_granting_the_permission_again():
    """Older migrations recorded `deleted` when a group lost its last permission.

    Going forwards it removes the permission and keeps the group. Reversing it grants the permission again.
    """
    read_group = Permission.objects.get(content_type__app_label="auth", codename="read_group")
    group = Group.objects.create(name="Older Deleted Group")
    group.permissions.add(read_group)
    deleted = {
        "group_name": "Older Deleted Group",
        "group_name_old": "",
        "change_type": GroupChange.DELETED,
        "when": START,
        "historical_permission_codename": "read_group",
        "historical_permission_content_type_app_label": "auth",
        "historical_permission_content_type_model_name": "group",
        "historical_permission_name": read_group.name,
    }

    forwards_migrate_groups(django_apps, [dict(deleted)])
    assert list(Group.objects.get(name="Older Deleted Group").permissions.all()) == []

    backwards_migrate_groups(django_apps, [dict(deleted)])
    assert list(Group.objects.get(name="Older Deleted Group").permissions.all()) == [read_group]


@pytest.mark.django_db
class TestGroupChangeTool:
    def test_a_change_that_an_existing_migration_holds_is_not_pending(self):
        added = record_group_change("Migrated Group", GroupChange.ADDED, START)
        associated = record_group_change("Migrated Group", GroupChange.ASSOCIATED, START + MINUTE)

        pending = pending_changes_for({"Migrated Group"}, existing_changed_data=([added],))

        assert tuple(change.data["change_type"] for change in pending) == (GroupChange.ASSOCIATED,)
        assert pending[0].recorded_at == associated["when"]

    def test_a_pending_change_holds_what_its_migration_replays(self, settings):
        record_group_change("Shaped Group", GroupChange.ADDED, START)

        (pending,) = pending_changes_for({"Shaped Group"}, existing_changed_data=())

        assert pending.app_label == settings.AUTH_USER_MODEL.split(".")[0]
        assert pending.recorded_at == START
        assert pending.data == {
            "group_name": "Shaped Group",
            "group_name_old": "",
            "change_type": GroupChange.ADDED,
            "when": START,
            "historical_permission_codename": "read_group",
            "historical_permission_content_type_app_label": "auth",
            "historical_permission_content_type_model_name": "group",
            "historical_permission_name": "Can read group",
        }

    def test_a_group_created_again_with_a_name_it_had_before_is_pending(self):
        """A group created, removed, and created again with the same name: only the second creation is new."""
        first_added = record_group_change("Recreated Group", GroupChange.ADDED, START)
        removed = record_group_change("Recreated Group", GroupChange.UNASSOCIATED, START + MINUTE)
        record_group_change("Recreated Group", GroupChange.ADDED, START + 2 * MINUTE)

        pending = pending_changes_for({"Recreated Group"}, existing_changed_data=([first_added, removed],))

        assert tuple((change.data["change_type"], change.recorded_at) for change in pending) == (
            (GroupChange.ADDED, START + 2 * MINUTE),
        )

    def test_a_rename_back_to_an_earlier_name_is_pending(self):
        """A group renamed from A to B and back to A: only the rename back is new."""
        added = record_group_change("Cycle A", GroupChange.ADDED, START)
        renamed = record_group_change("Cycle B", GroupChange.CHANGED, START + MINUTE, group_name_old="Cycle A")
        record_group_change("Cycle A", GroupChange.CHANGED, START + 2 * MINUTE, group_name_old="Cycle B")

        pending = pending_changes_for({"Cycle A", "Cycle B"}, existing_changed_data=([added, renamed],))

        assert tuple((change.data["group_name_old"], change.data["group_name"]) for change in pending) == (
            ("Cycle B", "Cycle A"),
        )

    def test_a_rename_to_the_name_of_a_removed_group_is_pending(self):
        old_added = record_group_change("Reused Name", GroupChange.ADDED, START)
        old_removed = record_group_change("Reused Name", GroupChange.UNASSOCIATED, START + MINUTE)
        other_added = record_group_change("Other Name", GroupChange.ADDED, START + 2 * MINUTE)
        record_group_change("Reused Name", GroupChange.CHANGED, START + 3 * MINUTE, group_name_old="Other Name")

        pending = pending_changes_for(
            {"Reused Name", "Other Name"}, existing_changed_data=([old_added, old_removed], [other_added])
        )

        assert tuple((change.data["change_type"], change.data["group_name"]) for change in pending) == (
            (GroupChange.CHANGED, "Reused Name"),
        )

    def test_a_teammates_migration_applied_here_leaves_nothing_pending(self):
        """Applying a teammate's group migration records its changes with their original times, which then match."""
        teammates_changes = [
            {
                "group_name": "Teammate Group",
                "group_name_old": "",
                "change_type": GroupChange.ADDED,
                "when": START,
                "historical_permission_codename": "read_group",
                "historical_permission_content_type_app_label": "auth",
                "historical_permission_content_type_model_name": "group",
                "historical_permission_name": "Can read group",
            }
        ]
        create_group_change(teammates_changes[0], GroupChange)

        assert pending_changes_for({"Teammate Group"}, existing_changed_data=(teammates_changes,)) == ()

    def test_a_change_is_recorded_at_the_database_clock(self, monkeypatch):
        """Workflow events take the database's clock, so group changes must too for the two to sort together."""
        long_ago = datetime.datetime(2000, 1, 1, tzinfo=datetime.UTC)
        monkeypatch.setattr("django.utils.timezone.now", lambda: long_ago)

        change = GroupChange.objects.create(
            group_name="Clocked Group",
            change_type=GroupChange.ADDED,
            historical_permission_codename="read_group",
            historical_permission_content_type_app_label="auth",
            historical_permission_content_type_model_name="group",
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT statement_timestamp()")
            database_now = cursor.fetchone()[0]

        assert change.when != long_ago
        assert abs(database_now - change.when) < MINUTE

    def test_changes_are_ordered_by_when_they_were_recorded(self):
        record_group_change("Ordered Group", GroupChange.ASSOCIATED, START + MINUTE)
        record_group_change("Ordered Group", GroupChange.ADDED, START)

        pending = pending_changes_for({"Ordered Group"}, existing_changed_data=())

        assert tuple(change.data["change_type"] for change in pending) == (GroupChange.ADDED, GroupChange.ASSOCIATED)

    def test_changes_recorded_at_the_same_moment_keep_the_order_they_were_saved_in(self):
        record_group_change("Tied Group", GroupChange.ADDED, START)
        record_group_change("Tied Group", GroupChange.UNASSOCIATED, START)
        record_group_change("Tied Group", GroupChange.ASSOCIATED, START)

        pending = pending_changes_for({"Tied Group"}, existing_changed_data=())

        assert tuple(change.data["change_type"] for change in pending) == (
            GroupChange.ADDED,
            GroupChange.UNASSOCIATED,
            GroupChange.ASSOCIATED,
        )

    def test_a_change_to_a_permission_that_no_longer_exists_is_kept_with_a_warning(self):
        """The permission's model may be gone. The change still reaches a migration, without a permission name."""
        GroupChange.objects.create(
            group_name="Orphaned Group",
            change_type=GroupChange.ADDED,
            historical_permission_codename="read_vanished",
            historical_permission_content_type_app_label="auth",
            historical_permission_content_type_model_name="group",
        )
        errors = io.StringIO()
        tool = GroupChangeTool(BaseCommand(stdout=io.StringIO(), stderr=errors))
        tool.configure({"import_instead": False})

        (pending,) = (
            change for change in tool.pending_changes_given(()) if change.data["group_name"] == "Orphaned Group"
        )

        assert pending.data["historical_permission_name"] == ""
        assert "The permission auth.group.read_vanished of the added change to group 'Orphaned Group'" in (
            errors.getvalue()
        )
