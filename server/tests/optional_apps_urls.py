"""URLConf for optional VUEDA app boundary subprocess tests."""

from django.urls import include
from django.urls import path

from vueda.core.installed_apps import history_is_installed
from vueda.core.installed_apps import vdq_is_installed
from vueda.core.installed_apps import workflow_is_installed


route_urlpatterns = [
    path("", include("vueda.info.urls")),
    path("", include("vueda.user.urls")),
    path("", include("vueda.release.urls")),
    path("optional/", include("tests.optional_apps.routers")),
]

if history_is_installed():
    route_urlpatterns.append(path("", include("vueda.history.urls")))
if workflow_is_installed():
    route_urlpatterns.append(path("", include("vueda.workflow.urls")))
if vdq_is_installed():
    route_urlpatterns.append(path("", include("vueda.vdq.urls")))

urlpatterns = [
    path("routes/", include(route_urlpatterns)),
]
