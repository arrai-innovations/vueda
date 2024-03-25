from django.conf import settings
from django.urls import include
from django.urls import path

from vueda.workflow.routers import workflow_router
from vueda.workflow.views import WorkflowOverviewView


urlpatterns = [
    path("", include(workflow_router.urls)),
]
if settings.DEBUG:
    urlpatterns += [
        path("overview/", WorkflowOverviewView.as_view(), name="workflow-overview"),
    ]
