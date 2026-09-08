from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.utils import create_test_data
from tests.unit.info.utils import idfn
from vueda import info
from vueda.info import viewsets as info_viewsets


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

    def test_filter_choices_reads_permission_names_mapping_at_call_time(self, api_client):
        # ModelInfoFilterSetChoicesViewSet.get_queryset previously closed over
        # PERMISSION_NAMES_MAPPING at import (vueda/info/viewsets.py), so overriding "read"/"list"
        # left choices_permissions pinned to "read_product"/"list_tangibletype" regardless of what
        # the override requested. Both permissions are settings-driven here (unlike the plain
        # choices viewset, where the related model's "list" permission is hardcoded).
        product_content_type = ContentType.objects.get_for_model(store_models.Product)
        tangible_type_content_type = ContentType.objects.get_for_model(store_models.TangibleType)
        stale_read_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type, codename="read_product", defaults={"name": "Can read product"}
        )
        stale_list_permission = Permission.objects.get(
            content_type=tangible_type_content_type, codename="list_tangibletype"
        )
        mutated_read_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type,
            codename="mutated_read_product",
            defaults={"name": "Can mutated read product"},
        )
        mutated_list_permission, _ = Permission.objects.get_or_create(
            content_type=tangible_type_content_type,
            codename="mutated_list_tangibletype",
            defaults={"name": "Can mutated list tangible type"},
        )
        stale_reader = get_user_model().objects.create_user(
            email="filterset-choices-stale-reader@domain.invalid",
            name="Filterset Choices Stale Reader",
            password="password",
        )
        stale_reader.user_permissions.add(stale_read_permission, stale_list_permission)
        mutated_reader = get_user_model().objects.create_user(
            email="filterset-choices-mutated-reader@domain.invalid",
            name="Filterset Choices Mutated Reader",
            password="password",
        )
        mutated_reader.user_permissions.add(mutated_read_permission, mutated_list_permission)

        self.register_viewsets()
        choices_url = reverse("info.model_info_filterset_choices-list", args=("store", "product", "tangible_type"))

        # Hit the endpoint once outside the override so any lazily-imported module involved is
        # already loaded under the default setting, like a real app import at process startup.
        api_client.force_authenticate(stale_reader)
        baseline_response = api_client.get(choices_url, format="json")
        assert baseline_response.status_code == HTTPStatus.OK, response_body(baseline_response)

        with override_settings(PERMISSION_NAMES_MAPPING={"read": "mutated_read", "list": "mutated_list"}):
            api_client.force_authenticate(stale_reader)
            stale_permission_response = api_client.get(choices_url, format="json")

            api_client.force_authenticate(mutated_reader)
            mutated_permission_response = api_client.get(choices_url, format="json")

        # stale_reader holds the stale "read_product"/"list_tangibletype" permissions, which no
        # longer satisfy the check once the override maps "read"/"list" to mutated names.
        assert stale_permission_response.status_code == HTTPStatus.FORBIDDEN, response_body(stale_permission_response)
        assert mutated_permission_response.status_code == HTTPStatus.OK, response_body(mutated_permission_response)

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
                assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

            case _:
                msg = (
                    f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_choices"
                )

                assert response.status_code == HTTPStatus.OK, response_body(response)
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

        assert response.status_code == HTTPStatus.OK, response_body(response)

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

        assert response.status_code == HTTPStatus.OK, response_body(response)
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

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert response.data["detail"] == (
            "Invalid filter 'invalid_filterset_field'. Valid filters are condition, disabled, "
            "distributor, id, last_ordered, name, name_icontains, quantity, special_care, tangible_type."
        )

    def test_successful_filter_choices_response_runs_one_dispatch(
        self, test_data, api_client, django_assert_num_queries, monkeypatch
    ):
        """
        The viewset used to answer a filter choices request by running the whole request twice,
        because the first run populated choices_permissions as a side effect of get_queryset.
        Resolution now happens before the handler, and one request is one dispatch.

        The query count is exact so that a reintroduced second dispatch fails here. Send one
        request before measuring: the first request for a user fills that user's permission cache.
        """
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        url = reverse("info.model_info_filterset_choices-list", args=("store", "product", "tangible_type"))
        warm_up_response = api_client.get(url, format="json")
        assert warm_up_response.status_code == HTTPStatus.OK, response_body(warm_up_response)

        dispatched = []
        original_initial = info_viewsets.ModelInfoChoicesBaseViewSet.initial

        def counting_initial(self, request, *args, **kwargs):
            dispatched.append(request)
            return original_initial(self, request, *args, **kwargs)

        monkeypatch.setattr(info_viewsets.ModelInfoChoicesBaseViewSet, "initial", counting_initial)

        with django_assert_num_queries(11):
            response = api_client.get(url, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(dispatched) == 1

    def test_denied_filter_choices_request_does_not_read_the_addressed_models(self, test_data, api_client, monkeypatch):
        """
        A denied request used to narrow and evaluate the whole choices queryset before anything
        checked whether the user could see it. The customer may not list inventory records, so the
        response is 403 and neither the record table nor the reason table is read.
        """
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        handled = []
        original_get_queryset = info_viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset

        def recording_get_queryset(self):
            handled.append(self.choices_field)
            return original_get_queryset(self)

        monkeypatch.setattr(info_viewsets.ModelInfoFilterSetChoicesViewSet, "get_queryset", recording_get_queryset)

        with CaptureQueriesContext(connection) as captured:
            response = api_client.get(
                reverse("info.model_info_filterset_choices-list", args=("store", "inventoryrecord", "reason")),
                format="json",
            )

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
        assert handled == [], "the handler ran for a request the user is not allowed to make"

        read_tables = [query["sql"] for query in captured.captured_queries if "store_inventoryrecord" in query["sql"]]
        assert read_tables == [], read_tables


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

        assert response.status_code == HTTPStatus.OK, response_body(response)
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

        assert response.status_code == HTTPStatus.OK, response_body(response)
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

        assert response.status_code == HTTPStatus.OK, response_body(response)
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

        assert response.status_code == HTTPStatus.OK, response_body(response)
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

        assert response.status_code == HTTPStatus.OK, response_body(response)
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"New", "Like New"}), (
            f"Expected only choices containing 'ne', got: {result_labels}"
        )
