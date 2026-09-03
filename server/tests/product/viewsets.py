from django.db.models import F

from tests.product.filtersets import ProductFilterSet
from tests.product.models import Product
from tests.product.serializers import ProductPropertyFieldSerializer
from tests.product.serializers import ProductRenamedFieldSerializer
from tests.product.serializers import ProductSerializer
from tests.product.serializers import ProductSourceFieldSerializer
from vueda.history.viewsets import VuedaHistoryViewSet


class ProductViewSet(VuedaHistoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilterSet


class ProductOrderingViewSet(ProductViewSet):
    """Adds a viewset `ordering` that differs from Product.Meta.ordering, to prove viewset ordering wins."""

    ordering = ["-name"]


class ProductOrderingStringViewSet(ProductViewSet):
    """Sets the viewset's `ordering` as a bare string instead of a list/tuple, which DRF's own
    OrderingFilter also allows, to prove the model-info metadata handles it without iterating the
    string character by character."""

    ordering = "-name"


class ProductOrderingFieldsViewSet(ProductOrderingViewSet):
    """Adds `ordering_fields` on top of viewset `ordering`, to test whether it changes the default order."""

    ordering_fields = ["name"]


class ProductOrderingMultiFieldDefaultViewSet(ProductViewSet):
    """`ordering` declares two default fields and `ordering_fields` is empty, so neither field is
    otherwise whitelisted. Proves VuedaOrderingFilter treats every field named in a multi-field
    default as a valid explicit `?o=` target on its own, not just the first."""

    ordering = ["-name", "available_for_sale"]
    ordering_fields = []


class ProductOrderingSingleDefaultPlusFieldViewSet(ProductViewSet):
    """`ordering` declares one default field, distinct from the one field `ordering_fields`
    whitelists, to test the merge between a single default field and an explicitly-declared
    ordering field."""

    ordering = ["-name"]
    ordering_fields = ["available_for_sale"]


class ProductOrderingAllFieldsViewSet(ProductOrderingViewSet):
    """Sets `ordering_fields = "__all__"` and swaps in a serializer where Product.name is exposed as
    `title`, to prove `__all__` resolves against the model's own field names, not the serializer's."""

    serializer_class = ProductRenamedFieldSerializer
    ordering_fields = "__all__"

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(title=F("name"))
        return queryset


class ProductOrderingDefaultFieldsViewSet(ProductOrderingViewSet):
    """Declares neither `ordering_fields` nor `ordering_fields = "__all__"`, and swaps in a serializer
    where Product.title is exposed as `name` through a queryset annotate, to prove DRF's default
    (any readable serializer field) resolves."""

    serializer_class = ProductRenamedFieldSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(title=F("name"))
        return queryset


class ProductOrderingSourceFieldViewSet(ProductOrderingViewSet):
    """Declares neither `ordering_fields` nor `ordering_fields = "__all__"`, and swaps in a serializer
    where Product.name is exposed as `title` via an explicit `source="name"`, with no matching queryset
    annotation, to prove DRF's default resolution keys valid ordering fields by source, not by the
    serializer's exposed field name."""

    serializer_class = ProductSourceFieldSerializer


class ProductOrderingPropertyFieldViewSet(ProductOrderingViewSet):
    """Declares neither `ordering_fields` nor `ordering_fields = "__all__"`, and swaps in a serializer
    where a model property (Product.computed_title) is exposed as `title`, to prove DRF's default
    resolution excludes serializer fields sourced from model properties."""

    serializer_class = ProductPropertyFieldSerializer
