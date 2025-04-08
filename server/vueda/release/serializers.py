from vueda.core.serializers import VuedaSerializer
from vueda.release.model import ReleaseNote


class ReleaseNoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = ReleaseNote
        fields = [
            "id",
            "title",
            "notes",
            "date",
        ] + VuedaSerializer.Meta.fields
