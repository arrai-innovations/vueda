"""
An expand cannot write a field that the write may not set (#678).

``TimesheetLockedExpandsSerializer`` expands every locked field. ``exclude_update_fields`` locks
``employee``. ``exclude_create_fields`` locks ``supervisor`` and the reverse relation ``timesheet_entries``.
``manager`` expands ``supervisor`` under another name. ``approved_by`` and the many-to-many ``reviewers`` are
``editable=False``, and ``approver`` expands ``approved_by`` with ``read_only: False``. ``timesheet_entries`` is
also in ``Meta.read_only_fields``, which locks only its list of primary keys, so its expand writes rows on an
update.

Each request links a different employee by primary key. A pk-only entry links the existing row without
saving it, so the test shows whether the write set the relation and nothing else.
"""

import datetime
from decimal import Decimal
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
from tests.timesheet.serializers import TimesheetLockedExpandsSerializer
from tests.timesheet.viewsets import TimesheetLockedExpandsViewSet
from vueda.core.serializers import _expand_is_locked
from vueda.core.serializers import _model_field_is_editable
from vueda.workflow.models import ObjectState
from vueda.workflow.models import ObjectStateProxy


EXPAND_PARAM = settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]


@pytest.mark.django_db
class TestExpandWriteLocks(BaseTestUserMixin):
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
            approved_by=original_employee,
        )

    def test_update_does_not_set_a_field_that_exclude_update_fields_lists(
        self, authenticated_client, timesheet, original_employee, other_employee
    ):
        response = authenticated_client.put(
            reverse(
                "timesheet.timesheetlockedexpands-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "employee"}
            ),
            data={
                "period_start": "2024-02-01",
                "period_end": "2024-02-15",
                "employee": {"id": other_employee.pk},
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.employee_id == original_employee.pk

    def test_partial_update_does_not_set_a_field_that_exclude_update_fields_lists(
        self, authenticated_client, timesheet, original_employee, other_employee
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetlockedexpands-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "employee"}
            ),
            data={"employee": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.employee_id == original_employee.pk

    def test_update_still_sets_a_field_that_only_create_excludes(self, authenticated_client, timesheet, other_employee):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetlockedexpands-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "supervisor"},
            ),
            data={"supervisor": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.supervisor_id == other_employee.pk

    @pytest.mark.parametrize("expand", ["supervisor", "manager"])
    def test_create_does_not_set_a_field_that_exclude_create_fields_lists(
        self, authenticated_client, original_employee, other_employee, expand
    ):
        response = authenticated_client.post(
            reverse("timesheet.timesheetlockedexpands-list", query={EXPAND_PARAM: expand}),
            data={
                "period_start": "2024-03-01",
                "period_end": "2024-03-15",
                "employee": original_employee.pk,
                expand: {"id": other_employee.pk},
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        assert Timesheet.objects.get(pk=response.data["id"]).supervisor_id is None

    def test_write_does_not_set_an_editable_false_field(
        self, authenticated_client, timesheet, original_employee, other_employee
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetlockedexpands-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "approved_by"},
            ),
            data={"approved_by": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.approved_by_id == original_employee.pk

    def test_write_does_not_link_rows_to_an_editable_false_many_to_many_field(
        self, authenticated_client, timesheet, other_employee
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetlockedexpands-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "reviewers"},
            ),
            data={"reviewers": [{"id": other_employee.pk}]},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert list(timesheet.reviewers.all()) == []

    def test_expand_constructor_argument_does_not_set_a_field_that_exclude_update_fields_lists(
        self, timesheet, original_employee, other_employee
    ):
        # An expand passed to the constructor is built in get_fields(), not from the request's `e` parameter.
        request = Request(APIRequestFactory().patch("/", {}, format="json"))
        request.user = self.users["test_user@domain.invalid"]
        view = TimesheetLockedExpandsViewSet(
            request=request, action="partial_update", format_kwarg=None, kwargs={"pk": timesheet.pk}
        )
        serializer = TimesheetLockedExpandsSerializer(
            timesheet,
            data={"employee": {"id": other_employee.pk}},
            partial=True,
            **{EXPAND_PARAM: ["employee"]},
            context={"request": request, "view": view},
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        timesheet.refresh_from_db()
        assert timesheet.employee_id == original_employee.pk

    def test_read_only_false_option_unlocks_an_editable_false_field(
        self, authenticated_client, timesheet, other_employee
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetlockedexpands-detail", kwargs={"pk": timesheet.pk}, query={EXPAND_PARAM: "approver"}
            ),
            data={"approver": {"id": other_employee.pk}},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        timesheet.refresh_from_db()
        assert timesheet.approved_by_id == other_employee.pk

    def test_create_does_not_write_rows_of_a_reverse_relation_that_exclude_create_fields_lists(
        self, authenticated_client, original_employee
    ):
        response = authenticated_client.post(
            reverse("timesheet.timesheetlockedexpands-list", query={EXPAND_PARAM: "timesheet_entries"}),
            data={
                "period_start": "2024-03-01",
                "period_end": "2024-03-15",
                "employee": original_employee.pk,
                "timesheet_entries": [{"date": "2024-03-02", "hours": "7.50"}],
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        assert not Timesheet.objects.get(pk=response.data["id"]).timesheet_entries.exists()

    def test_reverse_relation_in_read_only_fields_still_writes_through_its_expand(
        self, authenticated_client, timesheet
    ):
        response = authenticated_client.patch(
            reverse(
                "timesheet.timesheetlockedexpands-detail",
                kwargs={"pk": timesheet.pk},
                query={EXPAND_PARAM: "timesheet_entries"},
            ),
            data={"timesheet_entries": [{"date": "2024-02-02", "hours": "7.50"}]},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert list(timesheet.timesheet_entries.values_list("date", "hours")) == [
            (datetime.date(2024, 2, 2), Decimal("7.50"))
        ]


@pytest.mark.django_db
def test_model_info_reports_an_expand_of_an_editable_false_field_as_read_only():
    expands = {
        expand["name"]: expand["read_only"]
        for expand in TimesheetLockedExpandsSerializer().generate_expand_model_info()
    }

    assert expands["approved_by"] is True
    assert expands["reviewers"] is True
    # An explicit read_only option wins over editable=False.
    assert expands["approver"] is False
    # Model info cannot report the exclusions yet (#638), so the excluded fields' expands stay writable.
    assert expands["employee"] is False
    assert expands["supervisor"] is False
    assert expands["timesheet_entries"] is False
    assert expands["manager"] is False


@pytest.mark.parametrize(
    "model, field_name, editable",
    [
        (Timesheet, "employee", True),
        (Timesheet, "approved_by", False),
        (Timesheet, "reviewers", False),
        # A reverse foreign key: Django marks it editable=False, but the parent writes its rows.
        (Timesheet, "timesheet_entries", True),
        # A GenericRelation holds another model's rows, like a reverse foreign key.
        (ObjectState, "object_state_proxy", True),
        (ObjectStateProxy, "object", False),
        (Timesheet, "not_a_field", True),
    ],
)
def test_model_field_is_editable(model, field_name, editable):
    assert _model_field_is_editable(model, field_name) is editable


@pytest.mark.parametrize(
    "name, expand_options, excluded, locked",
    [
        ("employee", {}, frozenset(), False),
        ("employee", {}, frozenset({"employee"}), True),
        # An expand whose source names an excluded field is locked.
        ("manager", {"source": "supervisor"}, frozenset({"supervisor"}), True),
        # A dotted source writes through the relation that its first part names.
        ("employee_user", {"source": "employee.user"}, frozenset({"employee"}), True),
        ("approver_user", {"source": "approved_by.user"}, frozenset(), True),
        ("approved_by", {}, frozenset(), True),
        # An explicit read_only option wins over editable=False, but not over an exclusion.
        ("approved_by", {"read_only": False}, frozenset(), False),
        ("employee", {"read_only": False}, frozenset({"employee"}), True),
        ("employee", {"read_only": True}, frozenset(), True),
    ],
)
def test_expand_is_locked(name, expand_options, excluded, locked):
    assert _expand_is_locked(Timesheet, name, expand_options, excluded) is locked
