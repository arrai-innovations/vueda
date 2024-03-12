import pytest

from tests.conftest import BaseTestModelViewSet
from tests.models import Product


@pytest.mark.django_db
class TestProductViewSet(BaseTestModelViewSet):
    model = Product

    groups_to_create = {
        "Admin": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
            ("tests", "Product", "create"),
            ("tests", "Product", "update"),
            ("tests", "Product", "delete"),
            ("tests", "Product", "manage"),
        ],
    }

    users_to_create = {
        "test_admin@example.com": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
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
        user = self.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def list_querystring(self, page_data):
        ids = tuple(page_data.filter(name__in=("Apple", "Banana", "Mango")).values_list("pk", flat=True))
        return {"id": ids}

    @pytest.fixture
    def update_arguments(self, page_data):
        instance = page_data.first()
        return {
            "name": "Apple",
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local", "Fresh"],
            "current_history_id": instance.current_history_id,
            "id": instance.id,
        }

    @pytest.fixture
    def create_arguments(self):
        return {
            "name": "Apple",
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local"],
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "name": "Apple",
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local"],
            "current_history_id": instance.current_history_id,
            "id": instance.id,
        }
