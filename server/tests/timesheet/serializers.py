from rest_framework import serializers

from tests.employee.serializers import EmployeeSerializer
from tests.timesheet import models
from vueda.core.serializers import ExcludeFieldsSerializerMixin
from vueda.core.serializers import VuedaReadonlySerializer
from vueda.core.serializers import VuedaSerializer


class TimesheetEntrySerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.TimesheetEntry
        fields = ["id", "timesheet", "date", "hours"] + VuedaSerializer.Meta.fields


class TimesheetDataSerializer(VuedaReadonlySerializer):
    class Meta(VuedaReadonlySerializer.Meta):
        model = models.TimesheetData
        fields = ["id", "timesheet"] + VuedaSerializer.Meta.fields


class TimesheetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Timesheet
        fields = ["id", "period_start", "period_end", "employee", "supervisor"] + VuedaSerializer.Meta.fields

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
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)

    def get_foo(self, instance):
        return "bar"


class TimesheetWithAliasedSupervisorSerializer(TimesheetSerializer):
    class Meta(TimesheetSerializer.Meta):
        expandable_fields = dict(TimesheetSerializer.Meta.expandable_fields)
        expandable_fields["manager"] = (EmployeeSerializer, {"source": "supervisor"})


class TimesheetWithPrefetchedEntriesSerializer(TimesheetSerializer):
    class Meta(TimesheetSerializer.Meta):
        expandable_fields = dict(TimesheetSerializer.Meta.expandable_fields)
        expandable_fields["entries"] = (TimesheetEntrySerializer, {"source": "timesheet_entries", "many": True})


class TimesheetWithAliasedEntriesSerializer(TimesheetSerializer):
    class Meta(TimesheetSerializer.Meta):
        expandable_fields = dict(TimesheetSerializer.Meta.expandable_fields)
        expandable_fields["entries"] = (TimesheetEntrySerializer, {"source": "timesheet_entries", "many": True})
        expandable_fields["entries_again"] = (TimesheetEntrySerializer, {"source": "timesheet_entries", "many": True})


class TimesheetSerializerExclude(ExcludeFieldsSerializerMixin, VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Timesheet
        fields = [
            "id",
            "period_start",
            "period_end",
            "employee",
            "supervisor",
        ] + VuedaSerializer.Meta.fields
        exclude_update_fields = ["employee"]
        exclude_create_fields = ["supervisor"]
