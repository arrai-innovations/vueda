from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.product.serializers import ProductModelOrderingPKSerializer
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductModelOrderingPKViewSet
from tests.product.viewsets import ProductOrderingPartialPKViewSet
from tests.product.viewsets import ProductOrderingPKViewSet
from tests.product.viewsets import ProductViewSet
from tests.store.serializers import OrderItemCompositePKSerializer
from tests.store.serializers import OrderItemPKOrderedCompositePKSerializer
from tests.store.viewsets import OrderItemCompositePKOrderingPKViewSet
from tests.store.viewsets import OrderItemPKOrderedCompositePKViewSet
from vueda import info


class ModelOrderingPKDefaultTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


def get_model_ordering_response(api_client, settings, app_label, model_name):
    """The model-info response for a registered model, expanded onto `model_ordering`."""
    test_data = ModelOrderingPKDefaultTestData()
    user = test_data.users["test_super_user@domain.invalid"]
    api_client.force_authenticate(user=user)

    return api_client.get(
        reverse("info.model_info-detail", args=(app_label, model_name)),
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
        format="json",
    )


@pytest.mark.django_db
class TestModelOrderingViewSetPKDefaultValue:
    """ProductOrderingPKViewSet declares `ordering = ["pk"]`. "pk" is an alias Django's query
    machinery resolves for itself, not a real field name, so `model_ordering` should report the
    field it stands for ("id") and never hand "pk" to the client, which has no way to tell which
    column that names.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingPKViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_the_primary_key_field(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["id"], response_body(response)

    def test_fields_carries_the_primary_key_field_and_not_the_alias(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        assert "pk" not in fields_by_name, response_body(response)
        assert fields_by_name["id"] == {"name": "id", "type": "numeric", "ascending": True}, response_body(response)


@pytest.mark.django_db
class TestModelOrderingViewSetPartialPKDefaultValue:
    """ProductOrderingPartialPKViewSet declares `ordering = ["-name", "pk"]`, so only part of the
    default ordering is the "pk" alias. The alias should be expanded where it sits, leaving the rest
    of the ordering in its declared position and direction.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingPartialPKViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_expands_the_alias_in_place(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["name", "id"], response_body(response)

    def test_each_default_field_keeps_its_own_direction(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # "-name" is descending; "pk" carries no "-", so the field it expands to is ascending.
        assert fields_by_name["name"]["ascending"] is False, response_body(response)
        assert fields_by_name["id"]["ascending"] is True, response_body(response)


@pytest.mark.django_db
class TestModelOrderingModelPKDefaultValue:
    """The model's own `Meta.ordering` can name the "pk" alias too, and ProductViewSet declares no
    `ordering` of its own, so the model's is what DRF applies. The alias should be expanded the same
    way it is for a viewset's `ordering`.

    `Meta.ordering` is read fresh on every request, so patching it covers further shapes of a
    model-level ordering (here a "-pk" mixed with a real field) without a test model and migration
    per shape. TestModelOrderingDeclaredModelPKDefaultValue covers the declared case, on a model
    Django loaded with `Meta.ordering = ["pk"]` of its own.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_the_primary_key_field(self, api_client, settings, monkeypatch):
        monkeypatch.setattr(Product._meta, "ordering", ["pk"])

        response = get_model_ordering_response(api_client, settings, "product", "product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["id"], response_body(response)

    def test_default_expands_the_alias_in_place(self, api_client, settings, monkeypatch):
        monkeypatch.setattr(Product._meta, "ordering", ["name", "-pk"])

        response = get_model_ordering_response(api_client, settings, "product", "product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["name", "id"], response_body(response)

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}
        assert fields_by_name["name"]["ascending"] is True, response_body(response)
        assert fields_by_name["id"]["ascending"] is False, response_body(response)


@pytest.mark.django_db
class TestModelOrderingDeclaredModelPKDefaultValue:
    """ProductModelOrderingPK declares `ordering = ["pk"]` in its own `Meta`, and
    ProductModelOrderingPKViewSet declares no `ordering`, so the alias is the model's default ordering
    as Django loaded it — not a patched `Meta.ordering`. It should be expanded to the field it stands
    for the same way a viewset's `ordering` is.
    """

    @pytest.fixture(autouse=True)
    def register_product_model_ordering_pk(self):
        info.registration.get_empty_registry()
        info.register(ProductModelOrderingPKSerializer, ProductModelOrderingPKViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_the_primary_key_field(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "productmodelorderingpk")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["id"], response_body(response)

    def test_fields_carries_the_primary_key_field_and_not_the_alias(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "productmodelorderingpk")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        assert "pk" not in fields_by_name, response_body(response)
        assert fields_by_name["id"] == {"name": "id", "type": "numeric", "ascending": True}, response_body(response)


@pytest.mark.django_db
class TestModelOrderingCompositePKDefaultValue:
    """OrderItemCompositePKOrderingPKViewSet declares `ordering = ["pk"]` on a model whose primary
    key is a `CompositePrimaryKey`, which has no column of its own. Ordering by it means ordering by
    each field the key is built from — what Django expands it to in the SQL — so `model_ordering`
    should name those fields instead of the key.
    """

    @pytest.fixture(autouse=True)
    def register_order_item(self):
        info.registration.get_empty_registry()
        info.register(OrderItemCompositePKSerializer, OrderItemCompositePKOrderingPKViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_every_field_of_the_key(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "orderitemcompositepk")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["order", "product"], response_body(response)

    def test_fields_reports_the_key_fields_once_each(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "orderitemcompositepk")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        names = [field["name"] for field in model_ordering["fields"]]

        # `ordering_fields` already names "order" and "product", so the fields the alias expands to
        # are merged into those entries rather than repeated.
        assert "pk" not in names, response_body(response)
        assert names == ["order", "product", "quantity"], response_body(response)

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}
        assert fields_by_name["order"]["ascending"] is True, response_body(response)
        assert fields_by_name["product"]["ascending"] is True, response_body(response)
        assert "ascending" not in fields_by_name["quantity"], response_body(response)


@pytest.mark.django_db
class TestModelOrderingDeclaredModelCompositePKDefaultValue:
    """OrderItemPKOrderedCompositePK declares `ordering = ["pk"]` in its own `Meta` on a model whose
    primary key is a `CompositePrimaryKey`, and OrderItemPKOrderedCompositePKViewSet declares no
    `ordering`. The alias names no column of its own, so the fields the key is built from are what
    Django orders by, and what `model_ordering` should report.
    """

    @pytest.fixture(autouse=True)
    def register_order_item(self):
        info.registration.get_empty_registry()
        info.register(OrderItemPKOrderedCompositePKSerializer, OrderItemPKOrderedCompositePKViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_every_field_of_the_key(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "orderitempkorderedcompositepk")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["order", "product"], response_body(response)

    def test_fields_reports_the_key_fields_once_each(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "orderitempkorderedcompositepk")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        names = [field["name"] for field in model_ordering["fields"]]

        assert "pk" not in names, response_body(response)
        assert names == ["order", "product", "quantity"], response_body(response)

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}
        assert fields_by_name["order"]["ascending"] is True, response_body(response)
        assert fields_by_name["product"]["ascending"] is True, response_body(response)
        assert "ascending" not in fields_by_name["quantity"], response_body(response)
