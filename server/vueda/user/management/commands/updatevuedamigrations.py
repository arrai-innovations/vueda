"""Management command that refreshes the generated group and workflow migrations of every app."""

__all__ = ("Command",)

import dataclasses
import os
import stat
import sys
import tempfile
from pathlib import Path

from django.apps import apps as django_apps
from django.core.management import BaseCommand
from django.db.migrations.exceptions import NodeNotFoundError
from django.db.migrations.loader import MigrationLoader

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.migration_generation.dependencies import is_installed_package_path
from vueda.user.migration_generation.existing import is_generated_migration
from vueda.user.migration_generation.refresh import RefreshError
from vueda.user.migration_generation.refresh import refresh_migration
from vueda.user.migration_generation.refresh import rewrite_removed_imports
from vueda.user.migration_generation.tools import get_migration_tools


@dataclasses.dataclass
class _GeneratedFile:
    """A generated migration that this run found, and what the run learned about it."""

    path: Path
    app_label: str
    kind: object
    writable: bool
    text: str | None = None
    read_problem: str | None = None


class Command(BaseCommand):
    help = (
        "Refresh every generated group and workflow migration in your project with the functions and imports that "
        "makevuedamigrations writes now, so fixes in VUEDA reach migrations that copied older versions. Imports of "
        "the removed makegroupmigrations and makeworkflowmigrations modules are pointed at the current ones, and "
        "functions that VUEDA no longer writes are removed when nothing uses them. Code that you added stays. "
        "Workflow references gain the app and model of the workflow that they name. Apps installed as packages are "
        "read but never rewritten. A file that needs no change is reported as already up to date."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing any file.",
        )

    def handle(self, **options):
        self.dry_run = options["dry_run"]
        kinds = tuple(tool.refresh_kind for tool in get_migration_tools(self) if tool.refresh_kind is not None)
        files = self._find_generated_migrations(kinds)

        failed = sum(1 for generated in files if generated.writable and generated.read_problem)
        writable = [generated for generated in files if generated.writable and generated.read_problem is None]
        if not writable and not failed:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No generated migrations found to update."))
            return

        workflow = self._prepare_workflow(files) if any(kind.name == "workflow" for kind in kinds) else None

        updated = {}
        up_to_date = 0
        for generated in writable:
            outcome = self._refresh_file(generated, workflow)
            if outcome is None:
                failed += 1
            elif outcome:
                updated[generated.kind.name] = updated.get(generated.kind.name, 0) + 1
            else:
                up_to_date += 1

        self._write_summary(updated, up_to_date, failed)
        if failed:
            sys.exit(1)

    def _find_generated_migrations(self, kinds):
        """Return every generated migration in every app, with its kind and whether this run may rewrite it."""
        found = []
        for app_config in django_apps.get_app_configs():
            migrations_path = get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            # A package's migrations are read for the workflows they record, but a project cannot commit a change
            # to them, and a reinstall puts the originals back.
            writable = not is_installed_package_path(migrations_path)
            for path in sorted(Path(migrations_path).glob("*.py")):
                if path.name == "__init__.py":
                    continue
                try:
                    kind = next((kind for kind in kinds if is_generated_migration(path, kind.markers)), None)
                    if kind is None:
                        continue
                    generated = _GeneratedFile(path, app_config.label, kind, writable, text=path.read_text("utf-8"))
                except (OSError, UnicodeDecodeError) as error:
                    generated = _GeneratedFile(path, app_config.label, None, writable, read_problem=str(error))
                    if writable:
                        self.stderr.write(self.style.ERROR(f"  Could not read {path}: {error}"))
                found.append(generated)

        return found

    def _prepare_workflow(self, files):
        """Read every workflow migration's history and build the migration graph, before any file is refreshed.

        What a workflow code meant can be recorded in another app's migration, even one in a package, so every
        generated workflow migration is read first. In a real run, imports of the removed modules are fixed on
        disk before the graph is built, because building it imports every migration.
        """
        from vueda.workflow.migration_generation import refresh as workflow_refresh

        changed_data_lists = []
        stale_imports = []
        for generated in files:
            if generated.text is None:
                continue
            try:
                imports = rewrite_removed_imports(generated.text)
            except SyntaxError:
                # The refresh reports the file. Nothing here can read it.
                continue
            if imports.changed:
                stale_imports.append((generated, imports.source))
            if generated.kind.name != "workflow":
                continue

            changed_data, problem = workflow_refresh.read_changed_data(imports.source, generated.path)
            if problem is not None:
                if not generated.writable:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Could not read changed_data in {generated.path}: {problem}. "
                            "The workflows it records are not used to name references."
                        )
                    )
                continue
            if generated.writable and workflow_refresh.has_naive_history_dates(changed_data):
                self.stdout.write(
                    self.style.WARNING(f"  Naive dates found in changed_data in {generated.path}. Treating as UTC.")
                )
            changed_data_lists.append(changed_data)

        loader = loader_problem = None
        if stale_imports and self.dry_run:
            loader_problem = (
                "the dependency check is skipped in a dry run, because some migrations still import modules that "
                "VUEDA removed. A run without --dry-run fixes those imports first, then checks dependencies."
            )
        else:
            for generated, source in stale_imports:
                if generated.writable:
                    _write_atomically(generated.path, source)
            try:
                # The declared graph, not the migrations applied to this database: a refreshed migration must
                # also work when a new installation starts with an empty database.
                loader = MigrationLoader(None)
            except Exception as error:
                loader_problem = f"cannot resolve migration dependencies: {error}"

        return {
            "module": workflow_refresh,
            "identities": workflow_refresh.collect_workflow_identities(changed_data_lists),
            "loader": loader,
            "loader_problem": loader_problem,
        }

    def _refresh_file(self, generated, workflow):
        """Refresh one migration. Return True when it changed, False when it was up to date, None on failure."""
        update_changed_data = None
        if generated.kind.name == "workflow":
            workflow_refresh = workflow["module"]
            if workflow["loader"] is not None:
                migration_key = (generated.app_label, generated.path.stem)
                try:
                    has_workflow_events = workflow_refresh.requires_workflow_events(workflow["loader"], migration_key)
                except NodeNotFoundError:
                    # A squashed migration replaced this one, so the graph has no node for it while both files exist.
                    self.stderr.write(
                        self.style.ERROR(
                            f"  Cannot update {generated.path}: a squashed migration replaces it, so the migration "
                            "graph does not include it. Leaving the file unchanged."
                        )
                    )
                    return None
                if not has_workflow_events:
                    required = workflow_refresh.REQUIRED_WORKFLOW_MIGRATION
                    self.stderr.write(
                        self.style.ERROR(
                            f"  Cannot update {generated.path}: its dependencies do not include "
                            f"{required[0]}.{required[1]}, which the current workflow functions require. Leaving "
                            "the file unchanged."
                        )
                    )
                    return None
            elif not self.dry_run:
                self.stderr.write(self.style.ERROR(f"  Cannot update {generated.path}: {workflow['loader_problem']}"))
                return None
            update_changed_data = workflow_refresh.changed_data_updater(
                workflow["identities"], generated.path, stderr=self.stderr, dry_run=self.dry_run
            )

        try:
            result = refresh_migration(generated.text, generated.kind, update_changed_data=update_changed_data)
        except (RefreshError, ValueError) as error:
            self.stderr.write(self.style.ERROR(f"  Could not update {generated.path}: {error}"))
            return None

        if not result.changed:
            self.stdout.write(f"Already up to date: {generated.path}")
            return False

        self.stdout.write(f"{'Would update' if self.dry_run else 'Updating'}: {generated.path}")
        for dropped in result.dropped_imports:
            self.stdout.write(f"  Dropped the import of {dropped}, which VUEDA no longer has.")
        for name in result.removed_names:
            self.stdout.write(f"  Removed {name}, which VUEDA no longer writes and nothing uses.")
        if workflow is not None and generated.kind.name == "workflow" and workflow["loader"] is None:
            self.stdout.write(f"  Note: {workflow['loader_problem']}")
        if not self.dry_run:
            _write_atomically(generated.path, result.source)
        return True

    def _write_summary(self, updated, up_to_date, failed):
        for kind_name, count in sorted(updated.items()):
            verb = "Would update" if self.dry_run else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}{verb} {count} {kind_name} migration(s)."))
        if up_to_date:
            self.stdout.write(self.style.SUCCESS(f"Already up to date: {up_to_date} migration(s)."))
        if failed:
            verb = "Would have failed updating" if self.dry_run else "Failed updating"
            self.stdout.write(self.style.ERROR(f"{verb} {failed} migration(s)."))


def _write_atomically(path, text):
    """Write ``text`` to ``path`` through a temporary file in the same directory, so a failed write leaves the
    original in place."""
    path = Path(path)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as handle:
        handle.write(text)
    # A temporary file is created readable by its owner only. Keep the permissions that the migration had.
    os.chmod(handle.name, stat.S_IMODE(path.stat().st_mode))
    os.replace(handle.name, path)
