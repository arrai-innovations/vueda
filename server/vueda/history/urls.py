"""URL configuration for the vueda.history app."""

__all__ = ("urlpatterns",)

from django.urls import path

from vueda.history.views import GetObjectHistoryView


urlpatterns = [
    path(
        "object-history/<app_label>/<model>/<int:object_id>/",
        GetObjectHistoryView.as_view(),
        name="get-object-history",
    ),
]
