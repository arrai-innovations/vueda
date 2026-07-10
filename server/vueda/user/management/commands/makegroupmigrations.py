"""Management command for generating group permission migrations from change history."""

__all__ = (
    "INDENT8",
    "MIGRATION_MODIFIED_COMMENT",
    "NEWLINE",
    "Command",
    "GroupChangeTypes",
    "backwards_migrate_groups",
    "backwards_migrate_groups_through_imports",
    "forwards_migrate_groups",
    "forwards_migrate_groups_through_imports",
    "get_group_migration_imports",
    "get_group_migration_sources",
    "make_sure_permissions_exist",
    "migrate_step",
)

import ast
import contextlib
import copy
import datetime
import enum
import importlib
import inspect
import io
import os
import re
import sys
from pathlib import Path
from pprint import pformat

from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.auth import models as auth_models
from django.contrib.auth.management import create_permissions
from django.core.management import BaseCommand
from django.core.management import call_command
from django.db import migrations
from django.db.migrations.loader import MIGRATIONS_MODULE_NAME
from django.db.transaction import atomic

from vueda.user import models as vueda_models
from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import create_group_change
from vueda.user.management.commands.utils import get_matching_record


INDENT8 = "        "


# Add a comment right after the Django generated comment, to help find our created migrations.
# This way we can find the last one we did, parse the generated date from the Django comment,
# and look at history to determine what changed in the workflow since the migration was created.
MIGRATION_MODIFIED_COMMENT = (
    f"# Modified using VUEDA makegroupmigrations command.  Please do not delete this comment.{NEWLINE}"
)


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
    content_types,
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
                content_type = content_types.objects.get(
                    app_label=historical_permission_content_type_app_label,
                    model=historical_permission_content_type_model_name,
                )
                permission = permissions.objects.create(
                    codename=historical_permission_codename,
                    content_type=content_type,
                    name=historical_permission_name,
                )

            permission.group_set.add(group)

        case GroupChangeTypes.UNASSOCIATED.value | GroupChangeTypes.DELETED.value:
            if permission is not None and group is not None:
                permission.group_set.remove(group)

            if change_type == GroupChangeTypes.DELETED.value and not group.permissions.exists():
                group.delete()


# Migration-only entry point; its existence makes the underlying function testable.
def forwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover
    # Copied changed_data, so tests can migrate forwards and backwards.
    forwards_migrate_groups(apps, copy.deepcopy(changed_data))  # noqa: F821


def forwards_migrate_groups(apps, changed_items):
    content_types = apps.get_model("contenttypes", "ContentType")
    group_changes = apps.get_model("vueda_user", "GroupChange")
    groups = apps.get_model("auth", "Group")
    permissions = apps.get_model("auth", "Permission")

    for changed_item in changed_items:
        group_name = changed_item["group_name"]
        group_name_old = changed_item["group_name_old"]
        change_type = changed_item["change_type"]
        historical_permission_codename = changed_item["historical_permission_codename"]
        historical_permission_content_type_app_label = changed_item["historical_permission_content_type_app_label"]
        historical_permission_content_type_model_name = changed_item["historical_permission_content_type_model_name"]
        historical_permission_name = changed_item["historical_permission_name"]

        migrate_step(
            content_types,
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

        pk = get_matching_record(changed_item, group_change_model=group_changes)
        if pk is None:
            create_group_change(changed_item, group_change_model=group_changes)


# Migration-only entry point; its existence makes the underlying function testable.
def backwards_migrate_groups_through_imports(apps, schema_editor):  # pragma: no cover
    # Copied changed_data, so tests can migrate forwards and backwards.
    backwards_migrate_groups(apps, copy.deepcopy(changed_data))  # noqa: F821


def backwards_migrate_groups(apps, changed_items):
    content_types = apps.get_model("contenttypes", "ContentType")
    groups = apps.get_model("auth", "Group")
    permissions = apps.get_model("auth", "Permission")

    for changed_item in reversed(changed_items):
        group_name = changed_item["group_name"]
        group_name_old = changed_item["group_name_old"]
        change_type = changed_item["change_type"]
        historical_permission_codename = changed_item["historical_permission_codename"]
        historical_permission_content_type_app_label = changed_item["historical_permission_content_type_app_label"]
        historical_permission_content_type_model_name = changed_item["historical_permission_content_type_model_name"]
        historical_permission_name = changed_item["historical_permission_name"]

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
            content_types,
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


def get_group_migration_imports(import_instead=False, direct_runpython_import=False, as_mapping=False):
    """Return the full, ordered set of import lines a group migration file's import section is replaced with.

    ``direct_runpython_import`` adds a direct ``from django.db.migrations import RunPython`` import, needed
    when the class Migration block being preserved calls ``RunPython(...)`` directly instead of
    ``migrations.RunPython(...)``.

    When ``as_mapping`` is True, an ordered mapping is returned instead: keys are single-name tuples (an
    import only ever binds one name, per this project's force-single-line isort convention) and values are
    the current import line, each ending in its own newline and prefixed with a blank line where it opens
    a new isort group. This is used by ``updategroupmigrations`` to update or insert only the imports it
    recognizes in an existing migration, leaving any hand-added imports (or comments) around them
    untouched.
    """
    if import_instead:
        result_mapping = {
            ("copy",): f"import copy{NEWLINE}",
            ("datetime",): f"import datetime{NEWLINE}",
            ("settings",): f"{NEWLINE}from django.conf import settings{NEWLINE}",
            ("migrations",): f"from django.db import migrations{NEWLINE}",
        }
        if direct_runpython_import:
            result_mapping[("RunPython",)] = f"from django.db.migrations import RunPython{NEWLINE}"
        result_mapping[("backwards_migrate_groups",)] = (
            f"{NEWLINE}from vueda.user.management.commands.makegroupmigrations import backwards_migrate_groups{NEWLINE}"
        )
        result_mapping[("forwards_migrate_groups",)] = (
            f"from vueda.user.management.commands.makegroupmigrations import forwards_migrate_groups{NEWLINE}"
        )
        result_mapping[("make_sure_permissions_exist",)] = (
            f"from vueda.user.management.commands.makegroupmigrations import make_sure_permissions_exist{NEWLINE}"
        )

    else:
        result_mapping = {
            ("copy",): f"import copy{NEWLINE}",
            ("datetime",): f"import datetime{NEWLINE}",
            ("enum",): f"import enum{NEWLINE}",
            ("django_apps",): f"{NEWLINE}from django.apps import apps as django_apps{NEWLINE}",
            ("settings",): f"from django.conf import settings{NEWLINE}",
            ("create_permissions",): f"from django.contrib.auth.management import create_permissions{NEWLINE}",
            ("migrations",): f"from django.db import migrations{NEWLINE}",
        }
        if direct_runpython_import:
            result_mapping[("RunPython",)] = f"from django.db.migrations import RunPython{NEWLINE}"

    if as_mapping:
        return result_mapping

    return [MIGRATION_MODIFIED_COMMENT, *result_mapping.values()]


def get_group_migration_sources(import_instead=False, as_mapping=False):
    """Return the source-code strings inserted into a group migration file.

    When ``as_mapping`` is True, an ordered mapping is returned instead: keys are tuples of every name
    (old and current) that identifies a given function/class across versions of this command, and values
    are the current source for it. This is used by ``updategroupmigrations`` to replace only the functions
    it recognizes in an existing migration, leaving any hand-added code around them untouched.
    """
    noqa_removal_regex = r"\s*#\s*noqa:\s*F821[^\n]*"  # Removes 'noqa: F821' from these functions.

    def cleaned_source(func):
        return re.sub(noqa_removal_regex, "", inspect.getsource(func))

    forwards_through_imports_source = cleaned_source(forwards_migrate_groups_through_imports)
    backwards_through_imports_source = cleaned_source(backwards_migrate_groups_through_imports)

    result_mapping = {
        ("forwards_migrate_groups_through_imports", "forwards_migrate_groups"): forwards_through_imports_source,
        ("backwards_migrate_groups_through_imports", "backwards_migrate_groups"): backwards_through_imports_source,
    }

    if not import_instead:
        result_mapping.update(
            {
                ("create_group_change",): inspect.getsource(create_group_change),
                ("get_matching_record",): inspect.getsource(get_matching_record),
                ("GroupChangeTypes",): inspect.getsource(GroupChangeTypes),
                ("migrate_step",): inspect.getsource(migrate_step),
                ("forwards_migrate_groups",): cleaned_source(forwards_migrate_groups),
                ("backwards_migrate_groups",): cleaned_source(backwards_migrate_groups),
                ("make_sure_permissions_exist",): inspect.getsource(make_sure_permissions_exist),
            }
        )

    if as_mapping:
        return result_mapping

    result = [f"{NEWLINE}{NEWLINE}{value}" for value in result_mapping.values()]
    result.append(f"{NEWLINE}{NEWLINE}")

    return result


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
            "--dry-run",
            action="store_true",
            help="Just show what migrations would be made; don't actually write them.",
        )
        parser.add_argument(
            "--import-instead",
            action="store_true",
            help=(
                "This causes created migrations to not copy functions from the management command "
                "into the migration.  Imports are added instead.  This is used by tests, so the "
                "coverage report will reflect actual code usage."
            ),
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
            try:
                call_command(*args)
            except SystemExit:
                pass

        # Did an error occur?
        if err.tell():
            err.seek(0)
            self.stdout.write(self.style.ERROR(err.read()))
            sys.exit(2)

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

        with open(os.path.join(*app_name.split("."), "migrations", f"{migration_name}.py"), encoding="utf-8") as f:
            is_modified_by_us = False
            # Did we modify this migration?  Check the first 20 lines for our modified comment.
            for migration_line_no, migration_line in enumerate(f.readlines()):
                if migration_line.startswith("# Generated by Django"):
                    django_comment = migration_line

                # Changed to startswith and strip, so crossing an OS should work.
                if migration_line.startswith(MIGRATION_MODIFIED_COMMENT.strip()):
                    is_modified_by_us = True

                if migration_line_no > 20:  # noqa: PLR2004
                    break

        if is_modified_by_us:
            return self._parse_date_from_django_comment(django_comment)

        return False

    def _create_and_get_empty_migration(self, app_label):
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
            "makemigrations", app_label, "--empty", f"--name=group_permission_migrations_{date_string}", "--noinput"
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

    def _rewrite_migration(self, migration_file, changes, migration_name, dependencies):
        with open(migration_file, "r+", encoding="utf-8") as f:
            lines = f.readlines()

            # Use ast to locate the lines we need to change, rather than scanning text, so the
            # substitutions below can't accidentally match unrelated code that happens to contain the
            # same text (e.g. a hand-added `dependencies = [...]` list elsewhere in the file).
            tree = ast.parse("".join(lines))
            class_index = dependencies_index = None
            p_forwards_index = p_reverse_index = forwards_index = reverse_index = None
            import_start = import_end = None
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef) and node.name == "Migration":
                    class_index = node.lineno - 1

                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and target.id == "dependencies":
                            dependencies_index = node.lineno - 1

                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    # This is a freshly generated, empty migration, so its imports are a single
                    # contiguous block at the top of the file, never a direct RunPython import.
                    if import_start is None:
                        import_start = node.lineno - 1
                    import_end = node.end_lineno - 1

                elif isinstance(node, ast.Call):
                    func = node.func
                    is_run_python = (isinstance(func, ast.Attribute) and func.attr == "RunPython") or (
                        isinstance(func, ast.Name) and func.id == "RunPython"
                    )
                    if not is_run_python:
                        continue

                    # Separate tests, so code=dict/reverse_code=type and code=str/reverse_code=int are
                    # fine whether or not they are on the same line as each other.
                    for keyword in node.keywords:
                        value = keyword.value
                        if not isinstance(value, ast.Name):
                            continue

                        if keyword.arg == "code" and value.id == "dict":
                            p_forwards_index = value.lineno - 1
                        elif keyword.arg == "reverse_code" and value.id == "type":
                            p_reverse_index = value.lineno - 1
                        elif keyword.arg == "code" and value.id == "str":
                            forwards_index = value.lineno - 1
                        elif keyword.arg == "reverse_code" and value.id == "int":
                            reverse_index = value.lineno - 1

            # We write lines starting from the bottom to the top, so our line numbers are correct through the process.
            lines[reverse_index] = lines[reverse_index].replace("int", "backwards_migrate_groups_through_imports")
            lines[forwards_index] = lines[forwards_index].replace("str", "forwards_migrate_groups_through_imports")
            lines[p_reverse_index] = lines[p_reverse_index].replace("type", "migrations.RunPython.noop")
            lines[p_forwards_index] = lines[p_forwards_index].replace("dict", "make_sure_permissions_exist")

            # Add Dependencies
            lines[dependencies_index + 1 : dependencies_index + 1] = [
                f"{INDENT8}migrations.swappable_dependency(settings.AUTH_USER_MODEL),{NEWLINE}",
            ] + dependencies

            # Changed data and forwards/reverse functions.
            copied_code = [
                f"{NEWLINE}changed_data = {pformat(changes)}{NEWLINE}",
                *get_group_migration_sources(self.import_instead),
            ]
            lines[class_index - 1 : class_index] = copied_code

            # Migration Modified Comment and Imports
            # The comment is used to find the latest migration we modified using this management command.
            # Replace Django's generated import rather than inserting alongside it, so we control the order.
            lines[import_start : import_end + 1] = get_group_migration_imports(self.import_instead)

            f.seek(0)
            f.writelines(lines)

    def _get_migration_names_from_show_migrations(self, app_label):
        show_migration_results = self._call_command("showmigrations", app_label)
        if not show_migration_results:  # Erred.  The reason will be printed to the console via the command.
            return None

        return self._parse_migrations_from_show_migrations(show_migration_results)

    def _get_project_dependency_migration_names_from_show_migrations(self, exclude):
        exclude = exclude.split(".")[0]  # make sure we don't have .py in the name.
        project_dependency_migration_names = []
        for app in django_apps.get_app_configs():
            app_path = Path(app.path)
            if "site-packages" not in app_path.parts:
                app_label = app.label
                app_migrations = self._get_migration_names_from_show_migrations(app_label)
                if app_migrations:
                    # Exclude the migration we just created.
                    if app_migrations[-1] == exclude:
                        continue
                    project_dependency_migration_names.append(
                        f'{INDENT8}("{app_label}", "{app_migrations[-1]}"),{NEWLINE}'
                    )

        return sorted(project_dependency_migration_names)

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

    def _get_vueda_generated_migration_data_for_auth_user_model(self):
        model = django_apps.get_model(settings.AUTH_USER_MODEL)
        meta = model._meta
        app_label = meta.app_label
        app_name = meta.app_config.name

        app_config = django_apps.get_app_config(app_label)
        migrations_path = self._get_migrations_path(app_config)

        migration_names = self._get_migration_names_from_show_migrations(app_label)

        migration_data = {
            "app_name": app_name,
            "app_label": app_label,
            "migrations_path": migrations_path,
            "migrations": {},
        }

        for migration_name in migration_names:
            django_date = self._get_generated_date_for_vueda_generated_migration(app_name, migration_name)
            migration_path = os.path.join(migrations_path, f"{migration_name}.py")

            if django_date:
                if migration_name not in migration_data["migrations"]:
                    migration_data["migrations"][migration_name] = {
                        "changes": {},
                        "migration_path": migration_path,
                    }

                spec = importlib.util.spec_from_file_location("migration", migration_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                migration_data["migrations"][migration_name]["changes"] = module.changed_data.copy()

        return migration_data

    @atomic
    def handle(self, **options):
        from vueda.user.models import GroupChange

        self.dry_run = options["dry_run"]
        self.import_instead = options["import_instead"]

        all_migrated_data = self._get_vueda_generated_migration_data_for_auth_user_model()
        matched_group_change_pks = set()

        for migration_name in all_migrated_data["migrations"]:
            for change in all_migrated_data["migrations"][migration_name]["changes"]:
                pk = get_matching_record(change, GroupChange)
                if pk is not None:
                    matched_group_change_pks.add(pk)

        if matched_group_change_pks:
            changes = list(
                vueda_models.GroupChange.objects.exclude(pk__in=matched_group_change_pks)
                .order_by("when")
                .values(
                    "group_name",
                    "group_name_old",
                    "change_type",
                    "when",
                    "historical_permission_codename",
                    "historical_permission_content_type_app_label",
                    "historical_permission_content_type_model_name",
                )
            )

        else:
            changes = list(
                vueda_models.GroupChange.objects.order_by("when").values(
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

        migration_name = self._create_and_get_empty_migration(all_migrated_data["app_label"])
        if migration_name is None:
            raise RuntimeError("Unable to find the name of the newly created migration.")

        if not migration_name:  # Erred.
            return

        migration_file = Path(all_migrated_data["migrations_path"]).joinpath(migration_name)

        if not self.dry_run:
            auth_migration_names = self._get_migration_names_from_show_migrations("auth")
            dependencies = [f'{INDENT8}("auth", "{auth_migration_names[-1]}"),{NEWLINE}']
            dependencies += self._get_project_dependency_migration_names_from_show_migrations(exclude=migration_name)
            self._rewrite_migration(migration_file, changes, migration_name, dependencies)

        self.stdout.write(
            self.style.SUCCESS(
                f"{NEWLINE}Modified migration '{migration_name}' to migrate groups for {all_migrated_data['app_name']}."
            )
        )
        self.stdout.write(
            self.style.NOTICE(
                f"{NEWLINE}NOTE: You will need to fake this migration, because you already have the changes.{NEWLINE}"
            )
        )
