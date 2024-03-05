from datetime import date

import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework.exceptions import ValidationError

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.models import Employee
from tests.models import Timesheet
from tests.serializers import TimesheetSerializer
from tests.serializers import TimesheetSerializerExclude
from tests.utils import FakeRequest
from tests.utils import FakeView


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

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        response = api_client.put(
            url + f"?{settings.REST_FLEX_FIELDS['FIELDS_PARAM']}=period_start,period_end",
            data={
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "period_start" in response.data
        assert "period_end" in response.data
        assert "employee" not in response.data

    def test_update_timesheet_with_non_existing_field(self, api_client):
        user = self.users["test_my_user@example.com"]
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

        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        response = api_client.put(
            url + f"?{settings.REST_FLEX_FIELDS['FIELDS_PARAM']}=period_start,une",
            data={
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
                "une": "ssss",
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "period_end" in response.data
        assert "employee" not in response.data
        assert "une" in response.data

    # def tested_update_timesheet_with_non_existing_field_in_expand(self, api_client):
    #     user = self.users["test_my_user@example.com"]
    #     api_client.force_authenticate(user=user)
    #
    #     # creates an employee
    #     e1 = Employee.objects.create(
    #         user=user,
    #         employee_number="abcd-1234",
    #     )
    #
    #     # creates a timesheet
    #     t1 = Timesheet.objects.create(
    #         employee=e1,
    #         period_start=date(2024, 2, 15),
    #         period_end=date(2024, 2, 29),
    #     )
    #
    #     # generate a URL for a single timesheet by its primary key
    #     url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
    #
    #     # retrieves a single timesheet with a non-existing field, using fields 'param'
    #     response = api_client.put(
    #         url,
    #         data={
    #             settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["une"],
    #             settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee2"],
    #             "employee": e1.pk,
    #             "period_start": date(2024, 2, 16),
    #             "period_end": date(2024, 2, 25),
    #         },
    #         format="json",
    #     )
    #
    #     # validates that the response code is an error -- bad request
    #     self.assert_response(response, 400)
    #     print(response.data)
    #
    #     # Validate the response body content
    #     assert "une" not in response.data
    #
    # def test_update_timesheet_expand_without_fields_with_non_existing_field(self, api_client):
    #     user = self.users["test_my_user@example.com"]
    #     api_client.force_authenticate(user=user)
    #
    #     # creates an employee
    #     e1 = Employee.objects.create(
    #         user=user,
    #         employee_number="abcd-1234",
    #     )
    #     # Create a timesheet
    #     t1 = Timesheet.objects.create(
    #         employee=e1,
    #         period_start=date(2024, 2, 15),
    #         period_end=date(2024, 2, 29),
    #     )
    #
    #     # Generate a URL for the timesheet by its primary key
    #     url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
    #
    #     # retrieves a single timesheet with a non-existing field, using fields 'param'
    #     response = api_client.put(
    #         url,
    #         data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee2"]},
    #         format="json",
    #     )
    #     print(response.data)
    #     # validates that the response code is an error -- bad request
    #     self.assert_response(response, 400)
    #
    #     # Validate the response body content
    #     assert "une" not in response.data
    #
    # def test_expand_employee_with_existing_fields(self, api_client):
    #     user = self.users["test_my_user@example.com"]
    #     api_client.force_authenticate(user=user)
    #
    #     # creates an employee
    #     e1 = Employee.objects.create(
    #         user=user,
    #         employee_number="abcd-1234",
    #     )
    #     # Create a timesheet
    #     t1 = Timesheet.objects.create(
    #         employee=e1,
    #         period_start=date(2024, 2, 15),
    #         period_end=date(2024, 2, 29),
    #     )
    #
    #     # Generate a URL for the timesheet by its primary key
    #     url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
    #
    #     # updates a single timesheet with an existing field
    #     response = api_client.put(
    #         url,
    #         data={
    #             settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee"],
    #             settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["employee"],
    #             "employee": {
    #                 "id": e1.pk,
    #                 "user": user.pk,
    #                 "employee_number": "abcd-234",
    #             },
    #             "period_start": date(2024, 2, 16),
    #             "period_end": date(2024, 2, 25),
    #             "timesheet_entry": [{
    #                 "date": date(2024, 2, 18),
    #                 "hours": 7.5
    #             }]
    #         },
    #         format="json",
    #     )
    #     print("curr test ", response.data)
    #
    #     # validates that the response code is as expected -- good
    #
    #     assert 'employee' in response.data
    #     employee_data = response.data['employee']
    #     print("The employee data is ", employee_data)
    #     self.assert_response(response, 200)  # self OK success status
    #     assert employee_data['employee_number'] == "abcd-1234"
    #
    #  # def test_expand_exployee_with_non_existing_fields(self, api_client):

    def test_expand_with_existing_expands(self, api_client):
        user = self.users["test_my_user@example.com"]
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

        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        response = api_client.put(
            url + f"?{settings.REST_FLEX_FIELDS['EXPAND_PARAM']}=employee,foo",
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-12345"},
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
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
        user = self.users["test_my_user@example.com"]
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

        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        response = api_client.put(
            url + f"?{settings.REST_FLEX_FIELDS['EXPAND_PARAM']}=foo,label10",
            data={
                "employee": e1.pk,
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "label10" in response.data

    def test_expand_with_existing_fields(self, api_client):
        user = self.users["test_my_user@example.com"]
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

        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        response = api_client.put(
            url
            + f"?{settings.REST_FLEX_FIELDS['FIELDS_PARAM']}=period_start,period_end,employee&"
            + f"{settings.REST_FLEX_FIELDS['EXPAND_PARAM']}=employee",
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-123456"},
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "period_start" in response.data
        assert "period_end" in response.data
        assert "employee" in response.data
        assert "user" in response.data["employee"]

    def test_expand_with_non_existing_fields(self, api_client):
        user = self.users["test_my_user@example.com"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-12348",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

        url = reverse("tests.timesheet-detail", kwargs={"pk": t1.pk})
        response = api_client.put(
            url
            + f"?{settings.REST_FLEX_FIELDS['FIELDS_PARAM']}=period_start,period_end,employee,invalid_field_name&"
            + f"{settings.REST_FLEX_FIELDS['EXPAND_PARAM']}=employee",
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-123456"},
                "period_start": date(2024, 2, 16),
                "period_end": date(2024, 2, 25),
                "invalid_field_name": "invalid_value",
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "invalid_field_name" in response.data
        assert "period_start" not in response.data


@pytest.mark.django_db
class TestNoExtraFieldsSerializerMixinDirectly(BaseTestUserMixin, BaseTestGroupMixin):
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

    @pytest.fixture
    def employee(self):
        return Employee.objects.create(
            user=self.users["test_my_user@example.com"],
            employee_number="abcd-1234",
        )

    @pytest.fixture
    def valid_timesheet_data(self):
        return {
            "id": 1,
            "employee": 1,
            "period_start": date(2024, 2, 15),
            "period_end": date(2024, 2, 29),
        }

    def test_flex_fields_with_valid_field_param(self, employee, valid_timesheet_data):
        put_data = {
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        context = {
            "request": FakeRequest(
                {settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["period_start", "period_end"]}, put_data, "PUT"
            )
        }

        context["view"] = FakeView(context["request"], TimesheetSerializer)
        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)
        # flex fields would be applied in the view when `to_representation` or `get_fields` is called
        serializer.apply_flex_fields(serializer.fields, serializer._flex_options_rep_only)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        serializer.save()

        assert serializer.data["period_start"] == "2024-02-16"
        assert serializer.data["period_end"] == "2024-02-28"
        assert "employee" not in serializer.data

    def test_flex_fields_with_invalid_field_param(self, employee, valid_timesheet_data):
        put_data = {
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
            "invalid_field_name": "invalid_value",
        }
        context = {
            "request": FakeRequest(
                {settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["period_start", "invalid_field_name"]}, put_data, "PUT"
            )
        }
        context["view"] = FakeView(context["request"], TimesheetSerializer)
        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)
        # flex fields would be applied in the view when `to_representation` or `get_fields` is called
        serializer.apply_flex_fields(serializer.fields, serializer._flex_options_rep_only)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            assert "period_end" in e.detail
            assert e.detail["period_end"][0].code == "invalid"
            assert "invalid_field_name" in e.detail
            assert e.detail["invalid_field_name"][0].code == "invalid"
        else:
            pytest.fail("Serializer is valid when it should not be")

    def test_flex_fields_with_valid_expand_param(self, employee, valid_timesheet_data):
        put_data = {
            "employee": {"id": employee.pk, "user": employee.user.pk, "employee_number": "abcd-12345"},
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        context = {
            "request": FakeRequest({settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["employee", "foo"]}, put_data, "PUT")
        }

        context["view"] = FakeView(context["request"], TimesheetSerializer)
        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)
        # flex fields would be applied in the view when `to_representation` or `get_fields` is called
        serializer.apply_flex_fields(serializer.fields, serializer._flex_options_rep_only)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        serializer.save()

        assert serializer.data["period_start"] == "2024-02-16"
        assert serializer.data["period_end"] == "2024-02-28"
        assert "employee" in serializer.data
        assert "foo" in serializer.data

    def test_flex_fields_with_invalid_expand_param(self, employee, valid_timesheet_data):
        put_data = {
            "employee": {"id": employee.pk, "user": employee.user.pk, "employee_number": "abcd-12345"},
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }
        context = {
            "request": FakeRequest({settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["foo", "label10"]}, put_data, "PUT")
        }

        context["view"] = FakeView(context["request"], TimesheetSerializer)
        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)
        # flex fields would be applied in the view when `to_representation` or `get_fields` is called
        serializer.apply_flex_fields(serializer.fields, serializer._flex_options_rep_only)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            assert "employee" in e.detail
            assert e.detail["employee"][0].code == "incorrect_type"  # not expanded, expected a pk
        else:
            pytest.fail("Serializer is valid when it should not be")

        # you won't get all the errors at once due to the incorrect_type happening before validate.
        # fix the employee to the correct type and check that label10 is complained about
        put_data["employee"] = employee.pk
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)
        serializer.apply_flex_fields(serializer.fields, serializer._flex_options_rep_only)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            assert "label10" in e.detail
            assert e.detail["label10"][0].code == "invalid"
        else:
            pytest.fail("Serializer is valid when it should not be")


@pytest.mark.django_db
class TestExcludeFieldsSerializerMixinDirectly(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
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

    @pytest.fixture
    def employee(self):
        return Employee.objects.create(
            user=self.users["test_my_user@example.com"],
            employee_number="abcd-1234",
        )

    #   what am I going to test
    # - the validity of the exclude serializer
    # - test excluding fields during creation
    # - test excluding fields during partial update
    # - test not excluding fields when not specified in meta

    def test_exclude_update_field(self, employee):
        t = Timesheet.objects.create(
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
            employee=employee,
        )
        put_data = {
            "period_start": "2024-02-16",
            "period_end": "2024-02-28",
        }

        request = FakeRequest(data=put_data, method="PUT")
        context = {
            "request": request,
            "view": FakeView(request, TimesheetSerializerExclude, "update"),
        }

        serializer = TimesheetSerializerExclude(instance=t, data=put_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        serializer.save()

        assert serializer.data["period_start"] == "2024-02-16"
        assert serializer.data["period_end"] == "2024-02-28"
        assert (serializer.get_extra_kwargs()["employee"])["read_only"] is True
