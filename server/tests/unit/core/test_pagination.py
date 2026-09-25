import json
from datetime import date
from decimal import Decimal
from http import HTTPStatus
from typing import ClassVar
from unittest.mock import patch

import pytest
from django.db import connection
from django.db.models import F
from django.db.models import Sum
from django.test.utils import CaptureQueriesContext
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
from tests.store.models import InventoryRecord
from tests.store.models import InventoryRecordReason
from tests.store.models import OptionType
from tests.store.models import Product as StoreProduct
from tests.store.models import ProductOption
from tests.store.models import TangibleType
from tests.store.viewsets import InventoryRecordViewSet
from tests.timesheet.models import Timesheet
from tests.timesheet.models import TimesheetEntry
from tests.timesheet.viewsets import TimesheetEntryViewSet
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

    def test_page_beyond_last_returns_404(self, settings, authenticated_client, page_data):
        with adjust_page_size(settings, 5):
            url = reverse("product.product-list")
            response = authenticated_client.get(url, data={"p": 999}, format="json")
            assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
            assert "Invalid page." in response.data["detail"]

    def test_negative_page_returns_404(self, settings, authenticated_client, page_data):
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


def sum_expression_count(captured):
    """How many ``SUM(`` expressions the captured queries carry between them.

    Counting the expressions rather than the queries is what distinguishes "one total was
    aggregated" from "three were, in one query" -- every declared total used to cost a ``SUM``
    whether or not the caller had a use for it, and that is the shape of the regression these tests
    exist to catch.
    """
    return sum(query["sql"].upper().count("SUM(") for query in captured.captured_queries)


def create_product_options(*prices):
    """One product with an option per price, for the totals that sum a column across a relation."""
    distributor = Distributor.objects.create(name="Totals Distributor", description="For column totals.")
    product = StoreProduct.objects.create(
        distributor=distributor,
        name="Totals Product",
        tangible_type=TangibleType.objects.get(code="physical"),
        order_between=(1, 10),
    )
    option_type = OptionType.objects.get(code="size")
    return [
        ProductOption.objects.create(
            product=product,
            option_type=option_type,
            name=f"Option {index}",
            sku=f"TOTALS-SKU-{index:03}",
            gtin=f"100000000{index:04}",
            price=price,
        )
        for index, price in enumerate(prices, start=1)
    ]


@pytest.mark.django_db
class TestColumnTotals(BaseTestCommonModelViewSet):
    """Totals on a viewset declaring one, named after the column it sums.

    `tests.timesheet.viewsets.TimesheetEntryViewSet` declares `{"hours": "hours"}`, the case where
    the client-facing name and the ORM path coincide.

    Every response assertion compares the whole `columnTotals` mapping rather than looking one key
    up, so one assertion covers all three things a caller depends on: that it is a mapping, that it
    carries exactly the requested totals, and that each value is the right number.
    """

    # 1 + 0.5 + 1.65, summed over the rows `page_data` creates.
    EXPECTED_HOURS = Decimal("3.15")

    groups_to_create: ClassVar[dict] = {
        "Timesheet Lister": [
            ("timesheet", "Timesheet", "list"),
            ("timesheet", "TimesheetEntry", "list"),
            ("timesheet", "TimesheetEntry", "read"),
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

    def test_column_totals(self, settings, authenticated_client, page_data):
        url = reverse("timesheet.timesheetentry-list")
        response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "hours"}, format="json")
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {"hours": self.EXPECTED_HOURS}, response_body(response)
        # Separately from the numeric comparison above, which `Decimal("3.1")` would also satisfy:
        # the value keeps the column's own scale, which is what a client renders.
        assert str(response.data["columnTotals"]["hours"]) == "3.15"

    def test_column_totals_over_no_rows(self, settings, authenticated_client):
        """No `page_data`, so the filtered set is empty and the database returns NULL for the SUM.

        The total is reported as zero rather than null: the sum of nothing is zero, and a client
        reading a total should not have to tell "no rows" apart from "no total".
        """
        url = reverse("timesheet.timesheetentry-list")
        response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "hours"}, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["results"] == []
        assert response.data["columnTotals"] == {"hours": 0}, response_body(response)
        assert response.data["columnTotals"]["hours"] is not None, response_body(response)

    def test_column_totals_over_no_rows_render_as_numbers(self, settings, authenticated_client):
        """The zero has to survive rendering too, since that is what a client actually reads.

        `response.data` holds a `Decimal`, which JSON could carry as a string without either of the
        assertions above noticing.
        """
        url = reverse("timesheet.timesheetentry-list")
        response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "hours"}, format="json")

        assert json.loads(response.content)["columnTotals"] == {"hours": 0.0}, response_body(response)

    def test_asking_for_no_totals_aggregates_nothing(self, settings, authenticated_client, page_data):
        """A declared total costs nothing until a client asks for it.

        Two ways of asking for none -- leaving the parameter off, and sending it empty -- because a
        client that clears its totals sends the second, and neither may be read as "all of them".
        """
        url = reverse("timesheet.timesheetentry-list")
        with CaptureQueriesContext(connection) as captured:
            absent = authenticated_client.get(url, format="json")
            empty = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: ""}, format="json")

        assert absent.status_code == status.HTTP_200_OK, response_body(absent)
        assert empty.status_code == status.HTTP_200_OK, response_body(empty)
        assert absent.data["columnTotals"] == {}
        assert empty.data["columnTotals"] == {}
        assert sum_expression_count(captured) == 0, [query["sql"] for query in captured.captured_queries]

    def test_totals_are_not_aggregated_when_pagination_is_disabled(self, settings, authenticated_client, page_data):
        """Without a paginator the response is a bare array of rows, with nowhere to carry totals.

        Aggregating anyway would run a `SUM` per requested total and then drop every result, which
        is the one case where a caller asking for totals pays for them and receives none.
        """
        url = reverse("timesheet.timesheetentry-list")
        with (
            patch.object(TimesheetEntryViewSet, "pagination_class", None),
            CaptureQueriesContext(connection) as captured,
        ):
            response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "hours"}, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        # The unpaginated shape itself, so this keeps testing what it was written for if a future
        # default ever puts a paginator back on this viewset.
        assert isinstance(response.data, list), response_body(response)
        assert sum_expression_count(captured) == 0, [query["sql"] for query in captured.captured_queries]

    def test_viewset_declaring_no_totals_rejects_any_name(self, settings, authenticated_client, page_data):
        """TimesheetViewSet declares no `column_totals`, so there is nothing to name."""
        url = reverse("timesheet.timesheet-list")
        response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "hours"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
        assert response.data[settings.COLUMN_TOTALS_PARAM] == [
            "Invalid column total 'hours'.  This endpoint declares no column totals."
        ]

    def test_retrieve_rejects_the_totals_param(self, settings, authenticated_client, page_data):
        """Totals are a `list` concept; `retrieve` returns one object and has nothing to total."""
        entry = page_data.first()
        url = reverse("timesheet.timesheetentry-detail", kwargs={"pk": entry.pk})
        response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "hours"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
        assert response.data[settings.COLUMN_TOTALS_PARAM] == ["Invalid query parameter.  Valid filters are e, f, om."]

    def test_param_name_follows_the_setting(self, settings, authenticated_client, page_data):
        """Nothing hard-codes the literal, so a project renaming the parameter renames it everywhere."""
        settings.COLUMN_TOTALS_PARAM = "totals"
        url = reverse("timesheet.timesheetentry-list")

        response = authenticated_client.get(url, data={"totals": "hours"}, format="json")
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {"hours": self.EXPECTED_HOURS}, response_body(response)

        response = authenticated_client.get(url, data={"ct": "hours"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
        assert "ct" in response.data


@pytest.mark.django_db
class TestRelationColumnTotals(BaseTestCommonModelViewSet):
    """Totals on a viewset declaring two, one of them a relation path under a name of its own.

    `tests.store.viewsets.CartItemViewSet` declares
    `{"quantity": "quantity", "product_price": "product_option__price"}`, which is what makes
    "only what was requested" and "the response key is the declared name" observable.

    As above, each response is compared as a whole mapping against the numbers `page_data` adds up
    to. Comparing two responses to each other -- which is what the equivalence tests below are
    about -- would pass just as well if both were wrong in the same way, so those compare against
    the expected values too.
    """

    # Over the two cart items `page_data` creates: quantities 2 + 5, prices 9.99 + 20.01. The price
    # total sums the related column once per cart item row, which is what a forward foreign key
    # gives and what the totals footer shows under the `product_price` column.
    EXPECTED_QUANTITY = 7
    EXPECTED_PRICE = Decimal("30.00")
    EXPECTED_BOTH: ClassVar[dict] = {"quantity": EXPECTED_QUANTITY, "product_price": EXPECTED_PRICE}

    groups_to_create: ClassVar[dict] = {
        "Cart Lister": [
            ("store", "CartItem", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Cart Lister"],
        },
    }

    @pytest.fixture
    def page_data(self):
        customer = Customer.objects.create(user=self.users["test_admin@domain.invalid"])
        cart = Cart.objects.create(customer=customer)
        cheap, dear = create_product_options("9.99", "20.01")
        CartItem.objects.create(cart=cart, product_option=cheap, quantity=2)
        CartItem.objects.create(cart=cart, product_option=dear, quantity=5)
        return CartItem.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])
        return api_client

    @pytest.fixture
    def url(self):
        return reverse("store.cartitem-list")

    def test_requesting_one_total_aggregates_only_that_one(self, settings, authenticated_client, page_data, url):
        with CaptureQueriesContext(connection) as captured:
            response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "quantity"}, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {"quantity": self.EXPECTED_QUANTITY}, response_body(response)
        assert sum_expression_count(captured) == 1, [query["sql"] for query in captured.captured_queries]

    def test_relation_path_total_keeps_its_declared_name(self, settings, authenticated_client, page_data, url):
        """`product_option__price` is summed; `product_price` is what the client sees."""
        response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "product_price"}, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {"product_price": self.EXPECTED_PRICE}, response_body(response)
        # The related column's own scale survives the aggregate, which `Decimal("30")` would not show.
        assert str(response.data["columnTotals"]["product_price"]) == "30.00"

    def test_wildcard_requests_both_totals(self, settings, authenticated_client, page_data, url):
        """Both spellings in one test: they are the same branch, and `page_data` is expensive enough
        that parametrizing would cost a second build of it to exercise one more string."""
        for wildcard in ("*", "~all"):
            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: wildcard}, format="json")

            sqls = [query["sql"] for query in captured.captured_queries]
            assert response.status_code == status.HTTP_200_OK, response_body(response)
            assert response.data["columnTotals"] == self.EXPECTED_BOTH, f"{wildcard}: {response_body(response)}"
            assert sum_expression_count(captured) == 2, f"{wildcard}: {sqls}"  # noqa: PLR2004

    def test_how_the_parameter_is_parsed(self, settings, authenticated_client, page_data, url):
        """Repeating the parameter, comma-separating one value, and naming a total twice.

        All three are one reading of the same parameter, so they are asserted together rather than
        rebuilding `page_data` once per spelling.
        """
        repeated = authenticated_client.get(
            url, data={settings.COLUMN_TOTALS_PARAM: ["quantity", "product_price"]}, format="json"
        )
        comma_separated = authenticated_client.get(
            url, data={settings.COLUMN_TOTALS_PARAM: "quantity,product_price"}, format="json"
        )
        with CaptureQueriesContext(connection) as captured:
            duplicated = authenticated_client.get(
                url, data={settings.COLUMN_TOTALS_PARAM: "quantity,quantity"}, format="json"
            )

        assert repeated.status_code == status.HTTP_200_OK, response_body(repeated)
        assert comma_separated.status_code == status.HTTP_200_OK, response_body(comma_separated)
        assert duplicated.status_code == status.HTTP_200_OK, response_body(duplicated)
        assert repeated.data["columnTotals"] == self.EXPECTED_BOTH, response_body(repeated)
        assert comma_separated.data["columnTotals"] == self.EXPECTED_BOTH, response_body(comma_separated)
        # A name sent twice is one total and one SUM, not two of either.
        assert duplicated.data["columnTotals"] == {"quantity": self.EXPECTED_QUANTITY}, response_body(duplicated)
        assert sum_expression_count(captured) == 1, [query["sql"] for query in captured.captured_queries]

    def test_unknown_name_is_rejected(self, settings, authenticated_client, page_data, url):
        """A name the viewset doesn't declare is a mistake in the request whatever else it carries,
        so a wildcard sent alongside it does not excuse it."""
        expected = [
            "Invalid column total 'no_such_total'.  Valid column totals are product_price, quantity. "
            "Or use a wildcard to request all: *, ~all."
        ]
        alone = authenticated_client.get(url, data={settings.COLUMN_TOTALS_PARAM: "no_such_total"}, format="json")
        with_wildcard = authenticated_client.get(
            url, data={settings.COLUMN_TOTALS_PARAM: "*,no_such_total"}, format="json"
        )

        assert alone.status_code == status.HTTP_400_BAD_REQUEST, response_body(alone)
        assert with_wildcard.status_code == status.HTTP_400_BAD_REQUEST, response_body(with_wildcard)
        assert alone.data[settings.COLUMN_TOTALS_PARAM] == expected
        assert with_wildcard.data[settings.COLUMN_TOTALS_PARAM] == expected

    def test_a_total_name_is_not_a_fields_param_value(self, settings, authenticated_client, page_data, url):
        """`f` selects row fields and nothing else; the two parameters never overlap."""
        response = authenticated_client.get(
            url, data={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "product_price"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)

    def test_rows_are_unaffected_by_requesting_totals(self, settings, authenticated_client, page_data, url):
        query = {settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,quantity"}
        without = authenticated_client.get(url, data=query, format="json")
        with_totals = authenticated_client.get(url, data={**query, settings.COLUMN_TOTALS_PARAM: "*"}, format="json")

        assert without.status_code == status.HTTP_200_OK, response_body(without)
        assert with_totals.status_code == status.HTTP_200_OK, response_body(with_totals)
        assert with_totals.data["results"] == without.data["results"]
        assert without.data["columnTotals"] == {}

    def test_a_row_multiplying_path_would_corrupt_the_other_totals(self, page_data):
        """Why `vueda_info.E011` refuses a path through a relation matching more than one row.

        This one goes straight to the ORM rather than through a request, because the declaration it
        describes cannot be made: the check rejects it, so there is no viewset to send `?ct=` to.
        What it records is the reason the check exists, in numbers.

        `Sum("id")` over one cart is that cart's id. Add `Sum("cart_items__quantity")` to the *same*
        `aggregate()` call and the reverse foreign key joins a row per cart item, so the id total is
        multiplied by the number of cart items -- a total that named no relation, returned wrong,
        with no error anywhere. Counting `SUM(` expressions would show two either way, which is why
        the request-level tests above compare values rather than shapes.
        """
        cart = Cart.objects.get()
        cart_item_count = CartItem.objects.count()
        assert cart_item_count > 1, "the hazard needs more than one related row to show"

        alone = Cart.objects.aggregate(Sum("id"))
        together = Cart.objects.aggregate(Sum("id"), Sum("cart_items__quantity"))

        assert alone["id__sum"] == cart.pk
        assert together["cart_items__quantity__sum"] == self.EXPECTED_QUANTITY
        assert together["id__sum"] == cart.pk * cart_item_count, (
            f"expected the join to inflate the unrelated total; got {together['id__sum']} against "
            f"{alone['id__sum']} alone. If these now agree, Django stopped joining for multiple "
            "aggregations and the row-multiplying rule in vueda_info.E011 may be relaxable."
        )

    def test_totals_cover_every_page(self, settings, authenticated_client, page_data, url):
        """Aggregation still runs after the filter backends and before pagination."""
        response = authenticated_client.get(
            url,
            data={settings.COLUMN_TOTALS_PARAM: "quantity", settings.PAGE_SIZE_QUERY_PARAM: 1},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert len(response.data["results"]) == 1
        assert response.data["totalRecords"] == 2  # noqa: PLR2004
        # One row on the page, both rows in the total.
        assert response.data["columnTotals"] == {"quantity": self.EXPECTED_QUANTITY}, response_body(response)


@pytest.mark.django_db
class TestFilteredColumnTotals(BaseTestCommonModelViewSet):
    """Totals on a viewset declaring three, behind a filterset.

    `tests.store.viewsets.InventoryRecordViewSet` declares
    `{"quantity": "quantity", "cost": "cost", "unit_price": "product_option__price"}`, and its
    filterset requires `is_added`, so every request here narrows the set to one half of the rows.
    That is what makes the documented guarantee observable as numbers rather than as shape: the
    same three declared totals come back with different values depending on what the filter left.
    """

    groups_to_create: ClassVar[dict] = {
        "Inventory Lister": [
            ("store", "InventoryRecord", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Inventory Lister"],
        },
    }

    # The two added records: quantities 6 + 12, costs 10 + 20, option prices 9.99 + 20.01.
    ADDED_TOTALS: ClassVar[dict] = {"quantity": 18, "cost": Decimal("30"), "unit_price": Decimal("30.00")}
    # The one removed record.
    REMOVED_TOTALS: ClassVar[dict] = {"quantity": 6, "cost": Decimal("5"), "unit_price": Decimal("9.99")}

    @pytest.fixture
    def page_data(self):
        cheap, dear = create_product_options("9.99", "20.01")
        received = InventoryRecordReason.objects.create(
            name="Totals Received", code="totals_received", is_added_reason=True
        )
        damaged = InventoryRecordReason.objects.create(
            name="Totals Damaged", code="totals_damaged", is_added_reason=False
        )
        InventoryRecord.objects.create(product_option=cheap, reason=received, is_added=True, quantity=6, cost="10")
        InventoryRecord.objects.create(product_option=dear, reason=received, is_added=True, quantity=12, cost="20")
        InventoryRecord.objects.create(product_option=cheap, reason=damaged, is_added=False, quantity=6, cost="5")
        return InventoryRecord.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_admin@domain.invalid"])
        return api_client

    @pytest.fixture
    def url(self):
        return reverse("store.inventoryrecord-list")

    def test_totals_describe_the_filtered_set(self, settings, authenticated_client, page_data, url):
        added = authenticated_client.get(
            url, data={"is_added": "true", settings.COLUMN_TOTALS_PARAM: "*"}, format="json"
        )
        removed = authenticated_client.get(
            url, data={"is_added": "false", settings.COLUMN_TOTALS_PARAM: "*"}, format="json"
        )

        assert added.status_code == status.HTTP_200_OK, response_body(added)
        assert removed.status_code == status.HTTP_200_OK, response_body(removed)
        assert len(added.data["results"]) == 2, response_body(added)  # noqa: PLR2004
        assert len(removed.data["results"]) == 1, response_body(removed)
        assert added.data["columnTotals"] == self.ADDED_TOTALS, response_body(added)
        assert removed.data["columnTotals"] == self.REMOVED_TOTALS, response_body(removed)
        # `model_column_totals` advertises the names in declaration order and the response uses the
        # same order, so a client can line the two up without sorting either.
        assert list(added.data["columnTotals"]) == ["quantity", "cost", "unit_price"], response_body(added)

    def test_requesting_one_of_three_totals_adds_one_sum(self, settings, authenticated_client, page_data, url):
        with CaptureQueriesContext(connection) as captured:
            response = authenticated_client.get(
                url, data={"is_added": "true", settings.COLUMN_TOTALS_PARAM: "cost"}, format="json"
            )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["columnTotals"] == {"cost": self.ADDED_TOTALS["cost"]}, response_body(response)
        assert sum_expression_count(captured) == 1, [query["sql"] for query in captured.captured_queries]

    def test_a_total_over_a_queryset_annotation(self, settings, authenticated_client, page_data):
        """`InventoryRecordAnnotatedColumnTotalsViewSet` totals `line_total`, which its own
        `get_queryset` annotates as `product_option__price * quantity` rather than a column the
        model has.

        The annotation reaches through a foreign key, so it is summed over the queryset it belongs
        to. Moving it onto the rows re-selected by primary key would compile to SQL naming
        `store_productoption` without joining it, which the database rejects.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_inventory_record_annotated_totals"
        url = reverse("store.inventoryrecord-list")

        response = authenticated_client.get(
            url, data={"is_added": "true", settings.COLUMN_TOTALS_PARAM: "line_total"}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        # The two added records: 6 * 9.99 + 12 * 20.01.
        assert response.data["columnTotals"] == {"line_total": Decimal("300.06")}, response_body(response)


@pytest.mark.django_db
class TestColumnTotalsQueryShapes:
    """Totals over declarations and list querysets that `aggregate()` cannot take at face value.

    These call `get_column_info` directly with a queryset built here, because each one needs a
    declaration or a queryset shape that no registered viewset has a reason to carry.

    The rows: reason A holds quantities 2 and 10 (in that insertion order), reason B holds 5.
    """

    ALL_QUANTITY = 17

    @pytest.fixture
    def records(self):
        (option,) = create_product_options("1.00")
        reason_a = InventoryRecordReason.objects.create(name="Shape A", code="shape_a", is_added_reason=True)
        reason_b = InventoryRecordReason.objects.create(name="Shape B", code="shape_b", is_added_reason=True)
        InventoryRecord.objects.create(product_option=option, reason=reason_a, is_added=True, quantity=2)
        InventoryRecord.objects.create(product_option=option, reason=reason_a, is_added=True, quantity=10)
        InventoryRecord.objects.create(product_option=option, reason=reason_b, is_added=True, quantity=5)
        return InventoryRecord.objects.all()

    @staticmethod
    def column_info(column_totals, queryset):
        viewset = InventoryRecordViewSet()
        viewset.column_totals = column_totals
        return viewset.get_column_info(queryset, tuple(column_totals))

    @pytest.mark.parametrize(
        "column_totals",
        [{"quantity": "quantity", "duplicate": "quantity"}, {"duplicate": "quantity", "quantity": "quantity"}],
        ids=["own-name-first", "own-name-second"],
    )
    def test_two_totals_over_one_field(self, records, column_totals):
        """A total named after its field must not become what another total over that field sums."""
        assert self.column_info(column_totals, records) == dict.fromkeys(column_totals, self.ALL_QUANTITY)

    def test_an_annotation_named_like_a_generated_alias(self, records):
        queryset = records.annotate(_column_total_0=F("quantity") * 2)

        assert self.column_info({"value": "_column_total_0"}, queryset) == {"value": self.ALL_QUANTITY * 2}

    def test_one_row_per_group_totals_the_rows_listed(self, records):
        """`DISTINCT ON (reason)` keeps the newest record per reason, 10 and 5, so the totals must
        cover those two rather than every record that matched."""
        queryset = records.annotate(double_quantity=F("quantity") * 2).order_by("reason", "-id").distinct("reason")
        assert [record.quantity for record in queryset] == [10, 5]

        assert self.column_info({"quantity": "quantity", "double_quantity": "double_quantity"}, queryset) == {
            "quantity": 15,
            "double_quantity": 30,
        }

    def test_one_row_per_group_by_an_annotation_is_rejected(self, records):
        """A primary key subquery cannot carry an annotation the selection is made by, so such a
        request fails naming the cause rather than totalling rows the list does not show."""
        queryset = records.annotate(bucket=F("quantity") / 6).order_by("bucket", "-id").distinct("bucket")

        with pytest.raises(NotImplementedError, match="'bucket'"):
            self.column_info({"quantity": "quantity"}, queryset)
