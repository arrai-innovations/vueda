"""Serializer fields for available actions, template tags, and templated text."""

__all__ = (
    "AvailableActionsField",
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
            "style": {"hidden": True},
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
