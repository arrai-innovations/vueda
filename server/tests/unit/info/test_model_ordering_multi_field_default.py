from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingMultiFieldDefaultViewSet
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
