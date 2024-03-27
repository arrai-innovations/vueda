from rest_framework import serializers

from tests.models import Employee
from tests.models import Product
from tests.models import Timesheet
from tests.models import TimesheetEntry
from vueda.core.serializers import ExcludeFieldsSerializerMixin
from vueda.core.serializers import VuedaHistorySerializer


class EmployeeSerializer(VuedaHistorySerializer):

    class Meta(VuedaHistorySerializer.Meta):
        model = Employee
        fields = ["id", "user", "employee_number"] + VuedaHistorySerializer.Meta.fields


class TimesheetEntrySerializer(VuedaHistorySerializer):
    class Meta:
        model = TimesheetEntry
        fields = ["id", "timesheet", "date", "hours"] + VuedaHistorySerializer.Meta.fields


class TimesheetSerializer(VuedaHistorySerializer):
    class Meta:
        model = Timesheet
        fields = ["id", "period_start", "period_end", "employee"] + VuedaHistorySerializer.Meta.fields

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


class ProductSerializer(VuedaHistorySerializer):
    buzz_words = serializers.ListField(child=serializers.CharField())

    class Meta(VuedaHistorySerializer.Meta):
        model = Product
        fields = ["id", "name", "available_for_sale", "buzz_words"] + VuedaHistorySerializer.Meta.fields
