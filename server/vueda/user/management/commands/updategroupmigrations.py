"""Management command for updating existing group migrations with current function implementations."""

import os
import sys

from django.apps import apps as django_apps
from django.core.management import BaseCommand

from vueda.user.management.commands.makegroupmigrations import MIGRATION_MODIFIED_COMMENT
from vueda.user.management.commands.makegroupmigrations import NEWLINE
from vueda.user.management.commands.makegroupmigrations import get_group_migration_imports
from vueda.user.management.commands.makegroupmigrations import get_group_migration_sources
from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.management.commands.utils import has_direct_runpython_import
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names


GROUP_MIGRATION_COMMENT_MARKER = MIGRATION_MODIFIED_COMMENT.strip()
IMPORT_INSTEAD_MARKER = "from vueda.user.management.commands.makegroupmigrations import make_sure_permissions_exist"

# Old function names (without _through_imports) that must be renamed in the operations block.
OPERATION_FUNCTION_RENAMES = {
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

    def _find_group_migration_files(self):
        result = []

        for app_config in django_apps.get_app_configs():
            migrations_path = get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            for filename in sorted(os.listdir(migrations_path)):
                if not filename.endswith(".py") or filename == "__init__.py":
                    continue

                filepath = os.path.join(migrations_path, filename)
                with open(filepath, encoding="utf-8") as f:
                    for line_no, line in enumerate(f):
                        if line.startswith(GROUP_MIGRATION_COMMENT_MARKER):
                            result.append(filepath)
                            break
                        if line_no > 20:  # noqa: PLR2004
                            break

        return result

    @staticmethod
    def _is_import_instead(lines):
        for line_no, line in enumerate(lines):
            if IMPORT_INSTEAD_MARKER in line:
                return True
            if line_no > 30:  # noqa: PLR2004
                break
        return False

    def _update_migration_file(self, filepath):
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()

        changed_data_exists = False
        for line in lines:
            if line.startswith("changed_data = "):
                changed_data_exists = True
                break

        if not changed_data_exists:
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
            source_map = get_group_migration_sources(import_instead, as_mapping=True)
            lines_string = merge_migration_sources(lines_string, source_map)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        # Update/insert only the imports we recognize, leaving any hand-added ones in place.
        import_map = get_group_migration_imports(import_instead, direct_runpython_import, as_mapping=True)
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
