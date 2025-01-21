import datetime

from django.contrib.postgres.fields.ranges import Range
from django.core.exceptions import ObjectDoesNotExist
from django.utils.encoding import smart_str
from rest_framework import serializers as drf_serializers

from vueda.core.exceptions import VuedaValidationError


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


class DurationSecondsField(drf_serializers.Field):
    def to_internal_value(self, data):
        """
        Convert incoming value from seconds to a timedelta object.
        """
        try:
            # Ensure the input is an integer or convertible to an integer
            seconds = int(data)
        except (ValueError, TypeError):
            raise VuedaValidationError("Duration must be an integer number of seconds.")
        return datetime.timedelta(seconds=seconds)

    def to_representation(self, value):
        """
        Convert outgoing timedelta to total seconds.
        """
        if isinstance(value, datetime.timedelta):
            total_seconds = int(value.total_seconds())
            return total_seconds
        raise VuedaValidationError("Expected a timedelta object.")


class RangeField(drf_serializers.JSONField):
    def to_representation(self, value):
        if isinstance(value, Range):
            return {"upper": value.upper, "lower": value.lower}
        return value

    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        try:
            lower = data["lower"]
            upper = data["upper"]
            return Range(lower, upper)
        except KeyError:
            raise VuedaValidationError("Invalid data for RangeField")


class FileField(drf_serializers.FileField):
    def to_representation(self, value):
        if not value:
            return None
        try:
            url = value.url
        except AttributeError:
            return None
        request = self.context.get("request", None)
        if request is not None:
            url = request.build_absolute_uri(url)
        return {"name": value.name, "url": url}
