"""Custom exception handler and validation error classes with warning support."""

__all__ = (
    "BadRequestException",
    "ConfirmationRequired",
    "VuedaValidationError",
    "compute_warnings_digest",
    "debug_stack_exception_handler",
    "get_error_details_as_warning",
    "page_not_found",
)

import hashlib
import json
import logging
from http import HTTPStatus
from traceback import format_exception
from traceback import format_exception_only
from traceback import format_tb

import sentry_sdk
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import JsonResponse
from django.utils.encoding import force_str
from rest_framework.exceptions import APIException
from rest_framework.exceptions import ErrorDetail
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.status import HTTP_409_CONFLICT
from rest_framework.utils.serializer_helpers import ReturnDict
from rest_framework.utils.serializer_helpers import ReturnList
from rest_framework.views import exception_handler

from vueda.core.logging_filters import contains_only_warnings


logger = logging.getLogger(__name__)
django_requests_logger = logging.getLogger("django.request")


def debug_stack_exception_handler(exc, context):
    """
    Custom exception handler which adds the exception class name to the response.
    """
    if isinstance(exc, ConfirmationRequired):
        # An expected control-flow response, not an error: the request is valid but carries
        # unacknowledged advisory warnings. Return it directly so it skips the error logging,
        # Sentry capture, and serverStack augmentation below.
        return Response(
            {"confirmation_required": True, "digest": exc.digest, "warnings": exc.warnings},
            status=exc.status_code,
        )

    # switched to ValidationError, because rest flex fields raises ValidationError("Expansion depth exceeded")
    if isinstance(exc, ValidationError) and isinstance(exc.detail, list):
        # VuedaValidationErrors raise as a list are non-field errors
        exc.detail = {api_settings.NON_FIELD_ERRORS_KEY: exc.detail}

    response = exception_handler(exc, context)
    if response is None:
        # the exception was not handled by the default exception handler
        response = Response(
            {"detail": "Internal server error."},
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    # The rest frameworks exception_handler doesn't handle ImpropertyConfigured errors, even though they
    # raise them internally in a number of places, so this adds them to the response as the client expects.
    if isinstance(exc, ImproperlyConfigured):
        message = exc.args[0]
        if not isinstance(message, list):
            message = [message]
        response.data = {"detail": message}

    if hasattr(exc, "__traceback__") and format_tb(exc.__traceback__):
        # Calling logging.exception() when there is no traceback, is what causes None in the logs.
        django_requests_logger.exception("Exception in DRF view", extra={"request": context["request"]})
    else:
        django_requests_logger.error("Exception in DRF view", extra={"request": context["request"]})

    if not settings.DEBUG and not getattr(settings, "IN_TESTS", False) and not contains_only_warnings(exc):
        # Capture the exception with Sentry
        sentry_sdk.capture_exception(exc)

    if settings.DEBUG or getattr(settings, "IN_TESTS", False):
        response.data["serverStack"] = "".join(format_exception(type(exc), exc, exc.__traceback__))
    else:
        response.data["serverStack"] = "".join(format_exception_only(type(exc), exc))
    return response


class BadRequestException(APIException):
    status_code = HTTP_400_BAD_REQUEST
    default_detail = "There was a problem with your request."
    default_code = "bad_request"


def compute_warnings_digest(warnings):
    """
    Return a short, stable digest of a warnings mapping.

    The digest is order-independent (keys are sorted) so that the same set of warnings always hashes
    to the same value. The client echoes this digest back in the acknowledgement header; the gate is
    only bypassed on an exact match, so a changed warning set produces a different digest and the
    user is re-prompted instead of silently committing past warnings they never saw.
    """
    canonical = json.dumps(warnings, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


class ConfirmationRequired(APIException):
    """
    Raised when a create/update is valid but produced advisory warnings that have not yet been
    acknowledged. Withholds the write and asks the client to confirm. See ``WarningConfirmationMixin``.
    """

    status_code = HTTP_409_CONFLICT
    default_detail = "This change has warnings that require confirmation."
    default_code = "confirmation_required"

    def __init__(self, warnings, digest, detail=None, code=None):
        super().__init__(detail=detail, code=code)
        self.warnings = warnings
        self.digest = digest


def page_not_found(request, exception, *args, **kwargs):
    return JsonResponse({"detail": "Not found."}, status=HTTP_404_NOT_FOUND)


def _get_error_details(data, default_code=None, is_warning=False):
    """
    Descend into a nested data structure, forcing any
    lazy translation strings or strings into `ErrorDetail`.
    """
    if isinstance(data, VuedaValidationError):
        detail = data.detail
        # Don't double up lists
        if not isinstance(detail, list):
            return force_str([detail])
        return force_str(detail)

    if is_warning:
        data = get_error_details_as_warning(data)

    if isinstance(data, (list, tuple)):
        ret = []
        for item in data:
            if isinstance(item, VuedaValidationError):
                ret.append(_get_error_details(item, item.code, item.is_warning))
            else:
                ret.append(_get_error_details(item, default_code, is_warning))
        if isinstance(data, ReturnList):
            return ReturnList(ret, serializer=data.serializer)

        return ret

    elif isinstance(data, dict):
        ret = {key: _get_error_details(value, default_code) for key, value in data.items()}
        if isinstance(data, ReturnDict):
            return ReturnDict(ret, serializer=data.serializer)

        return ret

    text = force_str(data)
    code = getattr(data, "code", default_code)
    return ErrorDetail(text, code)


def get_error_details_as_warning(detail):
    if isinstance(detail, (list, tuple)):
        return [get_error_details_as_warning(d) for d in detail]
    if isinstance(detail, dict):
        details = {}
        for key, value in detail.items():
            errors = get_error_details_as_warning(value)
            if not isinstance(errors, list):
                errors = [errors]
            details[key] = errors
        return details
    else:
        warnings = _get_error_details(detail, default_code="warning")
        # If the value is a list, tuple or dict, we don't want another list.
        if not isinstance(warnings, (list, tuple, dict)):
            return {"warnings": [warnings]}
        return {"warnings": warnings}


class VuedaValidationError(ValidationError):
    default_type = "error"

    def __init__(self, detail=None, code=None, is_warning=False):
        if detail is None:
            detail = self.default_detail

        if code is None:
            if is_warning:
                code = "warning"
            else:
                code = self.default_code

        self.code = code
        self.is_warning = is_warning
        error_details = _get_error_details(detail, code, is_warning)

        # If the value is a list, tuple or dict, we don't want another list.
        if not isinstance(error_details, (list, tuple, dict)):
            self.detail = [error_details]
        else:
            self.detail = error_details
