"""Minimal URLConf for documentation schema generation."""

from django.urls import include
from django.urls import path

urlpatterns = [
    path("", include("vueda.info.urls")),
    path("", include("vueda.workflow.urls")),
    path("", include("vueda.user.urls")),
    path("", include("vueda.vdq.urls")),
    path("", include("vueda.release.urls")),
    path("", include("vueda.history.urls")),
]
