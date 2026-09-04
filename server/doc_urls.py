"""Minimal URLConf for documentation schema generation."""

from django.urls import include
from django.urls import path

from vueda.core.installed_apps import vdq_is_installed
from vueda.core.installed_apps import workflow_is_installed


urlpatterns = [
    path("", include("vueda.info.urls")),
    path("", include("vueda.user.urls")),
    path("", include("vueda.release.urls")),
    path("", include("vueda.history.urls")),
]

if workflow_is_installed():
    urlpatterns.append(path("", include("vueda.workflow.urls")))
if vdq_is_installed():
    urlpatterns.append(path("", include("vueda.vdq.urls")))
