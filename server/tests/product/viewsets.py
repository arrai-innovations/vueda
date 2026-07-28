from tests.product.filtersets import ProductFilterSet
from tests.product.models import Product
from tests.product.serializers import ProductSerializer
from vueda.core.viewsets import VuedaHistoryViewSet


class ProductViewSet(VuedaHistoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilterSet
