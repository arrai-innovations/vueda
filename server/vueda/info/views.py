from django.http import JsonResponse

from vueda import __version__ as server_version


def server_info_view(request):
    return JsonResponse(
        {
            "server_version": server_version,
        }
    )
