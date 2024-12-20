from django.utils.itercompat import is_iterable
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.settings import api_settings


class AvailableActionsRequest:
    def __init__(self, *, method="GET", user=None, authenticators=(), successful_authenticator=()):
        self.authenticators = authenticators
        self.method = method
        self.successful_authenticator = successful_authenticator
        self.user = user


class AvailableActionsWhoIsView:
    def __init__(self, request, serializer_class, queryset):
        self.request = request
        self.serializer_class = serializer_class
        self.queryset = queryset

    def get_queryset(self):
        if callable(self.queryset):
            return self.queryset()
        return self.queryset

    def get_permissions(self):
        """
        Use the default permission classes.
        """
        return [permission() for permission in api_settings.DEFAULT_PERMISSION_CLASSES]

    def check_object_permissions(self, request, obj):
        """
        Check if the request should be permitted for a given object.
        Raises an appropriate exception if the request is not permitted.
        """
        for permission in self.get_permissions():
            if not permission.has_object_permission(request, self, obj):
                raise PermissionDenied(
                    detail=getattr(permission, "message", None), code=getattr(permission, "code", None)
                )


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

        if hasattr(viewset, "get_extra_actions"):
            for extra_action in viewset.get_extra_actions():  # noqa B007
                # noqa T101 TODO: Loop through these extra actions and figure out if any should be returned.
                # They include 'submit', 'approve', ...
                pass

        return available_actions

    def get_attribute(self, instance):
        return self.get_value(None)

    def to_internal_value(self, data):
        raise NotImplementedError()

    def to_representation(self, data):
        return data

    def run_child_validation(self, data):
        return data
