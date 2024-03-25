# Serializers to use with info.

from rest_framework import serializers

from vueda.core.serializers import VuedaSerializerMixin
from vueda.user.serializers import UserSerializer

from .models import Cart
from .models import CartItem
from .models import Customer
from .models import CustomerOrder
from .models import Distributor
from .models import InventoryRecord
from .models import InventoryRecordReason
from .models import OptionType
from .models import OrderItem
from .models import OrderState
from .models import Product
from .models import ProductOption


class CustomerSerializer(VuedaSerializerMixin):
    class Meta:
        model = Customer
        fields = [
            "id",
            "user",
        ]
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
            )
        }


class DistributorSerializer(VuedaSerializerMixin):
    class Meta:
        model = Distributor
        fields = [
            "id",
            "name",
        ]


class ProductSerializer(VuedaSerializerMixin):
    class Meta:
        model = Product
        fields = [
            "id",
            "distributor",
            "name",
            "disabled",
        ]
        expandable_fields = {
            "distributor": (
                DistributorSerializer,
                {
                    "fields": [
                        "id",
                        "name",
                    ],
                },
            )
        }

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


class OptionTypeSerializer(VuedaSerializerMixin):
    class Meta:
        model = OptionType
        fields = [
            "id",
            "code",
            "name",
        ]


class ProductOptionSerializer(VuedaSerializerMixin):
    class Meta:
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
        ]
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
                    ],
                },
            ),
        }


class CartSerializer(VuedaSerializerMixin):
    class Meta:
        model = Cart
        fields = [
            "id",
            "customer",
            "last_modified",
            "cart_items",
        ]
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
                        "user",
                        "product_options",
                        "quantity",
                    ],
                },
            ),
        }


class CartItemSerializer(VuedaSerializerMixin):
    class Meta:
        model = CartItem
        fields = [
            "id",
            "cart",
            "product_option",
            "quantity",
        ]
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


class OrderStateSerializer(VuedaSerializerMixin):
    class Meta:
        model = OrderState
        fields = [
            "id",
            "code",
            "name",
        ]


class CustomerOrderSerializer(VuedaSerializerMixin):
    class Meta:
        model = CustomerOrder
        fields = [
            "id",
            "order_number",
            "when",
            "customer",
            "order_state",
        ]
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


class OrderItemSerializer(VuedaSerializerMixin):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "customer_order",
            "product_option",
            "quantity",
        ]
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


class InventoryRecordReasonSerializer(VuedaSerializerMixin):
    class Meta:
        model = InventoryRecordReason
        fields = [
            "id",
            "name",
            "code",
            "is_added_reason",
        ]


class InventoryRecordSerializer(VuedaSerializerMixin):
    class Meta:
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
        ]
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
                "store.serializers.InventoryRecordSerializer",
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
