from django.db.models import Func


class Array(Func):
    template = "%(function)s[%(expressions)s]"
    function = "ARRAY"
