"""API views for server info metadata in the vueda.info app."""

__all__ = ("server_info_view",)

from django.http import JsonResponse
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

from vueda import __version__ as server_version
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer


@conditional_extend_schema_decorator(
    summary="Server version",
    responses={
        200: conditional_inline_serializer(
            "ServerInfoResponse",
            fields={"server_version": serializers.CharField()},
        )
    },
)
@api_view(["GET"])
@permission_classes((AllowAny,))
def server_info_view(request):
    return JsonResponse(
        {
            "server_version": server_version,
        }
    )


server_info_view.cls._ignore_model_permissions = True
