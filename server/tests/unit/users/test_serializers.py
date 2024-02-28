import pytest

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.utils import FakeRequest
from tests.utils import FakeView
from vueda.user.serializers import WhoIsSerializer


@pytest.mark.django_db
class TestWhoIsSerializerMixinDirectly(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Timesheet Reader": [
            ("tests", "Timesheet", "read"),
        ],
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ],
    }

    users_to_create = {
        "testuser@example.com": {
            "name": "Test User",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
        "test_my_user@example.com": {
            "name": "Test User update",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
    }

    def test_as_user(self):
        user = self.users["testuser@example.com"]
        get_data = {"user": {"id": user}}

        request = FakeRequest(data=get_data, method="GET", user=user)

        context = {"request": request, "view": FakeView(request, WhoIsSerializer)}
        serializer = WhoIsSerializer(instance=user, data=get_data, context=context)

        fields = serializer.get_fields()
        assert tuple(fields.keys()) == ("id", "email", "name", "groups", "is_superuser")

    def test_as_another_user(self):
        user = self.users["testuser@example.com"]
        another_user = self.users["test_my_user@example.com"]
        get_data = {"user": {"id": another_user}}

        request = FakeRequest(data=get_data, method="GET", user=user)
        context = {"request": request, "view": FakeView(request, WhoIsSerializer)}
        serializer = WhoIsSerializer(instance=another_user, data=get_data, context=context)

        fields = serializer.get_fields()
        assert tuple(fields.keys()) == ("id", "email", "name")
