"""DRF serializer fields tied to Vueda domain concepts.

Custom serializer fields for available actions, template tags, and
templated text. Unlike the generic field-type helpers in
vueda.core.fields.serializers, these are specific to Vueda's
serialization layer and have no standalone Django field counterpart.
"""

__all__ = (
    "AvailableActionsField",
    "CompositePrimaryKeyField",
    "TemplateTagsDataField",
    "TemplatedTextField",
)

from collections.abc import Iterable

from django.core.serializers.base import DeserializationError
from django.core.serializers.base import SerializationError
from rest_framework import serializers

from vueda.core.permissions import check_action_permission
from vueda.core.utils import implemented_builtin_actions


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
