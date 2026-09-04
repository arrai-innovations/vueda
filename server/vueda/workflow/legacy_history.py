"""Copy VUEDA's django-simple-history workflow rows into the pghistory event tables.

A shipped migration calls this. It reads the ``Historical*`` tables directly rather than walking
live objects, so the history of a workflow row someone deleted converts along with the rest.

One legacy row becomes one event under one action of its own. The source cannot prove that two rows
belonged to the same user action: a change reason is set in only two places, and neither identifies
one action. So the conversion invents no grouping. It carries what the source does say onto the
event's action metadata, which is where the change reason, the acting user, and the provenance land.
"""

__all__ = (
    "EVENT_LABELS",
    "LEGACY_MODEL_NAMES",
    "LEGACY_SOURCE",
    "TRIGGER_MIGRATION",
    "convert_legacy_workflow_history",
    "remove_converted_workflow_history",
)

import uuid

import pgtrigger
from django.db.migrations.recorder import MigrationRecorder


#: The workflow models whose ``Historical*`` tables can hold history older than the event tables.
LEGACY_MODEL_NAMES = (
    "Workflow",
    "WorkflowPermission",
    "State",
    "StatePermission",
    "InitialState",
    "Transition",
    "TransitionPermission",
    "TransitionSource",
    "ObjectState",
)

#: simple-history's type codes, in the vocabulary pghistory's own triggers write.
EVENT_LABELS = {"+": "insert", "~": "update", "-": "delete"}

#: Recorded on every action this conversion writes, so the reverse finds exactly its own rows.
LEGACY_SOURCE = "simple-history"

#: The change reason a generated workflow migration writes. It names the migration that made the
#: change, which is the one thing a legacy reason says about where a row came from.
MIGRATION_REASON_PREFIX = "Workflow Migration - "

#: The migration that installs the workflow triggers. Anything written after it applied was already
#: recorded by those triggers, so converting the matching legacy row would record it a second time.
TRIGGER_MIGRATION = "0008_initialstateevent_objectstateevent_stateevent_and_more"

#: Rows per round trip to the database. Large enough to keep the conversion off one row at a time,
#: small enough that a long history does not build the whole event list in memory first.
BATCH_SIZE = 500


def _recording_started_at():
    """Return when the workflow triggers were installed, or ``None`` when they were not.

    A write after that moment produced an event of its own, and it kept writing a ``Historical*`` row
    as well until that side was removed. Converting those rows would record the same write twice, so
    the conversion stops at this line. It is an exact boundary read from the migration record, not a
    guess from how close two timestamps are.
    """
    return (
        MigrationRecorder.Migration.objects.filter(app="vueda_workflow", name=TRIGGER_MIGRATION)
        .values_list("applied", flat=True)
        .first()
    )


def _copied_field_names(historical_model, event_model):
    """Return the field names both models hold, which are the tracked model's own columns.

    pghistory copies the tracked model's concrete fields onto the event model and adds its ``pgh_``
    columns. simple-history copies the same fields and adds its own. The intersection, less the
    ``pgh_`` columns, is the row itself.
    """
    historical = {field.attname for field in historical_model._meta.concrete_fields}
    return sorted(
        field.attname
        for field in event_model._meta.concrete_fields
        if not field.attname.startswith("pgh_") and field.attname in historical
    )


def _already_recorded(event_model):
    """Return the events the table already holds, keyed by what identifies a converted row.

    This is what keeps a second run from copying the same history twice, and what lets a project
    that already converted its own object-state history keep the events it has.
    """
    return {
        (obj_id, label, created_at)
        for obj_id, label, created_at in event_model.objects.values_list(
            "pgh_obj_id", "pgh_label", "pgh_created_at"
        ).iterator(chunk_size=BATCH_SIZE)
    }


def _metadata_for(record):
    """Return the action metadata for one legacy row.

    ``kind`` records where the write came from. A reason naming a workflow migration is the only
    provenance the source carries, so those rows say ``migration`` and the rest say ``legacy``. The
    reason itself is kept whether or not it named anything, because discarding it would lose the
    only description some of these writes have.
    """
    reason = (record.history_change_reason or "").strip()
    metadata = {
        "action": reason or "workflow history",
        "kind": "migration" if reason.startswith(MIGRATION_REASON_PREFIX) else "legacy",
        "source": LEGACY_SOURCE,
    }
    if record.history_user_id is not None:
        metadata["user"] = record.history_user_id
    if reason:
        metadata["reason"] = reason
    return metadata


def _convert_one_model(apps, name, recording_started_at):
    """Copy one model's legacy history, returning how many events it wrote."""
    historical_model = apps.get_model("vueda_workflow", f"Historical{name}")
    event_model = apps.get_model("vueda_workflow", f"{name}Event")
    context_model = apps.get_model("pghistory", "Context")

    recorded = _already_recorded(event_model)
    field_names = _copied_field_names(historical_model, event_model)

    written = 0
    contexts = []
    events = []
    recorded_at = []

    def flush():
        nonlocal written, contexts, events, recorded_at
        if not events:
            return
        context_model.objects.bulk_create(contexts, batch_size=BATCH_SIZE)
        created = event_model.objects.bulk_create(events, batch_size=BATCH_SIZE)
        # pgh_created_at is auto_now_add, so the insert stamps now and the legacy time has to be
        # written afterwards. Updating an event table needs the append-only trigger stood down.
        for event, moment in zip(created, recorded_at, strict=True):
            event.pgh_created_at = moment
        with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
            event_model.objects.bulk_update(created, ["pgh_created_at"], batch_size=BATCH_SIZE)
        written += len(created)
        contexts, events, recorded_at = [], [], []

    legacy_rows = historical_model.objects.order_by("history_id")
    if recording_started_at is not None:
        legacy_rows = legacy_rows.filter(history_date__lt=recording_started_at)

    for record in legacy_rows.iterator(chunk_size=BATCH_SIZE):
        label = EVENT_LABELS.get(record.history_type)
        if label is None:
            continue

        key = (record.id, label, record.history_date)
        if key in recorded:
            continue
        recorded.add(key)

        context = context_model(id=uuid.uuid4(), metadata=_metadata_for(record))
        contexts.append(context)
        events.append(
            event_model(
                pgh_label=label,
                pgh_obj_id=record.id,
                pgh_context_id=context.id,
                **{field: getattr(record, field) for field in field_names},
            )
        )
        recorded_at.append(record.history_date)

        if len(events) >= BATCH_SIZE:
            flush()

    flush()
    return written


def convert_legacy_workflow_history(apps, schema_editor):
    """Copy every workflow model's simple-history rows into its event table.

    Only history older than the triggers is copied. A later write recorded its own event, so its
    legacy row is already represented and copying it would duplicate the write.

    Safe to run again: a legacy row whose event is already there is skipped, matched on the object,
    the event type, and the moment it was recorded.
    """
    recording_started_at = _recording_started_at()
    for name in LEGACY_MODEL_NAMES:
        _convert_one_model(apps, name, recording_started_at)


def remove_converted_workflow_history(apps, schema_editor):
    """Delete the events this conversion wrote, leaving events recorded by the triggers alone.

    The actions the conversion created carry its own source marker, which is what separates its rows
    from a write the database recorded itself.
    """
    context_model = apps.get_model("pghistory", "Context")
    converted = context_model.objects.filter(metadata__source=LEGACY_SOURCE)

    for name in LEGACY_MODEL_NAMES:
        event_model = apps.get_model("vueda_workflow", f"{name}Event")
        with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
            event_model.objects.filter(pgh_context_id__in=converted.values("id")).delete()

    converted.delete()
