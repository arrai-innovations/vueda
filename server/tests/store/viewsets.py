import tests.store.filtersets as my_filtersets
import tests.store.models as my_models
import tests.store.serializers as my_serializers
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import VuedaViewSet


class CustomerViewSet(VuedaViewSet):
    queryset = my_models.Customer.objects.all()
    serializer_class = my_serializers.CustomerSerializer
    permission_classes = [ObjectPermissions]


class DistributorViewSet(VuedaViewSet):
    queryset = my_models.Distributor.objects.all()
    serializer_class = my_serializers.DistributorSerializer
    permission_classes = [ObjectPermissions]
    filterset_class = my_filtersets.DistributorFilterSet


class ProductViewSet(VuedaViewSet):
    queryset = my_models.Product.objects.all()
    serializer_class = my_serializers.ProductSerializer
    permission_classes = [ObjectPermissions]
    filterset_class = my_filtersets.ProductFilterSet


class OptionTypeViewSet(VuedaViewSet):
    queryset = my_models.OptionType.objects.all()
    serializer_class = my_serializers.OptionTypeSerializer
    permission_classes = [ObjectPermissions]


class ProductOptionViewSet(VuedaViewSet):
    queryset = my_models.ProductOption.objects.all()
    serializer_class = my_serializers.ProductOptionSerializer
    permission_classes = [ObjectPermissions]
    filterset_class = my_filtersets.ProductOptionFilterSet


class CartViewSet(VuedaViewSet):
    queryset = my_models.Cart.objects.all()
    serializer_class = my_serializers.CartSerializer
    permission_classes = [ObjectPermissions]


class CartItemViewSet(VuedaViewSet):
    queryset = my_models.CartItem.objects.all()
    serializer_class = my_serializers.CartItemSerializer
    permission_classes = [ObjectPermissions]


class OrderViewSet(VuedaViewSet):
    queryset = my_models.Order.objects.all()
    serializer_class = my_serializers.OrderSerializer
    permission_classes = [ObjectPermissions]


class OrderItemViewSet(VuedaViewSet):
    queryset = my_models.OrderItem.objects.all()
    serializer_class = my_serializers.OrderItemSerializer
    permission_classes = [ObjectPermissions]
    filterset_class = my_filtersets.OrderItemFilterSet


class InventoryRecordReasonViewSet(VuedaViewSet):
    queryset = my_models.InventoryRecordReason.objects.all()
    serializer_class = my_serializers.InventoryRecordReasonSerializer
    permission_classes = [ObjectPermissions]


class InventoryRecordViewSet(VuedaViewSet):
    queryset = my_models.InventoryRecord.objects.all()
    serializer_class = my_serializers.InventoryRecordSerializer
    permission_classes = [ObjectPermissions]
    filterset_class = my_filtersets.InventoryRecordFilterSet
