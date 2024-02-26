from datetime import date

import pytest
from django.conf import settings
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.models import Employee
from tests.models import Timesheet


@pytest.mark.django_db
class TestObjectPermissions(BaseTestAssertResponseMixin, BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create = {
        "Timesheet Reader": [
            ("tests", "Timesheet", "read"),
        ],
        "Timesheet Creator": [
            ("tests", "Timesheet", "create"),
        ],
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ],
        "Timesheet Deleter": [
            ("tests", "Timesheet", "delete"),
        ],
        "Timesheet Lister": [
            ("tests", "Timesheet", "list"),
        ],
    }

    users_to_create = {
        "test_user+timesheet+reader@example.com": {
            "name": "Test User reader",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
        "test_user+timesheet+creator@example.com": {
            "name": "Test User creator",
            "password": "testpass",
            "groups": ["Timesheet Creator"],
        },
        "test_user+timesheet+updater@example.com": {
            "name": "Test User updater",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
        "test_user+timesheet+deleter@example.com": {
            "name": "Test User deleter",
            "password": "testpass",
            "groups": ["Timesheet Deleter"],
        },
        "test_user+timesheet+lister@example.com": {
            "name": "Test User lister",
            "password": "testpass",
            "groups": ["Timesheet Lister"],
        },
        "test_user+timesheet+no_permissions@example.com": {
            "name": "Test User no permissions",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.mark.parametrize(
        "email,http_method",
        [
            ("test_user+timesheet+reader@example.com", "GET"),
            ("test_user+timesheet+creator@example.com", "POST"),
            ("test_user+timesheet+updater@example.com", "PUT"),
            ("test_user+timesheet+updater@example.com", "PATCH"),
            ("test_user+timesheet+deleter@example.com", "DELETE"),
            ("test_user+timesheet+lister@example.com", "GET"),
        ],
        ids=[
            "read",
            "create",
            "update",
            "partial",
            "delete",
            "list",
        ],
    )
    def test_have_permission(self, email, http_method, api_client):
        user = self.users[email]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )
        detail_url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        # add f= querystring to details an only ask for certain fields
        detail_url += f"?{settings.REST_FLEX_FIELDS['FIELDS_PARAM']}=id,employee,period_start,period_end,dumb"
        list_url = reverse("tests.timesheet-list")
        match http_method:
            case "GET":
                url = list_url if "lister" in email else detail_url
                response = api_client.get(url, format="json")
                self.assert_response(response, 200)
                if "lister" in email:
                    assert len(response.data["results"]) == 1
                    assert response.data["results"][0]["id"] == t1.pk
                else:
                    assert response.data["id"] == t1.pk
                    assert response.data["employee"] == e1.pk
                    assert response.data["period_start"] == "2024-02-15"
                    assert response.data["period_end"] == "2024-02-29"
            case "POST":
                response = api_client.post(
                    list_url,
                    format="json",
                    data={
                        "employee": e1.pk,
                        "period_start": "2024-03-01",
                        "period_end": "2024-03-15",
                    },
                )
                self.assert_response(response, 201)
                assert response.data["employee"] == e1.pk
                assert response.data["period_start"] == "2024-03-01"
                assert response.data["period_end"] == "2024-03-15"
                assert response.data["id"]
            case "PUT":
                response = api_client.put(
                    detail_url,
                    format="json",
                    data={
                        "employee": e1.pk,
                        "period_start": "2024-02-16",
                        "period_end": "2024-03-01",
                    },
                )
                self.assert_response(response, 200)
                assert response.data["employee"] == e1.pk
                assert response.data["period_start"] == "2024-02-16"
                assert response.data["period_end"] == "2024-03-01"
                assert response.data["id"] == t1.pk
            case "PATCH":
                response = api_client.patch(
                    detail_url,
                    format="json",
                    data={
                        "period_start": "2024-02-17",
                    },
                )
                self.assert_response(response, 200)
                assert response.data["employee"] == e1.pk
                assert response.data["period_start"] == "2024-02-17"
                assert response.data["period_end"] == "2024-02-29"
                assert response.data["id"] == t1.pk
            case "DELETE":
                response = api_client.delete(detail_url, format="json")
                self.assert_response(response, 204)
                assert not Timesheet.objects.filter(pk=t1.pk).exists()
                assert response.data is None
            case _:
                raise ValueError(f"Invalid http_method: {http_method}")

    @pytest.mark.parametrize(
        "http_method,is_list",
        [
            ("GET", False),
            ("POST", False),
            ("PUT", False),
            ("PATCH", False),
            ("DELETE", False),
            ("GET", True),
        ],
        ids=[
            "read",
            "create",
            "update",
            "partial",
            "delete",
            "list",
        ],
    )
    def test_does_not_have_permission(self, http_method, is_list, api_client):
        user = self.users["test_user+timesheet+no_permissions@example.com"]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )
        detail_url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        list_url = reverse("tests.timesheet-list")
        match http_method:
            case "GET":
                url = list_url if is_list else detail_url
                response = api_client.get(url, format="json")
                self.assert_response(response, 403)
            case "POST":
                response = api_client.post(
                    list_url,
                    format="json",
                    data={
                        "employee": e1.pk,
                        "period_start": "2024-03-01",
                        "period_end": "2024-03-15",
                    },
                )
                self.assert_response(response, 403)
            case "PUT":
                response = api_client.put(
                    detail_url,
                    format="json",
                    data={
                        "employee": e1.pk,
                        "period_start": "2024-02-16",
                        "period_end": "2024-03-01",
                    },
                )
                self.assert_response(response, 403)
            case "PATCH":
                response = api_client.patch(
                    detail_url,
                    format="json",
                    data={
                        "period_start": "2024-02-17",
                    },
                )
                self.assert_response(response, 403)
            case "DELETE":
                response = api_client.delete(detail_url, format="json")
                self.assert_response(response, 403)
            case _:
                raise ValueError(f"Invalid http_method: {http_method}")
