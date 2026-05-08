from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin


@pytest.mark.django_db
class TestWhoIsView(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Reader": [
            ("tests", "Timesheet", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_user+timesheet+reader@example.com": {
            "name": "Test User reader",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
    }

    def test_as_user(self, api_client):
        user = self.users["test_user+timesheet+reader@example.com"]
        api_client.force_authenticate(user=user)

        url = reverse("who-is")
        response = api_client.get(url, format="json")

        assert response.status_code == HTTPStatus.OK
        assert set(response.data) == {
            "id",
            "email",
            "name",
            "groups",
            "is_superuser",
            "formatted_name",
            "available_actions",
            "totp_devices",
            "recently_logged_in",
        }
        assert response.data["email"] == "test_user+timesheet+reader@example.com"
        assert response.data["formatted_name"] == response.data["email"]
