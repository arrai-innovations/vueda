from http import HTTPStatus
from typing import ClassVar

import pytest
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
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
            {"label": "0", "value": "0"},
            {"label": "10", "value": "10"},
            {"label": "4", "value": "4"},
            {"label": "6", "value": "6"},
        ),
    ),
    (
        "store",
        "cart",
        "product_name",
        (
            {"label": "Men's White T-Shirt", "value": "Men's White T-Shirt"},
            {"label": "Shaped Cookies For Drapes", "value": "Shaped Cookies For Drapes"},
            {"label": "Square Cookies For Squares", "value": "Square Cookies For Squares"},
            {"label": "Women's White T-Shirt", "value": "Women's White T-Shirt"},
        ),
    ),
    (
        "store",
        "product",
        "disabled",
        (
            {"label": "Yes", "value": "true"},
            {"label": "No", "value": "false"},
        ),
    ),
    (
        "store",
        "product",
        "distributor",
        (
            {"label": "Awesome Music Co.", "value": "Awesome Music Co."},
            {"label": "Tasty Treats Assoc.", "value": "Tasty Treats Assoc."},
            {"label": "T-Shirt Corp.", "value": "T-Shirt Corp."},
            {"label": "Vibrant Looks Inc.", "value": "Vibrant Looks Inc."},
        ),
    ),
    (
        "store",
        "product",
        "special_care",
        (
            {"label": "Dangerous"},
            {"label": "Fragile"},
            {"label": "Perishable"},
            {"label": "Temperature Controlled"},
        ),
    ),
    (
        "store",
        "product",
        "tangible_type",
        (
            {
                "label": "Digital",
            },
            {
                "label": "Physical",
            },
        ),
    ),
    (
        "store",
        "productoption",
        "disabled",
        (
            {"label": "True", "value": "true"},
            {"label": "False", "value": "false"},
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "is_added",
        (
            {"label": "No", "value": "false"},
            {"label": "Yes", "value": "true"},
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "reason",
        (
            {"label": "Damaged Inventory"},
            {"label": "Order Fulfillment"},
            {"label": "Received Inventory"},
            {"label": "Returned Inventory"},
        ),
    ),
    (
        "store",
        "customerorder",
        "shipping_method",
        (
            {"label": "Regular", "value": "regular"},
            {"label": "Express", "value": "express"},
        ),
    ),
]


class VuedaTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
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

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_2@domain.invalid": {
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
        return VuedaTestData()

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
        info.register_serializer(store_serializers.OrderItemSerializer)
        info.register(store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

    @staticmethod
    def assert_choice_value_contract(response_data, expected_choices, context):
        """
        Filter-choice responses always include a serialized `value` field.
        The serializer contract is CharField, so runtime values are expected as strings.
        """
        response_values_by_label = {result["label"]: result["value"] for result in response_data["results"]}
        for expected_choice in expected_choices:
            label = expected_choice["label"]
            msg = f"{context} -> label={label!r}"
            assert label in response_values_by_label, msg

            response_value = response_values_by_label[label]
            assert isinstance(response_value, str), f"{msg} -> value should be str, got {type(response_value).__name__}"

            if "value" in expected_choice:
                assert response_value == expected_choice["value"], (
                    f"{msg} -> expected value={expected_choice['value']!r}, got {response_value!r}"
                )

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
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
    ):
        user = test_data.users["test_customer_1@domain.invalid"]
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
                assert response.status_code == HTTPStatus.FORBIDDEN, response.data

            case _:
                msg = (
                    f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_choices"
                )

                assert response.status_code == HTTPStatus.OK, response.data
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(
                    result["label"] for result in expected_choices
                ), msg
                self.assert_choice_value_contract(response.data, expected_choices, msg)

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
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
    ):
        user = test_data.users["test_admin@domain.invalid"]
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

        assert response.status_code == HTTPStatus.OK, response.data

        assert frozenset(result["label"] for result in response.data["results"]) == frozenset(
            result["label"] for result in expected_choices
        ), msg
        self.assert_choice_value_contract(response.data, expected_choices, msg)

    def test_all_values_filter_choices_drop_blank_string_values(self, test_data, api_client):
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        blank_distributor = store_models.Distributor.objects.create(name="", description="Blank distributor")
        store_models.Product.objects.create(
            distributor=blank_distributor,
            name="Blank Distributor Product",
            order_between=[1, 2],
            tangible_type=test_data.tangible_type["physical"],
        )

        response = api_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "distributor")),
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response.data
        assert "" not in {result["label"] for result in response.data["results"]}
        assert "" not in {result["value"] for result in response.data["results"]}

    def test_info_choices_filter_list_invalid_field(self, test_data, api_client):
        user = test_data.users["test_admin@domain.invalid"]
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

        assert response.status_code == HTTPStatus.NOT_FOUND, response.data
        assert response.data["detail"] == (
            "Invalid filter 'invalid_filterset_field'. Valid filters are condition, disabled, "
            "distributor, id, last_ordered, name, name_icontains, quantity, special_care, tangible_type."
        )


@pytest.mark.django_db
class TestModelInfoFilterSetChoicesQueryParamFiltering:
    """Tests that passing filterset query params to the choices endpoint narrows the returned choices."""

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

    def test_distributor_choices_filtered_by_name_icontains_cookies(self, test_data, api_client):
        """name_icontains=cookies matches only the two Tasty Treats products, so only that distributor appears."""
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "distributor")),
            data={"name_icontains": "cookies"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response.data
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"Tasty Treats Assoc."}), (
            f"Expected distributor choices filtered to cookie-product distributor only, got: {result_labels}"
        )

    def test_distributor_choices_filtered_by_quantity_of_ten(self, test_data, api_client):
        """quantity=3 matches only the one T-Shirt product, so only that distributor appears."""
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "distributor")),
            data={"quantity": "10"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response.data
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"T-Shirt Corp.", "Vibrant Looks Inc."}), (
            f"Expected distributor choices filtered to shirt-product distributor only, got: {result_labels}"
        )

    def test_special_care_choices_filtered_by_name_icontains_cookies(self, test_data, api_client):
        """name_icontains=cookies narrows special_care choices (queryset path) to only those used by cookie products.

        Cookie products use: fragile, perishable, temperature_controlled.
        Dangerous (paint products only) and Oversized (unused) should be absent.
        """
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "special_care")),
            data={"name_icontains": "cookies"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response.data
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"Fragile", "Perishable", "Temperature Controlled"}), (
            f"Expected special_care choices filtered to cookie-product values only, got: {result_labels}"
        )

    def test_tangible_type_choices_filtered_by_tangible_type_digital(self, test_data, api_client):
        """name_icontains=cookies narrows tangible_type choices (queryset path) to only those used by cookie products.

        All cookie products are Physical; Digital is not used by any product, so it should be absent.
        """
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "tangible_type")),
            data={"name_icontains": "cookies"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response.data
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"Physical"}), (
            f"Expected tangible_type choices filtered to cookie-product values only, got: {result_labels}"
        )

    def test_condition_choices_filtered_by_ne(self, test_data, api_client):
        """Passing condition=ne filters static choices to those whose value contains 'ne'.

        'ne' is a substring of 'new' and 'like_new' but not 'refurbished' or 'used'.
        The ChoiceFilter blank placeholder ('---------', empty value) is dropped from the
        choices metadata, and the empty 'None' choice is no longer prepended by default.
        """
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "condition")),
            data={"condition": "ne"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response.data
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"New", "Like New"}), (
            f"Expected only choices containing 'ne', got: {result_labels}"
        )
