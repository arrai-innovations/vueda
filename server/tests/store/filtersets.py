from django_filters import rest_framework

import tests.store.models as my_models
from vueda.core.filters import VuedaFilterSet


class ProductFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr=["exact", "contains"])
    tangible = rest_framework.ModelChoiceFilter(field_name="tangible", label="Tangible")

    class Meta:
        model = my_models.Product
        fields = ["name", "disabled", "tangible"]


class DistributorFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr=["exact", "contains"])

    class Meta:
        model = my_models.Distributor
        fields = ["name"]


class ProductOptionFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name", label="Name", lookup_expr=["exact", "contains"])
    sku = rest_framework.CharFilter(field_name="sku", label="SKU", lookup_expr=["exact", "contains"])
    price = rest_framework.NumericRangeFilter(field_name="price", label="Price", lookup_expr=[])

    class Meta:
        model = my_models.ProductOption
        fields = ["name", "sku", "price", "disabled"]


class CartFilterSet(VuedaFilterSet):
    last_modified = rest_framework.DateTimeFromToRangeFilter(
        field_name="last_modified", label="Last modified", lookup_expr=[]
    )

    class Meta:
        model = my_models.Cart
        fields = [
            "last_modified",
        ]


class OrderItemFilterSet(VuedaFilterSet):
    quantity = rest_framework.NumericRangeFilter(field_name="quantity", label="Quantity", lookup_expr=[])

    class Meta:
        model = my_models.OrderItem
        fields = [
            "quantity",
        ]


class InventoryRecordFilterSet(VuedaFilterSet):
    when = rest_framework.DateTimeFromToRangeFilter(field_name="when", label="When", lookup_expr=[])
    is_added_exact = rest_framework.BooleanFilter(
        field_name="is_added", label="isAdded", lookup_expr="exact", required=True
    )
    quantity = rest_framework.NumericRangeFilter(field_name="quantity", label="Quantity", lookup_expr=[])
    cost = rest_framework.NumericRangeFilter(field_name="cost", label="Cost", lookup_expr=[])
    price = rest_framework.NumericRangeFilter(field_name="price", label="Price", lookup_expr=[])
    margin = rest_framework.NumericRangeFilter(field_name="margin", label="Margin", lookup_expr=[])

    class Meta:
        model = my_models.InventoryRecord
        fields = ["when", "reason", "is_added", "quantity", "cost", "price", "margin"]
