from django.db import models
from django.db.models import F
from django.db.models import Value
from django.db.models.functions import Cast
from django.db.models.functions import Concat
from django.db.models.functions import Extract
from django.db.models.functions import LPad

from vueda.history.models import VuedaHistoryModel


class Timesheet(VuedaHistoryModel):
    period_start = models.DateField()
    period_end = models.DateField()
    employee = models.ForeignKey("employee.Employee", on_delete=models.CASCADE)
    supervisor = models.ForeignKey(
        "employee.Employee", on_delete=models.CASCADE, null=True, related_name="timesheet_supervisors"
    )

    # TODO: Add 'employee__employee_number' to the beginning of the generated field.
    formatted_name = models.GeneratedField(
        expression=Concat(
            Value(" on "),
            Cast(Extract(F("period_start"), "year"), output_field=models.CharField()),
            Value("/"),
            LPad(Cast(Extract(F("period_start"), "month"), output_field=models.CharField()), 2, Value("0")),
            Value("/"),
            LPad(Cast(Extract(F("period_start"), "day"), output_field=models.CharField()), 2, Value("0")),
            Value(" to "),
            Cast(Extract(F("period_end"), "year"), output_field=models.CharField()),
            Value("/"),
            LPad(Cast(Extract(F("period_end"), "month"), output_field=models.CharField()), 2, Value("0")),
            Value("/"),
            LPad(Cast(Extract(F("period_end"), "day"), output_field=models.CharField()), 2, Value("0")),
        ),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(VuedaHistoryModel.Meta):
        default_related_name = "timesheets"
        ordering = ["period_start", "employee__employee_number"]

    def __str__(self):
        return (
            f"Timesheet for the employee: {self.employee.employee_number} on {self.period_start} to {self.period_end}"
        )


class TimesheetEntry(VuedaHistoryModel):
    timesheet = models.ForeignKey("Timesheet", on_delete=models.CASCADE)
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)

    formatted_name = models.GeneratedField(
        expression=Concat(
            Cast(Extract(F("date"), "year"), output_field=models.CharField()),
            Value("/"),
            Cast(Extract(F("date"), "month"), output_field=models.CharField()),
            Value("/"),
            Cast(Extract(F("date"), "day"), output_field=models.CharField()),
            Value(" - "),
            Cast(F("hours"), output_field=models.CharField()),
            Value(" hours"),
        ),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(VuedaHistoryModel.Meta):
        default_related_name = "timesheet_entries"
        ordering = ["date"]
