from typing import Optional
from typing import Union

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import F
from django.db.models import Q
from django.db.models import Value
from django.db.models.functions import Cast
from django.db.models.functions import Concat
from django.db.models.functions import Extract
from django.db.models.functions import LPad

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaBaseModel
from vueda.core.permissions import BaseRowLevelPermissions
from vueda.history.models import SimpleHistoryModelMixin
from vueda.user.models import AbstractVUEDAUser


class User(AbstractVUEDAUser):
    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "users"


class Employee(SimpleHistoryModelMixin, VuedaBaseModel):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    employee_number = models.CharField(max_length=255)

    formatted_name = models.GeneratedField(
        expression=Cast(F("employee_number"), output_field=models.CharField()),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        default_related_name = "employees"


class Timesheet(SimpleHistoryModelMixin, VuedaBaseModel):
    period_start = models.DateField()
    period_end = models.DateField()
    employee = models.ForeignKey("Employee", on_delete=models.CASCADE)
    supervisor = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, null=True, related_name="timesheet_supervisors"
    )

    # noqa T101 - TODO: Add 'employee__employee_number' to the beginning of the generated field.
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

    class Meta(BaseModelMeta):
        default_related_name = "timesheets"

    def __str__(self):
        return (
            f"Timesheet for the employee: {self.employee.employee_number} on {self.period_start} to {self.period_end}"
        )


class TimesheetEntry(SimpleHistoryModelMixin, VuedaBaseModel):
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

    class Meta(BaseModelMeta):
        default_related_name = "timesheet_entries"


class Product(SimpleHistoryModelMixin, VuedaBaseModel):
    name = models.CharField(max_length=255)
    available_for_sale = models.BooleanField(db_default=True)
    buzz_words = ArrayField(models.CharField(max_length=255, blank=True), null=True)

    class Meta(SimpleHistoryModelMixin.Meta, VuedaBaseModel.Meta):
        default_related_name = "products"

    class RowLevelPermissions(BaseRowLevelPermissions):
        @classmethod
        def check_instance(cls, model, obj, perm, user, perm_type) -> Optional[bool]:
            """
            True if the user has the permission, False if the user does not have the permission, None if the check is not
            applicable due to there being no row level permissions for the model.
            """
            if user.is_superuser:
                return None

            elif user.has_perm("tests.purchase_product"):
                return obj.available_for_sale

            elif user.has_perm("tests.manage_product"):
                return True

            return False

        @classmethod
        def check_queryset(cls, queryset, perm, user, perm_type) -> Union[Q, bool, None]:
            """
            Return of None means do not filter based on row level permissions.
            Return of True means the user has the permission without needing to check the rows.
            Return of False means the user does not have the permission, and we can stop checking.
            Return of Q means we need to filter the rows based on the row level permissions.
            """
            if user.is_superuser:
                return None

            elif user.has_perm("tests.purchase_product"):
                return Q(available_for_sale=True)

            elif user.has_perm("tests.manage_product"):
                return True

            return False

    def __str__(self):
        return self.name
