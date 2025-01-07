from django.utils.itercompat import is_iterable
from rest_framework import serializers

from vueda.core.utils import AvailableActionsRequest


class AvailableActionsField(serializers.ListField):
    def __init__(self):
        kwargs = {
            "child": serializers.CharField(read_only=True),
            "read_only": True,
            "required": False,
        }
        super().__init__(**kwargs)

    def get_value(self, dictionary):
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

            instances = self.parent.instance
            if instances is None:
                instances = self.root.instance
            if not is_iterable(instances):
                instances = (instances,)

            for http_method in ("DELETE", "GET", "PATCH", "POST", "PUT"):
                allowed = False
                fake_request.method = http_method
                for instance in instances:
                    try:
                        check_viewset.check_object_permissions(fake_request, instance)
                        allowed = True
                        break
                    except Exception:
                        pass
                if allowed:
                    available_actions.append(http_method)

        if hasattr(viewset, "get_allowed_extra_actions"):
            available_actions.extend(sorted(viewset.get_allowed_extra_actions(request)))

        return available_actions

    def get_attribute(self, instance):
        return self.get_value(None)

    def to_internal_value(self, data):
        raise NotImplementedError()

    def to_representation(self, data):
        return data

    def run_child_validation(self, data):
        return data
