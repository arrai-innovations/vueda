from tests.logging import models
from vueda.core.exceptions import VuedaValidationError
from vueda.core.serializers import VuedaSerializer


class LogRecordsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.LogRecords
        fields = [
            "id",
            "process_id",
        ] + VuedaSerializer.Meta.fields

    def validate(self, data):
        if data["process_id"] == 1:
            raise VuedaValidationError([VuedaValidationError("Test Error 1"), VuedaValidationError("Test Error 2")])
        return data

    def get_warnings(self):
        if self.validated_data.get("process_id") == 2:  # noqa: PLR2004
            return {"non_field_errors": ["Test Confirmation Warning"]}
        return {}
