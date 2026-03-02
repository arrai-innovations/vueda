"""PostgreSQL array expression for use in Django ORM annotations."""

__all__ = ("Array",)

from django.db.models import Func


class Array(Func):
    template = "%(function)s[%(expressions)s]"
    function = "ARRAY"
