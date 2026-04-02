from dateutil.relativedelta import relativedelta
from django.http import Http404
from django.utils.timezone import now
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

import tests.store.filtersets as my_filtersets
import tests.store.models as my_models
import tests.store.serializers as my_serializers
from tests.models import Product
from tests.permissions import IsAdminUser
from tests.permissions import IsCartOrOrderCreator
from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import VuedaHistoryViewSet
from vueda.core.viewsets import VuedaViewSet
from vueda.workflow.views import HasWorkflowViewMixin


class CustomerViewSet(VuedaHistoryViewSet):
    queryset = my_models.Customer.objects.all()
    serializer_class = my_serializers.CustomerSerializer
    ordering_fields = ["user__email"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        # Make 'current' and 'history-list' not allowed for admin or customer.
        return frozenset()


class DistributorViewSet(VuedaHistoryViewSet):
    queryset = my_models.Distributor.objects.all()
    serializer_class = my_serializers.DistributorSerializer
    filterset_class = my_filtersets.DistributorFilterSet
    ordering_fields = ["name"]
    ordering = ["name"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        # Make 'current' and 'history-list' not allowed for customer.
        if "Customer" in request.user.groups.values_list("name", flat=True):
            return frozenset()

        return super().get_allowed_extra_actions(request, instance=instance)


class DistributorTrigramSimilarViewSet(DistributorViewSet):
    search_fields = ["#name"]


class DistributorTrigramWordSimilarViewSet(DistributorViewSet):
    search_fields = ["~name"]


class DistributorRankedSearchViewSet(DistributorViewSet):
    search_fields = ["V:name", "V:description"]


class DistributorRankedDescriptionViewSet(DistributorViewSet):
    search_fields = ["V:description"]


class ProductViewSet(VuedaHistoryViewSet):
    queryset = my_models.Product.objects.all()
    serializer_class = my_serializers.ProductSerializer
    filterset_class = my_filtersets.ProductFilterSet
    ordering_fields = ["distributor__name", "name", "disabled"]


class OptionTypeViewSet(VuedaViewSet):
    queryset = my_models.OptionType.objects.all()
    serializer_class = my_serializers.OptionTypeSerializer


class ProductOptionViewSet(VuedaHistoryViewSet):
    queryset = my_models.ProductOption.objects.all()
    serializer_class = my_serializers.ProductOptionSerializer
    filterset_class = my_filtersets.ProductOptionFilterSet
    ordering_fields = ["name", "option_type", "sku", "gtin", "price"]


class CartViewSet(VuedaViewSet):
    queryset = my_models.Cart.objects.all()
    serializer_class = my_serializers.CartSerializer
    permission_classes = [ObjectPermissions & (IsCartOrOrderCreator | IsAdminUser)]
    filterset_class = my_filtersets.CartFilterSet
    permit_list_expands = ["cart_items", "customer"]
    permit_retrieve_expands = ["cart_items", "customer"]
    ordering_fields = ["customer__user__email", "last_modified"]

    @action(detail=False, methods=["post"], permission_classes=(), bulk=True)
    def dry_run_outer(self, request):
        return self.dry_run_inner(request)

    @action(detail=False, methods=["post"], permission_classes=(), bulk=True)
    def dry_run_inner(self, request):
        if request.data.get("fail"):
            raise VuedaValidationError({"detail": ["Action failed"]})

        Product.objects.create(name="Dry Run Product", available_for_sale=True, buzz_words=[])
        return Response({"created": True})

    @action(detail=True, methods=["post"], permission_classes=(IsCartOrOrderCreator,))
    def create_order(self, request, pk):
        queryset = self.get_queryset()
        cart = queryset.filter(pk=pk).first()
        if cart is None:
            raise Http404

        user = request.user
        if cart.customer.user != user:
            raise PermissionDenied

        customer_order = my_models.CustomerOrder.objects.create(
            customer=cart.customer,
            order_number=my_models.CustomerOrder.get_next_order_number(),
            order_state=my_models.OrderState.objects.get(code="new"),
        )
        for cart_item in cart.cart_items.all():
            my_models.OrderItem.objects.create(
                customer_order=customer_order,
                product_option=cart_item.product_option,
                quantity=cart_item.quantity,
            )
        return Response(customer_order.pk)

    @action(detail=False, methods=["get"], permission_classes=(IsAdminUser,))
    def abandoned_carts_count(self, request):
        if not request.user.has_perm("store.read_customer"):
            raise PermissionDenied

        queryset = self.get_queryset()
        abandoned_carts = queryset.filter(last_modified__gt=now() - relativedelta(days=7))
        return Response(abandoned_carts.count())


class CartItemViewSet(VuedaViewSet):
    queryset = my_models.CartItem.objects.all()
    serializer_class = my_serializers.CartItemSerializer
    ordering_fields = ["product_option__name", "quantity"]


class CustomerOrderViewSet(HasWorkflowViewMixin, VuedaHistoryViewSet):
    queryset = my_models.CustomerOrder.objects.all()
    serializer_class = my_serializers.CustomerOrderSerializer
    filterset_class = my_filtersets.CustomerOrderFilterSet
    ordering_fields = ["order_number", "customer__user__email", "when", "order_state"]


class InventoryRecordReasonViewSet(VuedaViewSet):
    queryset = my_models.InventoryRecordReason.objects.all()
    serializer_class = my_serializers.InventoryRecordReasonSerializer
    ordering_fields = ["name"]


class InventoryRecordViewSet(VuedaViewSet):
    queryset = my_models.InventoryRecord.objects.all()
    serializer_class = my_serializers.InventoryRecordSerializer
    filterset_class = my_filtersets.InventoryRecordFilterSet
    ordering_fields = ["when", "reason", "quantity"]


class ProductM2MSearchViewSet(ProductViewSet):
    search_fields = ["V:special_care__field_that_contains_the_name"]


class DistributorMixedRankedAndWordSimilarViewSet(DistributorViewSet):
    """Mixes V: (ranked) and ~ (trigram word similar) prefixes to expose a classification bug."""

    search_fields = ["V:name", "~description"]


class PackingBoxViewSet(VuedaViewSet):
    queryset = my_models.PackingBox.objects.all()
    serializer_class = my_serializers.PackingBoxSerializer
    ordering_fields = ["name"]


class InvoiceViewSet(VuedaViewSet):
    queryset = my_models.Invoice.objects.all()
    serializer_class = my_serializers.InvoiceSerializer
    ordering_fields = ["name"]


class InvoiceBaseViewSet(ModelViewSet):
    """Plain drf_writable_nested viewset — no vueda fixes applied."""

    queryset = my_models.Invoice.objects.all()
    serializer_class = my_serializers.InvoiceBaseSerializer
    permission_classes = [permissions.AllowAny]
