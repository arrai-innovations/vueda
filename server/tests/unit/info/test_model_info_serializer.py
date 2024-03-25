import datetime
from collections import OrderedDict
from decimal import Decimal

import pytest
from django.conf import settings
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
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
from tests.store.serializers import CartItemSerializer
from tests.store.serializers import CartSerializer
from tests.store.serializers import CustomerOrderSerializer
from tests.store.serializers import CustomerSerializer
from tests.store.serializers import DistributorSerializer
from tests.store.serializers import InventoryRecordReasonSerializer
from tests.store.serializers import InventoryRecordSerializer
from tests.store.serializers import OptionTypeSerializer
from tests.store.serializers import OrderItemSerializer
from tests.store.serializers import ProductOptionSerializer
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import CartItemViewSet
from tests.store.viewsets import CartViewSet
from tests.store.viewsets import CustomerOrderViewSet
from tests.store.viewsets import CustomerViewSet
from tests.store.viewsets import DistributorViewSet
from tests.store.viewsets import InventoryRecordReasonViewSet
from tests.store.viewsets import InventoryRecordViewSet
from tests.store.viewsets import OptionTypeViewSet
from tests.store.viewsets import OrderItemViewSet
from tests.store.viewsets import ProductOptionViewSet
from tests.store.viewsets import ProductViewSet
from vueda import info


class TestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Admin": [
            ("contenttypes", "ContentType", "read"),
            ("contenttypes", "ContentType", "list"),
        ],
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("contenttypes", "ContentType", "list"),
        ],
    }

    users_to_create = {
        "test_admin@example.com": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer_1@example.com": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_2@example.com": {
            "name": "Test Customer 2",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }

    def __init__(self):
        # Option Types
        option_types = OptionType.objects.bulk_create(
            OptionType(**data)
            for data in (
                {
                    "name": "Size",
                    "code": "size",
                },
                {
                    "name": "Colour",
                    "code": "colour",
                },
                {
                    "name": "Flavour",
                    "code": "flavour",
                },
            )
        )
        self.option_types = option_types = {item.code: item for item in option_types}

        # Order States
        order_states = OrderState.objects.bulk_create(
            OrderState(**data)
            for data in (
                {
                    "name": "New",
                    "code": "new",
                },
                {
                    "name": "Packed",
                    "code": "packed",
                },
                {
                    "name": "Returned",
                    "code": "returned",
                },
                {
                    "name": "Shipped",
                    "code": "shipped",
                },
            )
        )
        self.order_states = order_states = {item.code: item for item in order_states}

        # Inventory Record Reasons
        inventory_record_reasons = InventoryRecordReason.objects.bulk_create(
            InventoryRecordReason(**data)
            for data in (
                {
                    "name": "Damaged Inventory",
                    "code": "damaged_inventory",
                    "is_added_reason": False,
                },
                {
                    "name": "Order Fulfillment",
                    "code": "order_fulfillment",
                    "is_added_reason": False,
                },
                {
                    "name": "Received Inventory",
                    "code": "received_inventory",
                    "is_added_reason": True,
                },
                {
                    "name": "Returned Inventory",
                    "code": "returned_inventory",
                    "is_added_reason": True,
                },
            )
        )
        self.inventory_record_reasons = inventory_record_reasons = {
            (item.code, item.is_added_reason): item for item in inventory_record_reasons
        }

        # Customers
        customers = {}
        for data in (
            {"user": "test_customer_1@example.com"},
            {"user": "test_customer_2@example.com"},
        ):
            data["user"] = self.users[data["user"]]
            customer = Customer.objects.create(**data)
            customers[customer.user.email] = customer
        self.customers = customers

        # Distributors
        distributors = {}
        for data in (
            {"name": "T-Shirt Corp."},
            {"name": "Tasty Treats Assoc."},
            {"name": "Vibrant Looks Inc."},
        ):
            distributor = Distributor.objects.create(**data)
            distributors[distributor.name] = distributor
        self.distributors = distributors

        # Orders
        customer_orders = {}
        for data in (
            {
                "order_number": 1001,
                "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                "customer": "test_customer_1@example.com",
                "order_state": "shipped",
            },
            {
                "order_number": 1002,
                "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                "customer": "test_customer_2@example.com",
                "order_state": "shipped",
            },
            {
                "order_number": 1003,
                "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                "customer": "test_customer_2@example.com",
                "order_state": "shipped",
            },
            {
                "order_number": 1004,
                "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                "customer": "test_customer_2@example.com",
                "order_state": "packed",
            },
            {
                "order_number": 1005,
                "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                "customer": "test_customer_1@example.com",
                "order_state": "new",
            },
        ):
            data["customer"] = customers[data["customer"]]
            data["order_state"] = order_states[data["order_state"]]
            order = CustomerOrder.objects.create(**data)
            customer_orders[order.order_number] = order
        self.customer_orders = customer_orders

        # Products, Product Options, Inventory Records, Orders, and Order Items.
        products = {}
        product_options = {}
        order_items = {}
        inventory_records = {}

        for data in (
            {
                "distributor": "T-Shirt Corp.",
                "products": (
                    {
                        "product": {"name": "Men's White T-Shirt"},
                        "options": (
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Medium",
                                    "sku": "1001",
                                    "gtin": "3032076999853",
                                    "price": Decimal("19.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 6,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1002,
                                        "quantity": 6,
                                    },
                                    {
                                        "identifier": "order_item_3",
                                        "customer_order": 1003,
                                        "quantity": 2,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory records.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("12.34"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.65"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.65"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 20, 10, 0, 0),
                                        "quantity": 2,
                                        "reason": ("returned_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "cost": Decimal("12.34"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 20, 10, 15, 0),
                                        "quantity": 2,
                                        "reason": ("damaged_inventory", False),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "price": Decimal("12.34"),
                                        "margin": Decimal("0.00"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 1, 1, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.36"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_3",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.63"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Large",
                                    "sku": "1002",
                                    "gtin": "3032076999854",
                                    "price": Decimal("19.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 2,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory records.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("12.44"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.55"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("7.55"),
                                    },
                                ),
                            },
                        ),
                    },
                    {
                        "product": {"name": "Women's White T-Shirt"},
                        "options": (
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Small",
                                    "sku": "1011",
                                    "gtin": "4109009311819",
                                    "price": Decimal("18.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 5,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 6,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.14"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 5,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("18.99"),
                                        "margin": Decimal("6.85"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 1, 1, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.19"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 1,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_2",
                                        "price": Decimal("19.99"),
                                        "margin": Decimal("6.80"),
                                    },
                                ),
                            },
                        ),
                    },
                ),
            },
            {
                "distributor": "Tasty Treats Assoc.",
                "products": (
                    {
                        "product": {"name": "Square Cookies For Squares"},
                        "options": (
                            {
                                "option": {
                                    "option_type": "flavour",
                                    "name": "Gentle Cinnamon",
                                    "sku": "10010",
                                    "gtin": "4189517411291",
                                    "price": Decimal("14.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 6,
                                    },
                                    {
                                        "identifier": "order_item_3",
                                        "customer_order": 1005,
                                        "quantity": 6,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory records.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_3",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Sweet Sugar",
                                    "sku": "10011",
                                    "gtin": "4189517411292",
                                    "price": Decimal("14.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 4,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        # This exists as a way to associate between inventory records.
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 6,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("7.56"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_2",
                                        "price": Decimal("14.99"),
                                        "margin": Decimal("7.43"),
                                    },
                                ),
                            },
                        ),
                    },
                    {
                        "product": {"name": "Shaped Cookies For Drapes"},
                        "options": (
                            {
                                "option": {
                                    "option_type": "size",
                                    "name": "Explosive Dynamite",
                                    "sku": "10020",
                                    "gtin": "4481104569956",
                                    "price": Decimal("15.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 8,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1003,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_3",
                                        "customer_order": 1004,
                                        "quantity": 6,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2023, 12, 12, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("7.01"),
                                    },
                                    {
                                        "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                        "quantity": 8,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("15.99"),
                                        "margin": Decimal("8.98"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("15.99"),
                                        "margin": Decimal("8.98"),
                                    },
                                    {
                                        "identifier": "inventory_record_2",
                                        "when": datetime.datetime(2024, 2, 1, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": False,
                                        "is_added": True,
                                        "cost": Decimal("12.19"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_2",
                                        "order_item": "order_item_3",
                                        "price": Decimal("15.99"),
                                        "margin": Decimal("8.98"),
                                    },
                                ),
                            },
                        ),
                    },
                ),
            },
            {
                "distributor": "Vibrant Looks Inc.",
                "products": (
                    {
                        "product": {"name": "Spray Paint"},
                        "options": (
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "Red",
                                    "sku": "100021",
                                    "gtin": "00313235428144",
                                    "price": Decimal("39.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1001,
                                        "quantity": 3,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1003,
                                        "quantity": 4,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2024, 1, 12, 12, 0, 0),
                                        "quantity": 15,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("25.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 1, 13, 13, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("39.99"),
                                        "margin": Decimal("14.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("39.99"),
                                        "margin": Decimal("14.99"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "White",
                                    "sku": "100022",
                                    "gtin": "00315654222969",
                                    "price": Decimal("44.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1003,
                                        "quantity": 2,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1005,
                                        "quantity": 3,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2024, 2, 23, 12, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("30.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 2, 24, 13, 0, 0),
                                        "quantity": 2,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("44.99"),
                                        "margin": Decimal("14.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("44.99"),
                                        "margin": Decimal(" 14.99"),
                                    },
                                ),
                            },
                        ),
                    },
                    {
                        "product": {"name": "Paint"},
                        "options": (
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "Pearl Whisper",
                                    "sku": "100123",
                                    "gtin": "00316462430690",
                                    "price": Decimal("49.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 3,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 4,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2024, 2, 1, 11, 0, 0),
                                        "quantity": 8,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "cost": Decimal("30.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("49.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 2, 5, 11, 0, 0),
                                        "quantity": 4,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("49.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                ),
                            },
                            {
                                "option": {
                                    "option_type": "colour",
                                    "name": "Royal Crimson",
                                    "sku": "100124",
                                    "gtin": "00368135511625",
                                    "price": Decimal("54.99"),
                                },
                                "order_items": (
                                    {
                                        "identifier": "order_item_1",
                                        "customer_order": 1002,
                                        "quantity": 4,
                                    },
                                    {
                                        "identifier": "order_item_2",
                                        "customer_order": 1004,
                                        "quantity": 3,
                                    },
                                ),
                                "inventory_records": (
                                    {
                                        "identifier": "inventory_record_1",
                                        "when": datetime.datetime(2024, 3, 5, 11, 0, 0),
                                        "quantity": 6,
                                        "reason": ("order_fulfillment", False),
                                        "archived": False,
                                        "is_added": False,
                                        "cost": Decimal("35.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 2, 29, 11, 0, 0),
                                        "quantity": 12,
                                        "reason": ("received_inventory", True),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_1",
                                        "price": Decimal("54.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 5, 11, 0, 0),
                                        "quantity": 3,
                                        "reason": ("order_fulfillment", False),
                                        "archived": True,
                                        "is_added": False,
                                        "added_inventory_record": "inventory_record_1",
                                        "order_item": "order_item_2",
                                        "price": Decimal("54.99"),
                                        "margin": Decimal("19.99"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 8, 10, 15, 0),
                                        "quantity": 1,
                                        "reason": ("damaged_inventory", False),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "cost": Decimal("35.00"),
                                        "margin": Decimal("0.00"),
                                    },
                                    {
                                        "when": datetime.datetime(2024, 3, 8, 10, 0, 0),
                                        "quantity": 2,
                                        "reason": ("returned_inventory", True),
                                        "archived": True,
                                        "is_added": True,
                                        "added_inventory_record": "inventory_record_1",
                                        "cost": Decimal("35.00"),
                                    },
                                ),
                            },
                        ),
                    },
                ),
            },
        ):
            distributor = distributors[data["distributor"]]
            for product_data in data["products"]:
                product_data["product"]["distributor"] = distributor
                product = Product.objects.create(**product_data["product"])
                products[product.name] = product
                for product_option_data in product_data["options"]:
                    product_option_data["option"]["product"] = product
                    product_option_data["option"]["option_type"] = option_types[
                        product_option_data["option"]["option_type"]
                    ]
                    product_option = ProductOption.objects.create(**product_option_data["option"])
                    product_options[product_option.name] = product_option
                    stored_order_items = {}
                    for order_item_data in product_option_data["order_items"]:
                        order_item_data["customer_order"] = customer_orders[order_item_data["customer_order"]]
                        order_item_data["product_option"] = product_option
                        stored_order_item = None
                        if "identifier" in order_item_data:
                            stored_order_item = order_item_data["identifier"]
                            del order_item_data["identifier"]
                        order_item = OrderItem.objects.create(**order_item_data)
                        order_items[order_item.quantity] = order_item
                        if stored_order_item:
                            stored_order_items[stored_order_item] = order_item
                    stored_inventory_records = {}
                    for inventory_record_data in product_option_data["inventory_records"]:
                        if "added_inventory_record" in inventory_record_data:
                            inventory_record_data["added_inventory_record"] = stored_inventory_records[
                                inventory_record_data["added_inventory_record"]
                            ]
                        if "order_item" in inventory_record_data:
                            inventory_record_data["order_item"] = stored_order_items[
                                inventory_record_data["order_item"]
                            ]
                        inventory_record_data["reason"] = inventory_record_reasons[inventory_record_data["reason"]]
                        inventory_record_data["product_option"] = product_option
                        stored_inventory_record = None
                        if "identifier" in inventory_record_data:
                            stored_inventory_record = inventory_record_data["identifier"]
                            del inventory_record_data["identifier"]
                        inventory_record = InventoryRecord.objects.create(**inventory_record_data)
                        inventory_records[inventory_record.pk] = inventory_record
                        if stored_inventory_record:
                            stored_inventory_records[stored_inventory_record] = inventory_record

        self.products = products
        self.product_options = product_options
        self.order_items = order_items
        self.inventory_records = inventory_records


@pytest.mark.django_db
class TestModelInfoSerializer:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(CustomerSerializer, CustomerViewSet)
        info.register(DistributorSerializer, DistributorViewSet)
        info.register(ProductSerializer, ProductViewSet)
        info.register(OptionTypeSerializer, OptionTypeViewSet)
        info.register(ProductOptionSerializer, ProductOptionViewSet)
        info.register(CartSerializer, CartViewSet)
        info.register(CartItemSerializer, CartItemViewSet)
        info.register(CustomerOrderSerializer, CustomerOrderViewSet)
        info.register(OrderItemSerializer, OrderItemViewSet)
        info.register(InventoryRecordReasonSerializer, InventoryRecordReasonViewSet)
        info.register(InventoryRecordSerializer, InventoryRecordViewSet)

    def check_model_permissions_data(self, response_data, expected_data):
        data = response_data.data["model_permissions"]
        assert {x["codename"] for x in data} == {x["codename"] for x in expected_data}
        for model_permission in data:
            assert "codename" in model_permission, "codename field is missing in model_permissions object"
            for expected_model_permission in expected_data:
                if model_permission["codename"] == expected_model_permission["codename"]:
                    assert set(model_permission.keys()) == set(expected_model_permission.keys())
                    for key in model_permission.keys():
                        assert model_permission[key] == expected_model_permission[key]

    def check_model_fields_data(self, response_data, expected_data):
        data = response_data.data["model_fields"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}
        for model_field in data:
            assert "name" in model_field, "name field is missing in model_fields object"
            for expected_model_field in expected_data:
                if model_field["name"] == expected_model_field["name"]:
                    assert set(model_field.keys()) == set(expected_model_field.keys())
                    for key in model_field.keys():
                        assert model_field[key] == expected_model_field[key]

    def check_model_expands_data(self, response_data, expected_data):
        data = response_data.data["model_expands"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}
        for model_expand in data:
            assert "name" in model_expand, "name field is missing in model_expands object"
            for expected_model_expand in expected_data:
                if model_expand["name"] == expected_model_expand["name"]:
                    assert set(model_expand.keys()) == set(expected_model_expand.keys())
                    for key in model_expand.keys():
                        assert model_expand[key] == expected_model_expand[key]

    def test_info_list(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(reverse("info.model_info-list"), format="json")
        assert response.status_code == 200, response.data
        assert response.data["totalRecords"] == 11

    def test_info_detail_distributor(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()
        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "distributor":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data
        assert response.data["model_expands"] == []
        assert response.data["model_filtering"] == ["name"]
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_distributor", "name": "Can create distributor"},
                {"codename": "delete_distributor", "name": "Can delete distributor"},
                {"codename": "list_distributor", "name": "Can list distributor"},
                {"codename": "read_distributor", "name": "Can read distributor"},
                {"codename": "update_distributor", "name": "Can update distributor"},
            ],
        )

        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "name",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
            ],
        )

        # model_ordering
        # model_actions

    def test_info_detail_optiontype(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "optiontype":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == []
        assert response.data["model_expands"] == []
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_optiontype", "name": "Can create option type"},
                {"codename": "delete_optiontype", "name": "Can delete option type"},
                {"codename": "list_optiontype", "name": "Can list option type"},
                {"codename": "read_optiontype", "name": "Can read option type"},
                {"codename": "update_optiontype", "name": "Can update option type"},
            ],
        )

        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "code",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "name",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
            ],
        )

    def test_info_detail_customer(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "customer":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == []
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_customer", "name": "Can create customer"},
                {"codename": "delete_customer", "name": "Can delete customer"},
                {"codename": "list_customer", "name": "Can list customer"},
                {"codename": "read_customer", "name": "Can read customer"},
                {"codename": "update_customer", "name": "Can update customer"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {"name": "user", "description": "Expand user", "fields": ["id", "email", "name"]},
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "user",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (143, "test_admin@example.com"),
                            (144, "test_customer_1@example.com"),
                            (145, "test_customer_2@example.com"),
                        ]
                    ),
                },
            ],
        )

    def test_info_detail_cart(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "cart":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )
        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == []
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_cart", "name": "Can create cart"},
                {"codename": "delete_cart", "name": "Can delete cart"},
                {"codename": "list_cart", "name": "Can list cart"},
                {"codename": "read_cart", "name": "Can read cart"},
                {"codename": "update_cart", "name": "Can update cart"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {"name": "customer", "description": "Expand customer", "fields": ["id", "user"]},
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "customer",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict([(10, "Customer object (10)"), (9, "Customer object (9)")]),
                },
            ],
        )

    def test_info_detail_customerorder(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "customerorder":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )
        assert response.status_code == 200, response.data

        assert response.data["model_filtering"] == []
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_customerorder", "name": "Can create customer order"},
                {"codename": "delete_customerorder", "name": "Can delete customer order"},
                {"codename": "list_customerorder", "name": "Can list customer order"},
                {"codename": "read_customerorder", "name": "Can read customer order"},
                {"codename": "update_customerorder", "name": "Can update customer order"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {"name": "customer", "description": "Expand customer", "fields": ["id", "user"]},
                {"name": "order_state", "description": "Expand order_state", "fields": ["id", "code", "name"]},
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "order_number",
                    "label": None,
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_digits": 7,
                },
                {
                    "name": "when",
                    "label": "Date / Time",
                    "type": "DateTimeField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "customer",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict([(12, "Customer object (12)"), (11, "Customer object (11)")]),
                },
                {
                    "name": "order_state",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (21, "name: New, code:new"),
                            (22, "name: Packed, code:packed"),
                            (23, "name: Returned, code:returned"),
                            (24, "name: Shipped, code:shipped"),
                        ]
                    ),
                },
            ],
        )

    def test_info_detail_inventoryrecordreason(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "inventoryrecordreason":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data

        assert response.data["model_filtering"] == []
        assert response.data["model_expands"] == []
        self.check_model_permissions_data(
            response,
            [
                {"codename": "add_inventoryrecordreason", "name": "Can add inventory record reason"},
                {"codename": "change_inventoryrecordreason", "name": "Can change inventory record reason"},
                {"codename": "delete_inventoryrecordreason", "name": "Can delete inventory record reason"},
                {"codename": "view_inventoryrecordreason", "name": "Can view inventory record reason"},
            ],
        )

        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "name",
                    "label": "Reason",
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "code",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "is_added_reason",
                    "label": None,
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                },
            ],
        )

    def test_info_detail_product(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "product":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == ["name", "disabled"]
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_product", "name": "Can create product"},
                {"codename": "delete_product", "name": "Can delete product"},
                {"codename": "list_product", "name": "Can list product"},
                {"codename": "read_product", "name": "Can read product"},
                {"codename": "update_product", "name": "Can update product"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {"name": "distributor", "description": "Expand distributor", "fields": ["id", "name"]},
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "distributor",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (22, "Distributor object (22)"),
                            (24, "Distributor object (24)"),
                            (23, "Distributor object (23)"),
                        ]
                    ),
                },
                {
                    "name": "name",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "disabled",
                    "label": None,
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                },
            ],
        )

    def test_info_detail_productoption(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "productoption":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == ["name", "sku", "price", "disabled"]
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_productoption", "name": "Can create product option"},
                {"codename": "delete_productoption", "name": "Can delete product option"},
                {"codename": "list_productoption", "name": "Can list product option"},
                {"codename": "read_productoption", "name": "Can read product option"},
                {"codename": "update_productoption", "name": "Can update product option"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {"name": "option_type", "description": "Expand option_type", "fields": ["id", "code", "name"]},
                {
                    "name": "product",
                    "description": "Expand product",
                    "fields": ["id", "distributor", "name", "disabled"],
                },
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "product",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (51, "Product object (51)"),
                            (52, "Product object (52)"),
                            (54, "Product object (54)"),
                            (50, "Product object (50)"),
                            (53, "Product object (53)"),
                            (49, "Product object (49)"),
                        ]
                    ),
                },
                {
                    "name": "option_type",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": OrderedDict(
                        [
                            (25, "name: Size, code:size"),
                            (26, "name: Colour, code:colour"),
                            (27, "name: Flavour, code:flavour"),
                        ]
                    ),
                },
                {
                    "name": "name",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "sku",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "gtin",
                    "label": None,
                    "type": "CharField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_length": 255,
                },
                {
                    "name": "price",
                    "label": None,
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 2,
                },
                {
                    "name": "disabled",
                    "label": None,
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                },
            ],
        )

    def test_info_detail_orderitem(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "orderitem":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data

        assert response.data["model_filtering"] == ["quantity"]
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_orderitem", "name": "Can create order item"},
                {"codename": "delete_orderitem", "name": "Can delete order item"},
                {"codename": "list_orderitem", "name": "Can list order item"},
                {"codename": "read_orderitem", "name": "Can read order item"},
                {"codename": "update_orderitem", "name": "Can update order item"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {
                    "name": "customer_order",
                    "description": "Expand customer_order",
                    "fields": ["id", "order_number", "when", "customer", "order_state"],
                },
                {
                    "name": "product_option",
                    "description": "Expand product_option",
                    "fields": ["id", "product", "option_type", "name", "sku", "gtin", "price", "disabled"],
                },
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "customer_order",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (50, "CustomerOrder object (50)"),
                            (48, "CustomerOrder object (48)"),
                            (49, "CustomerOrder object (49)"),
                            (47, "CustomerOrder object (47)"),
                            (46, "CustomerOrder object (46)"),
                        ]
                    ),
                },
                {
                    "name": "product_option",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (99, "ProductOption object (99)"),
                            (96, "ProductOption object (96)"),
                            (100, "ProductOption object (100)"),
                            (95, "ProductOption object (95)"),
                            (92, "ProductOption object (92)"),
                            (93, "ProductOption object (93)"),
                            (94, "ProductOption object (94)"),
                            (97, "ProductOption object (97)"),
                            (98, "ProductOption object (98)"),
                            (91, "ProductOption object (91)"),
                        ]
                    ),
                },
                {
                    "name": "quantity",
                    "label": None,
                    "type": "IntegerField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                },
            ],
        )

    def test_info_detail_inventoryrecord(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "inventoryrecord":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )

        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == ["when", "reason", "is_added", "quantity", "cost", "price", "margin"]
        self.check_model_permissions_data(
            response,
            [
                {"codename": "add_inventoryrecord", "name": "Can add inventory record"},
                {"codename": "change_inventoryrecord", "name": "Can change inventory record"},
                {"codename": "delete_inventoryrecord", "name": "Can delete inventory record"},
                {"codename": "view_inventoryrecord", "name": "Can view inventory record"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {
                    "name": "product_option",
                    "description": "Expand product_option",
                    "fields": ["id", "product", "option_type", "name", "sku", "gtin", "price", "disabled"],
                },
                {"name": "reason", "description": "Expand reason", "fields": ["id", "name", "code", "is_added_reason"]},
                {
                    "name": "added_inventory_record",
                    "description": "Expand added_inventory_record",
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
                {
                    "name": "order_item",
                    "description": "Expand order_item",
                    "fields": ["id", "order", "product_option", "quantity"],
                },
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "product_option",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (105, "ProductOption object (105)"),
                            (107, "ProductOption object (107)"),
                            (101, "ProductOption object (101)"),
                            (102, "ProductOption object (102)"),
                            (109, "ProductOption object (109)"),
                            (108, "ProductOption object (108)"),
                            (106, "ProductOption object (106)"),
                            (104, "ProductOption object (104)"),
                            (110, "ProductOption object (110)"),
                            (103, "ProductOption object (103)"),
                        ]
                    ),
                },
                {
                    "name": "when",
                    "label": "Date / Time",
                    "type": "DateTimeField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "quantity",
                    "label": None,
                    "type": "IntegerField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                },
                {
                    "name": "reason",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (41, "damaged_inventory"),
                            (42, "order_fulfillment"),
                            (43, "received_inventory"),
                            (44, "returned_inventory"),
                        ]
                    ),
                },
                {
                    "name": "archived",
                    "label": None,
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                },
                {
                    "name": "is_added",
                    "label": None,
                    "type": "BooleanField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                },
                {
                    "name": "cost",
                    "label": None,
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                },
                {
                    "name": "added_inventory_record",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": OrderedDict(
                        [
                            (421, "InventoryRecord object (421)"),
                            (422, "InventoryRecord object (422)"),
                            (423, "InventoryRecord object (423)"),
                            (424, "InventoryRecord object (424)"),
                            (425, "InventoryRecord object (425)"),
                            (426, "InventoryRecord object (426)"),
                            (427, "InventoryRecord object (427)"),
                            (428, "InventoryRecord object (428)"),
                            (429, "InventoryRecord object (429)"),
                            (430, "InventoryRecord object (430)"),
                            (431, "InventoryRecord object (431)"),
                            (432, "InventoryRecord object (432)"),
                            (433, "InventoryRecord object (433)"),
                            (434, "InventoryRecord object (434)"),
                            (435, "InventoryRecord object (435)"),
                            (436, "InventoryRecord object (436)"),
                            (437, "InventoryRecord object (437)"),
                            (438, "InventoryRecord object (438)"),
                            (439, "InventoryRecord object (439)"),
                            (440, "InventoryRecord object (440)"),
                            (441, "InventoryRecord object (441)"),
                            (442, "InventoryRecord object (442)"),
                            (443, "InventoryRecord object (443)"),
                            (444, "InventoryRecord object (444)"),
                            (445, "InventoryRecord object (445)"),
                            (446, "InventoryRecord object (446)"),
                            (447, "InventoryRecord object (447)"),
                            (448, "InventoryRecord object (448)"),
                            (449, "InventoryRecord object (449)"),
                            (450, "InventoryRecord object (450)"),
                            (451, "InventoryRecord object (451)"),
                            (452, "InventoryRecord object (452)"),
                            (453, "InventoryRecord object (453)"),
                            (454, "InventoryRecord object (454)"),
                            (455, "InventoryRecord object (455)"),
                            (456, "InventoryRecord object (456)"),
                            (457, "InventoryRecord object (457)"),
                            (458, "InventoryRecord object (458)"),
                            (459, "InventoryRecord object (459)"),
                            (460, "InventoryRecord object (460)"),
                            (461, "InventoryRecord object (461)"),
                            (462, "InventoryRecord object (462)"),
                        ]
                    ),
                },
                {
                    "name": "order_item",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "choices": OrderedDict(
                        [
                            (221, "OrderItem object (221)"),
                            (222, "OrderItem object (222)"),
                            (223, "OrderItem object (223)"),
                            (224, "OrderItem object (224)"),
                            (225, "OrderItem object (225)"),
                            (226, "OrderItem object (226)"),
                            (227, "OrderItem object (227)"),
                            (228, "OrderItem object (228)"),
                            (229, "OrderItem object (229)"),
                            (230, "OrderItem object (230)"),
                            (231, "OrderItem object (231)"),
                            (232, "OrderItem object (232)"),
                            (233, "OrderItem object (233)"),
                            (234, "OrderItem object (234)"),
                            (235, "OrderItem object (235)"),
                            (236, "OrderItem object (236)"),
                            (237, "OrderItem object (237)"),
                            (238, "OrderItem object (238)"),
                            (239, "OrderItem object (239)"),
                            (240, "OrderItem object (240)"),
                            (241, "OrderItem object (241)"),
                            (242, "OrderItem object (242)"),
                        ]
                    ),
                },
                {
                    "name": "price",
                    "label": None,
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 2,
                },
                {
                    "name": "margin",
                    "label": None,
                    "type": "DecimalField",
                    "many": False,
                    "read_only": False,
                    "required": False,
                    "max_digits": 12,
                    "decimal_places": 2,
                },
            ],
        )

    def test_info_detail_cartitem(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("info.model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "cartitem":
                app_label = item["app_label"]
                model = item["model"]

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_permissions",
                    "model_fields",
                    "model_actions",
                    "model_expands",
                    "model_ordering",
                    "model_filtering",
                ],
            },
        )
        assert response.status_code == 200, response.data
        assert response.data["model_filtering"] == []
        self.check_model_permissions_data(
            response,
            [
                {"codename": "create_cartitem", "name": "Can create cart item"},
                {"codename": "delete_cartitem", "name": "Can delete cart item"},
                {"codename": "list_cartitem", "name": "Can list cart item"},
                {"codename": "read_cartitem", "name": "Can read cart item"},
                {"codename": "update_cartitem", "name": "Can update cart item"},
            ],
        )
        self.check_model_expands_data(
            response,
            [
                {"name": "cart", "description": "Expand cart", "fields": ["id", "customer"]},
                {
                    "name": "product_option",
                    "description": "Expand product_option",
                    "fields": ["id", "product", "option_type", "name", "sku", "gtin", "price", "disabled"],
                },
            ],
        )
        self.check_model_fields_data(
            response,
            [
                {
                    "name": "id",
                    "label": "ID",
                    "type": "IntegerField",
                    "many": False,
                    "read_only": True,
                    "required": False,
                },
                {
                    "name": "cart",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                },
                {
                    "name": "product_option",
                    "label": None,
                    "type": "PrimaryKeyRelatedField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "choices": OrderedDict(
                        [
                            (116, "ProductOption object (116)"),
                            (117, "ProductOption object (117)"),
                            (119, "ProductOption object (119)"),
                            (113, "ProductOption object (113)"),
                            (120, "ProductOption object (120)"),
                            (115, "ProductOption object (115)"),
                            (114, "ProductOption object (114)"),
                            (112, "ProductOption object (112)"),
                            (118, "ProductOption object (118)"),
                            (111, "ProductOption object (111)"),
                        ]
                    ),
                },
                {
                    "name": "quantity",
                    "label": None,
                    "type": "IntegerField",
                    "many": False,
                    "read_only": False,
                    "required": True,
                    "max_value": 2147483647,
                    "min_value": -2147483648,
                },
            ],
        )
