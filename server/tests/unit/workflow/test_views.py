import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory

from vueda.workflow import views
from vueda.workflow.models import Workflow


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


def _render_overview_for(user):
    request = RequestFactory().get("/")
    request.user = user
    response = views.WorkflowOverviewView.as_view()(request)
    response.render()
    return response.content.decode()


@pytest.fixture
def overview_workflow(db, settings):
    settings.ROOT_URLCONF = "tests.unit.workflow.urls_management"
    return Workflow.objects.create(
        code="overview_controls",
        name="Overview Controls",
        content_type=ContentType.objects.get_for_model(Group),
    )


OVERVIEW_CONTROLS = [
    ("create_workflow", "/vueda.workflow/add/"),
    ("update_workflow", "/vueda.workflow/edit/{pk}/"),
    ("delete_workflow", "/vueda.workflow/delete/{pk}/"),
]


@pytest.mark.parametrize(("codename", "url"), OVERVIEW_CONTROLS)
def test_overview_shows_control_to_group_member_with_permission(plain_user, overview_workflow, codename, url):
    group = Group.objects.create(name="Workflow Editors")
    group.permissions.add(
        Permission.objects.get(content_type__app_label="vueda_workflow", codename="read_workflow"),
        Permission.objects.get(content_type__app_label="vueda_workflow", codename=codename),
    )
    plain_user.groups.add(group)
    user = get_user_model().objects.get(pk=plain_user.pk)

    assert url.format(pk=overview_workflow.pk) in _render_overview_for(user)


@pytest.mark.parametrize(("codename", "url"), OVERVIEW_CONTROLS)
def test_overview_hides_control_from_user_without_permission(plain_user, overview_workflow, codename, url):
    plain_user.user_permissions.add(
        Permission.objects.get(content_type__app_label="vueda_workflow", codename="read_workflow")
    )
    user = get_user_model().objects.get(pk=plain_user.pk)

    assert url.format(pk=overview_workflow.pk) not in _render_overview_for(user)
