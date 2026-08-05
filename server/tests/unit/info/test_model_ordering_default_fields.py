from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.product.serializers import ProductSourceFieldSerializer
from tests.product.viewsets import ProductOrderingSourceFieldViewSet
from vueda import info


class ModelOrderingDefaultFieldsTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelOrderingDefaultFieldsValue:
    """ProductOrderingSourceFieldViewSet doesn't declare `ordering_fields`, so DRF's OrderingFilter
    defaults to any readable field on the canonical serializer, resolved by each field's `source`
    rather than its serializer name. `model_ordering.fields` in the /vueda.info/ metadata should
    reflect that same source-based resolution instead of the serializer's own field names.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSourceFieldSerializer, ProductOrderingSourceFieldViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_resolves_by_source_not_serializer_name(self, api_client, settings):
        test_data = ModelOrderingDefaultFieldsTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        fields = response.data["model_ordering"]["fields"]
        field_names = {field["name"] for field in fields}

        # "title" is only the serializer's name for Product.name; the metadata should list "name" (its
        # source) instead. "available_actions" and "current_history_id" are readable serializer fields
        # with no real model field behind them, so they're excluded rather than crashing the endpoint.
        expected_field_names = {field.name for field in Product._meta.fields}
        assert field_names == expected_field_names, response_body(response)
        assert "title" not in field_names
        assert "available_actions" not in field_names
        assert "current_history_id" not in field_names
