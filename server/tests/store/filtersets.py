from django.core.validators import StepValueValidator
from django_filters import rest_framework

import tests.store.models as my_models
from tests import filters as test_filters
from vueda.core.filters import VuedaCompositePrimaryKeyFilterSet
from vueda.core.filters import VuedaFilterSet


def strtobool(value):
    match value:
        case "y" | "yes" | "t" | "true" | "on" | "1":
            return True
        case "n" | "no" | "f" | "false" | "off" | "0":
            return False
    raise ValueError


class ProductFilterSet(VuedaFilterSet):
    distributor = rest_framework.AllValuesMultipleFilter(field_name="distributor__name")
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr="exact")
    name_icontains = rest_framework.CharFilter(field_name="name", label="Name (contains)", lookup_expr="icontains")
    tangible_type = rest_framework.ModelChoiceFilter(
        field_name="tangible_type", label="Tangible Type", queryset=my_models.TangibleType.objects.all()
    )
    special_care = rest_framework.ModelMultipleChoiceFilter(
        field_name="special_care", label="Special Care", queryset=my_models.SpecialCare.objects.exclude(code="alcohol")
    )
    disabled = rest_framework.BooleanFilter(field_name="disabled", label="Disabled")
    condition = test_filters.ContainsChoiceFilter(
        field_name="condition",
        label="Condition",
        choices=(
            ("new", "New"),
            ("like_new", "Like New"),
            ("refurbished", "Refurbished"),
            ("used", "Used"),
        ),
        lookup_expr="icontains",
    )
    last_ordered = rest_framework.DateFilter()
    quantity = test_filters.CustomNumberInFilter(field_name="product_options__quantity_available")

    class Meta:
        model = my_models.Product
        fields = ["name", "disabled", "tangible_type"]


class CustomerOrderFilterSet(VuedaFilterSet):
    shipping_method = rest_framework.ChoiceFilter(choices=(("regular", "Regular"), ("express", "Express")))

    class Meta:
        model = my_models.CustomerOrder
        fields = []


class DistributorFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr="exact")
    name_icontains = rest_framework.CharFilter(field_name="name", label="Name (contains)", lookup_expr="icontains")

    class Meta:
        model = my_models.Distributor
        fields = ["name"]


class DistributorProxyFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr="exact")
    name_icontains = rest_framework.CharFilter(field_name="name", label="Name (contains)", lookup_expr="icontains")

    class Meta:
        model = my_models.DistributorProxy
        fields = ["name"]


class ProductOptionFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr="exact")
    name_icontains = rest_framework.CharFilter(field_name="name", label="Name (contains)", lookup_expr="icontains")
    sku = rest_framework.CharFilter(field_name="sku", label="SKU", lookup_expr="exact")
    sku_icontains = rest_framework.CharFilter(field_name="sku", label="SKU (contains)", lookup_expr="icontains")
    price = rest_framework.NumericRangeFilter(field_name="price", label="Price")
    disabled = rest_framework.TypedChoiceFilter(
        field_name="disabled", label="Disabled", choices=(("false", "False"), ("true", "True")), coerce=strtobool
    )
    quantity_available = rest_framework.NumberFilter()

    class Meta:
        model = my_models.ProductOption
        fields = ["name", "sku", "price", "disabled"]


class CartFilterSet(VuedaFilterSet):
    last_modified = rest_framework.DateTimeFromToRangeFilter(
        field_name="last_modified",
        label="Last modified",
    )
    reserved_delivery_time = rest_framework.DateTimeFilter()
    reserved_until = rest_framework.TimeFilter()
    expected_delivery_time = rest_framework.DurationFilter()

    product_name = rest_framework.AllValuesMultipleFilter(
        field_name="cart_items__product_option__product__name", label="Product name"
    )

    product_quantity = rest_framework.AllValuesMultipleFilter(
        field_name="cart_items__product_option__quantity_available", label="Product quantity"
    )

    class Meta:
        model = my_models.Cart
        fields = [
            "last_modified",
        ]


class CartItemCartBaseManagerChoiceFilterSet(VuedaFilterSet):
    """The `cart` filter's queryset is built from `Cart._base_manager` rather than `Cart.objects`
    (`FormattedNameManager`), so a query-count test against this filterset's choices isolates
    `ModelInfoFilterSetChoicesViewSet.get_queryset`'s own `annotate_formatted_name` call:
    `FormattedNameManager` never gets a chance to apply `formatted_name_select_related` first the
    way it would through `Cart.objects.all()`, so a flat query count can only be that resolver's own
    doing.
    """

    cart = rest_framework.ModelChoiceFilter(queryset=my_models.Cart._base_manager.all())

    class Meta:
        model = my_models.CartItem
        fields = ["cart"]


class CartRelatedFormattedNameFilterSet(VuedaFilterSet):
    """Filters against `customer__formatted_name`, which names no column of its own: Customer reaches
    its formatted name through `formatted_name_lookup_expression = "data__formatted_name"`, and the
    annotation `VuedaViewSet.get_queryset` adds belongs to the Cart queryset being filtered, not to the
    Customer rows it joins.

    `FormattedNamePathFilterSetMixin` points these at `customer__data__formatted_name` on the
    filterset's own copy of the filters. The declared names stay as written, which is what the query
    parameter and the `model_filtering` metadata are built from.

    `customer_formatted_name` deliberately declares no label, so the label it generates is built from
    the path as declared rather than the one the query ends up using.
    """

    customer_formatted_name = rest_framework.CharFilter(field_name="customer__formatted_name")
    customer_formatted_name_icontains = rest_framework.CharFilter(
        field_name="customer__formatted_name",
        lookup_expr="icontains",
        label="Customer name contains",
    )

    class Meta:
        model = my_models.Cart
        fields = ["last_modified"]


class InventoryRecordFilterSet(VuedaFilterSet):
    when = rest_framework.DateTimeFromToRangeFilter(field_name="when", label="When")
    is_added = rest_framework.BooleanFilter(field_name="is_added", label="Is added", lookup_expr="exact", required=True)
    quantity = rest_framework.NumericRangeFilter(
        field_name="quantity", label="Quantity", validators=[StepValueValidator(6)]
    )
    cost = rest_framework.NumericRangeFilter(field_name="cost", label="Cost")
    price = rest_framework.RangeFilter(field_name="price", label="Price")
    margin = rest_framework.NumericRangeFilter(field_name="margin", label="Margin")

    class Meta:
        model = my_models.InventoryRecord
        fields = ["reason"]


class OrderItemCompositePKFilterSet(VuedaCompositePrimaryKeyFilterSet):
    class Meta:
        model = my_models.OrderItemCompositePK
        fields = ["quantity"]
