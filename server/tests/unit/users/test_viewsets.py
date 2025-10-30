from http import HTTPStatus

import pytest
from allauth.mfa.models import Authenticator
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate

from vueda.user.models import TOTPDevice
from vueda.user.viewsets import TOTPDeviceViewSet


@pytest.fixture
def api_rf():
    return APIRequestFactory()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        email="totp-user@example.com",
        password="test-pass",
        name="TOTP User",
    )


@pytest.mark.django_db
def test_get_queryset_limits_to_authenticated_user(api_rf, user):
    other_user = get_user_model().objects.create_user(
        email="other@example.com",
        password="test-pass",
        name="Other",
    )
    authenticator = Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    Authenticator.objects.create(user=other_user, type=Authenticator.Type.TOTP, data={})
    TOTPDevice.objects.create(authenticator=authenticator, method="totp", user=user)
    TOTPDevice.objects.create(
        authenticator=Authenticator.objects.filter(user=other_user).first(), method="email", user=other_user
    )
    request = api_rf.get("/totpdevice/")
    request.session = {}
    force_authenticate(request, user=user)

    response = TOTPDeviceViewSet.as_view({"get": "list"})(request)
    assert response.status_code == HTTPStatus.OK
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["method"] == "totp"


@pytest.mark.django_db
def test_setup_totp_returns_secret_and_svg(api_rf, user, monkeypatch):
    factory_view = TOTPDeviceViewSet.as_view({"post": "setup"})

    def fake_secret(regenerate=False):
        assert regenerate
        return "dummy-secret"

    class DummyAdapter:
        def build_totp_url(self, target_user, secret):
            assert target_user == user
            assert secret == "dummy-secret"
            return "otpauth://totp"

        def build_totp_svg(self, url):
            assert url == "otpauth://totp"
            return "<svg>QR</svg>"

    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", fake_secret)
    monkeypatch.setattr("vueda.user.viewsets.get_adapter", lambda: DummyAdapter())

    request = api_rf.post("/totpdevice/setup/", {"method": "totp"}, format="json")
    request.session = {}
    force_authenticate(request, user=user)

    response = factory_view(request)

    assert response.status_code == HTTPStatus.OK
    assert request.session[TOTPDeviceViewSet.TOTP_SESSION_KEY] == {"method": "totp"}
    assert response.data["meta"]["totp_secret"] == "dummy-secret"
    assert response.data["meta"]["totp_svg_data_uri"].startswith("data:image/svg+xml;base64,")


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_requires_destination_for_email(api_rf, user, monkeypatch):
    def fake_secret(regenerate=False):
        assert regenerate
        return "dummy-secret"

    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", fake_secret)
    request = api_rf.post("/totpdevice/setup/", {"method": "email"}, format="json")
    request.session = {}
    force_authenticate(request, user=user)

    response = TOTPDeviceViewSet.as_view({"post": "setup"})(request)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.data["destination"] == ["An Email address is required for email method"]


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_blocks_duplicate_method(api_rf, user, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "secret")
    authenticator = Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    TOTPDevice.objects.create(authenticator=authenticator, method="email", user=user, email="user@example.com")

    request = api_rf.post("/totpdevice/setup/", {"method": "email", "destination": "user@example.com"}, format="json")
    request.session = {}
    force_authenticate(request, user=user)

    response = TOTPDeviceViewSet.as_view({"post": "setup"})(request)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.data["method"] == ["An activated TOTP device already exists with email"]


@pytest.mark.django_db
def test_activate_creates_device(api_rf, user, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "secret")
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.validate_totp_code", lambda secret, code: code == "123456")

    created = {}

    def fake_activate_totp(request, form):
        authenticator = Authenticator.objects.create(user=request.user, type=Authenticator.Type.TOTP, data={})
        created["authenticator"] = authenticator
        return authenticator, None

    monkeypatch.setattr("vueda.user.viewsets.totp_flows.activate_totp", fake_activate_totp)

    request = api_rf.post("/totpdevice/activate/", {"code": "123456"}, format="json")
    request.session = {TOTPDeviceViewSet.TOTP_SESSION_KEY: {"method": "totp"}}
    force_authenticate(request, user=user)

    response = TOTPDeviceViewSet.as_view({"post": "activate"})(request)

    assert response.status_code == HTTPStatus.CREATED
    assert TOTPDevice.objects.filter(user=user, method="totp").exists()
    assert response.data == {"detail": "TOTP setup complete"}
