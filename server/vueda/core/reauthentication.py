"""Reauthentication policy: which flow a user must complete, and whether their session completed one recently."""

__all__ = (
    "did_recently_authenticate",
    "required_flow",
)

from allauth.account.decorators import reauthentication_required
from allauth.core.exceptions import ReauthenticationRequired
from allauth.headless.constants import Flow
from allauth.mfa.utils import is_mfa_enabled


def required_flow(user):
    """
    Return the allauth ``Flow`` the user must complete to reauthenticate.

    A user with an MFA authenticator confirms a second factor (``Flow.MFA_REAUTHENTICATE``). A user with only
    a usable password confirms the password (``Flow.REAUTHENTICATE``). The result is ``None`` for an anonymous
    user and for a user with neither, because they have no way to reauthenticate.

    The password reauthentication view accepts only a user whose flow is ``Flow.REAUTHENTICATE``, so the session
    records a password reauthentication only while the user has no MFA authenticator.
    """
    if not user.is_authenticated:
        return None
    if is_mfa_enabled(user):
        return Flow.MFA_REAUTHENTICATE
    if user.has_usable_password():
        return Flow.REAUTHENTICATE
    return None


@reauthentication_required
def _pass_recent_reauthentication(request):
    return True


def did_recently_authenticate(request):
    """
    Return whether the signed-in user reauthenticated within ``ACCOUNT_REAUTHENTICATION_TIMEOUT``.

    allauth's ``reauthentication_required`` decides, so VUEDA applies the same rule as the allauth flows that it
    calls. A sign-in does not count; only an explicit reauthentication does. The result is ``False`` for an
    anonymous user, and for a user with no way to reauthenticate.
    """
    try:
        return _pass_recent_reauthentication(request)
    except ReauthenticationRequired:
        return False
