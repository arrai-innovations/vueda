import logging

from rest_framework.exceptions import ValidationError


def extract_error_strings(value):
    results = []
    if isinstance(value, str):
        results.append(value)

    elif isinstance(value, dict):
        for item in value.values():
            for result in extract_error_strings(item):
                if result:
                    results.append(result)

    elif isinstance(value, (list, tuple)):
        for item in value:
            for result in extract_error_strings(item):
                if result:
                    results.append(result)

    return results


def contains_only_warnings(exc):
    only_warnings = True

    if isinstance(exc, ValidationError):
        error_strings = extract_error_strings(exc.detail)

        for error_string in error_strings:
            if not (
                "code='warning'" in error_string or hasattr(error_string, "code") and error_string.code == "warning"
            ):
                only_warnings = False

    return only_warnings


class FilterOutVuedaValidationWarnings(logging.Filter):
    def filter(self, record):
        if record.exc_info:
            exc_info = tuple(record.exc_info)
            _exc_type, exc_value, _traceback = exc_info

            if contains_only_warnings(exc_value):
                return False

        return True
