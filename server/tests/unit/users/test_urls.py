import time
from http import HTTPStatus

import pytest
from allauth.account.internal.flows.login import AUTHENTICATION_METHODS_SESSION_KEY
from allauth.mfa import app_settings as mfa_settings
from allauth.mfa.models import Authenticator
from allauth.mfa.recovery_codes.internal.auth import RecoveryCodes
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.conftest import response_body


ALLAUTH_PREFIX = "/routes/vueda.user/_allauth/browser/v1/"

# Every allauth headless browser route that `allauth.headless.urls` would mount with VUEDA's settings. VUEDA's own
# views cover login, two-factor, reauthentication, recovery codes, password change and reset, and device management,
# so these would only be a second, untested way into the same accounts.
UNMOUNTED_ALLAUTH_PATHS = (
    "config",
    "auth/session",
    "auth/login",
    "auth/signup",
    "auth/reauthenticate",
    "auth/code/confirm",
    "auth/password/request",
    "auth/password/reset",
    "auth/email/verify",
    "auth/email/verify/resend",
    "auth/phone/verify",
    "auth/phone/verify/resend",
    "auth/2fa/authenticate",
    "auth/2fa/reauthenticate",
    "account/password/change",
    "account/email",
    "account/phone",
    "account/authenticators",
    "account/authenticators/totp",
    "account/authenticators/recovery-codes",
)


@pytest.fixture
def mfa_user(db):
    user = get_user_model().objects.create_user(
        email="recovery-codes@domain.invalid",
        password="test-pass",
        name="Recovery Codes User",
    )
    Authenticator.objects.create(user=user, type=Authenticator.Type.TOTP, data={})
    RecoveryCodes.activate(user)
    return user


def test_recovery_codes_are_served_from_vueda_url():
    assert reverse("recovery_codes") == "/routes/vueda.user/2fa/recovery-codes/"


@pytest.mark.django_db
def test_recovery_codes_are_served_to_a_recently_authenticated_user(api_client, mfa_user):
    api_client.force_login(mfa_user)
    session = api_client.session
    session[AUTHENTICATION_METHODS_SESSION_KEY] = [{"method": "mfa", "at": time.time()}]
    session.save()

    response = api_client.get(reverse("recovery_codes"))

    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert len(response.json()["data"]["unused_codes"]) == mfa_settings.RECOVERY_CODE_COUNT


@pytest.mark.django_db
@pytest.mark.parametrize("path", UNMOUNTED_ALLAUTH_PATHS)
@pytest.mark.parametrize("method", ["get", "post", "delete"])
def test_other_allauth_headless_routes_are_not_mounted(api_client, mfa_user, path, method):
    api_client.force_login(mfa_user)

    response = getattr(api_client, method)(f"{ALLAUTH_PREFIX}{path}", format="json")

    assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
