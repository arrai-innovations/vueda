"""The published shape of the action-grouped history response.

These serializers render already-assembled dictionaries. They exist so the response has one
declared shape that OpenAPI can describe, rather than a hand-built payload the schema cannot see.
"""

__all__ = (
    "HistoryActionGroupSerializer",
    "HistoryChangeSerializer",
    "HistoryEventSerializer",
    "HistoryReferenceSerializer",
)

from rest_framework import serializers


class HistoryReferenceSerializer(serializers.Serializer):
    """A row another row points at. ``missing`` says the referenced row is gone.

    ``display`` is the referent's name now, not its name when the event happened, and the client
    owns the wording for an absent one.
    """

    id = serializers.JSONField()
    display = serializers.CharField(allow_null=True)
    missing = serializers.BooleanField()


class HistoryChangeSerializer(serializers.Serializer):
    """One field's before and after. A field holding a reference carries a reference on each side."""

    field = serializers.CharField()
    old = serializers.JSONField(allow_null=True)
    new = serializers.JSONField(allow_null=True)


class HistoryEventSerializer(serializers.Serializer):
    """One write to one row, named by the tracked model rather than the event model."""

    id = serializers.CharField()
    model = serializers.CharField()
    object_id = serializers.CharField(allow_null=True)
    relation = serializers.ChoiceField(choices=("self", "related"))
    type = serializers.CharField()
    recorded_at = serializers.DateTimeField()
    changes = HistoryChangeSerializer(many=True)


class HistoryActionGroupSerializer(serializers.Serializer):
    """One user action and the visible events it produced.

    ``kind`` is an open vocabulary. A client must render a value it does not recognize rather than
    fail, because a later feature may record a new one.
    """

    id = serializers.CharField()
    action_id = serializers.UUIDField(allow_null=True)
    recorded_at = serializers.DateTimeField()
    kind = serializers.CharField(allow_null=True)
    label = serializers.CharField(allow_null=True)
    actor = HistoryReferenceSerializer(allow_null=True)
    events = HistoryEventSerializer(many=True)
