from datetime import date
from decimal import Decimal
from http import HTTPStatus
from typing import ClassVar
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from tests.conftest import BaseTestCommonModelViewSet
from tests.conftest import response_body
from tests.employee.models import Employee
from tests.product.models import Product
from tests.store.models import Cart
from tests.store.models import CartItem
from tests.store.models import Customer
from tests.store.models import Distributor
from tests.store.models import Product as StoreProduct
from tests.store.models import ProductOption
from tests.store.models import TangibleType
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


@pytest.mark.django_db
class TestColumnTotalsDoubleUnderscoreField(BaseTestCommonModelViewSet):
    """CartItemColumnTotalsViewSet declares two column totals reached through a double-underscore
    relation lookup rather than a field on CartItem itself: `product_option__quantity_available`
    and `product_option__price`. Having two lets tests verify that requesting only one of them
    does not also return the other.
    """

    groups_to_create: ClassVar[dict] = {
        "Cart Item Lister": [
            ("store", "CartItem", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Cart Item Lister"],
        },
    }

    @pytest.fixture
    def page_data(self):
        user = get_user_model().objects.create(email="cart_owner@domain.invalid", name="Cart Owner", is_active=True)
        customer = Customer.objects.create(user=user)
        cart = Cart.objects.create(customer=customer)

        tangible_type = TangibleType.objects.get(code="physical")
        distributor = Distributor.objects.create(
            name="Column Totals Distributor", description="Used for column totals test."
        )
        product = StoreProduct.objects.create(
            distributor=distributor,
            name="Column Totals Product",
            tangible_type=tangible_type,
            order_between=(1, 10),
        )
        product_option_one = ProductOption.objects.create(
            product=product,
            name="Option One",
            sku="CT-001",
            gtin="1000000000001",
            quantity_available=5,
            price=Decimal("10.00"),
        )
        product_option_two = ProductOption.objects.create(
            product=product,
            name="Option Two",
            sku="CT-002",
            gtin="1000000000002",
            quantity_available=7,
            price=Decimal("15.00"),
        )

        CartItem.objects.create(cart=cart, product_option=product_option_one, quantity=1)
        CartItem.objects.create(cart=cart, product_option=product_option_two, quantity=1)
        return CartItem.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_column_totals_supports_double_underscore_field(self, settings, authenticated_client, page_data):
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_item_column_totals"

        response = authenticated_client.get(
            reverse("store.cartitem-list"),
            data={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,quantity,product_option__quantity_available",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {"product_option__quantity_available": 12}
        assert response.data["results"][0].keys() == frozenset({"id", "quantity"})

    def test_column_totals_no_fields_returns_all(self, settings, authenticated_client, page_data):
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_item_column_totals"

        response = authenticated_client.get(reverse("store.cartitem-list"), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {
            "product_option__quantity_available": 12,
            "product_option__price": Decimal("25.00"),
        }

    def test_column_totals_wildcard_field_returns_all(self, settings, authenticated_client, page_data):
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_item_column_totals"

        response = authenticated_client.get(
            reverse("store.cartitem-list"),
            data={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "*"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {
            "product_option__quantity_available": 12,
            "product_option__price": Decimal("25.00"),
        }
