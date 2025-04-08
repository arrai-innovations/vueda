from vueda.core.filters import VuedaFilterSet
from vueda.release.model import ReleaseNote


class ReleaseNoteFilterSet(VuedaFilterSet):
    class Meta:
        model = ReleaseNote
        fields = ["id", "date", "title"]
