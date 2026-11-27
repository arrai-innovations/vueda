from http import HTTPStatus
from types import SimpleNamespace

import pytest
from allauth.account.authentication import get_authentication_records
from allauth.account.models import EmailAddress
from allauth.mfa.models import Authenticator
from allauth.mfa.recovery_codes.internal.auth import RecoveryCodes
from allauth.mfa.totp.internal.auth import SECRET_SESSION_KEY
from allauth.mfa.totp.internal.auth import TOTP
from allauth.mfa.utils import decrypt
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from tests.conftest import TOTP_SECRET
from tests.conftest import reauthenticate_with_password
from tests.conftest import reauthenticate_with_second_factor
from tests.conftest import response_body
from tests.conftest import session_request
from tests.conftest import sign_in
from vueda.core.exceptions import VuedaValidationError
from vueda.user.models import TWO_FACTOR_AUTHENTICATION_OPTIONS
from vueda.user.models import TOTPDevice
from vueda.user.serializers import TOTPDeviceSerializer
from vueda.user.utils import get_current_totp_code
from vueda.user.views import AllAuthAdapterDispatchMixin
from vueda.user.viewsets import TOTPDeviceViewSet


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        email="totp-user@domain.invalid",
        password="test-pass",
        name="TOTP User",
    )


@pytest.fixture
def mfa_device(user):
    """An active TOTP device, which makes ``user`` an account that must confirm a second factor."""
    authenticator = TOTP.activate(user, TOTP_SECRET).instance
    return TOTPDevice.objects.create(authenticator=authenticator, method="totp", user=user)


@pytest.fixture
def recovery_codes(mfa_device):
    """The recovery codes authenticator allauth keeps alongside an active TOTP device."""
    return RecoveryCodes.activate(mfa_device.user)


class QrAdapter:
    def build_totp_url(self, target_user, secret):
        return "otpauth://totp"

    def build_totp_svg(self, url):
        return "<svg>QR</svg>"


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
def test_setup_totp_returns_secret_and_svg(api_client, user, monkeypatch):
    regenerate_calls = []

    def fake_secret(regenerate=False):
        regenerate_calls.append(regenerate)
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
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "totp"}, format="json")

    assert response.status_code == HTTPStatus.OK, response_body(response)
    # A user with no authenticator yet gets a newly generated secret.
    assert regenerate_calls == [True]
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
    regenerate_calls = []

    def fake_secret(regenerate=False):
        regenerate_calls.append(regenerate)
        return "dummy-secret"

    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", fake_secret)
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "email"}, format="json")

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["destination"][0] == "Email address is required for email method."
    # Validation fails before any secret is generated.
    assert regenerate_calls == []


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_blocks_duplicate_method(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "secret")
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)
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
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)

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
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)

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
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)
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
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)
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


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_rejects_invalid_email_destination(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)

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

    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)

    api_client.force_authenticate(user=user)
    response = api_client.post(
        reverse("vueda_user.totpdevice-setup"),
        {"method": "sms", "destination": "1234"},
        format="json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert response.data["destination"][0] == "Enter a valid phone number."


# The default ``totp_send_user`` and ``totp_send_destination`` rates allow this many codes an hour.
CODE_SEND_LIMIT = 5


@pytest.fixture
def sent_setup_codes(settings, monkeypatch):
    """Record each code ``setup`` asks the VUEDA adapter to send, as ``(destination, method)``, with SMS available."""
    settings.TWILIO_ACCOUNT_SID = "TESTSID"
    settings.TWILIO_AUTH_TOKEN = "TESTAUTH"
    settings.TWILIO_CALLER_ID = "TESTCALLER"
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "JBSWY3DPEHPK3PXP")
    monkeypatch.setattr("vueda.core.decorators.did_recently_authenticate", lambda request: True)
    sent = []
    monkeypatch.setattr(
        "vueda.user.viewsets.vueda_get_adapter",
        lambda: SimpleNamespace(
            send_mail=lambda to, *args: sent.append((to, "email")),
            send_sms=lambda to, *args: sent.append((to, "sms")),
        ),
    )
    return sent


def post_setup(api_client, method, destination):
    return api_client.post(
        reverse("vueda_user.totpdevice-setup"), {"method": method, "destination": destination}, format="json"
    )


@pytest.mark.django_db(databases=("default", "db_logging"))
@pytest.mark.parametrize(
    ("method", "destinations"),
    [
        ("email", [f"setup+{index}@domain.invalid" for index in range(CODE_SEND_LIMIT + 1)]),
        ("sms", [f"+1800555010{index}" for index in range(CODE_SEND_LIMIT + 1)]),
    ],
)
def test_setup_refuses_a_sixth_code_in_an_hour_for_one_user(
    api_client, user, sent_setup_codes, assert_matches_documented_response, method, destinations
):
    api_client.force_authenticate(user=user)
    for destination in destinations[:CODE_SEND_LIMIT]:
        response = post_setup(api_client, method, destination)
        assert response.status_code == HTTPStatus.OK, response_body(response)

    response = post_setup(api_client, method, destinations[CODE_SEND_LIMIT])

    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS, response_body(response)
    assert "Retry-After" in response
    assert_matches_documented_response(response, "/vueda.user/totpdevice/setup/", "post")
    assert sent_setup_codes == [(destination, method) for destination in destinations[:CODE_SEND_LIMIT]]


@pytest.mark.django_db(databases=("default", "db_logging"))
@pytest.mark.parametrize(
    ("method", "spelling", "other_spelling", "fresh_destination"),
    [
        ("email", "shared@domain.invalid", "Shared@Domain.invalid", "fresh@domain.invalid"),
        ("sms", "+18005550100", "+1 800-555-0100", "+18005550199"),
    ],
)
def test_setup_counts_one_destination_across_accounts_whatever_its_spelling(
    api_client, user, sent_setup_codes, method, spelling, other_spelling, fresh_destination
):
    other = get_user_model().objects.create_user(email="other@domain.invalid", password="test-pass", name="Other")
    api_client.force_authenticate(user=user)
    for _ in range(CODE_SEND_LIMIT):
        post_setup(api_client, method, spelling)
    api_client.force_authenticate(user=other)

    refused = [post_setup(api_client, method, other_spelling).status_code for _ in range(CODE_SEND_LIMIT)]
    # The refusals counted toward neither rate, so the other user can still send to a fresh destination.
    fresh = post_setup(api_client, method, fresh_destination)

    assert refused == [HTTPStatus.TOO_MANY_REQUESTS] * CODE_SEND_LIMIT
    assert fresh.status_code == HTTPStatus.OK, response_body(fresh)
    assert len(sent_setup_codes) == CODE_SEND_LIMIT + 1


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_codes_to_an_address_leave_its_owner_sign_in_codes_alone(api_client, user, sent_setup_codes, monkeypatch):
    owner = get_user_model().objects.create_user(email="owner@domain.invalid", password="test-pass", name="Owner")
    authenticator = Authenticator.objects.create(
        user=owner, type=Authenticator.Type.TOTP, data={"secret": "JBSWY3DPEHPK3PXP"}
    )
    TOTPDevice.objects.create(authenticator=authenticator, method="email", user=owner, email=owner.email)
    monkeypatch.setattr("vueda.user.views.get_adapter", lambda: SimpleNamespace(send_mail=lambda *args: None))
    api_client.force_authenticate(user=user)
    for _ in range(CODE_SEND_LIMIT):
        post_setup(api_client, "email", owner.email)
    api_client.force_authenticate(user=owner)

    response = api_client.post(reverse("totp_code"), {"method": "email"}, format="json")

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_setup_does_not_count_a_rejected_destination(api_client, user, sent_setup_codes):
    api_client.force_authenticate(user=user)
    for _ in range(CODE_SEND_LIMIT):
        response = post_setup(api_client, "email", "not-an-email")
        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)

    response = post_setup(api_client, "email", "setup@domain.invalid")

    assert response.status_code == HTTPStatus.OK, response_body(response)


# The acceptance tests below exercise the reauthentication policy through the real sign-in and reauthentication
# endpoints, and nothing about the check is patched.


def post_email_setup(api_client):
    return api_client.post(
        reverse("vueda_user.totpdevice-setup"), {"method": "email", "destination": "user@domain.invalid"}, format="json"
    )


def assert_reauthentication_required(response):
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response_body(response)
    assert response.data == {"detail": "Reauthentication required"}


@pytest.mark.django_db
def test_mfa_user_refused_a_password_reauthentication_cannot_set_up_a_device(api_client, mfa_device):
    api_client.force_login(mfa_device.user)
    password = api_client.post(reverse("reauthenticate"), {"password": "test-pass"}, format="json")
    assert password.status_code == HTTPStatus.FORBIDDEN, response_body(password)

    response = post_email_setup(api_client)

    assert_reauthentication_required(response)
    assert TOTPDeviceViewSet.TOTP_SESSION_KEY not in api_client.session


@pytest.mark.django_db
def test_mfa_user_who_has_not_reauthenticated_cannot_activate_a_device(api_client, mfa_device, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.validate_totp_code", lambda secret, code: True)
    api_client.force_login(mfa_device.user)
    session = api_client.session
    session[TOTPDeviceViewSet.TOTP_SESSION_KEY] = {"method": "email", "email": "user@domain.invalid"}
    session[SECRET_SESSION_KEY] = "secret"
    session.save()

    response = api_client.post(reverse("vueda_user.totpdevice-activate"), {"code": "123456"}, format="json")

    assert_reauthentication_required(response)
    assert TOTPDevice.objects.filter(user=mfa_device.user).count() == 1


@pytest.mark.django_db
def test_mfa_user_who_has_not_reauthenticated_cannot_delete_a_device(api_client, mfa_device):
    api_client.force_login(mfa_device.user)

    response = api_client.delete(reverse("vueda_user.totpdevice-detail", kwargs={"pk": mfa_device.pk}), format="json")

    assert_reauthentication_required(response)
    assert TOTPDevice.objects.filter(pk=mfa_device.pk).exists()
    assert Authenticator.objects.filter(user=mfa_device.user).exists()


@pytest.mark.django_db
def test_mfa_user_must_reauthenticate_after_a_two_factor_sign_in(api_client, mfa_device):
    login = sign_in(api_client, mfa_device.user)
    assert login.status_code == HTTPStatus.UNAUTHORIZED, response_body(login)
    confirmed = api_client.post(reverse("authenticate"), {"code": get_current_totp_code(TOTP_SECRET)}, format="json")
    assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed)

    response = post_email_setup(api_client)

    assert_reauthentication_required(response)
    assert api_client.get(reverse("who-is"), format="json").data["auth_pending_flow"] == "mfa_reauthenticate"


@pytest.mark.django_db
def test_mfa_user_can_delete_a_device_after_a_two_factor_reauthentication(api_client, mfa_device):
    api_client.force_login(mfa_device.user)
    reauthenticate_with_second_factor(api_client, get_current_totp_code(TOTP_SECRET))

    response = api_client.delete(reverse("vueda_user.totpdevice-detail", kwargs={"pk": mfa_device.pk}), format="json")

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert not TOTPDevice.objects.filter(pk=mfa_device.pk).exists()
    assert not Authenticator.objects.filter(user=mfa_device.user).exists()


@pytest.mark.django_db
@pytest.mark.parametrize("padding", ["duplicate", "unknown"])
def test_bulk_delete_of_some_devices_keeps_the_remaining_device_and_authenticator(api_client, mfa_device, padding):
    other_device = TOTPDevice.objects.create(
        authenticator=mfa_device.authenticator, method="email", user=mfa_device.user, email="user@domain.invalid"
    )
    extra_pk = mfa_device.pk if padding == "duplicate" else other_device.pk + 1000
    api_client.force_login(mfa_device.user)
    reauthenticate_with_second_factor(api_client, get_current_totp_code(TOTP_SECRET))

    response = api_client.delete(
        reverse("vueda_user.totpdevice-list"), {"pks": [mfa_device.pk, extra_pk]}, format="json"
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert list(TOTPDevice.objects.filter(user=mfa_device.user)) == [other_device]
    assert Authenticator.objects.filter(pk=mfa_device.authenticator_id).exists()


@pytest.mark.django_db
def test_bulk_delete_of_every_device_with_unknown_keys_deactivates_the_authenticator(api_client, mfa_device):
    other_device = TOTPDevice.objects.create(
        authenticator=mfa_device.authenticator, method="email", user=mfa_device.user, email="user@domain.invalid"
    )
    api_client.force_login(mfa_device.user)
    reauthenticate_with_second_factor(api_client, get_current_totp_code(TOTP_SECRET))

    response = api_client.delete(
        reverse("vueda_user.totpdevice-list"),
        {"pks": [mfa_device.pk, other_device.pk, other_device.pk + 1000]},
        format="json",
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert not TOTPDevice.objects.filter(user=mfa_device.user).exists()
    assert not Authenticator.objects.filter(user=mfa_device.user, type=Authenticator.Type.TOTP).exists()


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_password_only_user_sets_up_and_activates_a_first_device_after_a_password_check(api_client, user, monkeypatch):
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.get_totp_secret", lambda regenerate=False: "JBSWY3DPEHPK3PXP")
    monkeypatch.setattr("vueda.user.viewsets.totp_auth.validate_totp_code", lambda secret, code: True)
    monkeypatch.setattr("vueda.user.viewsets.vueda_get_adapter", lambda: SimpleNamespace(send_mail=lambda *args: None))
    api_client.force_login(user)
    reauthenticate_with_password(api_client)

    setup = post_email_setup(api_client)
    activate = api_client.post(reverse("vueda_user.totpdevice-activate"), {"code": "123456"}, format="json")

    assert setup.status_code == HTTPStatus.OK, response_body(setup)
    assert activate.status_code == HTTPStatus.CREATED, response_body(activate)
    assert TOTPDevice.objects.filter(user=user, method="email").exists()
    # The activation code counts as a second-factor reauthentication, which the account now requires.
    who_is = api_client.get(reverse("who-is"), format="json")
    assert who_is.data["auth_pending_flow"] is None


@pytest.mark.django_db
def test_password_only_user_must_reauthenticate_after_a_sign_in(api_client, user):
    login = sign_in(api_client, user)
    assert login.status_code == HTTPStatus.OK, response_body(login)

    response = post_email_setup(api_client)

    assert_reauthentication_required(response)
    assert api_client.get(reverse("who-is"), format="json").data["auth_pending_flow"] == "reauthenticate"


@pytest.mark.django_db
def test_reauthentication_older_than_the_timeout_no_longer_counts(api_client, user, settings):
    api_client.force_login(user)
    reauthenticate_with_password(api_client)
    settings.ACCOUNT_REAUTHENTICATION_TIMEOUT = 0

    response = post_email_setup(api_client)

    assert_reauthentication_required(response)
    assert api_client.get(reverse("who-is"), format="json").data["auth_pending_flow"] == "reauthenticate"


@pytest.mark.django_db
def test_user_with_no_way_to_reauthenticate_is_refused(api_client, user):
    user.set_unusable_password()
    user.save()
    api_client.force_login(user)

    response = post_email_setup(api_client)

    assert_reauthentication_required(response)


@pytest.mark.django_db
def test_mfa_user_who_has_not_reauthenticated_cannot_view_recovery_codes(api_client, recovery_codes):
    user = recovery_codes.instance.user
    # A verified address would let allauth offer reauthentication by code, which VUEDA turns off.
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    api_client.force_login(user)

    response = api_client.get(reverse("recovery_codes"))

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response_body(response)
    body = response.json()
    assert "unused_codes" not in body.get("data", {})
    flow_ids = {flow["id"] for flow in body["data"]["flows"]}
    assert "mfa_reauthenticate" in flow_ids
    assert flow_ids <= {"reauthenticate", "mfa_reauthenticate"}


@pytest.mark.django_db
def test_mfa_user_who_has_not_reauthenticated_cannot_regenerate_recovery_codes(api_client, recovery_codes):
    unused_codes = recovery_codes.get_unused_codes()
    api_client.force_login(recovery_codes.instance.user)

    response = api_client.post(reverse("recovery_codes"), {}, format="json")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response_body(response)
    recovery_codes.instance.refresh_from_db()
    assert recovery_codes.get_unused_codes() == unused_codes


@pytest.mark.django_db
def test_mfa_user_can_view_recovery_codes_after_a_two_factor_reauthentication(api_client, recovery_codes):
    api_client.force_login(recovery_codes.instance.user)
    reauthenticate_with_second_factor(api_client, get_current_totp_code(TOTP_SECRET))

    response = api_client.get(reverse("recovery_codes"))

    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert response.json()["data"]["unused_codes"] == recovery_codes.get_unused_codes()


@pytest.mark.django_db
def test_mfa_user_can_regenerate_recovery_codes_after_a_two_factor_reauthentication(api_client, recovery_codes):
    unused_codes = recovery_codes.get_unused_codes()
    api_client.force_login(recovery_codes.instance.user)
    reauthenticate_with_second_factor(api_client, get_current_totp_code(TOTP_SECRET))

    response = api_client.post(reverse("recovery_codes"), {}, format="json")

    assert response.status_code == HTTPStatus.OK, response_body(response)
    regenerated = RecoveryCodes.activate(recovery_codes.instance.user).get_unused_codes()
    assert regenerated != unused_codes
    assert response.json()["data"]["unused_codes"] == regenerated


# The device lifecycle tests below drive the real setup, activate, destroy, and sign-in endpoints, with MFA
# secrets stored encrypted. Every device shares the user's one TOTP authenticator, so the tests check the secret
# that the authenticator stores, or sign in to show which codes it accepts.


@pytest.fixture
def emailed_codes(monkeypatch):
    """Record each code that ``setup`` and ``totp_code`` send by email, in the order they are sent."""
    codes = []
    adapter = SimpleNamespace(send_mail=lambda to, name, template, context: codes.append(context["code"]))
    monkeypatch.setattr("vueda.user.viewsets.vueda_get_adapter", lambda: adapter)
    monkeypatch.setattr("vueda.user.views.get_adapter", lambda: adapter)
    return codes


@pytest.fixture
def device_owner(api_client, user, encrypted_mfa_secrets):
    """``user``, signed in through ``api_client`` with a recent password reauthentication and no device yet."""
    api_client.force_login(user)
    reauthenticate_with_password(api_client)
    return user


def add_authenticator_app(api_client):
    """Set up and activate an authenticator app, and return the secret that ``setup`` showed for it."""
    setup = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "totp"}, format="json")
    assert setup.status_code == HTTPStatus.OK, response_body(setup)
    secret = setup.data["meta"]["totp_secret"]
    activate = api_client.post(
        reverse("vueda_user.totpdevice-activate"), {"code": get_current_totp_code(secret)}, format="json"
    )
    assert activate.status_code == HTTPStatus.CREATED, response_body(activate)
    return secret


def set_up_email_device(api_client):
    setup = post_setup(api_client, "email", "user@domain.invalid")
    assert setup.status_code == HTTPStatus.OK, response_body(setup)


def add_email_device(api_client, emailed_codes):
    """Set up an email device and activate it with the code that ``setup`` emailed."""
    set_up_email_device(api_client)
    activate = api_client.post(reverse("vueda_user.totpdevice-activate"), {"code": emailed_codes[-1]}, format="json")
    assert activate.status_code == HTTPStatus.CREATED, response_body(activate)


def delete_device(api_client, user, method, **extra):
    device = TOTPDevice.objects.get(user=user, method=method)
    response = api_client.delete(
        reverse("vueda_user.totpdevice-detail", kwargs={"pk": device.pk}), format="json", **extra
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)


def stored_secret(user):
    return decrypt(Authenticator.objects.get(user=user, type=Authenticator.Type.TOTP).data["secret"])


def sign_in_to_second_factor(user):
    """Return a new client whose sign-in for ``user`` waits for a second-factor code."""
    client = APIClient()
    login = client.post(reverse("login2"), {"email": user.email, "password": "test-pass"}, format="json")
    assert login.status_code == HTTPStatus.UNAUTHORIZED, response_body(login)
    return client


def confirm_second_factor(client, code):
    return client.post(reverse("authenticate"), {"code": code}, format="json")


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_authenticator_app_added_as_the_first_device_confirms_sign_in(api_client, device_owner):
    app_secret = add_authenticator_app(api_client)

    response = confirm_second_factor(sign_in_to_second_factor(device_owner), get_current_totp_code(app_secret))

    assert response.status_code == HTTPStatus.OK, response_body(response)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_authenticator_app_added_after_an_email_device_confirms_sign_in(api_client, device_owner, emailed_codes):
    add_email_device(api_client, emailed_codes)
    authenticator = Authenticator.objects.get(user=device_owner, type=Authenticator.Type.TOTP)

    app_secret = add_authenticator_app(api_client)

    # The app joins the existing authenticator, which now holds the secret the app was shown.
    assert Authenticator.objects.get(user=device_owner, type=Authenticator.Type.TOTP) == authenticator
    assert stored_secret(device_owner) == app_secret
    response = confirm_second_factor(sign_in_to_second_factor(device_owner), get_current_totp_code(app_secret))
    assert response.status_code == HTTPStatus.OK, response_body(response)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_email_device_added_after_an_authenticator_app_keeps_the_app_working(api_client, device_owner, emailed_codes):
    app_secret = add_authenticator_app(api_client)

    add_email_device(api_client, emailed_codes)

    assert stored_secret(device_owner) == app_secret
    response = confirm_second_factor(sign_in_to_second_factor(device_owner), get_current_totp_code(app_secret))
    assert response.status_code == HTTPStatus.OK, response_body(response)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_email_setup_code_for_an_existing_authenticator_does_not_confirm_sign_in(
    api_client, device_owner, emailed_codes
):
    add_authenticator_app(api_client)

    set_up_email_device(api_client)

    response = confirm_second_factor(sign_in_to_second_factor(device_owner), emailed_codes[-1])
    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_abandoned_authenticator_app_setup_keeps_the_stored_secret(api_client, device_owner, emailed_codes):
    add_email_device(api_client, emailed_codes)
    secret_before = stored_secret(device_owner)

    setup = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "totp"}, format="json")
    assert setup.status_code == HTTPStatus.OK, response_body(setup)

    assert stored_secret(device_owner) == secret_before
    client = sign_in_to_second_factor(device_owner)
    rejected = confirm_second_factor(client, get_current_totp_code(setup.data["meta"]["totp_secret"]))
    assert rejected.status_code == HTTPStatus.BAD_REQUEST, response_body(rejected)
    sent = client.post(reverse("totp_code"), {"method": "email"}, format="json")
    assert sent.status_code == HTTPStatus.NO_CONTENT, response_body(sent)
    accepted = confirm_second_factor(client, emailed_codes[-1])
    assert accepted.status_code == HTTPStatus.OK, response_body(accepted)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_removing_the_authenticator_app_stops_its_codes_and_keeps_email_codes(api_client, device_owner, emailed_codes):
    app_secret = add_authenticator_app(api_client)
    add_email_device(api_client, emailed_codes)

    delete_device(api_client, device_owner, "totp")

    client = sign_in_to_second_factor(device_owner)
    rejected = confirm_second_factor(client, get_current_totp_code(app_secret))
    assert rejected.status_code == HTTPStatus.BAD_REQUEST, response_body(rejected)
    sent = client.post(reverse("totp_code"), {"method": "email"}, format="json")
    assert sent.status_code == HTTPStatus.NO_CONTENT, response_body(sent)
    accepted = confirm_second_factor(client, emailed_codes[-1])
    assert accepted.status_code == HTTPStatus.OK, response_body(accepted)


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_dry_run_removal_of_the_authenticator_app_keeps_the_stored_secret(api_client, device_owner, emailed_codes):
    app_secret = add_authenticator_app(api_client)
    add_email_device(api_client, emailed_codes)

    delete_device(api_client, device_owner, "totp", HTTP_DRY_RUN="true")

    assert TOTPDevice.objects.filter(user=device_owner, method="totp").exists()
    assert stored_secret(device_owner) == app_secret


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_removing_an_email_device_keeps_the_authenticator_app_working(api_client, device_owner, emailed_codes):
    app_secret = add_authenticator_app(api_client)
    add_email_device(api_client, emailed_codes)

    delete_device(api_client, device_owner, "email")

    response = confirm_second_factor(sign_in_to_second_factor(device_owner), get_current_totp_code(app_secret))
    assert response.status_code == HTTPStatus.OK, response_body(response)


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


# The journeys below follow a user from sign-in through every step that a sensitive request needs, with no patched
# step: the sign-in, the refused request, the reauthentication, and the request that then succeeds.


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_password_user_signs_in_reauthenticates_and_adds_an_authenticator_app(api_client, user):
    login = sign_in(api_client, user)
    assert login.status_code == HTTPStatus.OK, response_body(login)
    refused = api_client.post(reverse("vueda_user.totpdevice-setup"), {"method": "totp"}, format="json")
    assert_reauthentication_required(refused)

    reauthenticate_with_password(api_client)
    add_authenticator_app(api_client)

    assert TOTPDevice.objects.filter(user=user, method="totp").exists()
    assert api_client.get(reverse("who-is"), format="json").data["auth_pending_flow"] is None
    newest_record = get_authentication_records(session_request(api_client, user), user)[-1]
    assert newest_record["method"] == "mfa"
    assert newest_record["reauthenticated"] is True


@pytest.mark.django_db(databases=("default", "db_logging"))
def test_two_factor_user_signs_in_reauthenticates_and_manages_their_second_factor(api_client, recovery_codes):
    user = recovery_codes.instance.user
    login = sign_in(api_client, user)
    assert login.status_code == HTTPStatus.UNAUTHORIZED, response_body(login)
    confirmed = api_client.post(reverse("authenticate"), {"code": get_current_totp_code(TOTP_SECRET)}, format="json")
    assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed)
    refused = api_client.get(reverse("recovery_codes"))
    assert refused.status_code == HTTPStatus.UNAUTHORIZED, response_body(refused)
    assert api_client.get(reverse("who-is"), format="json").data["auth_pending_flow"] == "mfa_reauthenticate"

    # The sign-in already used the current TOTP code, and allauth refuses a code a second time, so the user
    # confirms with a recovery code.
    used_code = recovery_codes.get_unused_codes()[0]
    reauthenticate_with_second_factor(api_client, used_code)
    viewed = api_client.get(reverse("recovery_codes"))
    device = TOTPDevice.objects.get(user=user)
    deleted = api_client.delete(reverse("vueda_user.totpdevice-detail", kwargs={"pk": device.pk}), format="json")

    assert viewed.status_code == HTTPStatus.OK, response_body(viewed)
    assert used_code not in viewed.json()["data"]["unused_codes"]
    assert deleted.status_code == HTTPStatus.NO_CONTENT, response_body(deleted)
    assert not TOTPDevice.objects.filter(user=user).exists()
    assert not Authenticator.objects.filter(user=user, type=Authenticator.Type.TOTP).exists()
