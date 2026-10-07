import time

import pytest
from allauth.account import app_settings as account_settings
from allauth.account.internal.flows.login import AUTHENTICATION_METHODS_SESSION_KEY
from allauth.headless.constants import Flow
from allauth.mfa.models import Authenticator
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory

from vueda.core.reauthentication import did_recently_authenticate
from vueda.core.reauthentication import required_flow


@pytest.fixture
def password_user(db):
    return get_user_model().objects.create_user(
        email="reauth-password@domain.invalid",
        password="test-pass",
        name="Password User",
    )


@pytest.fixture
def mfa_user(password_user):
    Authenticator.objects.create(user=password_user, type=Authenticator.Type.TOTP, data={})
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


def _request(user, *records):
    """A request for ``user`` whose session holds one authentication record per ``(method, seconds_ago)``."""
    request = RequestFactory().get("/")
    request.user = user
    now = time.time()
    request.session = {
        AUTHENTICATION_METHODS_SESSION_KEY: [
            {"method": method, "at": now - seconds_ago} for method, seconds_ago in records
        ]
    }
    return request


STALE = account_settings.REAUTHENTICATION_TIMEOUT + 1


class TestRequiredFlow:
    def test_password_only_user_confirms_password(self, password_user):
        assert required_flow(password_user) == Flow.REAUTHENTICATE

    def test_user_with_authenticator_confirms_second_factor(self, mfa_user):
        assert required_flow(mfa_user) == Flow.MFA_REAUTHENTICATE

    def test_user_with_neither_has_nothing_to_confirm(self, no_credentials_user):
        assert required_flow(no_credentials_user) is None

    def test_anonymous_has_no_flow(self, db):
        assert required_flow(AnonymousUser()) is None


class TestDidRecentlyAuthenticate:
    def test_anonymous_is_never_recent(self, db):
        assert did_recently_authenticate(_request(AnonymousUser(), ("password", 0))) is False

    def test_password_user_without_records_is_not_recent(self, password_user):
        assert did_recently_authenticate(_request(password_user)) is False

    def test_password_user_with_fresh_password_record_is_recent(self, password_user):
        assert did_recently_authenticate(_request(password_user, ("password", 0))) is True

    def test_password_user_with_stale_password_record_is_not_recent(self, password_user):
        assert did_recently_authenticate(_request(password_user, ("password", STALE))) is False

    def test_mfa_user_with_only_a_password_record_is_not_recent(self, mfa_user):
        assert did_recently_authenticate(_request(mfa_user, ("password", 0))) is False

    def test_mfa_user_with_fresh_mfa_record_is_recent(self, mfa_user):
        assert did_recently_authenticate(_request(mfa_user, ("password", 5), ("mfa", 0))) is True

    def test_mfa_user_fresh_mfa_record_counts_when_a_newer_password_record_follows(self, mfa_user):
        assert did_recently_authenticate(_request(mfa_user, ("mfa", 10), ("password", 0))) is True

    def test_mfa_user_with_stale_mfa_and_fresh_password_is_not_recent(self, mfa_user):
        assert did_recently_authenticate(_request(mfa_user, ("mfa", STALE), ("password", 0))) is False

    def test_user_with_nothing_to_confirm_is_always_recent(self, no_credentials_user):
        assert did_recently_authenticate(_request(no_credentials_user)) is True
