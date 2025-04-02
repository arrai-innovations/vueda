from vueda.history.serializers.mixins import HistoricalModelSerializerMixin


class DynamicHistoricalSerializer(HistoricalModelSerializerMixin):
    """
    This serializer dynamically includes only the changed fields from the original instance and historical fields.
    """

    def __init__(self, *args, **kwargs):
        self.model_serializer = kwargs.pop("model_serializer_class")
        historical_instance = kwargs.get("instance")
        self.different_fields = kwargs.pop("different_fields", [])

        super(DynamicHistoricalSerializer, self).__init__(*args, **kwargs)

        if historical_instance and self.different_fields:
            model_serializer = self.model_serializer(historical_instance)
            for field_name in self.different_fields:
                model_field = model_serializer.fields[field_name]
                if hasattr(model_field, "source") and model_field.source == field_name:
                    model_field.source = None  # Remove redundant `source`
                self.fields[field_name] = model_field
