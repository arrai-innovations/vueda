from django.http import JsonResponse
from rest_framework.decorators import api_view

from vueda import __version__ as server_version


@api_view(["GET"])
def server_info_view(request):
    return JsonResponse(
        {
            "server_version": server_version,
        }
    )
