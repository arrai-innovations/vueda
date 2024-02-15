from django.conf import settings
from django.urls import path

from vueda.workflow.views import ExecuteTransitionView
from vueda.workflow.views import GetObjectStateView
from vueda.workflow.views import GetObjectTransitionsView
from vueda.workflow.views import GetStatesForContentTypeView
from vueda.workflow.views import WorkflowOverviewView


urlpatterns = [
    path("object-state/<app_label>/<model>/<int:object_id>/", GetObjectStateView.as_view(), name="get-object-state"),
    path(
        "object-transitions/<app_label>/<model>/<int:object_id>/",
        GetObjectTransitionsView.as_view(),
        name="get-object-transitions",
    ),
    path(
        "execute-transition/<app_label>/<model>/<int:object_id>/",
        ExecuteTransitionView.as_view(),
        name="execute-transition",
    ),
    path(
        "states/<app_label>/<model>/",
        GetStatesForContentTypeView.as_view(),
        name="get-all-states-for-content-type",
    ),
]
if settings.DEBUG:
    urlpatterns += [
        path("overview/", WorkflowOverviewView.as_view(), name="workflow-overview"),
    ]
