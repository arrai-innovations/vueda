"""Management command for syncing GroupChange records from group permission migrations."""

__all__ = ("Command",)

import importlib.util
from pathlib import Path

from django.apps import apps as django_apps
from django.core.management import BaseCommand

from vueda.user.management.commands.utils import create_group_change
from vueda.user.management.commands.utils import get_matching_record
from vueda.user.migration_generation.existing import is_generated_migration
from vueda.user.migration_generation.group_operations import MIGRATION_MODIFIED_COMMENTS


class Command(BaseCommand):
    help = "Sync GroupChange records from the group migrations that makevuedamigrations or makegroupmigrations wrote."

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
                if is_generated_migration(migration_file, MIGRATION_MODIFIED_COMMENTS):
                    yield migration_file

    @staticmethod
    def _load_migration_module(migration_file):
        spec = importlib.util.spec_from_file_location("migration", migration_file)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
