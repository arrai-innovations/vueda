import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin


@pytest.mark.django_db
class TestWhoIsView(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Timesheet Reader": [
            ("tests", "Timesheet", "read"),
        ],
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ],
    }

    users_to_create = {
        "test_user+timesheet+reader@example.com": {
            "name": "Test User reader",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
        "test_user+timesheet+updater@example.com": {
            "name": "Test User updater",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
    }

    def test_as_user(self, api_client):
        user = self.users["test_user+timesheet+reader@example.com"]
        api_client.force_authenticate(user=user)

        url = reverse("who-is", args=(user.pk,))
        response = api_client.get(url, format="json")

        assert response.status_code == 200
        assert set(response.data) == {"id", "email", "name", "groups", "is_superuser"}
        assert response.data["email"] == "test_user+timesheet+reader@example.com"
