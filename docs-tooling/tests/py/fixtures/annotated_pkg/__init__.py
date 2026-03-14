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
