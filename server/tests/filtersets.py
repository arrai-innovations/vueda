from django_filters import rest_framework

from tests import models
from vueda.core.filters import CharArrayInFilter


class ProductFilterSet(rest_framework.FilterSet):
    buzz_words = CharArrayInFilter(field_name="buzz_words", lookup_expr="in")

    class Meta:
        model = models.Product
        fields = ["buzz_words"]
