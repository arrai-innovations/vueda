import json
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.core.exceptions import PermissionDenied
from django.test import RequestFactory
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from vueda.user.views import PermissionDeleteView
from vueda.user.views import PermissionSaveView


GROUP_EDIT_CODENAMES = ("create_group", "update_group", "delete_permission")


@pytest.mark.django_db
class TestWhoIsView(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Reader": [
            ("timesheet", "Timesheet", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_user+timesheet+reader@domain.invalid": {
            "name": "Test User reader",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
    }

    def test_as_user(self, api_client):
        user = self.users["test_user+timesheet+reader@domain.invalid"]
        api_client.force_authenticate(user=user)

        url = reverse("who-is")
        response = api_client.get(url, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert set(response.data) == {
            "id",
            "email",
            "name",
            "groups",
            "is_superuser",
            "formatted_name",
            "totp_devices",
            "recently_logged_in",
            "object_revision",
        }
        assert response.data["email"] == "test_user+timesheet+reader@domain.invalid"
        assert response.data["formatted_name"] == response.data["email"]


@pytest.fixture
def group_editor(db):
    user = get_user_model().objects.create_user(
        email="group-editor@domain.invalid",
        password="testpass",
        name="Group Editor",
    )
    user.user_permissions.add(
        *Permission.objects.filter(content_type__app_label="auth", codename__in=GROUP_EDIT_CODENAMES)
    )
    return user


@pytest.fixture
def plain_user(db):
    return get_user_model().objects.create_user(
        email="plain-user@domain.invalid",
        password="testpass",
        name="Plain User",
    )


@pytest.mark.django_db
class TestPermissionGroupEditViews:
    def _save(self, user, permission, group_name):
        request = RequestFactory().post(
            "/",
            data=json.dumps({"permissionId": str(permission.pk), "groupId": None, "groupName": group_name}),
            content_type="application/json",
        )
        request.user = user
        return PermissionSaveView.as_view()(request)

    def _delete(self, user, permission, group):
        request = RequestFactory().delete("/")
        request.user = user
        return PermissionDeleteView.as_view()(request, permission_id=permission.pk, group_id=group.pk)

    def test_save_allowed_with_auth_group_permissions(self, group_editor):
        permission = Permission.objects.get(content_type__app_label="auth", codename="read_group")

        response = self._save(group_editor, permission, "Editors")

        assert response.status_code == HTTPStatus.OK
        assert Group.objects.get(name="Editors").permissions.filter(pk=permission.pk).exists()

    def test_save_denied_without_auth_group_permissions(self, plain_user):
        permission = Permission.objects.get(content_type__app_label="auth", codename="read_group")

        with pytest.raises(PermissionDenied):
            self._save(plain_user, permission, "Editors")

        assert not Group.objects.filter(name="Editors").exists()

    def test_delete_allowed_with_auth_group_permissions(self, group_editor):
        permission = Permission.objects.get(content_type__app_label="auth", codename="read_group")
        group = Group.objects.create(name="Editors")
        group.permissions.add(permission)

        response = self._delete(group_editor, permission, group)

        assert response.status_code == HTTPStatus.OK
        assert not group.permissions.filter(pk=permission.pk).exists()

    def test_delete_denied_without_auth_group_permissions(self, plain_user):
        permission = Permission.objects.get(content_type__app_label="auth", codename="read_group")
        group = Group.objects.create(name="Editors")
        group.permissions.add(permission)

        with pytest.raises(PermissionDenied):
            self._delete(plain_user, permission, group)

        assert group.permissions.filter(pk=permission.pk).exists()
