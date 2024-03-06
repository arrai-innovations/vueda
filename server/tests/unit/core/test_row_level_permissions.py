import pytest
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.models import Product


@pytest.mark.django_db
class TestRowLevelPermissions(BaseTestAssertResponseMixin, BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create = {
        "Admin": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
            ("tests", "Product", "manage"),
        ],
        "Customer": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
            ("tests", "Product", "purchase"),
        ],
        "Employee": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
        ],
    }

    users_to_create = {
        "test_super_user@example.com": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
        "test_admin@example.com": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer@example.com": {
            "name": "Test Customer",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_employee@example.com": {
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

    def test_retrieve_product_super_user(self, api_client):
        user = self.users["test_super_user@example.com"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Apple")

        detail_url = reverse("tests.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 200)

    def test_retrieve_product_true(self, api_client):
        user = self.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Banana")  # Admin can access products that are not for sale.

        detail_url = reverse("tests.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert response.data["name"] == "Banana"

    def test_retrieve_product_available_for_sale_true(self, api_client):
        user = self.users["test_customer@example.com"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Apple")

        detail_url = reverse("tests.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert response.data["name"] == "Apple"

    def test_retrieve_product_available_for_sale_false(self, api_client):
        user = self.users["test_customer@example.com"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Banana")

        detail_url = reverse("tests.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 404)

    def test_retrieve_product_false(self, api_client):
        user = self.users["test_employee@example.com"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Apple")

        detail_url = reverse("tests.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 404)

    def test_list_products_filtered_by_q(self, api_client):
        user = self.users["test_customer@example.com"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())

        list_url = reverse("tests.product-list")

        response = api_client.get(
            list_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert {x["name"] for x in response.data["results"]} == {"Apple", "Mango"}
