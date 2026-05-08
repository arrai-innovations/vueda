import json
from http import HTTPStatus
from pprint import pformat
from typing import ClassVar

import pytest
from django.conf import settings
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models


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
        "test_customer_1@example.com": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.mark.django_db
class TestCompositeKey:
    @pytest.fixture
    def test_data(self):
        return VuedaCompositeKeyTestData()

    def test_object_data_no_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
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

        data = response.json()

        assert response.status_code == HTTPStatus.OK, pformat(data)
        assert data["pk"] == json.dumps([str(x) for x in order_item_1.pk])

    def test_object_data_with_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
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

        data = response.json()

        assert response.status_code == HTTPStatus.OK, pformat(data)
        assert data["pk"] == json.dumps([str(x) for x in order_item_1.pk])
        assert data["formatted_name"] == product_1.name  # Verify the formatted_name is not None
        assert [tuple(x) for x in data["order"]["order_items_composite_pks"]] == [tuple(order_item_1.pk)]

    def test_object_data_no_expanded_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
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

        data = response.json()

        assert response.status_code == HTTPStatus.OK, pformat(data)
        assert data["order_items_composite_pks"][0]["pk"] == json.dumps([str(x) for x in order_item_1.pk])

    def test_object_data_with_expanded_fields(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
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

        data = response.json()

        assert response.status_code == HTTPStatus.OK, pformat(data)
        assert data["order_items_composite_pks"][0]["pk"] == json.dumps([str(x) for x in order_item_1.pk])
