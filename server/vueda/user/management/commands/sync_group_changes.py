"""Management command for syncing GroupChange records from group permission migrations."""

__all__ = ("Command",)

from pathlib import Path

from django.apps import apps as django_apps
from django.core.management import BaseCommand

from vueda.user.management.commands.utils import create_group_change
from vueda.user.management.commands.utils import get_matching_record
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.migration_generation.dependencies import is_installed_package_app
from vueda.user.migration_generation.existing import generated_migrations
from vueda.user.migration_generation.existing import is_generated_migration
from vueda.user.migration_generation.group_operations import MIGRATION_MODIFIED_COMMENTS


class Command(BaseCommand):
    help = "Sync GroupChange records from the group migrations that makevuedamigrations or makegroupmigrations wrote."

    def handle(self, **options):
        from vueda.user.models import GroupChange

        created = 0
        for app_label in self._apps_with_group_migrations():
            for migration in generated_migrations(app_label, MIGRATION_MODIFIED_COMMENTS):
                for change in migration.changed_data:
                    if not get_matching_record(change, GroupChange):
                        create_group_change(change, GroupChange)
                        created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} GroupChange record(s)."))

    @staticmethod
    def _apps_with_group_migrations():
        """Yield the label of each app whose migrations directory holds a group migration.

        The directory is the one that ``MIGRATION_MODULES`` names, where ``makevuedamigrations`` writes. A quick scan
        of the files comes first, because ``generated_migrations`` loads the whole migration graph for each app.
        """
        for app_config in django_apps.get_app_configs():
            if is_installed_package_app(app_config.label):
                continue
            migrations_path = get_migrations_path(app_config)
            if migrations_path is None:
                continue
            if any(
                is_generated_migration(path, MIGRATION_MODIFIED_COMMENTS)
                for path in Path(migrations_path).glob("*.py")
                if path.name != "__init__.py"
            ):
                yield app_config.label
