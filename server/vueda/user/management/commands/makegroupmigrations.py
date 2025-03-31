import contextlib
import copy
import datetime
import enum
import importlib
import inspect
import io
import os
from pathlib import Path
from pprint import pformat

from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.auth import models as auth_models
from django.contrib.auth.management import create_permissions
from django.core.management import BaseCommand
from django.core.management import call_command
from django.db import migrations
from django.db.transaction import atomic

from vueda.user import models as vueda_models


NEWLINE = os.linesep


# Add a comment right after the Django generated comment, to help find our created migrations.
# This way we can find the last one we did, parse the generated date from the Django comment,
# and look at history to determine what changed in the workflow since the migration was created.
MIGRATION_MODIFIED_COMMENT = (
    f"# Modified using VUEDA makegroupmigrations command.  Please do not delete this comment.{NEWLINE}"
)

# We don't run the functions that get copied into migrations, but, so flake8 doesn't complain, define a variable here.
# This is less work than finding all the places that use it and adding noqa comments.
changed_data = ()


#############################################################################
# Functions and variables we use when rewriting the empty migration we created.
# We write the source code using inspect.get_source(...) into the migration.
#############################################################################
class GroupChangeTypes(enum.Enum):
    ADDED = "added"
    ASSOCIATED = "associated"
    CHANGED = "changed"
    UNASSOCIATED = "unassociated"
    DELETED = "deleted"


def migrate_step(
    groups,
    permissions,
    group_name,
    group_name_old,
    change_type,
    historical_permission_codename,
    historical_permission_content_type_app_label,
    historical_permission_content_type_model_name,
    historical_permission_name,
):
    group = groups.objects.filter(name=group_name).first()
    group_old = groups.objects.filter(name=group_name_old).first() if group_name_old else None
    permission = permissions.objects.filter(
        codename=historical_permission_codename,
        content_type__app_label=historical_permission_content_type_app_label,
        content_type__model=historical_permission_content_type_model_name,
    ).first()

    # Assume that migrations have been created that create/rename/delete groups and associate/unassociate
    # permissions, so we don't miss doing a step, and leave things incorrect on the machine we're migrating.
    match change_type:
        case GroupChangeTypes.ADDED.value | GroupChangeTypes.ASSOCIATED.value | GroupChangeTypes.CHANGED.value:
            if change_type == GroupChangeTypes.CHANGED.value:
                if group is None and group_old is not None:
                    group_old.name = group_name
                    group_old.save()
                    group = group_old

            elif group is None:
                group = groups.objects.create(name=group_name)

            if permission is None:
                # Hopefully this doesn't happen, but if it does, we should add the permission.
                permission = permissions.objects.create(
                    codename=historical_permission_codename,
                    content_type__app_label=historical_permission_content_type_app_label,
                    content_type__model=historical_permission_content_type_model_name,
                    name=historical_permission_name,
                )

            permission.group_set.add(group)

        case GroupChangeTypes.UNASSOCIATED.value | GroupChangeTypes.DELETED.value:
            if permission is not None and group is not None:
                permission.group_set.remove(group)

            if change_type == GroupChangeTypes.DELETED.value and not group.permissions.exists():
                group.delete()


def forwards_migrate_groups(apps, schema_editor):
    # Copied, so tests can migrate forwards and then backwards.
    for changed_item in copy.deepcopy(changed_data):
        group_name = changed_item["group_name"]
        group_name_old = changed_item["group_name_old"]
        change_type = changed_item["change_type"]
        historical_permission_codename = changed_item["historical_permission_codename"]
        historical_permission_content_type_app_label = changed_item["historical_permission_content_type_app_label"]
        historical_permission_content_type_model_name = changed_item["historical_permission_content_type_model_name"]
        historical_permission_name = changed_item["historical_permission_name"]

        groups = apps.get_model("auth", "Group")
        permissions = apps.get_model("auth", "Permission")

        migrate_step(
            groups,
            permissions,
            group_name,
            group_name_old,
            change_type,
            historical_permission_codename,
            historical_permission_content_type_app_label,
            historical_permission_content_type_model_name,
            historical_permission_name,
        )


def backwards_migrate_groups(apps, schema_editor):
    # Copied and reversed, so tests can migrate backwards and then forwards.
    for changed_item in reversed(copy.deepcopy(changed_data)):
        group_name = changed_item["group_name"]
        group_name_old = changed_item["group_name_old"]
        change_type = changed_item["change_type"]
        historical_permission_codename = changed_item["historical_permission_codename"]
        historical_permission_content_type_app_label = changed_item["historical_permission_content_type_app_label"]
        historical_permission_content_type_model_name = changed_item["historical_permission_content_type_model_name"]
        historical_permission_name = changed_item["historical_permission_name"]

        groups = apps.get_model("auth", "Group")
        permissions = apps.get_model("auth", "Permission")

        # Reverse everything
        match change_type:
            case GroupChangeTypes.ADDED.value:
                change_type = GroupChangeTypes.DELETED.value
            case GroupChangeTypes.ASSOCIATED.value:
                change_type = GroupChangeTypes.UNASSOCIATED.value
            case GroupChangeTypes.CHANGED.value:
                old_group_name = group_name_old
                group_name_old = group_name
                group_name = old_group_name
            case GroupChangeTypes.UNASSOCIATED.value:
                change_type = GroupChangeTypes.ASSOCIATED.value
            case GroupChangeTypes.DELETED.value:
                change_type = GroupChangeTypes.ADDED.value

        migrate_step(
            groups,
            permissions,
            group_name,
            group_name_old,
            change_type,
            historical_permission_codename,
            historical_permission_content_type_app_label,
            historical_permission_content_type_model_name,
            historical_permission_name,
        )


def make_sure_permissions_exist(apps, schema_editor):
    # We need to make sure all permissions exist, since the permissions could be for any app.
    for app in django_apps.get_app_configs():
        create_permissions(app, interactive=False)


class Command(BaseCommand):
    help = (
        "In the appropriate app, two files will get created. "
        "`sql/view-view_name-0000.sql` - contains the SQL for the view. "
        "`migrations/0000_view_name.py` - a migration that reads the appropriate files in the sql folder. "
        "If the `migrations` and `sql` folder do not exist, they will be created, along with the apps initial "
        "migration, and an empty migration for the view."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "args",
            metavar="app_label",
            nargs="*",
            help="Specify the app label(s) to create the group migrations for.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Just show what migrations would be made; don't actually write them.",
        )

    def _call_command(self, *args):
        err = io.StringIO()
        out = io.StringIO()

        if self.dry_run and args[0] == "makemigrations":
            args = args + ("--dry-run",)

        # If we don't do this, sometimes we can't import a newly created migration.
        # Do it here, so we don't need to know which calls require it, and which don't.
        importlib.invalidate_caches()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            call_command(*args)

        # Did an error occur?
        if err.tell():
            err.seek(0)
            self.stdout.write(self.style.ERROR(err.read()))
            return False

        # Return the results.
        out.seek(0)
        return out.readlines()

    @staticmethod
    def _parse_migrations_from_show_migrations(lines):
        migrations = []

        for line in lines:
            line = line.strip()
            if line.startswith("["):
                line = line.replace("[ ]", "").replace("[X]", "").strip()
                migrations.append(line)

        return migrations

    @staticmethod
    def _parse_date_from_django_comment(django_comment):
        # Generated by Django 5.0.3 on 2024-03-26 19:08
        date_string = django_comment.split(" on ")[-1].strip()
        # The date in the migration is in UTC.  Make sure it acquires the UTC timezone.
        created_date = datetime.datetime.strptime(f"{date_string}:00 +0000", "%Y-%m-%d %H:%M:%S %z")
        return created_date.astimezone()

    def _get_generated_date_for_vueda_generated_migration(self, app_name, migration_name):
        # Return the date created in the django comment.
        django_comment = None

        with open(os.path.join(*app_name.split("."), "migrations", f"{migration_name}.py"), "r", encoding="utf-8") as f:
            is_modified_by_us = False
            # Did we modify this migration?  Check the first 20 lines for our modified comment.
            for migration_line_no, migration_line in enumerate(f.readlines()):
                if migration_line.startswith("# Generated by Django"):
                    django_comment = migration_line

                if migration_line == MIGRATION_MODIFIED_COMMENT:
                    is_modified_by_us = True

                if migration_line_no > 20:
                    break

        if is_modified_by_us:
            return self._parse_date_from_django_comment(django_comment)

        return False

    def _create_and_get_empty_migration(self, app_name):
        self.stdout.write(f"{NEWLINE}Creating empty migration for group permission changes.")

        # Force the migration to have a RunPython operations that we can easily find/replace.
        migrations.Migration.operations = [
            migrations.RunPython(
                code=dict,
                reverse_code=type,
            ),
            migrations.RunPython(
                code=str,
                reverse_code=int,
            ),
        ]

        date_string = datetime.datetime.now().date().isoformat().replace("-", "_")
        results = self._call_command(
            "makemigrations", app_name, "--empty", f"--name=group_permission_migrations_{date_string}", "--noinput"
        )
        migrations.Migration.operations = []  # Reset the operations in the class.

        if not results:  # Erred.
            return False

        return_value = None
        for result in results:
            self.stdout.write(result)

            result = result.strip()
            if result.endswith(".py"):
                return_value = Path(result).name

        return return_value

    def _rewrite_migration(self, migration_file, changes, migration_name, auth_migration_name):
        with open(migration_file, "r+", encoding="utf-8") as f:
            generated_index = class_index = dependencies_index = p_forwards_index = p_reverse_index = forwards_index = (
                reverse_index
            ) = 0

            lines = f.readlines()
            for line_no, line in enumerate(lines):
                if line.find("Generated by Django") != -1:
                    # Should be the first line, but we shouldn't assume that.
                    generated_index = line_no

                elif line.startswith("class Migration"):
                    class_index = line_no

                elif line.find("dependencies = [") != -1:
                    dependencies_index = line_no

                # Separate tests, so code=dict and reverse_code=type are fine if they are on the same line.
                if line.find("code=dict") != -1:
                    p_forwards_index = line_no

                if line.find("reverse_code=type") != -1:
                    p_reverse_index = line_no

                # Separate tests, so code=str and reverse_code=str are fine if they are on the same line.
                if line.find("code=str") != -1:
                    forwards_index = line_no

                if line.find("reverse_code=int") != -1:
                    reverse_index = line_no

            # We write lines starting from the bottom to the top, so our line numbers are correct through the process.
            lines[reverse_index] = lines[reverse_index].replace("int", "backwards_migrate_groups")
            lines[forwards_index] = lines[forwards_index].replace("str", "forwards_migrate_groups")
            lines[p_reverse_index] = lines[p_reverse_index].replace("type", "migrations.RunPython.noop")
            lines[p_forwards_index] = lines[p_forwards_index].replace("dict", "make_sure_permissions_exist")

            backwards = inspect.getsource(backwards_migrate_groups)
            forwards = inspect.getsource(forwards_migrate_groups)
            group_change_types = inspect.getsource(GroupChangeTypes)
            perms_exist = inspect.getsource(make_sure_permissions_exist)
            step = inspect.getsource(migrate_step)

            # Add Dependencies
            lines[dependencies_index + 1 : dependencies_index + 1] = [
                f"        migrations.swappable_dependency(settings.AUTH_USER_MODEL),{NEWLINE}",
                f'        ("auth", "{auth_migration_name}"),{NEWLINE}',
            ]

            # Changed data and forwards/reverse functions.
            lines[class_index - 1 : class_index] = [
                # Pretty Print is not formatted as nice as black.  At least a small width is better than nothing.
                f"{NEWLINE}changed_data = {pformat(changes)}{NEWLINE}",
                f"{NEWLINE}{NEWLINE}{group_change_types}",
                f"{NEWLINE}{NEWLINE}{step}",
                f"{NEWLINE}{NEWLINE}{forwards}",
                f"{NEWLINE}{NEWLINE}{backwards}",
                f"{NEWLINE}{NEWLINE}{perms_exist}" f"{NEWLINE}{NEWLINE}",
            ]

            # Migration Modified Comment and Imports
            # The comment is used to find the latest migration we modified using this management command.
            lines[generated_index + 1 : generated_index + 1] = [
                MIGRATION_MODIFIED_COMMENT,  # This comment has a newline at the end, for when we try to find the line.
                "import copy",  # So, we don't need a newline at the beginning of this.
                f"{NEWLINE}import datetime",
                f"{NEWLINE}import enum",
                f"{NEWLINE}{NEWLINE}from django.apps import apps as django_apps",
                f"{NEWLINE}from django.conf import settings",
                f"{NEWLINE}from django.contrib.auth.management import create_permissions",
            ]

            f.seek(0)
            f.writelines(lines)

    def _get_migration_names_from_show_migrations(self, app_label):
        show_migration_results = self._call_command("showmigrations", app_label)

        if not show_migration_results:  # Erred.  The reason will be printed to the console via the command.
            return None

        return self._parse_migrations_from_show_migrations(show_migration_results)

    def _get_vueda_generated_migration_data_for_auth_user_model(self, selected_apps=()):
        model = django_apps.get_model(settings.AUTH_USER_MODEL)
        meta = model._meta
        app_label = meta.app_label
        app_name = meta.app_config.name

        migration_data = {"app_name": app_name, "migrations_path": os.path.join(meta.app_config.path, "migrations")}

        migration_names = self._get_migration_names_from_show_migrations(app_label)

        migration_dates = {}
        for migration_name in migration_names:
            django_date = self._get_generated_date_for_vueda_generated_migration(app_name, migration_name)
            if django_date:
                migration_dates[django_date] = {
                    "name": migration_name,
                    "path": os.path.join(*app_name.split("."), "migrations", f"{migration_name}.py"),
                }

        if migration_dates:
            max_date = max(migration_dates)
            migration_info = migration_dates[max_date]

            migration_data.update(
                {
                    "last_migration_date": max_date,
                    "last_migration_name": migration_info["name"],
                    "last_migration_path": migration_info["path"],
                }
            )

        return migration_data

    @atomic
    def handle(self, *app_labels, **options):
        self.dry_run = options["dry_run"]

        migration_data = self._get_vueda_generated_migration_data_for_auth_user_model()

        if "last_migration_date" in migration_data:
            group_changes = vueda_models.GroupChange.objects.filter(
                when__gt=migration_data["last_migration_date"]
            ).order_by("when")

        else:
            group_changes = vueda_models.GroupChange.objects.order_by("when")

        changes = list(
            group_changes.values(
                "group_name",
                "group_name_old",
                "change_type",
                "when",
                "historical_permission_codename",
                "historical_permission_content_type_app_label",
                "historical_permission_content_type_model_name",
            )
        )

        if not changes:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No group changes detected."))
            return

        for change in changes:
            permission = (
                auth_models.Permission.objects.filter(
                    codename=change["historical_permission_codename"],
                    content_type__app_label=change["historical_permission_content_type_app_label"],
                    content_type__model=change["historical_permission_content_type_model_name"],
                )
                .values("name")
                .first()
            )
            change["historical_permission_name"] = permission["name"]

        if "last_migration_path" in migration_data:
            # Compare the last migration with the changes data we have.  If they are the same, then
            # you tried to makegroupmigrations multiple times, without faking the last created one.
            # It is also possible that the current changes could contain the last migrations changes, and some more.
            # In this case we need to let the user know they need to delete and try again, or fake and try again.
            spec = importlib.util.spec_from_file_location("migration", migration_data["last_migration_path"])
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            previous_changed_data = {data["when"]: data for data in module.changed_data}

            similarity = set()
            for current_change in changes:
                similarity.add(current_change["when"] in previous_changed_data)

            if True in similarity and False in similarity:
                self.stdout.write(
                    self.style.ERROR(
                        f"{NEWLINE}Group changes detected, but we can't make a migration yet.  Do one of the following:"
                        f"""{NEWLINE}{NEWLINE}1. Delete migration "{migration_data['last_migration_name']}", if """
                        "uncommitted."
                        f"""{NEWLINE}2. Fake migration "{migration_data['last_migration_name']}"."""
                        f'{NEWLINE}{NEWLINE}Once done, run "makegroupmigrations" again.'
                    )
                )
                return

            elif True in similarity:
                self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No group changes detected."))
                return

        migration_name = self._create_and_get_empty_migration(migration_data["app_name"])
        if migration_name is None:
            raise RuntimeError("Unable to find the name of the newly created migration.")

        if not migration_name:  # Erred.
            return

        migration_file = Path(migration_data["migrations_path"]).joinpath(migration_name)

        if not self.dry_run:
            auth_migration_names = self._get_migration_names_from_show_migrations("auth")
            self._rewrite_migration(migration_file, changes, migration_name, auth_migration_names[-1])

        self.stdout.write(
            self.style.SUCCESS(
                f"{NEWLINE}Modified migration '{migration_name}' to migrate workflow for {migration_data['app_name']}."
            )
        )
        self.stdout.write(
            self.style.NOTICE(
                f"{NEWLINE}NOTE: You will need to fake this migration, "
                f"because you already have the changes.{NEWLINE}"
            )
        )
