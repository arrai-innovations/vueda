"""Shared utilities for template rendering, system user lookup, and fake requests and views."""

__all__ = (
    "ActionView",
    "AvailableActionsRequest",
    "get_system_user",
    "render_template",
)

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


class ActionView:
    """
    Presents a fixed ``action`` to a permission check, delegating every other attribute
    (``get_queryset()`` included) to the wrapped view unchanged.

    A permission class reads ``view.action`` to decide which named permission a request needs --
    for example ``list`` versus ``read`` for two actions that both use ``GET``. Wrapping the view
    this way lets a caller check authorization for one specific action, independently of whatever
    action the surrounding response is actually for, without mutating the wrapped view's own
    ``action`` attribute. ``get_queryset()``, reached through this wrapper, still runs as a bound
    method of the wrapped view and reads that view's real ``action``, so it keeps building
    whatever queryset the actual request would have built.

    ``__class__`` reports the wrapped view's own class rather than ``ActionView`` itself, so
    ``isinstance(action_view, ViewSet)`` is true and a viewset method invoked unbound with this
    wrapper standing in for ``self`` (:func:`vueda.core.permissions.check_action_permission` does
    exactly this for ``check_object_permissions``) can still reach its own base implementation
    through a bare, zero-argument ``super()`` call -- that call requires ``self`` to appear as an
    instance of the class defining the method, which this wrapper otherwise would not. Delegation
    through ``__getattr__`` is what keeps that safe: a method reached that way still runs bound to
    the real view, so this spoof only ever affects the one direct ``isinstance`` check, never which
    object a nested call like ``get_queryset()`` actually runs against.
    """

    def __init__(self, view, action):
        self._view = view
        self.action = action

    def __getattr__(self, name):
        return getattr(self._view, name)

    @property
    def __class__(self):
        return type(self._view)


def sort_by_dot_count_alphabetically(value):
    return value.count("."), value
