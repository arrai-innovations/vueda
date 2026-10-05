import json
from http import HTTPStatus
from types import SimpleNamespace
from typing import ClassVar

import pytest
from allauth.account.internal.flows.login import AUTHENTICATION_METHODS_SESSION_KEY
from allauth.mfa.totp.internal.auth import TOTP
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.test import RequestFactory
from django.urls import reverse
from hashids import Hashids
from rest_framework.test import APIRequestFactory

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import record_authentication_methods
from tests.conftest import response_body
from vueda.core.tokens import Sha3PasswordResetTokenGenerator
from vueda.user.models import GroupChange
from vueda.user.models import TOTPDevice
from vueda.user.utils import get_current_totp_code
from vueda.user.views import PermissionDeleteView
from vueda.user.views import PermissionSaveView
from vueda.user.views import VuedaForgotPasswordView


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

    def test_delete_of_the_last_permission_keeps_the_group_and_its_members(self, group_editor, plain_user):
        permission = Permission.objects.get(content_type__app_label="auth", codename="read_group")
        group = Group.objects.create(name="Editors")
        group.permissions.add(permission)
        plain_user.groups.add(group)

        response = self._delete(group_editor, permission, group)

        assert response.status_code == HTTPStatus.OK
        group.refresh_from_db()
        assert not group.permissions.exists()
        assert plain_user.groups.filter(pk=group.pk).exists()
        assert list(GroupChange.objects.values_list("group_name", "change_type")) == [
            ("Editors", GroupChange.UNASSOCIATED)
        ]

    def test_delete_denied_without_auth_group_permissions(self, plain_user):
        permission = Permission.objects.get(content_type__app_label="auth", codename="read_group")
        group = Group.objects.create(name="Editors")
        group.permissions.add(permission)

        with pytest.raises(PermissionDenied):
            self._delete(plain_user, permission, group)

        assert group.permissions.filter(pk=permission.pk).exists()


@pytest.fixture
def sent(monkeypatch):
    """Record each email the password views ask the account adapter to send, with cooldowns cleared."""
    cache.clear()
    sent = []

    class RecordingAdapter:
        def send_mail(self, to_email, to_name, code, context):
            sent.append((to_email, code))

    monkeypatch.setattr("vueda.user.views.get_adapter", RecordingAdapter)
    yield sent
    cache.clear()


@pytest.mark.django_db
class TestVuedaForgotPasswordView:
    @staticmethod
    def request_reset(email):
        request = APIRequestFactory().post("/forgot-password/", {"email": email}, format="json")
        return VuedaForgotPasswordView.as_view()(request)

    def test_emails_a_reset_link_to_an_active_account(self, sent):
        get_user_model().objects.create_user(email="reset+active@domain.invalid", password="testpass", name="Active")

        response = self.request_reset("reset+active@domain.invalid")

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert sent == [("reset+active@domain.invalid", "forgot_password")]

    @pytest.mark.parametrize("is_active", [False, None])
    def test_answers_the_same_for_an_inactive_or_unknown_address(self, sent, is_active):
        if is_active is not None:
            get_user_model().objects.create_user(
                email="reset+other@domain.invalid", password="testpass", name="Other", is_active=is_active
            )

        response = self.request_reset("reset+other@domain.invalid")

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert sent == []

    def test_applies_the_cooldown_whether_or_not_an_account_matches(self, sent):
        get_user_model().objects.create_user(email="reset+active@domain.invalid", password="testpass", name="Active")

        for email in ("reset+active@domain.invalid", "reset+unknown@domain.invalid"):
            assert self.request_reset(email).status_code == HTTPStatus.NO_CONTENT
            assert self.request_reset(email).status_code == HTTPStatus.TOO_MANY_REQUESTS

        assert sent == [("reset+active@domain.invalid", "forgot_password")]


@pytest.mark.django_db
class TestPasswordResetRoutes:
    """The password reset endpoints are routed under vueda.user, with no project routes needed."""

    def test_forgot_password_is_routed(self, api_client, sent):
        response = api_client.post(reverse("forgot_password"), {"email": "route@domain.invalid"}, format="json")

        assert reverse("forgot_password") == "/routes/vueda.user/forgot-password/"
        assert response.status_code == HTTPStatus.NO_CONTENT

    def test_reset_password_check_is_routed(self, api_client):
        response = api_client.get(reverse("reset_password"), {"pk": "unknown", "token": "unknown"})

        assert reverse("reset_password") == "/routes/vueda.user/reset-password/"
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert response.data == {"detail": "This token is invalid or has already been used."}


@pytest.mark.django_db
class TestVuedaResetPasswordView:
    @staticmethod
    def reset_link_params(user):
        return {
            "pk": Hashids(min_length=16).encode(user.pk),
            "token": Sha3PasswordResetTokenGenerator().make_token(user),
        }

    def test_reports_a_password_too_similar_to_the_account_as_a_field_error(self, api_client, settings):
        settings.AUTH_PASSWORD_VALIDATORS = [
            {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
        ]
        user = get_user_model().objects.create_user(
            email="similarcustomer@domain.invalid", password="old-password", name="Similar"
        )

        response = api_client.post(
            reverse("reset_password"),
            {"password": "similarcustomer", "password_confirm": "similarcustomer", **self.reset_link_params(user)},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert list(response.data) == ["password"]
        user.refresh_from_db()
        assert user.check_password("old-password")


TOTP_SECRET = "JBSWY3DPEHPK3PXP"


@pytest.fixture
def reauth_user(db):
    return get_user_model().objects.create_user(
        email="reauth@domain.invalid",
        password="test-pass",
        name="Reauth User",
    )


@pytest.fixture
def totp_device(reauth_user):
    authenticator = TOTP.activate(reauth_user, TOTP_SECRET).instance
    return TOTPDevice.objects.create(
        authenticator=authenticator, method="email", user=reauth_user, email=reauth_user.email
    )


@pytest.mark.django_db
def test_who_is_reports_an_mfa_user_recent_only_after_a_second_factor(api_client, totp_device):
    api_client.force_login(totp_device.user)

    record_authentication_methods(api_client, "password")
    assert api_client.get(reverse("who-is"), format="json").data["recently_logged_in"] is False

    record_authentication_methods(api_client, "password", "mfa")
    assert api_client.get(reverse("who-is"), format="json").data["recently_logged_in"] is True


@pytest.mark.django_db
class TestAllAuthMFAReauthenticateView:
    def test_valid_code_records_a_second_factor_authentication(self, api_client, totp_device):
        api_client.force_login(totp_device.user)
        record_authentication_methods(api_client, "password")

        response = api_client.post(
            reverse("mfa_reauthenticate"), {"code": get_current_totp_code(TOTP_SECRET)}, format="json"
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        methods = [record["method"] for record in api_client.session[AUTHENTICATION_METHODS_SESSION_KEY]]
        assert methods == ["password", "mfa"]
        who_is = api_client.get(reverse("who-is"), format="json")
        assert who_is.data["recently_logged_in"] is True

    def test_invalid_code_is_rejected_without_a_record(self, api_client, totp_device):
        api_client.force_login(totp_device.user)

        response = api_client.post(reverse("mfa_reauthenticate"), {"code": "000000"}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert response.data["non_field_errors"] == ["Incorrect code."]
        assert AUTHENTICATION_METHODS_SESSION_KEY not in api_client.session

    def test_password_confirmation_does_not_count_for_an_mfa_user(self, api_client, totp_device):
        api_client.force_login(totp_device.user)

        response = api_client.post(reverse("reauthenticate"), {"password": "test-pass"}, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        who_is = api_client.get(reverse("who-is"), format="json")
        assert who_is.data["recently_logged_in"] is False


@pytest.mark.django_db
class TestTotpCodeForSignedInUser:
    def test_lists_methods_for_a_signed_in_user_with_no_pending_login(self, api_client, totp_device):
        api_client.force_login(totp_device.user)

        response = api_client.get(reverse("totp_code"), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data == {"methods": ["email"]}

    def test_sends_a_code_to_a_signed_in_user(self, api_client, totp_device, monkeypatch):
        sent = []
        monkeypatch.setattr(
            "vueda.user.views.get_adapter",
            lambda: SimpleNamespace(send_mail=lambda *args: sent.append(args), send_sms=lambda *args: None),
        )
        api_client.force_login(totp_device.user)

        response = api_client.post(reverse("totp_code"), {"method": "email"}, format="json")

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert sent[0][0] == totp_device.email
        assert sent[0][3] == {"code": get_current_totp_code(TOTP_SECRET)}

    def test_refuses_an_anonymous_visitor_with_no_pending_login(self, api_client, totp_device):
        response = api_client.get(reverse("totp_code"), format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
