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

from django.http import Http404
from django.utils.itercompat import is_iterable
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from vueda.core.utils import AvailableActionsRequest


class AvailableActionsField(serializers.ListField):
    def __init__(self):
        kwargs = {
            "child": serializers.CharField(read_only=True),
            "read_only": True,
            "required": False,
        }
        super().__init__(**kwargs)

    def get_value(self, instance):
        from vueda.info.serializers import METHOD_MAPPING

        request = self.context["request"]
        user = request.user

        viewset = self.context["view"]

        available_actions = []
        if hasattr(viewset, "check_object_permissions"):
            check_viewset = viewset
            fake_request = AvailableActionsRequest(
                user=user,
                authenticators=request.authenticators,
                successful_authenticator=request.successful_authenticator,
            )

            if instance is None:
                instances = self.parent.instance
                if instances is None:
                    instances = self.root.instance
                if not is_iterable(instances):
                    instances = (instances,)
            else:
                instances = (instance,)

            for action in ("list", "retrieve", "create", "update", "partial_update", "destroy"):
                # Create doesn't make sense on an instance
                if action == "create" and instance:
                    continue

                allowed = False
                fake_request.method = METHOD_MAPPING[action].upper()
                for instance in instances:
                    try:
                        check_viewset.check_object_permissions(fake_request, instance)
                        allowed = True
                        break
                    except (PermissionDenied, Http404):
                        pass
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

    pass


class TemplatedTextField(serializers.JSONField):
    """
    This field is for client widget mapping purpose.
    """

    pass


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

            def value_from_object(self):
                return self.pk

        obj = PK(value)

        # Get the CompositePrimaryKey field off the model, so we can call value_to_string.
        composite_primary_key = self.parent.Meta.model._meta.pk
        return composite_primary_key.value_to_string(obj)

    def to_internal_value(self, data):
        # Get the CompositePrimaryKey field off the model, so we can call to_python.
        composite_primary_key = self.parent.Meta.model._meta.pk
        return composite_primary_key.to_python(data)
