from django.contrib.auth import views as django_views
from django.urls import path

from vueda.workflow import views


# The workflow management views and the dev logout exist only in debug mode, so they are absent from
# the test urlconf. The overview reverses these names while it renders its controls.
urlpatterns = [
    path("vueda.user/dev-logout/", django_views.LogoutView.as_view(), name="dev-logout"),
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
