from django_filters.rest_framework import filters

from tests import models
from vueda.core.filters import CharArrayInFilter


class ProductFilterSet(filters.FilterSet):
    buzz_words = CharArrayInFilter(field_name="buzz_words", lookup_expr="in")

    class Meta:
        model = models.Product
        fields = ["buzz_words"]
