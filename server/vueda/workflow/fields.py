"""DRF serializer field for listing available workflow transitions."""

__all__ = ("AvailableTransitionField",)

from rest_framework import serializers


class AvailableTransitionField(serializers.ListField):
    def __init__(self, style=None):
        kwargs = {
            "child": serializers.DictField(read_only=True),
            "read_only": True,
            "required": False,
            "source": "*",
            "style": style,
        }
        super().__init__(**kwargs)

    def get_value(self, instance):
        if instance is None:
            return []
        request = self.context.get("request")
        if not request or not hasattr(instance, "available_transitions"):
            return []
        return list(instance.available_transitions(request.user).order_by("code").values("code", "name"))

    def get_attribute(self, instance):
        return self.get_value(instance)

    def to_internal_value(self, data):
        raise NotImplementedError()

    def to_representation(self, data):
        return data
