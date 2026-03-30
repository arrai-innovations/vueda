from django.core.validators import StepValueValidator
from django_filters import rest_framework

import tests.store.models as my_models
from tests import filters as test_filters
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
    distributor.model = my_models.Product
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr="exact")
    name_icontains = rest_framework.CharFilter(field_name="name", label="Name (contains)", lookup_expr="icontains")
    tangible_type = rest_framework.ModelChoiceFilter(
        field_name="tangible_type", label="Tangible Type", queryset=my_models.TangibleType.objects.all()
    )
    special_care = rest_framework.ModelMultipleChoiceFilter(
        field_name="special_care", label="Special Care", queryset=my_models.SpecialCare.objects.exclude(code="alcohol")
    )
    disabled = rest_framework.BooleanFilter(field_name="disabled", label="Disabled")
    last_ordered = rest_framework.DateFilter()
    quantity = test_filters.CustomNumberInFilter()

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
    # This can't be done in the init, because they were not designed to do that, even though they need the model.
    product_name.model = my_models.Cart
    # These are our own additional fields.  With empty_label of None, we won't return the empty choice.
    product_name.empty_label = None

    product_quantity = rest_framework.AllValuesMultipleFilter(
        field_name="cart_items__product_option__quantity_available", label="Product quantity"
    )
    # This can't be done in the init, because they were not designed to do that, even though they need the model.
    product_quantity.model = my_models.Cart
    # These are our own additional fields, so we can modify the empty label and value that are returned.
    product_quantity.empty_label = "Nothing"
    product_quantity.empty_value = "test"

    class Meta:
        model = my_models.Cart
        fields = [
            "last_modified",
        ]


class OrderItemFilterSet(VuedaFilterSet):
    quantity = test_filters.CustomRangeFilter(field_name="quantity", label="Quantity")

    class Meta:
        model = my_models.OrderItem
        fields = [
            "quantity",
        ]


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
