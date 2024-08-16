from pprint import pformat

import pytest
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.utils import create_test_data
from tests.unit.info.utils import idfn
from vueda import info


DETAIL_CHOICES_PARAMETRIZE = [
    (
        "store",
        "customer",
        "user",
        (
            "test_admin@example.com",
            "test_customer_1@example.com",
            "test_customer_2@example.com",
        ),
    ),
    (
        "store",
        "cart",
        "customer",
        (
            "test_customer_1@example.com",
            "test_customer_2@example.com",
        ),
    ),
    (
        "store",
        "customerorder",
        "customer",
        (
            "test_customer_1@example.com",
            "test_customer_2@example.com",
        ),
    ),
    (
        "store",
        "customerorder",
        "order_state",
        (
            "New",
            "Packed",
            "Returned",
            "Shipped",
        ),
    ),
    (
        "store",
        "customerorder",
        "shipping_method",
        (
            "Free",
            "Regular",
            "Express",
        ),
    ),
    (
        "store",
        "product",
        "distributor",
        (
            "T-Shirt Corp.",
            "Tasty Treats Assoc.",
            "Vibrant Looks Inc.",
        ),
    ),
    (
        "store",
        "product",
        "special_care",
        (
            "Alcohol",
            "Dangerous",
            "Fragile",
            "Oversized",
            "Perishable",
            "Temperature Controlled",
        ),
    ),
    (
        "store",
        "product",
        "tangible_type",
        (
            "Digital",
            "Physical",
        ),
    ),
    (
        "store",
        "productoption",
        "product",
        (
            "Men's White T-Shirt",
            "Paint",
            "Shaped Cookies For Drapes",
            "Spray Paint",
            "Square Cookies For Squares",
            "Women's White T-Shirt",
        ),
    ),
    (
        "store",
        "productoption",
        "option_type",
        (
            "Size",
            "Colour",
            "Flavour",
        ),
    ),
    (
        "store",
        "orderitem",
        "customer_order",
        (
            "1001",
            "1002",
            "1003",
            "1004",
            "1005",
        ),
    ),
    (
        "store",
        "orderitem",
        "product_option",
        (
            "Explosive Dynamite",
            "Gentle Cinnamon",
            "Large",
            "Medium",
            "Pearl Whisper",
            "Red",
            "Royal Crimson",
            "Small",
            "Sweet Sugar",
            "White",
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "product_option",
        (
            "Explosive Dynamite",
            "Gentle Cinnamon",
            "Large",
            "Medium",
            "Pearl Whisper",
            "Red",
            "Royal Crimson",
            "Small",
            "Sweet Sugar",
            "White",
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "reason",
        (
            "Damaged Inventory",
            "Order Fulfillment",
            "Received Inventory",
            "Returned Inventory",
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "added_inventory_record",
        (
            "Damaged Inventory 2x Medium",
            "Order Fulfillment 1x Small",
            "Order Fulfillment 2x Large",
            "Order Fulfillment 2x Medium",
            "Order Fulfillment 2x Sweet Sugar",
            "Order Fulfillment 2x Sweet Sugar",
            "Order Fulfillment 2x White",
            "Order Fulfillment 3x Pearl Whisper",
            "Order Fulfillment 3x Red",
            "Order Fulfillment 3x Royal Crimson",
            "Order Fulfillment 3x White",
            "Order Fulfillment 4x Explosive Dynamite",
            "Order Fulfillment 4x Large",
            "Order Fulfillment 4x Pearl Whisper",
            "Order Fulfillment 4x Red",
            "Order Fulfillment 4x Sweet Sugar",
            "Order Fulfillment 5x Small",
            "Order Fulfillment 6x Explosive Dynamite",
            "Order Fulfillment 6x Gentle Cinnamon",
            "Order Fulfillment 6x Gentle Cinnamon",
            "Order Fulfillment 6x Medium",
            "Order Fulfillment 6x Medium",
            "Order Fulfillment 6x Royal Crimson",
            "Order Fulfillment 8x Explosive Dynamite",
            "Received Inventory 12x Explosive Dynamite",
            "Received Inventory 12x Explosive Dynamite",
            "Received Inventory 12x Medium",
            "Received Inventory 12x Medium",
            "Received Inventory 12x Royal Crimson",
            "Received Inventory 12x White",
            "Received Inventory 15x Red",
            "Received Inventory 6x Gentle Cinnamon",
            "Received Inventory 6x Gentle Cinnamon",
            "Received Inventory 6x Large",
            "Received Inventory 6x Small",
            "Received Inventory 6x Small",
            "Received Inventory 6x Sweet Sugar",
            "Received Inventory 6x Sweet Sugar",
            "Received Inventory 8x Pearl Whisper",
            "Returned Inventory 2x Medium",
            "Returned Inventory 3x Royal Crimson",
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "order_item",
        (
            "1001 - 3x Red",
            "1001 - 5x Small",
            "1001 - 6x Gentle Cinnamon",
            "1001 - 6x Medium",
            "1002 - 3x Pearl Whisper",
            "1002 - 4x Large",
            "1002 - 4x Royal Crimson",
            "1002 - 4x Sweet Sugar",
            "1002 - 6x Medium",
            "1002 - 8x Explosive Dynamite",
            "1003 - 2x Medium",
            "1003 - 2x White",
            "1003 - 4x Explosive Dynamite",
            "1003 - 4x Red",
            "1004 - 2x Large",
            "1004 - 3x Royal Crimson",
            "1004 - 4x Pearl Whisper",
            "1004 - 4x Sweet Sugar",
            "1004 - 6x Explosive Dynamite",
            "1004 - 6x Small",
            "1005 - 3x White",
            "1005 - 6x Gentle Cinnamon",
        ),
    ),
    (
        "store",
        "cartitem",
        "cart",
        ("test_customer_1@example.com",),
    ),
    (
        "store",
        "cartitem",
        "product_option",
        (
            "Explosive Dynamite",
            "Gentle Cinnamon",
            "Large",
            "Medium",
            "Pearl Whisper",
            "Red",
            "Royal Crimson",
            "Small",
            "Sweet Sugar",
            "White",
        ),
    ),
]


class TestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
            ("store", "CartItem", "list"),
            ("store", "CartItem", "read"),
            ("store", "Customer", "list"),
            ("store", "Customer", "read"),
            ("store", "CustomerOrder", "list"),
            ("store", "CustomerOrder", "read"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "InventoryRecord", "list"),
            ("store", "InventoryRecord", "read"),
            ("store", "InventoryRecordReason", "list"),
            ("store", "InventoryRecordReason", "read"),
            ("store", "OptionType", "list"),
            ("store", "OptionType", "read"),
            ("store", "OrderItem", "list"),
            ("store", "OrderItem", "read"),
            ("store", "OrderState", "list"),
            ("store", "OrderState", "read"),
            ("store", "Product", "list"),
            ("store", "Product", "read"),
            ("store", "ProductOption", "list"),
            ("store", "ProductOption", "read"),
            ("store", "SpecialCare", "list"),
            ("store", "SpecialCare", "read"),
            ("store", "TangibleType", "list"),
            ("store", "TangibleType", "read"),
            ("tests", "User", "list"),
            ("tests", "User", "read"),
        ],
        "Customer": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "read"),
            ("store", "CartItem", "list"),
            ("store", "CartItem", "read"),
            ("store", "Customer", "read"),
            ("store", "CustomerOrder", "read"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "OptionType", "list"),
            ("store", "OptionType", "read"),
            ("store", "OrderItem", "list"),
            ("store", "OrderItem", "read"),
            ("store", "OrderState", "list"),
            ("store", "OrderState", "read"),
            ("store", "Product", "list"),
            ("store", "Product", "read"),
            ("store", "ProductOption", "list"),
            ("store", "ProductOption", "read"),
            ("store", "SpecialCare", "list"),
            ("store", "SpecialCare", "read"),
            ("store", "TangibleType", "list"),
            ("store", "TangibleType", "read"),
            ("tests", "User", "read"),
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
        create_test_data(self)


@pytest.mark.django_db
class TestModelInfoChoices:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CartItemSerializer, store_viewsets.CartItemViewSet)
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)
        info.register(store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet)
        info.register(store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet)
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.InventoryRecordReasonSerializer, store_viewsets.InventoryRecordReasonViewSet)
        info.register(store_serializers.InventoryRecordSerializer, store_viewsets.InventoryRecordViewSet)
        info.register(store_serializers.OptionTypeSerializer, store_viewsets.OptionTypeViewSet)
        info.register(store_serializers.OrderItemSerializer, store_viewsets.OrderItemViewSet)
        info.register(store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
        DETAIL_CHOICES_PARAMETRIZE,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_list_customer(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        field_name,
        expected_choices,
    ):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        # The customer is not able to list customer orders or inventory records.
        match (app_label, model_name, field_name):
            case (
                ("store", "customer", "user")
                | ("store", "cart", "customer")
                | ("store", "customerorder", "customer")
                | ("store", "orderitem", "customer_order")
                | ("store", "inventoryrecord", "product_option")
                | ("store", "inventoryrecord", "reason")
                | ("store", "inventoryrecord", "added_inventory_record")
                | ("store", "inventoryrecord", "order_item")
                | ("store", "cartitem", "cart")
            ):
                assert response.status_code == 403, pformat(response.data)

            case _:
                assert response.status_code == 200, f"{(app_label, model_name, field_name)}\n\n{pformat(response.data)}"

                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(expected_choices)

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
        DETAIL_CHOICES_PARAMETRIZE,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_list_admin(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        field_name,
        expected_choices,
    ):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        assert response.status_code == 200, f"{(app_label, model_name, field_name)}\n\n{pformat(response.data)}"

        match (app_label, model_name, field_name):
            case ("store", "inventoryrecord", "added_inventory_record"):
                # Remove the date from the label.  The date has 2
                # dashes and the 3rd is the separator after the date.
                assert frozenset(
                    "-".join(result["label"].split("-")[3:]).strip() for result in response.data["results"]
                ) == frozenset(expected_choices)

            case _:
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(expected_choices)

    def test_info_choices_list_non_choice_field_on_model_with_choice_fields(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "product",
                    "name",
                ),
            ),
            format="json",
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == [
            "Invalid field 'name'. Valid fields with choices are distributor, tangible_type, special_care."
        ]

    def test_info_choices_list_non_choice_field_on_model_with_no_choice_fields(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "distributor",
                    "name",
                ),
            ),
            format="json",
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == [
            "Invalid field 'name'. No choice fields found on store.Distributor."
        ]

    def test_info_choices_list_invalid_field_on_model_with_choice_fields(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "product",
                    "named",
                ),
            ),
            format="json",
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == [
            "Invalid field 'named'. Valid fields with choices are distributor, tangible_type, special_care."
        ]

    def test_info_choices_list_invalid_field_on_model_with_no_choice_fields(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "distributor",
                    "named",
                ),
            ),
            format="json",
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == [
            "Invalid field 'named'. No choice fields found on store.Distributor."
        ]
