import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.utils import create_test_data
from vueda import info


class TestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
            ("store", "Product", "list"),
            ("store", "Product", "read"),
            ("tests", "User", "list"),
            ("tests", "User", "read"),
        ],
        "Customer": [  # Needed by create_test_data
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
        ],
    }

    users_to_create = {
        "test_admin@example.com": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer_1@example.com": {  # Needed by create_test_data
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_2@example.com": {  # Needed by create_test_data
            "name": "Test Customer 2",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }

    def __init__(self):
        create_test_data(self)


@pytest.mark.django_db
class TestModelInfoChoices:
    @pytest.fixture
    def test_data(self):
        return TestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)

    def test_filtering_range(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse("store.cart-list"),
            data={"last_modified_after": "2024-08-01", "last_modified_before": "2025-01-01"},
            format="json",
        )
        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"

        response = api_client.get(
            reverse("store.cart-list"),
            data={"last_modified_after": "2024-10-01", "last_modified_before": "2025-01-01"},
            format="json",
        )

        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_filtering_choices(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Vibrant Looks Inc."},
            format="json",
        )

        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"
        assert frozenset(x["name"] for x in response.data["results"]) == frozenset({"Spray Paint", "Paint"})

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Tasty Treats"},  # Tasty Treats Assoc. would work.
            format="json",
        )

        for err in response.data["distributor"]:
            assert (
                str(err) == "Select a valid choice. Tasty Treats is not one of the available choices."
            ), f"response.data: {response.data}"

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_name": "Men's White T-Shirt"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        cart_item_pks = frozenset([x.pk for x in test_data.carts["test_customer_1@example.com"]["cart_items"]])
        for result in response.data["results"]:
            assert frozenset(result["cart_items"]) == cart_item_pks

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_quantity": "4"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        cart_item_pks = frozenset([x.pk for x in test_data.carts["test_customer_2@example.com"]["cart_items"]])
        for result in response.data["results"]:
            assert frozenset(result["cart_items"]) == cart_item_pks

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_quantity": "24"},
            format="json",
        )

        for err in response.data["product_quantity"]:
            assert (
                str(err) == "Select a valid choice. 24 is not one of the available choices."
            ), f"response.data: {response.data}"
