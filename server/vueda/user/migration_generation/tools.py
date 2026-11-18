"""The interface that each kind of recorded change implements to take part in ``makevuedamigrations``.

A tool reads one kind of recorded change, such as group changes or workflow changes. ``makevuedamigrations``
asks every installed tool for its pending changes, orders them all by when they were recorded, and asks each
tool for the content of the migrations that hold its share of them.
"""

__all__ = (
    "TOOLS_ATTRIBUTE",
    "MigrationContent",
    "MigrationTool",
    "PendingChange",
    "get_migration_tools",
)

import dataclasses
import datetime
import secrets

from django.apps import apps as django_apps
from django.utils.module_loading import import_string


# The AppConfig attribute that lists an app's tools, as dotted paths to MigrationTool subclasses. It is private
# for now, so the interface can still change before a project relies on it.
TOOLS_ATTRIBUTE = "_vueda_migration_tools"


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
    # The refresh.MigrationKind that updatevuedamigrations uses for this tool's migrations, or None.
    refresh_kind = None

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


def get_migration_tools(command):
    """Return an instance of every tool that the installed apps register, in ``tie_order`` order.

    An app registers its tools in its AppConfig's ``_vueda_migration_tools`` attribute. A tool's module is
    imported only when its app is installed.
    """
    tools = []
    for app_config in django_apps.get_app_configs():
        for dotted_path in getattr(app_config, TOOLS_ATTRIBUTE, ()):
            tools.append(import_string(dotted_path)(command))

    return tuple(sorted(tools, key=lambda tool: tool.tie_order))
