"""Management command for updating existing workflow migrations with current function implementations."""

import ast
import datetime
import importlib.util
import os
import sys
from pprint import pformat

from django.apps import apps as django_apps
from django.core.management import BaseCommand

from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import get_migrations_path
from vueda.user.management.commands.utils import has_direct_runpython_import
from vueda.user.management.commands.utils import merge_migration_imports
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.management.commands.utils import update_operation_function_names
from vueda.workflow.management.commands.makeworkflowmigrations import MIGRATION_MODIFIED_COMMENT
from vueda.workflow.management.commands.makeworkflowmigrations import NEWLINE
from vueda.workflow.management.commands.makeworkflowmigrations import get_id_values_from_item
from vueda.workflow.management.commands.makeworkflowmigrations import get_migration_imports
from vueda.workflow.management.commands.makeworkflowmigrations import get_migration_sources


WORKFLOW_MIGRATION_COMMENT_MARKER = MIGRATION_MODIFIED_COMMENT.strip()
IMPORT_INSTEAD_MARKER = "from vueda.workflow.management.commands.makeworkflowmigrations import"

# The keys naming the app and model a workflow was written for, which a change records alongside a
# workflow's code so that a code two content types have held resolves to the right one.
WORKFLOW_IDENTITY_KEYS = ("historical_app_label", "historical_model")


def recorded_at_utc(recorded):
    """Return a recorded date that can be compared with the dates other migrations recorded.

    Every date a generated migration records carries a time zone, so a naive one reached the file by
    hand. UTC is what the generated ones hold, so reading a naive date as UTC keeps it comparable
    and puts it where its author meant it to sit. The date in the file is left as it was written.
    """
    if recorded.tzinfo is None or recorded.utcoffset() is None:
        return recorded.replace(tzinfo=datetime.timezone.utc)

    return recorded


def has_naive_history_dates(changed_data):
    """Return whether any change records a date with no time zone."""
    return any(
        changed_item["history_date"].tzinfo is None or changed_item["history_date"].utcoffset() is None
        for changed_item in changed_data
    )


def workflow_identity_of(changes):
    """Return the app and model a workflow change names, exactly as the change recorded them.

    A field the change altered is returned as the ``(old, new)`` pair it is recorded as, because
    the workflow's own id is read with ``get_id_values_from_dict``, which picks the side the
    direction of travel calls for.

    A change that recorded neither column names a workflow whose columns are blank: replaying the
    change creates the row through a migration-state model, which has none of the ``save()`` that
    fills those columns in, so blank is what the row ends up holding. ``makeworkflowmigrations``
    writes the workflow's own id the same way, so a reference has to agree with it to match.
    """
    return {key: changes.get(key, "") for key in WORKFLOW_IDENTITY_KEYS}


def collect_workflow_identities(changed_data_lists):
    """Return the identities each workflow code has had, in the order they were recorded.

    A code can be released by one model and taken over by another, so a code maps to a list rather
    than to one identity, and which entry a reference means depends on when that reference was
    recorded.
    """
    identities = {}

    for changed_data in changed_data_lists:
        for changed_item in changed_data:
            if changed_item["model_name"] != "workflow":
                continue

            code = get_id_values_from_item(changed_item["changes"].get("code"), reversing=True)
            if code is None:
                continue

            # A reference names a workflow to look it up, so it takes the value a change left
            # behind rather than the pair an altered field records.
            identity = {
                key: get_id_values_from_item(value, reversing=True)
                for key, value in workflow_identity_of(changed_item["changes"]).items()
            }

            identities.setdefault(code, []).append((recorded_at_utc(changed_item["history_date"]), identity))

    for entries in identities.values():
        entries.sort(key=lambda entry: entry[0])

    return identities


def workflow_identity_at(identities, code, recorded_at):
    """Return what a workflow code meant when a change naming it was recorded."""
    entries = identities.get(code)
    if not entries:
        return None

    chosen = None
    for recorded, identity in entries:
        if recorded <= recorded_at:
            chosen = identity

    # A reference recorded before the workflow's own change means the earliest workflow to hold it.
    return chosen if chosen is not None else entries[0][1]


def add_workflow_identities(value, identities, recorded_at, *, names_a_workflow=False):
    """Copy a change, adding the app and model to every workflow it names by code alone."""
    if isinstance(value, tuple):
        return tuple(
            add_workflow_identities(item, identities, recorded_at, names_a_workflow=names_a_workflow) for item in value
        )

    if not isinstance(value, dict):
        return value

    result = {
        key: add_workflow_identities(item, identities, recorded_at, names_a_workflow=key == "workflow_id")
        for key, item in value.items()
    }

    if names_a_workflow and "code" in result and not all(key in result for key in WORKFLOW_IDENTITY_KEYS):
        identity = workflow_identity_at(
            identities, get_id_values_from_item(result["code"], reversing=True), recorded_at
        )
        if identity:
            # Only what the reference does not already name: a generated reference records both
            # keys or neither, so a reference naming one was written by hand, and a hand-written
            # value is not this command's to replace.
            result = {**identity, **result}

    return result


def add_workflow_identities_to_changed_data(changed_data, identities):
    """Return the changes with every workflow reference naming the app and model as well as the code."""
    updated = []

    for changed_item in changed_data:
        changes = add_workflow_identities(
            changed_item["changes"], identities, recorded_at_utc(changed_item["history_date"])
        )

        # A workflow's own change names no workflow through a reference; it is the workflow.
        if changed_item["model_name"] == "workflow" and isinstance(changes.get("id"), dict):
            identity = workflow_identity_of(changes)
            changes["id"] = {**identity, **changes["id"]}

        updated.append({**changed_item, "changes": changes})

    return updated


# Old function names (without _through_imports) that must be renamed in the operations block.
OPERATION_FUNCTION_RENAMES = {
    "make_sure_permissions_exist": "make_sure_permissions_exist_through_imports",
    "forwards_migrate_workflow": "forwards_migrate_workflow_through_imports",
    "backwards_migrate_workflow": "backwards_migrate_workflow_through_imports",
}


class Command(BaseCommand):
    help = (
        "Scan all installed apps for workflow migrations created by makeworkflowmigrations and rewrite "
        "their import and function sections with the current implementations from makeworkflowmigrations.py. "
        "The history_change_reason and migration_app_label variables are preserved unchanged, and changed_data "
        "keeps every change it records, gaining only the app and model naming each workflow it refers to by code. "
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

    def _find_workflow_migration_files(self, selected_apps=()):
        result = []

        for app_config in django_apps.get_app_configs():
            app_label = app_config.label

            # If you specify apps, skip models not in your app.
            if selected_apps and app_label not in selected_apps:
                continue

            migrations_path = get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            for filename in sorted(os.listdir(migrations_path)):
                if not filename.endswith(".py") or filename == "__init__.py":
                    continue

                filepath = os.path.join(migrations_path, filename)
                with open(filepath, encoding="utf-8") as f:
                    for line_no, line in enumerate(f):
                        if line.startswith(WORKFLOW_MIGRATION_COMMENT_MARKER):
                            result.append(filepath)
                            break
                        if line_no > 20:  # noqa: PLR2004
                            break

        return result

    def _load_changed_data(self, filepath):
        """Return the changes a migration records, or ``None`` when they cannot be read.

        The file is read as the module it is, rather than parsed, because a change records real
        datetimes and a literal parser cannot build those.
        """
        try:
            spec = importlib.util.spec_from_file_location("workflow_migration_being_updated", filepath)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module.changed_data
        except Exception as error:
            self.stderr.write(self.style.ERROR(f"  Could not read changed_data in {filepath}: {error}"))
            return None

    @staticmethod
    def _replace_changed_data(lines_string, changed_data):
        """Write the changes back in the form makeworkflowmigrations writes them."""
        tree = ast.parse(lines_string)

        for node in tree.body:
            if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "changed_data":
                break
        else:
            return lines_string

        lines = lines_string.splitlines(keepends=True)
        lines[node.lineno - 1 : node.end_lineno] = [f"changed_data = {pformat(changed_data, width=20)}{NEWLINE}"]

        return "".join(lines)

    @staticmethod
    def _is_import_instead(lines):
        for line_no, line in enumerate(lines):
            if IMPORT_INSTEAD_MARKER in line:
                return True
            if line_no > 30:  # noqa: PLR2004
                break
        return False

    def _update_migration_file(self, filepath, changed_data, identities):
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()

        history_change_reason_exists = changed_data_exists = False
        for line in lines:
            if line.startswith("history_change_reason = "):
                history_change_reason_exists = True
            elif line.startswith("changed_data = "):
                changed_data_exists = True
        if not (history_change_reason_exists and changed_data_exists):
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

        # A change written before a workflow reference carried the app and model names its workflow
        # by code alone, which cannot say which workflow it means once another model has taken that
        # code over. What each code meant when a change was recorded is answerable from the changes
        # themselves, because the workflow's own change records both.
        if changed_data is None:
            # The file parses, or it would have been skipped above, so its changes could not be
            # read for some other reason. Rewriting it anyway would report success while leaving
            # its references naming their workflows by code alone.
            self.stderr.write(self.style.ERROR(f"  Cannot update {filepath} without its changed_data, skipping."))
            return False

        try:
            lines_string = self._replace_changed_data(
                lines_string, add_workflow_identities_to_changed_data(changed_data, identities)
            )
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

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
            source_map = get_migration_sources(import_instead, as_mapping=True)
            lines_string = merge_migration_sources(lines_string, source_map)
        except SyntaxError as e:
            self.stderr.write(
                self.style.ERROR(f"  Unable to parse migration at {filepath} due to syntax error {e}, skipping.")
            )
            return False

        # Update/insert only the imports we recognize, leaving any hand-added ones in place.
        import_map = get_migration_imports(import_instead, direct_runpython_import, as_mapping=True)
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

        # Every generated migration is read before any is written, because what a workflow code
        # meant at one moment can be recorded in a different migration than the change naming it.
        changed_data_by_file = {}
        for filepath in migration_files:
            changed_data = self._load_changed_data(filepath)
            if changed_data is not None:
                if has_naive_history_dates(changed_data):
                    self.stdout.write(
                        self.style.WARNING(f"  Naive dates found in changed_data in {filepath}. Treating as UTC.")
                    )

                changed_data_by_file[filepath] = changed_data

        identities = collect_workflow_identities(changed_data_by_file.values())

        failure_count = 0
        updated_count = 0
        for filepath in migration_files:
            verb = "Would update" if self.dry_run else "Updating"
            self.stdout.write(f"{verb}: {filepath}")
            if self._update_migration_file(filepath, changed_data_by_file.get(filepath), identities):
                updated_count += 1
            else:
                # Something went wrong, stderr will have printed what.
                failure_count += 1

        if updated_count:
            verb = "Would update" if self.dry_run else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}{verb} {updated_count} workflow migration(s).{NEWLINE}"))

        if failure_count:
            verb = "Would have failed updating" if self.dry_run else "Failed updating"
            self.stdout.write(self.style.ERROR(f"{NEWLINE}{verb} {failure_count} workflow migration(s).{NEWLINE}"))
            sys.exit(1)
