from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers

from tests.models import Timesheet
from vueda.core.serializers.__init__ import NoExtraFieldsSerializerMixin


class TimesheetSerializer(NoExtraFieldsSerializerMixin, FlexFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Timesheet
        fields = "__all__"
