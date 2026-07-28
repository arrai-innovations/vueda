from tests.timesheet.models import Timesheet
from tests.timesheet.models import TimesheetEntry
from tests.timesheet.serializers import TimesheetEntrySerializer
from tests.timesheet.serializers import TimesheetSerializer
from vueda.core.viewsets import VuedaHistoryViewSet


class TimesheetViewSet(VuedaHistoryViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
    permit_list_expands = ["employee", "supervisor"]


class TimesheetEntryViewSet(VuedaHistoryViewSet):
    queryset = TimesheetEntry.objects.all()
    serializer_class = TimesheetEntrySerializer
    column_totals = ["hours"]
