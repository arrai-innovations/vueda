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
        expandable_fields_data = {
            "history": {
                "many": True,
                "read_only": True,
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                    "pk": "history_id",
                    "history_id": {
                        "label": "History ID",
                        "type": "IntegerField",
                        "read_only": True,
                    },
                    "history_date": {
                        "label": "History Date",
                        "type": "DateTimeField",
                        "read_only": True,
                    },
                    "history_change_reason": {
                        "label": "Change Reason",
                        "type": "CharField",
                        "read_only": True,
                    },
                    "history_type": {
                        "label": "History Type",
                        "type": "CharField",
                        "read_only": True,
                    },
                    "history_relation": {
                        "label": "In Relation To",
                        "type": "PrimaryKeyRelatedField",
                        "read_only": True,
                    },
                    "history_user": {
                        "label": "History User",
                        "type": "PrimaryKeyRelatedField",
                        "read_only": True,
                    },
                },
            },
            "first_history_entry": {
                "read_only": True,
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                    "pk": "history_id",
                    "history_id": {
                        "label": "History ID",
                        "type": "IntegerField",
                        "read_only": True,
                    },
                    "history_date": {
                        "label": "History Date",
                        "type": "DateTimeField",
                        "read_only": True,
                    },
                    "history_change_reason": {
                        "label": "Change Reason",
                        "type": "CharField",
                        "read_only": True,
                    },
                    "history_type": {
                        "label": "History Type",
                        "type": "CharField",
                        "read_only": True,
                    },
                    "history_relation": {
                        "label": "In Relation To",
                        "type": "PrimaryKeyRelatedField",
                        "read_only": True,
                    },
                    "history_user": {
                        "label": "History User",
                        "type": "PrimaryKeyRelatedField",
                        "read_only": True,
                    },
                },
            },
            "last_history_entry": {
                "read_only": True,
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                    "pk": "history_id",
                    "history_id": {
                        "label": "History ID",
                        "type": "IntegerField",
                        "read_only": True,
                    },
                    "history_date": {
                        "label": "History Date",
                        "type": "DateTimeField",
                        "read_only": True,
                    },
                    "history_change_reason": {
                        "label": "Change Reason",
                        "type": "CharField",
                        "read_only": True,
                    },
                    "history_type": {
                        "label": "History Type",
                        "type": "CharField",
                        "read_only": True,
                    },
                    "history_relation": {
                        "label": "In Relation To",
                        "type": "PrimaryKeyRelatedField",
                        "read_only": True,
                    },
                    "history_user": {
                        "label": "History User",
                        "type": "PrimaryKeyRelatedField",
                        "read_only": True,
                    },
                },
            },
        }

    @classmethod
    def get_expandable_fields_data(cls):
        """
        Add the historical models content type and fields from the non history model to the expandable fields data.
        Add them in the following order:
            pk
            Model fields
            History model fields
        """
        from vueda.info.serializers import ModelInfoSerializer

        if not hasattr(cls.Meta, "expandable_fields"):
            return {}

        history_expandable_field_names = tuple(SimpleHistorySerializerMixin.Meta.expandable_fields)
        expandable_fields_data = cls.Meta.expandable_fields_data
        for key in expandable_fields_data:
            # Don't add data to expandable fields, if the serializer doesn't have this field.
            if key not in history_expandable_field_names:
                continue

            model = cls.Meta.model
            history_model = model.history.model

            expandable_fields_data[key]["app_label"] = history_model._meta.app_label
            expandable_fields_data[key]["model"] = history_model._meta.model_name

            # Add the fields from the serializer.  These fields should be first, after pk.
            sorted_expandable_data = {
                "pk": "history_id",
            }

            model_content_type = ContentType.objects.get_for_model(model)
            fields = ModelInfoSerializer(model_content_type).get_model_fields(model_content_type)
            for field_name, field in fields.items():
                if field_name not in ("pk", "current_history_id"):
                    sorted_expandable_data[field_name] = field

            if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in expandable_fields_data[key]:
                sorted_expandable_data.update(expandable_fields_data[key][settings.REST_FLEX_FIELDS["FIELDS_PARAM"]])
                expandable_fields_data[key][settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = sorted_expandable_data

        cls.populate_expandable_fields_defaults(expandable_fields_data)

        return expandable_fields_data

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
