from rest_framework import serializers

from tests.models import Timesheet


class TimesheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timesheet
        fields = "__all__"
