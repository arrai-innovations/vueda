"""
Model info answers only a user who may act on the model (#637).

A model registered with a viewset passes when its ``model_actions`` would not be empty for the user. A model
registered with ``register_serializer`` has no actions, so it passes when the user holds one of its CRUD
codenames, or a workflow state grants one. No ``contenttypes`` permission is involved. The list holds only the
models whose detail the user may read.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from vueda import info
from vueda.vdq.serializers import SentItemSerializer
from vueda.vdq.viewsets import SentItemViewSet
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission


EXPAND_PARAM = settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]


class PlainDistributorViewSet(viewsets.ModelViewSet):
    """A plain DRF viewset, without ``get_allowed_extra_actions``, whose extra action uses the default permissions."""

    queryset = store_models.Distributor.objects.all()
    serializer_class = store_serializers.DistributorSerializer

    @action(detail=False, methods=["post"])
    def restock(self, request):
        raise NotImplementedError


@pytest.mark.django_db
class TestModelInfoGate(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Content Type Reader": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
        ],
        "Distributor Creator": [("store", "Distributor", "create")],
        "Distributor Admin": [
            ("store", "Distributor", "create"),
            ("store", "Distributor", "delete"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "Distributor", "update"),
        ],
        "Invoice Line Lister": [("store", "InvoiceLine", "list")],
        "Customer Data Creator": [("store", "CustomerData", "create")],
        "Customer Data Lister": [("store", "CustomerData", "list")],
        "Customer Data Reader": [("store", "CustomerData", "read")],
        "No Permissions": [],
    }

    users_to_create: ClassVar[dict] = {
        "content_types@domain.invalid": {
            "name": "Content Types",
            "password": "testpass",
            "groups": ["Content Type Reader"],
        },
        "creator@domain.invalid": {"name": "Creator", "password": "testpass", "groups": ["Distributor Creator"]},
        "admin@domain.invalid": {"name": "Admin", "password": "testpass", "groups": ["Distributor Admin"]},
        "invoice_lines@domain.invalid": {
            "name": "Invoice Lines",
            "password": "testpass",
            "groups": ["Invoice Line Lister"],
        },
        "customer_data_creator@domain.invalid": {
            "name": "Customer Data Creator",
            "password": "testpass",
            "groups": ["Customer Data Creator"],
        },
        "customer_data_lister@domain.invalid": {
            "name": "Customer Data Lister",
            "password": "testpass",
            "groups": ["Customer Data Lister"],
        },
        "customer_data_reader@domain.invalid": {
            "name": "Customer Data Reader",
            "password": "testpass",
            "groups": ["Customer Data Reader"],
        },
        "none@domain.invalid": {"name": "None", "password": "testpass", "groups": ["No Permissions"]},
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        # CustomerDataSerializer is a VuedaReadonlySerializer.
        info.register_serializer(store_serializers.CustomerDataSerializer)
        info.register(store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet)
        info.register_serializer(store_serializers.InvoiceLineBaseSerializer)
        yield
        info.registration.get_empty_registry()

    def get_detail(self, client, user_email, app_label, model_name):
        client.force_authenticate(user=self.users[user_email])
        return client.get(
            reverse("info.model_info-detail", args=(app_label, model_name)),
            format="json",
            data={EXPAND_PARAM: "model_actions"},
        )

    def list_names_expecting_ok(self, client, user_email):
        """Request the model info list as ``user_email``, assert a 200, and return each ``app_label.model``."""
        client.force_authenticate(user=self.users[user_email])
        response = client.get(reverse("info.model_info-list"), format="json")
        assert response.status_code == HTTPStatus.OK, response_body(response)
        return {f"{result['app_label']}.{result['model']}" for result in response.data["results"]}

    def test_create_alone_reads_the_model_info(self, api_client):
        response = self.get_detail(api_client, "creator@domain.invalid", "store", "distributor")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [action["name"] for action in response.data["model_actions"]] == ["create"]

    def test_every_codename_without_a_content_type_permission_reads_the_model_info(self, api_client):
        response = self.get_detail(api_client, "admin@domain.invalid", "store", "distributor")

        assert response.status_code == HTTPStatus.OK, response_body(response)

    def test_content_type_permissions_alone_are_refused(self, api_client):
        response = self.get_detail(api_client, "content_types@domain.invalid", "store", "distributor")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    def test_no_permission_is_refused(self, api_client):
        response = self.get_detail(api_client, "none@domain.invalid", "store", "distributor")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    def test_list_holds_only_the_models_that_the_user_may_act_on(self, api_client):
        assert self.list_names_expecting_ok(api_client, "creator@domain.invalid") == {"store.distributor"}

    def test_list_is_empty_for_a_user_with_no_permission(self, api_client):
        assert self.list_names_expecting_ok(api_client, "content_types@domain.invalid") == set()

    def test_a_crud_codename_reads_a_serializer_only_model(self, api_client):
        response = self.get_detail(api_client, "invoice_lines@domain.invalid", "store", "invoiceline")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_actions"] == []

    def test_a_serializer_only_model_refuses_a_user_without_its_codenames(self, api_client):
        response = self.get_detail(api_client, "creator@domain.invalid", "store", "invoiceline")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    @pytest.mark.parametrize(
        "user_email", ["customer_data_lister@domain.invalid", "customer_data_reader@domain.invalid"]
    )
    def test_a_read_or_list_codename_reads_a_read_only_serializer_only_model(self, api_client, user_email):
        response = self.get_detail(api_client, user_email, "store", "customerdata")

        assert response.status_code == HTTPStatus.OK, response_body(response)

    def test_a_write_codename_does_not_read_a_read_only_serializer_only_model(self, api_client):
        # model_permissions of a read-only serializer lists only read and list, so create does not count.
        response = self.get_detail(api_client, "customer_data_creator@domain.invalid", "store", "customerdata")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    def test_an_unregistered_model_answers_404_before_the_permission_check(self, api_client):
        response = self.get_detail(api_client, "none@domain.invalid", "store", "product")

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)

    def test_an_anonymous_user_is_refused(self, api_client):
        response = api_client.get(reverse("info.model_info-detail", args=("store", "distributor")), format="json")

        assert response.status_code in {HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN}, response_body(response)


@pytest.mark.django_db
class TestModelInfoGateWithExtraActions(BaseTestUserMixin, BaseTestGroupMixin):
    """
    An extra action counts only when the user passes its own permission check (#673).

    ``SentItemViewSet`` offers ``resend``, which needs ``can_resend``. A user with no permission on the model
    is refused, although the viewset has an extra action.
    """

    groups_to_create: ClassVar[dict] = {"No Permissions": []}

    users_to_create: ClassVar[dict] = {
        "none@domain.invalid": {"name": "None", "password": "testpass", "groups": ["No Permissions"]},
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        info.registration.get_empty_registry()
        info.register(SentItemSerializer, SentItemViewSet)
        yield
        info.registration.get_empty_registry()

    def test_a_user_who_passes_no_extra_action_is_refused(self, api_client):
        api_client.force_authenticate(user=self.users["none@domain.invalid"])

        response = api_client.get(reverse("info.model_info-detail", args=("vueda_vdq", "sentitem")), format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)


@pytest.mark.django_db
class TestModelInfoGateWithPlainViewSet(BaseTestUserMixin, BaseTestGroupMixin):
    """
    A viewset without ``get_allowed_extra_actions`` does not filter its extra actions.

    ``model_actions`` still leaves out an extra action that the user passes no method of, so the action does not let
    the user read the model info.
    """

    groups_to_create: ClassVar[dict] = {"No Permissions": []}

    users_to_create: ClassVar[dict] = {
        "none@domain.invalid": {"name": "None", "password": "testpass", "groups": ["No Permissions"]},
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, PlainDistributorViewSet)
        yield
        info.registration.get_empty_registry()

    def test_an_extra_action_that_the_user_passes_no_method_of_is_refused(self, api_client):
        api_client.force_authenticate(user=self.users["none@domain.invalid"])

        response = api_client.get(reverse("info.model_info-detail", args=("store", "distributor")), format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)


@pytest.mark.django_db
class TestModelInfoGateWithWorkflowStateGrant(BaseTestUserMixin, BaseTestGroupMixin):
    """
    A workflow state grant for one of a serializer-only model's CRUD codenames lets the user read its model info.

    ``CustomerOrder`` is under the ``order_fulfillment`` workflow. Here it is registered without a viewset.
    """

    groups_to_create: ClassVar[dict] = {"Order Viewer": []}

    users_to_create: ClassVar[dict] = {
        "viewer@domain.invalid": {"name": "Viewer", "password": "testpass", "groups": ["Order Viewer"]},
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        info.registration.get_empty_registry()
        info.register_serializer(store_serializers.CustomerOrderSerializer)
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def viewer_client(self, api_client):
        # Reading self.users creates the users and their groups, which the state grant below needs.
        api_client.force_authenticate(user=self.users["viewer@domain.invalid"])
        return api_client

    def test_a_state_grant_reads_a_serializer_only_model(self, viewer_client):
        StatePermission.objects.create(
            state=State.objects.get(workflow__code="order_fulfillment", code="new"),
            permission=Permission.objects.get(codename="read_customerorder", content_type__app_label="store"),
            group=Group.objects.get(name="Order Viewer"),
            grant_or_deny=True,
        )

        response = viewer_client.get(reverse("info.model_info-detail", args=("store", "customerorder")), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)

    def test_a_serializer_only_model_without_a_state_grant_is_refused(self, viewer_client):
        response = viewer_client.get(reverse("info.model_info-detail", args=("store", "customerorder")), format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
