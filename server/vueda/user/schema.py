"""OpenAPI response shapes for ``vueda.user`` endpoints that no model backs."""

__all__ = ("RateLimitedSerializer",)

from rest_framework import serializers


class RateLimitedSerializer(serializers.Serializer):
    """The body of a 429 response from a rate-limited auth endpoint."""

    detail = serializers.CharField(help_text="Why the request was refused, and how long to wait when known.")
    serverStack = serializers.CharField(  # noqa: N815
        required=False, help_text="The exception, with its traceback when `DEBUG` is on."
    )
