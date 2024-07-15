from traceback import format_exception
from traceback import format_exception_only

import sentry_sdk
from django.conf import settings
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.views import exception_handler


def debug_stack_exception_handler(exc, context):
    """
    Custom exception handler which adds the exception class name to the response.
    """
    response = exception_handler(exc, context)
    if response is None:
        # the exception was not handled by the default exception handler
        response = Response(
            {},
            status=500,
        )

    if not settings.DEBUG and not getattr(settings, "IN_TESTS", False):
        # Capture the exception with Sentry
        sentry_sdk.capture_exception(exc)

    if isinstance(response.data, list):
        response.data = {settings.REST_FRAMEWORK["NON_FIELD_ERRORS_KEY"] or "non_field_errors": response.data}
    if settings.DEBUG or getattr(settings, "IN_TESTS", False):
        response.data["serverStack"] = "".join(format_exception(type(exc), exc, exc.__traceback__))
    else:
        response.data["serverStack"] = "".join(format_exception_only(type(exc), exc))
    return response


class BadRequestException(APIException):
    status_code = HTTP_400_BAD_REQUEST
    default_detail = "There was a problem with your request."
    default_code = "bad_request"
