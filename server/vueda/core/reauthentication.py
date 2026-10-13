"""Reauthentication policy: which flow a user must complete, and whether their session completed it recently."""

__all__ = (
    "RECORD_METHOD_BY_FLOW",
    "did_recently_authenticate",
    "required_flow",
)

import time

from allauth.account import app_settings as account_settings
from allauth.account.authentication import get_authentication_records
from allauth.headless.constants import Flow
from allauth.mfa.utils import is_mfa_enabled


RECORD_METHOD_BY_FLOW = {Flow.REAUTHENTICATE: "password", Flow.MFA_REAUTHENTICATE: "mfa"}
"""The ``method`` allauth writes into a session authentication record when each flow completes."""


def required_flow(user):
    """
    Return the allauth ``Flow`` the user must complete to count as recently authenticated.

    A user with an MFA authenticator confirms a second factor (``Flow.MFA_REAUTHENTICATE``). A user with only
    a usable password confirms the password (``Flow.REAUTHENTICATE``). A user with neither has nothing to
    confirm, so the result is ``None`` and the session always counts as recent.
    """
    if not user.is_authenticated:
        return None
    if is_mfa_enabled(user):
        return Flow.MFA_REAUTHENTICATE
    if user.has_usable_password():
        return Flow.REAUTHENTICATE
    return None


def did_recently_authenticate(request):
    """
    Return whether the session holds an authentication record for the user's required flow that is newer
    than ``ACCOUNT_REAUTHENTICATION_TIMEOUT``.

    Login and reauthentication both write records, so a fresh login satisfies the check as well as a
    reauthentication does. Only records of the required method count: confirming the password does not
    refresh the session of a user who must confirm a second factor.
    """
    if request.user.is_anonymous:
        return False
    flow = required_flow(request.user)
    if flow is None:
        return True
    method = RECORD_METHOD_BY_FLOW[flow]
    authenticated_at = max(
        (record["at"] for record in get_authentication_records(request) if record.get("method") == method),
        default=None,
    )
    if authenticated_at is None:
        return False
    return time.time() - authenticated_at < account_settings.REAUTHENTICATION_TIMEOUT
