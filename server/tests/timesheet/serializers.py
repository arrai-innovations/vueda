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


class TimesheetEntryForTimesheetSerializer(VuedaSerializer):
    """A timesheet entry written through its timesheet's expand, which sets the entry's timesheet."""

    class Meta(VuedaSerializer.Meta):
        model = models.TimesheetEntry
        fields = ["id", "date", "hours"] + VuedaSerializer.Meta.fields


class TimesheetLockedExpandsSerializer(ExcludeFieldsSerializerMixin, VuedaSerializer):
    """
    Expands each field that a write may not set, plus a reverse relation that only its plain field locks.

    ``exclude_update_fields`` locks ``employee`` and ``exclude_create_fields`` locks ``supervisor``.
    ``manager`` expands ``supervisor`` under another name. ``approved_by`` and the many-to-many ``reviewers``
    are ``editable=False``. ``approver`` expands ``approved_by`` with ``read_only: False``, which unlocks it.
    ``timesheet_entries`` is in ``Meta.read_only_fields``, which locks only its list of primary keys. It is also
    in ``exclude_create_fields``, which locks its expand on a create.
    """

    class Meta(VuedaSerializer.Meta):
        model = models.Timesheet
        fields = [
            "id",
            "period_start",
            "period_end",
            "employee",
            "supervisor",
            "approved_by",
            "reviewers",
            "timesheet_entries",
        ] + VuedaSerializer.Meta.fields
        read_only_fields = ["timesheet_entries"]
        exclude_update_fields = ["employee"]
        exclude_create_fields = ["supervisor", "timesheet_entries"]
        expandable_fields = {
            "employee": (EmployeeSerializer, {}),
            "supervisor": (EmployeeSerializer, {}),
            "manager": (EmployeeSerializer, {"source": "supervisor"}),
            "approved_by": (EmployeeSerializer, {}),
            "approver": (EmployeeSerializer, {"source": "approved_by", "read_only": False}),
            "reviewers": (EmployeeSerializer, {"many": True}),
            "timesheet_entries": (TimesheetEntryForTimesheetSerializer, {"many": True}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
