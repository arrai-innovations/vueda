from decimal import Decimal
from unittest.mock import Mock

import pytest
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from simple_history.models import HistoricalRecords

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.workflow.exceptions import InvalidTransitionError
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Transition
from vueda.workflow.models import WorkflowPermission


@pytest.mark.django_db
class TestHasWorkflowModelMixin(BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create = {"Order Workflow Managers": []}
    users_to_create = {
        "workflow-user@example.com": {
            "name": "Workflow User",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        },
        "no-workflow-perms@example.com": {
            "name": "No Workflow Perms",
            "password": "password",
            "groups": [],
        },
    }

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        self._groups = []
        group, _ = Group.objects.get_or_create(name="Order Workflow Managers")
        permissions = Permission.objects.filter(codename__in=["fulfill_orders", "delete_customerorder"])
        group.permissions.set(permissions)
        self._groups.append(group)
        return self._groups

    @pytest.fixture
    def workflow_user(self):
        return self.users["workflow-user@example.com"]

    @pytest.fixture
    def unauthorized_user(self):
        return self.users["no-workflow-perms@example.com"]

    @pytest.fixture
    def customer_order(self, workflow_user):
        customer = store_models.Customer.objects.create(user=workflow_user)
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("1001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    def test_save_sets_initial_workflow_state(self, customer_order):
        assert customer_order.workflow.code == "order_fulfillment"
        assert customer_order.object_state is not None
        assert customer_order.workflow_state.code == "new"

    def test_get_transition_returns_transition(self, customer_order):
        transition = customer_order.get_transition("pack_order")

        assert isinstance(transition, Transition)
        assert transition.code == "pack_order"
        assert transition.workflow == customer_order.workflow

    def test_get_transition_invalid_code_raises(self, customer_order):
        with pytest.raises(Transition.DoesNotExist) as excinfo:
            customer_order.get_transition("invalid_code")

        assert "Transition 'invalid_code' does not exist" in str(excinfo.value)

    def test_available_transitions_and_permissions(self, customer_order, workflow_user):
        fast_codes = set(customer_order.fast_available_transitions().values_list("code", flat=True))
        assert fast_codes == {"cancel_order", "hold_order", "pack_order"}

        available_codes = {transition.code for transition in customer_order.available_transitions(user=workflow_user)}
        assert available_codes == fast_codes

        cancel_transition = Transition.objects.get(
            workflow=customer_order.workflow,
            code="cancel_order",
        )
        assert customer_order.check_transition_permission(cancel_transition, workflow_user)
        assert customer_order.check_workflow_permission(workflow_user)
        assert customer_order.allow_transition(cancel_transition, user=workflow_user)

        shipped_state = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = shipped_state
        object_state.save()

        admin_group = Group.objects.get(name="Admin")
        assert customer_order.check_state_permission("store.update_orderitem", [admin_group]) is None

    def test_should_ignore_transition_from_state(self, customer_order):
        cancelled_state = State.objects.get(code="cancelled", workflow__code="order_fulfillment")
        cancel_transition = Transition.objects.get(
            workflow=customer_order.workflow,
            code="cancel_order",
        )

        object_state = customer_order.object_state
        object_state.state = cancelled_state
        object_state.save()

        assert not customer_order.fast_available_transitions().exists()
        assert customer_order.should_ignore_transition_from_state(cancel_transition)

    def test_apply_transition_fails_with_request_context(self, customer_order, workflow_user, monkeypatch):
        cancelled_state = State.objects.get(code="cancelled", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = cancelled_state
        object_state.save()

        mock_request = Mock(user=workflow_user)
        monkeypatch.setattr(HistoricalRecords.context, "request", mock_request, raising=False)

        with pytest.raises(InvalidTransitionError):
            customer_order.apply_transition("cancel_order")

    def test_fast_transition_handles_ignored_state(self, customer_order):
        cancelled_state = State.objects.get(code="cancelled", workflow__code="order_fulfillment")
        cancel_transition = Transition.objects.get(
            workflow=customer_order.workflow,
            code="cancel_order",
        )

        object_state = customer_order.object_state
        object_state.state = cancelled_state
        object_state.save()

        on_fail_mock = Mock()
        customer_order.on_transition_ignored = on_fail_mock

        customer_order.fast_transition(cancel_transition.code)

        object_state.refresh_from_db()
        assert object_state.state == cancelled_state
        on_fail_mock.assert_called_once_with(cancel_transition)

    def test_apply_transition_succeeds(self, customer_order, workflow_user):
        target_state, history_id = customer_order.apply_transition("pack_order", user=workflow_user)

        assert target_state.code == "packed"
        object_state = customer_order.object_state
        assert object_state.state.code == "packed"
        assert history_id is not None

    def test_fast_transition_succeeds(self, customer_order):
        customer_order.fast_transition("pack_order")

        object_state = customer_order.object_state
        assert object_state.state.code == "packed"

    def test_fast_transition_raises_invalid_transition(self, customer_order):
        with pytest.raises(InvalidTransitionError):
            customer_order.fast_transition("ship_order")

        assert customer_order.object_state.state.code == "new"

    def test_apply_transition_permission_denied(self, customer_order, unauthorized_user):
        shipped_state = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = shipped_state
        object_state.save()

        with pytest.raises(DRFPermissionDenied):
            customer_order.apply_transition("return_order", user=unauthorized_user)

        object_state.refresh_from_db()
        assert object_state.state == shipped_state

    def test_available_transitions_requires_workflow_permissions(self, customer_order, workflow_user):
        WorkflowPermission.objects.filter(workflow__content_type=customer_order.get_content_type()).delete()

        with pytest.raises(DRFPermissionDenied):
            customer_order.available_transitions(user=workflow_user)

    def test_available_transitions_for_returns_classlevel_transitions(self, customer_order):
        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id])

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_with_workflow_permissions(self, customer_order, workflow_user):
        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id], user=workflow_user)

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_permission_denied_path(self, customer_order, unauthorized_user):
        with pytest.raises(DRFPermissionDenied):
            store_models.CustomerOrder.available_transitions_for([customer_order.id], user=unauthorized_user)

    def test_check_workflow_permission_denied(self, customer_order, unauthorized_user):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()

        with pytest.raises(DRFPermissionDenied):
            customer_order.check_workflow_permission(unauthorized_user)
