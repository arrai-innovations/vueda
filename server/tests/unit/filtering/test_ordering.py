from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product


class ProductOrderingTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "Product", "list"),
            ("product", "Product", "manage"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }


@pytest.fixture
def product_ordering_data():
    data = ProductOrderingTestData()
    # Created out of both alphabetical and reverse-alphabetical order, so a passing
    # assertion can't be explained away by insertion/pk order matching the expected result.
    Product.objects.create(name="Cherry", available_for_sale=True, buzz_words=["Fresh"])
    Product.objects.create(name="Apple", available_for_sale=True, buzz_words=["Fresh"])
    Product.objects.create(name="Banana", available_for_sale=True, buzz_words=["Fresh"])
    return data


@pytest.mark.django_db
class TestModelOrderingOnly:
    """Product.Meta.ordering = ["name"]; ProductViewSet declares neither `ordering` nor `ordering_fields`."""

    def test_list_uses_model_default_ordering(self, product_ordering_data, api_client):
        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


@pytest.mark.django_db
class TestModelAndViewsetOrdering:
    """ProductOrderingViewSet adds `ordering = ["-name"]`, which should override Product.Meta.ordering."""

    def test_list_uses_viewset_ordering_over_model_default(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_overrides_viewset_ordering_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"), data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"}, format="json"
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


@pytest.mark.django_db
class TestModelViewsetAndOrderingFieldsOrdering:
    """ProductOrderingFieldsViewSet adds `ordering_fields = ["name"]` on top of `ordering = ["-name"]`.

    `ordering_fields` only whitelists which fields a client's `?o=` param may reference; on its own it
    should not change the default order applied when no `?o=` param is given.
    """

    def test_default_order_ignores_ordering_fields(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Same order as the viewset-ordering-only scenario: ordering_fields alone changes nothing here.
        assert [x["name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_allowed_field_is_applied(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_disallowed_field_falls_back_to_viewset_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "available_for_sale"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # available_for_sale isn't in ordering_fields, so OrderingFilter ignores it and falls back
        # to the viewset's default ordering, same as when no `?o=` is passed at all.
        assert [x["name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]
