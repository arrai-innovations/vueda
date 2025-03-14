import rest_framework.serializers as drf_serializers
from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from vueda.history.fields import HistoricalRecordField
from vueda.history.fields import filter_fields_for_flexlike_on_historical_records


class SimpleHistorySerializerMixin(metaclass=drf_serializers.SerializerMetaclass):
    current_history_id = drf_serializers.IntegerField(read_only=True, label="Current History ID")

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

    def get_expandable_fields(self):
        from vueda.info.serializers import ModelInfoSerializer

        expandable_fields = super().get_expandable_fields()

        model = self.Meta.model
        history_model = model.history.model

        for expandable_field in expandable_fields:
            match expandable_field["name"]:
                case "history":
                    expandable_field["many"] = True
                    expandable_field["read_only"] = True
                    expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = {
                        "history_id": {
                            "label": "History ID",
                            "type_db": "AutoField",
                            "type_model": "AutoField",
                            "type_serializer": "IntegerField",
                            "read_only": True,
                            "pk": True,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type_db": "DateTimeField",
                            "type_model": "DateTimeField",
                            "type_serializer": "DateTimeField",
                            "read_only": True,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "read_only": True,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "read_only": True,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type_db": "ForeignKey",
                            "type_model": "ForeignKey",
                            "type_serializer": "PrimaryKeyRelatedField",
                            "read_only": True,
                        },
                        "history_user": {
                            "label": "History User",
                            "type_db": "ForeignKey",
                            "type_model": "ForeignKey",
                            "type_serializer": "PrimaryKeyRelatedField",
                            "read_only": True,
                            "model": "user",
                            "app_label": "user",
                            "choices": True,
                        },
                    }
                case "first_history_entry":
                    expandable_field["read_only"] = True
                    expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = {
                        "history_id": {
                            "label": "History ID",
                            "type_db": "AutoField",
                            "type_model": "AutoField",
                            "type_serializer": "IntegerField",
                            "read_only": True,
                            "pk": True,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type_db": "DateTimeField",
                            "type_model": "DateTimeField",
                            "type_serializer": "DateTimeField",
                            "read_only": True,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "read_only": True,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "read_only": True,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type_db": "ForeignKey",
                            "type_model": "ForeignKey",
                            "type_serializer": "PrimaryKeyRelatedField",
                            "read_only": True,
                        },
                        "history_user": {
                            "label": "History User",
                            "type_db": "ForeignKey",
                            "type_model": "ForeignKey",
                            "type_serializer": "PrimaryKeyRelatedField",
                            "read_only": True,
                        },
                    }
                case "last_history_entry":
                    expandable_field["read_only"] = True
                    expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = {
                        "history_id": {
                            "label": "History ID",
                            "type_db": "AutoField",
                            "type_model": "AutoField",
                            "type_serializer": "IntegerField",
                            "read_only": True,
                            "pk": True,
                        },
                        "history_date": {
                            "label": "History Date",
                            "type_db": "DateTimeField",
                            "type_model": "DateTimeField",
                            "type_serializer": "DateTimeField",
                            "read_only": True,
                        },
                        "history_change_reason": {
                            "label": "Change Reason",
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "read_only": True,
                        },
                        "history_type": {
                            "label": "History Type",
                            "type_db": "CharField",
                            "type_model": "CharField",
                            "type_serializer": "CharField",
                            "read_only": True,
                        },
                        "history_relation": {
                            "label": "In Relation To",
                            "type_db": "ForeignKey",
                            "type_model": "ForeignKey",
                            "type_serializer": "PrimaryKeyRelatedField",
                            "read_only": True,
                        },
                        "history_user": {
                            "label": "History User",
                            "type_db": "ForeignKey",
                            "type_model": "ForeignKey",
                            "type_serializer": "PrimaryKeyRelatedField",
                            "read_only": True,
                        },
                    }
                case _:
                    # This should only modify the history expandable fields.
                    continue

            expandable_field["app_label"] = history_model._meta.app_label
            expandable_field["model"] = history_model._meta.model_name

            if "read_only" not in expandable_field:
                expandable_field["read_only"] = False
            if "many" not in expandable_field:
                expandable_field["many"] = False

            # Add the fields from the serializer.  These fields should be first, after pk.
            sorted_expandable_data = {}

            model_content_type = ContentType.objects.get_for_model(model)
            serializer = ModelInfoSerializer(model_content_type)
            canonical_serializer = serializer.canonical["serializer"]
            fields = serializer.get_model_fields_data(canonical_serializer)
            for field_name, field in fields.items():
                if "pk" in field:
                    del field["pk"]
                if field_name not in {"available_actions", "current_history_id"}:
                    sorted_expandable_data[field_name] = field

            if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in expandable_field:
                sorted_expandable_data.update(expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]])
                expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = sorted_expandable_data

                for field in expandable_field[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]].values():
                    if "many" not in field:
                        field["many"] = False
                    if "read_only" not in field:
                        field["read_only"] = False
                    if "required" not in field:
                        field["required"] = False
                    if "choices" not in field:
                        field["choices"] = False

        return expandable_fields

    def get_schema_expandable_fields(self):  # pragma: no cover
        expandable_fields = super().get_schema_expandable_fields()

        # noqa T101 TODO: Add first_history_entry, history, and last_history_entry to the list of expandable fields.

        return expandable_fields

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
        # todo: the instance won't get properly annotated if the field is nested.
        annotated_instance = self.context["view"].get_queryset().filter(id=instance.id).first()
        # nested writable reuses the same serializer class for creating and updating nested models.
        return annotated_instance if type(annotated_instance) is type(instance) else instance

    def create(self, validated_data):
        created_instance = super().create(validated_data)
        return self.return_annotated_instance(created_instance)

    def update(self, instance, validated_data):
        updated_instance = super().update(instance, validated_data)
        return self.return_annotated_instance(updated_instance)


class HistoricalModelSerializerMixin(drf_serializers.Serializer):
    """
    A mixin that adds historical fields to a serializer for models using django-simple-history.
    """

    history_id = drf_serializers.IntegerField(read_only=True)
    history_date = drf_serializers.DateTimeField(read_only=True)
    history_change_reason = drf_serializers.CharField(read_only=True)
    history_user = drf_serializers.PrimaryKeyRelatedField(read_only=True)
    history_type = drf_serializers.CharField(read_only=True)
    history_relation = drf_serializers.PrimaryKeyRelatedField(read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @classmethod
    def get_historical_fields(cls):
        """
        Returns a list of historical fields added by the mixin.
        """
        return [
            "history_id",
            "history_date",
            "history_change_reason",
            "history_type",
            "history_user",
            "history_relation",
        ]
