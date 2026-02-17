from django.conf import settings
from django.urls import include
from django.urls import path

from vueda.workflow import views


urlpatterns = [
    path("vueda.workflow/", include("vueda.workflow.routers")),
]
if settings.DEBUG:
    urlpatterns += [
        path("vueda.workflow/overview/", views.WorkflowOverviewView.as_view(), name="workflow-overview"),
        path("vueda.workflow/add/", views.WorkflowAddView.as_view(), name="workflow-add"),
        path("vueda.workflow/delete/<int:pk>/", views.WorkflowDeleteView.as_view(), name="workflow-delete"),
        path("vueda.workflow/edit/<int:pk>/", views.WorkflowEditView.as_view(), name="workflow-edit"),
        path("vueda.workflow/edit/state/<int:pk>/", views.WorkflowStateEditView.as_view(), name="state-edit"),
        path(
            "vueda.workflow/edit/transition/<int:pk>/",
            views.WorkflowTransitionEditView.as_view(),
            name="transition-edit",
        ),
    ]
