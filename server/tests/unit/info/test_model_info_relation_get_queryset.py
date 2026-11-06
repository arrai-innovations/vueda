"""
Model-info `model_fields` describes a writable relation field that overrides `get_queryset()` instead of passing
`queryset`, the same way as one that passes `queryset`. This holds for the model's own fields and for the fields
of an expand.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework import serializers

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store.models import CartItem
from tests.store.models import Customer
from tests.store.serializers import CartItemSerializer
from tests.store.serializers import CartSerializer
from tests.store.viewsets import CartItemViewSet
from tests.store.viewsets import CartViewSet
from vueda import info


class RequestCustomerField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        return Customer.objects.filter(user=self.context["request"].user)


class RequestCartItemField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        return CartItem.objects.filter(cart__customer__user=self.context["request"].user)


class CartWithRequestRelationsSerializer(CartSerializer):
    customer = RequestCustomerField()
    cart_items = RequestCartItemField(many=True)


class CartWithRequestRelationsViewSet(CartViewSet):
    serializer_class = CartWithRequestRelationsSerializer


class CartItemExpandingRequestRelationsSerializer(CartItemSerializer):
    class Meta(CartItemSerializer.Meta):
        expandable_fields = {
            "cart": (
                CartWithRequestRelationsSerializer,
                {settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: ["id", "customer", "cart_items"]},
            ),
        }


class CartItemExpandingRequestRelationsViewSet(CartItemViewSet):
    serializer_class = CartItemExpandingRequestRelationsSerializer


class RelationGetQuerysetTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


@pytest.mark.django_db
class TestModelInfoRelationGetQueryset:
    @pytest.fixture(autouse=True)
    def register_models(self):
        info.registration.get_empty_registry()
        info.register(CartWithRequestRelationsSerializer, CartWithRequestRelationsViewSet)
        info.register(CartItemExpandingRequestRelationsSerializer, CartItemExpandingRequestRelationsViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.mark.parametrize(
        ("field_name", "expected_model", "expected_many"),
        [
            pytest.param("customer", "customer", False, id="forward-foreign-key"),
            pytest.param("cart_items", "cartitem", True, id="many"),
        ],
    )
    def test_reports_related_model_from_request_queryset(
        self, api_client, settings, field_name, expected_model, expected_many
    ):
        # Each field's get_queryset() reads the request from the serializer context, so it raises a KeyError
        # unless model info binds the field to a serializer whose context holds the request.
        test_data = RelationGetQuerysetTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("info.model_info-detail", args=("store", "cart")),
            data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_fields"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        field_data = response.data["model_fields"][field_name]
        assert field_data["read_only"] is False, response_body(response)
        assert field_data["many"] is expected_many, response_body(response)
        assert field_data["choices"] is True, response_body(response)
        assert field_data["app_label"] == "store", response_body(response)
        assert field_data["model"] == expected_model, response_body(response)

    @pytest.mark.parametrize(
        ("field_name", "expected_model", "expected_many"),
        [
            pytest.param("customer", "customer", False, id="forward-foreign-key"),
            pytest.param("cart_items", "cartitem", True, id="many"),
        ],
    )
    def test_reports_related_model_from_request_queryset_in_expand(
        self, api_client, settings, field_name, expected_model, expected_many
    ):
        # The expand's serializer is built for its field metadata, not bound to the canonical serializer, so its
        # fields see the request only if model info passes the request to that serializer's context.
        test_data = RelationGetQuerysetTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("info.model_info-detail", args=("store", "cartitem")),
            data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_expands"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        (cart_expand,) = (expand for expand in response.data["model_expands"] if expand["name"] == "cart")
        field_data = cart_expand[settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]][field_name]
        assert field_data["read_only"] is False, response_body(response)
        assert field_data["many"] is expected_many, response_body(response)
        assert field_data["choices"] is True, response_body(response)
        assert field_data["app_label"] == "store", response_body(response)
        assert field_data["model"] == expected_model, response_body(response)
