import logging

from django.utils.itercompat import is_iterable
from rest_framework.exceptions import ValidationError


def contains_only_warnings(exc):
    only_warnings = True

    if isinstance(exc, ValidationError):
        for value in exc.detail.values():
            if is_iterable(value):
                for item in value:
                    # We can't look up the code on the validation error, because rest
                    # framework has recreated the outer validation error, and the inner
                    # validation error has been converted to a string because of this.
                    if "code='warning'" not in item:
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
