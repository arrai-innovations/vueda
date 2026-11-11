"""
``model_actions`` and ``available_actions`` offer an extra action only when the user passes the
permission check that its endpoint runs, and ``method_names`` lists only the methods that pass.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework.permissions import AllowAny
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate

from tests.bulk_actions import models as bulk_models
from tests.bulk_actions import serializers as bulk_serializers
from tests.bulk_actions import viewsets as bulk_viewsets
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from vueda import info
from vueda.core.decorators import action
from vueda.core.permissions import check_action_permission
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.core.viewsets import VuedaViewSet
from vueda.info.serializers import ModelInfoSerializer
from vueda.vdq.serializers import SentItemSerializer
from vueda.vdq.viewsets import SentItemViewSet


class DenyAll(BasePermission):
    def has_permission(self, request, view):
        return False


class DistributorActionsViewSet(VuedaViewSet):
    queryset = store_models.Distributor.objects.all()
    serializer_class = store_serializers.DistributorSerializer

    @action(detail=False, methods=["post"], permission_classes=())
    def open_to_all(self, request):
        raise NotImplementedError

    @action(detail=False, methods=["post"], permission_classes=[DenyAll])
    def own_classes(self, request):
        raise NotImplementedError

    @action(detail=False, methods=["get", "post"])
    def read_or_write(self, request):
        raise NotImplementedError


class OnlyServedAction(BasePermission):
    """Admit only the ``served_action`` action, so any other action checked with this class fails."""

    def has_permission(self, request, view):
        return view.action == "served_action"


class DistributorServedActionViewSet(DistributorActionsViewSet):
    @action(detail=False, methods=["get"], permission_classes=[OnlyServedAction])
    def served_action(self, request):
        return Response(
            {
                "extra_actions": sorted(self.get_allowed_extra_actions(request)),
                "create": check_action_permission(self, request, None, "create"),
            }
        )


class DistributorActionSelectedPermissionsViewSet(VuedaViewSet):
    queryset = store_models.Distributor.objects.all()
    serializer_class = store_serializers.DistributorSerializer

    def get_permissions(self):
        if self.action in ("list", "selected_open"):
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=["get"])
    def selected_open(self, request):
        raise NotImplementedError


class DistributorReadOnlyActionsViewSet(VuedaReadOnlyViewSet):
    queryset = store_models.Distributor.objects.all()
    serializer_class = store_serializers.DistributorSerializer

    @action(detail=False, methods=["post"])
    def write_action(self, request):
        raise NotImplementedError


def model_actions_expecting_ok(client, app_label, model_name):
    """Request a model's info with ``model_actions`` expanded, and map each action name to its methods."""
    response = client.get(
        reverse("info.model_info-detail", args=(app_label, model_name)),
        format="json",
        data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_actions"},
    )
    assert response.status_code == HTTPStatus.OK, response_body(response)
    return {entry["name"]: entry["method_names"] for entry in response.data["model_actions"]}


@pytest.fixture
def registry():
    """Leave an empty registry behind each test that registers its own models."""
    info.registration.get_empty_registry()
    yield info
    info.registration.get_empty_registry()


@pytest.mark.django_db
class TestResendAvailability(BaseTestUserMixin, BaseTestGroupMixin):
    # `read` lets both users read the model info of `sentitem`, which needs at least one permitted action.
    groups_to_create: ClassVar[dict] = {"Sent Item Reader": [("vueda_vdq", "SentItem", "read")]}

    users_to_create: ClassVar[dict] = {
        "resender@domain.invalid": {"name": "Resender", "password": "testpass", "groups": ["Sent Item Reader"]},
        "no-resend@domain.invalid": {"name": "No Resend", "password": "testpass", "groups": ["Sent Item Reader"]},
    }

    @pytest.fixture(autouse=True)
    def register_sent_item(self, registry):
        registry.register(SentItemSerializer, SentItemViewSet)

    def test_a_user_without_can_resend_does_not_see_resend(self, api_client):
        api_client.force_authenticate(user=self.users["no-resend@domain.invalid"])

        assert "resend" not in model_actions_expecting_ok(api_client, "vueda_vdq", "sentitem")

    def test_a_user_with_can_resend_sees_resend(self, api_client):
        user = self.users["resender@domain.invalid"]
        user.user_permissions.add(Permission.objects.get(codename="can_resend", content_type__app_label="vueda_vdq"))
        api_client.force_authenticate(user=user)

        assert model_actions_expecting_ok(api_client, "vueda_vdq", "sentitem")["resend"] == ["post"]


@pytest.mark.django_db
class TestDeactivateAvailability(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Gadget Reader": [
            ("bulk_actions", "IntegerKeyGadget", "list"),
            ("bulk_actions", "IntegerKeyGadget", "read"),
        ],
        "Gadget Editor": [
            ("bulk_actions", "IntegerKeyGadget", "list"),
            ("bulk_actions", "IntegerKeyGadget", "read"),
            ("bulk_actions", "IntegerKeyGadget", "update"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "reader@domain.invalid": {"name": "Reader", "password": "testpass", "groups": ["Gadget Reader"]},
        "editor@domain.invalid": {"name": "Editor", "password": "testpass", "groups": ["Gadget Editor"]},
    }

    @pytest.fixture(autouse=True)
    def register_gadget(self, registry):
        registry.register(bulk_serializers.IntegerKeyGadgetSerializer, bulk_viewsets.IntegerKeyGadgetViewSet)

    @staticmethod
    def available_actions(client, gadget):
        response = client.get(
            reverse("bulk_actions.integerkeygadget-detail", kwargs={"pk": gadget.pk}),
            data={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,available_actions"},
            format="json",
        )
        assert response.status_code == HTTPStatus.OK, response_body(response)
        return response.data["available_actions"]

    def test_a_user_without_update_does_not_see_deactivate_or_activate(self, api_client):
        gadget = bulk_models.IntegerKeyGadget.objects.create(name="Gadget")
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        model_actions = model_actions_expecting_ok(api_client, "bulk_actions", "integerkeygadget")
        available_actions = self.available_actions(api_client, gadget)

        assert "deactivate" not in model_actions
        assert "activate" not in model_actions
        assert "deactivate" not in available_actions
        assert "activate" not in available_actions

    def test_a_user_with_update_sees_deactivate_and_activate(self, api_client):
        gadget = bulk_models.IntegerKeyGadget.objects.create(name="Gadget")
        api_client.force_authenticate(user=self.users["editor@domain.invalid"])

        model_actions = model_actions_expecting_ok(api_client, "bulk_actions", "integerkeygadget")
        available_actions = self.available_actions(api_client, gadget)

        assert model_actions["deactivate"] == ["patch"]
        assert model_actions["activate"] == ["patch"]
        assert "deactivate" in available_actions
        assert "activate" in available_actions

    def test_an_object_that_refuses_update_does_not_offer_deactivate(self, api_client):
        gadget = bulk_models.IntegerKeyGadget.objects.create(name="Gadget", locked=True)
        api_client.force_authenticate(user=self.users["editor@domain.invalid"])

        available_actions = self.available_actions(api_client, gadget)

        assert "deactivate" not in available_actions
        assert "activate" not in available_actions


@pytest.mark.django_db
class TestExtraActionPermissionClasses(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        # Model info needs no permission of its own. This user reads it through the actions that every user
        # passes, such as `open-to-all`.
        "No Distributor Permission": [],
        "Distributor Reader": [("store", "Distributor", "read")],
        "Distributor Admin": [
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "Distributor", "create"),
            ("store", "Distributor", "update"),
            ("store", "Distributor", "delete"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "none@domain.invalid": {"name": "None", "password": "testpass", "groups": ["No Distributor Permission"]},
        "reader@domain.invalid": {"name": "Reader", "password": "testpass", "groups": ["Distributor Reader"]},
        "admin@domain.invalid": {"name": "Admin", "password": "testpass", "groups": ["Distributor Admin"]},
    }

    @pytest.fixture
    def distributor_actions(self, registry):
        registry.register(store_serializers.DistributorSerializer, DistributorActionsViewSet)

    @pytest.fixture
    def distributor_read_only_actions(self, registry):
        registry.register(store_serializers.DistributorSerializer, DistributorReadOnlyActionsViewSet)

    @pytest.mark.usefixtures("distributor_actions")
    def test_an_action_with_empty_permission_classes_is_offered_to_every_user(self, api_client):
        api_client.force_authenticate(user=self.users["none@domain.invalid"])

        assert model_actions_expecting_ok(api_client, "store", "distributor")["open-to-all"] == ["post"]

    @pytest.mark.usefixtures("distributor_actions")
    def test_an_action_with_its_own_permission_classes_is_checked_against_them(self, api_client):
        api_client.force_authenticate(user=self.users["admin@domain.invalid"])

        model_actions = model_actions_expecting_ok(api_client, "store", "distributor")

        assert "create" in model_actions
        assert "own-classes" not in model_actions

    @pytest.mark.usefixtures("distributor_actions")
    def test_method_names_lists_only_the_methods_that_the_user_passes(self, api_client):
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        assert model_actions_expecting_ok(api_client, "store", "distributor")["read-or-write"] == ["get"]

    @pytest.mark.usefixtures("distributor_actions")
    def test_method_names_lists_every_method_that_the_user_passes(self, api_client):
        api_client.force_authenticate(user=self.users["admin@domain.invalid"])

        assert model_actions_expecting_ok(api_client, "store", "distributor")["read-or-write"] == ["get", "post"]

    @pytest.mark.usefixtures("distributor_actions")
    def test_an_action_is_left_out_when_the_user_passes_no_method(self, api_client):
        api_client.force_authenticate(user=self.users["none@domain.invalid"])

        assert "read-or-write" not in model_actions_expecting_ok(api_client, "store", "distributor")

    def test_a_view_that_serves_an_action_with_its_own_classes_checks_other_actions_against_theirs(self):
        view = DistributorServedActionViewSet.as_view(
            {"get": "served_action"}, **DistributorServedActionViewSet.served_action.kwargs
        )
        request = APIRequestFactory().get("/")
        force_authenticate(request, user=self.users["admin@domain.invalid"])

        response = view(request)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["extra_actions"] == ["history-list", "open-to-all", "read-or-write", "served-action"]
        assert response.data["create"] is True

    @pytest.fixture
    def distributor_action_selected_permissions(self, registry):
        registry.register(store_serializers.DistributorSerializer, DistributorActionSelectedPermissionsViewSet)

    @pytest.mark.usefixtures("distributor_action_selected_permissions")
    def test_get_permissions_selects_classes_by_the_action_under_test(self, api_client):
        api_client.force_authenticate(user=self.users["none@domain.invalid"])

        model_actions = model_actions_expecting_ok(api_client, "store", "distributor")

        assert model_actions["list"] == ["get"]
        assert model_actions["selected-open"] == ["get"]
        assert "create" not in model_actions
        assert "retrieve" not in model_actions

    @pytest.mark.usefixtures("distributor_read_only_actions")
    def test_a_read_only_viewset_checks_its_extra_actions(self, api_client):
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        assert "write-action" not in model_actions_expecting_ok(api_client, "store", "distributor")

    @pytest.mark.usefixtures("distributor_read_only_actions")
    def test_a_read_only_viewset_offers_an_extra_action_that_the_user_passes(self, api_client):
        api_client.force_authenticate(user=self.users["admin@domain.invalid"])

        assert model_actions_expecting_ok(api_client, "store", "distributor")["write-action"] == ["post"]


@pytest.mark.django_db
@pytest.mark.usefixtures("registry")
def test_without_a_request_every_extra_action_is_offered_with_every_method():
    info.register(store_serializers.DistributorSerializer, DistributorActionsViewSet)
    content_type = ContentType.objects.get(app_label="store", model="distributor")

    actions = ModelInfoSerializer(content_type, context={}).get_model_actions(content_type)
    method_names = {entry["name"]: entry["method_names"] for entry in actions}

    assert method_names["open-to-all"] == ["post"]
    assert method_names["own-classes"] == ["post"]
    assert method_names["read-or-write"] == ["get", "post"]
    assert method_names["history-list"] == ["get"]
