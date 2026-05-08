import datetime
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework.viewsets import ReadOnlyModelViewSet

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestModelViewSet
from tests.models import Employee
from tests.models import Product
from tests.models import Timesheet
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.test_model_info import VuedaTestData
from tests.viewsets import TimesheetViewSet
from vueda import info
from vueda.core.exceptions import VuedaValidationError
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.core.viewsets import VuedaViewSet


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


@pytest.mark.django_db
class TestProductViewSet(BaseTestModelViewSet):
    model = Product
    has_delete_permission = False

    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("tests", "Product", "read"),
            ("tests", "Product", "list"),
            ("tests", "Product", "create"),
            ("tests", "Product", "update"),
            ("tests", "Product", "manage"),
        ],
    }

    users_to_create: ClassVar[dict] = {
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
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local", "Fresh"],
            "current_history_id": instance.current_history_id,
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
            "current_history_id": instance.current_history_id,
            "formatted_name": "Apple",
            "id": instance.id,
            "name": "Apple",
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)
        expected_create_response["formatted_name"] = expected_create_response["name"]
        expected_create_response["available_actions"] = [
            "list",
            "retrieve",
            "update",
            "partial_update",
            "destroy",
            "current",
            "history-list",
        ]

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)
        expected_retrieve_response["formatted_name"] = expected_retrieve_response["name"]
        expected_retrieve_response["available_actions"] = [
            "list",
            "retrieve",
            "update",
            "partial_update",
            "destroy",
            "current",
            "history-list",
        ]

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)
        expected_update_response["formatted_name"] = expected_update_response["name"]
        expected_update_response["available_actions"] = [
            "list",
            "retrieve",
            "update",
            "partial_update",
            "destroy",
            "current",
            "history-list",
        ]

    def test_list_with_invalid_filter_returns_400(self, page_data, authenticated_client, list_querystring):
        list_querystring["nonexistent_filter"] = "value"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "nonexistent_filter" in response.data, f"response.data: {response.data}"
        assert any("Invalid query parameter" in str(msg) for msg in response.data["nonexistent_filter"]), (
            f"nonexistent_filter data: {response.data['nonexistent_filter']}"
        )

    def test_list_with_multiple_invalid_filters_returns_all(self, page_data, authenticated_client, list_querystring):
        list_querystring["bad_one"] = "x"
        list_querystring["bad_two"] = "y"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "bad_one" in response.data, f"response.data: {response.data}"
        assert "bad_two" in response.data, f"response.data: {response.data}"

    def test_list_with_valid_filter_succeeds(self, page_data, authenticated_client, list_querystring):
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.OK, f"{response.status_code} != 200, response.data: {response.data}"

    def test_list_with_invalid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "current_history_id"}.union(self.list_keys_arguments)

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

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "supervisor" in response.data, f"response.data: {response.data}"
        assert len(response.data["supervisor"]) == 1, f"supervisor data: {response.data['supervisor']}"
        assert "message" in response.data["supervisor"][0], f"supervisor data: {response.data['supervisor'][0]}"
        assert str(response.data["supervisor"][0]["message"]) == "Invalid expands. No expands are permitted.", (
            f"supervisor message: {response.data['supervisor'][0]['message']}"
        )

    def test_retrieve_with_valid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "history,first_history_entry"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)
        self.update_expected_retrieve_response(expected_retrieve_response, instance)

        assert response.status_code == HTTPStatus.OK, f"{response.status_code} != 200, response.data: {response.data}"
        assert "first_history_entry" in response.data, f"Missing first_history_entry in response.data: {response.data}"
        assert "history" in response.data, f"Missing history in response.data: {response.data}"
        # The first history record should be the same as the first_history_entry.
        assert response.data["history"][0] == response.data["first_history_entry"]
        # Remove history.  We will use first_history_entry for other asserts.
        del response.data["history"]
        first_history_entry = response.data.pop("first_history_entry")
        # Remove the history fields, copying the history id as current history id,
        # since that is supposed to be in the response.
        for key in (
            "history_id",
            "history_date",
            "history_change_reason",
            "history_type",
            "history_relation",
            "history_user",
        ):
            if key == "history_id":
                expected_retrieve_response["current_history_id"] = first_history_entry[key]
                first_history_entry["current_history_id"] = first_history_entry[key]
            del first_history_entry[key]
        # Now these three dictionaries are mostly the same.
        assert expected_retrieve_response == response.data
        # Except that there are no available_actions in history.
        del expected_retrieve_response["available_actions"]
        assert first_history_entry == expected_retrieve_response

    def test_bulk_destroy_without_delete_permission(self, page_data, authenticated_client):
        pks = list(page_data.values_list("pk", flat=True))

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, (
            f"{response.status_code} != 403, response.data: {response.data}"
        )
        assert self.model.objects.filter(pk__in=pks).count() == len(pks)

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()
        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "history,second_history_entry"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "second_history_entry" in response.data, f"response.data: {response.data}"
        assert len(response.data["second_history_entry"]) == 1, (
            f"second_history_entry data: {response.data['second_history_entry']}"
        )
        assert "message" in response.data["second_history_entry"][0], (
            f"second_history_entry data: {response.data['second_history_entry'][0]}"
        )
        assert (
            str(response.data["second_history_entry"][0]["message"])
            == "Invalid expands. Permitted expands are first_history_entry, history, last_history_entry. Or use a wildcard to expand all: *, ~all"
        ), f"second_history_entry message: {response.data['second_history_entry'][0]['message']}"
        assert "history" not in response.data, f"response.data: {response.data}"


@pytest.mark.django_db
class TestStoreProductViewSet:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    def test_retrieve_with_two_depth_invalid_expand(self, api_client, test_data):
        user = test_data.users["test_customer_1@example.com"]
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

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "distributor.brands" in response.data, f"response.data: {response.data}"
        assert len(response.data["distributor.brands"]) == 1, (
            f"distributor.brands data: {response.data['distributor.brands']}"
        )
        assert "message" in response.data["distributor.brands"][0], (
            f"distributor.brands data: {response.data['distributor.brands'][0]}"
        )
        assert (
            str(response.data["distributor.brands"][0]["message"])
            == "Invalid expands. Permitted expands are distributor, distributor.first_history_entry, distributor.history, distributor.last_history_entry, first_history_entry, history, last_history_entry. Or use a wildcard to expand all: *, ~all, distributor.*, distributor.~all"
        ), f"distributor.brands message: {response.data['distributor.brands'][0]['message']}"
        assert "history" not in response.data, f"response.data: {response.data}"

    def test_retrieve_with_two_depth_invalid_field(self, api_client, test_data):
        user = test_data.users["test_customer_1@example.com"]
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

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "distributor.brands" in response.data, f"response.data: {response.data}"
        assert len(response.data["distributor.brands"]) == 1, (
            f"distributor.brands data: {response.data['distributor.brands']}"
        )
        assert "message" in response.data["distributor.brands"][0], (
            f"distributor.brands data: {response.data['distributor.brands'][0]}"
        )
        assert (
            str(response.data["distributor.brands"][0]["message"])
            == "Invalid field.  Valid fields are available_actions, current_history_id, current_sale_date, description, disabled, distributor, distributor.available_actions, distributor.current_history_id, distributor.description, distributor.first_history_entry, distributor.formatted_name, distributor.history, distributor.id, distributor.last_history_entry, distributor.name, first_history_entry, formatted_name, future_sale_dates, history, id, internal_comments, last_history_entry, last_ordered, last_ten_order_betweens, name, order_between, reviews, special_care, tangible_type. Or use a wildcard to specify all: *, ~all, distributor.*, distributor.~all"
        ), f"distributor.brands message: {response.data['distributor.brands'][0]['message']}"
        assert "history" not in response.data, f"response.data: {response.data}"


@pytest.mark.django_db
class TestExpandingThroughRegisteredSerializer(BaseTestAssertResponseMixin):
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

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
        user = test_data.users["test_customer_1@example.com"]
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
            "available_actions",
            "current_history_id",
            "valid_transitions",
            "workflow_state_code",
            "workflow_state_name",
        } == frozenset(response.data.keys())
        assert isinstance(response.data["customer"], int)
        assert isinstance(response.data["order_items"], list)
        assert {"id", "customer_order", "product_option", "quantity", "formatted_name"} == frozenset(
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
        } == frozenset(response.data["order_items"][0]["product_option"])
        assert isinstance(response.data["order_items"][0]["product_option"]["product"], dict)


@pytest.mark.django_db
class TestStoreCustomerOrderViewSet:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    def test_expand_exceeds_depth(self, api_client, test_data):
        user = test_data.users["test_customer_1@example.com"]
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

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "non_field_errors" in response.data, f"response.data: {response.data}"
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
            ("tests", "Timesheet", "read"),
            ("tests", "Timesheet", "list"),
            ("tests", "Timesheet", "create"),
            ("tests", "Timesheet", "update"),
            ("tests", "Timesheet", "delete"),
            ("tests", "Timesheet", "manage"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@example.com": {
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
            user=self.users["test_admin@example.com"],
            employee_number="1",
        )
        employee_2 = Employee.objects.create(
            user=self.users["test_admin@example.com"],
            employee_number="2",
        )
        self.supervisor_1 = supervisor_1 = Employee.objects.create(
            user=self.users["test_admin@example.com"],
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
        user = self.users["test_admin@example.com"]
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
            "current_history_id": instance.current_history_id,
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
            "current_history_id": instance.current_history_id,
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
        formatted_name = f" on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_create_response["formatted_name"] = formatted_name

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)

        period_start = instance.period_start
        period_end = instance.period_end
        formatted_name = f" on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_retrieve_response["formatted_name"] = formatted_name
        expected_retrieve_response["available_actions"] = [
            "list",
            "retrieve",
            "update",
            "partial_update",
            "destroy",
            "current",
            "history-list",
        ]

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)

        period_start = updated_instance.period_start
        period_end = updated_instance.period_end
        formatted_name = f" on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_update_response["formatted_name"] = formatted_name

    def test_list_with_valid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "current_history_id", "formatted_name", "available_actions"}.union(self.list_keys_arguments)

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

        assert response.status_code == HTTPStatus.OK, f"{response.status_code} != 200, response.data: {response.data}"
        response_info = {x: y for x, y in response.data.items() if x == "results"}
        current_history_id = response_info["results"][0]["current_history_id"]
        assert current_history_id is not None
        assert keys == set(response_info["results"][0].keys())
        assert {x["id"] for x in response_info["results"]} == set(list_querystring["id"])

    def test_list_with_invalid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "current_history_id"}.union(self.list_keys_arguments)

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

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "guardian" in response.data, f"response.data: {response.data}"
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert "message" in response.data["guardian"][0], f"guardian data: {response.data['guardian'][0]}"
        assert (
            str(response.data["guardian"][0]["message"])
            == "Invalid expands. Permitted expands are employee, supervisor. Or use a wildcard to expand all: *, ~all"
        ), f"guardian message: {response.data['guardian'][0]['message']}"
        assert "employee" not in response.data, f"response.data: {response.data}"

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
        }
        period_start = instance.period_start
        period_end = instance.period_end
        formatted_name = f" on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_retrieve_response["formatted_name"] = formatted_name

        assert response.status_code == HTTPStatus.OK, f"{response.status_code} != 200, response.data: {response.data}"
        assert expected_retrieve_response == response.data

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,guardian"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert "guardian" in response.data, f"response.data: {response.data}"
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert "message" in response.data["guardian"][0], f"guardian data: {response.data['guardian'][0]}"
        assert (
            str(response.data["guardian"][0]["message"])
            == "Invalid expands. Permitted expands are employee, first_history_entry, foo, history, last_history_entry, supervisor, timesheet_entry. Or use a wildcard to expand all: *, ~all"
        ), f"guardian message: {response.data['guardian'][0]['message']}"
        assert "employee" not in response.data, f"response.data: {response.data}"

    def test_destroy_dry_run_skips_commit(self, page_data, authenticated_client):
        instance = page_data.first()

        response = authenticated_client.delete(self.detail_url(instance.id), HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.OK, f"{response.status_code} != 200, response.data: {response.data}"
        assert self.model.objects.filter(pk=instance.pk).exists()

    def test_destroy_dry_run_returns_validation_error(self, page_data, authenticated_client, monkeypatch):
        def fail_validation(self, objs):
            raise VuedaValidationError({"detail": ["Destroy validation failed."]})

        monkeypatch.setattr(TimesheetViewSet, "destroy_validation", fail_validation)

        instance = page_data.first()
        response = authenticated_client.delete(self.detail_url(instance.id), HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        assert self.model.objects.filter(pk=instance.pk).exists()

    def test_destroy_returns_no_content_for_detailed(self, page_data, authenticated_client):
        instance = page_data.first()
        response = authenticated_client.delete(self.detail_url(instance.id))

        assert response.status_code == HTTPStatus.NO_CONTENT, (
            f"{response.status_code} != 204, response.data: {response.data}"
        )
        assert not self.model.objects.filter(pk=instance.pk).exists()

    def test_bulk_destroy_returns_no_content(self, page_data, authenticated_client):
        initial_count = self.model.objects.count()
        pks = list(page_data.values_list("pk", flat=True)[:2])

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.NO_CONTENT, (
            f"{response.status_code} != 204, response.data: {response.data}"
        )
        assert self.model.objects.filter(pk__in=pks).count() == 0
        assert self.model.objects.count() == initial_count - len(pks)

    def test_bulk_destroy_with_missing_objects(self, page_data, authenticated_client):
        existing_pk = page_data.first().pk
        missing_pk = max(page_data.values_list("pk", flat=True)) + 100
        pks = [existing_pk, missing_pk]

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, (
            f"{response.status_code} != 400, response.data: {response.data}"
        )
        error_key = missing_pk if missing_pk in response.data else str(missing_pk)
        assert error_key in response.data
        assert str(response.data[error_key][0]) == f"Object with pk={missing_pk} does not exist."
        assert self.model.objects.filter(pk=existing_pk).exists()
