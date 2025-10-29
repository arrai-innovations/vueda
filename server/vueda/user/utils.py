from allauth.mfa.totp.internal.auth import format_hotp_value
from allauth.mfa.totp.internal.auth import hotp_value
from allauth.mfa.totp.internal.auth import yield_hotp_counters_from_time


def get_current_totp_code(secret: str) -> str:
    counters = list(yield_hotp_counters_from_time())
    value = None
    for counter in reversed(counters):
        value = hotp_value(secret, counter)
        return format_hotp_value(value)

    return format_hotp_value(value)
