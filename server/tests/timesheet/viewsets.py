from rest_framework.permissions import IsAuthenticated

from tests.timesheet import models
from tests.timesheet import serializers
from vueda.core import viewsets
from vueda.history.viewsets import VuedaHistoryViewSet


class TimesheetViewSet(VuedaHistoryViewSet):
    queryset = models.Timesheet.objects.all()
    serializer_class = serializers.TimesheetSerializer
    permit_list_expands = ["employee", "supervisor"]


class TimesheetWithAliasedSupervisorViewSet(viewsets.VuedaViewSet):
    queryset = models.Timesheet.objects.all()
    serializer_class = serializers.TimesheetWithAliasedSupervisorSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["manager"]


class TimesheetWithPrefetchedEntriesViewSet(viewsets.VuedaViewSet):
    # Hand-declares its own prefetch for "timesheet_entries", the same relation "entries" (below)
    # also expands -- reproducing the crash filter_new_prefetch_lookups exists to prevent.
    queryset = models.Timesheet.objects.prefetch_related("timesheet_entries")
    serializer_class = serializers.TimesheetWithPrefetchedEntriesSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["entries"]


class TimesheetEntryViewSet(VuedaHistoryViewSet):
    queryset = models.TimesheetEntry.objects.all()
    serializer_class = serializers.TimesheetEntrySerializer
    column_totals = ["hours"]


class TimesheetDataViewSet(viewsets.VuedaReadOnlyViewSet):
    queryset = models.TimesheetData.objects.all()
    serializer_class = serializers.TimesheetDataSerializer
    ordering_fields = ["formatted_name"]
