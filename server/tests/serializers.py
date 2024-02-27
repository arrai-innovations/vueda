from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers

from tests.models import Employee
from tests.models import Timesheet
from tests.models import TimesheetEntry
from vueda.core.serializers import FlexFieldsWriteableNestedSerializerMixin
from vueda.core.serializers import NoExtraFieldsSerializerMixin


class EmployeeSerializer(NoExtraFieldsSerializerMixin, FlexFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["id", "user", "employee_number"]


class TimesheetEntrySerializer(NoExtraFieldsSerializerMixin, FlexFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ["id", "timesheet", "date", "hours"]


class TimesheetSerializer(
    NoExtraFieldsSerializerMixin,
    FlexFieldsWriteableNestedSerializerMixin,
    FlexFieldsSerializerMixin,
    serializers.ModelSerializer,
):
    class Meta:
        model = Timesheet
        fields = ["id", "period_start", "period_end", "employee"]

        expandable_fields = {
            "timesheet_entry": (TimesheetEntrySerializer, {"many": True}),
            "employee": (
                EmployeeSerializer,
                {},
            ),
            "foo": (serializers.SerializerMethodField, {"read_only": True}),
        }

    def get_foo(self, instance):
        return "bar"
