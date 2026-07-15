import json
from http import HTTPStatus
from typing import ClassVar
from typing import TypedDict

import pytest
from django.conf import settings
from django.core.serializers.base import DeserializationError
from django.core.serializers.base import SerializationError
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store.serializers import OrderItemCompositePKSerializer


class VuedaCompositeKeyTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("store", "OrderCompositePK", "read"),
            ("store", "OrderItemCompositePK", "read"),
            ("store", "ProductCompositePK", "read"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


class _ProductCompositePKExpand(TypedDict):
    id: int
    name: str
    formatted_name: str


class _OrderCompositePKExpand(TypedDict):
    id: int
    order_number: str
    order_date: str
    order_items_composite_pks: list[list[int]]
    formatted_name: str


class _OrderItemCompositePKInExpand(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["1", "1"]'
    order: int
    product: int
    quantity: int
    formatted_name: str | None  # None when not resolved via viewset annotation


class _OrderItemCompositePKInExpandFiltered(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["4", "4"]'
    formatted_name: str | None


class _OrderItemCompositePKDetail(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["1", "1"]'
    order: _OrderCompositePKExpand
    product: _ProductCompositePKExpand
    quantity: int
    formatted_name: str
    available_actions: list[str]


class _OrderItemCompositePKDetailSparseFields(TypedDict):
    # Response when FIELDS_PARAM=[pk, formatted_name]: expands still included via wildcard
    pk: str  # JSON-encoded composite key, e.g. '["2", "2"]'
    order: _OrderCompositePKExpand
    product: _ProductCompositePKExpand
    formatted_name: str


class _OrderCompositePKDetail(TypedDict):
    id: int
    order_number: str
    order_date: str
    order_items_composite_pks: list[_OrderItemCompositePKInExpand]
    formatted_name: str
    available_actions: list[str]


class _OrderCompositePKDetailSparseFields(TypedDict):
    # Response when FIELDS_PARAM=[id, order_items_composite_pks.pk, order_items_composite_pks.formatted_name]
    id: int
    order_items_composite_pks: list[_OrderItemCompositePKInExpandFiltered]


@pytest.mark.django_db
class TestCompositeKey:
    @pytest.fixture
    def test_data(self):
        return VuedaCompositeKeyTestData()

    def test_object_data_no_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        product_1 = store_models.ProductCompositePK.objects.create(name="Product 1")
        order_1 = store_models.OrderCompositePK.objects.create(order_number="1234")
        order_item_1 = store_models.OrderItemCompositePK.objects.create(order=order_1, product=product_1, quantity=1)

        response = api_client.get(
            reverse(
                "store.orderitemcompositepk-detail",
                args=(json.dumps(order_item_1.pk),),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "order",
                    "product",
                ],
            },
        )

        data: _OrderItemCompositePKDetail = response.json()

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert data["pk"] == json.dumps([str(x) for x in order_item_1.pk])

    def test_object_data_with_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        product_1 = store_models.ProductCompositePK.objects.create(name="Product 1")
        order_1 = store_models.OrderCompositePK.objects.create(order_number="1234")
        order_item_1 = store_models.OrderItemCompositePK.objects.create(order=order_1, product=product_1, quantity=1)

        response = api_client.get(
            reverse(
                "store.orderitemcompositepk-detail",
                args=(json.dumps(order_item_1.pk),),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "order",
                    "product",
                ],
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                    "pk",
                    "formatted_name",
                ],
            },
        )

        data: _OrderItemCompositePKDetailSparseFields = response.json()

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert data["pk"] == json.dumps([str(x) for x in order_item_1.pk])
        assert data["formatted_name"] == product_1.name  # Verify the formatted_name is not None
        assert [tuple(x) for x in data["order"]["order_items_composite_pks"]] == [tuple(order_item_1.pk)]

    def test_object_data_no_expanded_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        product_1 = store_models.ProductCompositePK.objects.create(name="Product 1")
        order_1 = store_models.OrderCompositePK.objects.create(order_number="1234")
        order_item_1 = store_models.OrderItemCompositePK.objects.create(order=order_1, product=product_1, quantity=1)

        response = api_client.get(
            reverse(
                "store.ordercompositepk-detail",
                args=(order_1.pk,),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "order_items_composite_pks",
                ],
            },
        )

        data: _OrderCompositePKDetail = response.json()

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert data["order_items_composite_pks"][0]["pk"] == json.dumps([str(x) for x in order_item_1.pk])

    def test_object_data_with_expanded_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        product_1 = store_models.ProductCompositePK.objects.create(name="Product 1")
        order_1 = store_models.OrderCompositePK.objects.create(order_number="1234")
        order_item_1 = store_models.OrderItemCompositePK.objects.create(order=order_1, product=product_1, quantity=1)

        response = api_client.get(
            reverse(
                "store.ordercompositepk-detail",
                args=(order_1.pk,),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "order_items_composite_pks",
                ],
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: [
                    "id",
                    "order_items_composite_pks.pk",
                    "order_items_composite_pks.formatted_name",
                ],
            },
        )

        data: _OrderCompositePKDetailSparseFields = response.json()

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert data["order_items_composite_pks"][0]["pk"] == json.dumps([str(x) for x in order_item_1.pk])


class TestCompositePrimaryKeyFieldErrors:
    def test_to_representation_raises_serialization_error(self):
        field = OrderItemCompositePKSerializer().fields["pk"]
        # None is non-iterable, so zip(self.fields, vals) raises TypeError inside value_to_string.
        with pytest.raises(SerializationError):
            field.to_representation(None)

    def test_to_internal_value_raises_deserialization_error(self):
        field = OrderItemCompositePKSerializer().fields["pk"]
        # Invalid JSON causes json.loads to raise inside to_python.
        with pytest.raises(DeserializationError):
            field.to_internal_value("not-valid-json")
