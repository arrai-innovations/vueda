"""URL configuration for the vueda.history app."""

__all__ = ("urlpatterns",)

from django.urls import path

from vueda.core.installed_apps import workflow_is_installed


urlpatterns = []

# Workflow state history reports ObjectState records, which exist only with the workflow app.
if workflow_is_installed():
    from vueda.history.views import WorkflowStateHistoryView

    urlpatterns = [
        path(
            "workflow-state-history/<app_label>/<model>/<int:object_id>/",
            WorkflowStateHistoryView.as_view(),
            name="workflow-state-history",
        ),
    ]
