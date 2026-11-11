"""
A write accepts a wildcard and dotted names in ``e`` (#682).

On a write, a wildcard shapes only the response, which expands every permitted relation as on a read. The
body is read as if ``e`` held only its other names, cut off at any wildcard segment. ``e=*`` alone therefore
reads every relation as a primary key, and ``e=supervisor,*`` reads ``supervisor`` as a nested object.

``TimesheetWildcardWriteViewSet`` sets no write permit list. ``TimesheetPermittedWildcardWriteViewSet``
permits only ``employee`` and the ``manager`` alias on ``PUT`` and ``PATCH``. A nested object that holds only a
primary key links the existing row without saving it.
"""

import datetime
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.employee.models import Employee
from tests.timesheet.models import Timesheet
from tests.timesheet.serializers import TimesheetWildcardWriteSerializer
from tests.timesheet.viewsets import TimesheetWildcardWriteViewSet


EXPAND_PARAM = settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]


@pytest.mark.django_db
class TestWildcardWriteExpand(BaseTestUserMixin):
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

    @pytest.fixture
    def original_employee(self):
        return Employee.objects.create(user=self.users["test_user@domain.invalid"], employee_number="original")

    @pytest.fixture
    def other_employee(self):
        return Employee.objects.create(user=self.users["test_user@domain.invalid"], employee_number="other")

    @pytest.fixture
    def timesheet(self, original_employee):
        return Timesheet.objects.create(
            period_start=datetime.date(2024, 2, 1),
            period_end=datetime.date(2024, 2, 15),
            employee=original_employee,
            supervisor=original_employee,
        )

    @pytest.mark.parametrize("wildcard", ["*", "~all"])
    def test_wildcard_expands_the_response_and_reads_relations_as_primary_keys(
        self, authenticated_client, timesheet, original_employee, other_employee, wildcard
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: wildcard}
            ),
            data={"supervisor": other_employee.pk},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk
        assert response.data["supervisor"]["id"] == other_employee.pk
        assert response.data["manager"]["id"] == other_employee.pk
        assert response.data["employee"]["id"] == original_employee.pk

    def test_wildcard_reads_a_nested_object_as_an_invalid_primary_key(
        self, authenticated_client, timesheet, original_employee, other_employee
    ):
        response = authenticated_client.patch(
            reverse("timesheet.timesheetwildcardwrite-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "*"}),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert [error.code for error in response.data["supervisor"]] == ["incorrect_type"]
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == original_employee.pk

    def test_wildcard_ignores_echoed_rows_of_a_read_only_relation(self, authenticated_client, timesheet):
        # A client that sends back a response it read with `e=*` echoes the expanded rows. `timesheet_entries`
        # is read-only without its own expand, so the write ignores them.
        response = authenticated_client.patch(
            reverse("timesheet.timesheetwildcardwrite-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "*"}),
            data={"period_end": "2024-02-20", "timesheet_entries": [{"date": "2024-02-02", "hours": "7.50"}]},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.period_end == datetime.date(2024, 2, 20)
        assert not timesheet.timesheet_entries.exists()

    @pytest.mark.parametrize("method", ["patch", "put"])
    def test_wildcard_with_a_permit_list_expands_only_the_permitted_names_in_the_response(
        self, authenticated_client, timesheet, other_employee, method
    ):
        response = getattr(authenticated_client, method)(
            reverse(
                "timesheet.timesheetpermittedwildcardwrite-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "*"},
            ),
            data={
                "period_start": "2024-02-01",
                "period_end": "2024-02-15",
                "employee": other_employee.pk,
                "supervisor": other_employee.pk,
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.employee_id == other_employee.pk
        assert timesheet.supervisor_id == other_employee.pk
        assert response.data["employee"]["id"] == other_employee.pk
        assert response.data["manager"]["id"] == other_employee.pk
        assert response.data["supervisor"] == other_employee.pk

    def test_wildcard_with_a_permit_list_rejects_an_expand_only_name_in_the_body(
        self, authenticated_client, timesheet, original_employee, other_employee
    ):
        # Before #682, the permit list replaced `*`, so `manager` was swapped in and wrote `supervisor` through
        # its `source`. A wildcard now swaps nothing, so `manager` is not a field of the body.
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetpermittedwildcardwrite-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "*"},
            ),
            data={"manager": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert len(response.data["manager"]) == 1
        assert str(response.data["manager"][0]).startswith("Invalid field.")
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == original_employee.pk

    def test_wildcard_create_requires_no_relation_beyond_the_plain_fields(
        self, authenticated_client, original_employee
    ):
        # A wildcard that swapped every expand would require `supervisor`, its alias `manager`, and
        # `timesheet_entries` as nested data, although the body sends none of them.
        response = authenticated_client.post(
            reverse("timesheet.timesheetwildcardwrite-list", query={EXPAND_PARAM: "*"}),
            data={"period_start": "2024-03-01", "period_end": "2024-03-15", "employee": original_employee.pk},
            format="json",
        )

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        created = Timesheet.objects.get(pk=response.data["id"])
        assert created.employee_id == original_employee.pk
        assert created.supervisor_id is None
        assert response.data["employee"]["id"] == original_employee.pk

    def test_name_listed_next_to_a_wildcard_reads_a_nested_object(
        self, authenticated_client, timesheet, other_employee
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "supervisor,*"},
            ),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk
        assert response.data["employee"]["id"] == timesheet.employee_id

    def test_name_listed_next_to_a_wildcard_is_required_on_a_create(self, authenticated_client, original_employee):
        response = authenticated_client.post(
            reverse("timesheet.timesheetwildcardwrite-list", query={EXPAND_PARAM: "supervisor,*"}),
            data={"period_start": "2024-03-01", "period_end": "2024-03-15", "employee": original_employee.pk},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert set(response.data) - {"serverStack"} == {"supervisor"}

    def test_wildcard_with_an_undeclared_name_rejects_that_name_and_saves_nothing(
        self, authenticated_client, timesheet, original_employee, other_employee
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "*,nope"}
            ),
            data={"supervisor": other_employee.pk},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert set(response.data) - {"serverStack"} == {"nope"}
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == original_employee.pk

    def test_dotted_wildcard_reads_its_relation_as_a_nested_object(
        self, authenticated_client, timesheet, other_employee
    ):
        # `supervisor.*` reads `supervisor` as a nested object. Its own `user` stays a primary key in the body,
        # and the response expands it.
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "supervisor.*"},
            ),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk
        assert response.data["supervisor"]["user"]["id"] == other_employee.user_id

    def test_dotted_wildcard_that_a_permit_list_holds_reads_its_relation_as_a_nested_object(
        self, authenticated_client, timesheet, other_employee, monkeypatch
    ):
        # The permit list holds `supervisor.*` as the request writes it, not the `supervisor` that it cuts to.
        monkeypatch.setattr(
            TimesheetWildcardWriteViewSet, "permit_partial_update_expands", ["supervisor.*"], raising=False
        )
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "supervisor.*"},
            ),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk
        assert response.data["supervisor"]["user"]["id"] == other_employee.user_id

    def test_dotted_name_writes_through_its_relation(self, authenticated_client, timesheet, other_employee):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "supervisor.user"},
            ),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk
        assert response.data["supervisor"]["user"]["id"] == other_employee.user_id

    @pytest.mark.parametrize("expand", ["*.*", "supervisor.nope"])
    def test_invalid_nested_name_is_rejected_and_saves_nothing(
        self, authenticated_client, timesheet, original_employee, other_employee, expand
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: expand}
            ),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert set(response.data) - {"serverStack"} == {expand}
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == original_employee.pk

    @pytest.mark.parametrize(
        "expand, supervisor",
        [
            ("*", "pk"),
            ("supervisor.user", "object"),
        ],
    )
    def test_action_that_runs_no_viewset_check_accepts_valid_names(
        self, authenticated_client, timesheet, other_employee, expand, supervisor
    ):
        body = other_employee.pk if supervisor == "pk" else {"id": other_employee.pk}
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-save-through-action",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: expand},
            ),
            data={"supervisor": body},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk

    def build_serializer_with_expand_argument(self, timesheet, request_expand, data):
        """Build the view's serializer for a `PATCH` whose request sends `request_expand`, with `expand=supervisor`."""
        request = Request(
            APIRequestFactory().patch("/", {}, format="json", QUERY_STRING=f"{EXPAND_PARAM}={request_expand}")
        )
        request.user = self.users["test_user@domain.invalid"]
        view = TimesheetWildcardWriteViewSet(
            request=request, action="partial_update", format_kwarg=None, kwargs={"pk": timesheet.pk}
        )
        return TimesheetWildcardWriteSerializer(
            timesheet,
            data=data,
            partial=True,
            **{EXPAND_PARAM: ["supervisor"]},
            context={"request": request, "view": view},
        )

    def test_expand_argument_replaces_the_request_e_in_the_e_check(self, timesheet, other_employee):
        # The request's `e=nope` would fail the `e` check. The `expand` argument replaces it, so the check
        # sees only `supervisor`, and `supervisor` reads a nested object.
        serializer = self.build_serializer_with_expand_argument(
            timesheet, "nope", {"supervisor": {"id": other_employee.pk}}
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk

    def test_expand_argument_replaces_the_request_e_in_the_body_swap(
        self, timesheet, original_employee, other_employee
    ):
        # The request's `e=employee` would swap `employee` for a nested serializer. The `expand` argument
        # replaces it, so `employee` stays a primary key field and rejects the object.
        serializer = self.build_serializer_with_expand_argument(
            timesheet, "employee", {"employee": {"id": other_employee.pk}}
        )

        assert not serializer.is_valid()
        assert [error.code for error in serializer.errors["employee"]] == ["incorrect_type"]
        timesheet.refresh_from_db()
        assert timesheet.employee_id == original_employee.pk

    @pytest.mark.parametrize("expand", ["nope", "supervisor.nope", "*.*"])
    def test_action_that_runs_no_viewset_check_rejects_invalid_names_like_a_read(
        self, authenticated_client, timesheet, original_employee, other_employee, expand
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetwildcardwrite-save-through-action",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: expand},
            ),
            # With `e=nope`, `supervisor` keeps its pk field and this object would fail it. The `e` check runs
            # before the body is read, so the response names the invalid expand.
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert set(response.data) - {"serverStack"} == {expand}
        assert str(response.data[expand][0]).startswith("Invalid expands. Permitted expands are ")
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == original_employee.pk

    @pytest.mark.parametrize(
        "expand, supervisor, status",
        [
            # Each row reads the request's `e`, so `supervisor` takes a nested object in every row.
            ("supervisor", "object", HTTPStatus.NO_CONTENT),
            # A wildcard reads no relation as a nested object in a bulk write either.
            ("*", "object", HTTPStatus.BAD_REQUEST),
            ("*", "pk", HTTPStatus.NO_CONTENT),
        ],
    )
    def test_bulk_write_reads_e_in_every_row(
        self, authenticated_client, original_employee, other_employee, expand, supervisor, status
    ):
        value = other_employee.pk if supervisor == "pk" else {"id": other_employee.pk}
        row = {"period_start": "2024-03-01", "period_end": "2024-03-15", "employee": original_employee.pk}
        response = authenticated_client.post(
            reverse("timesheet.timesheetwildcardwrite-validate-many-through-action", query={EXPAND_PARAM: expand}),
            data=[{**row, "supervisor": value}, {**row, "supervisor": value}],
            format="json",
        )

        assert response.status_code == status, response_body(response)

    def test_bulk_write_rejects_an_invalid_name(self, authenticated_client, original_employee):
        row = {"period_start": "2024-03-01", "period_end": "2024-03-15", "employee": original_employee.pk}
        response = authenticated_client.post(
            reverse("timesheet.timesheetwildcardwrite-validate-many-through-action", query={EXPAND_PARAM: "nope"}),
            data=[row],
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "nope" in str(response.data)

    def test_bulk_write_reports_an_unknown_key_in_a_row(self, authenticated_client, original_employee):
        # Each row's extra-field check reads that row. It used to read the whole list and fail with a 500.
        row = {"period_start": "2024-03-01", "period_end": "2024-03-15", "employee": original_employee.pk}
        response = authenticated_client.post(
            reverse("timesheet.timesheetwildcardwrite-validate-many-through-action"),
            data=[row, {**row, "bogus": 1}],
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "bogus" in str(response.data), response_body(response)
        assert "Invalid field." in str(response.data), response_body(response)

    def test_bulk_write_saves_rows_that_send_primary_keys(
        self, authenticated_client, original_employee, other_employee
    ):
        row = {"period_start": "2024-03-01", "period_end": "2024-03-15", "employee": original_employee.pk}
        response = authenticated_client.post(
            reverse("timesheet.timesheetwildcardwrite-create-many-through-action", query={EXPAND_PARAM: "*"}),
            data=[{**row, "supervisor": other_employee.pk}, {**row, "supervisor": original_employee.pk}],
            format="json",
        )

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        assert sorted(Timesheet.objects.values_list("supervisor_id", flat=True)) == sorted(
            [other_employee.pk, original_employee.pk]
        )

    def test_wildcard_with_a_body_that_is_not_an_object_answers_400(self, authenticated_client, timesheet):
        response = authenticated_client.patch(
            reverse("timesheet.timesheetwildcardwrite-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "*"}),
            data=[{"id": timesheet.pk}],
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
