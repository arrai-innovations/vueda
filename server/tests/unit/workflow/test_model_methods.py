from decimal import Decimal
from typing import ClassVar
from unittest.mock import Mock

import pytest
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.core.audit import audited_action
from vueda.core.permissions import BaseRowLevelPermissions
from vueda.workflow.exceptions import InvalidTransitionError
from vueda.workflow.models import ObjectState
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Transition
from vueda.workflow.models import TransitionPermission
from vueda.workflow.models import WorkflowPermission


@pytest.mark.django_db
class TestWorkflowModelMethods(BaseTestGroupMixin, BaseTestUserMixin):
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

    def test_check_transition_resolves_the_acting_user_from_the_open_action(self, customer_order, workflow_user):
        """A caller that passes no user gets the one the open action records.

        History middleware records the acting user on a request's action, and ``audited_action``
        records one the same way outside a request. That is where ``check_transition`` looks before
        falling back to the system user, so the resolved user can only be this one by that route.
        """
        with audited_action("pack an order", kind="task", user=workflow_user.pk):
            transition, resolved_user = customer_order.check_transition("pack_order")

        assert transition.code == "pack_order"
        assert resolved_user == workflow_user

    def test_apply_transition_rejects_an_unavailable_transition_under_an_action(self, customer_order, workflow_user):
        """An acting user read off the action reaches the same availability check as one passed in.

        Naming a user this way does not make a transition available that was not: the order is
        already cancelled, so cancelling it again is still refused.
        """
        cancelled_state = State.objects.get(code="cancelled", workflow__code="order_fulfillment")
        object_state = customer_order.object_state
        object_state.state = cancelled_state
        object_state.save()

        with (
            audited_action("cancel an order", kind="task", user=workflow_user.pk),
            pytest.raises(InvalidTransitionError),
        ):
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

    def test_state_rules_observe_a_group_change_on_the_next_authorization_pass(self, customer_order, workflow_user):
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
        with customer_order.cached_workflow_state():
            assert workflow_user.has_perm("store.read_customerorder", obj=customer_order)

        # Same user instance, no refresh_from_db, no re-fetch. The rules cache is keyed by the
        # caller rather than by a resolved group set, so the next pass re-reads membership.
        workflow_user.groups.remove(workflow_group)

        with customer_order.cached_workflow_state():
            assert not workflow_user.has_perm("store.read_customerorder", obj=customer_order)

    def test_available_transitions_query_count_grows_by_one_per_candidate(self, customer_order, workflow_user):
        object_state = customer_order.object_state
        candidate_counts = {}
        for state_code in ("on_hold", "packed", "new"):
            object_state.state = State.objects.get(code=state_code, workflow__code="order_fulfillment")
            object_state.save()
            candidate_counts[state_code] = customer_order.fast_available_transitions().count()
            # Django's ModelBackend caches a user's model permissions on first use, so warm that
            # here rather than charging the first measured call for it.
            list(customer_order.available_transitions(user=workflow_user))
        assert candidate_counts == {"on_hold": 1, "packed": 2, "new": 3}

        counts = {}
        for state_code, candidates in candidate_counts.items():
            object_state.state = State.objects.get(code=state_code, workflow__code="order_fulfillment")
            object_state.save()
            with CaptureQueriesContext(connection) as captured:
                list(customer_order.available_transitions(user=workflow_user))
            counts[candidates] = len(captured)

        # One query per candidate, for that transition's own permission rows. The object's workflow,
        # current state, and state rules resolve once for the whole pass. Pinning an absolute number
        # would break on any Django or backend change, so record the growth instead. Restoring
        # per-permission querying puts it back at four per candidate.
        growth = {candidates: counts[candidates] - counts[1] for candidates in counts}
        assert growth == {1: 0, 2: 1, 3: 2}, counts

    def test_state_rules_resolve_once_for_several_permissions(self, customer_order, workflow_user):
        perms = ["store.read_customerorder", "store.update_customerorder", "store.delete_customerorder"]
        # Warm Django's per-user model permission cache and the user's resolved group ids.
        outside_block = [workflow_user.has_perm(perm, obj=customer_order) for perm in perms]

        with customer_order.cached_workflow_state(), CaptureQueriesContext(connection) as captured:
            inside_block = [workflow_user.has_perm(perm, obj=customer_order) for perm in perms]

        assert inside_block == outside_block
        state_rule_queries = [query for query in captured.captured_queries if "statepermission" in query["sql"]]
        assert len(state_rule_queries) == 1, [query["sql"] for query in state_rule_queries]

    def test_available_transitions_for_returns_classlevel_transitions(self, customer_order):
        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id])

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_with_workflow_permissions(self, customer_order, workflow_user):
        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id], user=workflow_user)

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_applies_transition_permissions(self, customer_order, workflow_user):
        # workflow_user holds store.fulfill_orders, which every transition in the fixture requires.
        # Add a second requirement to pack_order that the user does not hold.
        pack_order = Transition.objects.get(workflow=customer_order.workflow, code="pack_order")
        TransitionPermission.objects.create(
            transition=pack_order,
            permission=Permission.objects.get(codename="create_customerorder", content_type__app_label="store"),
        )

        assert not customer_order.check_transition_permission(pack_order, workflow_user)

        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id], user=workflow_user)

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order"}

    def test_available_transitions_for_agrees_with_available_transitions(self, customer_order, workflow_user):
        pack_order = Transition.objects.get(workflow=customer_order.workflow, code="pack_order")
        TransitionPermission.objects.create(
            transition=pack_order,
            permission=Permission.objects.get(codename="create_customerorder", content_type__app_label="store"),
        )

        single = {transition.code for transition in customer_order.available_transitions(user=workflow_user)}
        multi = {
            transition.code
            for transition in store_models.CustomerOrder.available_transitions_for(
                [customer_order.id], user=workflow_user
            )
        }

        assert multi == single

    def test_available_transitions_for_without_user_ignores_transition_permissions(self, customer_order):
        pack_order = Transition.objects.get(workflow=customer_order.workflow, code="pack_order")
        TransitionPermission.objects.create(
            transition=pack_order,
            permission=Permission.objects.get(codename="create_customerorder", content_type__app_label="store"),
        )

        transitions = store_models.CustomerOrder.available_transitions_for([customer_order.id])

        assert {transition.code for transition in transitions} == {"cancel_order", "hold_order", "pack_order"}

    def test_available_transitions_for_admits_a_transition_permitted_on_any_object(self, customer_order, workflow_user):
        # A second order, moved to packed, where a state rule denies the permission every transition
        # in the fixture requires. cancel_order leaves both states; ship_order leaves packed only.
        packed_order = store_models.CustomerOrder.objects.create(
            order_number=Decimal("1002"),
            customer=customer_order.customer,
            order_state=customer_order.order_state,
            shipping_method="free",
        )
        packed_state = State.objects.get(code="packed", workflow__code="order_fulfillment")
        packed_object_state = packed_order.object_state
        packed_object_state.state = packed_state
        packed_object_state.save()
        StatePermission.objects.create(
            state=packed_state,
            permission=Permission.objects.get(codename="fulfill_orders", content_type__app_label="store"),
            group=Group.objects.get(name="Order Workflow Managers"),
            grant_or_deny=False,
        )

        cancel_order = Transition.objects.get(workflow=customer_order.workflow, code="cancel_order")
        assert customer_order.check_transition_permission(cancel_order, workflow_user)
        assert not packed_order.check_transition_permission(cancel_order, workflow_user)

        transitions = store_models.CustomerOrder.available_transitions_for(
            [customer_order.id, packed_order.id], user=workflow_user
        )
        codes = {transition.code for transition in transitions}

        assert "cancel_order" in codes
        assert "ship_order" not in codes

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

    def test_check_workflow_permission_ignores_unrelated_state_rules(self, customer_order, unauthorized_user):
        # The workflow's own state rules say nothing about this caller, this codename, or this
        # object's state, so their existence cannot stand in for the configured workflow
        # permissions the caller does not hold.
        assert StatePermission.objects.filter(state__workflow=customer_order.workflow).exists()

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
