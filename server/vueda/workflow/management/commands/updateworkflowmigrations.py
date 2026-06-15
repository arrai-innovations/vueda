"""Management command for updating existing workflow migrations with current function implementations."""

import importlib
import os
import re
import sys

from django.apps import apps as django_apps
from django.conf import settings
from django.core.management import BaseCommand
from django.db.migrations.loader import MIGRATIONS_MODULE_NAME

from vueda.workflow.management.commands.makeworkflowmigrations import MIGRATION_MODIFIED_COMMENT
from vueda.workflow.management.commands.makeworkflowmigrations import NEWLINE
from vueda.workflow.management.commands.makeworkflowmigrations import get_migration_imports
from vueda.workflow.management.commands.makeworkflowmigrations import get_migration_sources


_WORKFLOW_MIGRATION_COMMENT_MARKER = MIGRATION_MODIFIED_COMMENT.strip()
_IMPORT_INSTEAD_MARKER = "from vueda.workflow.management.commands.makeworkflowmigrations import"

# Old function names (without _through_imports) that must be renamed in the operations block.
_OPERATION_FUNCTION_RENAMES = [
    (re.compile(r"make_sure_permissions_exist(?!_through_imports)"), "make_sure_permissions_exist_through_imports"),
    (re.compile(r"forwards_migrate_workflow(?!_through_imports)"), "forwards_migrate_workflow_through_imports"),
    (re.compile(r"backwards_migrate_workflow(?!_through_imports)"), "backwards_migrate_workflow_through_imports"),
]


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
    def _update_operation_function_names(class_migration_block):
        for pattern, replacement in _OPERATION_FUNCTION_RENAMES:
            class_migration_block = pattern.sub(replacement, class_migration_block)
        return class_migration_block

    @staticmethod
    def _find_changed_data_end(lines, changed_data_index, class_migration_index):
        depth = 0
        for i in range(changed_data_index, class_migration_index):
            for char in lines[i]:
                if char == "[":
                    depth += 1
                elif char == "]":
                    depth -= 1
            if depth == 0 and i > changed_data_index:
                return i
        return changed_data_index

    def _update_migration_file(self, filepath):
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()

        generated_index = history_change_reason_index = changed_data_index = class_migration_index = None
        for i, line in enumerate(lines):
            if line.startswith("# Generated by Django") and generated_index is None:
                generated_index = i
            elif line.startswith("history_change_reason = ") and history_change_reason_index is None:
                history_change_reason_index = i
            elif line.startswith("changed_data = ") and changed_data_index is None:
                changed_data_index = i
            elif line.startswith("class Migration(migrations.Migration):") and class_migration_index is None:
                class_migration_index = i

        if None in (generated_index, history_change_reason_index, changed_data_index, class_migration_index):
            self.stdout.write(self.style.ERROR(f"  Could not parse required sections in {filepath}, skipping."))
            return False

        import_instead = self._is_import_instead(lines)
        changed_data_end_index = self._find_changed_data_end(lines, changed_data_index, class_migration_index)

        # Preamble: just the Django-generated comment line.
        preamble = "".join(lines[: generated_index + 1])

        # Fresh import block, followed by the one Django import we always need.
        fresh_imports = (
            "".join(get_migration_imports(import_instead)) + f"{NEWLINE}from django.db import migrations{NEWLINE}"
        )

        # Preserve: history_change_reason, migration_app_label, and changed_data = [...] block.
        data_block = "".join(lines[history_change_reason_index : changed_data_end_index + 1])

        # Fresh function sources (through_imports wrappers + helpers, or import-instead style).
        fresh_sources = "".join(get_migration_sources(import_instead))

        # Preserve the class Migration block, updating any stale function names in operations.
        class_migration_block = self._update_operation_function_names("".join(lines[class_migration_index:]))

        new_content = (
            preamble + fresh_imports + f"{NEWLINE}{NEWLINE}" + data_block + fresh_sources + class_migration_block
        )

        if not self.dry_run:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)

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

        updated_count = 0
        for filepath in migration_files:
            verb = "Would update" if self.dry_run else "Updating"
            self.stdout.write(f"{verb}: {filepath}")
            if self._update_migration_file(filepath):
                updated_count += 1

        verb = "Would update" if self.dry_run else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{NEWLINE}{verb} {updated_count} workflow migration(s).{NEWLINE}"))
