import pytest

from tests.conftest import BaseTestModelViewSet
from tests.models import Product


@pytest.mark.django_db
class TestProductViewSet(BaseTestModelViewSet):
    model = Product

    groups_to_create = {
        "Customer": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
            ("tests", "Product", "purchase"),
        ],
    }

    users_to_create = {
        "test_customer@example.com": {
            "name": "Test Customer",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }

    list_keys_arguments = {
        "name",
        "available_for_sale",
        "buzz_words",
    }

    page_data_arguments = (
        {
            "name": "Apple",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Local"),
        },
        {
            "name": "Banana",
            "available_for_sale": False,
            "buzz_words": ("Hand-held", "Tropical"),
        },
        {
            "name": "Mango",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Tasty", "Tropical"),
        },
        {
            "name": "Orange",
            "available_for_sale": False,
            "buzz_words": ("Organic", "Citrus", "Tangy", "Local"),
        },
    )

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_customer@example.com"]
        api_client.force_authenticate(user=user)
        return api_client

    # @pytest.fixture
    # def update_arguments(self, page_data):
    #     instance = page_data.first()
    #     return {
    #         "active_ingredients": [],
    #         "amount_unit": AmountUnit.objects.get(code="g").id,
    #         "name": "updated product",
    #         "current_history_id": instance.history.latest().history_id,
    #         "id": instance.id,
    #         "manufacturer": "updated manufacturer",
    #     }
    #
    # @pytest.fixture
    # def create_arguments(self):
    #     return {
    #         "active_ingredients": [],
    #         "amount_unit": AmountUnit.objects.get(code="capsule").id,
    #         "name": "new product",
    #         "manufacturer": "new manufacturer",
    #     }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()

        return {
            "name": "Apple",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Local"),
            "current_history_id": instance.history.latest().history_id,
            "id": instance.id,
        }
