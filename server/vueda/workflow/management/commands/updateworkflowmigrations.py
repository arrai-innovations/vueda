"""Management command for updating existing workflow migrations with current function implementations."""

import ast
import importlib.util
import os
import sys

from django.apps import apps as django_apps
from django.core.management import BaseCommand
from django.db.migrations.loader import MigrationLoader

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import format_changed_data
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.management.commands.utils import has_direct_runpython_import
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names
from vueda.user.migration_generation.dependencies import is_installed_package_path
from vueda.user.migration_generation.existing import is_generated_migration
from vueda.workflow.migration_generation.operations import MIGRATION_MODIFIED_COMMENTS
from vueda.workflow.migration_generation.operations import get_migration_imports
from vueda.workflow.migration_generation.operations import get_migration_sources
from vueda.workflow.migration_generation.refresh import add_workflow_identities_to_changed_data
from vueda.workflow.migration_generation.refresh import collect_workflow_identities
from vueda.workflow.migration_generation.refresh import describe_unreadable_changes
from vueda.workflow.migration_generation.refresh import has_naive_history_dates


IMPORT_INSTEAD_MARKER = "from vueda.workflow.migration_generation.operations import"

# The copied functions read ObjectStateEvent and write through the workflow event triggers.
# Keep this requirement in step with the schema used by get_migration_sources.
REQUIRED_WORKFLOW_MIGRATION = (
    "vueda_workflow",
    "0008_initialstateevent_objectstateevent_stateevent_and_more",
)

# Old function names (without _through_imports) that must be renamed in the operations block.
OPERATION_FUNCTION_RENAMES = {
    "make_sure_permissions_exist": "make_sure_permissions_exist_through_imports",
    "forwards_migrate_workflow": "forwards_migrate_workflow_through_imports",
    "backwards_migrate_workflow": "backwards_migrate_workflow_through_imports",
}


class Command(BaseCommand):
    help = (
        "Scan the named apps, or every app when none is named, for workflow migrations created by "
        "makevuedamigrations or makeworkflowmigrations and rewrite their import and function sections with the "
        "current implementations from vueda/workflow/migration_generation/operations.py. Apps installed as "
        "packages are never updated, though their migrations "
        "are read for the workflows they record and for dependency checks. "
        "The history_change_reason and migration_app_label variables are preserved unchanged, and changed_data "
        "keeps every change it records, gaining only the app and model naming each workflow it refers to by code. "
        "The class Migration block is also preserved, with stale operation function names updated to their "
        "current _through_imports equivalents. Migrations whose dependencies do not include the required "
        "workflow schema are left unchanged and reported as failures."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "args",
            metavar="app_label",
            nargs="*",
            help="Specify the app label(s) to update workflow migrations for.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show which migrations would be updated without writing any changes.",
        )

    def _find_workflow_migration_files(self, selected_apps=()):
        """Return every generated workflow migration, with its migration key and whether this run may rewrite it.

        Every app is scanned, not only the ones this run rewrites, because a migration that must not be
        rewritten can still be the only record of which workflow a code meant, and the references in a
        rewritten migration are resolved from that record.
        """
        result = {}

        for app_config in django_apps.get_app_configs():
            app_label = app_config.label

            migrations_path = get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            # Only the project's own apps are rewritten, and only the named ones when apps are named.
            # A named package app is rejected in handle().
            writable = not is_installed_package_path(migrations_path) and (
                not selected_apps or app_label in selected_apps
            )

            for filename in sorted(os.listdir(migrations_path)):
                if not filename.endswith(".py") or filename == "__init__.py":
                    continue

                filepath = os.path.join(migrations_path, filename)
                if is_generated_migration(filepath, MIGRATION_MODIFIED_COMMENTS):
                    result[filepath] = ((app_label, filename.removesuffix(".py")), writable)

        return result

    def _load_changed_data(self, filepath, *, writable=True):
        """Return the changes a migration records, or ``None`` when they cannot be read.

        The file is read as the module it is, rather than parsed, because a change records real
        datetimes and a literal parser cannot build those. Changes that import but lack what the
        command reads from them are reported the same way, so the file is skipped rather than
        ending the run.

        A migration this run does not rewrite is read only for the workflows it records, so a fault
        in it is a warning rather than a failure: the workflows it records are left out, and
        references are resolved from the history that remains.
        """
        try:
            spec = importlib.util.spec_from_file_location("workflow_migration_being_updated", filepath)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            changed_data = module.changed_data
        except Exception as error:
            problem = str(error)
        else:
            problem = describe_unreadable_changes(changed_data)

        if problem is None:
            return changed_data

        if writable:
            self.stderr.write(self.style.ERROR(f"  Could not read changed_data in {filepath}: {problem}"))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"  Could not read changed_data in {filepath}: {problem}. "
                    "The workflows it records are not used to name references."
                )
            )

    def _replace_changed_data(self, lines_string, changed_data, filepath):
        """Write the changes back in the form makevuedamigrations writes them."""
        tree = ast.parse(lines_string)

        for node in tree.body:
            if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "changed_data":
                break
        else:
            return lines_string

        lines = lines_string.splitlines(keepends=True)
        lines[node.lineno - 1 : node.end_lineno] = [
            format_changed_data(changed_data, filepath, stderr=self.stderr, dry_run=self.dry_run)
        ]

        return "".join(lines)

    @staticmethod
    def _is_import_instead(lines):
        for line_no, line in enumerate(lines):
            if IMPORT_INSTEAD_MARKER in line:
                return True
            if line_no > 30:  # noqa: PLR2004
                break
        return False

    def _can_rewrite(self, filepath, migration_key):
        """Require the workflow schema through the graph, including indirect dependencies."""
        try:
            if self._migration_loader is None:
                # Use the declared graph, not the migrations applied to this database. A rewrite
                # must also work when a new installation starts with an empty database.
                self._migration_loader = MigrationLoader(None)
            loader = self._migration_loader
            ancestors = set(loader.graph.forwards_plan(migration_key)) - {migration_key}
        except Exception as error:
            self.stderr.write(
                self.style.ERROR(f"  Cannot resolve migration dependencies for {filepath}: {error}, skipping.")
            )
            return False

        required = REQUIRED_WORKFLOW_MIGRATION
        if required in ancestors or any(required in loader.disk_migrations[key].replaces for key in ancestors):
            return True

        self.stderr.write(
            self.style.ERROR(
                f"  Cannot update {filepath}: its dependencies do not include {required[0]}.{required[1]}, "
                "which the current workflow functions require. Leaving the file unchanged. "
                "Keep its existing functions; review the migration graph before changing dependencies."
            )
        )
        return False

    def _update_migration_file(self, filepath, changed_data, identities, migration_key):
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()

        history_change_reason_exists = changed_data_exists = False
        for line in lines:
            if line.startswith("history_change_reason = "):
                history_change_reason_exists = True
            elif line.startswith("changed_data = "):
                changed_data_exists = True
        if not (history_change_reason_exists and changed_data_exists):
            self.stderr.write(self.style.ERROR(f"  Could not parse required sections in {filepath}, skipping."))
            return False

        # A migration must be valid Python, or it can't be a migration.
        try:
            direct_runpython_import = has_direct_runpython_import(lines)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        import_instead = self._is_import_instead(lines)
        lines_string = "".join(lines)

        # A change written before a workflow reference carried the app and model names its workflow
        # by code alone, which cannot say which workflow it means once another model has taken that
        # code over. What each code meant when a change was recorded is answerable from the changes
        # themselves, because the workflow's own change records both.
        if changed_data is None:
            # The file parses, or it would have been skipped above, so its changes could not be
            # read for some other reason. Rewriting it anyway would report success while leaving
            # its references naming their workflows by code alone.
            self.stderr.write(self.style.ERROR(f"  Cannot update {filepath} without its changed_data, skipping."))
            return False

        if not self._can_rewrite(filepath, migration_key):
            return False

        # Writing the changes back reformats the whole list, so it is only written when a reference
        # gained something. A migration that already names every workflow it can keeps its list
        # exactly as it was, comments and formatting included.
        updated_changed_data = add_workflow_identities_to_changed_data(changed_data, identities)
        try:
            if updated_changed_data != changed_data:
                lines_string = self._replace_changed_data(lines_string, updated_changed_data, filepath)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        # Preserve the class Migration block, updating any stale function names in operations.
        try:
            lines_string = update_operation_function_names(lines_string, OPERATION_FUNCTION_RENAMES)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False
        except NoRenamesError:
            # Nothing to change, but continue with the update.
            self.stdout.write(self.style.ERROR(f"  Nothing to rename found in {filepath}."))

        # Replace only the functions/enum we recognize, so any hand-added code between them
        # (e.g. a stray import) is preserved in place instead of being wiped out.
        try:
            source_map = get_migration_sources(import_instead, as_mapping=True)
            lines_string = merge_migration_sources(lines_string, source_map)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        # Update/insert only the imports we recognize, leaving any hand-added ones in place.
        import_map = get_migration_imports(import_instead, direct_runpython_import, as_mapping=True)
        try:
            lines_string = merge_migration_imports(lines_string, import_map)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        if not self.dry_run:
            with open(filepath, "w", encoding="utf-8") as f:
                f.writelines(lines_string.splitlines(keepends=True))

        return True

    def handle(self, *app_labels, **options):
        self.dry_run = options["dry_run"]
        self._migration_loader = None

        # If you pass in a specific app, validate that it exists.
        app_labels = set(app_labels)
        has_bad_labels = False
        for app_label in app_labels:
            try:
                app_config = django_apps.get_app_config(app_label)
            except LookupError as err:
                self.stderr.write(str(err))
                has_bad_labels = True
                continue

            migrations_path = get_migrations_path(app_config)
            if migrations_path is not None and is_installed_package_path(migrations_path):
                self.stderr.write(
                    f"App '{app_label}' is part of an installed package at {migrations_path}. "
                    "updateworkflowmigrations will not update installed packages."
                )
                has_bad_labels = True
        if has_bad_labels:
            sys.exit(2)

        migration_files = self._find_workflow_migration_files(app_labels)
        writable_files = [filepath for filepath, (_, writable) in migration_files.items() if writable]

        if not writable_files:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No workflow migrations found to update."))
            return

        # Every generated migration is read before any is written, including those this run does
        # not rewrite, because what a workflow code meant at one moment can be recorded in a
        # different migration than the change naming it, even one in an installed package.
        changed_data_by_file = {}
        for filepath, (_, writable) in migration_files.items():
            changed_data = self._load_changed_data(filepath, writable=writable)
            if changed_data is not None:
                if writable and has_naive_history_dates(changed_data):
                    self.stdout.write(
                        self.style.WARNING(f"  Naive dates found in changed_data in {filepath}. Treating as UTC.")
                    )

                changed_data_by_file[filepath] = changed_data

        identities = collect_workflow_identities(changed_data_by_file.values())

        failure_count = 0
        updated_count = 0
        for filepath in writable_files:
            verb = "Would update" if self.dry_run else "Updating"
            self.stdout.write(f"{verb}: {filepath}")
            # Each file is rewritten from its own changes, but the workflows its references name are
            # looked up in identities, which every generated migration read above contributed to.
            migration_key, _ = migration_files[filepath]
            if self._update_migration_file(filepath, changed_data_by_file.get(filepath), identities, migration_key):
                updated_count += 1
            else:
                # Something went wrong, stderr will have printed what.
                failure_count += 1

        if updated_count:
            verb = "Would update" if self.dry_run else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}{verb} {updated_count} workflow migration(s).{NEWLINE}"))

        if failure_count:
            verb = "Would have failed updating" if self.dry_run else "Failed updating"
            self.stdout.write(self.style.ERROR(f"{NEWLINE}{verb} {failure_count} workflow migration(s).{NEWLINE}"))
            sys.exit(1)
