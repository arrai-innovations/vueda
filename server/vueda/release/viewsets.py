from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import VuedaViewSet
from vueda.release.filtersets import ReleaseNoteFilterSet
from vueda.release.models import ReleaseNote
from vueda.release.serializers import ReleaseNoteSerializer


class ReleaseNoteViewSet(VuedaViewSet):
    queryset = ReleaseNote.objects.all()
    serializer_class = ReleaseNoteSerializer
    permission_classes = [ObjectPermissions]
    search_fields = ["title"]
    ordering_fields = ["date"]
    filterset_class = ReleaseNoteFilterSet
