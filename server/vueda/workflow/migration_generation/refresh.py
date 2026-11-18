"""Refresh the changed_data of generated workflow migrations, so each workflow reference names its app and model.

A workflow reference written before VUEDA recorded each workflow's app and model names the workflow by code alone.
A code can move from one model to another, so the refresh works out which workflow each code meant when the
change was recorded, from the workflow changes that every app's generated migrations hold.
"""

__all__ = (
    "REQUIRED_WORKFLOW_MIGRATION",
    "WORKFLOW_IDENTITY_KEYS",
    "add_workflow_identities",
    "add_workflow_identities_to_changed_data",
    "changed_data_updater",
    "collect_workflow_identities",
    "describe_unreadable_changes",
    "has_naive_history_dates",
    "read_changed_data",
    "recorded_at_utc",
    "requires_workflow_events",
    "workflow_identity_at",
    "workflow_identity_of",
)

import ast
import datetime
import types

from vueda.user.management.commands.utils import format_changed_data
from vueda.workflow.migration_generation.operations import WorkflowChangeTypes
from vueda.workflow.migration_generation.operations import get_id_values_from_item


# The keys naming the app and model a workflow was written for, which a change records alongside a
# workflow's code so that a code two content types have held resolves to the right one.
WORKFLOW_IDENTITY_KEYS = ("historical_app_label", "historical_model")


def describe_unreadable_changes(changed_data):
    """Return why the command cannot read a migration's changes.

    The result is ``None`` when the command can read them.

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
    """Return the app and model that a workflow change names, exactly as the change recorded them.

    A field the change altered is returned as the ``(old, new)`` pair it is recorded as, because
    the workflow's own id is read with ``get_id_values_from_dict``, which picks the side the
    direction of travel calls for.

    A change that recorded neither column names a workflow whose columns are blank: replaying the
    change creates the row through a migration-state model, which has none of the ``save()`` that
    fills those columns in, so blank is what the row ends up holding. ``makevuedamigrations``
    writes the workflow's own id the same way, so a reference has to agree with it to match.
    """
    return {key: changes.get(key, "") for key in WORKFLOW_IDENTITY_KEYS}


def collect_workflow_identities(changed_data_lists):
    """Return the identities each workflow code has had, in the order they were recorded.

    A code can be released by one model and taken over by another, so a code maps to a list rather
    than to one identity, and which entry a reference means depends on when that reference was
    recorded.

    Each entry also records whether the workflow it names took the code at that change: one added
    with the code, or one whose code was changed to it. Every other change to a workflow records an
    entry too, under the code it already held, and can name a different app or model when the
    workflow's own changed. Telling the two apart is what shows whether one workflow or several have
    held a code.
    """
    identities = {}

    for changed_data in changed_data_lists:
        for changed_item in changed_data:
            if changed_item["model_name"] != "workflow":
                continue

            recorded_code = changed_item["changes"].get("code")
            code = get_id_values_from_item(recorded_code, reversing=True)
            if code is None:
                continue

            # A reference names a workflow to look it up, so it takes the value a change left
            # behind rather than the pair an altered field records.
            identity = {
                key: get_id_values_from_item(value, reversing=True)
                for key, value in workflow_identity_of(changed_item["changes"]).items()
            }

            # A changed code is recorded as an (old, new) pair, so a pair means the code was changed to this one.
            took_code = changed_item.get("history_type") == WorkflowChangeTypes.ADDED.value or isinstance(
                recorded_code, tuple
            )

            if code not in identities:
                identities[code] = []
            identities[code].append((recorded_at_utc(changed_item["history_date"]), identity, took_code))

    for entries in identities.values():
        entries.sort(key=lambda entry: entry[0])

    return identities


def workflow_identity_at(identities, code, recorded_at):
    """Return what a workflow code meant when a change naming it was recorded.

    The result is ``None`` when that cannot be told.
    """
    entries = identities.get(code)
    if not entries:
        return None

    chosen = None
    for recorded, identity, _ in entries:
        if recorded <= recorded_at:
            chosen = identity

    if chosen is not None:
        return chosen

    # A reference recorded before the workflow's own change means the only workflow to hold its code. A
    # workflow records an entry for each of its changes, so one workflow can have several entries, even
    # naming different apps or models when its own changed. Only a later entry that took the code, naming a
    # different app or model, shows a different workflow has held it. Then which one the reference means
    # cannot be told, so it is left naming the code alone.
    first_identity = entries[0][1]
    if any(took_code and identity != first_identity for _, identity, took_code in entries[1:]):
        return None

    return first_identity


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


def read_changed_data(source, filepath):
    """Return the ``changed_data`` that a migration's ``source`` records, as ``(changed_data, None)``.

    When the changes cannot be read, the result is ``(None, problem)``, and ``problem`` says why. The text is run as a
    module, rather than parsed, because a change records real datetimes and a literal parser cannot build them.
    It runs the given text, not the file, so a refresh can read a migration after fixing its imports and before
    writing anything.
    """
    module = types.ModuleType("workflow_migration_being_updated")
    module.__file__ = str(filepath)
    try:
        exec(compile(source, str(filepath), "exec"), module.__dict__)
        changed_data = module.changed_data
    except Exception as error:
        return None, str(error)

    problem = describe_unreadable_changes(changed_data)
    return (None, problem) if problem else (changed_data, None)


def changed_data_updater(identities, filepath, *, stderr, dry_run):
    """Return the ``update_changed_data`` step for ``refresh_migration`` that adds workflow identities.

    The step reads the text's ``changed_data``, adds the app and model to each workflow reference that names a
    code alone, and rewrites the assignment only when that changed something. Otherwise the list is left as
    written, comments included. It raises ``ValueError`` when the ``changed_data`` cannot be read. It also raises
    ``ValueError`` when ``changed_data`` is assigned in a way that it cannot rewrite safely, such as a chained, an
    augmented, or a second assignment.
    """

    def update(source):
        changed_data, problem = read_changed_data(source, filepath)
        if problem:
            raise ValueError(f"Could not read changed_data: {problem}")

        updated = add_workflow_identities_to_changed_data(changed_data, identities)
        if updated == changed_data:
            return source

        # Only one plain `changed_data = [...]` assignment can be rewritten safely. A second assignment, an
        # augmented one, or a chained one would replay changes twice or leave the update without effect.
        # Only the module's own statements count. A local variable of the same name inside a function does not.
        assignments = [
            node
            for node in ast.parse(source).body
            if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign))
            and any(
                isinstance(target, ast.Name) and target.id == "changed_data"
                for target in (node.targets if isinstance(node, ast.Assign) else [node.target])
            )
        ]
        if len(assignments) != 1 or not isinstance(assignments[0], ast.Assign) or len(assignments[0].targets) != 1:
            raise ValueError(
                "changed_data is assigned in a way that the command cannot rewrite. Keep a single "
                "`changed_data = [...]` assignment, then run the command again."
            )
        node = assignments[0]
        lines = source.splitlines(keepends=True)
        lines[node.lineno - 1 : node.end_lineno] = [
            format_changed_data(updated, filepath, stderr=stderr, dry_run=dry_run)
        ]
        return "".join(lines)

    return update


# The current copied workflow functions read the event tables that this migration creates. #741 replaces this
# check with a project setting that names the migrations to leave alone.
REQUIRED_WORKFLOW_MIGRATION = ("vueda_workflow", "0008_initialstateevent_objectstateevent_stateevent_and_more")


def requires_workflow_events(loader, migration_key):
    """Return whether ``REQUIRED_WORKFLOW_MIGRATION`` comes before ``migration_key`` in ``loader``'s graph.

    It follows indirect dependencies, and it accepts a squashed migration that replaces the required one. A
    refreshed migration that ran before that migration on an empty database would fail there.
    """
    ancestors = set(loader.graph.forwards_plan(migration_key)) - {migration_key}
    required = REQUIRED_WORKFLOW_MIGRATION
    return required in ancestors or any(required in loader.disk_migrations[key].replaces for key in ancestors)
