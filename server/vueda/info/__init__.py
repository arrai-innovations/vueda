"""Meta-API for exposing model metadata filtered by user permissions."""

__all__ = (
    "register",
    "register_serializer",
)

from vueda.info.registration import register
from vueda.info.registration import register_serializer
