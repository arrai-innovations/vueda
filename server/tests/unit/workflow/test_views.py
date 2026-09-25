import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import RequestFactory

from vueda.workflow import views


MANAGEMENT_VIEW_PERMISSIONS = [
    (views.WorkflowOverviewView, "read_workflow"),
    (views.WorkflowDeleteView, "delete_workflow"),
    (views.WorkflowAddView, "create_workflow"),
    (views.WorkflowEditView, "update_workflow"),
    (views.WorkflowStateEditView, "update_state"),
    (views.WorkflowTransitionEditView, "update_transition"),
]


def _view_for(view_class, user):
    view = view_class()
    view.setup(RequestFactory().get("/"))
    view.request.user = user
    return view


@pytest.fixture
def plain_user(db):
    return get_user_model().objects.create_user(
        email="workflow-editor@domain.invalid",
        password="testpass",
        name="Workflow Editor",
    )


@pytest.mark.parametrize(("view_class", "codename"), MANAGEMENT_VIEW_PERMISSIONS)
def test_management_view_admits_holder_of_vueda_workflow_permission(plain_user, view_class, codename):
    plain_user.user_permissions.add(Permission.objects.get(content_type__app_label="vueda_workflow", codename=codename))
    user = get_user_model().objects.get(pk=plain_user.pk)

    assert _view_for(view_class, user).has_permission()


@pytest.mark.parametrize(("view_class", "codename"), MANAGEMENT_VIEW_PERMISSIONS)
def test_management_view_refuses_user_without_permission(plain_user, view_class, codename):
    assert not _view_for(view_class, plain_user).has_permission()
