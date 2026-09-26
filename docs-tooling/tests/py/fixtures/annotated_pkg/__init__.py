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


class Settings:
    """Settings read from a file."""

    def __init__(self, path: str, prefer_env: bool = False):
        self._path = path

    def load(self) -> dict:
        """Read the file."""
        return {}

    def _parse(self) -> dict:
        """Parse the file."""
        return {}

    def _hook(self) -> None:
        """Run after loading. @public"""

    def reload(self) -> None:
        """Read the file again. @private"""


class Plain:
    """A class whose constructor takes no arguments."""

    def __init__(self):
        pass
