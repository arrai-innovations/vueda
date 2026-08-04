from datetime import date
from http import HTTPStatus
from typing import ClassVar
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from tests.conftest import BaseTestCommonModelViewSet
from tests.conftest import response_body
from tests.employee.models import Employee
from tests.product.models import Product
from tests.timesheet.models import Timesheet
from tests.timesheet.models import TimesheetEntry
from tests.utils import adjust_page_size
from vueda.core.pagination import VUEDAPageNumberPagination


@pytest.mark.django_db
class TestPagination(BaseTestCommonModelViewSet):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "Product", "read"),
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
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_get_paginated_response(self, settings, authenticated_client, page_data):
        with adjust_page_size(settings, 5):
            url = reverse("product.product-list")
            response = authenticated_client.get(url, format="json")
            response_data = {x: y for x, y in response.data.items() if x != "results"}
            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert response_data["perPage"] == 5  # noqa: PLR2004
            assert response_data["totalPages"] == 3  # noqa: PLR2004
            assert response_data["totalRecords"] == len(self.page_data_arguments)
            assert response_data["columnTotals"] == {}

    def test_page_size_query_param(self, settings, authenticated_client, page_data):
        settings.PAGE_SIZE_QUERY_PARAM = "our_ps"

        # Store the original function, so we can call it in the mocked function.
        orig_get_page_size = VUEDAPageNumberPagination.get_page_size

        def get_page_size(self, request):
            # Store the result on the mocked function, so we can assert it later.
            mocked_get_page_size._returned_page_size = page_size = orig_get_page_size(self, request)
            return page_size

        with patch.object(VUEDAPageNumberPagination, "get_page_size", get_page_size) as mocked_get_page_size:
            url = reverse("product.product-list")
            authenticated_client.get(url, data={"our_ps": "151"}, format="json")

            assert mocked_get_page_size._returned_page_size == 151  # noqa: PLR2004

    def test_page_query_param(self, settings, authenticated_client, page_data):
        settings.PAGE_QUERY_PARAM = "our_p"

        with adjust_page_size(settings, 5):
            url = reverse("product.product-list")
            response = authenticated_client.get(url, data={"our_p": 3}, format="json")
            response_data = {x: y for x, y in response.data.items() if x != "results"}
            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert response_data["perPage"] == 5  # noqa: PLR2004
            assert response_data["totalPages"] == 3  # noqa: PLR2004
            assert len(response.data["results"]) == 3  # noqa: PLR2004
            assert response_data["totalRecords"] == len(self.page_data_arguments)

    def test_page_beyond_last_returns_empty(self, settings, authenticated_client, page_data):
        with adjust_page_size(settings, 5):
            url = reverse("product.product-list")
            response = authenticated_client.get(url, data={"p": 999}, format="json")
            assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
            assert "Invalid page." in response.data["detail"]

    def test_page_negative_returns_empty(self, settings, authenticated_client, page_data):
        with adjust_page_size(settings, 5):
            url = reverse("product.product-list")
            response = authenticated_client.get(url, data={"p": -1}, format="json")
            assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
            assert "Invalid page." in response.data["detail"]

    def test_max_page_size(self, settings, authenticated_client, page_data):
        settings.MAX_PAGE_SIZE = 99

        # Store the original function, so we can call it in the mocked function.
        orig_get_page_size = VUEDAPageNumberPagination.get_page_size

        def get_page_size(self, request):
            # Store the result on the mocked function, so we can assert it later.
            mocked_get_page_size._returned_page_size = page_size = orig_get_page_size(self, request)
            return page_size

        with patch.object(VUEDAPageNumberPagination, "get_page_size", get_page_size) as mocked_get_page_size:
            url = reverse("product.product-list")
            authenticated_client.get(url, format="json")
            assert mocked_get_page_size._returned_page_size == 99  # noqa: PLR2004


@pytest.mark.django_db
class TestColumnTotals(BaseTestCommonModelViewSet):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Lister": [
            ("timesheet", "Timesheet", "list"),
            ("timesheet", "TimesheetEntry", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Timesheet Lister"],
        },
    }

    @pytest.fixture
    def page_data(self):
        employee = Employee.objects.create(user=self.users["test_admin@domain.invalid"], employee_number="E001")
        timesheet = Timesheet.objects.create(
            period_start=date(2024, 1, 1),
            period_end=date(2024, 1, 7),
            employee=employee,
            supervisor=None,
        )
        TimesheetEntry.objects.create(timesheet=timesheet, date=date(2024, 1, 1), hours=1)
        TimesheetEntry.objects.create(timesheet=timesheet, date=date(2024, 1, 2), hours=0.5)
        TimesheetEntry.objects.create(timesheet=timesheet, date=date(2024, 1, 3), hours=1.65)
        return TimesheetEntry.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_column_totals(self, authenticated_client, page_data):
        url = reverse("timesheet.timesheetentry-list")
        response = authenticated_client.get(url, format="json")
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert str(response.data["columnTotals"]["hours"]) == "3.15"
