"""
Model-info `model_fields` reports the related model's `app_label` and `model` for a read-only relation field, for
forward relations and reverse relations alike.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse
from rest_framework import serializers

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store.models import Cart
from tests.store.models import Product
from tests.store.models import SpecialCare
from tests.store.serializers import CustomerSerializer
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import CartViewSet
from tests.store.viewsets import CustomerViewSet
from tests.store.viewsets import ProductViewSet
from vueda import info
from vueda.core.serializers import VuedaSerializer
from vueda.info.serializers import ModelInfoSerializer


class ProductWithOptionsSerializer(ProductSerializer):
    product_options = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta(ProductSerializer.Meta):
        fields = [*ProductSerializer.Meta.fields, "product_options"]


class ProductWithOptionsViewSet(ProductViewSet):
    serializer_class = ProductWithOptionsSerializer


class CustomerWithDataSerializer(CustomerSerializer):
    customer_data = serializers.PrimaryKeyRelatedField(source="data", read_only=True)

    class Meta(CustomerSerializer.Meta):
        fields = [*CustomerSerializer.Meta.fields, "customer_data"]


class CustomerWithDataViewSet(CustomerViewSet):
    serializer_class = CustomerWithDataSerializer


class CartWithReadOnlyItemsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Cart
        fields = ["id", "cart_items", *VuedaSerializer.Meta.fields]
        read_only_fields = ["cart_items"]


class CartWithReadOnlyItemsViewSet(CartViewSet):
    serializer_class = CartWithReadOnlyItemsSerializer


class ReadOnlyRelationsTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelInfoReadOnlyRelations:
    @pytest.fixture(autouse=True)
    def register_models(self):
        info.registration.get_empty_registry()
        info.register(ProductWithOptionsSerializer, ProductWithOptionsViewSet)
        info.register(CustomerWithDataSerializer, CustomerWithDataViewSet)
        info.register(CartWithReadOnlyItemsSerializer, CartWithReadOnlyItemsViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.mark.parametrize(
        ("model_name", "field_name", "expected_model"),
        [
            pytest.param("product", "distributor", "distributor", id="forward-foreign-key"),
            pytest.param("product", "product_options", "productoption", id="reverse-foreign-key"),
            pytest.param("customer", "customer_data", "customerdata", id="reverse-one-to-one"),
            pytest.param("cart", "cart_items", "cartitem", id="reverse-foreign-key-meta-read-only-fields"),
        ],
    )
    def test_reports_related_model(self, api_client, settings, model_name, field_name, expected_model):
        test_data = ReadOnlyRelationsTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("info.model_info-detail", args=("store", model_name)),
            data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_fields"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        field_data = response.data["model_fields"][field_name]
        assert field_data["read_only"] is True, response_body(response)
        assert field_data["app_label"] == "store", response_body(response)
        assert field_data["model"] == expected_model, response_body(response)


@pytest.mark.parametrize(
    ("model_field", "expected_model"),
    [
        pytest.param(Product._meta.get_field("special_care"), SpecialCare, id="many-to-many-field"),
        pytest.param(SpecialCare._meta.get_field("product"), Product, id="many-to-many-rel"),
    ],
)
def test_readonly_relation_meta_follows_many_to_many(model_field, expected_model):
    # The store app has no reverse many-to-many relation that a serializer field can name: `special_care` sets no
    # `related_name`, so its accessor `product_set` differs from the `product` name that `_meta.get_field()` knows.
    # This checks the helper on both sides of the relation directly.
    assert ModelInfoSerializer._get_readonly_relation_meta(model_field) is expected_model._meta
