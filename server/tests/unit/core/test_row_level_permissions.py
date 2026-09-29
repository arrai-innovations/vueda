from typing import ClassVar

import pytest
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.product.models import Product
from tests.product.viewsets import ProductViewSet


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

    def test_retrieve_product_super_user(self, api_client):
        user = self.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Apple")

        detail_url = reverse("product.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 200)

    def test_retrieve_product_true(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Banana")  # Admin can access products that are not for sale.

        detail_url = reverse("product.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert response.data["name"] == "Banana"

    def test_retrieve_product_available_for_sale_true(self, api_client):
        user = self.users["test_customer@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Apple")

        detail_url = reverse("product.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert response.data["name"] == "Apple"

    def test_retrieve_product_available_for_sale_false(self, api_client):
        user = self.users["test_customer@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Banana")

        detail_url = reverse("product.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 404)

    def test_retrieve_product_false(self, api_client):
        user = self.users["test_employee@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        product = Product.objects.get(name="Apple")

        detail_url = reverse("product.product-detail", args=(product.pk,))

        response = api_client.get(
            detail_url,
            format="json",
        )

        self.assert_response(response, 404)

    def test_list_products_super_user(self, api_client):
        user = self.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())

        list_url = reverse("product.product-list")
        response = api_client.get(
            list_url,
            format="json",
        )
        self.assert_response(response, 200)
        assert {x["name"] for x in response.data["results"]} == {"Apple", "Banana", "Mango", "Orange"}

    def test_list_products_true(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())

        list_url = reverse("product.product-list")
        response = api_client.get(
            list_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert {x["name"] for x in response.data["results"]} == {"Apple", "Banana", "Mango", "Orange"}

    def test_list_products_filtered_by_q(self, api_client):
        user = self.users["test_customer@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())

        list_url = reverse("product.product-list")

        response = api_client.get(
            list_url,
            format="json",
        )

        self.assert_response(response, 200)
        assert {x["name"] for x in response.data["results"]} == {"Apple", "Mango"}

    def test_list_product_false(self, api_client):
        user = self.users["test_employee@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())

        list_url = reverse("product.product-list")

        response = api_client.get(
            list_url,
            format="json",
        )
        self.assert_response(response, 200)
        assert not response.data["results"]

    def test_bulk_destroy_products_mixed_row_level_permissions(self, api_client):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        apple = Product.objects.get(name="Apple")
        banana = Product.objects.get(name="Banana")

        list_url = reverse("product.product-list")
        response = api_client.delete(
            list_url,
            data={"pks": [apple.pk, banana.pk]},
            format="json",
        )

        self.assert_response(response, 400)
        error_key = banana.pk if banana.pk in response.data else str(banana.pk)
        assert error_key in response.data
        assert str(response.data[error_key][0]) == f"Object with pk={banana.pk} does not exist."
        assert Product.objects.filter(pk=apple.pk).exists()
        assert Product.objects.filter(pk=banana.pk).exists()

    def assert_bulk_destroy_refuses_banana(self, api_client):
        api_client.force_authenticate(user=self.users["test_customer_deleter@domain.invalid"])
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        apple = Product.objects.get(name="Apple")
        banana = Product.objects.get(name="Banana")

        response = api_client.delete(
            reverse("product.product-list"), data={"pks": [apple.pk, banana.pk]}, format="json"
        )

        self.assert_response(response, 400)
        error_key = banana.pk if banana.pk in response.data else str(banana.pk)
        assert [str(message) for message in response.data[error_key]] == [
            f"Object with pk={banana.pk} does not exist."
        ], response.data
        assert Product.objects.filter(pk=apple.pk).exists()
        assert Product.objects.filter(pk=banana.pk).exists()

    def test_bulk_destroy_instance_check_that_hides_a_row_answers_the_400_map(self, api_client, monkeypatch):
        """With only `check_instance` deciding, a row denied both `delete` and `read` makes DRF's
        object check raise `Http404`; the bulk delete still reports it as a missing pk (issue #371)."""
        monkeypatch.setattr(Product.RowLevelPermissions, "check_queryset", classmethod(lambda cls, *a, **k: None))

        self.assert_bulk_destroy_refuses_banana(api_client)

    def test_bulk_destroy_override_raising_django_permission_denied_answers_the_400_map(self, api_client, monkeypatch):
        """A viewset override may raise Django's `PermissionDenied`, a separate class from DRF's."""
        original = ProductViewSet.check_object_permissions

        def check_object_permissions(self, request, obj):
            if obj.name == "Banana":
                raise DjangoPermissionDenied
            return original(self, request, obj)

        monkeypatch.setattr(Product.RowLevelPermissions, "check_queryset", classmethod(lambda cls, *a, **k: None))
        monkeypatch.setattr(ProductViewSet, "check_object_permissions", check_object_permissions)

        self.assert_bulk_destroy_refuses_banana(api_client)

    def test_bulk_destroy_products_allowed_by_row_level_permissions(self, api_client):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        apple = Product.objects.get(name="Apple")
        mango = Product.objects.get(name="Mango")
        banana = Product.objects.get(name="Banana")

        list_url = reverse("product.product-list")
        response = api_client.delete(
            list_url,
            data={"pks": [apple.pk, mango.pk]},
            format="json",
        )

        self.assert_response(response, 204)
        assert not Product.objects.filter(pk=apple.pk).exists()
        assert not Product.objects.filter(pk=mango.pk).exists()
        assert Product.objects.filter(pk=banana.pk).exists()

    def test_detail_destroy_product_allowed_by_row_level_permissions(self, api_client):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        apple = Product.objects.get(name="Apple")

        detail_url = reverse("product.product-detail", args=(apple.pk,))
        response = api_client.delete(detail_url, format="json")

        self.assert_response(response, 204)
        assert not Product.objects.filter(pk=apple.pk).exists()

    def test_detail_destroy_product_denied_by_row_level_permissions(self, api_client):
        user = self.users["test_customer_deleter@domain.invalid"]
        api_client.force_authenticate(user=user)
        Product.objects.bulk_create(Product(name=name, **data) for name, data in self.products_to_create.items())
        banana = Product.objects.get(name="Banana")

        detail_url = reverse("product.product-detail", args=(banana.pk,))
        response = api_client.delete(detail_url, format="json")

        self.assert_response(response, 404)
        assert Product.objects.filter(pk=banana.pk).exists()
