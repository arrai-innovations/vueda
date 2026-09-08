from django.db import models
from django.db.models import F
from django.db.models import Value
from django.db.models.functions import Cast
from django.db.models.functions import Concat
from django.db.models.functions import Extract

from vueda.core.models import VuedaModel


class Timesheet(VuedaModel):
    period_start = models.DateField()
    period_end = models.DateField()
    employee = models.ForeignKey("employee.Employee", on_delete=models.CASCADE)
    supervisor = models.ForeignKey(
        "employee.Employee", on_delete=models.CASCADE, null=True, related_name="timesheet_supervisors"
    )

    formatted_name = None
    formatted_name_lookup_expression = "data__formatted_name"

    class Meta(VuedaModel.Meta):
        default_related_name = "timesheets"
        ordering = ["period_start", "employee__employee_number"]

    def __str__(self):
        return (
            f"Timesheet for the employee: {self.employee.employee_number} on {self.period_start} to {self.period_end}"
        )


class TimesheetData(models.Model):
    timesheet = models.OneToOneField(Timesheet, on_delete=models.DO_NOTHING, related_name="data")
    formatted_name = models.CharField()

    class Meta:
        managed = False
        db_table = "timesheet_data"


class TimesheetEntry(VuedaModel):
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

    class Meta(VuedaModel.Meta):
        default_related_name = "timesheet_entries"
        ordering = ["date"]
