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
        validation_errors = []

        match data["process_id"]:
            case 1:
                validation_errors.append(VuedaValidationError("Test Error 1"))
                validation_errors.append(VuedaValidationError("Test Warning 1", is_warning=True))
                validation_errors.append(VuedaValidationError("Test Error 2"))
                validation_errors.append(VuedaValidationError("Test Warning 2", is_warning=True))
            case 2:
                validation_errors.append(VuedaValidationError("Test Error 1"))
                validation_errors.append(VuedaValidationError("Test Error 2"))
            case 3:
                validation_errors.append(VuedaValidationError("Test Warning 1", is_warning=True))
                validation_errors.append(VuedaValidationError("Test Warning 2", is_warning=True))

        raise VuedaValidationError(validation_errors)
