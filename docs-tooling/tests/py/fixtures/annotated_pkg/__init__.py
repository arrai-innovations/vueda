"""Package with annotated functions used to test _doc_to_dict and _signature_details."""


def add(x: int, y: int = 0) -> int:
    """Add two integers.

    Args:
        x: First integer.
        y: Second integer (default 0).

    Returns:
        Sum of x and y.
    """
    return x + y


class _Task:
    """Stands in for a task object, which keeps the decorated function as ``__wrapped__``."""

    def __init__(self, func):
        self.__wrapped__ = func


def _send(recipient: str) -> None:
    """Send a message to one recipient."""


send = _Task(_send)

LIMIT: int = 3
"""A plain module variable."""
