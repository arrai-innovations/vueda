from django.conf import settings
from django.urls import include
from django.urls import path

from vueda.workflow import views


urlpatterns = [
    path("vueda.workflow/", include("vueda.workflow.routers")),
]
if settings.DEBUG:
    urlpatterns += [
        path("overview/", views.WorkflowOverviewView.as_view(), name="workflow-overview"),
        path("add/", views.WorkflowAddView.as_view(), name="workflow-add"),
        path("delete/<int:pk>/", views.WorkflowDeleteView.as_view(), name="workflow-delete"),
        path("edit/<int:pk>/", views.WorkflowEditView.as_view(), name="workflow-edit"),
        path("edit/state/<int:pk>/", views.WorkflowStateEditView.as_view(), name="state-edit"),
        path("edit/transition/<int:pk>/", views.WorkflowTransitionEditView.as_view(), name="transition-edit"),
    ]
