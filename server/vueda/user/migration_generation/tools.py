"""The interface that each kind of recorded change implements to take part in ``makevuedamigrations``.

A tool reads one kind of recorded change, such as group changes or workflow changes. ``makevuedamigrations``
asks every installed tool for its pending changes, orders them all by when they were recorded, and asks each
tool for the content of the migrations that hold its share of them.

This module also holds the user app's own tool, ``GroupChangeTool``. The workflow app's tool is in
``vueda.workflow.migration_generation.tools``.
"""

__all__ = (
    "GroupChangeTool",
    "MigrationContent",
    "MigrationTool",
    "PendingChange",
)

import dataclasses
import datetime
import secrets

from django.contrib.auth import models as auth_models

from vueda.user import models as vueda_models
from vueda.user.management.commands.utils import get_matching_record
from vueda.user.migration_generation.operations import MIGRATION_MODIFIED_COMMENTS
from vueda.user.migration_generation.operations import get_group_migration_imports
from vueda.user.migration_generation.operations import get_group_migration_sources
from vueda.user.migration_generation.utils import generated_migrations
from vueda.user.migration_generation.utils import user_app_label


@dataclasses.dataclass(frozen=True)
class PendingChange:
    """One recorded change that no generated migration holds yet.

    ``recorded_at`` orders changes across tools. ``tiebreak`` orders a tool's own changes that share a
    ``recorded_at``. ``app_label`` names the app whose migration holds the change. ``data`` is the entry that
    the migration's ``changed_data`` list holds.
    """

    recorded_at: datetime.datetime
    tiebreak: tuple
    app_label: str
    data: dict = dataclasses.field(compare=False)


@dataclasses.dataclass(frozen=True)
class MigrationContent:
    """The parts of a generated migration that differ between tools.

    The writer fills an empty migration with these parts. ``imports`` replaces the migration's import block,
    and its first line is the tool's marker comment. ``preamble`` holds module-level lines that go before
    ``changed_data``. ``sources`` holds the code that goes after ``changed_data``. The four names replace the
    placeholders of the migration's two ``RunPython`` operations. The first operation makes sure that every
    permission exists. The second applies the changes.
    """

    imports: tuple[str, ...]
    preamble: tuple[str, ...]
    sources: tuple[str, ...]
    permissions_forwards: str
    permissions_backwards: str
    forwards: str
    backwards: str


class MigrationTool:
    """One kind of recorded change that ``makevuedamigrations`` writes migrations for.

    A subclass sets ``key``, ``migration_name``, and ``tie_order``, and implements ``pending_changes`` and
    ``migration_content``. ``key`` names the tool in output and prefixes its own options. ``migration_name`` is
    the start of the name that each of its migrations gets after Django's number.
    ``tie_order`` breaks a tie between the changes of two tools that were recorded at the same moment. The lower
    number goes first.
    """

    key = ""
    migration_name = ""
    tie_order = 0

    def __init__(self, command):
        self.command = command

    def new_migration_name(self):
        """Return ``migration_name`` followed by a random suffix of 8 hex characters, for the next migration.

        A migration that is deleted and generated again gets the same number, so the suffix gives it a new name.
        Otherwise Django would treat it as applied wherever the deleted migration was applied, and never run or fake
        it there. A workflow migration also records its writes under an action that names the migration, and the
        workflow tool finds when a migration first ran by that name, so a reused name would match the deleted
        file's run. The suffix is random rather than taken from the content, because adding and removing the same
        things gives the same content again.
        """
        return f"{self.migration_name}_{secrets.token_hex(4)}"

    @property
    def stdout(self):
        return self.command.stdout

    @property
    def stderr(self):
        return self.command.stderr

    @property
    def style(self):
        return self.command.style

    def add_arguments(self, parser):
        """Add this tool's own options to ``parser``, an argument group. Each option starts with ``--<key>-``."""

    def configure(self, options):
        """Read this tool's own options, and any shared ones, from the parsed ``options``.

        Return True when an option asks only for output, such as a list of names, so the run stops there.
        """
        return False

    def dependency_app_labels(self):
        """Return the apps whose latest migration every migration of this tool depends on.

        The writer depends on these apps in addition to the apps that the plan names. Return the apps whose
        models this tool's migrations read or write, when a project may not depend on them otherwise.
        """
        return ()

    def pending_changes(self):
        """Return this tool's recorded changes that no generated migration holds yet, as ``PendingChange``s."""
        raise NotImplementedError

    def migration_content(self, app_label, migration_name, changed_data):
        """Return the ``MigrationContent`` of the migration ``migration_name`` in ``app_label``.

        ``changed_data`` is the list of change entries that the migration holds, in the order recorded.
        """
        raise NotImplementedError

    def finish(self, *, dry_run):
        """Run after every migration has been written. A dry run writes nothing, so a tool writes nothing then."""


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
