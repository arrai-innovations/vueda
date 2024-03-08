from django.db.models.constants import LOOKUP_SEP
from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters

from vueda.core.fields.form import BaseArrayField


class BaseArrayFilter(filters.Filter):
    """
    Base class for array type filters, such as IN and RANGE.
    """

    base_field_class = BaseArrayField

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("help_text", _("Multiple values may be separated by commas."))
        super().__init__(*args, **kwargs)

        class ConcreteArrayField(self.base_field_class, self.field_class):  # type: ignore
            pass

        ConcreteArrayField.__name__ = self._field_class_name(self.field_class, self.lookup_expr)

        self.field_class = ConcreteArrayField

    @classmethod
    def _field_class_name(cls, field_class, lookup_expr):
        """
        Generate a suitable class name for the concrete field class. This is not
        completely reliable, as not all field class names are of the format
        <Type>Field.

        ex::

            BaseArrayFilter._field_class_name(DateTimeField, 'year__in')

            returns 'DateTimeYearInField'

        """
        # DateTimeField => DateTime
        type_name = field_class.__name__
        if type_name.endswith("Field"):
            type_name = type_name[:-5]

        # year__in => YearIn
        parts = lookup_expr.split(LOOKUP_SEP)
        expression_name = "".join(p.capitalize() for p in parts)

        # DateTimeYearInField
        return str(f"{type_name}{expression_name}Field")


class BaseArrayInFilter(BaseArrayFilter):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("lookup_expr", "in")
        super().__init__(*args, **kwargs)


class CharArrayInFilter(BaseArrayInFilter, filters.CharFilter):
    pass


class NumberArrayFilter(BaseArrayInFilter, filters.NumberFilter):
    pass
