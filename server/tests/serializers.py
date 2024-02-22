from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers as drf_serializers

from tests.models import Timesheet
from vueda.core.serializers import NoExtraFieldsSerializerMixin


class TimesheetSerializer(NoExtraFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer):
    class Meta:
        model = Timesheet
        # fields = "__all__"
        fields = ["id", "period_start", "period_end", "employee"]
