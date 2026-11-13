"""Write the migrations that a plan describes, one step at a time."""

__all__ = (
    "INDENT8",
    "create_empty_migration",
    "fill_migration",
    "write_plan",
)

from pathlib import Path

from django.apps import apps as django_apps
from django.db import migrations

from vueda.user.management.commands.utils import NEWLINE
from vueda.user.management.commands.utils import call_management_command
from vueda.user.management.commands.utils import format_changed_data
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.management.commands.utils import locate_empty_migration_slots
from vueda.user.migration_generation.dependencies import latest_migration_names


INDENT8 = "        "


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


def fill_migration(migration_path, content, changed_data, dependencies, *, stderr):
    """Replace the placeholders of the empty migration at ``migration_path`` with a tool's migration.

    ``content`` is the tool's ``MigrationContent``. ``changed_data`` is the list that the migration holds.
    ``dependencies`` is a sequence of ``(app_label, migration_name)`` pairs that the migration depends on, in
    addition to its own app's previous migration. The new file is built in memory and written once.
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
        f'{INDENT8}("{app_label}", "{name}"),{NEWLINE}' for app_label, name in dependencies
    ]

    lines[slots["class_index"] - 1 : slots["class_index"]] = [
        NEWLINE,
        *content.preamble,
        format_changed_data(changed_data, migration_path, stderr=stderr),
        *content.sources,
    ]

    # Replace Django's generated imports rather than adding to them, so the tool controls their order.
    lines[slots["import_start"] : slots["import_end"] + 1] = content.imports

    migration_path.write_text("".join(lines), encoding="utf-8")


def write_plan(command, steps, tools_by_key, *, dry_run):
    """Write the migrations of each step in ``steps``, in order, and return the ``(app_label, name)`` written.

    Each step's dependencies are read just before the step is written, so a step depends on the migrations
    that the step before it wrote. A migration does not depend on its own app here, because ``makemigrations``
    already makes it depend on that app's previous migration.

    When a migration cannot be filled in, its file is deleted, because its placeholder operations would fail
    when applied. The migrations of earlier steps are kept. Their changes match on the next run, so that run
    writes only what is left. A dry run writes no files.
    """
    written = []
    try:
        for step in steps:
            latest = latest_migration_names(step.dependency_app_labels)
            for planned in step.migrations:
                tool = tools_by_key[planned.tool_key]
                dependencies = tuple(
                    (app_label, name) for app_label, name in sorted(latest.items()) if app_label != planned.app_label
                )
                written.append(_write_migration(command, tool, planned, dependencies, dry_run=dry_run))
    except BaseException:
        if written and not dry_run:
            kept = ", ".join(f"{app_label}.{name}" for app_label, name in written)
            command.stderr.write(f"{NEWLINE}Kept the migrations already written: {kept}.")
        raise

    return tuple(written)


def _write_migration(command, tool, planned, dependencies, *, dry_run):
    app_label = planned.app_label
    command.stdout.write(f"{NEWLINE}Creating empty migration for {tool.key} changes in {app_label}.")

    file_name = create_empty_migration(command, app_label, tool.migration_name)
    if file_name is None:
        raise RuntimeError(f"Unable to find the name of the migration created in {app_label}.")

    name = Path(file_name).stem
    if not dry_run:
        migration_path = Path(get_migrations_path(django_apps.get_app_config(app_label))) / file_name
        changed_data = [change.data for change in planned.changes]
        try:
            content = tool.migration_content(app_label, name, changed_data)
            fill_migration(migration_path, content, changed_data, dependencies, stderr=command.stderr)
        except BaseException:
            migration_path.unlink(missing_ok=True)
            command.stderr.write(f"{NEWLINE}Deleted {file_name}, because it could not be filled in.")
            raise

    command.stdout.write(
        command.style.SUCCESS(f"{NEWLINE}Modified migration '{name}' to migrate {tool.key} changes for {app_label}.")
    )
    return app_label, name
