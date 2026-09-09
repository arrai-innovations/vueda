from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingStringViewSet
from vueda import info


class ModelOrderingStringDefaultTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelOrderingStringDefaultValue:
    """ProductOrderingStringViewSet declares `ordering` as a bare string ("-name") rather than a
    list/tuple, which DRF's own OrderingFilter also allows. `model_ordering.default` in the
    /vueda.info/ metadata should treat it as a single field, not iterate it character by character.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingStringViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_is_a_list_containing_the_single_field(self, api_client, settings):
        test_data = ModelOrderingStringDefaultTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        # A string "-name" must resolve to the single field "name", descending. Treating the string as
        # an iterable of characters would instead produce entries for "-", "n", "a", "m", "e".
        assert model_ordering["default"] == ["name"], response_body(response)

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}
        assert fields_by_name["name"]["ascending"] is False
