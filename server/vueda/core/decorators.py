"""ViewSet action decorators for dry-run support, confirmation gating, and reauthentication."""

__all__ = (
    "ACKNOWLEDGE_WARNINGS_HEADER",
    "DEFAULT_CONFIRM_MESSAGE",
    "DRY_RUN_HEADER",
    "action",
    "recent_auth_required",
)

from functools import wraps

from allauth.account.internal.flows.reauthentication import raise_if_reauthentication_required
from allauth.core.exceptions import ReauthenticationRequired
from django.db import transaction
from rest_framework import status as drf_status
from rest_framework.decorators import action as rf_action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response

from vueda.core.exceptions import ACKNOWLEDGE_WARNINGS_HEADER
from vueda.core.exceptions import gate_warnings


DRY_RUN_HEADER = "Dry-Run"

DEFAULT_CONFIRM_MESSAGE = "This action requires confirmation."
"""Warning text used by ``@action(confirm=True)`` when the action sets no ``confirm_message``."""


def action(methods=None, detail=None, bulk=False, confirm=False, url_path=None, url_name=None, **kwargs):
    """
    Drop-in replacement for DRF's ``@action`` that adds ``bulk`` and ``confirm`` modes.

    ``bulk=True`` marks the action as a bulk action, which ``VuedaRouter`` also routes at the list
    URL (no pk) in addition to the detail URL.

    ``confirm=True`` declares an always-on consequence warning: every mutating request (method not
    in ``SAFE_METHODS``) is gated through ``vueda.core.exceptions.gate_warnings`` before the body
    runs, with ``{"non_field_errors": [message]}`` as the warning set. The message comes from a
    ``confirm_message`` attribute set on the decorated action (``my_action.confirm_message = "..."``
    after the definition) and falls back to ``DEFAULT_CONFIRM_MESSAGE``. The unacknowledged first
    submit therefore always returns a 409 without executing the body; resubmitting with the digest
    in the ``Acknowledge-Warnings`` header runs it. The gate raises regardless of dry-run.

    Because ``confirm=True`` gates before the body, it suits input-less consequence actions: any
    body-level validation 400 would only surface after the 409 is acknowledged. Actions with input
    should instead call ``gate_warnings(request, ...)`` explicitly after
    ``serializer.is_valid(raise_exception=True)`` so 400s precede the 409.
    """
    rf_decorator = rf_action(methods=methods, detail=detail, url_path=url_path, url_name=url_name, **kwargs)

    def decorator(func):
        @wraps(func)
        def wrapped_func(view_set_instance, request, *args, **kwargs):
            is_mutation_request = request.method not in SAFE_METHODS

            if confirm and is_mutation_request:
                message = getattr(wrapped_func, "confirm_message", DEFAULT_CONFIRM_MESSAGE)
                gate_warnings(request, {"non_field_errors": [message]})

            dry_run = request.headers.get(DRY_RUN_HEADER, "false").lower() == "true"

            if not is_mutation_request or not dry_run:
                request.dry_run = False
                return func(view_set_instance, request, *args, **kwargs)
            already_in_dry_run = getattr(request, "dry_run", False)
            request.dry_run = dry_run

            response = func(view_set_instance, request, *args, **kwargs)
            if not already_in_dry_run:
                transaction.set_rollback(True)

            return response

        wrapped_func = rf_decorator(wrapped_func)
        wrapped_func.bulk = bulk
        wrapped_func.confirm = confirm
        return wrapped_func

    return decorator


def recent_auth_required(func):
    @wraps(func)
    def _wrapped_view(view_set_instance, request, *args, **kwargs):
        try:
            raise_if_reauthentication_required(request)
            return func(view_set_instance, request, *args, **kwargs)
        except ReauthenticationRequired:
            return Response({"detail": "Reauthentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)

    return _wrapped_view
