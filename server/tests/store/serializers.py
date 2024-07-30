# Serializers to use with info.
from django.contrib.auth import get_user_model
from rest_framework import serializers

from tests.store.models import Cart
from tests.store.models import CartItem
from tests.store.models import Customer
from tests.store.models import CustomerOrder
from tests.store.models import Distributor
from tests.store.models import InventoryRecord
from tests.store.models import InventoryRecordReason
from tests.store.models import OptionType
from tests.store.models import OrderItem
from tests.store.models import OrderState
from tests.store.models import Product
from tests.store.models import ProductOption
from vueda.core.serializers import VuedaHistorySerializer
from vueda.core.serializers import VuedaSerializer
from vueda.user.serializers import UserSerializer


class CustomerSerializer(VuedaHistorySerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_system=False),
    )

    class Meta(VuedaHistorySerializer.Meta):
        model = Customer
        fields = [
            "id",
            "user",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "user": (
                UserSerializer,
                {
                    "fields": [
                        "id",
                        "email",
                        "name",
                    ],
                },
            ),
            "dict_data": serializers.SerializerMethodField,
            "single_value": serializers.SerializerMethodField,
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)
        expandable_fields_data = {
            "dict_data": {
                "many": False,
                "read_only": True,
                "fields": {
                    "name": {
                        "label": "Name",
                        "type": "CharField",
                        "many": False,
                        "read_only": True,
                        "required": False,
                        "choices": False,
                    },
                },
            },
            "single_value": {
                "many": False,
                "read_only": True,
                "type": "CharField",
            },
        }
        expandable_fields_data.update(VuedaHistorySerializer.Meta.expandable_fields_data)

    def get_dict_data(self, instance):
        return {"name": "Test"}

    def get_single_value(self, instance):
        return "Test"


class DistributorSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = Distributor
        fields = [
            "id",
            "name",
        ] + VuedaHistorySerializer.Meta.fields


class ProductSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = Product
        fields = [
            "id",
            "distributor",
            "name",
            "description",
            "disabled",
            "tangible",
            "order_between",
            "last_ten_order_betweens",
            "current_sale_date",
            "future_sale_dates",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "distributor": (
                DistributorSerializer,
                {},
            )
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)

    def validate(self, data):
        data = super().validate(data)

        distributor_id = data["product"].distributor_id
        option_type_id = data["option_type_id"]
        name = data["name"]

        queryset = Product.object.filter(
            product__distributor_id=distributor_id, option_type_id=option_type_id, name=name
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.pk)

        if queryset.exists():
            raise serializers.ValidationError("A product with this distributor, option_type, and name already exists.")

        return data


class OptionTypeSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = OptionType
        fields = [
            "id",
            "code",
            "name",
        ] + VuedaSerializer.Meta.fields


class ProductOptionSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = ProductOption
        fields = [
            "id",
            "product",
            "option_type",
            "name",
            "sku",
            "gtin",
            "price",
            "disabled",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "option_type": (
                OptionTypeSerializer,
                {
                    "fields": [
                        "id",
                        "code",
                        "name",
                    ],
                },
            ),
            "product": (
                ProductSerializer,
                {
                    "fields": [
                        "id",
                        "distributor",
                        "name",
                        "disabled",
                        "tangible",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)


class CartSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Cart
        fields = [
            "id",
            "customer",
            "last_modified",
            "cart_items",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer": (
                CustomerSerializer,
                {
                    "fields": [
                        "id",
                        "user",
                    ],
                },
            ),
            "cart_items": (
                "tests.store.serializers.CartItemSerializer",
                {
                    "fields": [
                        "id",
                        "product_option",
                        "quantity",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class CartItemSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = CartItem
        fields = [
            "id",
            "cart",
            "product_option",
            "quantity",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "cart": (
                CartSerializer,
                {
                    "fields": [
                        "id",
                        "customer",
                    ],
                },
            ),
            "product_option": (
                ProductOptionSerializer,
                {
                    "fields": [
                        "id",
                        "product",
                        "option_type",
                        "name",
                        "sku",
                        "gtin",
                        "price",
                        "disabled",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class OrderStateSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = OrderState
        fields = [
            "id",
            "code",
            "name",
        ] + VuedaSerializer.Meta.fields


class CustomerOrderSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = CustomerOrder
        fields = [
            "id",
            "order_number",
            "when",
            "customer",
            "order_state",
        ] + VuedaHistorySerializer.Meta.fields
        expandable_fields = {
            "customer": (
                CustomerSerializer,
                {
                    "fields": [
                        "id",
                        "user",
                    ],
                },
            ),
            "order_state": (
                OrderStateSerializer,
                {
                    "fields": [
                        "id",
                        "code",
                        "name",
                    ]
                },
            ),
        }
        expandable_fields.update(VuedaHistorySerializer.Meta.expandable_fields)


class OrderItemSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = OrderItem
        fields = [
            "id",
            "customer_order",
            "product_option",
            "quantity",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer_order": (
                CustomerOrderSerializer,
                {
                    "fields": [
                        "id",
                        "order_number",
                        "when",
                        "customer",
                        "order_state",
                    ],
                },
            ),
            "product_option": (
                ProductOptionSerializer,
                {
                    "fields": [
                        "id",
                        "product",
                        "option_type",
                        "name",
                        "sku",
                        "gtin",
                        "price",
                        "disabled",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class InventoryRecordReasonSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = InventoryRecordReason
        fields = [
            "id",
            "name",
            "code",
            "is_added_reason",
        ] + VuedaSerializer.Meta.fields


class InventoryRecordSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = InventoryRecord
        fields = [
            "id",
            "product_option",
            "when",
            "quantity",
            "reason",
            "archived",
            "is_added",
            "cost",
            "added_inventory_record",
            "order_item",
            "price",
            "margin",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "product_option": (
                ProductOptionSerializer,
                {
                    "fields": [
                        "id",
                        "product",
                        "option_type",
                        "name",
                        "sku",
                        "gtin",
                        "price",
                        "disabled",
                    ],
                },
            ),
            "reason": (
                InventoryRecordReasonSerializer,
                {
                    "fields": [
                        "id",
                        "name",
                        "code",
                        "is_added_reason",
                    ],
                },
            ),
            "added_inventory_record": (
                "tests.store.serializers.InventoryRecordSerializer",
                {
                    "fields": [
                        "id",
                        "product",
                        "when",
                        "quantity",
                        "reason",
                        "archived",
                        "is_added",
                        "cost",
                        "added_inventory_record",
                        "order_item",
                        "price",
                        "margin",
                    ],
                },
            ),
            "order_item": (
                OrderItemSerializer,
                {
                    "fields": [
                        "id",
                        "order",
                        "product_option",
                        "quantity",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
