from unittest.mock import patch

import pytest
from django.urls import reverse

from tests.conftest import BaseTestCommonModelViewSet
from tests.models import Product
from vueda.core.pagination import VUEDAPageNumberPagination


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
        # because rest framework loads settings on class import there's no way to override through 'settings'
        VUEDAPageNumberPagination.page_size = 5
        VUEDAPageNumberPagination.max_page_size = 200
        VUEDAPageNumberPagination.page_query_param = "p"
        VUEDAPageNumberPagination.page_size_query_param = "ps"

        url = reverse("tests.product-list")
        response = authenticated_client.get(url, data={"ps": "5"}, format="json")
        response_data = {x: y for x, y in response.data.items() if x != "results"}
        assert response.status_code == 200
        assert response_data["perPage"] == 5
        assert response_data["totalPages"] == 3
        assert response_data["totalRecords"] == len(self.page_data_arguments)

    def test_page_size_query_param(self, settings, authenticated_client, page_data):
        settings.PAGE_SIZE_QUERY_PARAM = "our_ps"
        VUEDAPageNumberPagination.page_size = 100
        VUEDAPageNumberPagination.max_page_size = 200
        VUEDAPageNumberPagination.page_query_param = "p"

        # Store the original function, so we can call it in the mocked function.
        orig_get_page_size = VUEDAPageNumberPagination.get_page_size

        def get_page_size(self, request):
            # Store the result on the mocked function, so we can assert it later.
            mocked_get_page_size._returned_page_size = page_size = orig_get_page_size(self, request)
            return page_size

        with patch.object(VUEDAPageNumberPagination, "get_page_size", get_page_size) as mocked_get_page_size:
            VUEDAPageNumberPagination.page_size_query_param = "our_ps"
            url = reverse("tests.product-list")
            authenticated_client.get(url, data={"our_ps": "151"}, format="json")

            assert mocked_get_page_size._returned_page_size == 151

    def test_page_query_param(self, settings, authenticated_client, page_data):
        settings.PAGE_QUERY_PARAM = "our_p"
        VUEDAPageNumberPagination.page_size = 5
        VUEDAPageNumberPagination.max_page_size = 200
        VUEDAPageNumberPagination.page_query_param = "our_p"
        VUEDAPageNumberPagination.page_size_query_param = "ps"

        url = reverse("tests.product-list")
        response = authenticated_client.get(url, data={"ps": "5", "our_p": 3}, format="json")
        response_data = {x: y for x, y in response.data.items() if x != "results"}
        assert response.status_code == 200
        assert response_data["perPage"] == 5
        assert response_data["totalPages"] == 3
        assert len(response.data["results"]) == 3
        assert response_data["totalRecords"] == len(self.page_data_arguments)

    def test_max_page_size(self, authenticated_client, page_data):
        VUEDAPageNumberPagination.max_page_size = 99
        VUEDAPageNumberPagination.page_size = 100
        VUEDAPageNumberPagination.page_query_param = "p"
        VUEDAPageNumberPagination.page_size_query_param = "ps"

        # Store the original function, so we can call it in the mocked function.
        orig_get_page_size = VUEDAPageNumberPagination.get_page_size

        def get_page_size(self, request):
            # Store the result on the mocked function, so we can assert it later.
            mocked_get_page_size._returned_page_size = page_size = orig_get_page_size(self, request)
            return page_size

        with patch.object(VUEDAPageNumberPagination, "get_page_size", get_page_size) as mocked_get_page_size:
            url = reverse("tests.product-list")
            authenticated_client.get(url, data={"ps": "100"}, format="json")

            assert mocked_get_page_size._returned_page_size == 99
