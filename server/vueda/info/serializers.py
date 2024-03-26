import inspect

from django.contrib.admin.utils import get_fields_from_path
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.utils.functional import cached_property
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers  # noqa F401
from rest_framework import viewsets  # noqa F401

from vueda.core.viewsets import VuedaViewSet  # noqa F401
from vueda.info.registration import get_registration


METHOD_MAPPING = {
    "create": "post",
    "destroy": "delete",
    "list": "get",
    "partial_update": "patch",
    "retrieve": "get",
    "update": "put",
}


FIELD_TYPE_MAPPING = {
    "AutoField": "alpha",
    "BigAutoField": "alpha",
    "BigIntegerField": "numeric",
    "BinaryField": "alpha",
    "BooleanField": "boolean",
    "CharField": "alpha",
    "CICharField": "alpha",
    "CIEmailField": "alpha",
    "CITextField": "alpha",
    "DateField": "date",
    "DateTimeField": "datetime",
    "DecimalField": "numeric",
    "DurationField": "numeric",
    "FileField": "alpha",
    "FilePathField": "alpha",
    "FloatField": "numeric",
    "GenericIPAddressField": "alpha",
    "IntegerField": "numeric",
    "IPAddressField": "alpha",
    "JSONField": "alpha",
    "ManyToManyField": "alpha",
    "PositiveBigIntegerField": "numeric",
    "PositiveIntegerField": "numeric",
    "PositiveSmallIntegerField": "numeric",
    "SlugField": "alpha",
    "SmallAutoField": "alpha",
    "SmallIntegerField": "numeric",
    "TextField": "alpha",
    "TimeField": "time",
    "UUIDField": "alpha",
}


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
            "model_permissions": serializers.SerializerMethodField,
            "model_fields": serializers.SerializerMethodField,
            "model_actions": serializers.SerializerMethodField,
            "model_expands": serializers.SerializerMethodField,
            "model_ordering": serializers.SerializerMethodField,
            "model_filtering": serializers.SerializerMethodField,
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
        viewset = self.canonical["viewset"]  # type: VuedaViewSet

        meta = viewset.queryset.model._meta
        app_label = meta.app_label
        model_name = meta.model_name

        action_data = []
        for action in ("list", "retrieve", "create", "update", "partial_update", "destroy"):
            action_item_data = {
                "name": action,
                "description": f"{action} {app_label}.{model_name}",
                "detail": action != "list",
                "method_names": [METHOD_MAPPING[action]],
            }
            if action != "list":
                parameters = viewset.detail_args
                if parameters:
                    action_item_data["parameters"] = parameters
            action_data.append(action_item_data)

        for extra_action in viewset.get_extra_actions():
            signature = inspect.signature(extra_action)
            parameters = signature.parameters if extra_action.detail else ()

            extra_action_data = {
                "name": extra_action.url_name,
                "description": f"{extra_action.url_name} {app_label}.{model_name}",
                "detail": extra_action.detail,
                "method_names": list(extra_action.mapping.keys()),
            }
            parameters = [parameter for parameter in parameters if parameter not in ("self", "request")]
            if parameters:
                extra_action_data["parameters"] = parameters

            action_data.append(extra_action_data)

        return action_data

    def get_model_expands(self, instance):
        """
        Get the expands for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical serializer to determine what expands are available
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        if hasattr(serializer.Meta, "expandable_fields"):
            return [
                {"name": expand, "fields": expand_data[1]["fields"]}
                for expand, expand_data in serializer.Meta.expandable_fields.items()
            ]

        return []

    def get_model_ordering(self, instance):
        """
        Get the ordering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        viewset = self.canonical["viewset"]  # type: viewsets.VuedaViewSet
        model = viewset.queryset.model
        ordering_data = []

        if hasattr(viewset, "ordering_fields"):
            for field_name in viewset.ordering_fields:
                field = get_fields_from_path(model, field_name)[-1]
                field_type = FIELD_TYPE_MAPPING.get(field.get_internal_type(), "alpha")
                ordering_data.append(
                    {
                        "name": field_name,
                        "type": field_type,
                    }
                )

        return ordering_data

    def get_model_filtering(self, instance):
        """
        Get the filtering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        viewset = self.canonical["viewset"]  # type: viewsets.VuedaViewSet
        model = viewset.queryset.model
        filtering_data = []

        if hasattr(viewset, "filterset_class"):
            filterset = viewset.filterset_class
            for field_name in filterset.Meta.fields:
                field = get_fields_from_path(model, field_name)[-1]
                field_type = FIELD_TYPE_MAPPING.get(field.get_internal_type(), "alpha")
                filtering_data.append(
                    {
                        "name": field_name,
                        "type": field_type,
                    }
                )

        return filtering_data
