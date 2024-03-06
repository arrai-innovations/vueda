import re

from django.db import models
from django.utils.encoding import force_str
from django.utils.functional import Promise
from rest_framework.utils import representation
from rest_framework.utils.representation import manager_repr


# Future: When this is fixed, we can remove this.
# https://github.com/encode/django-rest-framework/issues/9274
def smart_repr(value):
    if isinstance(value, models.Manager):
        return manager_repr(value)

    if isinstance(value, Promise):
        value = force_str(value, strings_only=True)

    value = repr(value)

    # Representations like u'help text'
    # should simply be presented as 'help text'
    if value.startswith("u'") and value.endswith("'"):
        return value[1:]

    # Representations like
    # <django.core.validators.RegexValidator object at 0x1047af050>
    # Should be presented as
    # <django.core.validators.RegexValidator object>
    return re.sub(" at 0x[0-9A-Fa-f]{4,32}>", ">", value)


representation.smart_repr = smart_repr
