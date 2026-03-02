"""URL configuration for the vueda.release app."""

__all__ = ("urlpatterns",)

from django.urls import include
from django.urls import path


urlpatterns = [
    path("vueda.release/", include("vueda.release.routers")),
]
