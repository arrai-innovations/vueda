from rest_framework import serializers

from tests.models import Employee
from tests.models import Product
from tests.models import Timesheet
from tests.models import TimesheetEntry
from vueda.core.serializers import ExcludeFieldsSerializerMixin
from vueda.core.serializers import VuedaSerializerMixin
from vueda.history.serializers.mixins import SimpleHistorySerializerMixin


class EmployeeSerializer(VuedaSerializerMixin):

    class Meta:
        model = Employee
        fields = ["id", "user", "employee_number"] + SimpleHistorySerializerMixin.Meta.fields


class TimesheetEntrySerializer(VuedaSerializerMixin):
    class Meta:
        model = TimesheetEntry
        fields = ["id", "timesheet", "date", "hours"] + SimpleHistorySerializerMixin.Meta.fields


class TimesheetSerializer(VuedaSerializerMixin):
    class Meta:
        model = Timesheet
        fields = ["id", "period_start", "period_end", "employee"] + SimpleHistorySerializerMixin.Meta.fields

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


class TimesheetSerializerExclude(ExcludeFieldsSerializerMixin, VuedaSerializerMixin):
    class Meta:
        model = Timesheet
        fields = [
            "id",
            "period_start",
            "period_end",
            "employee",
            "supervisor",
        ] + SimpleHistorySerializerMixin.Meta.fields
        exclude_update_fields = ["employee"]
        exclude_create_fields = ["supervisor"]


class ProductSerializer(VuedaSerializerMixin):
    buzz_words = serializers.ListField(child=serializers.CharField())

    class Meta:
        model = Product
        fields = ["id", "name", "available_for_sale", "buzz_words"] + SimpleHistorySerializerMixin.Meta.fields
