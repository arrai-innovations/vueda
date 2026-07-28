from rest_framework import serializers

from tests.employee.serializers import EmployeeSerializer
from tests.timesheet.models import Timesheet
from tests.timesheet.models import TimesheetEntry
from vueda.core.serializers import ExcludeFieldsSerializerMixin
from vueda.core.serializers import VuedaHistorySerializer


class TimesheetEntrySerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = TimesheetEntry
        fields = ["id", "timesheet", "date", "hours"] + VuedaHistorySerializer.Meta.fields


class TimesheetSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = Timesheet
        fields = ["id", "period_start", "period_end", "employee", "supervisor"] + VuedaHistorySerializer.Meta.fields

        expandable_fields = {
            "timesheet_entry": (TimesheetEntrySerializer, {"many": True}),
            "employee": (
                EmployeeSerializer,
                {},
            ),
            "supervisor": (
                EmployeeSerializer,
                {},
            ),
            "foo": (serializers.SerializerMethodField, {"read_only": True}),
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)

    def get_foo(self, instance):
        return "bar"


class TimesheetSerializerExclude(ExcludeFieldsSerializerMixin, VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = Timesheet
        fields = [
            "id",
            "period_start",
            "period_end",
            "employee",
            "supervisor",
        ] + VuedaHistorySerializer.Meta.fields
        exclude_update_fields = ["employee"]
        exclude_create_fields = ["supervisor"]
