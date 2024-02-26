from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.history.models import SimpleHistoryModelMixin
from vueda.user.models import AbstractVUEDAUser


class User(AbstractVUEDAUser):
    pass

    class Meta(BaseModelMeta):
        pass


class Employee(SimpleHistoryModelMixin, models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    employee_number = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        pass


class Timesheet(SimpleHistoryModelMixin, models.Model):
    period_start = models.DateField()
    period_end = models.DateField()
    employee = models.ForeignKey("Employee", on_delete=models.CASCADE)

    class Meta(BaseModelMeta):
        pass


class TimesheetEntry(SimpleHistoryModelMixin, models.Model):
    timesheet = models.ForeignKey("Timesheet", on_delete=models.CASCADE)
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta(BaseModelMeta):
        pass
