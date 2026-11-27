from http import HTTPStatus

import pytest
from allauth.headless.constants import Flow
from allauth.mfa.totp.internal.auth import TOTP
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from tests.conftest import TOTP_SECRET
from tests.conftest import reauthenticate_with_password
from tests.conftest import reauthenticate_with_second_factor
from tests.conftest import response_body
from tests.conftest import session_request
from tests.conftest import sign_in
from vueda.core.reauthentication import did_recently_authenticate
from vueda.core.reauthentication import required_flow
from vueda.user.utils import get_current_totp_code


@pytest.fixture
def password_user(db):
    return get_user_model().objects.create_user(
        email="reauth-password@domain.invalid",
        password="test-pass",
        name="Password User",
    )


@pytest.fixture
def mfa_user(password_user):
    TOTP.activate(password_user, TOTP_SECRET)
    return password_user


@pytest.fixture
def no_credentials_user(db):
    user = get_user_model().objects.create_user(
        email="reauth-none@domain.invalid",
        password="test-pass",
        name="No Credentials User",
    )
    user.set_unusable_password()
    user.save()
    return user


class TestRequiredFlow:
    def test_password_only_user_confirms_password(self, password_user):
        assert required_flow(password_user) == Flow.REAUTHENTICATE

    def test_user_with_authenticator_confirms_second_factor(self, mfa_user):
        assert required_flow(mfa_user) == Flow.MFA_REAUTHENTICATE

    def test_user_with_neither_has_no_flow(self, no_credentials_user):
        assert required_flow(no_credentials_user) is None

    def test_anonymous_has_no_flow(self, db):
        assert required_flow(AnonymousUser()) is None


class TestDidRecentlyAuthenticate:
    def test_anonymous_is_never_recent(self, api_client, db):
        assert did_recently_authenticate(session_request(api_client, AnonymousUser())) is False

    def test_sign_in_alone_is_not_recent(self, api_client, password_user):
        response = sign_in(api_client, password_user)
        assert response.status_code == HTTPStatus.OK, response_body(response)

        assert did_recently_authenticate(session_request(api_client, password_user)) is False

    def test_password_reauthentication_is_recent(self, api_client, password_user):
        api_client.force_login(password_user)
        reauthenticate_with_password(api_client)

        assert did_recently_authenticate(session_request(api_client, password_user)) is True

    def test_reauthentication_older_than_the_timeout_is_not_recent(self, api_client, password_user, settings):
        api_client.force_login(password_user)
        reauthenticate_with_password(api_client)
        settings.ACCOUNT_REAUTHENTICATION_TIMEOUT = 0

        assert did_recently_authenticate(session_request(api_client, password_user)) is False

    def test_second_factor_reauthentication_is_recent(self, api_client, mfa_user):
        api_client.force_login(mfa_user)
        reauthenticate_with_second_factor(api_client, get_current_totp_code(TOTP_SECRET))

        assert did_recently_authenticate(session_request(api_client, mfa_user)) is True

    def test_user_with_no_way_to_reauthenticate_is_never_recent(self, api_client, no_credentials_user):
        api_client.force_login(no_credentials_user)

        assert did_recently_authenticate(session_request(api_client, no_credentials_user)) is False
