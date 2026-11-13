"""The ``makevuedamigrations`` tool for group permission changes."""

__all__ = ("GroupChangeTool",)

from django.contrib.auth import models as auth_models

from vueda.user import models as vueda_models
from vueda.user.management.commands.utils import get_matching_record
from vueda.user.migration_generation.dependencies import user_app_label
from vueda.user.migration_generation.existing import generated_migrations
from vueda.user.migration_generation.group_operations import MIGRATION_MODIFIED_COMMENTS
from vueda.user.migration_generation.group_operations import get_group_migration_imports
from vueda.user.migration_generation.group_operations import get_group_migration_sources
from vueda.user.migration_generation.tools import MigrationContent
from vueda.user.migration_generation.tools import MigrationTool
from vueda.user.migration_generation.tools import PendingChange


# The GroupChange fields that a migration's changed_data holds, in the order that it holds them.
CHANGE_FIELDS = (
    "group_name",
    "group_name_old",
    "change_type",
    "when",
    "historical_permission_codename",
    "historical_permission_content_type_app_label",
    "historical_permission_content_type_model_name",
)


class GroupChangeTool(MigrationTool):
    """Write the group permission changes that the Group Management Page recorded as ``GroupChange`` rows.

    Every group migration goes into the app of ``AUTH_USER_MODEL``. A row is pending when no generated group
    migration holds a matching change.
    """

    key = "group"
    migration_name = "group_permission_migrations"
    # Workflow changes can name a group, so a group change goes first when both were recorded at once.
    tie_order = 0

    def configure(self, options):
        self.import_instead = options["import_instead"]

    def dependency_app_labels(self):
        # A group migration reads groups and permissions, and records GroupChange rows.
        return ("auth", "vueda_user")

    def existing_changed_data(self):
        """Return the ``changed_data`` of every generated group migration, in the order that they apply."""
        return tuple(
            migration.changed_data for migration in generated_migrations(user_app_label(), MIGRATION_MODIFIED_COMMENTS)
        )

    def pending_changes(self):
        return self.pending_changes_given(self.existing_changed_data())

    def pending_changes_given(self, existing_changed_data):
        """Return the ``GroupChange`` rows that no list in ``existing_changed_data`` holds, as pending changes.

        They are ordered by when they were recorded, then by primary key.
        """
        matched_pks = set()
        for changed_data in existing_changed_data:
            for change in changed_data:
                pk = get_matching_record(change, vueda_models.GroupChange)
                if pk is not None:
                    matched_pks.add(pk)

        rows = tuple(
            vueda_models.GroupChange.objects.exclude(pk__in=matched_pks)
            .order_by("when", "pk")
            .values("pk", *CHANGE_FIELDS)
        )
        permission_names = self._permission_names(rows)

        app_label = user_app_label()
        pending = []
        for row in rows:
            pk = row.pop("pk")
            key = (
                row["historical_permission_content_type_app_label"],
                row["historical_permission_content_type_model_name"],
                row["historical_permission_codename"],
            )
            if key not in permission_names:
                # The permission's model may be gone. The migration can still name it, and replaying it fails
                # only where the permission is missing too (#524).
                self.stderr.write(
                    f"The permission {'.'.join(key)} of the {row['change_type']} change to group "
                    f"{row['group_name']!r} no longer exists. Its migration names it without a permission name."
                )
            row["historical_permission_name"] = permission_names.get(key, "")
            pending.append(PendingChange(recorded_at=row["when"], tiebreak=(pk,), app_label=app_label, data=row))

        return tuple(pending)

    @staticmethod
    def _permission_names(rows):
        """Return the names of the permissions that ``rows`` name, keyed by app label, model, and codename."""
        codenames = {row["historical_permission_codename"] for row in rows}
        permissions = auth_models.Permission.objects.filter(codename__in=codenames).values_list(
            "content_type__app_label", "content_type__model", "codename", "name"
        )
        return {(app_label, model, codename): name for app_label, model, codename, name in permissions}

    def migration_content(self, app_label, migration_name, changed_data):
        return MigrationContent(
            imports=tuple(get_group_migration_imports(self.import_instead)),
            preamble=(),
            sources=tuple(get_group_migration_sources(self.import_instead)),
            permissions_forwards="make_sure_permissions_exist",
            permissions_backwards="migrations.RunPython.noop",
            forwards="forwards_migrate_groups_through_imports",
            backwards="backwards_migrate_groups_through_imports",
        )
