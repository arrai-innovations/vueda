from django.conf import settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import include
from django.urls import path

from tests.urls import urlpatterns as tests_urlpatterns
from vueda.core.installed_apps import vdq_is_installed
from vueda.core.installed_apps import workflow_is_installed


route_urlpatterns = [
    path("tests/", include(tests_urlpatterns)),
    path("", include("vueda.info.urls")),
    path("", include("vueda.user.urls")),
    path("", include("vueda.release.urls")),
]

if workflow_is_installed():
    route_urlpatterns.append(path("", include("vueda.workflow.urls")))
if vdq_is_installed():
    route_urlpatterns.append(path("", include("vueda.vdq.urls")))

urlpatterns = [
    path(
        "routes/",
        include(route_urlpatterns),
    )
]

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"

if settings.DEBUG:
    # Static file serving when using Gunicorn + Uvicorn for local web socket development
    urlpatterns += staticfiles_urlpatterns()
