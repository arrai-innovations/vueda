"""System checks for the history backend's configuration."""

__all__ = ("check_history_middleware",)

from django.conf import settings
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.core.checks import Warning as CheckWarning
from django.utils.module_loading import import_string
from pghistory.middleware import HistoryMiddleware


def _middleware_index(entries, base):
    """Return the position of the first entry that is a ``base`` subclass, or ``None``."""
    for index, entry in enumerate(entries):
        try:
            middleware = import_string(entry)
        except ImportError:
            # Django's own check reports an unimportable middleware. Do not report it twice.
            continue
        if isinstance(middleware, type) and issubclass(middleware, base):
            return index
    return None


def check_history_middleware(app_configs, **kwargs):
    """Report a middleware stack that cannot name the action behind a request.

    ``get_defaults`` places the middleware correctly, but a project owns its own ``MIDDLEWARE`` and
    can replace or reorder that list. Both faults here are warnings rather than errors, because a
    request still records its events either way. What goes missing is the identity associating the
    events of one request with each other, or the user who caused them.

    Any ``HistoryMiddleware`` subclass satisfies this, because a project may extend VUEDA's to
    record metadata of its own.
    """
    entries = list(getattr(settings, "MIDDLEWARE", None) or ())
    history_index = _middleware_index(entries, HistoryMiddleware)

    if history_index is None:
        return [
            CheckWarning(
                "vueda.history is installed but no history middleware is configured.",
                hint=(
                    "Add 'vueda.history.middleware.VuedaHistoryMiddleware' to MIDDLEWARE, after "
                    "AuthenticationMiddleware. Without it, the events of one request record no shared "
                    "action, so history cannot group them."
                ),
                id="vueda_history.W001",
            )
        ]

    auth_index = _middleware_index(entries, AuthenticationMiddleware)
    if auth_index is not None and history_index < auth_index:
        return [
            CheckWarning(
                "History middleware runs before AuthenticationMiddleware.",
                hint=(
                    f"Move '{entries[history_index]}' after '{entries[auth_index]}' in MIDDLEWARE. It reads "
                    "request.user to attribute an action, and nothing has set that yet."
                ),
                id="vueda_history.W002",
            )
        ]

    return []
