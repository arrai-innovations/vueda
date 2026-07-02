"""Management command for syncing GroupChange records from group permission migrations."""

__all__ = ("Command",)

import importlib.util
from pathlib import Path

from django.apps import apps as django_apps
from django.core.management import BaseCommand

from vueda.user.management.commands.makegroupmigrations import MIGRATION_MODIFIED_COMMENT
from vueda.user.management.commands.utils import create_group_change
from vueda.user.management.commands.utils import get_matching_record


class Command(BaseCommand):
    help = "Sync GroupChange records from migrations created by makegroupmigrations."

    def handle(self, **options):
        from vueda.user.models import GroupChange

        created = 0
        for migration_file in self._find_group_migrations():
            module = self._load_migration_module(migration_file)
            for change in module.changed_data:
                if not get_matching_record(change, GroupChange):
                    create_group_change(change, GroupChange)
                    created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} GroupChange record(s)."))

    def _find_group_migrations(self):
        for app_config in django_apps.get_app_configs():
            if "site-packages" in Path(app_config.path).parts:
                continue
            migrations_path = Path(app_config.path) / "migrations"
            if not migrations_path.exists():
                continue
            for migration_file in sorted(migrations_path.glob("*.py")):
                if migration_file.name == "__init__.py":
                    continue
                with open(migration_file, encoding="utf-8") as f:
                    for line_no, line in enumerate(f):
                        if line_no > 20:  # noqa: PLR2004
                            break
                        if line.startswith(MIGRATION_MODIFIED_COMMENT.strip()):
                            yield migration_file
                            break

    @staticmethod
    def _load_migration_module(migration_file):
        spec = importlib.util.spec_from_file_location("migration", migration_file)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
