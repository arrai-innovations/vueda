import rest_framework.serializers as drf_serializers

from vueda.history.fields import HistoricalRecordField
from vueda.history.fields import filter_fields_for_flexlike_on_historical_records


class SimpleHistorySerializerMixin(metaclass=drf_serializers.SerializerMetaclass):
    current_history_id = drf_serializers.IntegerField(read_only=True)

    class Meta:
        fields = ["current_history_id"]
        expandable_fields = {
            "history": (
                HistoricalRecordField,
                {"read_only": True},
            ),
            "first_history_entry": (
                drf_serializers.SerializerMethodField,
                {"read_only": True},
            ),
            "last_history_entry": (
                drf_serializers.SerializerMethodField,
                {"read_only": True},
            ),
        }

    def get_first_history_entry(self, data):
        value_fields = filter_fields_for_flexlike_on_historical_records(self, "first_history_entry", data.__class__)
        if not value_fields:
            return {}
        return data.history.values(*value_fields).first()

    def get_last_history_entry(self, data):
        value_fields = filter_fields_for_flexlike_on_historical_records(self, "last_history_entry", data.__class__)
        if not value_fields:
            return {}
        return data.history.values(*value_fields).first()

    def return_annotated_instance(self, instance):
        # return annotated instance for current_history_id
        annotated_instance = self.context["view"].get_queryset().filter(id=instance.id).first()
        # nested writable reuses the same serializer class for creating and updating nested models.
        return annotated_instance if type(annotated_instance) is type(instance) else instance

    def create(self, validated_data):
        created_instance = super().create(validated_data)
        return self.return_annotated_instance(created_instance)

    def update(self, instance, validated_data):
        updated_instance = super().update(instance, validated_data)
        return self.return_annotated_instance(updated_instance)
