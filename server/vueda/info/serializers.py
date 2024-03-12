from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.utils.functional import cached_property
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers

from vueda.info.register import get_registration


class PermissionSerializer(FlexFieldsSerializerMixin, serializers.ModelSerializer):
    name = serializers.CharField()
    codename = serializers.CharField()
    app_label = serializers.CharField(source="content_type.app_label", read_only=True)
    model = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = Permission


class FieldSerializer(FlexFieldsSerializerMixin, serializers.Serializer):
    name = serializers.CharField()
    type = serializers.CharField()


class ActionSerializer(FlexFieldsSerializerMixin, serializers.Serializer):
    name = serializers.CharField()
    method = serializers.CharField()
    pass


class ExpandSerializer(FlexFieldsSerializerMixin, serializers.Serializer):
    name = serializers.CharField()
    type = serializers.CharField()


class OrderingSerializer(FlexFieldsSerializerMixin, serializers.Serializer):
    name = serializers.CharField()
    type = serializers.CharField()


class FilteringSerializer(FlexFieldsSerializerMixin, serializers.Serializer):
    name = serializers.CharField()
    type = serializers.CharField()


class ModelInfoSerializer(FlexFieldsSerializerMixin, serializers.ModelSerializer):
    """
    A serializer for providing metadata about models, including fields, actions, and permissions.

    This is a read-only serializer.

    Effectively, this is a custom model serializer for content types.
    """

    class Meta:
        model = ContentType
        fields = ["app_label", "model"]
        expandable_fields = {
            "permissions": (
                PermissionSerializer,
                {"many": True, "read_only": True, "source": "get_model_permissions"},
            ),
            "fields": (
                FieldSerializer,
                {"many": True, "read_only": True, "source": "get_model_fields"},
            ),
            "actions": (
                ActionSerializer,
                {"many": True, "read_only": True, "source": "get_model_actions"},
            ),
            "expands": (
                ExpandSerializer,
                {"many": True, "read_only": True, "source": "get_model_expands"},
            ),
            "ordering": (
                OrderingSerializer,
                {"many": True, "read_only": True, "source": "get_model_ordering"},
            ),
            "filtering": (
                FilteringSerializer,
                {"many": True, "read_only": True, "source": "get_model_filtering"},
            ),
        }

    def get_fields(self):
        fields = super().get_fields()
        if self.context["view"].action == "list":
            # don't do the expensive work when listing all models
            # strip out fields that aren't app_label and model
            fields = {field: fields[field] for field in ["app_label", "model"]}
        return fields

    def get_model_class(self):
        return self.instance.model_class()

    @cached_property
    def canonical(self):
        return get_registration(self.instance.pk)

    def get_model_permissions(self):
        """
        Get the permissions for a model.
        """
        return list(Permission.objects.filter(content_type=self.instance).values("codename", "name"))

    # re: naming, we don't want to conflict with super's get_fields, we are unrelated to that method
    def get_model_fields(self):
        """
        Get the fields for a model and their own metadata.
        """
        # the front-end doesn't care about model fields, but serializer fields.
        # we need to get a canonical serializer for the model to determine what fields are available
        # todo: this is a placeholder
        serializer = self.canonical.serializer  # type: serializers.ModelSerializer

        fields = []
        for field_name, field in serializer.get_fields().items():
            many = isinstance(field, serializers.ListField)
            fields.append(
                {
                    "name": field_name,
                    "type": field.child.__class__.__name__ if many else field.__class__.__name__,
                    "many": many,
                    "read_only": field.read_only,
                    "required": field.required,
                }
            )
        return fields

    def get_model_actions(self):
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

    def get_model_expands(self):
        """
        Get the expands for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical serializer to determine what expands are available
        # todo: this is a placeholder
        return [
            {
                "name": expand,
                "description": f"Expand {expand}",
            }
            for expand in ["expand1", "expand2"]
        ]

    def get_model_ordering(self):
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

    def get_model_filtering(self):
        """
        Get the filtering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        # todo: this is a placeholder
        return [
            {
                "name": a_filter,
                "type": "filter_type",
            }
            for a_filter in ["filter1", "filter2"]
        ]
