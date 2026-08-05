from tests.product.filtersets import ProductFilterSet
from tests.product.models import Product
from tests.product.serializers import ProductSerializer
from vueda.core.viewsets import VuedaHistoryViewSet


class ProductViewSet(VuedaHistoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilterSet


class ProductOrderingViewSet(ProductViewSet):
    """Adds a viewset `ordering` that differs from Product.Meta.ordering, to prove viewset ordering wins."""

    ordering = ["-name"]


class ProductOrderingFieldsViewSet(ProductOrderingViewSet):
    """Adds `ordering_fields` on top of viewset `ordering`, to test whether it changes the default order."""

    ordering_fields = ["name"]
