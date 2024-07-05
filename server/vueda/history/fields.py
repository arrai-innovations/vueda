from django.db.models import ForeignObjectRel
from django.db.models.fields.related import RelatedField
from rest_framework import serializers as drf_serializers
from simple_history.models import HistoricalChanges


def filter_fields_for_flexlike_on_historical_records(serializer, our_field_name, model):
    if issubclass(model, HistoricalChanges):
        history_model = model
    else:
        history_model = getattr(model, model._meta.simple_history_manager_attribute).model
    fields = history_model._meta.get_fields()
    value_fields = [field for field in fields if not isinstance(field, (RelatedField, ForeignObjectRel))]
    fk_fields = [field for field in fields if isinstance(field, (RelatedField, ForeignObjectRel))]
    value_fields = [field.name for field in value_fields] + [field.attname for field in fk_fields]
    # add in simple history fields
    value_fields += ["history_id", "history_date", "history_type", "history_user_id"]
    if hasattr(serializer, "_flex_options_rep_only"):
        requested_fields = [
            x.replace(our_field_name + ".", "")
            for x in serializer._flex_options_rep_only["fields"]
            if x.startswith(our_field_name + ".")
        ]
        requested_omit = [
            x.replace("field_name.", "")
            for x in serializer._flex_options_rep_only["omit"]
            if x.startswith(our_field_name + ".")
        ]
        if requested_fields:
            value_fields = [field for field in value_fields if field in requested_fields]
            if not value_fields:
                return None
        if requested_omit:
            value_fields = [field for field in value_fields if field not in requested_omit]
            if not value_fields:
                return None
    return value_fields


class HistoricalRecordField(drf_serializers.ListField):
    child = drf_serializers.DictField()

    def to_representation(self, data):
        value_fields = filter_fields_for_flexlike_on_historical_records(self, "history", data.model)
        if not value_fields:
            return []
        return super().to_representation(data.values(*value_fields))
