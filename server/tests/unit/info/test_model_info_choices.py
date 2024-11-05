from pprint import pformat

import pytest
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.expected_results_model_info_choices import EXPECTED_RESULTS
from tests.unit.info.utils import create_test_data
from tests.unit.info.utils import idfn
from vueda import info


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
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
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
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
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
            "Invalid field 'name'. Valid fields with choices are special_care, tangible_type."
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
            "Invalid field 'named'. Valid fields with choices are special_care, tangible_type."
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
