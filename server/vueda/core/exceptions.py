import logging
from traceback import format_exception
from traceback import format_exception_only

import sentry_sdk
from django.conf import settings
from django.http import JsonResponse
from django.utils.encoding import force_str
from rest_framework.exceptions import APIException
from rest_framework.exceptions import ErrorDetail
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.utils.serializer_helpers import ReturnDict
from rest_framework.utils.serializer_helpers import ReturnList
from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)
django_requests_logger = logging.getLogger("django.request")


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

    django_requests_logger.exception("Exception in DRF view", extra={"request": context["request"]})

    if not settings.DEBUG and not getattr(settings, "IN_TESTS", False):
        # Capture the exception with Sentry
        sentry_sdk.capture_exception(exc)

    if isinstance(response.data, list):
        response_data = {}
        for data in response.data:
            if isinstance(data, VuedaValidationError):
                if isinstance(data.detail, (tuple, list)):
                    for item in data.detail:
                        if isinstance(item, str):
                            response_data[settings.REST_FRAMEWORK["NON_FIELD_ERRORS_KEY"] or "non_field_errors"] = item
                        elif isinstance(item, dict):
                            response_data.update(item)
                elif isinstance(data.detail, dict):
                    response_data.update(data.detail)
            else:
                if isinstance(data, str):
                    response_data[settings.REST_FRAMEWORK["NON_FIELD_ERRORS_KEY"] or "non_field_errors"] = data
                elif isinstance(data, dict):
                    response_data.update(data)
        response.data = response_data

    if settings.DEBUG or getattr(settings, "IN_TESTS", False):
        response.data["serverStack"] = "".join(format_exception(type(exc), exc, exc.__traceback__))
    else:
        response.data["serverStack"] = "".join(format_exception_only(type(exc), exc))
    return response


class BadRequestException(APIException):
    status_code = HTTP_400_BAD_REQUEST
    default_detail = "There was a problem with your request."
    default_code = "bad_request"


def page_not_found(request, exception, *args, **kwargs):
    return JsonResponse({"error": "Not Found (404)"}, status=HTTP_404_NOT_FOUND)


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
