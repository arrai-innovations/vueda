from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingSingleDefaultPlusFieldViewSet
from vueda import info


class ModelOrderingDefaultAndOrderingFieldsMergeTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelOrderingDefaultAndOrderingFieldsMergeValue:
    """ProductOrderingSingleDefaultPlusFieldViewSet declares a single-field default `ordering =
    ["-name"]` and `ordering_fields = ["available_for_sale"]` — a different field. `model_ordering.fields`
    should carry both: "available_for_sale" as a plain whitelisted entry with no `ascending` key, and
    "name" as a new entry appended from `default`, with `ascending` set.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingSingleDefaultPlusFieldViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_lists_only_the_default_field(self, api_client, settings):
        test_data = ModelOrderingDefaultAndOrderingFieldsMergeTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_ordering"]["default"] == ["name"], response_body(response)

    def test_whitelisted_field_has_no_ascending_key(self, api_client, settings):
        test_data = ModelOrderingDefaultAndOrderingFieldsMergeTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        fields_by_name = {field["name"]: field for field in response.data["model_ordering"]["fields"]}

        # "available_for_sale" is only in `ordering_fields`, not `default`, so it keeps the plain
        # name/type shape with no `ascending` key.
        assert fields_by_name["available_for_sale"] == {
            "name": "available_for_sale",
            "type": "boolean",
        }, response_body(response)

    def test_default_field_is_appended_with_ascending(self, api_client, settings):
        test_data = ModelOrderingDefaultAndOrderingFieldsMergeTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        fields_by_name = {field["name"]: field for field in response.data["model_ordering"]["fields"]}

        # "name" isn't in `ordering_fields`, but it is the default ordering field, so it's appended
        # as a brand-new entry carrying `ascending`.
        assert fields_by_name["name"] == {"name": "name", "type": "alpha", "ascending": False}, response_body(response)
