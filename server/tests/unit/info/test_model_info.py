from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.expected_results_model_info import EXPECTED_RESULTS
from tests.unit.info.utils import create_test_data
from vueda import info


class VuedaTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "delete"),
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
            ("store", "CartItem", "delete"),
            ("store", "CartItem", "list"),
            ("store", "CartItem", "read"),
            ("store", "Customer", "list"),
            ("store", "Customer", "read"),
            ("store", "CustomerOrder", "create"),
            ("store", "CustomerOrder", "delete"),
            ("store", "CustomerOrder", "list"),
            ("store", "CustomerOrder", "read"),
            ("store", "CustomerOrder", "update"),
            ("store", "Distributor", "create"),
            ("store", "Distributor", "delete"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "Distributor", "update"),
            ("store", "DistributorProxy", "create"),
            ("store", "DistributorProxy", "delete"),
            ("store", "DistributorProxy", "list"),
            ("store", "DistributorProxy", "read"),
            ("store", "DistributorProxy", "update"),
            ("store", "InventoryRecord", "create"),
            ("store", "InventoryRecord", "delete"),
            ("store", "InventoryRecord", "list"),
            ("store", "InventoryRecord", "read"),
            ("store", "InventoryRecord", "update"),
            ("store", "InventoryRecordReason", "create"),
            ("store", "InventoryRecordReason", "delete"),
            ("store", "InventoryRecordReason", "list"),
            ("store", "InventoryRecordReason", "read"),
            ("store", "InventoryRecordReason", "update"),
            ("store", "Note", "create"),
            ("store", "Note", "delete"),
            ("store", "Note", "list"),
            ("store", "Note", "read"),
            ("store", "Note", "update"),
            ("store", "OptionType", "create"),
            ("store", "OptionType", "delete"),
            ("store", "OptionType", "list"),
            ("store", "OptionType", "read"),
            ("store", "OptionType", "update"),
            ("store", "OrderItem", "create"),
            ("store", "OrderItem", "delete"),
            ("store", "OrderItem", "list"),
            ("store", "OrderItem", "read"),
            ("store", "OrderItem", "update"),
            ("store", "OrderCompositePK", "create"),
            ("store", "OrderCompositePK", "delete"),
            ("store", "OrderCompositePK", "list"),
            ("store", "OrderCompositePK", "read"),
            ("store", "OrderCompositePK", "update"),
            ("store", "OrderItemCompositePK", "create"),
            ("store", "OrderItemCompositePK", "delete"),
            ("store", "OrderItemCompositePK", "list"),
            ("store", "OrderItemCompositePK", "read"),
            ("store", "OrderItemCompositePK", "update"),
            ("store", "OrderItemAltCompositePK", "create"),
            ("store", "OrderItemAltCompositePK", "delete"),
            ("store", "OrderItemAltCompositePK", "list"),
            ("store", "OrderItemAltCompositePK", "read"),
            ("store", "OrderItemAltCompositePK", "update"),
            ("store", "OrderState", "create"),
            ("store", "OrderState", "delete"),
            ("store", "OrderState", "list"),
            ("store", "OrderState", "read"),
            ("store", "OrderState", "update"),
            ("store", "PackingBox", "create"),
            ("store", "PackingBox", "delete"),
            ("store", "PackingBox", "list"),
            ("store", "PackingBox", "read"),
            ("store", "PackingBox", "update"),
            ("store", "Product", "create"),
            ("store", "Product", "delete"),
            ("store", "Product", "list"),
            ("store", "Product", "read"),
            ("store", "Product", "update"),
            ("store", "ProductOption", "create"),
            ("store", "ProductOption", "delete"),
            ("store", "ProductOption", "list"),
            ("store", "ProductOption", "read"),
            ("store", "ProductOption", "update"),
            ("store", "SpecialCare", "create"),
            ("store", "SpecialCare", "delete"),
            ("store", "SpecialCare", "list"),
            ("store", "SpecialCare", "read"),
            ("store", "SpecialCare", "update"),
            ("store", "TangibleType", "create"),
            ("store", "TangibleType", "delete"),
            ("store", "TangibleType", "list"),
            ("store", "TangibleType", "read"),
            ("store", "TangibleType", "update"),
            ("tests", "User", "create"),
            ("tests", "User", "delete"),
            ("tests", "User", "list"),
            ("tests", "User", "read"),
            ("tests", "User", "update"),
        ],
        "Customer": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "create"),
            ("store", "Cart", "delete"),
            ("store", "Cart", "read"),
            ("store", "Cart", "update"),
            ("store", "CartItem", "create"),
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
            ("store", "DistributorProxy", "list"),
            ("store", "DistributorProxy", "read"),
            ("store", "Note", "list"),
            ("store", "Note", "read"),
            ("store", "OptionType", "list"),
            ("store", "OptionType", "read"),
            ("store", "OrderItem", "create"),
            ("store", "OrderItem", "list"),
            ("store", "OrderItem", "read"),
            ("store", "OrderCompositePK", "create"),
            ("store", "OrderCompositePK", "list"),
            ("store", "OrderCompositePK", "read"),
            ("store", "OrderItemCompositePK", "create"),
            ("store", "OrderItemCompositePK", "list"),
            ("store", "OrderItemCompositePK", "read"),
            ("store", "OrderItemAltCompositePK", "create"),
            ("store", "OrderItemAltCompositePK", "list"),
            ("store", "OrderItemAltCompositePK", "read"),
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
class TestModelInfoSerializer:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet)
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)
        info.register(store_serializers.OptionTypeSerializer, store_viewsets.OptionTypeViewSet)
        info.register(store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet)
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)
        info.register(store_serializers.CartItemSerializer, store_viewsets.CartItemViewSet)
        info.register(store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet)
        info.register_serializer(store_serializers.OrderItemSerializer)
        info.register(store_serializers.InventoryRecordReasonSerializer, store_viewsets.InventoryRecordReasonViewSet)
        info.register(store_serializers.InventoryRecordSerializer, store_viewsets.InventoryRecordViewSet)
        info.register(store_serializers.PackingBoxSerializer, store_viewsets.PackingBoxViewSet)
        info.register(store_serializers.NoteSerializer, store_viewsets.NoteViewSet)
        info.register(store_serializers.OrderCompositePKSerializer, store_viewsets.OrderCompositePKViewSet)
        info.register(store_serializers.OrderItemCompositePKSerializer, store_viewsets.OrderItemCompositePKViewSet)
        info.register(
            store_serializers.OrderItemAltCompositePKSerializer, store_viewsets.OrderItemAltCompositePKViewSet
        )
        info.register(store_serializers.DistributorProxySerializer, store_viewsets.DistributorProxyViewSet)

    def check_model_actions_data(self, response_data, expected_data, app_label, model_name):
        data = response_data.data["model_actions"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, "expected_actions -> {{keys}}"
        for model_action in data:
            for expected_model_action in expected_data:
                if model_action["name"] == expected_model_action["name"]:
                    assert frozenset(model_action) == frozenset(expected_model_action), (
                        f'expected_actions -> "name": "{model_action["name"]}" -> {{keys}}'
                    )
                    for key, value in model_action.items():
                        assert value == expected_model_action[key], (
                            f'expected_actions -> "name": "{model_action["name"]}" -> {key}'
                        )

    def check_model_expands_data(self, response_data, expected_data):
        data = response_data.data["model_expands"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, "expected_expands -> {{keys}}"
        for model_expand in data:
            for expected_model_expand in expected_data:
                if model_expand["name"] == expected_model_expand["name"]:
                    assert frozenset(model_expand) == frozenset(expected_model_expand), (
                        f'expected_expands -> "name": "{model_expand["name"]}" -> {{keys}}'
                    )
                    for key, value in model_expand.items():
                        if key == settings.REST_FLEX_FIELDS["FIELDS_PARAM"]:
                            self.check_model_fields(
                                value,
                                expected_model_expand[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]],
                                f'expected_expands -> "name": "{model_expand["name"]}"',
                            )
                            continue
                        assert value == expected_model_expand[key], (
                            f'expected_expands -> "name": "{model_expand["name"]}" -> {key}'
                        )

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
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(reverse("info.model_info-list"), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 17  # noqa: PLR2004

    @pytest.mark.parametrize(
        "app_label, model_name, kwargs",
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
    )
    def test_info_detail_admin(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        kwargs,
    ):
        user = test_data.users["test_admin@domain.invalid"]
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

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["verbose_name"] == kwargs["verbose_name"]
        assert response.data["verbose_name_plural"] == kwargs["verbose_name_plural"]
        self.check_model_actions_data(response, kwargs["expected_actions_admin"], app_label, model_name)
        self.check_model_expands_data(response, kwargs["expected_expands"])
        self.check_model_fields_data(response, kwargs["expected_fields"])
        self.check_model_filtering_data(response, kwargs["expected_filtering"])
        self.check_model_ordering_data(response, kwargs["expected_ordering"])
        self.check_model_permissions_data(response, kwargs["expected_permissions"])

    @pytest.mark.parametrize(
        "app_label, model_name, kwargs",
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
    )
    def test_info_detail_customer(
        self,
        test_data,
        api_client,
        app_label,
        model_name,
        kwargs,
    ):
        user = test_data.users["test_customer_1@domain.invalid"]
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

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["verbose_name"] == kwargs["verbose_name"]
        assert response.data["verbose_name_plural"] == kwargs["verbose_name_plural"]
        self.check_model_actions_data(response, kwargs["expected_actions_customer"], app_label, model_name)
        self.check_model_expands_data(response, kwargs["expected_expands"])
        self.check_model_fields_data(response, kwargs["expected_fields"])
        self.check_model_filtering_data(response, kwargs["expected_filtering"])
        self.check_model_ordering_data(response, kwargs["expected_ordering"])
        self.check_model_permissions_data(response, kwargs["expected_permissions"])
