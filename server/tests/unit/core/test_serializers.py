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
class TestNoExtraFieldsSerializerMixin(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Timesheet Updater": [
            ("tests", "Timesheet", "update"),
        ]
    }

    users_to_create = {
        "test_my_user@example.com": {
            "name": "Test User update",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
    }

    def test_update_timesheet_with_existing_field(self, api_client):
        user = self.users["test_my_user@example.com"]
        api_client.force_authenticate(user=user)

        # creates an employee
        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )

        # creates a timesheet
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

        # generate a URL for a single timesheet by its primary key
        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})

        # retrieves a single timesheet with a non-existing field, using fields 'param'
        response = api_client.put(
            url,
            data={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["period_start"],
                "employee": e1.pk,
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
            },
            format="json",
        )

        # validates that the response code is as expected -- good
        self.assert_response(response, 200)  # self OK success status

        # Validate the response body content
        assert "une" not in response.data

    def test_update_timesheet_with_non_existing_field(self, api_client):
        user = self.users["test_my_user@example.com"]
        api_client.force_authenticate(user=user)

        # creates an employee
        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )

        # creates a timesheet
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

        # generate a URL for a single timesheet by its primary key
        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})

        # retrieves a single timesheet with a non-existing field, using fields 'param'
        response = api_client.put(
            url,
            data={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["period_start", "une"],
                "employee": e1.pk,
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
                "une": "ssss",
            },
            format="json",
        )
        # validates that the response code is an error -- bad request
        self.assert_response(response, 400)

        # Validate the response body content
        assert "une" in response.data

    def test_update_timesheet_with_non_existing_field_in_expand(self, api_client):
        user = self.users["test_my_user@example.com"]
        api_client.force_authenticate(user=user)

        # creates an employee
        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )

        # creates a timesheet
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

        # generate a URL for a single timesheet by its primary key
        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})

        # retrieves a single timesheet with a non-existing field, using fields 'param'
        response = api_client.put(
            url,
            data={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["une"],
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee"],
                "employee": e1.pk,
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
            },
            format="json",
        )

        # validates that the response code is an error -- bad request
        self.assert_response(response, 400)

        # Validate the response body content
        assert "une" not in response.data

    def test_update_timesheet_expand_without_fields_with_non_existing_field(self, api_client):
        user = self.users["test_my_user@example.com"]
        api_client.force_authenticate(user=user)

        # creates an employee
        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        # Create a timesheet
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

        # Generate a URL for the timesheet by its primary key
        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})

        # retrieves a single timesheet with a non-existing field, using fields 'param'
        response = api_client.put(
            url,
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee2"]},
            format="json",
        )

        # validates that the response code is an error -- bad request
        self.assert_response(response, 400)

        # Validate the response body content
        assert "une" not in response.data
