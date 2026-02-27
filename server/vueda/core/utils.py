from string import Template
from typing import TYPE_CHECKING

import sentry_sdk


if TYPE_CHECKING:
    from django.contrib.auth import get_user_model

    User = get_user_model()


def get_system_user() -> "User":
    from django.contrib.auth import get_user_model

    user_model = get_user_model()
    return user_model.objects.get(is_system=True)


def render_template(text: str, tags: dict) -> str:
    """
    Replace tags in the body with their corresponding values from the tags dictionary.
    """
    template = Template(text)
    try:
        return template.substitute(**tags)
    except ValueError as exc:
        sentry_sdk.capture_exception(exc)
        return template.safe_substitute(**tags)


class AvailableActionsRequest:
    def __init__(self, *, method="GET", user=None, authenticators=(), successful_authenticator=()):
        self.authenticators = authenticators
        self.method = method
        self.successful_authenticator = successful_authenticator
        self.user = user


def sort_by_dot_count_alphabetically(value):
    return value.count("."), value
