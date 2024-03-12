from django_filters import rest_framework

from tests import models
from vueda.core.filters import VuedaFilterSet


class ProductFilterSet(VuedaFilterSet):
    buzz_words = rest_framework.Filter(field_name="buzz_words", lookup_expr="contains")

    class Meta:
        model = models.Product
        fields = ["id", "buzz_words"]
