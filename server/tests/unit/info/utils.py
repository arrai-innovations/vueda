import datetime
import zoneinfo
from decimal import Decimal
from unittest import mock

from django.conf import settings

from tests.store import models as store_models


def idfn(val):
    if isinstance(val, dict):
        return None
    return val


def create_test_data(self):
    self.distributors = distributors = {obj.name: obj for obj in store_models.Distributor.objects.all()}
    self.inventory_record_reasons = inventory_record_reasons = {
        (obj.code, obj.is_added_reason): obj for obj in store_models.InventoryRecordReason.objects.all()
    }
    self.option_types = option_types = {obj.code: obj for obj in store_models.OptionType.objects.all()}
    self.order_states = order_states = {obj.code: obj for obj in store_models.OrderState.objects.all()}
    self.special_care = special_care = {obj.code: obj for obj in store_models.SpecialCare.objects.all()}
    self.tangible_type = tangible_type = {obj.code: obj for obj in store_models.TangibleType.objects.all()}

    customers = {}
    for data in (
        {"user": "test_customer_1@domain.invalid"},
        {"user": "test_customer_2@domain.invalid"},
    ):
        data["user"] = self.users[data["user"]]
        customer = store_models.Customer.objects.create(**data)
        customers[customer.user.email] = customer
    self.customers = customers

    customer_orders = {}
    for data in (
        {
            "order_number": 1001,
            "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
            "customer": "test_customer_1@domain.invalid",
            "order_state": "shipped",
        },
        {
            "order_number": 1002,
            "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
            "customer": "test_customer_2@domain.invalid",
            "order_state": "shipped",
        },
        {
            "order_number": 1003,
            "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
            "customer": "test_customer_2@domain.invalid",
            "order_state": "shipped",
        },
        {
            "order_number": 1004,
            "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
            "customer": "test_customer_2@domain.invalid",
            "order_state": "packed",
        },
        {
            "order_number": 1005,
            "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
            "customer": "test_customer_1@domain.invalid",
            "order_state": "new",
        },
    ):
        data["customer"] = customers[data["customer"]]
        data["order_state"] = order_states[data["order_state"]]
        order = store_models.CustomerOrder.objects.create(**data)
        customer_orders[order.order_number] = order
    self.customer_orders = customer_orders

    products = {}
    order_items = {}
    inventory_records = {}

    for data in (
        {
            "distributor": "T-Shirt Corp.",
            "products": (
                {
                    "product": {
                        "name": "Men's White T-Shirt",
                        "order_between": [12, 24],
                        "tangible_type": tangible_type["physical"],
                    },
                    "options": (
                        {
                            "option": {
                                "option_type": "size",
                                "name": "Medium",
                                "sku": "1001",
                                "gtin": "3032076999853",
                                "price": Decimal("19.99"),
                                "quantity_available": 10,
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
                                    # This exists as a way to associate between inventory entries.
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
                                "quantity_available": 0,
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
                                    # This exists as a way to associate between inventory entries.
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
                    "product": {
                        "name": "Women's White T-Shirt",
                        "order_between": [12, 24],
                        "tangible_type": tangible_type["physical"],
                    },
                    "options": (
                        {
                            "option": {
                                "option_type": "size",
                                "name": "Small",
                                "sku": "1011",
                                "gtin": "4109009311819",
                                "price": Decimal("18.99"),
                                "quantity_available": 6,
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
                    "product": {
                        "name": "Square Cookies For Squares",
                        "order_between": [6, 12],
                        "tangible_type": tangible_type["physical"],
                        "special_care": [
                            special_care["perishable"],
                            special_care["temperature_controlled"],
                            special_care["fragile"],
                        ],
                    },
                    "options": (
                        {
                            "option": {
                                "option_type": "flavour",
                                "name": "Gentle Cinnamon",
                                "sku": "10010",
                                "gtin": "4189517411291",
                                "price": Decimal("14.99"),
                                "quantity_available": 0,
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
                                    # This exists as a way to associate between inventory entries.
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
                                "quantity_available": 4,
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
                                    # This exists as a way to associate between inventory entries.
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
                    "product": {
                        "name": "Shaped Cookies For Drapes",
                        "order_between": [6, 12],
                        "tangible_type": tangible_type["physical"],
                        "special_care": [
                            special_care["perishable"],
                            special_care["temperature_controlled"],
                            special_care["fragile"],
                        ],
                    },
                    "options": (
                        {
                            "option": {
                                "option_type": "size",
                                "name": "Explosive Dynamite",
                                "sku": "10020",
                                "gtin": "4481104569956",
                                "price": Decimal("15.99"),
                                "quantity_available": 6,
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
                    "product": {
                        "name": "Spray Paint",
                        "order_between": [1, 6],
                        "tangible_type": tangible_type["physical"],
                        "special_care": [special_care["dangerous"]],
                    },
                    "options": (
                        {
                            "option": {
                                "option_type": "colour",
                                "name": "Red",
                                "sku": "100021",
                                "gtin": "00313235428144",
                                "price": Decimal("39.99"),
                                "quantity_available": 8,
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
                                    "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                    "quantity": 15,
                                    "reason": ("received_inventory", True),
                                    "archived": False,
                                    "is_added": True,
                                    "cost": Decimal("25.00"),
                                },
                                {
                                    "when": datetime.datetime(2023, 12, 13, 13, 0, 0),
                                    "quantity": 3,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
                                    "is_added": False,
                                    "added_inventory_record": "inventory_record_1",
                                    "order_item": "order_item_1",
                                    "price": Decimal("39.99"),
                                    "margin": Decimal("14.99"),
                                },
                                {
                                    "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                    "quantity": 4,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
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
                                "quantity_available": 7,
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
                                    "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                    "quantity": 12,
                                    "reason": ("received_inventory", True),
                                    "archived": False,
                                    "is_added": True,
                                    "cost": Decimal("30.00"),
                                },
                                {
                                    "when": datetime.datetime(2024, 1, 7, 13, 0, 0),
                                    "quantity": 2,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
                                    "is_added": False,
                                    "added_inventory_record": "inventory_record_1",
                                    "order_item": "order_item_1",
                                    "price": Decimal("44.99"),
                                    "margin": Decimal("14.99"),
                                },
                                {
                                    "when": datetime.datetime(2024, 3, 13, 16, 0, 0),
                                    "quantity": 3,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
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
                    "product": {
                        "name": "Paint",
                        "order_between": [1, 8],
                        "tangible_type": tangible_type["physical"],
                        "special_care": [special_care["dangerous"]],
                    },
                    "options": (
                        {
                            "option": {
                                "option_type": "colour",
                                "name": "Pearl Whisper",
                                "sku": "100123",
                                "gtin": "00316462430690",
                                "price": Decimal("49.99"),
                                "quantity_available": 1,
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
                                    "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                    "quantity": 8,
                                    "reason": ("received_inventory", True),
                                    "archived": False,
                                    "is_added": True,
                                    "cost": Decimal("30.00"),
                                },
                                {
                                    "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                    "quantity": 3,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
                                    "is_added": False,
                                    "added_inventory_record": "inventory_record_1",
                                    "order_item": "order_item_1",
                                    "price": Decimal("49.99"),
                                    "margin": Decimal("19.99"),
                                },
                                {
                                    "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
                                    "quantity": 4,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
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
                                "quantity_available": 10,
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
                                    "when": datetime.datetime(2023, 12, 5, 12, 0, 0),
                                    "quantity": 12,
                                    "reason": ("received_inventory", True),
                                    "archived": True,
                                    "is_added": False,
                                    "order_item": "order_item_1",
                                    "cost": Decimal("35.00"),
                                },
                                {
                                    "when": datetime.datetime(2023, 12, 13, 14, 0, 0),
                                    "quantity": 6,
                                    "reason": ("order_fulfillment", False),
                                    "archived": False,
                                    "is_added": False,
                                    "added_inventory_record": "inventory_record_1",
                                    "price": Decimal("54.99"),
                                    "margin": Decimal("19.99"),
                                },
                                {
                                    "when": datetime.datetime(2024, 3, 13, 12, 0, 0),
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
                                    "when": datetime.datetime(2024, 3, 17, 10, 0, 0),
                                    "quantity": 3,
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
        {
            "distributor": "Awesome Music Co.",
            "products": (
                {
                    "product": {
                        "name": "K-Pop Release",
                        "order_between": [1, 1],
                        "tangible_type": tangible_type["digital"],
                    },
                    "options": (),
                },
                {
                    "product": {
                        "name": "J-Pop Release",
                        "order_between": [1, 1],
                        "tangible_type": tangible_type["digital"],
                    },
                    "options": (),
                },
            ),
        },
    ):
        distributor = distributors[data["distributor"]]
        for product_data in data["products"]:
            product_data["product"]["distributor"] = distributor

            special_care_objs = ()
            if "special_care" in product_data["product"]:
                special_care_objs = product_data["product"].pop("special_care")
            product = store_models.Product.objects.create(**product_data["product"])
            for special_care_obj in special_care_objs:
                product.special_care.add(special_care_obj)
            products[product.name] = {
                "product": product,
                "product_options": {},
            }
            for product_option_data in product_data["options"]:
                product_option_data["option"]["product"] = product
                product_option_data["option"]["option_type"] = option_types[
                    product_option_data["option"]["option_type"]
                ]
                product_option = store_models.ProductOption.objects.create(**product_option_data["option"])
                products[product.name]["product_options"][product_option.name] = product_option
                stored_order_items = {}
                for order_item_data in product_option_data["order_items"]:
                    order_item_data["customer_order"] = customer_orders[order_item_data["customer_order"]]
                    order_item_data["product_option"] = product_option
                    stored_order_item = None
                    if "identifier" in order_item_data:
                        stored_order_item = order_item_data["identifier"]
                        del order_item_data["identifier"]
                    order_item = store_models.OrderItem.objects.create(**order_item_data)
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
                        inventory_record_data["order_item"] = stored_order_items[inventory_record_data["order_item"]]
                    inventory_record_data["reason"] = inventory_record_reasons[inventory_record_data["reason"]]
                    inventory_record_data["product_option"] = product_option
                    stored_inventory_record = None
                    if "identifier" in inventory_record_data:
                        stored_inventory_record = inventory_record_data["identifier"]
                        del inventory_record_data["identifier"]
                    inventory_record = store_models.InventoryRecord.objects.create(**inventory_record_data)
                    inventory_records[inventory_record.pk] = inventory_record
                    if stored_inventory_record:
                        stored_inventory_records[stored_inventory_record] = inventory_record

    self.products = products
    self.order_items = order_items
    self.inventory_records = inventory_records

    # Make carts.
    carts = {}
    tzinfo = zoneinfo.ZoneInfo(settings.TIME_ZONE)
    for cart_data in (
        {
            "customer_email": "test_customer_1@domain.invalid",
            "cart_items": [
                {
                    "product_option": products["Men's White T-Shirt"]["product_options"]["Medium"],
                    "quantity": 1,
                },
                {
                    "product_option": products["Women's White T-Shirt"]["product_options"]["Small"],
                    "quantity": 2,
                },
            ],
            "last_modified": datetime.datetime(2024, 8, 10, 12, 0, 0, tzinfo=tzinfo),
        },
        {
            "customer_email": "test_customer_2@domain.invalid",
            "cart_items": [
                {
                    "product_option": products["Square Cookies For Squares"]["product_options"]["Gentle Cinnamon"],
                    "quantity": 6,
                },
                {
                    "product_option": products["Square Cookies For Squares"]["product_options"]["Sweet Sugar"],
                    "quantity": 12,
                },
                {
                    "product_option": products["Shaped Cookies For Drapes"]["product_options"]["Explosive Dynamite"],
                    "quantity": 24,
                },
            ],
            "last_modified": datetime.datetime(2024, 7, 20, 6, 0, 0, tzinfo=tzinfo),
        },
    ):
        with mock.patch("django.db.models.fields.timezone.now") as mocked_now:
            mocked_now.return_value = cart_data["last_modified"]

            cart = store_models.Cart.objects.create(
                customer=customers[cart_data["customer_email"]],
            )

        cart_items = []
        for cart_item in cart_data["cart_items"]:
            cart_item = store_models.CartItem.objects.create(
                cart=cart,
                product_option=cart_item["product_option"],
                quantity=cart_item["quantity"],
            )
            cart_items.append(cart_item)

        carts[cart_data["customer_email"]] = {
            "cart": cart,
            "cart_items": cart_items,
        }

    self.carts = carts

    # Make composite primary pk objects.
    # The Alt version must not have any objects.
    order = store_models.OrderCompositePK.objects.create(order_number="1234")
    product = store_models.ProductCompositePK.objects.create(name="Test Composite PK Product")
    store_models.OrderItemCompositePK.objects.create(order=order, product=product, quantity=1)
