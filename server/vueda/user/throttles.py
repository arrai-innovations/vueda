"""Rate limits for VUEDA's auth endpoints."""

__all__ = (
    "ClientIPScopedRateThrottle",
    "throttle_code_send",
)

from allauth.account.adapter import get_adapter as get_account_adapter
from phonenumber_field.phonenumber import to_python as to_phone_number
from rest_framework.exceptions import Throttled
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.throttling import SimpleRateThrottle


class ClientIPScopedRateThrottle(ScopedRateThrottle):
    """
    Count requests against the view's ``throttle_scope``, per user when signed in and per client IP otherwise.

    The client IP comes from the allauth account adapter's ``get_client_ip``, the same address that allauth's
    own rate limits count. It trusts ``X-Forwarded-For`` only as far as ``ALLAUTH_TRUSTED_PROXY_COUNT`` or
    ``ALLAUTH_TRUSTED_CLIENT_IP_HEADER`` allow, so a caller cannot pick a new address on each request.
    """

    def get_ident(self, request):
        return get_account_adapter(request).get_client_ip(request)


class KeyedRateThrottle(SimpleRateThrottle):
    """
    Count requests against the rate named by ``scope`` under an identifier that the caller supplies.

    DRF's built-in throttles derive their identifier from the request, which is the client's IP address for
    an anonymous request. A two-factor code goes to a user and a destination that the view resolves itself,
    so this throttle takes that identifier directly. The rate comes from
    ``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]``.

    ``allow_request`` only checks the count. ``record`` adds the current request to it, so a caller that
    checks several throttles can count the request only when every one of them allows it.
    """

    def __init__(self, scope, ident):
        self.scope = scope
        self.ident = ident
        super().__init__()

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.ident}

    def throttle_success(self):
        return True

    def record(self):
        """Add the request that ``allow_request`` checked to the count."""
        super().throttle_success()


def normalize_destination(method, destination):
    """
    Return the form of an email address or phone number that the destination rate counts under.

    An email address is lowercased. A phone number is written in E.164 form, so two spellings of one
    number share a count.
    """
    if method == "sms":
        return to_phone_number(destination).as_e164
    return destination.lower()


def throttle_code_send(request, user, method, *, destination=None):
    """
    Count one code sent to ``user`` by ``method``. Raise ``Throttled`` when a rate that applies is used up.

    The ``totp_send_user`` rate counts the codes sent for one account by one method, email or sms. Each
    method has its own count, so a user who uses up their SMS codes can still get one by email.

    Pass ``destination`` when the caller chose it, as when setting up a device. The
    ``totp_send_destination`` rate then also counts the codes sent to that email address or phone number
    across all accounts, so one address cannot be flooded from many accounts. A registered device's
    destination is left out, because its own user's rate covers it. Counting it across accounts would let
    anyone use up another user's sign-in codes by sending setup codes to their address.

    A refused send counts toward no rate. ``Throttled`` makes DRF answer 429 with a ``Retry-After``
    header. Call this right before sending, after every other check has passed.
    """
    throttles = [KeyedRateThrottle("totp_send_user", f"{user.pk}:{method}")]
    if destination is not None:
        throttles.append(KeyedRateThrottle("totp_send_destination", normalize_destination(method, destination)))
    refused = [throttle for throttle in throttles if not throttle.allow_request(request, None)]
    if refused:
        waits = [wait for wait in (throttle.wait() for throttle in refused) if wait is not None]
        raise Throttled(wait=max(waits, default=None))
    for throttle in throttles:
        throttle.record()
