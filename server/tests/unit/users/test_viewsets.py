from http import HTTPStatus

import pytest
from allauth.core.exceptions import ReauthenticationRequired
from allauth.mfa.models import Authenticator
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.conftest import response_body
from vueda.core.exceptions import VuedaValidationError
from vueda.user.models import TWO_FACTOR_AUTHENTICATION_OPTIONS
from vueda.user.models import TOTPDevice
from vueda.user.serializers import TOTPDeviceSerializer
from vueda.user.views import AllAuthAdapterDispatchMixin
from vueda.user.viewsets import TOTPDeviceViewSet


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        email="totp-user@domain.invalid",
        password="test-pass",
        name="TOTP User",
    )


@pytest.mark.django_db
def test_get_queryset_limits_to_authenticated_user(api_client, user):
    other_user = get_user_model().objects.create_user(
        email="other@domain.invalid",
        password="test-pass",
        name="Other",
    )
    authenticator = Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    Authenticator.objects.create(user=other_user, type=Authenticator.Type.TOTP, data={})
    TOTPDevice.objects.create(authenticator=authenticator, method="totp", user=user)
    TOTPDevice.objects.create(
        authenticator=Authenticator.objects.filter(user=other_user).first(), method="email", user=other_user
    )
    api_client.force_authenticate(user=user)
    response = api_client.get(reverse("vueda_user.totpdevice-list"), format="json")
    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["method"] == "totp"


@pytest.mark.django_db
def test_setup_totp_return_unauthenticated_when_not_recently_logged_in(api_client, user, monkeypatch):
    def fake_raise_if_reauthentication_required(request):
        raise ReauthenticationRequired()

    monkeypatch.setattr(
        "vueda.core.decorators.raise_if_reauthentication_required",
        fake_raise_if_reauthentication_required,
    )

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "totp"}, format="json")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response_body(response)
    assert response.data["detail"] == "Reauthentication required"


@pytest.mark.django_db
def test_setup_totp_returns_secret_and_svg(api_client, user, monkeypatch):
    def fake_secret(regenerate=False):
        assert regenerate
        return "dummy-secret"

    adapter_calls = []

    class RecordingAdapter:
        def build_totp_url(self, target_user, secret):
            adapter_calls.append(("build_totp_url", target_user, secret))
            return "otpauth://totp"

        def build_totp_svg(self, url):
            adapter_calls.append(("build_totp_svg", url))
            return "<svg>QR</svg>"

    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", fake_secret)
    monkeypatch.setattr("vueda.user.viewsets.get_adapter", lambda: RecordingAdapter())
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "totp"}, format="json")

    assert response.status_code == HTTPStatus.OK, response_body(response)
    session = api_client.session
    assert session[TOTPDeviceViewSet.TOTP_SESSION_KEY] == {"method": "totp"}
    assert response.data["meta"]["totp_secret"] == "dummy-secret"
    assert response.data["meta"]["totp_svg_data_uri"].startswith("data:image/svg+xml;base64,")
    # The QR code is built for this user's new secret, from the URL built for it.
    assert adapter_calls == [
        ("build_totp_url", user, "dummy-secret"),
        ("build_totp_svg", "otpauth://totp"),
    ]


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_requires_destination_for_email(api_client, user, monkeypatch):
    def fake_secret(regenerate=False):
        assert regenerate
        return "dummy-secret"

    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", fake_secret)
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "email"}, format="json")

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["destination"][0] == "Email address is required for email method."


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_blocks_duplicate_method(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "secret")
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)
    authenticator = Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    TOTPDevice.objects.create(authenticator=authenticator, method="email", user=user, email="user@domain.invalid")

    api_client.force_authenticate(user=user)
    response = api_client.post(
        reverse("vueda_user.totpdevice-setup"),
        {"method": "email", "destination": "user@domain.invalid"},
        format="json",
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["method"] == ["An activated TOTP device already exists with email"]


@pytest.mark.django_db
def test_activate_creates_device(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "secret")
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.validate_totp_code", lambda secret, code: code == "123456")
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)

    created = {}

    def fake_activate_totp(request, form):
        authenticator = Authenticator.objects.create(user=request.user, type=Authenticator.Type.TOTP, data={})
        created["authenticator"] = authenticator
        return authenticator, None

    monkeypatch.setattr("vueda.user.viewsets.totp_flows.activate_totp", fake_activate_totp)
    session = api_client.session
    session[TOTPDeviceViewSet.TOTP_SESSION_KEY] = {"method": "totp"}
    session.save()
    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-activate"), {"code": "123456"}, format="json")

    assert response.status_code == HTTPStatus.CREATED, response_body(response)
    assert TOTPDevice.objects.filter(user=user, method="totp").exists()
    assert response.data == {"detail": "TOTP setup complete"}


@pytest.mark.django_db
def test_activate_totp_return_unauthenticated_when_not_recently_logged_in(api_client, user, monkeypatch):
    def fake_raise_if_reauthentication_required(request):
        raise ReauthenticationRequired()

    monkeypatch.setattr(
        "vueda.core.decorators.raise_if_reauthentication_required",
        fake_raise_if_reauthentication_required,
    )

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-activate"), {"code": "123456"}, format="json")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response_body(response)
    assert response.data["detail"] == "Reauthentication required"


def test_available_methods_excludes_sms_without_twilio(settings):
    settings.TWILIO_ACCOUNT_SID = ""
    settings.TWILIO_AUTH_TOKEN = ""
    settings.TWILIO_CALLER_ID = ""

    serializer = TOTPDeviceSerializer()
    assert all(choice[0] != "sms" for choice in serializer.fields["method"].choices)


def test_available_methods_return_full_choices_with_twilio_setup(settings):
    settings.TWILIO_ACCOUNT_SID = "TESTSID"
    settings.TWILIO_AUTH_TOKEN = "TESTAUTH"
    settings.TWILIO_CALLER_ID = "TESTCALLER"

    serializer = TOTPDeviceSerializer()
    methods = list(serializer.fields["method"].choices)
    all_methods = [choice[0] for choice in TWO_FACTOR_AUTHENTICATION_OPTIONS]
    assert "sms" in methods
    assert set(methods) == set(all_methods)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_sms_returns_validation_error_when_twilio_unavailable(settings, api_client, user, monkeypatch):
    settings.TWILIO_ACCOUNT_SID = ""
    settings.TWILIO_AUTH_TOKEN = ""
    settings.TWILIO_CALLER_ID = ""

    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "secret")
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)

    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("vueda_user.totpdevice-setup"),
        {"method": "sms", "destination": "+18005550100"},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["method"][0] == '"sms" is not a valid choice.'


@pytest.mark.django_db
def test_destroy_deactivates_authenticator_when_last_device_removed(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)
    authenticator = Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    device = TOTPDevice.objects.create(authenticator=authenticator, method="totp", user=user)
    called = {}

    def fake_deactivate_totp(request, target_authenticator):
        called["authenticator"] = target_authenticator

    monkeypatch.setattr("vueda.user.viewsets.totp_flows.deactivate_totp", fake_deactivate_totp)

    api_client.force_authenticate(user=user)
    response = api_client.delete(reverse("vueda_user.totpdevice-detail", kwargs={"pk": device.pk}), format="json")

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert not TOTPDevice.objects.filter(pk=device.pk).exists()
    assert called["authenticator"] == authenticator


@pytest.mark.django_db
def test_destroy_keeps_authenticator_when_other_devices_exist(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)
    authenticator = Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    device = TOTPDevice.objects.create(authenticator=authenticator, method="totp", user=user)
    TOTPDevice.objects.create(authenticator=authenticator, method="email", user=user, email="user@domain.invalid")
    called = {"hit": False}

    def fake_deactivate_totp(request, target_authenticator):
        called["hit"] = True

    monkeypatch.setattr("vueda.user.viewsets.totp_flows.deactivate_totp", fake_deactivate_totp)

    api_client.force_authenticate(user=user)
    response = api_client.delete(reverse("vueda_user.totpdevice-detail", kwargs={"pk": device.pk}), format="json")

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert TOTPDevice.objects.filter(pk=device.pk).count() == 0
    assert called["hit"] is False


@pytest.mark.django_db
def test_destroy_device_return_unauthenticated_when_not_recently_logged_in(api_client, user, monkeypatch):
    def fake_raise_if_reauthentication_required(request):
        raise ReauthenticationRequired()

    monkeypatch.setattr(
        "vueda.core.decorators.raise_if_reauthentication_required",
        fake_raise_if_reauthentication_required,
    )

    api_client.force_authenticate(user=user)
    response = api_client.delete(reverse("vueda_user.totpdevice-detail", kwargs={"pk": 1}), format="json")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response_body(response)
    assert response.data["detail"] == "Reauthentication required"


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_rejects_invalid_email_destination(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)

    api_client.force_authenticate(user=user)
    response = api_client.post(
        reverse("vueda_user.totpdevice-setup"),
        {"method": "email", "destination": "not-an-email"},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["destination"][0] == "Enter a valid email address."


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_rejects_invalid_phone_destination(settings, api_client, user, monkeypatch):
    settings.TWILIO_ACCOUNT_SID = "TESTSID"
    settings.TWILIO_AUTH_TOKEN = "TESTAUTH"
    settings.TWILIO_CALLER_ID = "TESTCALLER"

    monkeypatch.setattr("vueda.core.decorators.raise_if_reauthentication_required", lambda r: None)

    api_client.force_authenticate(user=user)
    response = api_client.post(
        reverse("vueda_user.totpdevice-setup"),
        {"method": "sms", "destination": "1234"},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["destination"][0] == "Enter a valid phone number."


class DummyAllAuthBase:
    def handle_invalid_input(self, data):
        self.base_called = True
        self.base_data = data


def test_allauth_handle_invalid_input_raises_validation_error():
    class DummyAllAuthView(AllAuthAdapterDispatchMixin, DummyAllAuthBase):
        pass

    view = DummyAllAuthView()
    data = type("DummyData", (), {"errors": {"email": ["Invalid email"], "password": ["Required"]}})()

    with pytest.raises(VuedaValidationError) as exc_info:
        view.handle_invalid_input(data)

    assert view.base_called is True
    assert view.base_data is data
    errors = exc_info.value.detail
    assert [str(error) for error in errors["email"]] == ["Invalid email"]
    assert [str(error) for error in errors["password"]] == ["Required"]
