"""Management command for updating existing workflow migrations with current function implementations."""

import ast
import importlib
import os
import sys

from django.apps import apps as django_apps
from django.conf import settings
from django.core.management import BaseCommand
from django.db.migrations.loader import MIGRATIONS_MODULE_NAME

from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import get_import_line_range
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names
from vueda.workflow.management.commands.makeworkflowmigrations import MIGRATION_MODIFIED_COMMENT
from vueda.workflow.management.commands.makeworkflowmigrations import NEWLINE
from vueda.workflow.management.commands.makeworkflowmigrations import get_migration_imports
from vueda.workflow.management.commands.makeworkflowmigrations import get_migration_sources


_WORKFLOW_MIGRATION_COMMENT_MARKER = MIGRATION_MODIFIED_COMMENT.strip()
_IMPORT_INSTEAD_MARKER = "from vueda.workflow.management.commands.makeworkflowmigrations import"

# Old function names (without _through_imports) that must be renamed in the operations block.
OPERATION_FUNCTION_RENAMES = {
    "make_sure_permissions_exist": "make_sure_permissions_exist_through_imports",
    "forwards_migrate_workflow": "forwards_migrate_workflow_through_imports",
    "backwards_migrate_workflow": "backwards_migrate_workflow_through_imports",
}


class Command(BaseCommand):
    help = (
        "Scan all installed apps for workflow migrations created by makeworkflowmigrations and rewrite "
        "their import and function sections with the current implementations from makeworkflowmigrations.py. "
        "The history_change_reason, migration_app_label, and changed_data variables are preserved unchanged. "
        "The class Migration block is also preserved, with stale operation function names updated to their "
        "current _through_imports equivalents."
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

    def _get_migrations_path(self, app_config):
        app_label = app_config.label
        if app_label in settings.MIGRATION_MODULES:
            module_name = settings.MIGRATION_MODULES[app_label]
        else:
            module_name = f"{app_config.name}.{MIGRATIONS_MODULE_NAME}"

        if module_name is None:
            return None

        try:
            module = importlib.import_module(module_name)
        except ModuleNotFoundError:
            return None

        return module.__path__[0] if module.__path__ else None

    def _find_workflow_migration_files(self, selected_apps=()):
        result = []

        for app_config in django_apps.get_app_configs():
            app_label = app_config.label

            # If you specify apps, skip models not in your app.
            if selected_apps and app_label not in selected_apps:
                continue

            migrations_path = self._get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            for filename in sorted(os.listdir(migrations_path)):
                if not filename.endswith(".py") or filename == "__init__.py":
                    continue

                filepath = os.path.join(migrations_path, filename)
                with open(filepath, encoding="utf-8") as f:
                    for line_no, line in enumerate(f):
                        if line.startswith(_WORKFLOW_MIGRATION_COMMENT_MARKER):
                            result.append(filepath)
                            break
                        if line_no > 20:  # noqa: PLR2004
                            break

        return result

    @staticmethod
    def _is_import_instead(lines):
        for line_no, line in enumerate(lines):
            if _IMPORT_INSTEAD_MARKER in line:
                return True
            if line_no > 30:  # noqa: PLR2004
                break
        return False

    @staticmethod
    def _find_changed_data_end(lines, changed_data_index, class_migration_index):
        # Either we find the end of changed_data, or we get a syntax error when we call parse.
        segment = "".join(lines[changed_data_index:class_migration_index])
        tree = ast.parse(segment)
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "changed_data":
                        return changed_data_index + node.end_lineno - 1

    def _update_migration_file(self, filepath):
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()

        history_change_reason_index = changed_data_index = class_migration_index = None
        for i, line in enumerate(lines):
            if line.startswith("history_change_reason = ") and history_change_reason_index is None:
                history_change_reason_index = i
            elif line.startswith("changed_data = ") and changed_data_index is None:
                changed_data_index = i
            elif line.startswith("class Migration(migrations.Migration):") and class_migration_index is None:
                class_migration_index = i

        if None in (history_change_reason_index, changed_data_index, class_migration_index):
            self.stderr.write(self.style.ERROR(f"  Could not parse required sections in {filepath}, skipping."))
            return False

        # A migration must have at least one import, or it can't be a migration.
        try:
            import_start, import_end, direct_runpython_import = get_import_line_range(lines)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        import_instead = self._is_import_instead(lines)
        try:
            changed_data_end_index = self._find_changed_data_end(lines, changed_data_index, class_migration_index)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        # Every section below is replaced in `lines` itself via slice assignment, working from the
        # bottom of the file upward so the indices collected above stay valid for the next
        # replacement. Anything not explicitly replaced (history_change_reason, migration_app_label,
        # changed_data, hand-added code between sections, etc.) simply stays where it is and is
        # written back unchanged.

        # Preserve the class Migration block, updating any stale function names in operations.
        try:
            class_migration_lines = update_operation_function_names(
                "".join(lines[class_migration_index:]), OPERATION_FUNCTION_RENAMES
            ).splitlines(keepends=True)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False
        except NoRenamesError:
            # Nothing to change, but continue with the update.
            self.stdout.write(self.style.ERROR(f"  Nothing to rename found in {filepath}."))
            class_migration_lines = lines[class_migration_index:]
        lines[class_migration_index:] = class_migration_lines

        # Replace only the functions/enum we recognize, so any hand-added code between them
        # (e.g. a stray import) is preserved in place instead of being wiped out.
        existing_sources = "".join(lines[changed_data_end_index + 1 : class_migration_index])
        try:
            source_map = get_migration_sources(import_instead, as_mapping=True)
            fresh_sources = merge_migration_sources(existing_sources, source_map)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False
        lines[changed_data_end_index + 1 : class_migration_index] = fresh_sources.splitlines(keepends=True)

        # Update/insert only the imports we recognize, leaving any hand-added ones in place.
        existing_imports = "".join(lines[import_start : import_end + 1])
        import_map = get_migration_imports(import_instead, direct_runpython_import, as_mapping=True)
        fresh_imports = merge_migration_imports(existing_imports, import_map)
        lines[import_start : import_end + 1] = fresh_imports.splitlines(keepends=True)

        # Drop the stale modified-comment marker from the preamble (everything before the import
        # block) and add a fresh one right before the import block.
        filtered_preamble = [
            line for line in lines[:import_start] if not line.startswith(_WORKFLOW_MIGRATION_COMMENT_MARKER)
        ]
        lines[:import_start] = filtered_preamble + MIGRATION_MODIFIED_COMMENT.splitlines(keepends=True)

        if not self.dry_run:
            with open(filepath, "w", encoding="utf-8") as f:
                f.writelines(lines)

        return True

    def handle(self, *app_labels, **options):
        self.dry_run = options["dry_run"]

        # If you pass in a specific app, validate that it exists.
        app_labels = set(app_labels)
        has_bad_labels = False
        for app_label in app_labels:
            try:
                django_apps.get_app_config(app_label)
            except LookupError as err:
                self.stderr.write(str(err))
                has_bad_labels = True
        if has_bad_labels:
            sys.exit(2)

        migration_files = self._find_workflow_migration_files(app_labels)

        if not migration_files:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No workflow migrations found to update."))
            return

        failure_count = 0
        updated_count = 0
        for filepath in migration_files:
            verb = "Would update" if self.dry_run else "Updating"
            self.stdout.write(f"{verb}: {filepath}")
            if self._update_migration_file(filepath):
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
