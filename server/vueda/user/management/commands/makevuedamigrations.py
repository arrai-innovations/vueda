"""Management command that writes group and workflow migrations in the order that the changes were made."""

__all__ = ("Command",)

from django.core.exceptions import ImproperlyConfigured
from django.core.management import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.transaction import atomic

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.migration_generation.dependencies import project_app_labels
from vueda.user.migration_generation.planner import ToolChanges
from vueda.user.migration_generation.planner import plan_migrations
from vueda.user.migration_generation.tools import get_migration_tools
from vueda.user.migration_generation.writer import write_plan


class _PrefixedArgumentGroup:
    """An argument group that accepts only options that start with ``--<key>-``.

    A tool's own options carry its key, so two tools can never add the same option, and no tool can take a
    name that the command uses.
    """

    def __init__(self, group, key):
        self._group = group
        self._prefix = f"--{key}-"

    def add_argument(self, *names, **kwargs):
        for name in names:
            if not name.startswith(self._prefix):
                raise ImproperlyConfigured(
                    f"The makevuedamigrations option {name!r} must start with {self._prefix!r}, "
                    "the key of the tool that adds it."
                )
        return self._group.add_argument(*names, **kwargs)


class Command(BaseCommand):
    help = (
        "Write the group and workflow migrations for the changes that no generated migration holds yet, in the "
        "order that the changes were made. Group changes come from the GroupChange rows that the Group "
        "Management Page records. Workflow changes come from the pghistory events of the workflow models. Each "
        "time the changes switch between group and workflow changes, the command starts a new migration that "
        "depends on the ones before it. Group migrations go into the app of AUTH_USER_MODEL. Workflow migrations "
        "go into the app of each workflow model. Except in a --dry-run, the command also gives local objects the "
        "states that the workflow migrations would set. Fake the new migrations locally, because the local "
        "database already has the changes."
    )

    # VUEDA's test suite sets this to True, so the migrations that the tests write import the functions that they
    # run instead of copying them in, and the coverage report counts that code. It is not an option, because a
    # project's migrations must keep working when VUEDA changes or renames those functions.
    _import_instead = False

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show which migrations would be written, without writing them.",
        )
        parser.add_argument(
            "--keep-failed-migration",
            action="store_true",
            help=(
                "When a migration cannot be filled in, keep the unfinished file instead of deleting it, so you can "
                "read it or attach it to a bug report. Delete it before you run migrate."
            ),
        )

        self.tools = get_migration_tools(self)
        for tool in self.tools:
            group = parser.add_argument_group(f"{tool.key} changes")
            tool.add_arguments(_PrefixedArgumentGroup(group, tool.key))

    def _warn_about_unapplied_migrations(self, dependency_labels):
        """Warn when an app that a new migration goes into or depends on has migrations not applied here.

        The new migrations depend on the latest migration of every project app and of the apps that the tools
        name, such as ``vueda_user``. Faking a new migration marks every migration that it depends on as applied,
        so an unapplied migration of those apps would never run here.
        """
        executor = MigrationExecutor(connection)
        labels = frozenset(dependency_labels)
        unapplied = [
            f"{migration.app_label}.{migration.name}"
            for migration, _backwards in executor.migration_plan(executor.loader.graph.leaf_nodes())
            if migration.app_label in labels
        ]
        if unapplied:
            self.stderr.write(
                self.style.WARNING(
                    f"These migrations are not applied yet: {', '.join(unapplied)}. Run migrate before you fake the "
                    "new migrations. Faking a new migration also marks every migration that it depends on as "
                    "applied, so those would never run."
                )
            )

    @atomic
    def handle(self, **options):
        self.dry_run = options["dry_run"]
        options["import_instead"] = self._import_instead

        output_only = False
        for tool in self.tools:
            output_only = tool.configure(options) or output_only
        if output_only:
            return

        tool_changes = tuple(
            ToolChanges(
                tool_key=tool.key,
                changes=tuple(tool.pending_changes()),
                dependency_app_labels=tuple(tool.dependency_app_labels()),
            )
            for tool in self.tools
        )
        project_labels = project_app_labels()
        steps = plan_migrations(tool_changes, project_labels)

        if steps:
            self._warn_about_unapplied_migrations(
                {label for step in steps for label in step.dependency_app_labels}
                | {planned.app_label for step in steps for planned in step.migrations}
            )
            write_plan(
                self,
                steps,
                {tool.key: tool for tool in self.tools},
                dry_run=self.dry_run,
                keep_failed_migration=options["keep_failed_migration"],
            )

        for tool in self.tools:
            tool.finish(dry_run=self.dry_run)

        if not steps:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No changes detected."))
        elif not self.dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    f"{NEWLINE}NOTE: Fake these migrations locally, because your database already has the "
                    f"changes.{NEWLINE}"
                )
            )
