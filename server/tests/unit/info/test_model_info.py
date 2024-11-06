from pprint import pformat

import pytest
from django.conf import settings
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.expected_results_model_info import EXPECTED_RESULTS
from tests.unit.info.utils import create_test_data
from vueda import info


class TestData(BaseTestUserMixin, BaseTestGroupMixin):

    groups_to_create = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "create"),
            ("store", "Cart", "delete"),
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
            ("store", "Cart", "update"),
            ("store", "CartItem", "list"),
            ("store", "CartItem", "read"),
            ("store", "Customer", "list"),
            ("store", "Customer", "read"),
            ("store", "CustomerOrder", "create"),
            ("store", "CustomerOrder", "delete"),
            ("store", "CustomerOrder", "list"),
            ("store", "CustomerOrder", "read"),
            ("store", "CustomerOrder", "update"),
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
            ("store", "PackingBox", "list"),
            ("store", "PackingBox", "read"),
            ("store", "Product", "read"),
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
            ("store", "Cart", "create"),
            ("store", "Cart", "delete"),
            ("store", "Cart", "read"),
            ("store", "Cart", "update"),
            ("store", "CartItem", "delete"),
            ("store", "CartItem", "list"),
            ("store", "CartItem", "read"),
            ("store", "CartItem", "update"),
            ("store", "Customer", "read"),
            ("store", "Customer", "delete"),
            ("store", "CustomerOrder", "create"),
            ("store", "CustomerOrder", "read"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "OptionType", "list"),
            ("store", "OptionType", "read"),
            ("store", "OrderItem", "list"),
            ("store", "OrderItem", "read"),
            ("store", "OrderState", "list"),
            ("store", "OrderState", "read"),
            ("store", "PackingBox", "list"),
            ("store", "PackingBox", "read"),
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
class TestModelInfoSerializer:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet)
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)
        info.register_serializer(store_serializers.OptionTypeSerializer)
        info.register(store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet)
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)
        info.register(store_serializers.CartItemSerializer, store_viewsets.CartItemViewSet)
        info.register(store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet)
        info.register(store_serializers.OrderItemSerializer, store_viewsets.OrderItemViewSet)
        info.register(store_serializers.InventoryRecordReasonSerializer, store_viewsets.InventoryRecordReasonViewSet)
        info.register(store_serializers.InventoryRecordSerializer, store_viewsets.InventoryRecordViewSet)
        info.register(store_serializers.PackingBoxSerializer, store_viewsets.PackingBoxViewSet)

    def check_model_actions_data(self, response_data, expected_data, app_label, model_name):
        data = response_data.data["model_actions"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, "expected_actions -> {{keys}}"
        for model_action in data:
            for expected_model_action in expected_data:
                if model_action["name"] == expected_model_action["name"]:
                    assert frozenset(model_action) == frozenset(
                        expected_model_action
                    ), f'expected_actions -> "name": "{model_action["name"]}" -> {{keys}}'
                    for key, value in model_action.items():
                        assert (
                            value == expected_model_action[key]
                        ), f'expected_actions -> "name": "{model_action["name"]}" -> {key}'

    def check_model_expands_data(self, response_data, expected_data):
        data = response_data.data["model_expands"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, "expected_expands -> {{keys}}"
        for model_expand in data:
            for expected_model_expand in expected_data:
                if model_expand["name"] == expected_model_expand["name"]:
                    assert frozenset(model_expand) == frozenset(
                        expected_model_expand
                    ), f'expected_expands -> "name": "{model_expand["name"]}" -> {{keys}}'
                    for key, value in model_expand.items():
                        if key == settings.REST_FLEX_FIELDS["FIELDS_PARAM"]:
                            self.check_model_fields(
                                value,
                                expected_model_expand[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]],
                                f'expected_expands -> "name": "{model_expand["name"]}"',
                            )
                            continue
                        assert (
                            value == expected_model_expand[key]
                        ), f'expected_expands -> "name": "{model_expand["name"]}" -> {key}'

    def check_model_fields(self, data, expected_data, extra_key=None):
        if extra_key is not None:
            assert frozenset(data) == frozenset(expected_data), f"{extra_key} -> FIELDS_PARAM -> {{keys}}"
        else:
            assert frozenset(data) == frozenset(expected_data), "expected_fields -> {{keys}}"
        for field_name, field_data in data.items():
            for expected_field_name, expected_field_data in expected_data.items():
                if field_name == expected_field_name:
                    if extra_key is not None:
                        failure_msg = f"{extra_key} -> FIELDS_PARAM -> {field_name}"
                    else:
                        failure_msg = f"expected_fields -> {field_name}"
                    assert frozenset(field_data) == frozenset(expected_field_data), f"{failure_msg} -> {{keys}}"
                    for key, value in field_data.items():
                        if key == "help_text":  # Don't worry about adding help text messages into our test data.
                            value = None
                        assert value == expected_field_data[key], f"{failure_msg} -> {key}"

    def check_model_fields_data(self, response_data, expected_data):
        self.check_model_fields(response_data.data["model_fields"], expected_data)

    @staticmethod
    def check_model_filtering_data(response_data, expected_data):
        data = response_data.data["model_filtering"]
        assert frozenset(data) == frozenset(expected_data), "expected_filtering -> {keys}"
        for model_filter_name, model_filter in data.items():
            for expected_model_filter_name, expected_model_filter in expected_data.items():
                if model_filter_name == expected_model_filter_name:
                    failure_msg = f"expected_filtering -> {model_filter_name}"
                    assert frozenset(model_filter) == frozenset(expected_model_filter), f"{failure_msg} -> {{keys}}"
                    for key, value in model_filter.items():
                        assert value == expected_model_filter[key], f"{failure_msg} -> {key}"

    @staticmethod
    def check_model_ordering_data(response_data, expected_data):
        data = response_data.data["model_ordering"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}
        for model_order in data:
            for expected_model_order in expected_data:
                if model_order["name"] == expected_model_order["name"]:
                    assert frozenset(model_order) == frozenset(expected_model_order), str(model_order)
                    for key, value in model_order.items():
                        assert value == expected_model_order[key], str(model_order)

    @staticmethod
    def check_model_permissions_data(response_data, expected_data):
        data = response_data.data["model_permissions"]
        assert {x["codename"] for x in data} == {x["codename"] for x in expected_data}
        for model_permission in data:
            for expected_model_permission in expected_data:
                if model_permission["codename"] == expected_model_permission["codename"]:
                    assert frozenset(model_permission) == frozenset(expected_model_permission), str(model_permission)
                    for key, value in model_permission.items():
                        assert value == expected_model_permission[key], str(model_permission)

    def test_info_list(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(reverse("info.model_info-list"), format="json")

        assert response.status_code == 200, str(response.data)
        assert response.data["totalRecords"] == 12

    @pytest.mark.parametrize(
        "app_label, model_name, kwargs",
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
    )
    def test_info_detail(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        kwargs,
    ):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model_name,
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_actions",
                    "model_expands",
                    "model_fields",
                    "model_filtering",
                    "model_ordering",
                    "model_permissions",
                ],
            },
        )

        assert response.status_code == 200, pformat(response.data)
        assert response.data["verbose_name"] == kwargs["verbose_name"]
        assert response.data["verbose_name_plural"] == kwargs["verbose_name_plural"]
        self.check_model_actions_data(response, kwargs["expected_actions"], app_label, model_name)
        self.check_model_expands_data(response, kwargs["expected_expands"])
        self.check_model_fields_data(response, kwargs["expected_fields"])
        self.check_model_filtering_data(response, kwargs["expected_filtering"])
        self.check_model_ordering_data(response, kwargs["expected_ordering"])
        self.check_model_permissions_data(response, kwargs["expected_permissions"])
