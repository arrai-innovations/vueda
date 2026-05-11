from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.utils import FakeRequest
from tests.utils import FakeView
from vueda.user.serializers import UserSerializer
from vueda.user.serializers import WhoIsSerializer


@pytest.mark.django_db
class TestWhoIsSerializerMixinDirectly(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Reader": [
            ("tests", "Timesheet", "read"),
        ],
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "testuser@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
        "test_my_user@domain.invalid": {
            "name": "Test User update",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
    }

    def test_as_user(self):
        user = self.users["testuser@domain.invalid"]
        # Get the user again, so we can confirm that user != self.instance doesn't fail.
        user_2 = get_user_model().objects.get(
            email="testuser@domain.invalid",
        )
        get_data = {"user": {"id": user}}

        request = FakeRequest(data=get_data, method="GET", user=user)

        context = {"request": request, "view": FakeView(request, WhoIsSerializer)}
        serializer = WhoIsSerializer(instance=user_2, data=get_data, context=context)

        fields = serializer.get_fields()
        assert tuple(fields.keys()) == (
            "id",
            "email",
            "name",
            "groups",
            "is_superuser",
            "totp_devices",
            "recently_logged_in",
            "formatted_name",
            "available_actions",
        )

    def test_as_another_user(self):
        user = self.users["testuser@domain.invalid"]
        another_user = self.users["test_my_user@domain.invalid"]
        get_data = {"user": {"id": another_user}}

        request = FakeRequest(data=get_data, method="GET", user=user)
        context = {"request": request, "view": FakeView(request, WhoIsSerializer)}
        serializer = WhoIsSerializer(instance=another_user, data=get_data, context=context)

        fields = serializer.get_fields()
        assert tuple(fields.keys()) == ("id", "email", "name", "totp_devices", "recently_logged_in", "formatted_name")


@pytest.mark.django_db
class TestUserSerializerCreate:
    def test_create_user_without_password_sends_welcome_and_sets_unusable_password(self, monkeypatch):
        welcome_email_calls = []

        def record_welcome_email(self):
            welcome_email_calls.append(self)

        monkeypatch.setattr(get_user_model(), "send_welcome_email", record_welcome_email)

        data = {
            "email": "welcome-user@domain.invalid",
            "name": "Welcome User",
            "password": "",
            "password_confirm": "",
            "send_welcome_email_on_create": True,
        }

        request = FakeRequest(data=data, method="POST")
        view = FakeView(request, UserSerializer, action="create")
        serializer = UserSerializer(data=data, context={"request": request, "view": view})

        assert serializer.is_valid(), serializer.errors

        user = serializer.save()

        assert welcome_email_calls == [user]
        assert user.has_usable_password() is False
        assert user.check_password(UserSerializer.TEMPORARY_PASSWORD) is False

    def test_create_user_with_manual_temporary_password_keeps_password(self):
        data = {
            "email": "manual-temp@domain.invalid",
            "name": "Manual Temp",
            "password": UserSerializer.TEMPORARY_PASSWORD,
            "password_confirm": UserSerializer.TEMPORARY_PASSWORD,
            "send_welcome_email_on_create": False,
        }

        request = FakeRequest(data=data, method="POST")
        view = FakeView(request, UserSerializer, action="create")
        serializer = UserSerializer(data=data, context={"request": request, "view": view})

        assert serializer.is_valid(), serializer.errors

        user = serializer.save()

        assert user.has_usable_password() is True
        assert user.check_password(UserSerializer.TEMPORARY_PASSWORD) is True
