"""
A write request validates its body without computing ``available_actions`` (issue #634).

DRF's ``Serializer.get_initial()`` calls ``get_value`` on every field, read-only fields included.
``AvailableActionsField`` used to compute actions in ``get_value``. Each write then passed the request
body dict to ``check_action_permission`` and to ``get_allowed_extra_actions`` as ``instance``. An
override shaped like the Control Action Availability guide's example read an attribute of that dict,
and every write answered ``500``.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.urls import reverse

from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import viewsets as store_viewsets
from vueda.core.serializers import fields as serializer_fields
from vueda.core.viewsets import VuedaViewSet


class SuperuserTestData(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "superuser@domain.invalid": {
            "name": "Superuser",
            "password": "testpass",
            "is_superuser": True,
        },
    }


@pytest.mark.django_db
class TestAvailableActionsOnWrite:
    @pytest.fixture
    def extra_actions_instances(self, monkeypatch):
        """
        Give ``DistributorViewSet`` the guide's override shape, and record each ``instance`` it receives.

        The override offers no extra actions on a distributor whose description is "locked".
        """
        received = []

        def get_allowed_extra_actions(viewset, request, *, instance=None):
            received.append(instance)
            if instance is not None and instance.description == "locked":
                return frozenset()
            return VuedaViewSet.get_allowed_extra_actions(viewset, request, instance=instance)

        monkeypatch.setattr(store_viewsets.DistributorViewSet, "get_allowed_extra_actions", get_allowed_extra_actions)
        return received

    @pytest.fixture
    def permission_check_instances(self, monkeypatch):
        """Record each ``instance`` that ``AvailableActionsField`` passes to ``check_action_permission``."""
        received = []
        check_action_permission = serializer_fields.check_action_permission

        def recording_check_action_permission(viewset, request, instance, action):
            received.append(instance)
            return check_action_permission(viewset, request, instance, action)

        monkeypatch.setattr(serializer_fields, "check_action_permission", recording_check_action_permission)
        return received

    @pytest.fixture
    def superuser_client(self, api_client):
        api_client.force_authenticate(user=SuperuserTestData().users["superuser@domain.invalid"])
        return api_client

    def test_create_does_not_compute_actions_for_the_request_body(
        self, superuser_client, extra_actions_instances, permission_check_instances
    ):
        response = superuser_client.post(
            reverse("store.distributor-list"),
            data={"name": "Acme", "description": "locked"},
            format="json",
        )

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        assert extra_actions_instances == []
        assert permission_check_instances == []

    def test_invalid_create_does_not_compute_actions_for_the_request_body(
        self, superuser_client, extra_actions_instances, permission_check_instances
    ):
        response = superuser_client.post(
            reverse("store.distributor-list"),
            data={"description": "locked"},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "name" in response.data
        assert extra_actions_instances == []
        assert permission_check_instances == []

    @pytest.mark.parametrize("method", ("put", "patch"))
    def test_update_does_not_compute_actions_for_the_request_body(
        self, superuser_client, extra_actions_instances, permission_check_instances, method
    ):
        distributor = store_models.Distributor.objects.create(name="Acme", description="open")

        response = getattr(superuser_client, method)(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"name": "Acme", "description": "locked"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert extra_actions_instances == []
        assert permission_check_instances == []

    def test_create_response_reports_actions_for_the_saved_object(self, superuser_client, extra_actions_instances):
        response = superuser_client.post(
            reverse(
                "store.distributor-list",
                query={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,available_actions"},
            ),
            data={"name": "Acme", "description": "open"},
            format="json",
        )

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        distributor = store_models.Distributor.objects.get(pk=response.data["id"])
        assert extra_actions_instances == [distributor]
        assert "history-list" in response.data["available_actions"]

    def test_update_response_reports_actions_for_the_saved_object(self, superuser_client, extra_actions_instances):
        distributor = store_models.Distributor.objects.create(name="Acme", description="open")

        response = superuser_client.patch(
            reverse(
                "store.distributor-detail",
                kwargs={"pk": distributor.pk},
                query={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,available_actions"},
            ),
            data={"description": "locked"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert extra_actions_instances == [distributor]
        assert extra_actions_instances[0].description == "locked"
        assert "history-list" not in response.data["available_actions"]
        assert "update" in response.data["available_actions"]
