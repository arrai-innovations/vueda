from django.db import models

from vueda.core.models import AbstractVUEDAUser
from vueda.core.models import BaseModelMeta
from vueda.history.models import SimpleHistoryModelMixin


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
