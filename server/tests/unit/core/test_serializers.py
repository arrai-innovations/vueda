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
from vueda.core.serializers import PrimaryKeyListSerializer


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

        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )

        context["view"] = FakeView(context["request"], TimesheetSerializer, queryset=Timesheet.objects.filter(pk=t.id))

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

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

        t = Timesheet.objects.create(
            **{
                **valid_timesheet_data,
                "employee": employee,
            }
        )
        context["view"] = FakeView(context["request"], TimesheetSerializer, queryset=Timesheet.objects.filter(pk=t.id))

        # simulate an update as if it was done through the view with flex fields
        serializer = TimesheetSerializer(instance=t, data=put_data, context=context)

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
        "test_my_user2@example.com": {
            "name": "Test User update",
            "password": "testpass2",
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
    def employee2(self):
        return Employee.objects.create(
            user=self.users["test_my_user2@example.com"],
            employee_number="abcd-234",
        )

    # This tests the validity of the serializer as well
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
            "view": FakeView(request, TimesheetSerializerExclude, "update", queryset=Timesheet.objects.filter(pk=t.id)),
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

    def test_exclude_create_field(self, employee):
        post_data = {
            "period_start": "2024-03-01",
            "period_end": "2024-03-15",
            "employee": f"{employee.pk}",
            "supervisor": f"{employee.pk}",
        }

        def get_queryset():
            # We can't pass in the supervisor, because it becomes None, not a number.
            timesheet = Timesheet.objects.get(
                period_start="2024-03-01",
                period_end="2024-03-15",
                employee=f"{employee.pk}",
            )
            return Timesheet.objects.filter(pk=timesheet.pk)

        request = FakeRequest(data=post_data, method="POST")
        context = {
            "request": request,
            "view": FakeView(request, TimesheetSerializerExclude, "create", queryset=get_queryset),
        }
        serializer = TimesheetSerializerExclude(data=post_data, context=context)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        obj = serializer.save()
        assert obj.supervisor is None

    def test_exclude_partial_update_fields(self, employee, employee2):
        t = Timesheet.objects.create(
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
            employee=employee,
        )
        patch_data = {
            "period_start": "2024-02-05",
            "employee": f"{employee2.pk}",
        }

        request = FakeRequest(data=patch_data, method="PATCH")
        context = {
            "request": request,
            "view": FakeView(
                request, TimesheetSerializerExclude, "partial_update", queryset=Timesheet.objects.filter(pk=t.id)
            ),
        }
        # "partial = True" must be passed in the serializer to make the serializer partial
        serializer = TimesheetSerializerExclude(instance=t, data=patch_data, context=context, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            pytest.fail(f"Serializer is not valid: {e}")
        obj = serializer.save()

        assert obj.period_start == date(2024, 2, 5)
        assert obj.period_end == date(2024, 2, 29)
        assert obj.employee == employee


class TestPrimaryKeyListSerializer:
    def test_valid_pk_list(self):
        serializer = PrimaryKeyListSerializer(data={"pks": [1, 2, 3]})

        assert serializer.is_valid()
        assert serializer.validated_data["pks"] == [1, 2, 3]

    def test_rejects_non_integer_values(self):
        serializer = PrimaryKeyListSerializer(data={"pks": [1, "abc"]})

        assert not serializer.is_valid()
        assert serializer.errors["pks"][1][0] == "Primary keys must be valid integers."

    def test_requires_list_input(self):
        serializer = PrimaryKeyListSerializer(data={"pks": "1"})

        assert not serializer.is_valid()
        assert serializer.errors["pks"][0] == "pks must be a list of primary keys."

    def test_requires_data(self):
        serializer = PrimaryKeyListSerializer(data={"pks": []})

        assert not serializer.is_valid()
        assert serializer.errors["pks"][0] == "pks list cannot be empty."
