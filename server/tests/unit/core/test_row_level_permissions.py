from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.product.models import Product


@pytest.mark.django_db
class TestRowLevelPermissions(BaseTestAssertResponseMixin, BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "Product", "read"),
            ("product", "Product", "list"),
            ("product", "Product", "manage"),
        ],
        "Customer": [
            ("product", "Product", "read"),
            ("product", "Product", "list"),
            ("product", "Product", "purchase"),
        ],
        "Customer Deleter": [
            ("product", "Product", "read"),
            ("product", "Product", "list"),
            ("product", "Product", "delete"),
            ("product", "Product", "purchase"),
        ],
        "Employee": [
            ("product", "Product", "read"),
            ("product", "Product", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer@domain.invalid": {
            "name": "Test Customer",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_deleter@domain.invalid": {
            "name": "Test Customer Deleter",
            "password": "testpass",
            "groups": ["Customer Deleter"],
        },
        "test_employee@domain.invalid": {
            "name": "Test Employee",
            "password": "testpass",
            "groups": ["Employee"],
        },
    }

    products_to_create = {
        "Apple": {"available_for_sale": True},
        "Banana": {"available_for_sale": False},
        "Mango": {"available_for_sale": True},
        "Orange": {"available_for_sale": False},
    }

    @pytest.fixture
    def products(self):
        """Create the products, keyed by name."""
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        return {product.name: product for product in Product.objects.all()}

    # Superusers and "manage" see every product, "purchase" sees only the ones for sale, and a user
    # with neither sees none. See Product's row-level permissions in tests/product/models.py.
    @pytest.mark.parametrize(
        ("email", "product_name"),
        [
            pytest.param("test_super_user@domain.invalid", "Apple", id="superuser"),
            pytest.param("test_admin@domain.invalid", "Banana", id="manager-sees-product-not-for-sale"),
            pytest.param("test_customer@domain.invalid", "Apple", id="purchaser-sees-product-for-sale"),
        ],
    )
    def test_retrieve_returns_a_product_the_user_may_see(self, api_client, products, email, product_name):
        api_client.force_authenticate(user=self.users[email])

        response = api_client.get(reverse("product.product-detail", args=(products[product_name].pk,)), format="json")

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["name"] == product_name

    @pytest.mark.parametrize(
        ("email", "product_name"),
        [
            pytest.param("test_customer@domain.invalid", "Banana", id="purchaser-product-not-for-sale"),
            pytest.param("test_employee@domain.invalid", "Apple", id="neither-manage-nor-purchase"),
        ],
    )
    def test_retrieve_hides_a_product_the_user_may_not_see(self, api_client, products, email, product_name):
        api_client.force_authenticate(user=self.users[email])

        response = api_client.get(reverse("product.product-detail", args=(products[product_name].pk,)), format="json")

        self.assert_response(response, HTTPStatus.NOT_FOUND)

    @pytest.mark.parametrize(
        ("email", "expected_names"),
        [
            pytest.param("test_super_user@domain.invalid", {"Apple", "Banana", "Mango", "Orange"}, id="superuser"),
            pytest.param("test_admin@domain.invalid", {"Apple", "Banana", "Mango", "Orange"}, id="manager"),
            pytest.param("test_customer@domain.invalid", {"Apple", "Mango"}, id="purchaser-only-for-sale"),
            pytest.param("test_employee@domain.invalid", set(), id="neither-manage-nor-purchase"),
        ],
    )
    def test_list_returns_only_products_the_user_may_see(self, api_client, products, email, expected_names):
        api_client.force_authenticate(user=self.users[email])

        response = api_client.get(reverse("product.product-list"), format="json")

        self.assert_response(response, HTTPStatus.OK)
        assert {x["name"] for x in response.data["results"]} == expected_names

    def test_bulk_destroy_products_mixed_row_level_permissions(self, api_client, products):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        apple = products["Apple"]
        banana = products["Banana"]

        list_url = reverse("product.product-list")
        response = api_client.delete(
            list_url,
            data={"pks": [apple.pk, banana.pk]},
            format="json",
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        error_key = banana.pk if banana.pk in response.data else str(banana.pk)
        assert error_key in response.data
        assert str(response.data[error_key][0]) == f"Object with pk={banana.pk} does not exist."
        assert Product.objects.filter(pk=apple.pk).exists()
        assert Product.objects.filter(pk=banana.pk).exists()

    def test_bulk_destroy_products_allowed_by_row_level_permissions(self, api_client, products):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        apple = products["Apple"]
        mango = products["Mango"]
        banana = products["Banana"]

        list_url = reverse("product.product-list")
        response = api_client.delete(
            list_url,
            data={"pks": [apple.pk, mango.pk]},
            format="json",
        )

        self.assert_response(response, HTTPStatus.NO_CONTENT)
        assert not Product.objects.filter(pk=apple.pk).exists()
        assert not Product.objects.filter(pk=mango.pk).exists()
        assert Product.objects.filter(pk=banana.pk).exists()

    def test_detail_destroy_product_allowed_by_row_level_permissions(self, api_client, products):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        apple = products["Apple"]

        detail_url = reverse("product.product-detail", args=(apple.pk,))
        response = api_client.delete(detail_url, format="json")

        self.assert_response(response, HTTPStatus.NO_CONTENT)
        assert not Product.objects.filter(pk=apple.pk).exists()

    def test_detail_destroy_product_denied_by_row_level_permissions(self, api_client, products):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        banana = products["Banana"]

        detail_url = reverse("product.product-detail", args=(banana.pk,))
        response = api_client.delete(detail_url, format="json")

        self.assert_response(response, HTTPStatus.NOT_FOUND)
        assert Product.objects.filter(pk=banana.pk).exists()
