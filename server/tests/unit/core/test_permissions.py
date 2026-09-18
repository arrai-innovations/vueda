from datetime import date
from typing import ClassVar

import pytest
from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.urls import reverse
from rest_framework.permissions import BasePermission
from rest_framework.views import APIView

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.employee.models import Employee
from tests.timesheet.models import Timesheet
from tests.timesheet.viewsets import TimesheetViewSet
from vueda.core.permissions import check_action_permission


@pytest.mark.django_db
class TestObjectPermissions(BaseTestAssertResponseMixin, BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Reader": [
            ("timesheet", "Timesheet", "read"),
        ],
        "Timesheet Creator": [
            ("timesheet", "Timesheet", "create"),
        ],
        "Timesheet Updater": [
            ("timesheet", "Timesheet", "update"),
        ],
        "Timesheet Deleter": [
            ("timesheet", "Timesheet", "delete"),
        ],
        "Timesheet Lister": [
            ("timesheet", "Timesheet", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_user+timesheet+reader@domain.invalid": {
            "name": "Test User reader",
            "password": "testpass",
            "groups": ["Timesheet Reader"],
        },
        "test_user+timesheet+creator@domain.invalid": {
            "name": "Test User creator",
            "password": "testpass",
            "groups": ["Timesheet Creator"],
        },
        "test_user+timesheet+updater@domain.invalid": {
            "name": "Test User updater",
            "password": "testpass",
            "groups": ["Timesheet Updater"],
        },
        "test_user+timesheet+deleter@domain.invalid": {
            "name": "Test User deleter",
            "password": "testpass",
            "groups": ["Timesheet Deleter"],
        },
        "test_user+timesheet+lister@domain.invalid": {
            "name": "Test User lister",
            "password": "testpass",
            "groups": ["Timesheet Lister"],
        },
        "test_user+timesheet+no_permissions@domain.invalid": {
            "name": "Test User no permissions",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.mark.parametrize(
        "email,http_method",
        [
            ("test_user+timesheet+reader@domain.invalid", "GET"),
            ("test_user+timesheet+creator@domain.invalid", "POST"),
            ("test_user+timesheet+updater@domain.invalid", "PUT"),
            ("test_user+timesheet+updater@domain.invalid", "PATCH"),
            ("test_user+timesheet+deleter@domain.invalid", "DELETE"),
            ("test_user+timesheet+lister@domain.invalid", "GET"),
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
        # add f= querystring to details, and only ask for certain fields
        detail_url = reverse(
            "timesheet.timesheet-detail",
            kwargs={"pk": t1.pk},
            query={
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,employee,period_start,period_end",
            },
        )
        list_url = reverse("timesheet.timesheet-list")
        match http_method:
            case "GET":
                url = list_url if "lister" in email else detail_url
                response = api_client.get(url, format="json")
                self.assert_response(response, 200)
                if "lister" in email:
                    assert len(response.data["results"]) == 1, response_body(response)
                    assert response.data["results"][0]["id"] == t1.pk, response_body(response)
                else:
                    assert response.data["id"] == t1.pk, response_body(response)
                    assert response.data["employee"] == e1.pk, response_body(response)
                    assert response.data["period_start"] == "2024-02-15", response_body(response)
                    assert response.data["period_end"] == "2024-02-29", response_body(response)
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
                assert response.data["employee"] == e1.pk, response_body(response)
                assert response.data["period_start"] == "2024-03-01", response_body(response)
                assert response.data["period_end"] == "2024-03-15", response_body(response)
                assert response.data["id"], response_body(response)
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
                assert response.data["employee"] == e1.pk, response_body(response)
                assert response.data["period_start"] == "2024-02-16", response_body(response)
                assert response.data["period_end"] == "2024-03-01", response_body(response)
                assert response.data["id"] == t1.pk, response_body(response)
            case "PATCH":
                response = api_client.patch(
                    detail_url,
                    format="json",
                    data={
                        "period_start": "2024-02-17",
                    },
                )
                self.assert_response(response, 200)
                assert response.data["employee"] == e1.pk, response_body(response)
                assert response.data["period_start"] == "2024-02-17", response_body(response)
                assert response.data["period_end"] == "2024-02-29", response_body(response)
                assert response.data["id"] == t1.pk, response_body(response)
            case "DELETE":
                response = api_client.delete(detail_url, format="json")
                self.assert_response(response, 204)
                assert not Timesheet.objects.filter(pk=t1.pk).exists()
                assert response.data is None, response_body(response)
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
        user = self.users["test_user+timesheet+no_permissions@domain.invalid"]
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
        detail_url = reverse("timesheet.timesheet-detail", kwargs={"pk": t1.pk})
        list_url = reverse("timesheet.timesheet-list")
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


@pytest.mark.django_db
class TestAvailableActionsSeparatesListFromRetrieve(BaseTestAssertResponseMixin, BaseTestGroupMixin, BaseTestUserMixin):
    """
    ``available_actions`` decides each CRUD action against its own required permission, not
    against the permission the surrounding response already required. Reproduces #292: ``list``
    and ``retrieve`` both map to ``GET``, and ``AvailableActionsField.get_value`` passed the real
    viewset straight through to the permission check, so ``ObjectPermissions`` read the response's
    own action (``list`` for a list response, ``retrieve`` for a detail response) for every action
    under test rather than the action the loop was actually checking. A list response therefore
    reported ``retrieve`` as available to a list-only requester, and a detail response reported
    ``list`` as available to a read-only requester.
    """

    groups_to_create: ClassVar[dict] = {
        "Timesheet Lister Only": [("timesheet", "Timesheet", "list")],
        "Timesheet Reader Only": [("timesheet", "Timesheet", "read")],
        "Timesheet Lister And Reader": [
            ("timesheet", "Timesheet", "list"),
            ("timesheet", "Timesheet", "read"),
        ],
        "Timesheet Updater And Lister Only": [
            ("timesheet", "Timesheet", "update"),
            ("timesheet", "Timesheet", "list"),
        ],
        "Timesheet Updater And Reader Only": [
            ("timesheet", "Timesheet", "update"),
            ("timesheet", "Timesheet", "read"),
        ],
        "Timesheet Deleter And Reader Only": [
            ("timesheet", "Timesheet", "delete"),
            ("timesheet", "Timesheet", "read"),
        ],
        "Timesheet Override Denied": [],
        "Timesheet Django Override Denied": [],
    }

    users_to_create: ClassVar[dict] = {
        "lister@domain.invalid": {
            "name": "Lister",
            "password": "testpass",
            "groups": ["Timesheet Lister Only"],
        },
        "reader@domain.invalid": {
            "name": "Reader",
            "password": "testpass",
            "groups": ["Timesheet Reader Only"],
        },
        "both@domain.invalid": {
            "name": "Both",
            "password": "testpass",
            "groups": ["Timesheet Lister And Reader"],
        },
        "updater_lister@domain.invalid": {
            "name": "Updater Lister",
            "password": "testpass",
            "groups": ["Timesheet Updater And Lister Only"],
        },
        "updater_reader@domain.invalid": {
            "name": "Updater Reader",
            "password": "testpass",
            "groups": ["Timesheet Updater And Reader Only"],
        },
        "updater_reader_denied@domain.invalid": {
            "name": "Updater Reader Denied",
            "password": "testpass",
            "groups": ["Timesheet Updater And Reader Only", "Timesheet Override Denied"],
        },
        "deleter_reader_django_denied@domain.invalid": {
            "name": "Deleter Reader Django Denied",
            "password": "testpass",
            "groups": ["Timesheet Deleter And Reader Only", "Timesheet Django Override Denied"],
        },
    }

    @pytest.fixture
    def timesheet(self):
        employee = Employee.objects.create(user=self.users["reader@domain.invalid"], employee_number="abcd-1234")
        return Timesheet.objects.create(
            employee=employee,
            period_start=date(2024, 2, 15),
            period_end=date(2024, 2, 29),
        )

    def list_row_actions(self, client, timesheet):
        response = client.get(
            reverse(
                "timesheet.timesheet-list",
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,available_actions"},
            ),
        )
        self.assert_response(response, 200)
        row = next(row for row in response.data["results"] if row["id"] == timesheet.pk)
        return set(row["available_actions"])

    def detail_actions(self, client, timesheet):
        response = client.get(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": timesheet.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "available_actions"},
            ),
        )
        self.assert_response(response, 200)
        return set(response.data["available_actions"])

    def test_list_permission_alone_does_not_grant_retrieve_in_a_list_response(self, api_client, timesheet):
        api_client.force_authenticate(user=self.users["lister@domain.invalid"])

        actions = self.list_row_actions(api_client, timesheet)

        assert "list" in actions
        assert "retrieve" not in actions

    def test_read_permission_alone_does_not_grant_list_in_a_detail_response(self, api_client, timesheet):
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        actions = self.detail_actions(api_client, timesheet)

        assert "retrieve" in actions
        assert "list" not in actions

    def test_both_permissions_keep_both_entries_in_either_response(self, api_client, timesheet):
        api_client.force_authenticate(user=self.users["both@domain.invalid"])

        assert {"list", "retrieve"}.issubset(self.list_row_actions(api_client, timesheet))
        assert {"list", "retrieve"}.issubset(self.detail_actions(api_client, timesheet))

    def patch_actions(self, client, timesheet):
        response = client.patch(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": timesheet.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "available_actions"},
            ),
            format="json",
            data={"period_start": "2024-02-17"},
        )
        self.assert_response(response, 200)
        return set(response.data["available_actions"])

    def test_list_permission_alone_does_not_grant_retrieve_in_a_write_response(self, api_client, timesheet):
        """The collision applies equally to a write response: its own action (PATCH) never
        collides with list/retrieve, but the CRUD loop behind its available_actions still checks
        both of them, and must not substitute one's permission for the other's there either."""
        api_client.force_authenticate(user=self.users["updater_lister@domain.invalid"])

        actions = self.patch_actions(api_client, timesheet)

        assert "update" in actions
        assert "list" in actions
        assert "retrieve" not in actions

    def test_read_permission_alone_does_not_grant_list_in_a_write_response(self, api_client, timesheet):
        api_client.force_authenticate(user=self.users["updater_reader@domain.invalid"])

        actions = self.patch_actions(api_client, timesheet)

        assert "update" in actions
        assert "retrieve" in actions
        assert "list" not in actions

    def test_a_viewsets_check_object_permissions_override_is_honoured_by_discovery(self, api_client, timesheet):
        """
        Reproduces PR #288's review: object-action discovery must decide through the viewset's own
        ``check_object_permissions`` hook, not through its permission classes alone, so a viewset
        that overrides that hook to add its own object-level rules is honoured in ``available_actions``
        the same way it is already honoured for the live request. ``TimesheetViewSet`` denies a
        ``Timesheet Override Denied`` member's write past what ``update_timesheet`` alone would allow.
        """
        api_client.force_authenticate(user=self.users["updater_reader_denied@domain.invalid"])

        actions = self.detail_actions(api_client, timesheet)

        assert "retrieve" in actions
        assert "update" not in actions
        assert "partial_update" not in actions

        response = api_client.patch(
            reverse("timesheet.timesheet-detail", kwargs={"pk": timesheet.pk}),
            format="json",
            data={"period_start": "2024-02-17"},
        )
        self.assert_response(response, 403)

    def test_an_unauthenticated_objects_refusal_is_reported_as_unavailable_not_a_failure(
        self, api_client, timesheet, monkeypatch
    ):
        """
        ``APIView.permission_denied()`` raises ``NotAuthenticated``, not ``PermissionDenied``, once a
        request carries authenticators and none of them succeeded -- exactly what an anonymous
        requester looks like once any authentication backend is configured. Discovery's fake
        per-action request copies the real request's authenticators, so an anonymous requester takes
        that path too. Before the fix, that exception escaped ``check_action_permission()`` and failed
        the whole response with a 401 instead of leaving "retrieve" out of ``available_actions`` and
        returning the list normally (issue #306).
        """

        class PermitModelDenyRetrieveObject(BasePermission):
            def has_permission(self, request, view):
                return True

            def has_object_permission(self, request, view, obj):
                return getattr(view, "action", None) != "retrieve"

        monkeypatch.setattr(TimesheetViewSet, "permission_classes", [PermitModelDenyRetrieveObject])

        actions = self.list_row_actions(api_client, timesheet)

        assert "list" in actions
        assert "retrieve" not in actions

    def test_a_viewsets_check_object_permissions_override_raising_djangos_permission_denied_is_honoured_by_discovery(
        self, api_client, timesheet
    ):
        """
        A ``check_object_permissions`` override can just as easily raise Django's own
        ``PermissionDenied`` as DRF's -- a separate class of the same name -- and discovery must treat
        that refusal the same way it already treats DRF's: leaving the one action out rather than
        letting it escape and fail the whole response (issue #306). ``TimesheetViewSet`` denies a
        ``Timesheet Django Override Denied`` member's delete this way.
        """
        api_client.force_authenticate(user=self.users["deleter_reader_django_denied@domain.invalid"])

        actions = self.detail_actions(api_client, timesheet)

        assert "retrieve" in actions
        assert "destroy" not in actions

        response = api_client.delete(reverse("timesheet.timesheet-detail", kwargs={"pk": timesheet.pk}))
        self.assert_response(response, 403)

    def test_a_faulty_permission_override_still_surfaces_its_own_error(self, api_client, timesheet, monkeypatch):
        """
        Discovery must catch a refusal, not every error: a permission class that raises ``TypeError``
        because of its own bug is not reporting that an action is unavailable, and must still surface
        as the application's own error response rather than be swallowed and reported as a quiet
        absence (issue #306).
        """

        class FaultyPermission(BasePermission):
            def has_permission(self, request, view):
                return True

            def has_object_permission(self, request, view, obj):
                raise TypeError("faulty override")

        monkeypatch.setattr(TimesheetViewSet, "permission_classes", [FaultyPermission])
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        response = api_client.get(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": timesheet.pk},
                query={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "available_actions"},
            ),
        )

        self.assert_response(response, 500)
        assert "TypeError" in response.data["serverStack"]


class TestCheckActionPermissionRefusals:
    """
    Unit-level coverage for ``check_action_permission()``'s own except clause, alongside the
    viewset-level coverage above (issue #306).
    """

    def test_an_unauthenticated_object_refusal_reports_the_action_as_unavailable(self):
        class AnonReadDeniesObject(BasePermission):
            def has_permission(self, request, view):
                return True

            def has_object_permission(self, request, view, obj):
                return False

        class FakeViewSet(APIView):
            action = "retrieve"

            def get_permissions(self):
                return [AnonReadDeniesObject()]

        class FakeRequest:
            def __init__(self):
                self.user = None
                self.authenticators = ["some-authenticator"]
                self.successful_authenticator = None

        assert check_action_permission(FakeViewSet(), FakeRequest(), object(), "retrieve") is False

    def test_a_djangos_permission_denied_override_reports_the_action_as_unavailable(self):
        class RaisesDjangoPermissionDenied(APIView):
            action = "retrieve"

            def get_permissions(self):
                return []

            def check_object_permissions(self, request, obj):
                raise DjangoPermissionDenied()

        class FakeRequest:
            def __init__(self):
                self.user = None
                self.authenticators = ()
                self.successful_authenticator = None

        assert check_action_permission(RaisesDjangoPermissionDenied(), FakeRequest(), object(), "retrieve") is False
