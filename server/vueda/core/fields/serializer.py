from django.core.exceptions import ObjectDoesNotExist
from django.utils.encoding import smart_str
from rest_framework import serializers as drf_serializers


class ContentTypeField(drf_serializers.RelatedField):
    default_error_messages = {
        "does_not_exist": "ContentType with {value} does not exist or is not allowed.",
        "invalid": "Invalid value.",
    }

    def to_representation(self, obj):
        return f"{obj.app_label}/{obj.model}"

    def to_internal_value(self, data):
        queryset = self.get_queryset()
        try:
            app_label, model = data.split("/")
            return queryset.get(app_label=app_label, model=model)
        except ObjectDoesNotExist:
            self.fail("does_not_exist", value=smart_str(data))
        except (TypeError, ValueError):
            self.fail("invalid")
