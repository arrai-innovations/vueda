import inspect

import django_filters
from django.contrib.admin.utils import get_fields_from_path
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.utils.functional import cached_property
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers  # noqa F401
from rest_framework import viewsets  # noqa F401

from vueda.core import open_api
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


SERIALIZER_FIELD_TYPES_TO_FETCH_MODEL_TYPE = (
    "CharField",  # Can become TextField
    "ChoiceField",  # Can become CharField
)


class ModelInfoSerializer(FlexFieldsSerializerMixin, serializers.ModelSerializer):
    """
    A serializer for providing metadata about models, including fields, actions, and permissions.

    This is a read-only serializer.

    Effectively, this is a custom model serializer for content types.
    """

    verbose_name = serializers.SerializerMethodField()
    verbose_name_plural = serializers.SerializerMethodField()

    class Meta:
        model = ContentType
        fields = ["id", "app_label", "model", "verbose_name", "verbose_name_plural"]
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

    def get_verbose_name(self, instance: object) -> str:
        return instance.model_class()._meta.verbose_name

    def get_verbose_name_plural(self, instance: object) -> str:
        return instance.model_class()._meta.verbose_name_plural

    def get_model_permissions(self, instance):
        """
        Get the permissions for a model.
        """
        return list(Permission.objects.filter(content_type=instance).values("codename", "name"))

    def get_model_fields_data(self, serializer):
        pk_field = serializer.Meta.model._meta.pk.name
        fields = {
            "pk": pk_field,
        }

        for field_name, field in serializer().get_fields().items():
            many = isinstance(field, serializers.ListField)

            if many:
                if hasattr(field.child, "model_field"):
                    field_type = field.child.model_field.__class__.__name__
                else:
                    field_type = field.child.__class__.__name__
            else:
                if hasattr(field, "model_field"):
                    field_type = field.model_field.__class__.__name__
                else:
                    field_type = field.__class__.__name__

            if (
                field_name != pk_field
                and not hasattr(serializer, field_name)
                and field_type in SERIALIZER_FIELD_TYPES_TO_FETCH_MODEL_TYPE
            ):
                model_field = getattr(serializer.Meta.model, field_name, None)

                if model_field is not None:
                    field_type = model_field.field.get_internal_type()

            effective_label = field.label or field_name.replace("_", " ").title()

            field_data = {
                "choices": hasattr(field, "choices") and bool(field.choices),
                "label": effective_label,
                "type": field_type,
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
            fields[field_name] = field_data
        return fields

    # re: naming, we don't want to conflict with super's get_fields, we are unrelated to that method
    def get_model_fields(self, instance):
        """
        Get the fields for a model and their own metadata.
        """
        # the front-end doesn't care about model fields, but serializer fields.
        # we need to get a canonical serializer for the model to determine what fields are available
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        return self.get_model_fields_data(serializer)

    def get_model_actions(self, instance):
        """
        Get the actions for a model and their own metadata.
        """
        # To do this, we'll need to have a canonical viewset for each model
        from vueda.core.viewsets import VuedaViewSet  # noqa F401

        viewset = self.canonical["viewset"]  # type: VuedaViewSet

        meta = viewset.queryset.model._meta
        app_label = meta.app_label
        model_name = meta.model_name

        action_data = []
        for action in ("list", "retrieve", "create", "update", "partial_update", "destroy"):
            action_item_data = {
                "name": action,
                "description": f"{action} {app_label}.{model_name}",
                "detail": False,
                "method_names": [METHOD_MAPPING[action]],
            }
            if action not in ("list", "create"):
                action_item_data["detail"] = True
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
        expands_data = []

        if hasattr(serializer.Meta, "expandable_fields"):
            for field_name, field_data in serializer.Meta.expandable_fields.items():
                expand_item = {
                    "name": field_name,
                }

                if isinstance(field_data, (list, tuple)):
                    field_serializer, expand_options = field_data

                # Copied to deal with serializer strings.
                # https://github.com/rsinger86/drf-flex-fields/blob/9dd6a9140fd6d2ffe1baf9ab1ffc728540dea84d/
                #   rest_flex_fields/serializers.py#L127-L130
                if type(field_serializer) == str:  # noqa E721
                    field_serializer = self._get_serializer_class_from_lazy_string(field_serializer)

                model = content_type = None
                if hasattr(field_serializer, "Meta") and hasattr(field_serializer.Meta, "model"):
                    model = field_serializer.Meta.model

                if model is not None:
                    content_type = ContentType.objects.get_for_model(model)

                if content_type is not None:
                    expand_item["content_type"] = str(content_type.id)

                if "fields" in expand_options:
                    field_data = self.get_model_fields_data(field_serializer)

                    # We need to call tuple, as we are modifying the dictionary.
                    for field_name in tuple(field_data):
                        if field_name == "pk":  # Always keep the pk.
                            continue
                        if field_name not in expand_options["fields"]:
                            del field_data[field_name]

                    expand_item["fields"] = field_data

                expands_data.append(expand_item)

        return expands_data

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
                available_filters = []
                for available_filter in filterset.get_filters().values():
                    if available_filter.field_name == field_name:
                        available_filter_data = {}
                        lookup_exprs = []
                        if available_filter.label:
                            available_filter_data["label"] = available_filter.label
                        if "required" in available_filter.extra and available_filter.extra["required"]:
                            available_filter_data["required"] = True
                        if available_filter.lookup_expr:
                            if isinstance(available_filter.lookup_expr, (list, tuple)):
                                lookup_exprs.extend(available_filter.lookup_expr)
                            else:
                                lookup_exprs.append(available_filter.lookup_expr)
                        if isinstance(available_filter, django_filters.RangeFilter) or isinstance(
                            available_filter, django_filters.NumericRangeFilter
                        ):
                            lookup_exprs.append("range")  # Can have a start, stop, or start and stop value.
                        if lookup_exprs:
                            available_filter_data["lookup_exprs"] = lookup_exprs
                        available_filters.append(available_filter_data)

                filtering_data.append(
                    {
                        "choices": hasattr(field, "choices") and bool(field.choices),
                        "filters": available_filters,
                        "name": field_name,
                        "type": field_type,
                    }
                )
        return filtering_data


# This adds the expands as default, so we can get back the data and
class OpenAPIModelInfoSerializer(ModelInfoSerializer):
    def get_fields(self):
        fields = super().get_fields()

        for field_name in sorted(ModelInfoSerializer.Meta.expandable_fields):
            serializer_name = "".join([part.capitalize() for part in field_name.split("_")])
            serializer = getattr(open_api, serializer_name)
            if serializer is None:
                raise RuntimeError(f"Unable to find a serializer named '{serializer_name}' in open_api.py.")
            fields[field_name] = serializer(many=True, required=False)

        return fields


class ModelInfoChoicesSerializer(FlexFieldsSerializerMixin, serializers.Serializer):
    """
    A serializer for providing metadata about field choices.

    This is a read-only serializer.

    Effectively, this is a custom model serializer for content types.
    """

    label = serializers.CharField()
    value = serializers.CharField()

    class Meta:
        fields = ["label", "value"]  # value is the pk
