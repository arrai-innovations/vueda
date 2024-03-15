# Serializers to use with info.

from rest_framework import serializers

from vueda.user.serializers import UserSerializer

from .models import Cart
from .models import CartItem
from .models import Customer
from .models import Distributor
from .models import InventoryRecord
from .models import InventoryRecordReason
from .models import OptionType
from .models import Order
from .models import OrderItem
from .models import Product
from .models import ProductOption


class CustomerSerializer(serializers.ModelSerializer):
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


class DistributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Distributor
        fields = [
            "id",
            "name",
        ]


class ProductSerializer(serializers.ModelSerializer):
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


class OptionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionType
        fields = [
            "id",
            "code",
            "name",
        ]


class ProductOptionSerializer(serializers.ModelSerializer):
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


class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = [
            "id",
            "customer",
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
            )
        }


class CartItemSerializer(serializers.ModelSerializer):
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


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
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
            )
        }


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order",
            "product_option",
            "quantity",
        ]
        expandable_fields = {
            "order": (
                OrderSerializer,
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


class InventoryRecordReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryRecordReason
        fields = [
            "id",
            "name",
            "code",
            "is_added_reason",
        ]


class InventoryRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryRecord
        fields = [
            "id",
            "product",
            "date_and_time",
            "quantity",
            "reason",
            "is_added",
            "cost",
            "added_inventory_record",
            "order_item",
            "price",
            "margin",
        ]
        expandable_fields = {
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
                        "date_and_time",
                        "quantity",
                        "reason",
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
