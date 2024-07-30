import datetime

import pytest
from django.conf import settings

from tests.conftest import BaseTestModelViewSet
from tests.models import Employee
from tests.models import Product
from tests.models import Timesheet


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

        assert response.status_code == 400, f"{response.status_code} != 400, response.data: {response.data}"
        assert "supervisor" in response.data, f"response.data: {response.data}"
        assert len(response.data["supervisor"]) == 1, f"supervisor data: {response.data['supervisor']}"
        assert "message" in response.data["supervisor"][0], f"supervisor data: {response.data['supervisor'][0]}"
        assert (
            str(response.data["supervisor"][0]["message"])
            == "Invalid expands.  Valid expands are history, first_history_entry, last_history_entry."
        ), f"supervisor message: {response.data['supervisor'][0]['message']}"

    def test_retrieve_with_valid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "history,first_history_entry"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)
        self.update_expected_retrieve_response(expected_retrieve_response, instance)

        assert response.status_code == 200, f"{response.status_code} != 200, response.data: {response.data}"
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
        # Now these three dictionaries should be the same.
        assert first_history_entry == expected_retrieve_response
        assert expected_retrieve_response == response.data

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()
        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "history,second_history_entry"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == 400, f"{response.status_code} != 400, response.data: {response.data}"
        assert "second_history_entry" in response.data, f"response.data: {response.data}"
        assert (
            len(response.data["second_history_entry"]) == 1
        ), f"second_history_entry data: {response.data['second_history_entry']}"
        assert (
            "message" in response.data["second_history_entry"][0]
        ), f"second_history_entry data: {response.data['second_history_entry'][0]}"
        assert (
            str(response.data["second_history_entry"][0]["message"])
            == "Invalid expands.  Valid expands are history, first_history_entry, last_history_entry."
        ), f"second_history_entry message: {response.data['second_history_entry'][0]['message']}"
        assert "history" not in response.data, f"response.data: {response.data}"


@pytest.mark.django_db
class TestTimesheetViewSet(BaseTestModelViewSet):
    model = Timesheet

    groups_to_create = {
        "Admin": [
            ("tests", "Timesheet", "read"),
            ("tests", "Timesheet", "list"),
            ("tests", "Timesheet", "create"),
            ("tests", "Timesheet", "update"),
            ("tests", "Timesheet", "delete"),
            ("tests", "Timesheet", "manage"),
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
            "period_start": datetime.date(2024, 1, 1).strftime("%Y-%m-%d"),
            "period_end": datetime.date(2024, 1, 15).strftime("%Y-%m-%d"),
            "employee": self.employee_1.id,
            "supervisor": self.supervisor_1.id,
            "current_history_id": instance.current_history_id,
            "id": instance.id,
        }

    @pytest.fixture
    def create_arguments(self):
        return {
            "period_start": datetime.date(2024, 3, 1).strftime("%Y-%m-%d"),
            "period_end": datetime.date(2024, 3, 15).strftime("%Y-%m-%d"),
            "employee": self.employee_1.id,
            "supervisor": None,
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "period_start": datetime.date(2024, 1, 1).strftime("%Y-%m-%d"),
            "period_end": datetime.date(2024, 1, 15).strftime("%Y-%m-%d"),
            "employee": self.employee_1.id,
            "supervisor": None,
            "current_history_id": instance.current_history_id,
            "id": instance.id,
        }

    def test_list_with_valid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "current_history_id"}.union(self.list_keys_arguments)

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

        assert response.status_code == 200, f"{response.status_code} != 200, response.data: {response.data}"
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

        assert response.status_code == 400, f"{response.status_code} != 400, response.data: {response.data}"
        assert "guardian" in response.data, f"response.data: {response.data}"
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert "message" in response.data["guardian"][0], f"guardian data: {response.data['guardian'][0]}"
        assert (
            str(response.data["guardian"][0]["message"])
            == "Invalid expands.  Valid expands are timesheet_entry, employee, "
            "supervisor, foo, history, first_history_entry, last_history_entry."
        ), f"guardian message: {response.data['guardian'][0]['message']}"
        assert "employee" not in response.data, f"response.data: {response.data}"

    def test_retrieve_with_valid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,supervisor"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)
        self.update_expected_retrieve_response(expected_retrieve_response, instance)
        employee = instance.employee
        expected_retrieve_response["employee"] = {
            "id": employee.id,
            "user": employee.user_id,
            "employee_number": employee.employee_number,
        }

        assert response.status_code == 200, f"{response.status_code} != 200, response.data: {response.data}"
        assert expected_retrieve_response == response.data

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "employee,guardian"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == 400, f"{response.status_code} != 400, response.data: {response.data}"
        assert "guardian" in response.data, f"response.data: {response.data}"
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert "message" in response.data["guardian"][0], f"guardian data: {response.data['guardian'][0]}"
        assert (
            str(response.data["guardian"][0]["message"])
            == "Invalid expands.  Valid expands are timesheet_entry, employee, "
            "supervisor, foo, history, first_history_entry, last_history_entry."
        ), f"guardian message: {response.data['guardian'][0]['message']}"
        assert "employee" not in response.data, f"response.data: {response.data}"
