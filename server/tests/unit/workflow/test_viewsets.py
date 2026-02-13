from decimal import Decimal
from unittest.mock import Mock
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.settings import api_settings

from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestWorkflowViewSet(BaseTestUserMixin):
    groups_to_create = {}
    users_to_create = {
        "workflow-user@example.com": {
            "name": "Workflow User",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        }
    }

    @pytest.fixture
    def workflow_user(self):
        return self.users["workflow-user@example.com"]

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        self._groups = []
        group, _ = Group.objects.get_or_create(name="Order Workflow Managers")
        permissions = Permission.objects.filter(codename__in=["fulfill_orders", "read_workflow"])
        group.permissions.set(permissions)
        self._groups.append(group)
        return self._groups

    @pytest.fixture
    def order_state(self):
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        return order_state

    @pytest.fixture
    def customer(self, workflow_user):
        return store_models.Customer.objects.create(user=workflow_user)

    @pytest.fixture
    def other_customer(self):
        user = get_user_model().objects.create(email="workflow-user2@example.com", name="Workflow User 2")
        user.set_password("password")
        user.save()
        return store_models.Customer.objects.create(user=user)

    @pytest.fixture
    def customer_order(self, customer, order_state):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("1001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def another_order(self, other_customer, order_state):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("1002"),
            customer=other_customer,
            order_state=order_state,
            shipping_method="free",
        )

    def test_execute_transition_dry_run_detail_skips_lock_and_state_change(
        self, api_client, workflow_user, customer_order
    ):
        api_client.force_authenticate(workflow_user)
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )
        with patch.object(
            store_models.CustomerOrder.objects,
            "select_for_update",
            side_effect=AssertionError("Locking should be skipped"),
        ) as lock_spy:
            response = api_client.patch(
                detail_url,
                {"transition_code": "pack_order"},
                format="json",
                HTTP_DRY_RUN="true",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["new_state"]["code"] == "packed"
        assert len(response.data["new_transitions"]) == 1
        assert response.data["new_transitions"][0]["code"] == "ship_order"
        customer_order.refresh_from_db()
        assert customer_order.workflow_state.code == "new"
        lock_spy.assert_not_called()

    def test_execute_transition_dry_run_bulk_skips_lock_and_state_change(
        self, api_client, workflow_user, customer_order, another_order
    ):
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )
        with patch.object(
            store_models.CustomerOrder.objects,
            "select_for_update",
            side_effect=AssertionError("Locking should be skipped"),
        ) as lock_spy:
            response = api_client.patch(
                bulk_url,
                {"transition_code": "pack_order", "object_ids": [customer_order.pk, another_order.pk]},
                format="json",
                HTTP_DRY_RUN="true",
            )
        assert response.status_code == status.HTTP_200_OK
        assert response.data[customer_order.pk]["new_state"]["code"] == "packed"
        assert response.data[another_order.pk]["new_state"]["code"] == "packed"
        customer_order.refresh_from_db()
        another_order.refresh_from_db()
        assert customer_order.workflow_state.code == "new"
        assert another_order.workflow_state.code == "new"
        lock_spy.assert_not_called()

    def test_execute_transition_detail_commits_and_locks_without_dry_run(
        self, api_client, workflow_user, customer_order
    ):
        api_client.force_authenticate(workflow_user)
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        with patch.object(
            store_models.CustomerOrder.objects,
            "select_for_update",
            wraps=store_models.CustomerOrder.objects.select_for_update,
        ) as lock_spy:
            response = api_client.patch(detail_url, {"transition_code": "pack_order"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        customer_order.refresh_from_db()
        assert customer_order.workflow_state.code == "packed"
        assert lock_spy.call_count == 1
        assert response.data["new_state"]["code"] == "packed"

    def test_execute_transition_detail_returns_validation_error_when_locked(
        self, api_client, workflow_user, customer_order
    ):
        api_client.force_authenticate(workflow_user)
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        lock_mock = Mock()
        lock_mock.filter.return_value.first.return_value = None

        with patch.object(store_models.CustomerOrder.objects, "select_for_update", return_value=lock_mock):
            response = api_client.patch(detail_url, {"transition_code": "pack_order"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            str(response.data[api_settings.NON_FIELD_ERRORS_KEY][0])
            == "This object cannot be updated right now. Please try again."
        )
        customer_order.refresh_from_db()
        assert customer_order.workflow_state.code == "new"

    def test_execute_transition_bulk_commits_and_locks_without_dry_run(
        self, api_client, workflow_user, customer_order, another_order
    ):
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )

        with patch.object(
            store_models.CustomerOrder.objects,
            "select_for_update",
            wraps=store_models.CustomerOrder.objects.select_for_update,
        ) as lock_spy:
            response = api_client.patch(
                bulk_url,
                {"transition_code": "pack_order", "object_ids": [customer_order.pk, another_order.pk]},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        customer_order.refresh_from_db()
        another_order.refresh_from_db()
        assert customer_order.workflow_state.code == "packed"
        assert another_order.workflow_state.code == "packed"
        called_times = 2
        assert lock_spy.call_count == called_times
        assert response.data[customer_order.pk]["new_state"]["code"] == "packed"
        assert response.data[another_order.pk]["new_state"]["code"] == "packed"

    def test_execute_transition_bulk_returns_validation_error_when_locked(
        self, api_client, workflow_user, customer_order, another_order
    ):
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )

        lock_mock = Mock()
        lock_mock.filter.return_value.first.return_value = None

        with patch.object(store_models.CustomerOrder.objects, "select_for_update", return_value=lock_mock):
            response = api_client.patch(
                bulk_url,
                {"transition_code": "pack_order", "object_ids": [customer_order.pk, another_order.pk]},
                format="json",
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        message = "This object cannot be updated right now. Please try again."

        def get_errors(object_id):
            return response.data.get(object_id) or response.data.get(str(object_id))

        assert [str(err) for err in get_errors(customer_order.pk)] == [message]
        assert [str(err) for err in get_errors(another_order.pk)] == [message]
        customer_order.refresh_from_db()
        another_order.refresh_from_db()
        assert customer_order.workflow_state.code == "new"
        assert another_order.workflow_state.code == "new"
