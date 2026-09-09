import datetime
import json
from http import HTTPStatus
from typing import ClassVar
from typing import TypedDict

import pytest
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.db.models import Prefetch
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.exceptions import ErrorDetail
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.viewsets import ReadOnlyModelViewSet

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestModelViewSet
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.employee.models import Employee
from tests.product.models import Product
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.timesheet import serializers as timesheet_serializers
from tests.timesheet.models import Timesheet
from tests.timesheet.models import TimesheetEntry
from tests.timesheet.viewsets import TimesheetViewSet
from tests.unit.info.utils import create_test_data
from tests.utils import object_revision_of
from vueda import info
from vueda.core.exceptions import VuedaValidationError
from vueda.core.serializers import ensure_flex_fields_applied
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.core.viewsets import VuedaViewSet
from vueda.core.viewsets import build_prefetch_plan
from vueda.core.viewsets import filter_new_prefetch_lookups


class StoreTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """
    The store objects the flex-fields viewset tests below retrieve, and the customer who is allowed
    to retrieve them. Only `read` is granted, because every test here is a GET of a single record:
    `ObjectPermissions` maps that to `read_<model>`.
    """

    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("store", "CustomerOrder", "read"),
            ("store", "Product", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        # Needed by create_test_data, which attaches a customer to this user. Nothing
        # authenticates as them, so they need no group of their own.
        "test_customer_2@domain.invalid": {
            "name": "Test Customer 2",
            "password": "testpass",
        },
    }

    def __init__(self):
        create_test_data(self)


def test_vueda_read_only_viewset_excludes_write_actions():
    assert hasattr(VuedaReadOnlyViewSet, "list")
    assert hasattr(VuedaReadOnlyViewSet, "retrieve")
    assert not hasattr(VuedaReadOnlyViewSet, "create")
    assert not hasattr(VuedaReadOnlyViewSet, "update")
    assert not hasattr(VuedaReadOnlyViewSet, "partial_update")
    assert not hasattr(VuedaReadOnlyViewSet, "destroy")


def test_vueda_viewset_warns_when_combined_with_read_only_viewset():
    with pytest.warns(RuntimeWarning, match="inherits from both VuedaViewSet and ReadOnlyModelViewSet"):

        class InvalidCombinedViewSet(VuedaViewSet, ReadOnlyModelViewSet):
            pass

    assert InvalidCombinedViewSet is not None


def test_filter_new_prefetch_lookups_drops_a_bare_string_duplicate():
    queryset = Timesheet.objects.prefetch_related("timesheet_entries")
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert filter_new_prefetch_lookups(queryset, plan) == []


def test_filter_new_prefetch_lookups_drops_a_prefetch_object_duplicate():
    queryset = Timesheet.objects.prefetch_related(Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all()))
    plan = ["timesheet_entries"]

    assert filter_new_prefetch_lookups(queryset, plan) == []


def test_filter_new_prefetch_lookups_keeps_a_non_overlapping_lookup():
    queryset = Timesheet.objects.prefetch_related("timesheet_entries")
    other_lookup = Prefetch("events", queryset=Timesheet.pgh_event_model.objects.all())

    assert filter_new_prefetch_lookups(queryset, [other_lookup]) == [other_lookup]


def test_filter_new_prefetch_lookups_drops_a_plan_entry_the_existing_lookup_passes_through():
    # "timesheet_entries__timesheet" registers "timesheet_entries" as its own cache key while
    # Django walks it one level at a time, even though "timesheet_entries" never appears as a
    # standalone lookup here -- the plan entry must be dropped by that cache key, not by comparing
    # whole lookup paths.
    queryset = Timesheet.objects.prefetch_related("timesheet_entries__timesheet")
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert filter_new_prefetch_lookups(queryset, plan) == []


def test_filter_new_prefetch_lookups_drops_a_second_plan_entry_for_the_same_path():
    # Two plan entries for the same lookup collide with each other exactly as a plan entry and an
    # existing lookup do; the first is kept and the second dropped rather than both reaching
    # queryset.prefetch_related() and raising at evaluation time.
    queryset = Timesheet.objects.all()
    first = Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.filter(hours__gt=0))
    second = Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())

    assert filter_new_prefetch_lookups(queryset, [first, second]) == [first]


def test_filter_new_prefetch_lookups_keeps_a_plan_entry_the_existing_lookup_renamed_with_to_attr():
    # The existing lookup's cache key is its to_attr ("raw_timesheet_entries"), not its lookup path
    # ("timesheet_entries"), so it does not collide with a plan entry for the same path under the
    # relation's default attribute name.
    queryset = Timesheet.objects.prefetch_related(
        Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all(), to_attr="raw_timesheet_entries")
    )
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert filter_new_prefetch_lookups(queryset, plan) == plan


def expanded_serializer(serializer_class, expand):
    """Build ``serializer_class`` with ``expand`` applied, the way a request's ``?e=`` applies it.

    ``build_prefetch_plan`` reads ``serializer.fields``, and an expandable field only becomes a
    nested serializer field once ``rest_flex_fields`` has processed the request, so an unexpanded
    serializer yields an empty plan rather than the one under test.
    """
    request = Request(APIRequestFactory().get("/", {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: expand}))
    serializer = serializer_class(context={"request": request})
    ensure_flex_fields_applied(serializer)

    return serializer


def prefetch_for(prefetch_related, lookup):
    for entry in prefetch_related:
        if isinstance(entry, Prefetch) and entry.prefetch_through == lookup:
            return entry

    raise AssertionError(f"no Prefetch for {lookup!r} in {prefetch_related!r}")


def test_build_prefetch_plan_annotates_formatted_name_on_a_to_many_prefetch_queryset():
    # OrderItem resolves formatted_name through formatted_name_lookup_expression and stores no
    # column of its own, so the Prefetch queryset the plan builds has to carry the annotation.
    # Without it VuedaListSerializer.to_representation re-annotates the queryset serving the
    # prefetched relation, which clones it, drops the cached prefetch result, and costs one query
    # per row. The rendered formatted_name stays correct either way, because _get_formatted_name
    # resolves it per instance when the annotation is missing, so the value proves nothing here and
    # the annotation's presence is what this asserts.
    serializer = expanded_serializer(store_serializers.CustomerOrderSerializer, "order_items")

    _, prefetch_related = build_prefetch_plan(serializer, store_models.CustomerOrder)

    annotations = prefetch_for(prefetch_related, "order_items").queryset.query.annotations

    assert "formatted_name" in annotations


def test_build_prefetch_plan_leaves_a_stored_formatted_name_unannotated():
    # TimesheetEntry.formatted_name is a stored GeneratedField, so the plan must leave it alone.
    # Annotating every to-many prefetch unconditionally would satisfy the test above while shadowing
    # a real column here, which is the case annotate_formatted_name's lookup-expression check exists
    # to skip.
    serializer = expanded_serializer(timesheet_serializers.TimesheetWithAliasedEntriesSerializer, "entries")

    _, prefetch_related = build_prefetch_plan(serializer, Timesheet)

    annotations = prefetch_for(prefetch_related, "timesheet_entries").queryset.query.annotations

    assert "formatted_name" not in annotations


@pytest.mark.django_db
class TestProductViewSet(BaseTestModelViewSet):
    model = Product
    has_delete_permission = False

    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "Product", "read"),
            ("product", "Product", "list"),
            ("product", "Product", "create"),
            ("product", "Product", "update"),
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

    list_keys_arguments = {
        "name",
        "available_for_sale",
        "buzz_words",
    }

    page_data_arguments = (
        {
            "name": "Apple",
            "formatted_name": "Apple",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Local"),
        },
        {
            "name": "Banana",
            "formatted_name": "Banana",
            "available_for_sale": False,
            "buzz_words": ("Hand-held", "Tropical"),
        },
        {
            "name": "Mango",
            "formatted_name": "Mango",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Tasty", "Tropical"),
        },
        {
            "name": "Orange",
            "formatted_name": "Orange",
            "available_for_sale": False,
            "buzz_words": ("Organic", "Citrus", "Tangy", "Local"),
        },
    )

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@domain.invalid"]
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
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local", "Fresh"],
            "object_revision": object_revision_of(instance),
            "id": instance.id,
            "name": "Apple",
        }

    @pytest.fixture
    def create_arguments(self):
        return {
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local"],
            "name": "Apple",
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local"],
            "object_revision": object_revision_of(instance),
            "formatted_name": "Apple",
            "id": instance.id,
            "name": "Apple",
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)
        expected_create_response["formatted_name"] = expected_create_response["name"]

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)
        expected_retrieve_response["formatted_name"] = expected_retrieve_response["name"]

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)
        expected_update_response["formatted_name"] = expected_update_response["name"]

    def test_list_with_invalid_filter_returns_400(self, page_data, authenticated_client, list_querystring):
        list_querystring["nonexistent_filter"] = "value"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "nonexistent_filter" in response.data
        assert any("Invalid query parameter" in str(msg) for msg in response.data["nonexistent_filter"]), (
            f"nonexistent_filter data: {response.data['nonexistent_filter']}"
        )

    def test_list_with_multiple_invalid_filters_returns_all(self, page_data, authenticated_client, list_querystring):
        list_querystring["bad_one"] = "x"
        list_querystring["bad_two"] = "y"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "bad_one" in response.data
        assert "bad_two" in response.data

    def test_list_with_valid_filter_succeeds(self, page_data, authenticated_client, list_querystring):
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)

    def test_list_with_invalid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "object_revision"}.union(self.list_keys_arguments)

        # Do we have a workflow?
        if hasattr(self.model, "workflow"):
            keys.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

        list_querystring[settings.REST_FLEX_FIELDS["EXPAND_PARAM"]] = "supervisor"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "supervisor" in response.data
        assert len(response.data["supervisor"]) == 1, f"supervisor data: {response.data['supervisor']}"
        assert "message" in response.data["supervisor"][0], f"supervisor data: {response.data['supervisor'][0]}"
        assert str(response.data["supervisor"][0]["message"]) == "Invalid expands. No expands are permitted.", (
            f"supervisor message: {response.data['supervisor'][0]['message']}"
        )

    def test_bulk_destroy_without_delete_permission(self, page_data, authenticated_client):
        pks = list(page_data.values_list("pk", flat=True))

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
        assert self.model.objects.filter(pk__in=pks).count() == len(pks)

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()
        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "second_history_entry"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "second_history_entry" in response.data
        assert len(response.data["second_history_entry"]) == 1, (
            f"second_history_entry data: {response.data['second_history_entry']}"
        )
        assert "message" in response.data["second_history_entry"][0], (
            f"second_history_entry data: {response.data['second_history_entry'][0]}"
        )
        assert (
            str(response.data["second_history_entry"][0]["message"]) == "Invalid expands. No expands are permitted."
        ), f"second_history_entry message: {response.data['second_history_entry'][0]['message']}"
        assert "history" not in response.data


@pytest.mark.django_db
class TestStoreProductViewSet:
    @pytest.fixture
    def test_data(self):
        return StoreTestData()

    def test_retrieve_with_two_depth_invalid_expand(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "distributor.brands",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "distributor.brands" in response.data
        assert len(response.data["distributor.brands"]) == 1, (
            f"distributor.brands data: {response.data['distributor.brands']}"
        )
        assert "message" in response.data["distributor.brands"][0], (
            f"distributor.brands data: {response.data['distributor.brands'][0]}"
        )
        assert (
            str(response.data["distributor.brands"][0]["message"])
            == "Invalid expands. Permitted expands are distributor. Or use a wildcard to expand all: *, ~all, distributor.*, distributor.~all"
        ), f"distributor.brands message: {response.data['distributor.brands'][0]['message']}"
        assert "history" not in response.data

    def test_retrieve_with_two_depth_invalid_field(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "distributor",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "distributor.brands",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "distributor.brands" in response.data
        assert len(response.data["distributor.brands"]) == 1, (
            f"distributor.brands data: {response.data['distributor.brands']}"
        )
        assert "message" in response.data["distributor.brands"][0], (
            f"distributor.brands data: {response.data['distributor.brands'][0]}"
        )
        assert (
            str(response.data["distributor.brands"][0]["message"])
            == "Invalid field.  Valid fields are available_actions, current_sale_date, description, disabled, distributor, distributor.available_actions, distributor.description, distributor.formatted_name, distributor.id, distributor.name, distributor.object_revision, formatted_name, future_sale_dates, id, internal_comments, last_ordered, last_ten_order_betweens, name, object_revision, order_between, reviews, special_care, tangible_type. Or use a wildcard to specify all: *, ~all, distributor.*, distributor.~all"
        ), f"distributor.brands message: {response.data['distributor.brands'][0]['message']}"
        assert "history" not in response.data


@pytest.mark.django_db
class TestExpandingThroughRegisteredSerializer(BaseTestAssertResponseMixin):
    @pytest.fixture
    def test_data(self):
        return StoreTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)
        info.register(store_serializers.OptionTypeSerializer, store_viewsets.OptionTypeViewSet)
        info.register(store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet)
        info.register(store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet)
        info.register_serializer(store_serializers.OrderItemSerializer)

    def test_expand_through(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.customer_orders))
        obj = test_data.customer_orders[key]

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": obj.pk}),
            data={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: (
                    "*,order_items.*,order_items.product_option.*,order_items.product_option.product.*"
                ),
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "order_items.product_option.product",
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert {
            "id",
            "order_number",
            "when",
            "customer",
            "order_items",
            "order_state",
            "shipping_method",
            "formatted_name",
            "object_revision",
            "valid_transitions",
            "workflow_state_code",
            "workflow_state_name",
        } == frozenset(response.data.keys())
        assert isinstance(response.data["customer"], int)
        assert isinstance(response.data["order_items"], list)
        assert {"id", "customer_order", "product_option", "quantity", "formatted_name", "object_revision"} == frozenset(
            response.data["order_items"][0].keys()
        )
        assert isinstance(response.data["order_items"][0]["customer_order"], int)
        assert isinstance(response.data["order_items"][0]["product_option"], dict)
        assert {
            "product",
            "gtin",
            "id",
            "disabled",
            "price",
            "formatted_name",
            "option_type",
            "name",
            "sku",
            "quantity_available",
            "object_revision",
        } == frozenset(response.data["order_items"][0]["product_option"])
        assert isinstance(response.data["order_items"][0]["product_option"]["product"], dict)


@pytest.mark.django_db
class TestStoreCustomerOrderViewSet:
    @pytest.fixture
    def test_data(self):
        return StoreTestData()

    def test_expand_exceeds_depth(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.customer_orders))
        obj = test_data.customer_orders[key]

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": obj.pk}),
            data={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: (
                    "*,"
                    "order_items.*,"
                    "order_items.customer_order.*,"
                    "order_items.customer_order.product_option.*,"
                    "order_items.customer_order.product_option.product.*,"
                ),
                settings.REST_FLEX_FIELDS[
                    "EXPAND_PARAM"
                ]: "order_items.customer_order.order_items.product_option.product",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "non_field_errors" in response.data
        assert len(response.data["non_field_errors"]) == 1, (
            f"non_field_errors data: {response.data['non_field_errors']}"
        )
        assert "Expansion depth exceeded" in response.data["non_field_errors"]


@pytest.mark.django_db
class TestTimesheetViewSet(BaseTestModelViewSet):
    model = Timesheet
    has_delete_permission = True

    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("timesheet", "Timesheet", "read"),
            ("timesheet", "Timesheet", "list"),
            ("timesheet", "Timesheet", "create"),
            ("timesheet", "Timesheet", "update"),
            ("timesheet", "Timesheet", "delete"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }

    list_keys_arguments = {
        "period_start",
        "period_end",
        "employee",
        "supervisor",
    }

    @pytest.fixture
    def page_data(self):
        self.employee_1 = employee_1 = Employee.objects.create(
            user=self.users["test_admin@domain.invalid"],
            employee_number="1",
        )
        employee_2 = Employee.objects.create(
            user=self.users["test_admin@domain.invalid"],
            employee_number="2",
        )
        self.supervisor_1 = supervisor_1 = Employee.objects.create(
            user=self.users["test_admin@domain.invalid"],
            employee_number="3",
        )
        for data in (
            {
                "period_start": datetime.date(2024, 1, 1),
                "period_end": datetime.date(2024, 1, 15),
                "employee": employee_1,
                "supervisor": None,
            },
            {
                "period_start": datetime.date(2024, 1, 16),
                "period_end": datetime.date(2024, 1, 31),
                "employee": employee_1,
                "supervisor": supervisor_1,
            },
            {
                "period_start": datetime.date(2024, 2, 1),
                "period_end": datetime.date(2024, 2, 15),
                "employee": employee_2,
                "supervisor": None,
            },
            {
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 29),
                "employee": employee_2,
                "supervisor": supervisor_1,
            },
        ):
            self.model.objects.create(**data)
        return self.model.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def list_querystring(self, page_data):
        ids = tuple(page_data.values_list("pk", flat=True))
        return {"id": ids}

    @pytest.fixture
    def update_arguments(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "employee": self.employee_1.id,
            "id": instance.id,
            "period_end": datetime.date(2024, 1, 15).strftime("%Y-%m-%d"),
            "period_start": datetime.date(2024, 1, 1).strftime("%Y-%m-%d"),
            "supervisor": self.supervisor_1.id,
        }

    @pytest.fixture
    def create_arguments(self):
        return {
            "employee": self.employee_1.id,
            "period_end": datetime.date(2024, 3, 15).strftime("%Y-%m-%d"),
            "period_start": datetime.date(2024, 3, 1).strftime("%Y-%m-%d"),
            "supervisor": None,
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "id": instance.id,
            "employee": self.employee_1.id,
            "period_end": datetime.date(2024, 1, 15).strftime("%Y-%m-%d"),
            "period_start": datetime.date(2024, 1, 1).strftime("%Y-%m-%d"),
            "supervisor": None,
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)

        period_start = new_instance.period_start
        period_end = new_instance.period_end
        formatted_name = f"{new_instance.employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_create_response["formatted_name"] = formatted_name

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)

        period_start = instance.period_start
        period_end = instance.period_end
        formatted_name = f"{instance.employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_retrieve_response["formatted_name"] = formatted_name

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)

        period_start = updated_instance.period_start
        period_end = updated_instance.period_end
        formatted_name = f"{updated_instance.employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_update_response["formatted_name"] = formatted_name

    def test_list_with_valid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "object_revision", "formatted_name"}.union(self.list_keys_arguments)

        # Do we have a workflow?
        if hasattr(self.model, "workflow"):
            keys.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

        list_querystring[settings.REST_FLEX_FIELDS["EXPAND_PARAM"]] = "employee,supervisor"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        response_info = {x: y for x, y in response.data.items() if x == "results"}
        object_revision = response_info["results"][0]["object_revision"]
        assert object_revision is not None
        assert keys == set(response_info["results"][0].keys())
        assert {x["id"] for x in response_info["results"]} == set(list_querystring["id"])

    def test_list_with_invalid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "object_revision"}.union(self.list_keys_arguments)

        # Do we have a workflow?
        if hasattr(self.model, "workflow"):
            keys.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

        list_querystring[settings.REST_FLEX_FIELDS["EXPAND_PARAM"]] = "employee,guardian"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "guardian" in response.data
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert "message" in response.data["guardian"][0], f"guardian data: {response.data['guardian'][0]}"
        assert (
            str(response.data["guardian"][0]["message"])
            == "Invalid expands. Permitted expands are employee, supervisor. Or use a wildcard to expand all: *, ~all"
        ), f"guardian message: {response.data['guardian'][0]['message']}"
        assert "employee" not in response.data

    def test_retrieve_with_valid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,supervisor"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)
        self.update_expected_retrieve_response(expected_retrieve_response, instance)
        employee = instance.employee
        expected_retrieve_response["employee"] = {
            "employee_number": employee.employee_number,
            "formatted_name": str(employee.employee_number),
            "id": employee.id,
            "user": employee.user_id,
            # An expanded object carries no revision. Only the queryset the view builds is
            # annotated, and a relation resolved through select_related is not.
            "object_revision": None,
        }
        period_start = instance.period_start
        period_end = instance.period_end
        formatted_name = f"{employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_retrieve_response["formatted_name"] = formatted_name

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert expected_retrieve_response == response.data

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,guardian"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "guardian" in response.data
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert "message" in response.data["guardian"][0], f"guardian data: {response.data['guardian'][0]}"
        assert (
            str(response.data["guardian"][0]["message"])
            == "Invalid expands. Permitted expands are employee, foo, supervisor, timesheet_entry. Or use a wildcard to expand all: *, ~all"
        ), f"guardian message: {response.data['guardian'][0]['message']}"
        assert "employee" not in response.data

    def test_destroy_dry_run_skips_commit(self, page_data, authenticated_client):
        instance = page_data.first()

        response = authenticated_client.delete(self.detail_url(instance.id), HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert self.model.objects.filter(pk=instance.pk).exists()

    def test_destroy_dry_run_returns_validation_error(self, page_data, authenticated_client, monkeypatch):
        def fail_validation(self, objs):
            raise VuedaValidationError({"detail": ["Destroy validation failed."]})

        monkeypatch.setattr(TimesheetViewSet, "destroy_validation", fail_validation)

        instance = page_data.first()
        response = authenticated_client.delete(self.detail_url(instance.id), HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert self.model.objects.filter(pk=instance.pk).exists()

    def test_destroy_returns_no_content_for_detailed(self, page_data, authenticated_client):
        instance = page_data.first()
        response = authenticated_client.delete(self.detail_url(instance.id))

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert not self.model.objects.filter(pk=instance.pk).exists()

    def test_bulk_destroy_returns_no_content(self, page_data, authenticated_client):
        initial_count = self.model.objects.count()
        pks = list(page_data.values_list("pk", flat=True)[:2])

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert self.model.objects.filter(pk__in=pks).count() == 0
        assert self.model.objects.count() == initial_count - len(pks)

    def test_bulk_destroy_with_missing_objects(self, page_data, authenticated_client):
        existing_pk = page_data.first().pk
        missing_pk = max(page_data.values_list("pk", flat=True)) + 100
        pks = [existing_pk, missing_pk]

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        error_key = missing_pk if missing_pk in response.data else str(missing_pk)
        assert error_key in response.data
        assert str(response.data[error_key][0]) == f"Object with pk={missing_pk} does not exist."
        assert self.model.objects.filter(pk=existing_pk).exists()

    def _create_timesheets(self, count):
        supervisor = Employee.objects.create(user=self.users["test_admin@domain.invalid"], employee_number="super")
        for i in range(count):
            employee = Employee.objects.create(user=self.users["test_admin@domain.invalid"], employee_number=f"emp-{i}")
            self.model.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
                supervisor=supervisor,
            )
        return supervisor

    def test_list_with_expands_query_count_does_not_grow_with_row_count(self, authenticated_client):
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,supervisor"}

        # Warm the requesting user's Django permission cache (ModelBackend.get_all_permissions,
        # cached on the user instance for the rest of the test) once, up front, so the one-time cost
        # of the first request against this user doesn't masquerade as a row-count-dependent one.
        authenticated_client.get(self.list_url(), data=query, format="json")

        counts = {}
        for row_count in (2, 10):
            self.model.objects.all().delete()
            supervisor = self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(self.list_url(), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert result["supervisor"]["id"] == supervisor.id
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"expanded list query count grows with row count: {counts}"

    def test_list_with_expand_survives_sparse_fieldset_and_query_count_does_not_grow(self, authenticated_client):
        # "f" (sparse fields) does not name "employee", but requesting it via "e" still renders it
        # (see FlexFieldsWriteableNestedSerializerMixin.apply_flex_fields), so the plan must still
        # cover it.
        query = {
            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee",
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id",
        }

        # See test_list_with_expands_query_count_does_not_grow_with_row_count for why this is needed.
        authenticated_client.get(self.list_url(), data=query, format="json")

        counts = {}
        for row_count in (2, 10):
            self.model.objects.all().delete()
            self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(self.list_url(), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert isinstance(result["employee"], dict)
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, (
            f"expanded list dropped by a sparse fieldset still grows query count with row count: {counts}"
        )


@pytest.mark.django_db
class TestTimesheetWithAliasedSupervisorViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def _create_timesheets(self, count):
        user = self.users["test_user@domain.invalid"]
        supervisor = Employee.objects.create(user=user, employee_number="super")
        for i in range(count):
            employee = Employee.objects.create(user=user, employee_number=f"emp-{i}")
            Timesheet.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
                supervisor=supervisor,
            )
        return supervisor

    def test_list_with_source_aliased_expand_query_count_does_not_grow_with_row_count(self, authenticated_client):
        # "manager" is declared with source="supervisor" (vs. TimesheetViewSet's plain "supervisor"
        # expand), so the plan must resolve it against the model's "supervisor" relation, not a
        # (nonexistent) "manager" attribute.
        url = reverse("timesheet.timesheetmanager-list")
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "manager"}

        counts = {}
        for row_count in (2, 10):
            Timesheet.objects.all().delete()
            supervisor = self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert result["manager"]["id"] == supervisor.id
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"source-aliased expand query count grows with row count: {counts}"


@pytest.mark.django_db
class TestTimesheetWithPrefetchedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithPrefetchedEntriesViewSet.queryset`` hand-declares its own
    ``prefetch_related("timesheet_entries")``, the exact relation "entries" also expands. Before
    ``filter_new_prefetch_lookups``, ``VuedaViewSet.get_queryset()`` would add a second, different
    ``Prefetch`` for the same lookup on top of it, and Django raises ``ValueError`` the moment such
    a queryset is evaluated -- this covers that it no longer does.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def test_list_with_expand_does_not_raise_when_viewset_already_prefetches_the_relation(self, authenticated_client):
        user = self.users["test_user@domain.invalid"]
        employee = Employee.objects.create(user=user, employee_number="1")
        timesheet = Timesheet.objects.create(
            period_start=datetime.date(2024, 1, 1),
            period_end=datetime.date(2024, 1, 15),
            employee=employee,
        )
        entry = TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

        url = reverse("timesheet.timesheetprefetched-list")
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "entries"}
        response = authenticated_client.get(url, data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(response.data["results"]) == 1
        entries = response.data["results"][0]["entries"]
        assert [e["id"] for e in entries] == [entry.id]


@pytest.mark.django_db
class TestTimesheetWithAliasedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithAliasedEntriesViewSet.queryset`` is plain ``Timesheet.objects.all()``, so the
    response is served entirely by the plan ``build_prefetch_plan`` derives -- unlike
    ``TestTimesheetWithPrefetchedEntriesViewSet``, whose viewset's own hand-declared prefetch serves
    the response and never exercises the plan's own ``Prefetch``. This covers the to-many branch's
    query count and its ``formatted_name`` pre-annotation, plus the plan colliding with itself when
    "entries" and "entries_again" both expand the same "timesheet_entries" relation.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def _create_timesheets(self, count):
        user = self.users["test_user@domain.invalid"]
        for i in range(count):
            employee = Employee.objects.create(user=user, employee_number=f"emp-{i}")
            timesheet = Timesheet.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
            )
            TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

    def test_list_with_to_many_expand_query_count_does_not_grow_with_row_count(self, authenticated_client):
        url = reverse("timesheet.timesheetaliasedentries-list")
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "entries"}

        counts = {}
        for row_count in (2, 10):
            Timesheet.objects.all().delete()
            self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert len(result["entries"]) == 1
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to-many expand query count grows with row count: {counts}"

    def test_list_with_both_aliases_of_the_same_relation_does_not_raise(self, authenticated_client):
        row_count = 2
        self._create_timesheets(row_count)

        url = reverse("timesheet.timesheetaliasedentries-list")
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "entries,entries_again"}
        response = authenticated_client.get(url, data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(response.data["results"]) == row_count
        for result in response.data["results"]:
            assert len(result["entries"]) == 1
            assert len(result["entries_again"]) == 1


@pytest.mark.django_db
class TestTimesheetWithDeeperPrefetchedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithDeeperPrefetchedEntriesViewSet.queryset`` hand-declares
    ``prefetch_related("timesheet_entries__timesheet")``, a lookup that passes through -- but never
    equals -- the "entries" expand's own "timesheet_entries" path. Before
    ``filter_new_prefetch_lookups`` compared lookups by cache key rather than by lookup path, this
    combination still raised ``ValueError`` at evaluation time, because Django registers
    "timesheet_entries" as its own cache key while walking the deeper lookup one level at a time --
    this covers that it no longer does.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def test_list_with_expand_does_not_raise_when_viewset_prefetches_through_the_relation(self, authenticated_client):
        user = self.users["test_user@domain.invalid"]
        employee = Employee.objects.create(user=user, employee_number="1")
        timesheet = Timesheet.objects.create(
            period_start=datetime.date(2024, 1, 1),
            period_end=datetime.date(2024, 1, 15),
            employee=employee,
        )
        entry = TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

        url = reverse("timesheet.timesheetdeeperprefetched-list")
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "entries"}
        response = authenticated_client.get(url, data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        entries = response.data["results"][0]["entries"]
        assert [e["id"] for e in entries] == [entry.id]


@pytest.mark.django_db
class TestTimesheetWithToAttrPrefetchedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithToAttrPrefetchedEntriesViewSet.queryset`` hand-declares its own
    "timesheet_entries" prefetch under ``to_attr="raw_timesheet_entries"``, a distinct cache key
    from the "entries" expand's own plan entry (which uses the relation's default attribute name).
    Before ``filter_new_prefetch_lookups`` compared lookups by lookup path rather than cache key,
    the plan entry was dropped as though it collided, silently falling back to one query per row --
    this covers that it now runs and holds a flat query count.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def _create_timesheets(self, count):
        user = self.users["test_user@domain.invalid"]
        for i in range(count):
            employee = Employee.objects.create(user=user, employee_number=f"emp-{i}")
            timesheet = Timesheet.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
            )
            TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

    def test_list_with_expand_query_count_does_not_grow_with_row_count(self, authenticated_client):
        url = reverse("timesheet.timesheettoattrprefetched-list")
        query = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "entries"}

        counts = {}
        for row_count in (2, 10):
            Timesheet.objects.all().delete()
            self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            for result in response.data["results"]:
                assert len(result["entries"]) == 1
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to_attr-prefetched expand query count grows with row count: {counts}"


@pytest.mark.django_db
class TestNoExtraFieldsSerializerMixin(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Updater": [
            ("timesheet", "Timesheet", "create"),
            ("timesheet", "Timesheet", "update"),
        ],
        "Customer Updater": [
            ("store", "Customer", "update"),
        ],
        "CartItem Updater": [
            ("store", "CartItem", "update"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_my_user@domain.invalid": {
            "name": "Test User update",
            "password": "testpass",
            "groups": [
                "Timesheet Updater",
                "Customer Updater",
                "CartItem Updater",
            ],
        },
    }

    def test_update_timesheet_with_existing_field(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "period_start,period_end"},
            ),
            data={
                # ?f= narrows the response, not validation, so the required "employee" relation
                # must still be supplied even though the response won't include it.
                "employee": e1.pk,
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert response.data == {"period_start": "2024-02-16", "period_end": "2024-02-25"}, response.data

    def test_update_timesheet_with_field_param_excluding_required_field_fails_validation(self, api_client):
        """A required relation ("employee") dropped by ?f= must still be required (issue #205):
        ?f= shapes the response, not what the write validates."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "period_start,period_end"},
            ),
            data={
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 400)
        # "serverStack" is debug-only noise the test settings attach to error responses; strip it
        # before comparing so the assertion checks the whole error payload, not just one key.
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {"employee": [ErrorDetail("This field is required.", code="required")]}, response.data

    @pytest.mark.parametrize(
        "param_name,requested",
        [
            ("FIELDS_PARAM", "period_start,period_end"),
            ("OMIT_PARAM", "employee"),
        ],
    )
    def test_create_timesheet_with_field_param_excluding_required_field_fails_validation(
        self, api_client, param_name, requested
    ):
        """A required relation ("employee") dropped by ?f=/?om= must still be required on create
        (issue #205): the parameters shape the response, not what the write validates."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse(
                "timesheet.timesheet-list",
                query={settings.REST_FLEX_FIELDS[param_name]: requested},
            ),
            data={
                "period_start": datetime.date(2024, 3, 1),
                "period_end": datetime.date(2024, 3, 15),
            },
            format="json",
        )

        self.assert_response(response, 400)
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {"employee": [ErrorDetail("This field is required.", code="required")]}, response.data
        assert not Timesheet.objects.filter(period_start=datetime.date(2024, 3, 1)).exists()

    def test_partial_update_timesheet_with_field_param_does_not_bypass_validation(self, api_client):
        """A PATCH still validates a field present in the body even when ?f= excludes it from the
        response (issue #205): sparse fieldset narrows the response, not what gets validated."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.patch(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "period_start"},
            ),
            data={"employee": 999999},  # no employee with this pk
            format="json",
        )

        self.assert_response(response, 400)
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {
            "employee": [ErrorDetail('Invalid pk "999999" - object does not exist.', code="does_not_exist")]
        }, response.data
        t1.refresh_from_db()
        assert t1.employee_id == e1.pk

    @pytest.mark.parametrize(
        "param_name,requested",
        [
            ("FIELDS_PARAM", "period_start"),
            ("OMIT_PARAM", "employee"),
            (None, None),
        ],
    )
    def test_partial_update_timesheet_with_field_param_does_not_require_an_omitted_field(
        self, api_client, param_name, requested
    ):
        """The complement of test_partial_update_timesheet_with_field_param_does_not_bypass_validation:
        a PATCH that never sends "employee" at all still succeeds even though ?f=/?om= also
        excludes "employee" from the response. Sparse-fieldset parameters shape the response only;
        they do not make an absent field required on a partial update (issue #205). The
        (None, None) case is the baseline this compares against: an ordinary PATCH with no
        flex-fields query parameter at all succeeds the same way, which is what shows ?f=/?om= are
        a genuine no-op here rather than coincidentally not breaking anything."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        query = {settings.REST_FLEX_FIELDS[param_name]: requested} if param_name else {}
        response = api_client.patch(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query=query,
            ),
            data={"period_start": datetime.date(2024, 2, 16)},  # employee omitted entirely
            format="json",
        )

        self.assert_response(response, 200)
        # The write succeeds identically in all three cases, but the response narrows
        # per-parameter exactly as it would on a read: ?f= restricts to the requested field,
        # ?om= drops only "employee", and the no-param baseline includes it.
        if param_name == "FIELDS_PARAM":
            assert response.data == {"period_start": "2024-02-16"}, response.data
        elif param_name == "OMIT_PARAM":
            assert "employee" not in response.data, response.data
            assert response.data["period_start"] == "2024-02-16", response.data
        else:
            assert response.data["employee"] == e1.pk, response.data
            assert response.data["period_start"] == "2024-02-16", response.data
        t1.refresh_from_db()
        assert t1.period_start == datetime.date(2024, 2, 16)
        assert t1.employee_id == e1.pk  # unchanged: never supplied, so the partial update left it alone

    def test_update_timesheet_with_non_existing_field(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "period_start,une"},
            ),
            data={
                "employee": e1.pk,
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
                "une": "ssss",
            },
            format="json",
        )

        self.assert_response(response, 400)
        # ?f= no longer narrows the field set that validates the write, so "period_end" -- a real
        # field left out of the requested subset -- validates normally instead of being rejected
        # as an unknown field. The full-payload comparison confirms that: only "une" errors.
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {
            "une": [
                ErrorDetail(
                    "Invalid field.  Valid fields are available_actions, employee, "
                    "formatted_name, id, object_revision, period_end, period_start, supervisor.",
                    code="invalid",
                )
            ]
        }, response.data

    def test_expand_with_existing_expands(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,foo"},
            ),
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-12345"},
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "period_start" in response.data
        assert "period_end" in response.data
        assert "employee" in response.data
        assert "foo" in response.data
        assert "user" in response.data["employee"]

    def test_expand_with_non_existing_expands(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "foo,label10"},
            ),
            data={
                "employee": e1.pk,
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "label10" in response.data

    def test_expand_with_existing_fields(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "period_start,period_end,employee",
                    settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee",
                },
            ),
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-123456"},
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "period_start" in response.data
        assert "period_end" in response.data
        assert "employee" in response.data
        assert "user" in response.data["employee"]

    def test_expand_with_existing_fields_customer(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        c1 = store_models.Customer.objects.create(user=user)

        response = api_client.put(
            reverse(
                "store.customer-detail",
                kwargs={"pk": c1.pk},
                query={
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "user",
                    settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "user",
                },
            ),
            data={"user": {"id": user.pk, "email": user.email, "name": user.name}},
            format="json",
        )

        self.assert_response(response, 200)
        assert "user" in response.data
        assert "email" in response.data["user"]

    def test_expand_with_existing_fields_cart_item(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        customer = store_models.Customer.objects.create(user=user)
        cart = store_models.Cart.objects.create(customer=customer)
        distributor = store_models.Distributor.objects.create(
            name="Test Distributor",
            description="Test Distributor Description",
        )
        tangible_type = store_models.TangibleType.objects.get(code="physical")
        product = store_models.Product.objects.create(
            distributor=distributor,
            name="Test Product",
            tangible_type=tangible_type,
            order_between=(1, 10),
        )
        option_type = store_models.OptionType.objects.get(code="size")
        product_option = store_models.ProductOption.objects.create(
            product=product,
            option_type=option_type,
            name="Test Option",
            sku="TEST-SKU-001",
            gtin="0000000000001",
            price="9.99",
        )
        ci1 = store_models.CartItem.objects.create(
            cart=cart,
            product_option=product_option,
            quantity=1,
        )

        response = api_client.put(
            reverse(
                "store.cartitem-detail",
                kwargs={"pk": ci1.pk},
                query={
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "cart,product_option",
                    settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "product_option",
                },
            ),
            data={
                # ?f= narrows the response, not validation, so the required "quantity" scalar
                # must still be supplied even though the response won't include it.
                "quantity": ci1.quantity,
                "cart": cart.pk,
                "product_option": {
                    "disabled": False,
                    "gtin": product_option.gtin,
                    "id": product_option.pk,
                    "name": product_option.name,
                    "option_type": option_type.pk,
                    "price": product_option.price,
                    "product": product.pk,
                    "quantity_available": 16,
                    "sku": product_option.sku,
                },
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "cart" in response.data
        assert "product_option" in response.data
        assert "name" in response.data["product_option"]

    def test_expand_with_non_existing_fields(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-12348",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "period_start,period_end,employee,invalid_field_name",
                    settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee",
                },
            ),
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-123456"},
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
                "invalid_field_name": "invalid_value",
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "invalid_field_name" in response.data
        assert "period_start" not in response.data


class _OrderItemCompositePKResponse(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["1", "1"]'
    order: int
    product: int
    quantity: int
    formatted_name: str
    available_actions: list[str]


class _OrderItemCompositePKInExpandResponse(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["1", "1"]'
    order: int
    product: int
    quantity: int
    formatted_name: str


class _OrderCompositePKWithExpandResponse(TypedDict):
    id: int
    order_number: str
    order_date: str
    order_items_composite_pks: list[_OrderItemCompositePKInExpandResponse]
    formatted_name: str
    available_actions: list[str]


@pytest.mark.django_db
class TestNoExtraFieldsFormattedNameLookupExpression(
    BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin
):
    groups_to_create: ClassVar[dict] = {
        "Order Updater": [
            ("store", "OrderCompositePK", "update"),
            ("store", "OrderItemCompositePK", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_order_updater@domain.invalid": {
            "name": "Test Order Updater",
            "password": "testpass",
            "groups": ["Order Updater"],
        },
    }

    @pytest.fixture
    def order_item(self):
        product = store_models.ProductCompositePK.objects.create(name="Test Product")
        order = store_models.OrderCompositePK.objects.create(order_number="9999")
        return store_models.OrderItemCompositePK.objects.create(order=order, product=product, quantity=5)

    def test_formatted_name_on_main_model_no_error(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.orderitemcompositepk-detail",
                args=(json.dumps(order_item.pk),),
            ),
            data={"formatted_name": "test value"},
            format="json",
        )

        self.assert_response(response, 200)

        data: _OrderItemCompositePKResponse = response.json()
        assert data["formatted_name"] == "Test Product"

    def test_invalid_field_message_includes_formatted_name_main_model(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.orderitemcompositepk-detail",
                args=(json.dumps(order_item.pk),),
            ),
            data={"xxx_invalid_field": "value"},
            format="json",
        )

        self.assert_response(response, 400)
        assert "xxx_invalid_field" in response.data
        assert "formatted_name" in response.data["xxx_invalid_field"][0]

    def test_formatted_name_on_expanded_model_no_error(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.ordercompositepk-detail",
                kwargs={"pk": order_item.order.pk},
                query={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "order_items_composite_pks"},
            ),
            data={"formatted_name": str(order_item.order.order_number)},
            format="json",
        )

        self.assert_response(response, 200)

        data: _OrderCompositePKWithExpandResponse = response.json()
        assert data["order_items_composite_pks"][0]["formatted_name"] == "Test Product"

    def test_invalid_field_message_includes_formatted_name_expanded_model(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.ordercompositepk-detail",
                kwargs={"pk": order_item.order.pk},
                query={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "order_items_composite_pks"},
            ),
            data={"xxx_invalid_field": "value"},
            format="json",
        )

        self.assert_response(response, 400)
        assert "xxx_invalid_field" in response.data
        assert "formatted_name" in response.data["xxx_invalid_field"][0]


@pytest.mark.django_db
class TestStoreDistributorProxyViewSet(BaseTestModelViewSet):
    model = store_models.DistributorProxy
    has_delete_permission = True

    groups_to_create: ClassVar[dict] = {
        "Distributor Proxy Admin": [
            ("store", "DistributorProxy", "read"),
            ("store", "DistributorProxy", "list"),
            ("store", "DistributorProxy", "create"),
            ("store", "DistributorProxy", "update"),
            ("store", "DistributorProxy", "delete"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_distributor_proxy_admin@domain.invalid": {
            "name": "Test Distributor Proxy Admin",
            "password": "testpass",
            "groups": ["Distributor Proxy Admin"],
        },
    }

    list_keys_arguments = {"name", "description"}

    page_data_arguments = (
        {"name": "Distributor A", "description": "Description A"},
        {"name": "Distributor B", "description": "Description B"},
        {"name": "Distributor C", "description": "Description C"},
    )

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_distributor_proxy_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def list_querystring(self, page_data):
        ids = tuple(page_data.values_list("pk", flat=True))
        return {"id": ids}

    @pytest.fixture
    def create_arguments(self):
        return {
            "name": "Distributor New",
            "description": "New Description",
        }

    @pytest.fixture
    def update_arguments(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "description": "Updated Description",
            "id": instance.id,
            "name": instance.name,
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "description": instance.description,
            "id": instance.id,
            "name": instance.name,
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)
        expected_create_response["formatted_name"] = expected_create_response["name"]

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)
        expected_retrieve_response["formatted_name"] = expected_retrieve_response["name"]

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)
        expected_update_response["formatted_name"] = expected_update_response["name"]


class NoExtraFieldsTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """
    The distributor rows tests/store/migrations/0003_setup_lookup_test_data.py already inserted, plus a
    customer who may both list and retrieve distributors and notes -- the two viewsets
    TestNoExtraFieldsForViewSetMixin drives (one with a filterset_class, one without).

    Nothing is created here: the tests below make their own Note rows, and the distributors come from
    the migration, so this only needs to grant the permissions and hand back the lookup.
    """

    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "Note", "list"),
            ("store", "Note", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }

    def __init__(self):
        self.distributors = {obj.name: obj for obj in store_models.Distributor.objects.all()}


@pytest.mark.django_db
class TestNoExtraFieldsForViewSetMixin(BaseTestAssertResponseMixin):
    """
    DistributorViewSet declares a filterset_class; NoteViewSet does not. Together they cover
    both branches of NoExtraFieldsForViewSetMixin on both list and retrieve.
    """

    @pytest.fixture
    def test_data(self):
        return NoExtraFieldsTestData()

    @pytest.fixture
    def authenticated_client(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_list_with_filterset_class_accepts_valid_filter(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(reverse("store.distributor-list"), data={"name": distributor.name})

        self.assert_response(response, HTTPStatus.OK)
        assert [result["id"] for result in response.data["results"]] == [distributor.pk]

    def test_list_with_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        response = authenticated_client.get(reverse("store.distributor-list"), data={"nosuchparam": "1"})

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == [
            "Invalid query parameter.  Valid filters are id, id__in, name, name__exact, "
            "name_icontains, name_icontains__icontains."
        ]

    def test_retrieve_with_filterset_class_accepts_flex_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "name"},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["name"] == distributor.name

    def test_retrieve_with_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"nosuchparam": "1"},
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == ["Invalid query parameter.  Valid filters are e, f, om."]

    def test_retrieve_with_filterset_class_rejects_filterset_field(self, authenticated_client, test_data):
        """A filterset field name is only recognized on list; retrieve identifies its object by pk alone."""
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"name": distributor.name},
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["name"] == ["Invalid query parameter.  Valid filters are e, f, om."]

    def test_list_without_filterset_class_accepts_extra_allowed_param(self, authenticated_client, test_data):
        """
        NoteViewSet has no filterset_class and permits a list expand, so it can exercise all seven
        get_extra_allowed_fields() params as genuinely valid values, not just recognized keys.
        """
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)

        distributor = test_data.distributors["T-Shirt Corp."]
        note = store_models.Note.objects.create(
            content_type=ContentType.objects.get_for_model(store_models.Distributor),
            object_id=distributor.pk,
            text="A note about the distributor.",
        )

        query = {
            settings.PAGE_QUERY_PARAM: 1,
            settings.PAGE_SIZE_QUERY_PARAM: 10,
            settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,text,content_object.*",
            settings.REST_FLEX_FIELDS["OMIT_PARAM"]: "text",
            settings.REST_FRAMEWORK["SEARCH_PARAM"]: "distributor",
            settings.REST_FRAMEWORK["ORDERING_PARAM"]: "object_id",
        }
        assert set(query) == set(store_viewsets.NoteViewSet.get_extra_allowed_fields()), (
            "query should exercise every param get_extra_allowed_fields() recognizes"
        )

        response = authenticated_client.get(reverse("store.note-list"), data=query)

        self.assert_response(response, HTTPStatus.OK)
        result = next(result for result in response.data["results"] if result["id"] == note.pk)
        assert "text" not in result
        assert result["content_object"]["id"] == distributor.pk

    def test_list_without_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        response = authenticated_client.get(reverse("store.note-list"), data={"nosuchparam": "1"})

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == ["Invalid query parameter.  Valid filters are e, f, o, om, p, ps, s."]

    def test_retrieve_without_filterset_class_accepts_flex_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        note = store_models.Note.objects.create(
            content_type=ContentType.objects.get_for_model(store_models.Distributor),
            object_id=distributor.pk,
            text="A note about the distributor.",
        )
        response = authenticated_client.get(
            reverse("store.note-detail", kwargs={"pk": note.pk}),
            data={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "text"},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["text"] == note.text

    def test_retrieve_without_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        note = store_models.Note.objects.create(
            content_type=ContentType.objects.get_for_model(store_models.Distributor),
            object_id=distributor.pk,
            text="A note about the distributor.",
        )
        response = authenticated_client.get(
            reverse("store.note-detail", kwargs={"pk": note.pk}),
            data={"nosuchparam": "1"},
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == ["Invalid query parameter.  Valid filters are e, f, om."]
