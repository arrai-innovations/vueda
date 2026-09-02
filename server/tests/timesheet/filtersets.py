from tests.timesheet import models
from vueda.core.filters import VuedaFilterSet


class TimesheetFilterSet(VuedaFilterSet):
    class Meta:
        model = models.Timesheet
        fields = ["id"]
