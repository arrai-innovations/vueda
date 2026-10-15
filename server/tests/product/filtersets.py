from django_filters import rest_framework

from tests.product import models
from vueda.core.filters import VuedaFilterSet


class LookupFormattedNameTransformFilterSet(VuedaFilterSet):
    """Filters against `formatted_name__lower` on ProductModelOrderingLookupFormattedName, which
    reaches its formatted name through `formatted_name_lookup_expression = "label"`.

    `VuedaViewSet.get_queryset` annotates `formatted_name`, so the path starts with an annotation and
    is left alone. Django applies `lower` to the annotation. The tests register `Lower` on `CharField`
    around each request, since Django has no `lower` transform of its own."""

    formatted_name_lower = rest_framework.CharFilter(field_name="formatted_name__lower")

    class Meta:
        model = models.ProductModelOrderingLookupFormattedName
        fields = []


class ProductFilterSet(VuedaFilterSet):
    buzz_words = rest_framework.Filter(field_name="buzz_words", lookup_expr="contains")

    class Meta:
        model = models.Product
        fields = ["id", "buzz_words"]
