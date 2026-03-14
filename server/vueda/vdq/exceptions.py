"""Custom exceptions for the VUEDA Delivery Queue."""

__all__ = ("AnymailTransientError",)

from anymail.exceptions import AnymailAPIError


class AnymailTransientError(AnymailAPIError):
    pass
