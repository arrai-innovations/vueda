"""URL configuration for the vueda.history app."""

__all__ = ("urlpatterns",)

from django.urls import path

from vueda.history.views import WorkflowStateHistoryView


urlpatterns = [
    path(
        "workflow-state-history/<app_label>/<model>/<int:object_id>/",
        WorkflowStateHistoryView.as_view(),
        name="workflow-state-history",
    ),
]
