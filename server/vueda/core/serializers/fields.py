"""DRF serializer fields tied to Vueda domain concepts.

Custom serializer fields for available actions, template tags, and
templated text. Unlike the generic field-type helpers in
vueda.core.fields.serializers, these are specific to Vueda's
serialization layer and have no standalone Django field counterpart.
"""

__all__ = (
    "AvailableActionsField",
    "CompositePrimaryKeyField",
    "FormattedNameField",
    "TemplateTagsDataField",
    "TemplatedTextField",
)

from collections.abc import Iterable
from collections.abc import Mapping

from django.core.serializers.base import DeserializationError
from django.core.serializers.base import SerializationError
from rest_framework import serializers
from rest_framework.fields import SkipField

from vueda.core.formatted_name import FORMATTED_NAME
from vueda.core.formatted_name import formatted_name_of
from vueda.core.open_api import conditional_extend_schema_field_decorator
from vueda.core.permissions import check_action_permission
from vueda.core.utils import implemented_builtin_actions


@conditional_extend_schema_field_decorator({"type": "string", "nullable": True})
class FormattedNameField(serializers.ReadOnlyField):
    """
    Serves a model's ``formatted_name``, hidden and read only.

    A row that the database loaded carries ``formatted_name`` as its column or as the annotation that
    ``formatted_name_lookup_expression`` adds, and this field returns that value as it is. A row
    without either value falls back to ``formatted_name_of()``. That covers a ``get_formatted_name()``
    model, and an instance that a create, an update, or code built without the annotation.

    It stays a ``ReadOnlyField`` whose source is ``formatted_name``, so model info resolves the
    column or the lookup expression behind it.

    To serve a different value, declare the field with your own ``source``, such as
    ``FormattedNameField(source="data.formatted_name")``. A field with any other ``source`` reads
    that path the way a ``ReadOnlyField`` does, with no fallback.
    """

    def __init__(self, **kwargs):
        # Keep the field hidden when a caller passes other style keys, such as list_default.
        kwargs["style"] = {"hidden": True, **(kwargs.get("style") or {})}
        super().__init__(**kwargs)

    def bind(self, field_name, parent):
        # A field declared under another name, such as customer_label, still serves the formatted
        # name unless it names its own source. DRF would default the source to the field's name.
        if self.source is None and field_name != FORMATTED_NAME:
            self.source = FORMATTED_NAME
        super().bind(field_name, parent)

    def get_attribute(self, instance):
        # An unbound field has no source yet, which means the default one.
        if self.source not in (None, FORMATTED_NAME):
            return super().get_attribute(instance)

        # A mapping, such as validated_data or a values() row, is not a model instance. Read its
        # key the way a ReadOnlyField does, and leave the field out when the key is missing.
        if isinstance(instance, Mapping):
            if FORMATTED_NAME not in instance:
                raise SkipField
            return instance[FORMATTED_NAME]

        # A loaded value lives in the instance's own __dict__. The `formatted_name = None` that a
        # lookup-expression or method model declares lives on the class, and means "not loaded".
        loaded = getattr(instance, "__dict__", {})
        if FORMATTED_NAME in loaded:
            return loaded[FORMATTED_NAME]
        try:
            return formatted_name_of(instance)
        except (KeyError, AttributeError):
            # DRF leaves a read-only field out when its value cannot be read, such as a generated
            # column on an unsaved instance. Keep doing that rather than failing the response.
            if not self.required:
                raise SkipField from None
            raise


class AvailableActionsField(serializers.ListField):
    def __init__(self):
        kwargs = {
            "child": serializers.CharField(read_only=True),
            "read_only": True,
            "required": False,
            "style": {"hidden": True},
            "source": "*",
        }
        super().__init__(**kwargs)

    def get_value(self, instance):
        request = self.context["request"]

        viewset = self.context["view"]

        available_actions = []
        if hasattr(viewset, "get_permissions"):
            if instance is None:
                instances = self.parent.instance
                if instances is None:
                    instances = self.root.instance
                if not isinstance(instances, Iterable):
                    instances = (instances,)
            else:
                instances = (instance,)

            for action in implemented_builtin_actions(viewset):
                # Create doesn't make sense on an instance
                if action == "create" and instance:
                    continue

                allowed = False
                for instance in instances:
                    if check_action_permission(viewset, request, instance, action):
                        allowed = True
                        break
                if allowed:
                    available_actions.append(action)

        if hasattr(viewset, "get_allowed_extra_actions"):
            available_actions.extend(sorted(viewset.get_allowed_extra_actions(request, instance=instance)))

        return available_actions

    def get_attribute(self, instance):
        return self.get_value(instance)

    def to_internal_value(self, data):
        raise NotImplementedError()

    def to_representation(self, data):
        return data

    def run_child_validation(self, data):
        return data


class TemplateTagsDataField(serializers.JSONField):
    """
    This field is for clients to know what component to use.
    """


class TemplatedTextField(serializers.JSONField):
    """
    This field is for client widget mapping purpose.
    """


class CompositePrimaryKeyField(serializers.CharField):
    """
    CompositePrimaryKey returns the pk as a json list:
    '["1", "1"]'

    Internally it needs to convert it back to a list or tuple queries won't work:
        TupleExact
        TupleGreaterThan
        TupleGreaterThanOrEqual
        TupleLessThan
        TupleLessThanOrEqual
        TupleIn
        TupleIsNull
    """

    def to_representation(self, value):
        # value_to_string requires a class with a pk attribute.
        class PK:
            def __init__(self, pk):
                self.pk = pk

        obj = PK(value)

        # Get the CompositePrimaryKey field off the model, so we can call value_to_string.
        composite_primary_key = self.parent.Meta.model._meta.pk
        try:
            return composite_primary_key.value_to_string(obj)
        except Exception as e:
            raise SerializationError(f"{e}: ({self.parent.Meta.model}:pk={composite_primary_key}) pk was '{value}'")

    def to_internal_value(self, data):
        # Get the CompositePrimaryKey field off the model, so we can call to_python.
        composite_primary_key = self.parent.Meta.model._meta.pk
        try:
            return composite_primary_key.to_python(data)
        except Exception as e:
            raise DeserializationError.WithData(e, self.parent.Meta.model, composite_primary_key, data)
