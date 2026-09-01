from tests.timesheet import filtersets
from tests.timesheet import models
from tests.timesheet import serializers
from vueda.core import viewsets


class TimesheetViewSet(viewsets.VuedaHistoryViewSet):
    queryset = models.Timesheet.objects.all()
    serializer_class = serializers.TimesheetSerializer
    filterset_class = filtersets.TimesheetFilterSet
    permit_list_expands = ["employee", "supervisor"]


class TimesheetEntryViewSet(viewsets.VuedaHistoryViewSet):
    queryset = models.TimesheetEntry.objects.all()
    serializer_class = serializers.TimesheetEntrySerializer
    column_totals = ["hours"]


class TimesheetDataViewSet(viewsets.VuedaReadOnlyViewSet):
    queryset = models.TimesheetData.objects.all()
    serializer_class = serializers.TimesheetDataSerializer
    ordering_fields = ["formatted_name"]
