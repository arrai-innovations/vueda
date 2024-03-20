import datetime
from decimal import Decimal

import pytest
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

    def test_info_list(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(reverse("model_info-list"), format="json")
        assert response.status_code == 200
        assert response.data["totalRecords"] == 11

    def test_info_detail_distributor(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()
        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "distributor":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_optiontype(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "optiontype":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_customer(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "customer":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_cart(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "cart":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_customerorder(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "customerorder":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_inventoryrecordreason(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "inventoryrecordreason":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_product(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "product":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_productoption(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "productoption":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_orderitem(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "orderitem":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_inventoryrecord(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "inventoryrecord":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk

    def test_info_detail_cartitem(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response_list = api_client.get(reverse("model_info-list"), format="json")
        for item in response_list.data["results"]:
            if item["model"] == "cartitem":
                pk = item["id"]
        response = api_client.get(reverse("model_info-detail", args=(pk,)), format="json")
        assert response.status_code == 200
        assert response.data["id"] == pk
