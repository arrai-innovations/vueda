"""URL configuration for the vueda.info app."""

__all__ = (
    "info_patterns",
    "urlpatterns",
)

from django.urls import include
from django.urls import path

from vueda.info.views import server_info_view


info_patterns = [
    path("", include("vueda.info.routers")),
    path("server_info/", server_info_view),
]

urlpatterns = [
    path("vueda.info/", include(info_patterns)),
]
