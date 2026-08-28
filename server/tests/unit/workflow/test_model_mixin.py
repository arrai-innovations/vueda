from decimal import Decimal
from typing import ClassVar
from unittest.mock import Mock

import pytest
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from simple_history.models import HistoricalRecords

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.core.permissions import BaseRowLevelPermissions
from vueda.workflow.exceptions import InvalidTransitionError
from vueda.workflow.models import ObjectState
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Transition
from vueda.workflow.models import WorkflowPermission


@pytest.mark.django_db
class TestHasWorkflowModelMixin(BaseTestGroupMixin, BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {"Order Workflow Managers": []}
    users_to_create: ClassVar[dict] = {
        "workflow-user@domain.invalid": {
            "name": "Workflow User",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        },
        "no-workflow-perms@domain.invalid": {
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
        return self.users["workflow-user@domain.invalid"]

    @pytest.fixture
    def unauthorized_user(self):
        return self.users["no-workflow-perms@domain.invalid"]

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

    def test_get_transition_warnings_returns_empty_for_free_shipping(self, customer_order, workflow_user):
        cancel_transition = Transition.objects.get(
            workflow=customer_order.workflow,
            code="cancel_order",
        )

        assert customer_order.get_transition_warnings(cancel_transition, workflow_user) == {}

    def test_get_transition_warnings_flags_express_shipping(self, customer_order, workflow_user):
        customer_order.shipping_method = "express"
        cancel_transition = Transition.objects.get(
            workflow=customer_order.workflow,
            code="cancel_order",
        )

        warnings = customer_order.get_transition_warnings(cancel_transition, workflow_user)

        assert warnings == {
            "non_field_errors": [
                f"Order {customer_order.order_number} ships express; Cancel Order needs a fulfillment double-check."
            ]
        }

    def test_check_transition_returns_transition_and_resolved_user_without_writing(self, customer_order, workflow_user):
        transition, resolved_user = customer_order.check_transition("pack_order", user=workflow_user)

        assert transition.code == "pack_order"
        assert resolved_user == workflow_user
        # no write happened
        assert customer_order.object_state.state.code == "new"

    def test_check_transition_permission_denied(self, customer_order, unauthorized_user):
        shipped_state = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = shipped_state
        object_state.save()

        with pytest.raises(DRFPermissionDenied):
            customer_order.check_transition("return_order", user=unauthorized_user)

        object_state.refresh_from_db()
        assert object_state.state == shipped_state

    def test_apply_checked_transition_writes_the_already_checked_transition(self, customer_order, workflow_user):
        transition, resolved_user = customer_order.check_transition("pack_order", user=workflow_user)

        target_state, history_id = customer_order.apply_checked_transition(transition, resolved_user)

        assert target_state.code == "packed"
        assert customer_order.object_state.state.code == "packed"
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

    def test_allow_transition_requires_workflow_permissions(self, customer_order, workflow_user):
        cancel_transition = Transition.objects.get(workflow=customer_order.workflow, code="cancel_order")
        WorkflowPermission.objects.filter(workflow__content_type=customer_order.get_content_type()).delete()

        with pytest.raises(DRFPermissionDenied):
            customer_order.allow_transition(cancel_transition, user=workflow_user)

    def test_allow_transition_denies_without_transition_permissions(self, customer_order, unauthorized_user):
        shipped_state = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = shipped_state
        object_state.save()
        return_transition = Transition.objects.get(workflow=customer_order.workflow, code="return_order")

        assert not customer_order.allow_transition(return_transition, user=unauthorized_user)

    def test_allow_transition_rejects_transition_not_leaving_current_state(self, customer_order, workflow_user):
        ship_transition = Transition.objects.get(workflow=customer_order.workflow, code="ship_order")

        assert customer_order.workflow_state.code == "new"
        assert ship_transition not in customer_order.fast_available_transitions()
        assert not customer_order.allow_transition(ship_transition, user=workflow_user)

    def test_allow_transition_rejects_ignored_source(self, customer_order, workflow_user):
        cancelled_state = State.objects.get(code="cancelled", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = cancelled_state
        object_state.save()
        cancel_transition = Transition.objects.get(workflow=customer_order.workflow, code="cancel_order")

        assert customer_order.should_ignore_transition_from_state(cancel_transition)
        assert not customer_order.allow_transition(cancel_transition, user=workflow_user)

    def test_allow_transition_denial_message_reaches_invalid_transition_error(
        self, customer_order, workflow_user, monkeypatch
    ):
        monkeypatch.setattr(
            store_models.CustomerOrder,
            "allow_transition",
            lambda self, transition, user=None: "Orders on credit hold cannot be packed.",
        )

        with pytest.raises(InvalidTransitionError) as excinfo:
            customer_order.check_transition("pack_order", user=workflow_user)

        assert "Orders on credit hold cannot be packed." in str(excinfo.value)

    def test_check_transition_observes_a_state_written_between_calls(self, customer_order, workflow_user):
        # execute_transition checks a transition, locks the row, and checks again. The second check has
        # to see a state written in between, so no cache may survive a single check_transition call.
        customer_order.check_transition("pack_order", user=workflow_user)

        packed_state = State.objects.get(code="packed", workflow__code="order_fulfillment")
        # Write straight to the row, the way a concurrent transaction would, leaving this instance untouched.
        ObjectState.objects.filter(pk=customer_order.object_state.pk).update(state=packed_state)

        with pytest.raises(InvalidTransitionError):
            customer_order.check_transition("pack_order", user=workflow_user)

    def test_allow_transition_query_count_does_not_grow_with_candidate_count(self, customer_order, workflow_user):
        cancel_transition = Transition.objects.get(workflow=customer_order.workflow, code="cancel_order")
        object_state = customer_order.object_state
        # cancel_order leaves all three of these states, which differ only in how many other
        # transitions leave them alongside it.
        candidate_counts = {}
        for state_code in ("on_hold", "packed", "new"):
            object_state.state = State.objects.get(code=state_code, workflow__code="order_fulfillment")
            object_state.save()
            candidate_counts[state_code] = customer_order.fast_available_transitions().count()
            # Django's ModelBackend caches a user's model permissions on first use, so warm it here
            # rather than charging the first measured call for it.
            assert customer_order.allow_transition(cancel_transition, user=workflow_user)
        assert candidate_counts == {"on_hold": 1, "packed": 2, "new": 3}

        counts = {}
        for state_code in candidate_counts:
            object_state.state = State.objects.get(code=state_code, workflow__code="order_fulfillment")
            object_state.save()
            with CaptureQueriesContext(connection) as captured:
                customer_order.allow_transition(cancel_transition, user=workflow_user)
            counts[state_code] = len(captured)

        assert len(set(counts.values())) == 1, (
            f"allow_transition cost varies with the number of transitions leaving the state: {counts}"
        )

    def test_available_transitions_for_returns_classlevel_transitions(self, customer_order):
        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id])

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_with_workflow_permissions(self, customer_order, workflow_user):
        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id], user=workflow_user)

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_requires_workflow_permissions(self, customer_order, workflow_user):
        WorkflowPermission.objects.filter(workflow__content_type=customer_order.get_content_type()).delete()

        with pytest.raises(DRFPermissionDenied):
            store_models.CustomerOrder.available_transitions_for([customer_order.id], user=workflow_user)

    def test_available_transitions_for_permission_denied_path(self, customer_order, unauthorized_user):
        with pytest.raises(DRFPermissionDenied):
            store_models.CustomerOrder.available_transitions_for([customer_order.id], user=unauthorized_user)

    def test_check_workflow_permission_denied(self, customer_order, unauthorized_user):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()

        with pytest.raises(DRFPermissionDenied):
            customer_order.check_workflow_permission(unauthorized_user)

    def test_has_perm_with_obj_state_grant_can_allow_without_baseline_permission(self, customer_order, workflow_user):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        read_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="read_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=workflow_group,
            grant_or_deny=True,
        )

        assert not workflow_user.has_perm("store.read_customerorder")
        assert workflow_user.has_perm("store.read_customerorder", obj=customer_order)

    def test_has_perm_with_obj_state_deny_overrides_baseline_permission(self, customer_order, workflow_user):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        delete_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="delete_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=delete_permission,
            group=workflow_group,
            grant_or_deny=False,
        )

        assert workflow_user.has_perm("store.delete_customerorder")
        assert not workflow_user.has_perm("store.delete_customerorder", obj=customer_order)

    def test_check_state_permission_with_conflicting_groups_uses_deny_wins(self, customer_order, workflow_user):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        managers_group = Group.objects.get(name="Order Workflow Managers")
        conflicting_group = Group.objects.create(name="Order Workflow Conflicting")
        workflow_user.groups.add(conflicting_group)
        read_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="read_customerorder",
        )

        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=managers_group,
            grant_or_deny=True,
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=conflicting_group,
            grant_or_deny=False,
        )

        grant_or_deny = customer_order.check_state_permission("store.read_customerorder", workflow_user.groups.all())
        assert grant_or_deny is False

    def test_has_perm_with_obj_row_level_none_keeps_state_based_allowance(
        self, customer_order, workflow_user, monkeypatch
    ):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        read_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="read_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=workflow_group,
            grant_or_deny=True,
        )

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
                return None

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        assert not workflow_user.has_perm("store.read_customerorder")
        assert workflow_user.has_perm("store.read_customerorder", obj=customer_order)

    def test_has_perm_with_obj_row_level_deny_overrides_prior_allow(self, customer_order, workflow_user, monkeypatch):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        read_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="read_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=workflow_group,
            grant_or_deny=True,
        )

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
                return False

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        assert workflow_user.has_perm("store.read_customerorder", obj=customer_order) is False

    def test_has_perm_with_obj_row_level_allow_does_not_override_state_deny(
        self, customer_order, workflow_user, monkeypatch
    ):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        delete_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="delete_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=delete_permission,
            group=workflow_group,
            grant_or_deny=False,
        )

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        assert workflow_user.has_perm("store.delete_customerorder")
        # State deny now blocks check_instance; check_instance is skipped entirely
        assert not workflow_user.has_perm("store.delete_customerorder", obj=customer_order)

    def test_has_perm_with_obj_row_level_allow_overrides_baseline_deny(
        self, customer_order, workflow_user, monkeypatch
    ):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        assert not workflow_user.has_perm("store.read_customerorder")
        assert workflow_user.has_perm("store.read_customerorder", obj=customer_order)

    def test_has_perm_check_instance_workflow_overrides_state_deny(self, customer_order, workflow_user, monkeypatch):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        delete_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="delete_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=delete_permission,
            group=workflow_group,
            grant_or_deny=False,
        )

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny) -> bool | None:
                # Override state deny for a specific reason
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        # check_instance_workflow can override state deny
        assert workflow_user.has_perm("store.delete_customerorder", obj=customer_order)

    def test_has_perm_check_instance_workflow_denies_despite_state_grant(
        self, customer_order, workflow_user, monkeypatch
    ):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        read_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="read_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=workflow_group,
            grant_or_deny=True,
        )

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny) -> bool | None:
                # Deny despite state grant
                return False

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        assert not workflow_user.has_perm("store.read_customerorder", obj=customer_order)

    def test_has_perm_check_instance_workflow_none_preserves_decision(self, customer_order, workflow_user, monkeypatch):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        read_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="read_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=read_permission,
            group=workflow_group,
            grant_or_deny=True,
        )

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny) -> bool | None:
                return None

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        # State grant is preserved when check_instance_workflow returns None
        assert workflow_user.has_perm("store.read_customerorder", obj=customer_order)

    def test_has_perm_check_instance_skipped_on_state_deny(self, customer_order, workflow_user, monkeypatch):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()
        workflow_group = Group.objects.get(name="Order Workflow Managers")
        delete_permission = Permission.objects.get(
            content_type=customer_order.get_content_type(),
            codename="delete_customerorder",
        )
        StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=delete_permission,
            group=workflow_group,
            grant_or_deny=False,
        )

        check_instance_called = False

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
                nonlocal check_instance_called
                check_instance_called = True
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", TestRowLevelPermissions, raising=False)
        workflow_user.has_perm("store.delete_customerorder", obj=customer_order)
        assert not check_instance_called, "check_instance should not be called when state denies"

    def test_has_perm_check_instance_workflow_not_called_without_workflow(self, workflow_user, monkeypatch):
        from tests.product.models import Product

        product = Product.objects.create(name="Test Product")
        check_instance_workflow_called = False

        class TestRowLevelPermissions(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
                return True

            @classmethod
            def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny) -> bool | None:
                nonlocal check_instance_workflow_called
                check_instance_workflow_called = True
                return True

        monkeypatch.setattr(Product, "RowLevelPermissions", TestRowLevelPermissions)
        workflow_user.has_perm("product.read_product", obj=product)
        assert not check_instance_workflow_called, (
            "check_instance_workflow should not be called for non-workflow models"
        )
