"""Management command that refreshes the generated group and workflow migrations of every app."""

__all__ = ("Command",)

import ast
import dataclasses
import os
import stat
import sys
import tempfile
import types
from pathlib import Path

from django.apps import apps as django_apps
from django.core.management import BaseCommand
from django.db.migrations.exceptions import NodeNotFoundError
from django.db.migrations.loader import MigrationLoader

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.migration_generation.refresh import RefreshError
from vueda.user.migration_generation.refresh import refresh_migration
from vueda.user.migration_generation.refresh import remove_imports_that_stop_the_graph
from vueda.user.migration_generation.refresh import without_imports_that_vueda_no_longer_has
from vueda.user.migration_generation.registration import get_migration_tools
from vueda.user.migration_generation.utils import is_generated_migration
from vueda.user.migration_generation.utils import is_installed_package_app
from vueda.user.migration_generation.utils import is_installed_package_location


@dataclasses.dataclass
class _GeneratedFile:
    """A generated migration that this run found, and what the run learned about it."""

    path: Path
    app_label: str
    kind: object
    writable: bool
    text: str | None = None
    read_problem: str | None = None


# What happened to one migration in a run.
_UPDATED = "updated"
_UP_TO_DATE = "up to date"
_SKIPPED = "skipped"
_FAILED = "failed"


class Command(BaseCommand):
    help = (
        "Refresh every generated group and workflow migration in your project with the functions and imports that "
        "makevuedamigrations writes now, so fixes in VUEDA reach migrations that copied older versions. Functions "
        "that VUEDA no longer writes are removed when nothing uses them. Code that you added stays. "
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

        # Group migrations need no migration graph, so they are refreshed first.
        writable.sort(key=lambda generated: generated.kind.name == "workflow")
        workflow = None
        updated = {}
        up_to_date = skipped = 0
        for generated in writable:
            # Workflow history and the migration graph are needed only to refresh a workflow migration.
            if workflow is None and generated.kind.name == "workflow":
                workflow = self._prepare_workflow(files)
            outcome = self._refresh_file(generated, workflow)
            if outcome == _FAILED:
                failed += 1
            elif outcome == _UPDATED:
                updated[generated.kind.name] = updated.get(generated.kind.name, 0) + 1
            elif outcome == _SKIPPED:
                skipped += 1
            else:
                up_to_date += 1

        self._write_summary(updated, up_to_date, skipped, failed)
        if failed:
            sys.exit(1)

    def _find_generated_migrations(self, kinds):
        """Return every generated migration in every app, with its kind and whether this run may rewrite it."""
        found = []
        for app_config in django_apps.get_app_configs():
            migrations_path = get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            # A package's migrations are read for the workflows that they record, but a project cannot commit a change
            # to them, and a reinstall puts the originals back. makevuedamigrations uses the same rule.
            app_writable = not is_installed_package_app(app_config.label)
            for path in sorted(Path(migrations_path).glob("*.py")):
                # Django's loader skips names that start with an underscore or a tilde, so they are no migration.
                if path.name.startswith(("_", "~")) or not path.is_file():
                    continue
                # A migration that links into a package is that package's file.
                writable = app_writable and not is_installed_package_location(path.resolve())
                try:
                    kind = next((kind for kind in kinds if is_generated_migration(path, kind.markers)), None)
                    if kind is None:
                        continue
                    generated = _GeneratedFile(path, app_config.label, kind, writable, text=path.read_text("utf-8-sig"))
                except (OSError, UnicodeDecodeError) as error:
                    generated = _GeneratedFile(path, app_config.label, None, writable, read_problem=str(error))
                    if writable:
                        self.stderr.write(self.style.ERROR(f"  Could not read {path}: {error}"))
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  Could not read {path}: {error}. If it is a generated workflow migration, "
                                "the workflows it records are not used to name references."
                            )
                        )
                found.append(generated)

        return found

    def _prepare_workflow(self, files):
        """Read every workflow migration's history and build the migration graph, before any file is refreshed.

        What a workflow code meant can be recorded in another app's migration, even one in a package, so every
        generated workflow migration is read first.
        """
        from vueda.workflow.migration_generation import refresh as workflow_refresh

        changed_data_lists = []
        for generated in files:
            if generated.text is None or generated.kind.name != "workflow":
                continue
            try:
                ast.parse(generated.text)
            except SyntaxError as error:
                # The refresh reports a project's file. A package's file is only read here, so say so.
                if not generated.writable:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Could not read {generated.path}: {error}. "
                            "The workflows it records are not used to name references."
                        )
                    )
                continue

            # Imports of code that VUEDA no longer has would stop the read, and the refresh removes them anyway.
            changed_data, problem = workflow_refresh.read_changed_data(
                without_imports_that_vueda_no_longer_has(generated.text), generated.path
            )
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

        loader, loader_problem = self._build_migration_graph(files)

        return {
            "module": workflow_refresh,
            "identities": workflow_refresh.collect_workflow_identities(changed_data_lists),
            "loader": loader,
            "loader_problem": loader_problem,
        }

    def _build_migration_graph(self, files):
        """Build the declared migration graph, and return it with the reason that it could not be built.

        Building the graph imports every migration, so one import of VUEDA code that no longer exists stops it for
        the whole project. Django's loader imports each migration by its module name, and it uses a module that
        is already loaded. So each migration with such an import is loaded first, from its text without the
        imports that can go safely, under its own module name. Nothing is written, and the modules are unloaded
        again afterwards. Each file's refresh then removes the imports for good, and a file that is skipped or
        fails keeps them.
        """
        seen = {}
        stripped = {}
        for generated in files:
            if not generated.writable or generated.read_problem:
                continue
            # A group migration may already be refreshed, so read the current text.
            try:
                current = generated.path.read_text("utf-8-sig")
            except (OSError, UnicodeDecodeError):
                continue
            fixed, removed = remove_imports_that_stop_the_graph(current, generated.kind)
            seen[generated.path] = fixed
            if not removed:
                continue
            package, _explicit = MigrationLoader.migrations_module(generated.app_label)
            if package is not None:
                stripped[f"{package}.{generated.path.stem}"] = (generated.path, fixed)

        replaced = {}
        try:
            for name, (path, fixed) in stripped.items():
                module = types.ModuleType(name)
                module.__file__ = str(path)
                module.__package__ = name.rpartition(".")[0]
                try:
                    exec(compile(fixed, str(path), "exec"), module.__dict__)
                except Exception:
                    # The loader imports the file itself and reports its error.
                    seen[path] = None
                    continue
                replaced[name] = sys.modules.get(name)
                sys.modules[name] = module
            try:
                # The declared graph, not the migrations applied to this database: a refreshed migration must also
                # work when a new installation starts with an empty database.
                return MigrationLoader(None, ignore_no_migrations=True), None
            except Exception as error:
                return None, self._describe_graph_problem(error, files, seen)
        finally:
            for name, previous in replaced.items():
                if previous is None:
                    sys.modules.pop(name, None)
                else:
                    sys.modules[name] = previous

    def _describe_graph_problem(self, error, files, seen):
        """Say why the migration graph could not be built, naming each migration that imports a missing module.

        ``seen`` maps each project migration's path to the text that the graph loaded from it.
        """
        problem = f"cannot resolve migration dependencies: {error}"
        missing = error.name if isinstance(error, ImportError) else None
        if missing:
            importers = sorted(
                str(generated.path)
                for generated in files
                if _imports_module(seen.get(generated.path) or generated.text or "", missing)
            )
            if importers:
                problem += f". {missing} is imported by {', '.join(importers)}"
        return problem

    def _refresh_file(self, generated, workflow):
        """Refresh one migration, and return what happened to it.

        The result is ``_UPDATED``, ``_UP_TO_DATE``, ``_SKIPPED`` or ``_FAILED``.
        """
        update_changed_data = None
        blocked = None
        if generated.kind.name == "workflow":
            blocked, skipped = self._workflow_blocker(generated, workflow)
            if skipped:
                # The migration keeps the functions that it was written with, so nothing in it is refreshed.
                self.stdout.write(self.style.WARNING(f"Skipping: {generated.path}"))
                self.stdout.write(f"  Its {blocked}")
                return _SKIPPED
            if blocked is None:
                update_changed_data = workflow["module"].changed_data_updater(
                    workflow["identities"], generated.path, stderr=self.stderr, dry_run=self.dry_run
                )

        # The refresh runs even when the workflow checks block the file, because the code that the file needs
        # changed by hand is the more useful report. An import that is still used also stops the graph.
        try:
            result = refresh_migration(generated.text, generated.kind, update_changed_data=update_changed_data)
        # A hand-edited migration can also fail a merge or the formatter in ways that raise TypeError or
        # SyntaxError. Each one fails only its own file.
        except (RefreshError, ValueError, TypeError, SyntaxError) as error:
            self.stderr.write(
                self.style.ERROR(f"  Could not update {generated.path}: {error} Leaving the file unchanged.")
            )
            return _FAILED
        if blocked is not None:
            self.stderr.write(
                self.style.ERROR(f"  Cannot update {generated.path}: {blocked} Leaving the file unchanged.")
            )
            return _FAILED

        if not result.changed:
            self.stdout.write(f"Already up to date: {generated.path}")
            return _UP_TO_DATE

        self.stdout.write(f"{'Would update' if self.dry_run else 'Updating'}: {generated.path}")
        for name in result.removed_names:
            self.stdout.write(f"  Removed {name}, which VUEDA no longer writes and nothing uses.")
        for name in result.replaced_imports:
            self.stdout.write(f"  Replaced the import of {name} with a copy.")
        for name in result.removed_missing_imports:
            self.stdout.write(f"  Removed the import of {name}, which VUEDA no longer has.")
        if not self.dry_run:
            try:
                _write_atomically(generated.path, result.source)
            except OSError as error:
                self.stderr.write(self.style.ERROR(f"  Could not write {generated.path}: {error}"))
                return _FAILED
        return _UPDATED

    def _workflow_blocker(self, generated, workflow):
        """Return why the migration graph stops a workflow migration from being refreshed, as a pair.

        The first value is the reason, or None when nothing stops the refresh. The second is True when the reason
        is one that skips the migration on purpose rather than failing it.
        """
        workflow_refresh = workflow["module"]
        if workflow["loader"] is None:
            return f"{workflow['loader_problem']}.", False
        migration_key = (generated.app_label, generated.path.stem)
        try:
            has_workflow_events = workflow_refresh.requires_workflow_events(workflow["loader"], migration_key)
        except NodeNotFoundError:
            return (
                "the migration graph does not include it, for example because a squashed migration replaces it.",
                False,
            )
        if not has_workflow_events:
            # Such a migration ran before the event tables existed, so its own copies are the ones that it needs.
            required = workflow_refresh.REQUIRED_WORKFLOW_MIGRATION
            return (
                f"dependencies do not include {required[0]}.{required[1]}, which the current workflow "
                "functions require. Keep its existing functions; review the migration graph before changing "
                "dependencies.",
                True,
            )
        return None, False

    def _write_summary(self, updated, up_to_date, skipped, failed):
        for kind_name, count in sorted(updated.items()):
            verb = "Would update" if self.dry_run else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}{verb} {count} {kind_name} migration(s)."))
        if up_to_date:
            self.stdout.write(self.style.SUCCESS(f"Already up to date: {up_to_date} migration(s)."))
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} migration(s) that must keep their functions."))
        if failed:
            verb = "Would have failed updating" if self.dry_run else "Failed updating"
            self.stdout.write(self.style.ERROR(f"{verb} {failed} migration(s)."))


def _write_atomically(path, text):
    """Write ``text`` to ``path`` through a temporary file in the same directory, so a failed write leaves the
    original in place.

    A symlinked migration is written through its link. The file keeps its permissions and gets ``\\n`` line endings
    on every platform.
    """
    path = Path(path).resolve()
    # Replacing a file needs only the directory's permission, so a migration marked read-only is refused here, as
    # writing it in place would be.
    if not os.access(path, os.W_OK):
        raise PermissionError(f"{path} is read-only")
    handle = tempfile.NamedTemporaryFile(  # noqa: SIM115
        "w", encoding="utf-8", newline="", dir=path.parent, delete=False, suffix=".tmp"
    )
    try:
        with handle:
            handle.write(text)
        # A temporary file is created readable by its owner only. Keep the permissions that the migration had.
        os.chmod(handle.name, stat.S_IMODE(path.stat().st_mode))
        os.replace(handle.name, path)
    except BaseException:
        # Also on an interrupt, so no temporary file is left in the migrations directory.
        Path(handle.name).unlink(missing_ok=True)
        raise


def _imports_module(text, module):
    """Return whether the migration ``text`` imports ``module`` at its top level."""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return False
    for node in tree.body:
        # A missing package stops every import of a module inside it, so its submodules count too.
        if isinstance(node, ast.ImportFrom) and _within(node.module, module):
            return True
        if isinstance(node, ast.Import) and any(_within(alias.name, module) for alias in node.names):
            return True
    return False


def _within(name, module):
    return bool(name) and (name == module or name.startswith(f"{module}."))
