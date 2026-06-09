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
