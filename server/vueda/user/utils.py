from allauth.mfa.totp.internal.auth import format_hotp_value
from allauth.mfa.totp.internal.auth import hotp_value
from allauth.mfa.totp.internal.auth import yield_hotp_counters_from_time
from django.conf import settings


def get_current_totp_code(secret: str) -> str:
    counters = list(yield_hotp_counters_from_time())
    if not counters:
        raise ValueError("No counters available for TOTP code generation.")
    counter = next(reversed(counters))
    value = hotp_value(secret, counter)
    return format_hotp_value(value)


def is_twilio_configured():
    return all(
        [
            getattr(settings, "TWILIO_ACCOUNT_SID", None),
            getattr(settings, "TWILIO_AUTH_TOKEN", None),
            getattr(settings, "TWILIO_CALLER_ID", None),
        ]
    )
