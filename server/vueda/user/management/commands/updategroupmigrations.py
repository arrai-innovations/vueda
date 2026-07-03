"""Management command for updating existing group migrations with current function implementations."""

import ast
import importlib
import os
import sys

from django.apps import apps as django_apps
from django.conf import settings
from django.core.management import BaseCommand
from django.db.migrations.loader import MIGRATIONS_MODULE_NAME

from vueda.user.management.commands.makegroupmigrations import MIGRATION_MODIFIED_COMMENT
from vueda.user.management.commands.makegroupmigrations import NEWLINE
from vueda.user.management.commands.makegroupmigrations import get_group_migration_imports
from vueda.user.management.commands.makegroupmigrations import get_group_migration_sources


class NoRenamesError(Exception):
    pass


_GROUP_MIGRATION_COMMENT_MARKER = MIGRATION_MODIFIED_COMMENT.strip()
_IMPORT_INSTEAD_MARKER = "from vueda.user.management.commands.makegroupmigrations import make_sure_permissions_exist"

# Old function names (without _through_imports) that must be renamed in the operations block.
_OPERATION_FUNCTION_RENAMES = {
    "forwards_migrate_groups": "forwards_migrate_groups_through_imports",
    "backwards_migrate_groups": "backwards_migrate_groups_through_imports",
}


class Command(BaseCommand):
    help = (
        "Scan all installed apps for group migrations created by makegroupmigrations and rewrite "
        "their import and function sections with the current implementations from makegroupmigrations.py. "
        "The changed_data variable and the class Migration block are preserved unchanged."
    )

    def add_arguments(self, parser):
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

    def _find_group_migration_files(self):
        result = []

        for app_config in django_apps.get_app_configs():
            migrations_path = self._get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            for filename in sorted(os.listdir(migrations_path)):
                if not filename.endswith(".py") or filename == "__init__.py":
                    continue

                filepath = os.path.join(migrations_path, filename)
                with open(filepath, encoding="utf-8") as f:
                    for line_no, line in enumerate(f):
                        if line.startswith(_GROUP_MIGRATION_COMMENT_MARKER):
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
        try:
            tree = ast.parse(class_migration_block)
        except SyntaxError:
            return class_migration_block

        # Collect (lineno, col_offset, old_name) for Name nodes inside RunPython calls only,
        # so string literals in dependencies are never touched.
        renames = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            if not (isinstance(func, ast.Attribute) and func.attr == "RunPython"):
                continue
            for arg in node.args:
                if isinstance(arg, ast.Name) and arg.id in _OPERATION_FUNCTION_RENAMES:
                    renames.append((arg.lineno, arg.col_offset, arg.id))
            for kw in node.keywords:
                if (
                    kw.arg in ("code", "reverse_code")
                    and isinstance(kw.value, ast.Name)
                    and kw.value.id in _OPERATION_FUNCTION_RENAMES
                ):
                    renames.append((kw.value.lineno, kw.value.col_offset, kw.value.id))

        if not renames:
            raise NoRenamesError()

        lines = class_migration_block.splitlines(keepends=True)
        for lineno, col_offset, old_name in sorted(renames, reverse=True):
            new_name = _OPERATION_FUNCTION_RENAMES[old_name]
            line = lines[lineno - 1]
            lines[lineno - 1] = line[:col_offset] + new_name + line[col_offset + len(old_name) :]
        return "".join(lines)

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

        generated_index = changed_data_index = class_migration_index = None
        for i, line in enumerate(lines):
            if line.startswith("# Generated by Django") and generated_index is None:
                generated_index = i
            elif line.startswith("changed_data = ") and changed_data_index is None:
                changed_data_index = i
            elif line.startswith("class Migration(migrations.Migration):") and class_migration_index is None:
                class_migration_index = i

        if None in (generated_index, changed_data_index, class_migration_index):
            self.stderr.write(self.style.ERROR(f"  Could not parse required sections in {filepath}, skipping."))
            return False

        import_instead = self._is_import_instead(lines)
        try:
            changed_data_end_index = self._find_changed_data_end(lines, changed_data_index, class_migration_index)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        # Preamble: everything up to and including the Django-generated comment line.
        preamble = "".join(lines[: generated_index + 1])

        # Fresh import block, followed by the one Django import we always need.
        fresh_imports = (
            "".join(get_group_migration_imports(import_instead)) + f"{NEWLINE}from django.db import migrations{NEWLINE}"
        )

        # Preserve the changed_data = [...] block exactly as written.
        changed_data_block = "".join(lines[changed_data_index : changed_data_end_index + 1])

        # Fresh function sources (or the import-instead assignment).
        fresh_sources = "".join(get_group_migration_sources(import_instead))

        # Preserve the class Migration block, updating any stale function names in operations.
        class_migration_block = "".join(lines[class_migration_index:])
        try:
            class_migration_block = self._update_operation_function_names("".join(lines[class_migration_index:]))
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False
        except NoRenamesError:
            # Write this, but continue with the update.
            self.stdout.write(self.style.ERROR(f"  Nothing to rename found in {filepath}."))

        new_content = (
            preamble
            + fresh_imports
            + f"{NEWLINE}{NEWLINE}"
            + changed_data_block
            + fresh_sources
            + class_migration_block
        )

        if not self.dry_run:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)

        return True

    def handle(self, **options):
        self.dry_run = options["dry_run"]

        migration_files = self._find_group_migration_files()

        if not migration_files:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No group migrations found to update."))
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
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}{verb} {updated_count} group migration(s).{NEWLINE}"))

        if failure_count:
            verb = "Would have failed updating" if self.dry_run else "Failed updating"
            self.stdout.write(self.style.ERROR(f"{NEWLINE}{verb} {failure_count} group migration(s).{NEWLINE}"))
            sys.exit(1)
