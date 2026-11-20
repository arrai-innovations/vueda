"""Management command that refreshes the generated group and workflow migrations of every app."""

__all__ = ("Command",)

import ast
import dataclasses
import importlib.abc
import importlib.util
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
from vueda.user.migration_generation.refresh import imports_of_copied_vueda_functions
from vueda.user.migration_generation.refresh import imports_that_vueda_no_longer_has
from vueda.user.migration_generation.refresh import refresh_migration
from vueda.user.migration_generation.refresh import remove_imports_that_stop_the_graph
from vueda.user.migration_generation.refresh import remove_imports_that_vueda_no_longer_has
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

            changed_data, problem = workflow_refresh.read_changed_data(generated.text, generated.path)
            if problem is not None:
                # A package's file is only read here, and a project's file may be skipped and never refreshed, so
                # the problem is reported here for every file.
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

        Building the graph imports every migration, so one migration that cannot be imported, such as one that
        imports VUEDA code that no longer exists, stops it for the whole project. So the graph loads each generated
        migration as its refresh would leave it: with the current functions copied in, the operations calling
        them, and the imports that those copies replace removed. A migration whose refresh fails is loaded without
        the imports that can go safely instead. An import finder serves that text while the graph builds, and
        Python's import system loads it as it would load the file. Nothing is written, and the modules are
        unloaded again afterwards. A migration's dependencies do not change in a refresh, so the graph is the one
        that the files declare.
        """
        seen = {}
        stripped = {}
        # A package's migrations are loaded the same way. Nothing is written here, so the graph loads even when an
        # old package migration cannot be imported as it is.
        for generated in files:
            if generated.read_problem or generated.text is None:
                continue
            try:
                # The changed_data update needs the graph, and the graph needs only the dependencies, so it is left
                # out here.
                graph_text = refresh_migration(generated.text, generated.kind).source
            except Exception:
                graph_text = remove_imports_that_stop_the_graph(generated.text, generated.kind)[0]
            seen[generated.path] = graph_text
            if graph_text == generated.text:
                continue
            package, _explicit = MigrationLoader.migrations_module(generated.app_label)
            if package is not None:
                stripped[f"{package}.{generated.path.stem}"] = (generated.path, graph_text)

        finder = _StrippedMigrationFinder(stripped)
        # A module that is already loaded would be used as it is, so each one is set aside while the graph builds.
        set_aside = {name: sys.modules.pop(name) for name in stripped if name in sys.modules}
        sys.meta_path.insert(0, finder)
        try:
            # The declared graph, not the migrations applied to this database: a refreshed migration must also
            # work when a new installation starts with an empty database.
            return MigrationLoader(None, ignore_no_migrations=True), None
        except Exception as error:
            return None, self._describe_graph_problem(error, files, seen)
        finally:
            sys.meta_path.remove(finder)
            for name in stripped:
                sys.modules.pop(name, None)
                # Importing a module also sets it on its package, so the stripped one is taken off there too.
                package_name, _dot, attribute = name.rpartition(".")
                package = sys.modules.get(package_name)
                if package is not None and attribute in vars(package):
                    delattr(package, attribute)
            for name, module in set_aside.items():
                sys.modules[name] = module
                package_name, _dot, attribute = name.rpartition(".")
                if package_name in sys.modules:
                    setattr(sys.modules[package_name], attribute, module)

    def _describe_graph_problem(self, error, files, seen):
        """Say why the migration graph could not be built, naming each migration that imports a missing module.

        ``seen`` maps each project migration's path to the text that the graph loaded from it.
        """
        problem = f"cannot resolve migration dependencies: {error}"
        missing = error.name if isinstance(error, ImportError) else None
        # Only a missing module stops the imports of the modules inside it.
        nested = isinstance(error, ModuleNotFoundError)
        if missing:
            importers = sorted(
                str(generated.path)
                for generated in files
                if _imports_module(seen.get(generated.path) or generated.text or "", missing, nested=nested)
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
                return self._keep_functions(generated, blocked)
            if blocked is None:
                update_changed_data = workflow["module"].changed_data_updater(
                    workflow["identities"], generated.path, stderr=self.stderr, dry_run=self.dry_run
                )

        # The refresh runs even when the workflow checks block the file, because the code that the file needs
        # changed by hand is the more useful report. An import that is still used also stops the graph.
        try:
            result = refresh_migration(generated.text, generated.kind, update_changed_data=update_changed_data)
        # A hand-edited migration can fail any step in its own way. Each one fails only its own file.
        except Exception as error:
            self.stderr.write(
                self.style.ERROR(f"  Could not update {generated.path}: {_sentence(error)} Leaving the file unchanged.")
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

    def _keep_functions(self, generated, reason):
        """Leave a migration that has to keep its functions as it is, apart from imports that stop migrate.

        ``reason`` says why the migration keeps its functions. An import of VUEDA code that no longer exists would
        still stop ``migrate``, so it goes when nothing in the migration needs it, and the file counts as updated.
        When something needs it, the file fails and needs a hand fix.
        """
        # A migration that imports a function that VUEDA copies runs today's version, which it cannot keep.
        imported = imports_of_copied_vueda_functions(generated.text, generated.kind)
        if imported:
            self._ask_for_copies(generated, reason, f"it imports {', '.join(imported)} instead of holding copies")
            return _FAILED
        try:
            fixed, removed = remove_imports_that_vueda_no_longer_has(generated.text)
        except Exception as error:
            # A hand-edited migration can fail in its own way. It fails only its own file.
            gone = imports_that_vueda_no_longer_has(generated.text)
            if gone:
                self._ask_for_copies(generated, reason, f"it imports {', '.join(gone)}, which VUEDA no longer has")
            else:
                self.stderr.write(
                    self.style.ERROR(
                        f"  Cannot update {generated.path}: {_sentence(error)} The command keeps its existing "
                        f"functions, because its {reason} Leaving the file unchanged."
                    )
                )
            return _FAILED
        if not removed:
            self.stdout.write(self.style.WARNING(f"Skipping: {generated.path}"))
            self.stdout.write(f"  Its {reason}")
            return _SKIPPED

        self.stdout.write(f"{'Would update' if self.dry_run else 'Updating'}: {generated.path}")
        self.stdout.write(f"  Its functions stay as they are, because its {reason}")
        for name in removed:
            self.stdout.write(f"  Removed the import of {name}, which VUEDA no longer has.")
        if not self.dry_run:
            try:
                _write_atomically(generated.path, fixed)
            except OSError as error:
                self.stderr.write(self.style.ERROR(f"  Could not write {generated.path}: {error}"))
                return _FAILED
        return _UPDATED

    def _ask_for_copies(self, generated, reason, problem):
        """Report that a migration that keeps its functions needs copies of them made by hand."""
        # Today's functions cannot run in a migration that has to keep its own, so the fix is by hand.
        self.stderr.write(
            self.style.ERROR(
                f"  Cannot update {generated.path}: It needs a change by hand: {problem}, and its {reason} Replace "
                "each such import with a copy of the function as it was when the migration was made, for example "
                "from version control, so that the migration holds everything that it runs. Leaving the file "
                "unchanged."
            )
        )

    def _workflow_blocker(self, generated, workflow):
        """Return why the migration graph stops a workflow migration from being refreshed, as a pair.

        The first value is the reason, or None when nothing stops the refresh. The second is True when the reason
        is one that skips the migration on purpose rather than failing it.
        """
        workflow_refresh = workflow["module"]
        if workflow["loader"] is None:
            return _sentence(workflow["loader_problem"]), False
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
    if not path.stat().st_mode & stat.S_IWUSR or not os.access(path, os.W_OK):
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


def _imports_module(text, module, *, nested=False):
    """Return whether the migration ``text`` imports ``module`` at its top level."""
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return False
    for node in tree.body:
        # A missing package stops every import of a module inside it, so with ``nested`` its submodules count too.
        if isinstance(node, ast.ImportFrom) and not node.level and _names_module(node.module, module, nested):
            return True
        if isinstance(node, ast.Import) and any(_names_module(alias.name, module, nested) for alias in node.names):
            return True
    return False


def _names_module(name, module, nested):
    return bool(name) and (name == module or (nested and name.startswith(f"{module}.")))


class _StrippedMigrationFinder(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Serve migrations from replacement text while the migration graph is built.

    ``stripped`` maps a migration's module name to its path and the text to load instead of the file.
    """

    def __init__(self, stripped):
        self.stripped = stripped

    def find_spec(self, fullname, path=None, target=None):
        if fullname not in self.stripped:
            return None
        return importlib.util.spec_from_loader(fullname, self, origin=str(self.stripped[fullname][0]))

    def exec_module(self, module):
        path, text = self.stripped[module.__name__]
        module.__file__ = str(path)
        # The stripped text keeps every import that the module needs while it loads, so an error here comes from an
        # import that stays, and it is the error that the graph reports.
        exec(compile(text, str(path), "exec"), module.__dict__)


def _sentence(error):
    """Return ``error``'s text as a sentence that ends with a full stop."""
    text = str(error).rstrip()
    return text if text.endswith((".", "!", "?")) else f"{text}."
