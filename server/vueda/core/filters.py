from django import forms
from django.db.models.constants import LOOKUP_SEP
from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework
from rest_framework.filters import SearchFilter

from vueda.core.fields.form import BaseArrayField


class BaseArrayFilter(rest_framework.Filter):
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
        return f"{type_name}{expression_name}Field"


class BaseArrayInFilter(BaseArrayFilter):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("lookup_expr", "in")
        super().__init__(*args, **kwargs)


class NumberArrayFilter(BaseArrayInFilter, rest_framework.NumberFilter):
    pass


class IdInFilterSet(rest_framework.FilterSet):
    id = NumberArrayFilter(field_name="id", lookup_expr="in", widget=forms.HiddenInput)


class VuedaFilterSet(IdInFilterSet, rest_framework.FilterSet):
    pass


TRIGRAM_SIMILAR_PREFIX = "$"
TRIGRAM_WORD_SIMILAR_PREFIX = "~"


class VuedaSearchFilterBackend(SearchFilter):
    """
    Custom search filter that supports trigram and word similarity. Use the prefix `$`
    to indicate that the search term in `search_fields` should use trigram
    similarity comparison, and `~` for word similarity. The similarity threshold can be set on the ViewSet
    as `similarity_threshold`.
    """

    lookup_prefixes = {
        **SearchFilter.lookup_prefixes,
        TRIGRAM_SIMILAR_PREFIX: "trigram_similar",
        TRIGRAM_WORD_SIMILAR_PREFIX: "trigram_word_similar",
    }

    def construct_search(self, field_name, queryset):
        """
        Extend the search condition construction for similarity.
        """
        if field_name.startswith(TRIGRAM_SIMILAR_PREFIX):
            field_name = field_name[len(TRIGRAM_SIMILAR_PREFIX) :]
            return f"{field_name}__{self.lookup_prefixes[TRIGRAM_SIMILAR_PREFIX]}"
        elif field_name.startswith(TRIGRAM_WORD_SIMILAR_PREFIX):
            field_name = field_name[len(TRIGRAM_WORD_SIMILAR_PREFIX) :]
            return f"{field_name}__{self.lookup_prefixes[TRIGRAM_WORD_SIMILAR_PREFIX]}"
        else:
            return super().construct_search(field_name, queryset)
