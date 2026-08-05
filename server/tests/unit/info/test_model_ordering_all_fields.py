from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.product.serializers import ProductRenamedFieldSerializer
from tests.product.viewsets import ProductOrderingAllFieldsViewSet
from vueda import info


class ModelOrderingAllFieldsTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelOrderingAllFieldsValue:
    """ProductOrderingAllFieldsViewSet sets `ordering_fields = "__all__"`, which DRF's OrderingFilter
    resolves against the model's own fields, not the serializer's. `model_ordering.fields` in the
    /vueda.info/ metadata should reflect that expansion instead of the literal string "__all__".
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductRenamedFieldSerializer, ProductOrderingAllFieldsViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_expands_to_model_fields(self, api_client, settings):
        test_data = ModelOrderingAllFieldsTestData()
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

        expected_field_names = {field.name for field in Product._meta.fields}
        assert field_names == expected_field_names, response_body(response)
        # "title" is only the serializer's name for Product.name; it must not appear in place of "name".
        assert "title" not in field_names
        assert "__all__" not in field_names
