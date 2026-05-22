"""Serializers for model metadata, field choices, and filterset choices in the info API."""

__all__ = (
    "FIELD_TYPE_MAPPING",
    "METHOD_MAPPING",
    "ModelInfoChoicesSerializer",
    "ModelInfoFilterSetChoicesSerializer",
    "ModelInfoSerializer",
)

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
from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import ImproperlyConfigured
from django.core.validators import StepValueValidator
from django.db import connection
from django.db.models import CompositePrimaryKey
from django.http import Http404
from django.utils.functional import cached_property
from django_filters.fields import ChoiceIterator
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers
from rest_framework import viewsets  # noqa F401
from rest_framework.exceptions import PermissionDenied
from rest_framework.fields import _UnvalidatedField
from rest_framework.filters import OrderingFilter

from vueda.core.open_api import replace_refs_with_schema
from vueda.core.serializers import CompositePrimaryKeyField
from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
from vueda.core.utils import AvailableActionsRequest
from vueda.info import open_api_tracebacks
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

    @property
    def data(self):
        # Local imports, because apps may not be set up.
        from vueda.workflow.models import HasWorkflowModelMixin
        from vueda.workflow.models import Workflow
        from vueda.workflow.serializers import HasWorkflowSerializerMixin
        from vueda.workflow.views import HasWorkflowViewMixin

        serializer = self.canonical["serializer"]
        viewset = self.canonical["viewset"]
        model = serializer.Meta.model

        errors = []

        if not issubclass(model, HasWorkflowModelMixin):
            errors.append(f"{model.__name__} is missing HasWorkflowModelMixin inheritance.")

        if not issubclass(serializer, HasWorkflowSerializerMixin):
            errors.append(f"{serializer.__name__} is missing HasWorkflowSerializerMixin inheritance.")

        if viewset is not None and not issubclass(viewset, HasWorkflowViewMixin):
            errors.append(f"{viewset.__name__} is missing HasWorkflowViewMixin inheritance.")

        if not Workflow.objects.filter(content_type=ContentType.objects.get_for_model(model)).exists():
            errors.append(f"{model.__name__} has no workflow configured.")

        # If the length of errors becomes 4 (everything errored) or 3 if no viewset,
        # then workflow is not set up for this model.
        if errors and len(errors) != (4 if viewset is not None else 3):
            raise ImproperlyConfigured(errors)

        ret = super().data
        return ret

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
                    min_value, _ = connection.ops.integer_field_range(range_field.base_field.get_internal_type())
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
                    _, max_value = connection.ops.integer_field_range(range_field.base_field.get_internal_type())
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

    def get_model_fields_data(self, serializer, *, excluded_fields=frozenset()):
        pk_field = serializer.Meta.model._meta.pk.name
        fields = {}

        for field_name, field in serializer().get_fields().items():
            if field_name in excluded_fields:
                continue

            many = isinstance(field, (serializers.ListField, serializers.ManyRelatedField))
            if many:
                child_field = field.child if many and hasattr(field, "child") else None
                if isinstance(child_field, _UnvalidatedField):
                    many = False

            effective_label = field.label or field_name.replace("_", " ").title()

            if isinstance(field, CompositePrimaryKeyField):
                model_field = serializer.Meta.model._meta.get_field(field_name)

            else:
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
                "hidden": field.style.get("hidden", False),
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
            if not field.read_only:
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
        Actions will be sorted by method action, followed by sorted extra actions.
        """
        # To do this, we'll need to have a canonical viewset for each model
        from vueda.core.viewsets import VuedaViewSet  # noqa F401

        viewset = self.canonical["viewset"]  # type: VuedaViewSet
        if viewset is None:
            return []
        called_viewset = viewset()

        request = self.context.get("request", None)
        user = request.user if request is not None else None

        queryset = viewset().get_queryset()
        meta = queryset.model._meta
        app_label = meta.app_label
        model_name = meta.model_name

        action_data = []
        for action in ("list", "retrieve", "create", "update", "partial_update", "destroy"):
            if user is not None:
                skip_action = False
                for method_action, method in METHOD_MAPPING.items():
                    if method_action.lower() == action:
                        fake_request = AvailableActionsRequest(
                            authenticators=request.authenticators,
                            method=method.upper(),
                            successful_authenticator=request.successful_authenticator,
                            user=user,
                        )

                        try:
                            called_viewset.check_object_permissions(fake_request, None)
                        except (PermissionDenied, Http404):
                            skip_action = True

                if skip_action:
                    continue

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

        action_data.sort(key=lambda x: x["name"])

        all_extra_actions = []
        if hasattr(called_viewset, "get_allowed_extra_actions"):
            allowed_extra_actions = called_viewset.get_allowed_extra_actions(request)
        else:
            allowed_extra_actions = None
        for extra_action in called_viewset.get_extra_actions():
            # Remove actions you are not allowed to do.
            if allowed_extra_actions is not None and extra_action.url_name not in allowed_extra_actions:
                continue

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

            all_extra_actions.append(extra_action_data)

        all_extra_actions.sort(key=lambda x: x["name"])

        action_data.extend(all_extra_actions)

        return action_data

    def get_model_expands(self, instance):
        """
        Get the expands for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical serializer to determine what expands are available
        serializer = self.canonical["serializer"]  # type: serializers.ModelSerializer

        expands = serializer().get_expandable_fields()
        fields_param = settings.REST_FLEX_FIELDS["FIELDS_PARAM"]
        for expand in expands:
            if fields_param in expand:
                for field in expand[fields_param].values():
                    field.setdefault("hidden", False)
        return expands

    def get_model_ordering(self, instance):
        """
        Get the ordering fields for a model and their own metadata.
        """
        # Similar to actions, we'll need to have a canonical viewset to determine what fields are available
        from vueda.core.viewsets import VuedaViewSet  # noqa F401

        viewset = self.canonical["viewset"]  # type: viewsets.VuedaViewSet
        if viewset is None:
            return []

        queryset = viewset().get_queryset()
        model = queryset.model
        ordering_data = []
        view = viewset()

        has_composite_primary_key = False
        for field in model._meta.fields:
            if isinstance(field, CompositePrimaryKey):
                has_composite_primary_key = True

        # Temporary code to prevent a blow up when a model with a composite primary
        # key has no ordering fields set up on the view and there are no objects created.
        # Once this pull request (https://github.com/arrai-innovations/vueda/pull/19) is
        # deployed, this code will be removed, because we don't use get_valid_fields.
        if has_composite_primary_key and not queryset.exists() and getattr(view, "ordering_fields", None) is None:
            return ordering_data

        for field_name, _title in OrderingFilter().get_valid_fields(queryset, view):
            try:
                field = get_fields_from_path(model, field_name)[-1]
            except FieldDoesNotExist:
                continue

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
            elif hasattr(filter_obj, "choices"):
                return filter_obj.choices
        if hasattr(field, "queryset") or hasattr(field, "child_relation") and hasattr(field.child_relation, "queryset"):
            return True
        elif hasattr(field, "choices"):
            return field.choices
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
            if hasattr(field, "queryset"):
                meta = field.queryset.model._meta
            elif hasattr(field, "child_relation") and hasattr(field.child_relation, "queryset"):
                meta = field.child_relation.queryset.model._meta
        elif hasattr(field, "choices") and choices:  # noqa SIM102
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
                return next(iter(input_types))
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
        if viewset is None:
            return {}

        queryset = viewset().get_queryset()
        model = queryset.model
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

    def customize_schema_request_data(self, request_data):  # pragma: no cover
        match self.context["request"].path:
            case "/routes/vueda.info/model_info/" | "/routes/vueda.info/model_info/{app_label}/{model}/":
                request_data["content"] = {}  # This prevents a message of 'Schema not provided' for the body.

        return request_data

    def customize_schema_response_data(self, auto_schema, response_data):  # pragma: no cover
        from vueda.info.schema import CHOICES_TRUE_SCHEMA_DESCRIPTION

        request = self.context["request"]

        for status_code, data in tuple(response_data.items()):  # tuple because we may add items.
            match (request.method, request.path, status_code):
                # List models
                case ("GET", "/routes/vueda.info/model_info/", "200"):
                    data["content"]["application/json"]["examples"] = {
                        "ListModelInfoExample": {
                            "summary": "With Results",
                            "description": "uri: /routes/vueda.info/model_info/",
                            "value": {
                                "results": [
                                    {
                                        "id": 1,
                                        "app_label": "store",
                                        "model": "distributor",
                                        "verbose_name": "distributor",
                                        "verbose_name_plural": "distributors",
                                    },
                                    {
                                        "id": 2,
                                        "app_label": "store",
                                        "model": "optiontype",
                                        "verbose_name": "option type",
                                        "verbose_name_plural": "option types",
                                    },
                                    {
                                        "id": 6,
                                        "app_label": "store",
                                        "model": "customer",
                                        "verbose_name": "customer",
                                        "verbose_name_plural": "customers",
                                    },
                                    {
                                        "id": 7,
                                        "app_label": "store",
                                        "model": "cart",
                                        "verbose_name": "cart",
                                        "verbose_name_plural": "carts",
                                    },
                                    {
                                        "id": 8,
                                        "app_label": "store",
                                        "model": "customerorder",
                                        "verbose_name": "customer order",
                                        "verbose_name_plural": "customer orders",
                                    },
                                    {
                                        "id": 11,
                                        "app_label": "store",
                                        "model": "inventoryrecordreason",
                                        "verbose_name": "inventory entry reason",
                                        "verbose_name_plural": "inventory entry reasons",
                                    },
                                    {
                                        "id": 13,
                                        "app_label": "store",
                                        "model": "product",
                                        "verbose_name": "product",
                                        "verbose_name_plural": "products",
                                    },
                                    {
                                        "id": 15,
                                        "app_label": "store",
                                        "model": "productoption",
                                        "verbose_name": "product option",
                                        "verbose_name_plural": "product options",
                                    },
                                    {
                                        "id": 16,
                                        "app_label": "store",
                                        "model": "orderitem",
                                        "verbose_name": "ORDER item",
                                        "verbose_name_plural": "ORDER items",
                                    },
                                    {
                                        "id": 17,
                                        "app_label": "store",
                                        "model": "inventoryrecord",
                                        "verbose_name": "inventory entry",
                                        "verbose_name_plural": "inventory entries",
                                    },
                                    {
                                        "id": 19,
                                        "app_label": "store",
                                        "model": "cartitem",
                                        "verbose_name": "cart item",
                                        "verbose_name_plural": "cart items",
                                    },
                                    {
                                        "id": 24,
                                        "app_label": "store",
                                        "model": "packingbox",
                                        "verbose_name": "Packing Box",
                                        "verbose_name_plural": "Packing Boxes",
                                    },
                                ],
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 12,
                            },
                        },
                        "ListModelInfoNoResultsExample": {
                            "summary": "No Results",
                            "description": "uri: /routes/vueda.info/model_info/",
                            "value": {
                                "results": [],
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 0,
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ListModelsPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": "uri: /routes/vueda.info/model_info/",
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.INFO_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                # Get model
                case ("GET", "/routes/vueda.info/model_info/{app_label}/{model}/", "200"):
                    replace_refs_with_schema(
                        auto_schema.registry._components, data, ("#/components/schemas/ModelInfo",)
                    )

                    # Model Actions
                    data["content"]["application/json"]["schema"]["properties"]["model_actions"] = {
                        "type": "array",
                        "title": "Action Data",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "readonly": True,
                                },
                                "bulk": {
                                    "type": "boolean",
                                    "readonly": True,
                                },
                                "description": {
                                    "type": "string",
                                    "readonly": True,
                                },
                                "detail": {
                                    "type": "boolean",
                                    "readonly": True,
                                },
                                "method_names": {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                    },
                                    "enum": [
                                        "get",
                                        "post",
                                        "put",
                                        "patch",
                                        "delete",
                                    ],
                                    "description": "<ul><li>get -> list (detail true)</li>"
                                    + "<li>get -> retrieve (detail false)</li>"
                                    + "<li>post -> create</li>"
                                    + "<li>put -> update</li>"
                                    + "<li>patch -> partial_update</li>"
                                    + "<li>delete -> destroy</li></ul>",
                                },
                                "parameters": {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                    },
                                    "example": "pk",
                                    "description": "Additional parameters needed to call the action.",
                                },
                            },
                            "required": [
                                "name",
                                "bulk",
                                "description",
                                "detail",
                                "method_names",
                            ],
                        },
                    }

                    # Model Expands
                    data["content"]["application/json"]["schema"]["properties"]["model_expands"] = {
                        "type": "array",
                        "title": "Expands Data",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "readonly": True,
                                },
                                "app_label": {
                                    "title": "django app name",
                                    "pattern": "^[a-zA-Z0-9_]+$",
                                    "maxLength": 100,
                                    "example": "store",
                                },
                                "model": {
                                    "title": "model class name",
                                    "pattern": "^[a-zA-Z0-9_]+$",
                                    "maxLength": 100,
                                    "example": "product",
                                },
                                "many": {
                                    "type": "boolean",
                                    "readonly": True,
                                    "description": (
                                        "Whether a single object will be returned, or an array containing many."
                                    ),
                                },
                                "read_only": {
                                    "type": "boolean",
                                    "readonly": True,
                                },
                                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: {
                                    "type": "object",
                                    "title": "Field Names / Data",
                                    "properties": {
                                        "Field Name": {
                                            "type": "object",
                                            "readonly": True,
                                            "title": "Data",
                                            "properties": {
                                                "label": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": "Displayed name of the field.",
                                                    "example": "Name",
                                                },
                                                "type_db": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": "Database Field Type.",
                                                    "example": "CharField",
                                                },
                                                "type_model": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": "Django Model Field Type.",
                                                    "example": "CharField",
                                                },
                                                "type_serializer": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": "Rest Framework Serializer Field Type.",
                                                    "example": "CharField",
                                                },
                                                "many": {
                                                    "type": "boolean",
                                                    "readonly": True,
                                                    "description": "One or more objects?",
                                                    "example": "False",
                                                },
                                                "read_only": {
                                                    "type": "boolean",
                                                    "readonly": True,
                                                    "example": "True",
                                                },
                                                "required": {
                                                    "type": "boolean",
                                                    "readonly": True,
                                                    "description": "A value is required when submitted.",
                                                    "example": "False",
                                                },
                                                "app_label": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": CHOICES_TRUE_SCHEMA_DESCRIPTION,
                                                    "maxLength": 100,
                                                    "pattern": "^[a-zA-Z0-9_]+$",
                                                    "title": "django app name",
                                                    "example": "store",
                                                },
                                                "model": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": CHOICES_TRUE_SCHEMA_DESCRIPTION,
                                                    "maxLength": 100,
                                                    "pattern": "^[a-zA-Z0-9_]+$",
                                                    "title": "model class name",
                                                    "example": "cart",
                                                },
                                                "choices": {
                                                    "oneOf": [
                                                        {
                                                            "type": "array",
                                                            "readonly": True,
                                                            "description": "The choices to choose from.",
                                                            "title": "Choices",
                                                            "example": "False",
                                                            "items": {
                                                                "type": "object",
                                                                "readonly": True,
                                                                "properties": {
                                                                    "label": {
                                                                        "type": "string",
                                                                        "readonly": True,
                                                                        "description": "Displayed name for the choice.",
                                                                        "example": "Express Shipping",
                                                                    },
                                                                    "value": {
                                                                        "type": "string",
                                                                        "readonly": True,
                                                                        "description": "PK or code for the choice.",
                                                                        "example": "express_shipping",
                                                                    },
                                                                },
                                                                "required": [
                                                                    "label",
                                                                    "value",
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            "type": "boolean",
                                                            "readonly": True,
                                                            "description": (
                                                                'If true, use <a href="#tag/vueda.info/operation'
                                                                '/vueda.info_model_info_choices_list">'
                                                                "List field choices</a> to get the choices."
                                                                "<br>If false, there are no choices."
                                                            ),
                                                        },
                                                    ],
                                                },
                                                "pk": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": "Exists if this field is the primary key.",
                                                    "example": "1",
                                                },
                                                "help_text": {
                                                    "type": "string",
                                                    "readonly": True,
                                                    "description": (
                                                        "Helpful text about what data should exist in the field."
                                                    ),
                                                    "example": "Multiple values may be separated by commas.",
                                                },
                                                "max_length": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": "Maximum number of characters for the value.",
                                                    "example": "32",
                                                },
                                                "min_length": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": "Minimum number of characters for the value.",
                                                    "example": "2",
                                                },
                                                "max_value": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": "Maximum number allowed for the value.",
                                                    "example": "2147483647",
                                                },
                                                "min_value": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": "Minimum number allowed for the value.",
                                                    "example": "-2147483648",
                                                },
                                                "max_digits": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": (
                                                        "Maximum number of digits including "
                                                        "decimal places for the value."
                                                    ),
                                                    "example": "12",
                                                },
                                                "decimal_places": {
                                                    "type": "integer",
                                                    "readonly": True,
                                                    "description": "Number of decimal places for the value.",
                                                    "example": "2",
                                                },
                                            },
                                            "required": [
                                                "label",
                                                "type_db",
                                                "type_model",
                                                "type_serializer",
                                                "many",
                                                "read_only",
                                                "required",
                                                "choices",
                                            ],
                                        }
                                    },
                                },
                            },
                            "required": [
                                "name",
                                "app_label",
                                "model",
                                "many",
                                "read_only",
                            ],
                        },
                    }

                    # Model Fields
                    data["content"]["application/json"]["schema"]["properties"]["model_fields"] = {
                        "type": "object",
                        "title": "Field Names / Data",
                        "properties": {
                            # Openapi can't do dynamic {Field Name: Data} objects,
                            # so we display it as best as possible, and have an example.
                            "Field Name": {
                                "type": "object",
                                "readonly": True,
                                "description": "Example: <code>{&quot;product_name&quot;: {...</code>",
                                "title": "Data",
                                "properties": {
                                    "label": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Displayed name of the field.",
                                        "example": "Name",
                                    },
                                    "type_db": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Database Field Type.",
                                        "example": "CharField",
                                    },
                                    "type_model": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Django Model Field Type.",
                                        "example": "CharField",
                                    },
                                    "type_serializer": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Rest Framework Serializer Field Type",
                                        "example": "CharField",
                                    },
                                    "many": {
                                        "type": "boolean",
                                        "readonly": True,
                                        "description": "One or more objects?",
                                        "example": "False",
                                    },
                                    "read_only": {
                                        "type": "boolean",
                                        "readonly": True,
                                        "example": "True",
                                    },
                                    "required": {
                                        "type": "boolean",
                                        "readonly": True,
                                        "description": "A value is required when submitted.",
                                        "example": "False",
                                    },
                                    "app_label": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": CHOICES_TRUE_SCHEMA_DESCRIPTION,
                                        "maxLength": 100,
                                        "pattern": "^[a-zA-Z0-9_]+$",
                                        "title": "django app name",
                                        "example": "store",
                                    },
                                    "model": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": CHOICES_TRUE_SCHEMA_DESCRIPTION,
                                        "maxLength": 100,
                                        "pattern": "^[a-zA-Z0-9_]+$",
                                        "title": "model class name",
                                        "example": "cart",
                                    },
                                    "choices": {
                                        "oneOf": [
                                            {
                                                "type": "array",
                                                "readonly": True,
                                                "description": "The choices to choose from.",
                                                "title": "Choices",
                                                "example": "False",
                                                "items": {
                                                    "type": "object",
                                                    "readonly": True,
                                                    "properties": {
                                                        "label": {
                                                            "type": "string",
                                                            "readonly": True,
                                                            "description": "Displayed name for the choice.",
                                                            "example": "Express Shipping",
                                                        },
                                                        "value": {
                                                            "type": "string",
                                                            "readonly": True,
                                                            "description": "PK or code for the choice.",
                                                            "example": "express_shipping",
                                                        },
                                                    },
                                                    "required": [
                                                        "label",
                                                        "value",
                                                    ],
                                                },
                                            },
                                            {
                                                "type": "boolean",
                                                "readonly": True,
                                                "description": (
                                                    'If true, use <a href="#tag/vueda.info/operation'
                                                    '/vueda.info_model_info_choices_list">'
                                                    "List field choices</a> to get the choices."
                                                    "<br>If false, there are no choices."
                                                ),
                                            },
                                        ],
                                    },
                                    "pk": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Exists if this field is the primary key.",
                                        "example": "1",
                                    },
                                    "help_text": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Helpful text about what data should exist in the field.",
                                        "example": "Multiple values may be separated by commas.",
                                    },
                                    "max_length": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Maximum number of characters for the value.",
                                        "example": "32",
                                    },
                                    "min_length": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Minimum number of characters for the value.",
                                        "example": "2",
                                    },
                                    "max_value": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Maximum number allowed for the value.",
                                        "example": "2147483647",
                                    },
                                    "min_value": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Minimum number allowed for the value.",
                                        "example": "-2147483648",
                                    },
                                    "max_digits": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": (
                                            "Maximum number of digits including decimal places for the value."
                                        ),
                                        "example": "12",
                                    },
                                    "decimal_places": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Number of decimal places for the value.",
                                        "example": "2",
                                    },
                                },
                                "required": [
                                    "label",
                                    "type_db",
                                    "type_model",
                                    "type_serializer",
                                    "many",
                                    "read_only",
                                    "required",
                                    "choices",
                                ],
                            },
                        },
                    }

                    # Model Filtering
                    data["content"]["application/json"]["schema"]["properties"]["model_filtering"] = {
                        "type": "object",
                        "title": "Field Names / Data",
                        "properties": {
                            # Openapi can't do dynamic {Field Name: Data} objects,
                            # so we display it as best as possible, and have an example.
                            "Field Name": {
                                "type": "object",
                                "readonly": True,
                                "description": "Example: <code>{&quot;order_number&quot;: {...</code>",
                                "title": "Data",
                                "properties": {
                                    "label": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Displayed name of the filter",
                                        "example": "Name",
                                    },
                                    "type_db": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Database Field Type",
                                        "example": "CharField",
                                    },
                                    "type_model": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Django Model Field Type",
                                        "example": "CharField",
                                    },
                                    "type_filter": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": (
                                            "The django form field defined as the 'field_class' in a django "
                                            "filters field.  This was used, so custom filters would work, as "
                                            "long as they use a form field vueda already knows about."
                                        ),
                                        "example": "CharField",
                                    },
                                    "lookup_exprs": {
                                        "type": "array",
                                        "readonly": True,
                                        "description": (
                                            "The lookup expressions used by queries.  These may not be "
                                            "useful, since the suffixes should be used to submit a filter."
                                        ),
                                        "title": "Lookup Expressions",
                                        "items": {
                                            "type": "string",
                                            "readonly": True,
                                            "example": "exact",
                                        },
                                    },
                                    "required": {
                                        "type": "boolean",
                                        "readonly": True,
                                        "description": "A value is required when filtering.",
                                        "example": "False",
                                    },
                                    "app_label": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": CHOICES_TRUE_SCHEMA_DESCRIPTION,
                                        "maxLength": 100,
                                        "pattern": "^[a-zA-Z0-9_]+$",
                                        "title": "django app name",
                                        "example": "store",
                                    },
                                    "model": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": CHOICES_TRUE_SCHEMA_DESCRIPTION,
                                        "maxLength": 100,
                                        "pattern": "^[a-zA-Z0-9_]+$",
                                        "title": "model class name",
                                        "example": "cart",
                                    },
                                    "choices": {
                                        "oneOf": [
                                            {
                                                "type": "array",
                                                "readonly": True,
                                                "description": "The choices to choose from.",
                                                "title": "Choices",
                                                "example": "False",
                                                "items": {
                                                    "type": "object",
                                                    "readonly": True,
                                                    "properties": {
                                                        "label": {
                                                            "type": "string",
                                                            "readonly": True,
                                                            "description": "Displayed name for the choice.",
                                                            "example": "Express Shipping",
                                                        },
                                                        "value": {
                                                            "type": "string",
                                                            "readonly": True,
                                                            "description": "PK or code for the choice.",
                                                            "example": "express_shipping",
                                                        },
                                                    },
                                                    "required": [
                                                        "label",
                                                        "value",
                                                    ],
                                                },
                                            },
                                            {
                                                "type": "boolean",
                                                "readonly": True,
                                                "description": (
                                                    'If true, use <a href="#tag/vueda.info/operation'
                                                    '/vueda.info_model_info_filter_choices_list">'
                                                    "List filterset field choices</a> to get the "
                                                    "choices.<br>If false, there are no choices."
                                                ),
                                            },
                                        ],
                                    },
                                    "help_text": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Helpful text about what data should exist in the field.",
                                        "example": "Multiple values may be separated by commas.",
                                    },
                                    "max_length": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Maximum number of characters for the value.",
                                        "example": "32",
                                    },
                                    "min_length": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Minimum number of characters for the value.",
                                        "example": "2",
                                    },
                                    "max_value": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Maximum number allowed for the value.",
                                        "example": "2147483647",
                                    },
                                    "min_value": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Minimum number allowed for the value.",
                                        "example": "-2147483648",
                                    },
                                    "max_digits": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": (
                                            "Maximum number of digits including decimal places for the value."
                                        ),
                                        "example": "12",
                                    },
                                    "decimal_places": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Number of decimal places for the value.",
                                        "example": "2",
                                    },
                                    "empty_label": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "Label for an empty choice.",
                                        "example": "---------",
                                    },
                                    "empty_value": {
                                        "type": "integer",
                                        "readonly": True,
                                        "description": "Value for an empty choice.",
                                        "example": "&quot;&quot;",
                                    },
                                    # Openapi can't do dynamic {key: value} objects, so we
                                    # display it as best as possible, and have an example.
                                    "error_messages": {
                                        "type": "object",
                                        "readonly": True,
                                        "title": "Code: Msg",
                                        "properties": {
                                            "code": {
                                                "type": "string",
                                                "readonly": True,
                                                "title": "msg",
                                                "description": (
                                                    "Code and value of the possible error messages.  Some messages "
                                                    "contain python string replacement keys.<br>Example: <code>"
                                                    "{<br>&nbsp;&nbsp;&nbsp;&nbsp;&quot;invalid_choice&quot;: &quot;"
                                                    "Select a valid choice. %(value)s is not one of the available "
                                                    "choices.&quot;,<br>&nbsp;&nbsp;&nbsp;&nbsp;...<br>}</code>"
                                                ),
                                            }
                                        },
                                    },
                                    "input_formats": {
                                        "type": "array",
                                        "readonly": True,
                                        "description": "A list of the python input formats available.",
                                        "items": {
                                            "type": "string",
                                            "readonly": True,
                                            "example": "%H:%M:%S",
                                        },
                                    },
                                    "input_type": {
                                        "type": "string",
                                        "readonly": True,
                                        "description": "The html widget type used by the widget.",
                                        "example": "select",
                                    },
                                    "suffixes": {
                                        "type": "array",
                                        "readonly": True,
                                        "description": "A list of the suffixes to use with the filter name.",
                                        "items": {
                                            "type": "string",
                                            "readonly": True,
                                            "example": (
                                                "after -> {&quot;last_modified_after&quot;: &quot;2024-08-01&quot;}"
                                            ),
                                        },
                                    },
                                },
                                "required": [
                                    "hidden",
                                    "label",
                                    "lookup_exprs",
                                    "required",
                                    "type_db",
                                    "type_model",
                                    "type_filter",
                                ],
                            },
                        },
                    }

                    # Model Ordering
                    data["content"]["application/json"]["schema"]["properties"]["model_ordering"] = {
                        "type": "array",
                        "title": "Ordering Data",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "readonly": True,
                                    "description": "Field to order by.",
                                    "example": "last_name",
                                },
                                "type": {
                                    "type": "string",
                                    "readonly": True,
                                    "description": "Type of Ordering.",
                                    "enum": [
                                        "alpha",
                                        "boolean",
                                        "date",
                                        "datetime",
                                        "numeric",
                                        "time",
                                    ],
                                },
                            },
                            "required": [
                                "name",
                                "type",
                            ],
                        },
                    }

                    # Model Permissions
                    data["content"]["application/json"]["schema"]["properties"]["model_permissions"] = {
                        "type": "array",
                        "title": "Permissions Data",
                        "items": {
                            "type": "object",
                            "properties": {
                                "codename": {
                                    "type": "string",
                                    "readonly": True,
                                    "example": "create_customerorder",
                                },
                                "name": {
                                    "type": "string",
                                    "readonly": True,
                                    "example": "Can create customer order",
                                },
                            },
                            "required": [
                                "codename",
                                "name",
                            ],
                        },
                    }

                    data["content"]["application/json"]["examples"] = {
                        "GetModelInfoNotExpandedExample": {
                            "summary": "Expanded - Nothing",
                            "description": "uri: /routes/vueda.info/model_info/",
                            "value": {
                                "results": [
                                    {
                                        "id": 1,
                                        "app_label": "store",
                                        "model": "distributor",
                                        "verbose_name": "distributor",
                                        "verbose_name_plural": "distributors",
                                    }
                                ]
                            },
                        },
                        "GetModelInfoActionsExpandedExample": {
                            "summary": "Expanded - model_actions",
                            "description": (
                                "uri: /routes/vueda.info/model_info&ZeroWidthSpace;"
                                "/store/customer/<br>data: e='model_actions'"
                            ),
                            "value": {
                                "results": [
                                    {
                                        "id": 6,
                                        "app_label": "store",
                                        "model": "customer",
                                        "verbose_name": "customer",
                                        "verbose_name_plural": "customers",
                                        "model_actions": [
                                            {
                                                "name": "list",
                                                "description": "list store.customer",
                                                "detail": False,
                                                "bulk": False,
                                                "method_names": ["get"],
                                            },
                                            {
                                                "name": "retrieve",
                                                "description": "retrieve store.customer",
                                                "detail": True,
                                                "bulk": False,
                                                "method_names": ["get"],
                                                "parameters": ["pk"],
                                            },
                                            {
                                                "name": "create",
                                                "description": "create store.customer",
                                                "detail": False,
                                                "bulk": False,
                                                "method_names": ["post"],
                                            },
                                            {
                                                "name": "update",
                                                "description": "update store.customer",
                                                "detail": True,
                                                "bulk": False,
                                                "method_names": ["put"],
                                                "parameters": ["pk"],
                                            },
                                            {
                                                "name": "partial_update",
                                                "description": "partial_update store.customer",
                                                "detail": True,
                                                "bulk": False,
                                                "method_names": ["patch"],
                                                "parameters": ["pk"],
                                            },
                                            {
                                                "name": "destroy",
                                                "description": "destroy store.customer",
                                                "detail": True,
                                                "bulk": True,
                                                "method_names": ["delete"],
                                                "parameters": ["pk"],
                                            },
                                            {
                                                "name": "current",
                                                "description": "current store.customer",
                                                "detail": True,
                                                "bulk": False,
                                                "method_names": ["get"],
                                                "parameters": ["pk"],
                                            },
                                            {
                                                "name": "history-list",
                                                "description": "history-list store.customer",
                                                "detail": True,
                                                "bulk": False,
                                                "method_names": ["get"],
                                                "parameters": ["args", "kwargs"],
                                            },
                                        ],
                                    }
                                ]
                            },
                        },
                        "GetModelInfoExpandsExpandedExample": {
                            "summary": "Expanded - model_expands",
                            "description": (
                                "uri: /routes/vueda.info/model_info/store/product/<br>data: e='model_expands'"
                            ),
                            "value": {
                                "results": [
                                    {
                                        "id": 13,
                                        "app_label": "store",
                                        "model": "product",
                                        "verbose_name": "product",
                                        "verbose_name_plural": "products",
                                        "model_expands": [
                                            {
                                                "name": "distributor",
                                                "read_only": False,
                                                "many": False,
                                                "app_label": "store",
                                                "model": "distributor",
                                                "f": {
                                                    "id": {
                                                        "choices": False,
                                                        "label": "ID",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                        "pk": True,
                                                    },
                                                    "name": {
                                                        "choices": False,
                                                        "label": "Name",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "max_length": 255,
                                                    },
                                                    "formatted_name": {
                                                        "choices": False,
                                                        "label": "Formatted Name",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "GeneratedField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "current_history_id": {
                                                        "choices": False,
                                                        "label": "Current History ID",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": None,
                                                        "type_model": None,
                                                        "type_serializer": "IntegerField",
                                                    },
                                                },
                                            },
                                            {
                                                "name": "history",
                                                "read_only": True,
                                                "many": True,
                                                "f": {
                                                    "id": {
                                                        "choices": False,
                                                        "label": "ID",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "distributor": {
                                                        "choices": True,
                                                        "label": "Distributor",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "app_label": "store",
                                                        "model": "distributor",
                                                    },
                                                    "name": {
                                                        "choices": False,
                                                        "label": "Name",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "max_length": 255,
                                                    },
                                                    "description": {
                                                        "choices": False,
                                                        "label": "Description",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "TextField",
                                                        "type_model": "TextField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "disabled": {
                                                        "choices": False,
                                                        "label": "Disabled",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "BooleanField",
                                                        "type_model": "BooleanField",
                                                        "type_serializer": "BooleanField",
                                                    },
                                                    "tangible_type": {
                                                        "choices": True,
                                                        "label": "Tangible Type",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "app_label": "store",
                                                        "model": "tangibletype",
                                                    },
                                                    "special_care": {
                                                        "choices": True,
                                                        "label": "Special Care",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "ManyToManyField",
                                                        "type_model": "ManyToManyField",
                                                        "type_serializer": "ManyRelatedField",
                                                        "app_label": "store",
                                                        "model": "specialcare",
                                                    },
                                                    "order_between": {
                                                        "choices": False,
                                                        "label": "Order Between",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "IntegerRangeField",
                                                        "type_model": "IntegerRangeField",
                                                        "type_serializer": "ModelField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "last_ten_order_betweens": {
                                                        "choices": False,
                                                        "label": "Last Ten Order Betweens",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "IntegerRangeField",
                                                        "type_model": "IntegerRangeField",
                                                        "type_serializer": "ModelField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "current_sale_date": {
                                                        "choices": False,
                                                        "label": "Current Sale Date",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateRangeField",
                                                        "type_model": "DateRangeField",
                                                        "type_serializer": "RangeField",
                                                    },
                                                    "future_sale_dates": {
                                                        "choices": False,
                                                        "label": "Future Sale Dates",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateRangeField",
                                                        "type_model": "DateRangeField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "reviews": {
                                                        "choices": False,
                                                        "label": "Reviews",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "internal_comments": {
                                                        "choices": False,
                                                        "label": "Internal Comments",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "TextField",
                                                        "type_model": "TextField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "last_ordered": {
                                                        "choices": False,
                                                        "label": "Last Ordered",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateField",
                                                        "type_model": "DateField",
                                                        "type_serializer": "DateField",
                                                    },
                                                    "formatted_name": {
                                                        "choices": False,
                                                        "label": "Formatted Name",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "GeneratedField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "history_id": {
                                                        "label": "History ID",
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "read_only": True,
                                                        "pk": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_date": {
                                                        "label": "History Date",
                                                        "type_db": "DateTimeField",
                                                        "type_model": "DateTimeField",
                                                        "type_serializer": "DateTimeField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_change_reason": {
                                                        "label": "Change Reason",
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_type": {
                                                        "label": "History Type",
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_relation": {
                                                        "label": "In Relation To",
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
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
                                                        "many": False,
                                                        "required": False,
                                                    },
                                                },
                                                "app_label": "store",
                                                "model": "historicalproduct",
                                            },
                                            {
                                                "name": "first_history_entry",
                                                "read_only": True,
                                                "many": False,
                                                "f": {
                                                    "id": {
                                                        "choices": False,
                                                        "label": "ID",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "distributor": {
                                                        "choices": True,
                                                        "label": "Distributor",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "app_label": "store",
                                                        "model": "distributor",
                                                    },
                                                    "name": {
                                                        "choices": False,
                                                        "label": "Name",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "max_length": 255,
                                                    },
                                                    "description": {
                                                        "choices": False,
                                                        "label": "Description",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "TextField",
                                                        "type_model": "TextField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "disabled": {
                                                        "choices": False,
                                                        "label": "Disabled",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "BooleanField",
                                                        "type_model": "BooleanField",
                                                        "type_serializer": "BooleanField",
                                                    },
                                                    "tangible_type": {
                                                        "choices": True,
                                                        "label": "Tangible Type",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "app_label": "store",
                                                        "model": "tangibletype",
                                                    },
                                                    "special_care": {
                                                        "choices": True,
                                                        "label": "Special Care",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "ManyToManyField",
                                                        "type_model": "ManyToManyField",
                                                        "type_serializer": "ManyRelatedField",
                                                        "app_label": "store",
                                                        "model": "specialcare",
                                                    },
                                                    "order_between": {
                                                        "choices": False,
                                                        "label": "Order Between",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "IntegerRangeField",
                                                        "type_model": "IntegerRangeField",
                                                        "type_serializer": "ModelField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "last_ten_order_betweens": {
                                                        "choices": False,
                                                        "label": "Last Ten Order Betweens",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "IntegerRangeField",
                                                        "type_model": "IntegerRangeField",
                                                        "type_serializer": "ModelField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "current_sale_date": {
                                                        "choices": False,
                                                        "label": "Current Sale Date",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateRangeField",
                                                        "type_model": "DateRangeField",
                                                        "type_serializer": "RangeField",
                                                    },
                                                    "future_sale_dates": {
                                                        "choices": False,
                                                        "label": "Future Sale Dates",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateRangeField",
                                                        "type_model": "DateRangeField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "reviews": {
                                                        "choices": False,
                                                        "label": "Reviews",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "internal_comments": {
                                                        "choices": False,
                                                        "label": "Internal Comments",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "TextField",
                                                        "type_model": "TextField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "last_ordered": {
                                                        "choices": False,
                                                        "label": "Last Ordered",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateField",
                                                        "type_model": "DateField",
                                                        "type_serializer": "DateField",
                                                    },
                                                    "formatted_name": {
                                                        "choices": False,
                                                        "label": "Formatted Name",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "GeneratedField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "history_id": {
                                                        "label": "History ID",
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "read_only": True,
                                                        "pk": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_date": {
                                                        "label": "History Date",
                                                        "type_db": "DateTimeField",
                                                        "type_model": "DateTimeField",
                                                        "type_serializer": "DateTimeField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_change_reason": {
                                                        "label": "Change Reason",
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_type": {
                                                        "label": "History Type",
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_relation": {
                                                        "label": "In Relation To",
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_user": {
                                                        "label": "History User",
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                },
                                                "app_label": "store",
                                                "model": "historicalproduct",
                                            },
                                            {
                                                "name": "last_history_entry",
                                                "read_only": True,
                                                "many": False,
                                                "f": {
                                                    "id": {
                                                        "choices": False,
                                                        "label": "ID",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "distributor": {
                                                        "choices": True,
                                                        "label": "Distributor",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "app_label": "store",
                                                        "model": "distributor",
                                                    },
                                                    "name": {
                                                        "choices": False,
                                                        "label": "Name",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "max_length": 255,
                                                    },
                                                    "description": {
                                                        "choices": False,
                                                        "label": "Description",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "TextField",
                                                        "type_model": "TextField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "disabled": {
                                                        "choices": False,
                                                        "label": "Disabled",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "BooleanField",
                                                        "type_model": "BooleanField",
                                                        "type_serializer": "BooleanField",
                                                    },
                                                    "tangible_type": {
                                                        "choices": True,
                                                        "label": "Tangible Type",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "app_label": "store",
                                                        "model": "tangibletype",
                                                    },
                                                    "special_care": {
                                                        "choices": True,
                                                        "label": "Special Care",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "ManyToManyField",
                                                        "type_model": "ManyToManyField",
                                                        "type_serializer": "ManyRelatedField",
                                                        "app_label": "store",
                                                        "model": "specialcare",
                                                    },
                                                    "order_between": {
                                                        "choices": False,
                                                        "label": "Order Between",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": True,
                                                        "type_db": "IntegerRangeField",
                                                        "type_model": "IntegerRangeField",
                                                        "type_serializer": "ModelField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "last_ten_order_betweens": {
                                                        "choices": False,
                                                        "label": "Last Ten Order Betweens",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "IntegerRangeField",
                                                        "type_model": "IntegerRangeField",
                                                        "type_serializer": "ModelField",
                                                        "max_value": 2147483647,
                                                        "min_value": -2147483648,
                                                    },
                                                    "current_sale_date": {
                                                        "choices": False,
                                                        "label": "Current Sale Date",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateRangeField",
                                                        "type_model": "DateRangeField",
                                                        "type_serializer": "RangeField",
                                                    },
                                                    "future_sale_dates": {
                                                        "choices": False,
                                                        "label": "Future Sale Dates",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateRangeField",
                                                        "type_model": "DateRangeField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "reviews": {
                                                        "choices": False,
                                                        "label": "Reviews",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "internal_comments": {
                                                        "choices": False,
                                                        "label": "Internal Comments",
                                                        "many": True,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "TextField",
                                                        "type_model": "TextField",
                                                        "type_serializer": "CharField",
                                                    },
                                                    "last_ordered": {
                                                        "choices": False,
                                                        "label": "Last Ordered",
                                                        "many": False,
                                                        "read_only": False,
                                                        "required": False,
                                                        "type_db": "DateField",
                                                        "type_model": "DateField",
                                                        "type_serializer": "DateField",
                                                    },
                                                    "formatted_name": {
                                                        "choices": False,
                                                        "label": "Formatted Name",
                                                        "many": False,
                                                        "read_only": True,
                                                        "required": False,
                                                        "type_db": "CharField",
                                                        "type_model": "GeneratedField",
                                                        "type_serializer": "ModelField",
                                                    },
                                                    "history_id": {
                                                        "label": "History ID",
                                                        "type_db": "AutoField",
                                                        "type_model": "AutoField",
                                                        "type_serializer": "IntegerField",
                                                        "read_only": True,
                                                        "pk": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_date": {
                                                        "label": "History Date",
                                                        "type_db": "DateTimeField",
                                                        "type_model": "DateTimeField",
                                                        "type_serializer": "DateTimeField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_change_reason": {
                                                        "label": "Change Reason",
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_type": {
                                                        "label": "History Type",
                                                        "type_db": "CharField",
                                                        "type_model": "CharField",
                                                        "type_serializer": "CharField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_relation": {
                                                        "label": "In Relation To",
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                    "history_user": {
                                                        "label": "History User",
                                                        "type_db": "ForeignKey",
                                                        "type_model": "ForeignKey",
                                                        "type_serializer": "PrimaryKeyRelatedField",
                                                        "read_only": True,
                                                        "many": False,
                                                        "required": False,
                                                        "choices": False,
                                                    },
                                                },
                                                "app_label": "store",
                                                "model": "historicalproduct",
                                            },
                                        ],
                                    }
                                ]
                            },
                        },
                        "GetModelInfoFieldsExpandedExample": {
                            "summary": "Expanded - model_fields",
                            "description": (
                                "uri: /routes/vueda.info/model_info/store/customerorder/<br>data: e='model_fields'"
                            ),
                            "value": {
                                "results": [
                                    {
                                        "id": 8,
                                        "app_label": "store",
                                        "model": "customerorder",
                                        "verbose_name": "customer order",
                                        "verbose_name_plural": "customer orders",
                                        "model_fields": {
                                            "id": {
                                                "choices": False,
                                                "label": "ID",
                                                "many": False,
                                                "read_only": True,
                                                "required": False,
                                                "type_db": "AutoField",
                                                "type_model": "AutoField",
                                                "type_serializer": "IntegerField",
                                                "max_value": 2147483647,
                                                "min_value": -2147483648,
                                                "pk": True,
                                            },
                                            "order_number": {
                                                "choices": False,
                                                "label": "Order Number",
                                                "many": False,
                                                "read_only": False,
                                                "required": True,
                                                "type_db": "DecimalField",
                                                "type_model": "DecimalField",
                                                "type_serializer": "DecimalField",
                                                "max_digits": 7,
                                                "decimal_places": 0,
                                            },
                                            "when": {
                                                "choices": False,
                                                "label": "Date / Time",
                                                "many": False,
                                                "read_only": True,
                                                "required": False,
                                                "type_db": "DateTimeField",
                                                "type_model": "DateTimeField",
                                                "type_serializer": "DateTimeField",
                                            },
                                            "customer": {
                                                "choices": True,
                                                "label": "Customer",
                                                "many": False,
                                                "read_only": False,
                                                "required": True,
                                                "type_db": "ForeignKey",
                                                "type_model": "ForeignKey",
                                                "type_serializer": "PrimaryKeyRelatedField",
                                                "app_label": "store",
                                                "model": "customer",
                                            },
                                            "order_state": {
                                                "choices": True,
                                                "label": "Order State",
                                                "many": False,
                                                "read_only": False,
                                                "required": True,
                                                "type_db": "ForeignKey",
                                                "type_model": "ForeignKey",
                                                "type_serializer": "PrimaryKeyRelatedField",
                                                "app_label": "store",
                                                "model": "orderstate",
                                            },
                                            "shipping_method": {
                                                "choices": [
                                                    {"label": "Free", "value": "free"},
                                                    {"label": "Regular", "value": "regular"},
                                                    {"label": "Express", "value": "express"},
                                                ],
                                                "label": "Shipping Method",
                                                "many": False,
                                                "read_only": False,
                                                "required": False,
                                                "type_db": "CharField",
                                                "type_model": "CharField",
                                                "type_serializer": "ChoiceField",
                                            },
                                            "formatted_name": {
                                                "choices": False,
                                                "label": "Formatted Name",
                                                "many": False,
                                                "read_only": True,
                                                "required": False,
                                                "type_db": "CharField",
                                                "type_model": "GeneratedField",
                                                "type_serializer": "ModelField",
                                            },
                                            "current_history_id": {
                                                "choices": False,
                                                "label": "Current History ID",
                                                "many": False,
                                                "read_only": True,
                                                "required": False,
                                                "type_db": None,
                                                "type_model": None,
                                                "type_serializer": "IntegerField",
                                            },
                                        },
                                    }
                                ]
                            },
                        },
                        "GetModelInfoFilteringExpandedExample": {
                            "summary": "Expanded - model_filtering",
                            "description": (
                                "uri: /routes/vueda.info/model_info/store/cart/<br>data: e='model_filtering'"
                            ),
                            "value": {
                                "results": [
                                    {
                                        "id": 7,
                                        "app_label": "store",
                                        "model": "cart",
                                        "verbose_name": "cart",
                                        "verbose_name_plural": "carts",
                                        "model_filtering": {
                                            "last_modified": {
                                                "hidden": False,
                                                "label": "Last modified",
                                                "lookup_exprs": [],
                                                "required": False,
                                                "type_db": "DateTimeField",
                                                "type_model": "DateTimeField",
                                                "type_filter": "DateTimeRangeField",
                                                "choices": False,
                                                "error_messages": {
                                                    "invalid": "Enter a list of values.",
                                                    "incomplete": "Enter a complete value.",
                                                },
                                                "input_type": "text",
                                                "suffixes": ["after", "before"],
                                            },
                                            "id": {
                                                "hidden": True,
                                                "label": "Id Is In",
                                                "lookup_exprs": ["in"],
                                                "required": False,
                                                "type_db": "AutoField",
                                                "type_model": "AutoField",
                                                "type_filter": "DecimalInField",
                                                "choices": False,
                                                "error_messages": {"invalid": "Enter a number."},
                                                "help_text": "Multiple values may be separated by commas.",
                                                "input_type": "hidden",
                                                "max_value": 2147483647,
                                                "min_value": -2147483648,
                                            },
                                            "reserved_delivery_time": {
                                                "hidden": False,
                                                "label": "Reserved Delivery Time",
                                                "lookup_exprs": ["exact"],
                                                "required": False,
                                                "type_db": "DateTimeField",
                                                "type_model": "DateTimeField",
                                                "type_filter": "DateTimeField",
                                                "choices": False,
                                                "error_messages": {"invalid": "Enter a valid date/time."},
                                                "input_formats": [
                                                    "%Y-%m-%d %H:%M:%S",
                                                    "%Y-%m-%d %H:%M:%S.%f",
                                                    "%Y-%m-%d %H:%M",
                                                    "%m/%d/%Y %H:%M:%S",
                                                    "%m/%d/%Y %H:%M:%S.%f",
                                                    "%m/%d/%Y %H:%M",
                                                    "%m/%d/%y %H:%M:%S",
                                                    "%m/%d/%y %H:%M:%S.%f",
                                                    "%m/%d/%y %H:%M",
                                                    "%Y-%m-%d",
                                                    "%Y-%m-%d",
                                                    "%m/%d/%Y",
                                                    "%m/%d/%y",
                                                    "%b %d %Y",
                                                    "%b %d, %Y",
                                                    "%d %b %Y",
                                                    "%d %b, %Y",
                                                    "%B %d %Y",
                                                    "%B %d, %Y",
                                                    "%d %B %Y",
                                                    "%d %B, %Y",
                                                ],
                                                "input_type": "text",
                                            },
                                            "reserved_until": {
                                                "hidden": False,
                                                "label": "Reserved Until",
                                                "lookup_exprs": ["exact"],
                                                "required": False,
                                                "type_db": "TimeField",
                                                "type_model": "TimeField",
                                                "type_filter": "TimeField",
                                                "choices": False,
                                                "error_messages": {"invalid": "Enter a valid time."},
                                                "input_formats": ["%H:%M:%S", "%H:%M:%S.%f", "%H:%M"],
                                                "input_type": "text",
                                            },
                                            "expected_delivery_time": {
                                                "hidden": False,
                                                "label": "Expected Delivery Time",
                                                "lookup_exprs": ["exact"],
                                                "required": False,
                                                "type_db": "DurationField",
                                                "type_model": "DurationField",
                                                "type_filter": "DurationField",
                                                "choices": False,
                                                "error_messages": {
                                                    "invalid": "Enter a valid duration.",
                                                    "overflow": (
                                                        "The number of days must be between -999999999 and 999999999."
                                                    ),
                                                },
                                                "input_type": "text",
                                            },
                                            "product_name": {
                                                "hidden": False,
                                                "label": "Product name",
                                                "lookup_exprs": ["exact"],
                                                "required": False,
                                                "type_db": "CharField",
                                                "type_model": "CharField",
                                                "type_filter": "MultipleChoiceField",
                                                "choices": True,
                                                "app_label": "store",
                                                "model": "cart",
                                                "filterset_name": "CartFilterSet",
                                                "empty_label": None,
                                                "error_messages": {
                                                    "invalid_choice": (
                                                        "Select a valid choice. %(value)s "
                                                        "is not one of the available choices."
                                                    ),
                                                    "invalid_list": "Enter a list of values.",
                                                },
                                                "input_type": "select",
                                                "null_label": None,
                                                "null_value": "null",
                                            },
                                            "product_quantity": {
                                                "hidden": False,
                                                "label": "Product quantity",
                                                "lookup_exprs": ["exact"],
                                                "required": False,
                                                "type_db": "IntegerField",
                                                "type_model": "IntegerField",
                                                "type_filter": "MultipleChoiceField",
                                                "choices": True,
                                                "app_label": "store",
                                                "model": "cart",
                                                "filterset_name": "CartFilterSet",
                                                "empty_label": None,
                                                "error_messages": {
                                                    "invalid_choice": (
                                                        "Select a valid choice. %(value)s "
                                                        "is not one of the available choices."
                                                    ),
                                                    "invalid_list": "Enter a list of values.",
                                                },
                                                "input_type": "select",
                                                "null_label": None,
                                                "null_value": "null",
                                            },
                                        },
                                    }
                                ]
                            },
                        },
                        "GetModelInfoOrderingExpandedExample": {
                            "summary": "Expanded - model_ordering",
                            "description": (
                                "uri: /routes/vueda.info/model_info/store/customerorder/<br>data: e='model_ordering'"
                            ),
                            "value": {
                                "results": [
                                    {
                                        "id": 8,
                                        "app_label": "store",
                                        "model": "customerorder",
                                        "verbose_name": "customer order",
                                        "verbose_name_plural": "customer orders",
                                        "model_ordering": [
                                            {"name": "order_number", "type": "numeric"},
                                            {"name": "customer__user__email", "type": "alpha"},
                                            {"name": "when", "type": "datetime"},
                                            {"name": "order_state", "type": "alpha"},
                                        ],
                                    }
                                ]
                            },
                        },
                        "GetModelInfoPermissionsExpandedExample": {
                            "summary": "Expanded - model_permissions",
                            "description": (
                                "uri: /routes/vueda.info/model_info/store/customerorder/<br>data: e='model_permissions'"
                            ),
                            "value": {
                                "results": [
                                    {
                                        "id": 8,
                                        "app_label": "store",
                                        "model": "customerorder",
                                        "verbose_name": "customer order",
                                        "verbose_name_plural": "customer orders",
                                        "model_permissions": [
                                            {"codename": "create_customerorder", "name": "Can create customer order"},
                                            {"codename": "delete_customerorder", "name": "Can delete customer order"},
                                            {"codename": "fulfill_orders", "name": "Can fulfill orders"},
                                            {"codename": "list_customerorder", "name": "Can list customer order"},
                                            {"codename": "manage_customerorder", "name": "Can manage customer order"},
                                            {"codename": "pack_order", "name": "Can pack order customer order"},
                                            {"codename": "read_customerorder", "name": "Can read customer order"},
                                            {"codename": "update_customerorder", "name": "Can update customer order"},
                                        ],
                                    }
                                ]
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "GetModelPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info&ZeroWidthSpace;/store/customer/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.INFO_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "InvalidGetModelInfoContentTypeExample": {
                                        "summary": "Invalid content type",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info&ZeroWidthSpace;"
                                            "/store/pets/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": 'Unable to find the content type "store.pets".',
                                            "serverStack": open_api_tracebacks.INFO_INVALID_CONTENT_TYPE,
                                        },
                                    },
                                    "InvalidGetModelInfoFieldExample": {
                                        "summary": "Invalid field",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info&ZeroWidthSpace;"
                                            "/store/customer/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": [
                                                "Invalid field 'tangible_type'. Valid fields with choices are user."
                                            ],
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_INVALID_FIELD,
                                        },
                                    },
                                },
                            }
                        }
                    }


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

    def customize_schema_request_data(self, request_data):  # pragma: no cover
        match self.context["request"].path:
            case "/routes/vueda.info/model_info_choices/{app_label}/{model}/{field}/":
                request_data["content"] = {}  # This prevents a message of 'Schema not provided' for the body.

        return request_data

    def customize_schema_response_data(self, auto_schema, response_data):  # pragma: no cover
        request = self.context["request"]

        for status_code, data in tuple(response_data.items()):  # tuple because we may add items.
            match (request.method, request.path, status_code):
                # List field choices
                case ("GET", "/routes/vueda.info/model_info_choices/{app_label}/{model}/{field}/", "200"):
                    data["content"]["application/json"]["examples"] = {
                        "ListModelInfoChoicesWithResultsExample": {
                            "summary": "With Results",
                            "description": (
                                "uri: /routes/vueda.info/model_info_choices&ZeroWidthSpace;"
                                "/store/product/tangible_type/"
                            ),
                            "value": {
                                "results": [
                                    {"label": "Digital", "value": "1"},
                                    {"label": "Physical", "value": "2"},
                                ],
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 2,
                            },
                        },
                        "ListModelInfoChoicesNoResultsExample": {
                            "summary": "No Results",
                            "description": (
                                "uri: /routes/vueda.info/model_info_choices&ZeroWidthSpace;"
                                "/store/product/tangible_type/"
                            ),
                            "value": {
                                "results": [],
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 0,
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ListModelInfoChoicesPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info_choices&ZeroWidthSpace;"
                                            "/store/product/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "InvalidListModelInfoChoicesContentTypeExample": {
                                        "summary": "Invalid content type",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info_choices&ZeroWidthSpace;"
                                            "/store/pets/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": 'Unable to find the content type "store.pets".',
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_INVALID_CONTENT_TYPE,
                                        },
                                    },
                                    "InvalidListModelInfoChoicesFieldExample": {
                                        "summary": "Invalid field",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info_choices&ZeroWidthSpace;"
                                            "/store/customer/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": [
                                                "Invalid field 'tangible_type'. Valid fields with choices are user."
                                            ],
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_INVALID_FIELD,
                                        },
                                    },
                                },
                            }
                        }
                    }


class ModelInfoFilterSetChoicesSerializer(ModelInfoChoicesSerializer):
    def customize_schema_request_data(self, request_data):  # pragma: no cover
        match self.context["request"].path:
            case "/routes/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/":
                request_data["content"] = {}  # This prevents a message of 'Schema not provided' for the body.

        return request_data

    def customize_schema_response_data(self, auto_schema, response_data):  # pragma: no cover
        request = self.context["request"]

        for status_code, data in tuple(response_data.items()):  # tuple because we may add items.
            match (request.method, request.path, status_code):
                # List filterset field choices
                case ("GET", "/routes/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/", "200"):
                    data["content"]["application/json"]["examples"] = {
                        "ListModelInfoFilterChoicesWithResultsExample": {
                            "summary": "With Results",
                            "description": (
                                "uri: /routes/vueda.info/model_info_filter_choices&ZeroWidthSpace;"
                                "/store/product/tangible_type/"
                            ),
                            "value": {
                                "results": [
                                    {"label": "Digital", "value": "1"},
                                    {"label": "Physical", "value": "2"},
                                ],
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 2,
                            },
                        },
                        "ListModelInfoFilterChoicesNoResultsExample": {
                            "summary": "No Results",
                            "description": (
                                "uri: /routes/vueda.info/model_info_filter_choices&ZeroWidthSpace;"
                                "/store/product/tangible_type/"
                            ),
                            "value": {
                                "results": [],
                                "perPage": settings.MAX_PAGE_SIZE,
                                "totalPages": 1,
                                "totalRecords": 0,
                            },
                        },
                    }

                    response_data["403"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "ListModelInfoFilterChoicesPermissionDeniedExample": {
                                        "summary": "Permission denied",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info_filter_choices&ZeroWidthSpace;"
                                            "/store/product/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": "You do not have permission to perform this action.",
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_DENIED,
                                        },
                                    },
                                },
                            }
                        }
                    }

                    response_data["404"] = {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": [
                                        "detail",
                                        "serverStack",
                                    ],
                                    "properties": {
                                        "detail": {
                                            "type": "string",
                                        },
                                        "serverStack": {
                                            "type": "string",
                                        },
                                    },
                                    "readOnly": True,
                                },
                                "examples": {
                                    "InvalidListModelInfoFilterChoicesContentTypeExample": {
                                        "summary": "Invalid content type",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info_filter_choices&ZeroWidthSpace;"
                                            "/store/pets/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": 'Unable to find the content type "store.pets".',
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_INVALID_CONTENT_TYPE,
                                        },
                                    },
                                    "InvalidListModelInfoFilterChoicesFieldExample": {
                                        "summary": "Invalid field",
                                        "description": (
                                            "uri: /routes/vueda.info/model_info_filter_choices&ZeroWidthSpace;"
                                            "/store/customer/tangible_type/"
                                        ),
                                        "value": {
                                            "detail": [
                                                "Invalid field 'tangible_type'. Valid fields with choices are user."
                                            ],
                                            "serverStack": open_api_tracebacks.INFO_CHOICES_INVALID_FIELD,
                                        },
                                    },
                                },
                            }
                        }
                    }
