from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.utils.functional import cached_property
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers

from vueda.info.registration import get_registration


class ModelInfoSerializer(FlexFieldsSerializerMixin, serializers.ModelSerializer):
    """
    A serializer for providing metadata about models, including fields, actions, and permissions.

    This is a read-only serializer.

    Effectively, this is a custom model serializer for content types.
    """

    class Meta:
        model = ContentType
        fields = [
            "id",
            "app_label",
            "model",
        ]
        expandable_fields = {
            "model_permissions": (serializers.SerializerMethodField),
            "model_fields": (serializers.SerializerMethodField),
            "model_actions": (serializers.SerializerMethodField),
            "model_expands": (serializers.SerializerMethodField),
            "model_ordering": (serializers.SerializerMethodField),
            "model_filtering": (serializers.SerializerMethodField),
        }

    def get_model_class(self):
        return self.instance.model_class()

    @cached_property
    def canonical(self):
        return get_registration(self.instance.pk)

    def get_model_permissions(self, instance):
        """
        Get the permissions for a model.
        """
        return list(Permission.objects.filter(content_type=instance).values("codename", "name"))

    # re: naming, we don't want to conflict with super's get_fields, we are unrelated to that method
    def get_model_fields(self, instance):
        """
        Get the fields for a model and their own metadata.
        """
        # the front-end doesn't care about model fields, but serializer fields.
        # we need to get a canonical serializer for the model to determine what fields are available
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        fields = []
        for field_name, field in serializer().get_fields().items():
            many = isinstance(field, serializers.ListField)
            field_data = {
                "name": field_name,
                "label": field.label,
                "type": field.child.__class__.__name__ if many else field.__class__.__name__,
                "many": many,
                "read_only": field.read_only,
                "required": field.required,
            }
            if field.help_text is not None:
                field_data["help_text"] = field.help_text
            if hasattr(field, "max_value") and field.max_value:
                field_data["max_value"] = field.max_value
            if hasattr(field, "min_value") and field.min_value:
                field_data["min_value"] = field.min_value
            if hasattr(field, "max_length") and field.max_length:
                field_data["max_length"] = field.max_length
            if hasattr(field, "min_length") and field.min_length:
                field_data["min_length"] = field.min_length
            if hasattr(field, "max_digits") and field.max_digits:
                field_data["max_digits"] = field.max_digits
            if hasattr(field, "decimal_places") and field.decimal_places:
                field_data["decimal_places"] = field.decimal_places
            if hasattr(field, "choices") and field.choices:
                field_data["choices"] = field.choices
            fields.append(field_data)
        return fields

    def get_model_actions(self, instance):
        """
        Get the actions for a model and their own metadata.
        """
        # To do this, we'll need to have a canonical viewset for each model
        # todo: this is a placeholder
        return [
            {
                "name": action,
                "description": f"Action {action}",
            }
            for action in ["list", "retrieve", "create", "update", "partial_update", "destroy"]
        ]

    def get_model_expands(self, instance):
        """
        Get the expands for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical serializer to determine what expands are available
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        if hasattr(serializer.Meta, "expandable_fields"):
            return [
                {"name": expand, "description": f"Expand {expand}", "fields": expand_data[1]["fields"]}
                for expand, expand_data in serializer.Meta.expandable_fields.items()
            ]

        return []

    def get_model_ordering(self, instance):
        """
        Get the ordering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        # todo: this is a placeholder
        return [
            {
                "name": field,
                "type": "boolean",  # vs alpha vs numeric
            }
            for field in ["order1", "order2"]
        ]

    def get_model_filtering(self, instance):
        """
        Get the filtering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        viewset = self.canonical["viewset"]  # type: viewsets.VuedaViewSet

        if hasattr(viewset, "filterset_class"):
            filterset = viewset.filterset_class
            return filterset.Meta.fields.copy()

        return []
