from vueda.core.filters import VuedaFilterSet
from vueda.release.models import ReleaseNote


class ReleaseNoteFilterSet(VuedaFilterSet):
    class Meta:
        model = ReleaseNote
        fields = ["id", "date", "title"]
