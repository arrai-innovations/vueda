from django_filters import rest_framework

import tests.store.models as my_models
from vueda.core.filters import VuedaFilterSet


# product listings or search functionality
class ProductFilterSet(VuedaFilterSet):
    name_contains = rest_framework.CharFilter(field_name="name", lookup_expr="contains")
    disabled_exact = rest_framework.BooleanFilter(field_name="disabled", lookup_expr="exact")

    class Meta:
        model = my_models.Product
        fields = ["name", "disabled"]


# significant distributors, filter based on their name
class DistributorFilterSet(VuedaFilterSet):
    name_contains = rest_framework.CharFilter(field_name="name", lookup_expr="contains")

    class Meta:
        model = my_models.Distributor
        fields = ["name"]


class ProductOptionFilterSet(VuedaFilterSet):
    name_contains = rest_framework.CharFilter(field_name="name", lookup_expr="contains")
    sku_contains = rest_framework.Filter(field_name="sku", lookup_expr="contains")
    price = rest_framework.Filter(field_name="price", lookup_expr=["lte", "gte"])
    disabled_exact = rest_framework.BooleanFilter(field_name="disabled", lookup_expr="exact")

    class Meta:
        model = my_models.ProductOption
        fields = ["name", "sku", "price", "disabled"]


class OrderItemFilterSet(VuedaFilterSet):
    quantity = rest_framework.NumberFilter(field_name="quantity", lookup_expr=["lte", "gte", "exact"])

    class Meta:
        model = my_models.ProductOption
        fields = ["quantity"]


class InventoryRecordFilterSet(VuedaFilterSet):
    date_and_time_range = rest_framework.DateTimeFromToRangeFilter(field_name="date_and_time")
    reason_exact = rest_framework.CharFilter(field_name="reason", lookup_expr="exact")
    is_added_exact = rest_framework.BooleanFilter(field_name="is_added", lookup_expr="exact")
    quantity = rest_framework.NumberFilter(field_name="quantity", lookup_expr=["lte", "gte", "exact"])
    cost = rest_framework.NumberFilter(field_name="cost", lookup_expr=["lte", "gte", "exact"])
    price = rest_framework.NumberFilter(field_name="price", lookup_expr=["lte", "gte", "exact"])
    margin = rest_framework.NumberFilter(field_name="price", lookup_expr=["lte", "gte", "exact"])

    class Meta:
        model = my_models.InventoryRecord
        fields = ["date_and_time", "reason", "is_added", "quantity", "cost", "price", "margin"]
