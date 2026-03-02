"""Serializer for release note model instances."""

__all__ = ("ReleaseNoteSerializer",)

from vueda.core.serializers import VuedaSerializer
from vueda.release.models import ReleaseNote


class ReleaseNoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = ReleaseNote
        fields = [
            "id",
            "title",
            "notes",
            "date",
        ] + VuedaSerializer.Meta.fields
