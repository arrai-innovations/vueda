"""The ``workflow_state`` filter that a workflow-enabled model's filterset receives."""

from decimal import Decimal
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework.reverse import reverse

from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.store.filtersets import CustomerOrderFilterSet
from vueda import info
from vueda.workflow.models import ObjectState
from vueda.workflow.models import State


INVALID_CHOICE = "Select a valid choice. That choice is not one of the available choices."


@pytest.mark.django_db
class TestWorkflowStateFilter(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "superuser@domain.invalid": {"name": "Superuser", "password": "password", "groups": [], "is_superuser": True},
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        info.register(store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def client(self, api_client):
        api_client.force_authenticate(user=self.users["superuser@domain.invalid"])
        return api_client

    @staticmethod
    def own_state(code):
        content_type = ContentType.objects.get_for_model(store_models.CustomerOrder)
        return State.objects.get(workflow__content_type=content_type, code=code)

    @staticmethod
    def other_model_state():
        content_type = ContentType.objects.get_for_model(store_models.CustomerOrder)
        return State.objects.exclude(workflow__content_type=content_type).first()

    def create_order(self, number, state_code="new"):
        user = get_user_model().objects.create(email=f"order-{number}@domain.invalid", name=f"Order {number}")
        order = store_models.CustomerOrder.objects.create(
            order_number=Decimal(number),
            customer=store_models.Customer.objects.create(user=user),
            order_state=store_models.OrderState.objects.create(code=f"order_state_{number}", name=f"State {number}"),
        )
        if state_code != "new":
            ObjectState.objects.filter(workflow__content_type__model="customerorder", object_id=order.pk).update(
                state=self.own_state(state_code)
            )
        return order

    @staticmethod
    def list_orders(client, **params):
        return client.get(reverse("store.customerorder-list"), data=params, format="json")

    def test_a_state_that_no_row_is_in_matches_no_rows(self, client):
        self.create_order(1)

        response = self.list_orders(client, workflow_state=self.own_state("shipped").pk)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["results"] == []

    def test_a_state_that_a_row_is_in_matches_that_row(self, client):
        self.create_order(1)
        shipped = self.create_order(2, "shipped")

        response = self.list_orders(client, workflow_state=self.own_state("shipped").pk)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [row["id"] for row in response.data["results"]] == [shipped.pk]

    def test_rows_narrowed_before_the_filterset_do_not_narrow_the_accepted_states(self):
        """The search backend runs before the filterset, so the filterset receives the searched rows."""
        new_order = self.create_order(1)
        self.create_order(2, "shipped")

        filterset = CustomerOrderFilterSet(
            data={"workflow_state": str(self.own_state("shipped").pk)},
            queryset=store_models.CustomerOrder.objects.filter(pk=new_order.pk),
        )

        assert filterset.is_valid(), filterset.errors
        assert not filterset.qs.exists()

    @pytest.mark.parametrize("with_rows", [True, False], ids=["with-rows", "without-rows"])
    def test_a_state_from_another_models_workflow_is_rejected(self, client, with_rows):
        if with_rows:
            self.create_order(1)

        response = self.list_orders(client, workflow_state=self.other_model_state().pk)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert response.data["workflow_state"] == [INVALID_CHOICE]

    def test_the_offered_options_are_the_states_that_listed_rows_are_in(self, client):
        self.create_order(1)
        self.create_order(2, "shipped")

        response = client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "customerorder", "workflow_state")),
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert {result["value"] for result in response.data["results"]} == {
            str(self.own_state("new").pk),
            str(self.own_state("shipped").pk),
        }
