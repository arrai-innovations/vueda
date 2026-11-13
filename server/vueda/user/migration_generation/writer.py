"""Write the migrations that a plan describes, one step at a time."""

__all__ = (
    "INDENT8",
    "create_empty_migration",
    "fill_migration",
    "write_plan",
)

from pathlib import Path

from django.apps import apps as django_apps
from django.core.management import CommandError
from django.db import migrations

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import call_management_command
from vueda.user.management.commands.utils import format_changed_data
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.management.commands.utils import locate_empty_migration_slots
from vueda.user.migration_generation.dependencies import is_vueda_app
from vueda.user.migration_generation.dependencies import latest_migration_names


INDENT8 = "        "

SETTINGS_IMPORT = "from django.conf import settings"

# A migration that VUEDA ships depends on the user model this way, because each project names its own.
SWAPPABLE_USER_DEPENDENCY = f"{INDENT8}migrations.swappable_dependency(settings.AUTH_USER_MODEL),{NEWLINE}"


def create_empty_migration(command, app_label, migration_name):
    """Run ``makemigrations --empty`` for ``app_label`` and return the file name of the migration that it wrote.

    The migration holds two ``RunPython`` operations with builtins as placeholders, which ``fill_migration``
    finds and replaces. Builtins need no import, so Django adds none. A dry run writes no file but still
    returns the name that Django reports. Returns ``None`` when Django reports no file.
    """
    migrations.Migration.operations = [
        migrations.RunPython(code=dict, reverse_code=type),
        migrations.RunPython(code=str, reverse_code=int),
    ]
    try:
        results = call_management_command(
            command, "makemigrations", app_label, "--empty", f"--name={migration_name}", "--noinput"
        )
    finally:
        # Reset the operations in the class, even when makemigrations raises. Every Migration subclass that
        # doesn't set its own operations would otherwise inherit these placeholders.
        migrations.Migration.operations = []

    capture = False
    for result in results or ():
        command.stdout.write(result)
        result = result.strip()
        if result == f"Migrations for '{app_label}':":
            capture = True
        if capture and result.endswith(".py"):
            # Stop at the first file, in case Django lists other apps and files after it.
            return Path(result).name

    return None


def fill_migration(migration_path, content, changed_data, dependencies, *, stderr, swappable_user=False):
    """Replace the placeholders of the empty migration at ``migration_path`` with a tool's migration.

    ``content`` is the tool's ``MigrationContent``. ``changed_data`` is the list that the migration holds.
    ``dependencies`` is a sequence of ``(app_label, migration_name)`` pairs that the migration depends on, in
    addition to its own app's previous migration. ``swappable_user`` adds a dependency on the first migration of
    whichever app holds ``AUTH_USER_MODEL``, for a migration that VUEDA ships. The new file is built in memory and
    written once.
    """
    migration_path = Path(migration_path)
    lines = migration_path.read_text(encoding="utf-8").splitlines(keepends=True)

    # ast locates the lines to change, so a substitution can't match unrelated text that happens to look alike.
    slots = locate_empty_migration_slots(lines)

    # Change lines from the bottom of the file to the top, so the line numbers stay correct throughout.
    replacements = (
        ("reverse_index", "=int", f"={content.backwards}"),
        ("forwards_index", "=str", f"={content.forwards}"),
        ("p_reverse_index", "=type", f"={content.permissions_backwards}"),
        ("p_forwards_index", "=dict", f"={content.permissions_forwards}"),
    )
    for slot, placeholder, replacement in replacements:
        lines[slots[slot]] = lines[slots[slot]].replace(placeholder, replacement)

    lines[slots["dependencies_index"] + 1 : slots["dependencies_index"] + 1] = [
        *((SWAPPABLE_USER_DEPENDENCY,) if swappable_user else ()),
        *(f'{INDENT8}("{app_label}", "{name}"),{NEWLINE}' for app_label, name in dependencies),
    ]

    lines[slots["class_index"] - 1 : slots["class_index"]] = [
        NEWLINE,
        *content.preamble,
        format_changed_data(changed_data, migration_path, stderr=stderr),
        *content.sources,
    ]

    # Replace Django's generated imports rather than adding to them, so the tool controls their order.
    imports = _with_settings_import(content.imports) if swappable_user else content.imports
    lines[slots["import_start"] : slots["import_end"] + 1] = imports

    migration_path.write_text("".join(lines), encoding="utf-8")


def _with_settings_import(imports):
    """Return ``imports`` with ``from django.conf import settings``, in the place where isort puts it.

    It goes just before ``from django.db import migrations``. When that line opens the import group, the settings
    line opens it instead.
    """
    if SETTINGS_IMPORT in (line.strip() for line in imports):
        return tuple(imports)

    result = []
    for line in imports:
        if line.strip() == "from django.db import migrations":
            opens_group = line.startswith(NEWLINE)
            result.append(f"{NEWLINE}{SETTINGS_IMPORT}{NEWLINE}" if opens_group else f"{SETTINGS_IMPORT}{NEWLINE}")
            line = line.lstrip(NEWLINE)
        result.append(line)
    return tuple(result)


def _shipped_dependencies(command, planned, dependencies, previous_app_labels):
    """Return the dependencies of a migration that VUEDA ships, which every project must be able to apply.

    It keeps the dependencies on VUEDA's own apps and on ``auth``, and leaves out the project's apps, which the
    projects that install VUEDA do not have. The user app becomes a swappable dependency, so the migration needs
    only that the project's user model exists. A step before it in a project app cannot be depended on, so the
    command warns: generate VUEDA's own migrations with no other changes pending.
    """
    for app_label in sorted(previous_app_labels):
        if not is_vueda_app(app_label):
            command.stderr.write(
                f"{NEWLINE}The migration for {planned.tool_key} changes in {planned.app_label} ships with VUEDA, so "
                f"it cannot depend on the migration written into {app_label} before it. Generate VUEDA's own "
                "migrations with no other changes pending."
            )

    return tuple(
        (app_label, name) for app_label, name in dependencies if app_label == "auth" or is_vueda_app(app_label)
    )


def write_plan(command, steps, tools_by_key, *, dry_run, keep_failed_migration=False):
    """Write the migrations of each step in ``steps``, in order, and return the ``(app_label, name)`` written.

    Each step's dependencies are read just before the step is written, so a step depends on the migrations
    that the step before it wrote. A migration does not depend on its own app here, because ``makemigrations``
    already makes it depend on that app's previous migration.

    When a migration cannot be filled in, its file is deleted, because its placeholder operations would fail
    when applied. ``keep_failed_migration`` keeps it instead, for debugging. The migrations of earlier steps are
    kept. Their changes match on the next run, so that run writes only what is left. A dry run writes no files.
    """
    _check_migration_directories(steps)

    written = []
    previous_app_labels = frozenset()
    try:
        for step in steps:
            latest = latest_migration_names(step.dependency_app_labels)
            for planned in step.migrations:
                tool = tools_by_key[planned.tool_key]
                dependencies = tuple(
                    (app_label, name) for app_label, name in sorted(latest.items()) if app_label != planned.app_label
                )
                swappable_user = is_vueda_app(planned.app_label)
                if swappable_user:
                    dependencies = _shipped_dependencies(command, planned, dependencies, previous_app_labels)
                written.append(
                    _write_migration(
                        command,
                        tool,
                        planned,
                        dependencies,
                        dry_run=dry_run,
                        swappable_user=swappable_user,
                        keep_failed_migration=keep_failed_migration,
                    )
                )
            previous_app_labels = frozenset(planned.app_label for planned in step.migrations)
    except BaseException:
        if written and not dry_run:
            kept = ", ".join(f"{app_label}.{name}" for app_label, name in written)
            command.stderr.write(
                f"{NEWLINE}Kept the migrations already written: {kept}. Fake them, because your database already "
                "has their changes. The next run writes the rest."
            )
        raise

    return tuple(written)


def _check_migration_directories(steps):
    """Raise ``CommandError`` for an app that a step writes into but that has no migrations directory.

    This runs before anything is written, so a run that cannot finish leaves no migration behind.
    """
    for app_label in sorted({planned.app_label for step in steps for planned in step.migrations}):
        if get_migrations_path(django_apps.get_app_config(app_label)) is None:
            raise CommandError(
                f"The app {app_label!r} has pending changes but no migrations directory to write them into. "
                "Its MIGRATION_MODULES entry may be None, or its migrations may be a single module."
            )


def _report_unfinished_migration(command, tool, app_label, migration_path, *, keep):
    """Delete a migration that could not be filled in, or keep it for debugging, and say what happened.

    The file still holds placeholder operations, which would fail when applied, so it is deleted unless ``keep`` is
    set.
    """
    if not migration_path.exists():
        return

    if keep:
        command.stderr.write(
            f"{NEWLINE}An error occurred while writing the migration for {tool.key} changes in {app_label}. Kept "
            f"the unfinished migration at {migration_path} for debugging. It still holds placeholder operations, so "
            "delete it before you run migrate. To attach it to a bug report, first replace any private values in "
            "it. Keep codes such as state and transition codes where you can, because they help find the problem."
        )
        return

    migration_path.unlink()
    command.stderr.write(
        f"{NEWLINE}An error occurred while writing the migration for {tool.key} changes in {app_label}, so "
        f"{migration_path.name} was deleted. Run the command again. If it fails again, run it with "
        "--keep-failed-migration to keep the unfinished migration, which you can read or attach to a bug report."
    )


def _write_migration(command, tool, planned, dependencies, *, dry_run, swappable_user, keep_failed_migration):
    app_label = planned.app_label
    command.stdout.write(f"{NEWLINE}Creating empty migration for {tool.key} changes in {app_label}.")

    migrations_dir = Path(get_migrations_path(django_apps.get_app_config(app_label)))
    files_before = set(migrations_dir.glob("*.py"))
    try:
        file_name = create_empty_migration(command, app_label, tool.migration_name)
        if file_name is None:
            raise RuntimeError(f"Unable to find the name of the migration created in {app_label}.")
    except BaseException:
        # makemigrations may have written a file with placeholder operations, which would fail when applied. That
        # includes the SystemExit that call_management_command raises when makemigrations writes to stderr.
        for unnamed in set(migrations_dir.glob("*.py")) - files_before:
            _report_unfinished_migration(command, tool, app_label, unnamed, keep=keep_failed_migration)
        raise

    name = Path(file_name).stem
    if not dry_run:
        migration_path = migrations_dir / file_name
        changed_data = [change.data for change in planned.changes]
        try:
            content = tool.migration_content(app_label, name, changed_data)
            fill_migration(
                migration_path,
                content,
                changed_data,
                dependencies,
                stderr=command.stderr,
                swappable_user=swappable_user,
            )
        except BaseException:
            _report_unfinished_migration(command, tool, app_label, migration_path, keep=keep_failed_migration)
            raise

    if dry_run:
        message = f"{NEWLINE}Would write migration '{name}' for {tool.key} changes in {app_label}."
    else:
        message = f"{NEWLINE}Modified migration '{name}' to migrate {tool.key} changes for {app_label}."
    command.stdout.write(command.style.SUCCESS(message))
    return app_label, name
