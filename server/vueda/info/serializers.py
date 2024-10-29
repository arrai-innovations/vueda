import datetime
import inspect
from collections.abc import Iterable

import django_filters
from django.conf import settings
from django.contrib.admin.utils import get_fields_from_path
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import RangeField
from django.core import validators
from django.core.validators import StepValueValidator
from django.db import connection
from django.utils.functional import cached_property
from django_filters.fields import ChoiceIterator
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers  # noqa F401
from rest_framework import viewsets  # noqa F401
from rest_framework.fields import _UnvalidatedField

from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
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
    "AutoField": "numeric",
    "BigAutoField": "numeric",
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
    "SmallAutoField": "numeric",
    "SmallIntegerField": "numeric",
    "TextField": "alpha",
    "TimeField": "time",
    "UUIDField": "alpha",
}


class ModelInfoSerializer(VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, serializers.ModelSerializer):
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

    def get_model_fields_min_data(self, field, model_field):
        if hasattr(model_field, "field"):
            model_field = model_field.field

        if hasattr(field, "min_value") and field.min_value is not None:
            return field.min_value

        elif model_field:
            # If the field has validators, are any of them MinValueValidator?
            if hasattr(model_field, "validators") and model_field.validators:
                for validator in model_field.validators:
                    if isinstance(validator, validators.MinValueValidator):
                        return validator.limit_value

            # Is the field a range field?
            range_field = model_field
            if getattr(field, "child", None) is not None and hasattr(field.child, "model_field"):
                # Or an array of range fields?
                range_field = field.child.model_field

            if isinstance(range_field, RangeField):
                try:
                    min_value, max_value = connection.ops.integer_field_range(
                        range_field.base_field.get_internal_type()
                    )
                except KeyError:
                    # The field is not an integer range field.
                    pass
                else:
                    return min_value

    def get_model_fields_max_data(self, field, model_field):
        if hasattr(model_field, "field"):
            model_field = model_field.field

        if hasattr(field, "max_value") and field.max_value:
            return field.max_value

        elif model_field and model_field:
            # If the field has validators, are any of them MaxValueValidator?
            if hasattr(model_field, "validators") and model_field.validators:
                for validator in model_field.validators:
                    if isinstance(validator, validators.MaxValueValidator):
                        return validator.limit_value

            # Is the field a range field?
            range_field = model_field
            if getattr(field, "child", None) is not None and hasattr(field.child, "model_field"):
                # Or an array of range fields?
                range_field = field.child.model_field

            if isinstance(range_field, RangeField):
                try:
                    min_value, max_value = connection.ops.integer_field_range(
                        range_field.base_field.get_internal_type()
                    )
                except KeyError:
                    # The field is not an integer range field.
                    pass
                else:
                    return max_value

    @staticmethod
    def get_model_fields_db_field_type(field_name, model_field, many):
        if model_field is None:
            return

        child_field = None
        if hasattr(model_field, "model"):
            model = model_field.model

            lookup_expression = f"{field_name}_lookup_expression"
            if hasattr(model, lookup_expression):
                lookup_expression = getattr(model, lookup_expression)
                fields = get_fields_from_path(model_field.model, lookup_expression)
                child_field = fields[-1]

        if hasattr(model_field, "field"):
            model_field = model_field.field

        if child_field is None:
            child_field = model_field.base_field if many and hasattr(model_field, "base_field") else None

        # Get the field type.
        if hasattr(model_field, "related"):
            field_type = model_field.related.get_internal_type()
        elif child_field is None:
            field_type = model_field.get_internal_type()
        else:
            field_type = child_field.get_internal_type()

        return field_type

    @staticmethod
    def get_model_fields_model_field_type(field_name, model_field, many):
        if model_field is None:
            return

        if hasattr(model_field, "field"):
            model_field = model_field.field

        child_field = model_field.base_field if many and hasattr(model_field, "base_field") else None

        # Get the field type.
        if child_field is None:
            field_type = model_field.__class__.__name__
        else:
            field_type = child_field.__class__.__name__

        return field_type

    @staticmethod
    def get_model_fields_serializer_field_type(field_name, model_field, many):
        if model_field is None:
            return

        if hasattr(model_field, "field"):
            model_field = model_field.field

        child_field = model_field.child if many and hasattr(model_field, "child") else None

        if isinstance(child_field, _UnvalidatedField):
            child_field = None

        # Get the field type.
        if child_field is None:
            field_type = model_field.__class__.__name__
        else:
            field_type = child_field.__class__.__name__

        # We couldn't figure out what the ReadOnlyField type was, so assume it is a CharField.
        # This is the case for 'formatted_name', which doesn't exist on the serializer and doesn't have a model field.
        if field_type == "ReadOnlyField":
            field_type = "CharField"

        return field_type

    def get_model_fields_data(self, serializer):
        pk_field = serializer.Meta.model._meta.pk.name
        fields = {}

        for field_name, field in serializer().get_fields().items():
            many = isinstance(field, (serializers.ListField, serializers.ManyRelatedField))
            if many:
                child_field = field.child if many and hasattr(field, "child") else None
                if isinstance(child_field, _UnvalidatedField):
                    many = False

            effective_label = field.label or field_name.replace("_", " ").title()

            model_field = getattr(serializer.Meta.model, field_name, None)

            lookup_expression = f"{field_name}_lookup_expression"
            if hasattr(serializer.Meta.model, lookup_expression):
                lookup_expression = getattr(serializer.Meta.model, lookup_expression)
                lookup_field = getattr(serializer.Meta.model, lookup_expression.split("__")[0], None)
                if lookup_field is not None:
                    if hasattr(lookup_field, "related"):
                        model_field = lookup_field.related

                    else:
                        model_field = lookup_field

            field_type_db = self.get_model_fields_db_field_type(field_name, model_field, many)
            field_type_model = self.get_model_fields_model_field_type(field_name, model_field, many)
            field_type_serializer = self.get_model_fields_serializer_field_type(field_name, field, many)

            field_data = {
                "choices": False,
                "label": effective_label,
                "many": many,
                "read_only": field.read_only,
                "required": field.required,
                "type_db": field_type_db,
                "type_model": field_type_model,
                "type_serializer": field_type_serializer,
            }
            widget = getattr(field, "widget", None)
            obj = serializer
            if hasattr(field, "queryset"):
                obj = field.queryset.model
            choices, extra_data = self.get_model_field_choices(field, widget, obj)
            field_data["choices"] = choices
            if extra_data:
                field_data.update(extra_data)
            if field.help_text is not None:
                field_data["help_text"] = field.help_text
            max_value = self.get_model_fields_max_data(field, model_field)
            if max_value is not None:
                field_data["max_value"] = max_value
            min_value = self.get_model_fields_min_data(field, model_field)
            if min_value is not None:
                field_data["min_value"] = min_value
            if hasattr(field, "max_length") and field.max_length:
                field_data["max_length"] = field.max_length
            if hasattr(field, "min_length") and field.min_length:
                field_data["min_length"] = field.min_length
            if hasattr(field, "max_digits") and field.max_digits:
                field_data["max_digits"] = field.max_digits
            if hasattr(field, "decimal_places") and field.decimal_places is not None:
                field_data["decimal_places"] = field.decimal_places
            if field_name == pk_field:
                field_data["pk"] = True
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
                "bulk": False,
                "method_names": [METHOD_MAPPING[action]],
            }
            if action in ("destroy",):
                action_item_data["bulk"] = True

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
                "bulk": extra_action.bulk,
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

        return serializer().get_expandable_fields()

    def get_model_ordering(self, instance):
        """
        Get the ordering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        from vueda.core.viewsets import VuedaViewSet  # noqa F401

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

    @staticmethod
    def get_model_filtering_label(filter_obj, model):
        label = filter_obj.label
        if label is None:
            label = django_filters.utils.label_for_filter(
                model, filter_obj.field_name, filter_obj.lookup_expr, filter_obj.exclude
            ).title()
        return label

    @staticmethod
    def get_choices_data(field, widget, filter_obj=None):
        """
        Get the choices data for a field, widget, or filter object.

        We are careful to avoid evaluating querysets, as this can be expensive. Accessing .choices will evaluate the
         queryset for certain fields and filter objects.

        :param field: A rest_framework field.
        :type field: rest_framework.fields.Field
        :param widget: A django.forms widget.
        :type widget: django.forms.widgets.Widget
        :param filter_obj: A django_filters filter object.
        :type filter_obj: django_filters.filters.Filter
        :return: The literal choices, or True if the choices are queryset-based, or False if there are no choices.
        :rtype: Union[List, Tuple, bool]
        """
        if filter_obj:
            if (
                hasattr(filter_obj, "queryset")
                or hasattr(filter_obj, "child_relation")
                and hasattr(filter_obj.child_relation, "queryset")
            ):
                return True
            elif filter_obj and hasattr(filter_obj, "choices"):
                return filter_obj.choices
        if hasattr(field, "queryset") or hasattr(field, "child_relation") and hasattr(field.child_relation, "queryset"):
            return True
        elif hasattr(field, "choices"):
            return field.choices
        elif hasattr(widget, "queryset"):
            return True
        elif hasattr(widget, "choices"):
            return widget.choices
        return False

    @staticmethod
    def get_choices_meta(field, obj, choices):
        """
        Get the metadata for model-based choices.

        :param field: The field that the choices are attached to.
        :type field: Union[django_filters.filters.Filter, rest_framework.fields.Field]
        :param obj: The serializer or filter object that the field is attached to.
        :type obj: Union[django_filters.filters.Filter, rest_framework.serializers.Serializer]
        :param choices: The choices data or True if the choices are queryset-based or False if there are no choices.
        :type choices: Union[List, Tuple, bool]
        :return: The metadata for the model-based choices, or None if the choices are not model-based.
        :rtype: Optional[django.db.models.options.Options]
        """
        meta = None
        if choices is True:
            # queryset based choices
            if hasattr(obj, "model"):
                meta = obj.model._meta
            elif hasattr(field, "queryset"):
                meta = field.queryset.model._meta
            elif hasattr(field, "child_relation") and hasattr(field.child_relation, "queryset"):
                meta = field.child_relation.queryset.model._meta
        elif hasattr(field, "choices") and choices:
            # non queryset choices
            if hasattr(obj, "model"):  # AllValuesFilter, AllValuesMultipleFilter
                meta = obj.model._meta
        return meta

    def get_model_field_choices(self, field, widget, serializer):
        """
        Get the choices for a model field.

        :param field: A rest_framework field.
        :type field: rest_framework.fields.Field
        :param widget: A django.forms widget.
        :type widget: django.forms.widgets.Widget
        :param serializer: A rest_framework serializer.
        :type serializer: rest_framework.serializers.Serializer
        :return: Returns a tuple, with the first value being the choices list or True if the choices are model-based,
          or False if there are no choices. The second value is the metadata for the model-based choices.
        :rtype: Tuple[Union[List, Tuple, bool], Optional[django.db.models.options.Options]]
        """
        choices = self.get_choices_data(field, widget)
        meta = self.get_choices_meta(field, serializer, choices)
        if meta is not None:
            return True, {
                "app_label": meta.app_label,
                "model": meta.model_name,
            }
        if choices is True:
            # This shouldn't have happened; if true was returned from `get_choices_data`,
            #  then we should have been able to get the meta.
            raise ValueError(
                "Unexpected field configuration: Model-based choices expected but meta could not be retrieved."
            )

        # Convert choices to be {"label": label, "value": value}.
        if choices:
            choices_list = []
            for value, label in choices.items():
                choices_list.append(
                    {
                        "label": label,
                        "value": str(value),  # Convert ints to strings.
                    }
                )

            return choices_list, None

        return choices, None

    def get_model_filtering_choices(self, filterset, filter_obj, field, widget):
        choices = self.get_choices_data(field, widget, filter_obj=filter_obj)
        meta = self.get_choices_meta(field, filter_obj, choices)
        if meta is not None:
            return True, {
                "app_label": meta.app_label,
                "model": meta.model_name,
                "filterset_name": filterset.__class__.__name__,
            }

        if isinstance(choices, ChoiceIterator):
            choices = [{"label": label, "value": value} for (value, label) in choices]
            # Convert choices to be {label:label,value:value}.
            # if choices are list of tuples
        if choices and isinstance(choices[0], tuple):
            choices_list = []
            for value, label in choices:
                choices_list.append(
                    {
                        "label": label,
                        "value": str(value),  # Convert ints to strings.
                    }
                )
            return choices_list, None

        return choices, None

    @staticmethod
    def get_model_filtering_decimal_places(field, model_field):
        if hasattr(model_field, "field"):
            model_field = model_field.field

        if hasattr(field, "decimal_places") and field.decimal_places:
            return field.decimal_places

        elif model_field and hasattr(model_field, "decimal_places") and model_field.decimal_places:
            return model_field.decimal_places

    @staticmethod
    def get_model_filtering_error_messages(filter_obj, field):
        error_messages = field.error_messages.copy()
        if not field.required and "required" in error_messages:
            del error_messages["required"]
        # Overflow needs the min and max days added to the error message.
        if "overflow" in error_messages:
            error_messages["overflow"] = error_messages["overflow"].format(
                min_days=datetime.timedelta.min.days,
                max_days=datetime.timedelta.max.days,
            )
        if error_messages:
            return error_messages

    @staticmethod
    def get_model_filtering_input_type(filter_obj, field, widget):
        if hasattr(widget, "input_type"):
            return widget.input_type
        elif hasattr(field, "fields"):
            input_types = set()
            for sub_field in field.fields:
                input_types.add(sub_field.widget.input_type)
            if len(input_types) == 1:
                return tuple(input_types)[0]
        # Currently no test data returns unknown, so if you get this, how did you get it?
        return "unknown"

    @staticmethod
    def get_model_filtering_max_digits(field, model_field):
        if hasattr(model_field, "field"):
            model_field = model_field.field

        if hasattr(field, "max_digits") and field.max_digits:
            return field.max_digits

        elif model_field and hasattr(model_field, "max_digits") and model_field.max_digits:
            return model_field.max_digits

    @staticmethod
    def get_model_filtering_max_length(field, model_field):
        if hasattr(model_field, "field"):
            model_field = model_field.field

        if hasattr(field, "max_length"):
            if field.max_length is not None:
                return field.max_length
            elif model_field and hasattr(model_field, "max_length"):
                return model_field.max_length

    def get_model_filtering_max_value(self, field, model_field):
        if hasattr(field, "max_value"):
            if field.max_value is not None:
                return field.max_value
            else:
                max_value = self.get_model_fields_max_data(field, model_field)
                if max_value is not None:
                    return max_value

    @staticmethod
    def get_model_filtering_min_length(field, model_field):
        if hasattr(model_field, "field"):
            model_field = model_field.field

        if hasattr(field, "min_length"):
            if field.min_length is not None:
                return field.min_length
            elif model_field and hasattr(model_field, "min_length"):
                return model_field.min_length

    def get_model_filtering_min_value(self, field, model_field):
        if hasattr(field, "min_value"):
            if field.min_value is not None:
                return field.min_value
            else:
                min_value = self.get_model_fields_min_data(field, model_field)
                if min_value is not None:
                    return min_value

    @staticmethod
    def get_model_filtering_validators(field):
        extra_data = {}
        if hasattr(field, "validators"):
            validators = []
            for validator in field.validators:
                validator_data = {}
                if hasattr(validator, "code"):
                    if validator.code in ("max_value", "min_value"):
                        continue  # Min and max value are handled already.
                    validator_data["code"] = validator.code
                if hasattr(validator, "message"):
                    validator_data["message"] = validator.message
                    if hasattr(validator, "limit_value"):
                        limit_value = (
                            validator.limit_value() if callable(validator.limit_value) else validator.limit_value
                        )
                        # django/core/validators.py > BaseValidator > __call__
                        # Not adding show_value or value to the dict, because we don't have a value.
                        validator_data["message"] %= {"limit_value": limit_value}
                if isinstance(validator, StepValueValidator):
                    extra_data["step"] = validator.limit_value
                if validator_data:
                    validators.append(validator_data)

            if validators or extra_data:
                return validators, extra_data

        return None, None

    def get_model_filtering(self, instance):  # noqa C901 - complexity of 21
        """
        Get the filtering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        from vueda.core.viewsets import VuedaViewSet  # noqa F401

        viewset = self.canonical["viewset"]  # type: viewsets.VuedaViewSet
        model = viewset.queryset.model
        filtering_data = {}

        if hasattr(viewset, "filterset_class"):
            filterset = viewset.filterset_class()

            for filter_name, filter_obj in filterset.get_filters().items():
                field = filter_obj.field

                if filter_obj.exclude or field.disabled:
                    continue

                widget = field.widget
                try:
                    model_fields = get_fields_from_path(model, filter_obj.field_name)
                except Exception:
                    model_field = None
                else:
                    model_field = model_fields[-1]

                # Label
                label = self.get_model_filtering_label(filter_obj, model)

                field_type_db = self.get_model_fields_db_field_type(filter_name, model_field, True)
                field_type_model = self.get_model_fields_model_field_type(filter_name, model_field, True)
                field_type_filter = self.get_model_fields_serializer_field_type(filter_name, field, True)

                filtering_data[filter_name] = {
                    "hidden": widget.is_hidden if hasattr(widget, "is_hidden") else False,
                    "label": label,
                    # Lookup expressions are not a list for single values, so return them all as lists.
                    "lookup_exprs": (
                        filter_obj.lookup_expr if isinstance(filter_obj.lookup_expr, list) else [filter_obj.lookup_expr]
                    ),
                    "required": field.required,
                    "type_db": field_type_db,
                    "type_model": field_type_model,
                    "type_filter": field_type_filter,
                }

                # Choices
                # Returned as a list of values, if it is not a model of choices, otherwise true or false.
                choices, extra_data = self.get_model_filtering_choices(filterset, filter_obj, field, widget)
                filtering_data[filter_name]["choices"] = choices
                if extra_data is not None:
                    filtering_data[filter_name].update(extra_data)

                # Decimal Places - Optional
                decimal_places = self.get_model_filtering_decimal_places(field, model_field)
                if decimal_places:
                    filtering_data[filter_name]["decimal_places"] = decimal_places

                # Empty Label - Optional
                if hasattr(field, "empty_label"):
                    filtering_data[filter_name]["empty_label"] = field.empty_label

                # Empty Value - Optional
                if hasattr(field, "empty_value"):
                    filtering_data[filter_name]["empty_value"] = field.empty_value

                # Error Messages - Optional
                # If the field is not required, don't return the required error message.
                error_messages = self.get_model_filtering_error_messages(filter_obj, field)
                if error_messages:
                    filtering_data[filter_name]["error_messages"] = error_messages

                # Help Text - Optional
                if hasattr(field, "help_text") and field.help_text:
                    filtering_data[filter_name]["help_text"] = field.help_text

                # Input Formats - Optional
                if hasattr(field, "input_formats") and isinstance(field.input_formats, Iterable):
                    filtering_data[filter_name]["input_formats"] = list(field.input_formats)

                # Input Type
                input_type = self.get_model_filtering_input_type(filter_obj, field, widget)
                filtering_data[filter_name]["input_type"] = input_type

                # Suffixes - Optional
                # These are what is needed to do a query.
                if hasattr(widget, "suffixes"):
                    filtering_data[filter_name]["suffixes"] = widget.suffixes

                # Max Digits - Optional
                max_digits = self.get_model_filtering_max_digits(field, model_field)
                if max_digits:
                    filtering_data[filter_name]["max_digits"] = max_digits

                # Max Length - Optional
                max_length = self.get_model_filtering_max_length(field, model_field)
                if max_length:
                    filtering_data[filter_name]["max_length"] = max_length

                # Max Value - Optional
                max_value = self.get_model_filtering_max_value(field, model_field)
                if max_value:
                    filtering_data[filter_name]["max_value"] = max_value

                # Min Length - Optional
                min_length = self.get_model_filtering_min_length(field, model_field)
                if min_length:
                    filtering_data[filter_name]["min_length"] = min_length

                # Min Value - Optional
                min_value = self.get_model_filtering_min_value(field, model_field)
                if min_value is not None:
                    filtering_data[filter_name]["min_value"] = min_value

                # Null Label - Optional
                if hasattr(field, "null_label"):
                    filtering_data[filter_name]["null_label"] = field.null_label

                # Null Value - Optional
                if hasattr(field, "null_value"):
                    filtering_data[filter_name]["null_value"] = field.null_value

                # Validators - Optional
                validators, extra_data = self.get_model_filtering_validators(field)
                if validators:
                    filtering_data[filter_name]["validators"] = validators
                if extra_data:
                    filtering_data[filter_name].update(extra_data)

        return filtering_data

    def get_schema_operation_parameters(self, operation_id, parameters=()):  # pragma: no cover
        parameters = super().get_schema_operation_parameters(operation_id, parameters)

        match operation_id:
            case "vueda.info_model_info_list":
                for index, existing_parameter in reversed(tuple(enumerate(parameters))):
                    if existing_parameter["name"] in ("app_label", "model", settings.REST_FLEX_FIELDS["EXPAND_PARAM"]):
                        parameters.pop(index)

        return parameters


class ModelInfoChoicesSerializer(
    VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, serializers.Serializer
):
    """
    A serializer for providing metadata about field choices.

    This is a read-only serializer.
    """

    label = serializers.CharField()
    value = serializers.CharField()

    class Meta:
        fields = ["label", "value"]  # value is the pk
        expandable_fields = {}
