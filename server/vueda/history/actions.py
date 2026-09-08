"""Assemble the action-grouped history response from visible event rows.

The database decides what is visible and how events group. This module turns those rows into the
published shape: an action, its events, and each event's field changes. It resolves every
referenced row and every acting user in one query per model, so a page costs the same whether it
carries one change or a thousand.
"""

__all__ = ("build_action_groups",)

from collections import defaultdict

from django.apps import apps
from django.contrib.auth import get_user_model

from vueda.core.formatted_name import annotate_formatted_name


#: pghistory labels its triggers by operation. The response publishes readable names instead.
EVENT_TYPES = {"insert": "created", "update": "updated", "delete": "deleted"}


def _tracked_model(label):
    return apps.get_model(label)


def _fields_by_column(model):
    """Map each event-table column back to the model field that produced it."""
    return {field.attname: field for field in model._meta.concrete_fields}


def _display_of(instance):
    formatted_name = getattr(instance, "_get_formatted_name", None)
    if callable(formatted_name):
        return formatted_name() or str(instance)
    return str(instance)


class _References:
    """Collects referenced rows across a page, then resolves each model in one query."""

    def __init__(self):
        self._wanted = defaultdict(set)
        self._displays = {}

    def want(self, model, value):
        if value is not None:
            self._wanted[model._meta.label].add(value)

    def resolve(self):
        for label, ids in self._wanted.items():
            model = _tracked_model(label)
            queryset = annotate_formatted_name(model.objects.filter(pk__in=ids))
            self._displays[label] = {instance.pk: _display_of(instance) for instance in queryset}

    def value(self, model, value):
        """A reference the requester may see, or ``None`` when the field held no reference."""
        if value is None:
            return None
        display = self._displays.get(model._meta.label, {}).get(value)
        return {"id": value, "display": display, "missing": display is None}


def _changes_of(event, references, collect):
    """The per-field difference this event reports, as the response publishes it.

    An insert has no preceding snapshot and a delete repeats the one before it, so pghistory
    reports no difference for either and the list comes out empty. It is never filled in with
    invented removals.
    """
    diff = event.pgh_diff or {}
    if not diff:
        return []

    fields = _fields_by_column(_tracked_model(event.pgh_obj_model))
    changes = []
    for column, (old, new) in diff.items():
        field = fields.get(column)
        if field is None:
            continue
        if field.is_relation:
            related = field.related_model
            if collect:
                references.want(related, old)
                references.want(related, new)
                changes.append(None)
                continue
            changes.append(
                {"field": field.name, "old": references.value(related, old), "new": references.value(related, new)}
            )
        elif not collect:
            changes.append({"field": field.name, "old": old, "new": new})
    return [change for change in changes if change is not None]


def _actor_of(metadata, users):
    if not metadata:
        return None
    user_id = metadata.get("user")
    if user_id is None:
        return None
    display = users.get(user_id)
    return {"id": user_id, "display": display, "missing": display is None}


def build_action_groups(instance, groups, events):
    """Assemble one page of action groups.

    ``groups`` are the paginated group rows and ``events`` every visible event belonging to them,
    already ordered.
    """
    self_model = instance._meta.concrete_model._meta.label
    self_id = str(instance.pk)

    by_group = defaultdict(list)
    for event in events:
        by_group[event.group_key].append(event)

    # One pass to learn which rows and users the page mentions, so each model resolves once.
    references = _References()
    user_ids = set()
    for event in events:
        _changes_of(event, references, collect=True)
    for group in groups:
        first = by_group.get(group["group_key"], [])
        if first and first[0].pgh_context:
            user_id = first[0].pgh_context.get("user")
            if user_id is not None:
                user_ids.add(user_id)
    references.resolve()

    users = {}
    if user_ids:
        queryset = annotate_formatted_name(get_user_model().objects.filter(pk__in=user_ids))
        users = {user.pk: _display_of(user) for user in queryset}

    built = []
    for group in groups:
        members = by_group.get(group["group_key"], [])
        if not members:
            continue
        metadata = members[0].pgh_context or {}
        action_id = str(members[0].pgh_context_id) if members[0].pgh_context_id else None
        serialized = [
            {
                "id": f"{event.pgh_obj_model}:{event.pgh_id}",
                "model": event.pgh_obj_model,
                "object_id": event.pgh_obj_id,
                "relation": (
                    "self" if event.pgh_obj_model == self_model and event.pgh_obj_id == self_id else "related"
                ),
                "type": EVENT_TYPES.get(event.pgh_label, event.pgh_label),
                "recorded_at": event.pgh_created_at,
                "changes": _changes_of(event, references, collect=False),
            }
            for event in members
        ]
        built.append(
            {
                "id": action_id or serialized[0]["id"],
                "action_id": action_id,
                "recorded_at": group["recorded_at"],
                "kind": metadata.get("kind"),
                "label": metadata.get("action"),
                "actor": _actor_of(metadata, users),
                "events": serialized,
            }
        )
    return built
