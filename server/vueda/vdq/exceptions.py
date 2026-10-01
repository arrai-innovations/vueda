"""Custom exceptions for the VUEDA Dispatch Queue."""

__all__ = (
    "AnymailTransientError",
    "QueueItemLockError",
)

from anymail.exceptions import AnymailAPIError


class AnymailTransientError(AnymailAPIError):
    pass


class QueueItemLockError(Exception):
    """Every attempt to lock a queue item and run an operation on it ended in lock contention."""
