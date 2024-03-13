import pytest
from django.urls import reverse

from tests.conftest import BaseTestCommonModelViewSet
from tests.models import Product


@pytest.mark.django_db
class TestPagination(BaseTestCommonModelViewSet):
    groups_to_create = {
        "Admin": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
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

    page_data_arguments = [
        {"name": "Apple"},
        {"name": "Banana"},
        {"name": "Mango"},
        {"name": "Orange"},
        {"name": "Grape"},
        {"name": "Pear"},
        {"name": "Pineapple"},
        {"name": "Pomegranate"},
        {"name": "Lichi"},
        {"name": "Papaya"},
        {"name": "Raspberry"},
        {"name": "Blueberries"},
        {"name": "Watermelon"},
    ]

    @pytest.fixture
    def page_data(self):
        for data in self.page_data_arguments:
            Product.objects.create(**data)
        return Product.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_get_paginated_response(self, authenticated_client, page_data):
        url = reverse("tests.product-list")
        response = authenticated_client.get(url, data={"ps": 5}, format="json")
        response_data = {x: y for x, y in response.data.items() if x != "results"}
        assert response.status_code == 200
        assert response_data["perPage"] == 5
        assert response_data["totalPages"] == 3
        assert response_data["totalRecords"] == len(self.page_data_arguments)
