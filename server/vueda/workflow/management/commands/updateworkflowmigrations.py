"""Management command for updating existing workflow migrations with current function implementations."""

import ast
import datetime
import importlib.util
import os
import site
import sys
import sysconfig

from django.apps import apps as django_apps
from django.core.management import BaseCommand
from django.db.migrations.loader import MigrationLoader

from vueda.user.management.commands.utils import NoRenamesError
from vueda.user.management.commands.utils import format_changed_data
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

# The copied functions read ObjectStateEvent and write through the workflow event triggers.
# Keep this requirement in step with the schema used by get_migration_sources.
REQUIRED_WORKFLOW_MIGRATION = (
    "vueda_workflow",
    "0008_initialstateevent_objectstateevent_stateevent_and_more",
)

# The keys naming the app and model a workflow was written for, which a change records alongside a
# workflow's code so that a code two content types have held resolves to the right one.
WORKFLOW_IDENTITY_KEYS = ("historical_app_label", "historical_model")


def get_installed_package_paths():
    """Return the directories packages are installed into, normalized for comparison.

    A migration under one of them belongs to a package, so the project cannot commit a rewrite of it,
    and reinstalling the package puts the original back. An editable install leaves its files in their
    source tree, so it is not under any of these.

    Besides the environment's own package directories, these include the base interpreter's, which a
    virtual environment created with ``--system-site-packages`` also imports from, and the user site
    directory that ``pip install --user`` installs into.
    """
    paths = (
        sysconfig.get_path("purelib"),
        sysconfig.get_path("platlib"),
        *site.getsitepackages([sys.base_prefix, sys.base_exec_prefix]),
        site.getusersitepackages(),
    )
    # Different spellings can name one directory, such as lib64 linked to lib, so duplicates are
    # dropped once each path is resolved.
    return tuple({os.path.normcase(os.path.realpath(path)): None for path in paths})


INSTALLED_PACKAGE_PATHS = get_installed_package_paths()


def is_installed_package_path(path):
    """Return whether a path is inside a directory packages are installed into."""
    path = os.path.normcase(os.path.realpath(path))
    return any(path == root or path.startswith(root + os.sep) for root in INSTALLED_PACKAGE_PATHS)


def describe_unreadable_changes(changed_data):
    """Return why the command cannot read a migration's changes, or ``None`` when it can.

    A migration's ``changed_data`` can import and still not hold what the command reads from each
    change, when it has been edited by hand. Checking every change before any is used lets the file
    be reported and skipped, instead of a missing key ending the whole run with no file named.
    """
    if not isinstance(changed_data, list):
        return f"changed_data is a {type(changed_data).__name__}, not a list"

    for index, changed_item in enumerate(changed_data):
        if not isinstance(changed_item, dict):
            return f"change {index} is a {type(changed_item).__name__}, not a dict"

        missing = [key for key in ("model_name", "history_date", "changes") if key not in changed_item]
        if missing:
            return f"change {index} has no {', '.join(repr(key) for key in missing)}"

        if not isinstance(changed_item["history_date"], datetime.datetime):
            return f"change {index} has a history_date that is not a datetime"

        if not isinstance(changed_item["changes"], dict):
            return f"change {index} has changes that are not a dict"

    return None


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
    """Return what a workflow code meant when a change naming it was recorded, or ``None`` when that cannot be told."""
    entries = identities.get(code)
    if not entries:
        return None

    chosen = None
    for recorded, identity in entries:
        if recorded <= recorded_at:
            chosen = identity

    if chosen is not None:
        return chosen

    # A reference recorded before the workflow's own change means the only workflow to hold its code. A
    # workflow records an entry for each of its changes, so one workflow can have several entries, all
    # naming it. When different workflows have held the code, which one the reference means cannot be
    # told, so it is left naming the code alone.
    first_identity = entries[0][1]
    return first_identity if all(identity == first_identity for _, identity in entries) else None


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
        "Scan the named apps, or every app when none is named, for workflow migrations created by "
        "makeworkflowmigrations and rewrite their import and function sections with the current implementations "
        "from makeworkflowmigrations.py. Apps installed as packages are never updated, though their migrations "
        "are read for the workflows they record and for dependency checks. "
        "The history_change_reason and migration_app_label variables are preserved unchanged, and changed_data "
        "keeps every change it records, gaining only the app and model naming each workflow it refers to by code. "
        "The class Migration block is also preserved, with stale operation function names updated to their "
        "current _through_imports equivalents. Migrations whose dependencies do not include the required "
        "workflow schema are left unchanged and reported as failures."
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
        """Return every generated workflow migration, with its migration key and whether this run may rewrite it.

        Every app is scanned, not only the ones this run rewrites, because a migration that must not be
        rewritten can still be the only record of which workflow a code meant, and the references in a
        rewritten migration are resolved from that record.
        """
        result = {}

        for app_config in django_apps.get_app_configs():
            app_label = app_config.label

            migrations_path = get_migrations_path(app_config)
            if migrations_path is None or not os.path.isdir(migrations_path):
                continue

            # Only the project's own apps are rewritten, and only the named ones when apps are named.
            # A named package app is rejected in handle().
            writable = not is_installed_package_path(migrations_path) and (
                not selected_apps or app_label in selected_apps
            )

            for filename in sorted(os.listdir(migrations_path)):
                if not filename.endswith(".py") or filename == "__init__.py":
                    continue

                filepath = os.path.join(migrations_path, filename)
                with open(filepath, encoding="utf-8") as f:
                    for line_no, line in enumerate(f):
                        if line.startswith(WORKFLOW_MIGRATION_COMMENT_MARKER):
                            result[filepath] = ((app_label, filename.removesuffix(".py")), writable)
                            break
                        if line_no > 20:  # noqa: PLR2004
                            break

        return result

    def _load_changed_data(self, filepath, *, writable=True):
        """Return the changes a migration records, or ``None`` when they cannot be read.

        The file is read as the module it is, rather than parsed, because a change records real
        datetimes and a literal parser cannot build those. Changes that import but lack what the
        command reads from them are reported the same way, so the file is skipped rather than
        ending the run.

        A migration this run does not rewrite is read only for the workflows it records, so a fault
        in it is a warning rather than a failure: the workflows it records are left out, and
        references are resolved from the history that remains.
        """
        try:
            spec = importlib.util.spec_from_file_location("workflow_migration_being_updated", filepath)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            changed_data = module.changed_data
        except Exception as error:
            problem = str(error)
        else:
            problem = describe_unreadable_changes(changed_data)

        if problem is None:
            return changed_data

        if writable:
            self.stderr.write(self.style.ERROR(f"  Could not read changed_data in {filepath}: {problem}"))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"  Could not read changed_data in {filepath}: {problem}. "
                    "The workflows it records are not used to name references."
                )
            )

    def _replace_changed_data(self, lines_string, changed_data, filepath):
        """Write the changes back in the form makeworkflowmigrations writes them."""
        tree = ast.parse(lines_string)

        for node in tree.body:
            if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "changed_data":
                break
        else:
            return lines_string

        lines = lines_string.splitlines(keepends=True)
        lines[node.lineno - 1 : node.end_lineno] = [format_changed_data(changed_data, filepath, stderr=self.stderr)]

        return "".join(lines)

    @staticmethod
    def _is_import_instead(lines):
        for line_no, line in enumerate(lines):
            if IMPORT_INSTEAD_MARKER in line:
                return True
            if line_no > 30:  # noqa: PLR2004
                break
        return False

    def _can_rewrite(self, filepath, migration_key):
        """Require the workflow schema through the graph, including indirect dependencies."""
        try:
            if self._migration_loader is None:
                # Use the declared graph, not the migrations applied to this database. A rewrite
                # must also work when a new installation starts with an empty database.
                self._migration_loader = MigrationLoader(None)
            loader = self._migration_loader
            ancestors = set(loader.graph.forwards_plan(migration_key)) - {migration_key}
        except Exception as error:
            self.stderr.write(
                self.style.ERROR(f"  Cannot resolve migration dependencies for {filepath}: {error}, skipping.")
            )
            return False

        required = REQUIRED_WORKFLOW_MIGRATION
        if required in ancestors or any(required in loader.disk_migrations[key].replaces for key in ancestors):
            return True

        self.stderr.write(
            self.style.ERROR(
                f"  Cannot update {filepath}: its dependencies do not include {required[0]}.{required[1]}, "
                "which the current workflow functions require. Leaving the file unchanged. "
                "Keep its existing functions; review the migration graph before changing dependencies."
            )
        )
        return False

    def _update_migration_file(self, filepath, changed_data, identities, migration_key):
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

        if not self._can_rewrite(filepath, migration_key):
            return False

        # Writing the changes back reformats the whole list, so it is only written when a reference
        # gained something. A migration that already names every workflow it can keeps its list
        # exactly as it was, comments and formatting included.
        updated_changed_data = add_workflow_identities_to_changed_data(changed_data, identities)
        try:
            if updated_changed_data != changed_data:
                lines_string = self._replace_changed_data(lines_string, updated_changed_data, filepath)
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
        self._migration_loader = None

        # If you pass in a specific app, validate that it exists.
        app_labels = set(app_labels)
        has_bad_labels = False
        for app_label in app_labels:
            try:
                app_config = django_apps.get_app_config(app_label)
            except LookupError as err:
                self.stderr.write(str(err))
                has_bad_labels = True
                continue

            migrations_path = get_migrations_path(app_config)
            if migrations_path is not None and is_installed_package_path(migrations_path):
                self.stderr.write(
                    f"App '{app_label}' is part of an installed package at {migrations_path}. "
                    "updateworkflowmigrations will not update installed packages."
                )
                has_bad_labels = True
        if has_bad_labels:
            sys.exit(2)

        migration_files = self._find_workflow_migration_files(app_labels)
        writable_files = [filepath for filepath, (_, writable) in migration_files.items() if writable]

        if not writable_files:
            self.stdout.write(self.style.SUCCESS(f"{NEWLINE}No workflow migrations found to update."))
            return

        # Every generated migration is read before any is written, including those this run does
        # not rewrite, because what a workflow code meant at one moment can be recorded in a
        # different migration than the change naming it, even one in an installed package.
        changed_data_by_file = {}
        for filepath, (_, writable) in migration_files.items():
            changed_data = self._load_changed_data(filepath, writable=writable)
            if changed_data is not None:
                if writable and has_naive_history_dates(changed_data):
                    self.stdout.write(
                        self.style.WARNING(f"  Naive dates found in changed_data in {filepath}. Treating as UTC.")
                    )

                changed_data_by_file[filepath] = changed_data

        identities = collect_workflow_identities(changed_data_by_file.values())

        failure_count = 0
        updated_count = 0
        for filepath in writable_files:
            verb = "Would update" if self.dry_run else "Updating"
            self.stdout.write(f"{verb}: {filepath}")
            # Each file is rewritten from its own changes, but the workflows its references name are
            # looked up in identities, which every generated migration read above contributed to.
            migration_key, _ = migration_files[filepath]
            if self._update_migration_file(filepath, changed_data_by_file.get(filepath), identities, migration_key):
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
