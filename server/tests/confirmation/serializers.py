from rest_framework import serializers

from tests.confirmation import models
from vueda.core.exceptions import VuedaValidationError
from vueda.core.serializers import VuedaSerializer


class ThingSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Thing
        fields = [
            "id",
            "name",
            "count",
        ] + VuedaSerializer.Meta.fields

    def validate(self, data):
        # A blocking error: returns 400 and is evaluated before any warnings are computed.
        if data.get("name") == "blocked":
            raise VuedaValidationError({"name": ["Name may not be 'blocked'."]})
        return data

    def get_warnings(self):
        # Advisory, non-blocking: a negative count is unusual but allowed once confirmed.
        warnings = {}
        if self.validated_data.get("count", 0) < 0:
            warnings["count"] = ["A negative count is unusual."]
        return warnings


class AdjustCountSerializer(serializers.Serializer):
    # Input for the adjust_count action; exercises the explicit gate_warnings call after is_valid.
    amount = serializers.IntegerField()

    def validate_amount(self, value):
        # A blocking error: returns 400 before the action body ever reaches the warning gate.
        if value == 0:
            raise VuedaValidationError(["Amount may not be zero."])
        return value


class GadgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Gadget
        fields = [
            "id",
            "name",
            "is_active",
        ] + VuedaSerializer.Meta.fields
