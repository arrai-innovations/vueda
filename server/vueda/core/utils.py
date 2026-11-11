"""Shared utilities for template rendering, system user lookup, and fake requests and views."""

__all__ = (
    "ActionView",
    "AvailableActionsRequest",
    "get_system_user",
    "implemented_builtin_actions",
    "render_template",
)

from string import Template
from typing import TYPE_CHECKING

import sentry_sdk


if TYPE_CHECKING:
    from django.contrib.auth import get_user_model

    User = get_user_model()


def get_system_user() -> "User":
    """
    Return the user with ``is_system=True``. Workflow transitions fall back to this user when no acting
    user is known.

    Raises ``DoesNotExist`` when no system user exists.
    """
    from django.contrib.auth import get_user_model

    user_model = get_user_model()
    return user_model.objects.get(is_system=True)


BUILTIN_ACTIONS = ("list", "retrieve", "create", "update", "partial_update", "destroy")


def implemented_builtin_actions(viewset) -> tuple[str, ...]:
    """
    The built-in CRUD actions ``viewset`` (a class or an instance) implements, in
    ``BUILTIN_ACTIONS`` order.

    Uses the test DRF's router applies when it routes a viewset (``hasattr(viewset, action)``),
    so action discovery offers exactly the built-in actions that have a route. A
    ``VuedaReadOnlyViewSet`` yields ``list`` and ``retrieve`` only.
    """
    return tuple(action for action in BUILTIN_ACTIONS if hasattr(viewset, action))


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

    The wrapper presents the view that the router builds for ``action``. The router sets the
    ``@action`` init kwargs of an extra action, such as ``name`` and ``permission_classes``, as
    attributes of the view that serves it. ``attributes`` are those init kwargs for the action
    under test, and the check sees them in place of the wrapped view's own. When the wrapped view
    serves an extra action itself, the init kwargs of that action belong to its own route. The
    check reads each of them that ``attributes`` does not set from the wrapped view's class.

    :meth:`get_permissions` runs against this wrapper. It therefore reads ``permission_classes``
    and ``action`` as the routed view for ``action`` holds them.

    ``__class__`` reports the wrapped view's own class rather than ``ActionView`` itself, so
    ``isinstance(action_view, ViewSet)`` is true and a viewset method invoked unbound with this
    wrapper standing in for ``self`` can still reach its own base implementation through a bare,
    zero-argument ``super()`` call -- that call requires ``self`` to appear as an instance of the
    class defining the method, which this wrapper otherwise would not.
    :meth:`get_permissions` binds the class's ``get_permissions`` to this wrapper in that way, and
    :mod:`vueda.core.permissions` binds ``check_object_permissions`` to it. Delegation through
    ``__getattr__`` is what keeps that safe: a method reached that way still runs bound to the
    real view, so this spoof only ever affects the one direct ``isinstance`` check, never which
    object a nested call like ``get_queryset()`` actually runs against.
    """

    def __init__(self, view, action, **attributes):
        self._view = view
        self._class_attribute_names = frozenset(_served_action_init_kwargs(view)) - attributes.keys()
        self.action = action
        self.__dict__.update(attributes)

    def __getattr__(self, name):
        if name in self._class_attribute_names:
            return getattr(type(self._view), name)
        return getattr(self._view, name)

    @property
    def __class__(self):
        return type(self._view)

    def get_permissions(self):
        """Return the permission classes that the wrapped view's class selects for this wrapper's action."""
        return type(self._view).get_permissions(self)


def _served_action_init_kwargs(view):
    """
    Return the ``@action`` init kwargs of the extra action that ``view`` serves.

    The dict is empty when ``view`` serves a built-in action or no action.
    """
    get_extra_actions = getattr(type(view), "get_extra_actions", None)
    served_action = getattr(view, "action", None)
    if get_extra_actions is None or served_action is None:
        return {}
    for extra_action in get_extra_actions():
        if served_action in extra_action.mapping.values():
            return extra_action.kwargs
    return {}


def sort_by_dot_count_alphabetically(value):
    return value.count("."), value


def unwrap_expandable_field(field_data):
    """
    Split one ``Meta.expandable_fields`` value into ``(field_serializer, expand_options)``.

    A value that is a tuple holds the serializer first and its options second. A tuple without options
    gets an empty dict. An empty tuple holds no serializer, so the serializer is ``None``. Any other value
    is the serializer itself, with an empty dict of options.
    """
    if isinstance(field_data, tuple):
        return (
            field_data[0] if field_data else None,
            field_data[1] if len(field_data) > 1 else {},
        )
    return field_data, {}
