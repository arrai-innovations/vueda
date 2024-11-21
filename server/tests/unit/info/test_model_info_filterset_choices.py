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


DETAIL_CHOICES_FILTERING_PARAMETRIZE = [
    (
        "store",
        "cart",
        "product_quantity",
        (
            {"label": "Nothing"},
            {"label": "0", "value": "0"},
            {"label": "10", "value": "10"},
            {"label": "4", "value": "4"},
            {"label": "6", "value": "6"},
        ),
        "test",
    ),
    (
        "store",
        "cart",
        "product_name",
        (
            {"label": "None"},
            {"label": "Men's White T-Shirt", "value": "Men's White T-Shirt"},
            {"label": "Shaped Cookies For Drapes", "value": "Shaped Cookies For Drapes"},
            {"label": "Square Cookies For Squares", "value": "Square Cookies For Squares"},
            {"label": "Women's White T-Shirt", "value": "Women's White T-Shirt"},
        ),
        "",
    ),
    (
        "store",
        "product",
        "disabled",
        (
            {"label": "None"},
            {"label": "Unknown", "value": ""},
            {"label": "Yes", "value": "true"},
            {"label": "No", "value": "false"},
        ),
        "",
    ),
    (
        "store",
        "product",
        "distributor",
        (
            {"label": "None"},
            {"label": "Tasty Treats Assoc.", "value": "Tasty Treats Assoc."},
            {"label": "T-Shirt Corp.", "value": "T-Shirt Corp."},
            {"label": "Vibrant Looks Inc.", "value": "Vibrant Looks Inc."},
        ),
        "",
    ),
    (
        "store",
        "product",
        "special_care",
        (
            {"label": "None"},
            {"label": "Dangerous", "value": None},
            {"label": "Fragile", "value": None},
            {"label": "Oversized", "value": None},
            {"label": "Perishable", "value": None},
            {"label": "Temperature Controlled", "value": None},
        ),
        "",
    ),
    (
        "store",
        "product",
        "tangible_type",
        (
            {"label": "None"},
            {"label": "Digital", "value": None},
            {"label": "Physical", "value": None},
        ),
        "",
    ),
    (
        "store",
        "productoption",
        "disabled",
        (
            {"label": "None"},
            {"label": "True", "value": None},
            {"label": "False", "value": None},
        ),
        "",
    ),
    (
        "store",
        "inventoryrecord",
        "is_added",
        (
            {"label": "None"},
            {"label": "Unknown", "value": None},
            {"label": "No", "value": None},
            {"label": "Yes", "value": None},
        ),
        "",
    ),
    (
        "store",
        "inventoryrecord",
        "reason",
        (
            {"label": "None"},
            {"label": "Damaged Inventory", "value": None},
            {"label": "Order Fulfillment", "value": None},
            {"label": "Received Inventory", "value": None},
            {"label": "Returned Inventory", "value": None},
        ),
        "",
    ),
    (
        "store",
        "customerorder",
        "shipping_method",
        (
            {"label": "None"},
            {"label": "---------", "value": None},
            {"label": "Regular", "value": None},
            {"label": "Express", "value": None},
        ),
        "",
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
class TestModelInfoFiltersetChoices:
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
        "app_label, model_name, field_name, expected_choices, expected_empty_value",
        DETAIL_CHOICES_FILTERING_PARAMETRIZE,  # pytest dumps the whole def, so move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_filter_customer(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        field_name,
        expected_choices,
        expected_empty_value,
    ):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_filterset_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        # The customer is not able to list inventory records.
        match (app_label, model_name, field_name):
            case ("store", "inventoryrecord", "is_added") | ("store", "inventoryrecord", "reason"):
                assert response.status_code == 403, pformat(response.data)

            case _:
                msg = (
                    f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_choices"
                )

                assert response.status_code == 200, f"\n\n{pformat(response.data)}"
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(
                    result["label"] for result in expected_choices
                ), msg
                if expected_empty_value is not None:
                    msg = f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_empty_value"
                    assert response.data["results"][0]["value"] == expected_empty_value, msg

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices, expected_empty_value",
        DETAIL_CHOICES_FILTERING_PARAMETRIZE,  # pytest dumps the whole def, so move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_filter_admin(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        field_name,
        expected_choices,
        expected_empty_value,
    ):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_filterset_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        msg = f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_choices"

        assert response.status_code == 200, f"\n\n{pformat(response.data)}"

        assert frozenset(result["label"] for result in response.data["results"]) == frozenset(
            result["label"] for result in expected_choices
        ), msg

    def test_info_choices_filter_list_invalid_field(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info_filterset_choices-list",
                args=(
                    "store",
                    "product",
                    "invalid_filterset_field",
                ),
            ),
            format="json",
        )

        assert response.status_code == 404, pformat(response.data)
        assert response.data["detail"] == (
            "Invalid filter 'invalid_filterset_field'. Valid filters are disabled, "
            "distributor, id, last_ordered, name, quantity, special_care, tangible_type."
        )
