from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingMultiFieldDefaultViewSet
from tests.product.viewsets import ProductOrderingScalarFunctionMultiFieldViewSet
from vueda import info


class ModelOrderingMultiFieldDefaultTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelOrderingMultiFieldDefaultValue:
    """ProductOrderingMultiFieldDefaultViewSet declares a two-field default
    `ordering = ["-name", "available_for_sale"]` and an empty `ordering_fields`. `model_ordering.default`
    should list both field names in order, and both should appear in `model_ordering.fields` (with
    `ascending` set) even though neither is otherwise whitelisted.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingMultiFieldDefaultViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_lists_both_field_names_in_order(self, api_client, settings):
        test_data = ModelOrderingMultiFieldDefaultTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_ordering"]["default"] == ["name", "available_for_sale"], response_body(response)

    def test_both_default_fields_appear_in_fields_with_ascending(self, api_client, settings):
        test_data = ModelOrderingMultiFieldDefaultTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        fields_by_name = {field["name"]: field for field in response.data["model_ordering"]["fields"]}

        # `ordering_fields` is empty, so both entries only exist because they were merged in from
        # `default`; their "ascending" values reflect each field's own direction in that default.
        assert fields_by_name["name"] == {"name": "name", "type": "alpha", "ascending": False}, response_body(response)
        assert fields_by_name["available_for_sale"] == {
            "name": "available_for_sale",
            "type": "boolean",
            "ascending": True,
        }, response_body(response)


@pytest.mark.django_db
class TestModelOrderingScalarFunctionMultiFieldValue:
    """ProductOrderingScalarFunctionMultiFieldViewSet's default `ordering` is a single scalar-function
    term reading two columns, `Coalesce("name", "formatted_name")`, with an empty `ordering_fields`.

    This is the one shape `model_ordering.default` can't name. Every name it reports is a name a client
    sends back in `?o=`, and no single field name stands for the sort this expression performs:
    reporting both would say the rows arrive sorted by "name" and then by "formatted_name", which is
    not what `Coalesce` does. So the default ordering is dropped whole, the same as a term that
    resolves to no field at all.

    `fields` is a different question, and both columns belong in it. `VuedaOrderingFilter` makes each
    field the term references an explicit `?o=` target — see
    `tests/unit/filtering/test_ordering.py::TestOrderingScalarFunctionMultiFieldDefault` — so leaving
    them out would make them orderable and invisible: no metadata-driven client would ever be offered
    them. What is withheld is the claim about how the rows currently arrive, not the fields.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingScalarFunctionMultiFieldViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_is_empty_rather_than_naming_either_field(self, api_client, settings):
        test_data = ModelOrderingMultiFieldDefaultTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_ordering"]["default"] == [], response_body(response)

    def test_both_fields_of_the_term_are_reported_in_fields(self, api_client, settings):
        test_data = ModelOrderingMultiFieldDefaultTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        # `ordering_fields` is empty, so these two entries exist only because the default ordering
        # names them — each in its own right, which is exactly how `?o=` accepts them.
        assert response.data["model_ordering"]["fields"] == [
            {"name": "name", "type": "alpha"},
            {"name": "formatted_name", "type": "alpha"},
        ], response_body(response)

    def test_neither_field_claims_a_default_direction(self, api_client, settings):
        """`ascending` describes the reported default ordering. There isn't one here, so no field
        carries it: a client can offer the sort without asserting the rows already arrive that way."""
        test_data = ModelOrderingMultiFieldDefaultTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        for field in response.data["model_ordering"]["fields"]:
            assert "ascending" not in field, response_body(response)
