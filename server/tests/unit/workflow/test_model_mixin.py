from decimal import Decimal
from unittest.mock import Mock

import pytest
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from simple_history.models import HistoricalRecords

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.core.permissions import BaseRowLevelPermissions
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

    def test_available_transitions_for_permission_denied_path(self, customer_order, workflow_user):
        with pytest.raises(DRFPermissionDenied):
            store_models.CustomerOrder.available_transitions_for([customer_order.id], user=workflow_user)

    def test_check_workflow_permission_denied(self, customer_order, unauthorized_user):
        StatePermission.objects.filter(state__workflow=customer_order.workflow).delete()

        with pytest.raises(DRFPermissionDenied):
            customer_order.check_workflow_permission(unauthorized_user)


@pytest.mark.django_db
class TestHasPermLayeredEvaluation(BaseTestGroupMixin, BaseTestUserMixin):
    """Tests for the 4-layer has_perm evaluation chain: group → state → row → state+row."""

    groups_to_create = {
        "Order Editors": [
            ("store", "CustomerOrder", "update"),
        ],
        "Order Viewers": [
            ("store", "CustomerOrder", "read"),
        ],
        "No Perms": [],
    }
    users_to_create = {
        "editor@example.com": {
            "name": "Editor",
            "password": "password",
            "groups": ["Order Editors"],
        },
        "viewer@example.com": {
            "name": "Viewer",
            "password": "password",
            "groups": ["Order Viewers"],
        },
        "noperms@example.com": {
            "name": "No Perms",
            "password": "password",
            "groups": ["No Perms"],
        },
    }

    @pytest.fixture
    def editor_user(self):
        return self.users["editor@example.com"]

    @pytest.fixture
    def viewer_user(self):
        return self.users["viewer@example.com"]

    @pytest.fixture
    def noperms_user(self):
        return self.users["noperms@example.com"]

    @pytest.fixture
    def customer_order(self, editor_user):
        customer = store_models.Customer.objects.create(user=editor_user)
        order_state = store_models.OrderState.objects.create(code="perm_test_state", name="Perm Test")
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("9001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    def _create_state_permission(self, customer_order, user, *, grant_or_deny, codename="update_customerorder"):
        content_type = ContentType.objects.get_for_model(store_models.CustomerOrder)
        permission = Permission.objects.get(codename=codename, content_type=content_type)
        group = user.groups.first()
        return StatePermission.objects.create(
            state=customer_order.workflow_state,
            permission=permission,
            group=group,
            grant_or_deny=grant_or_deny,
            historical_permission_codename=permission.codename,
            historical_permission_content_type_app_label=content_type.app_label,
            historical_permission_content_type_model_name=content_type.model,
            historical_group_name=group.name,
        )

    def test_state_grant_survives_row_level_none(self, customer_order, noperms_user, monkeypatch):
        """The original bug: state grants, check_instance returns None → should be True, not False."""
        self._create_state_permission(customer_order, noperms_user, grant_or_deny=True)

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type):
                return None

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        assert noperms_user.has_perm("store.update_customerorder", customer_order) is True

    def test_state_deny_blocks_check_instance(self, customer_order, editor_user, monkeypatch):
        """State deny should prevent check_instance from running."""
        self._create_state_permission(customer_order, editor_user, grant_or_deny=False)
        check_instance_called = False

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type):
                nonlocal check_instance_called
                check_instance_called = True
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        assert editor_user.has_perm("store.update_customerorder", customer_order) is False
        assert not check_instance_called

    def test_check_instance_state_overrides_state_deny(self, customer_order, editor_user, monkeypatch):
        """check_instance_state returning True should override state deny."""
        self._create_state_permission(customer_order, editor_user, grant_or_deny=False)

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance_state(cls, model, obj, perm, user, perm_type, grant_or_deny):
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        assert editor_user.has_perm("store.update_customerorder", customer_order) is True

    def test_check_instance_state_denies_despite_state_grant(self, customer_order, noperms_user, monkeypatch):
        """check_instance_state returning False should override state grant."""
        self._create_state_permission(customer_order, noperms_user, grant_or_deny=True)

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance_state(cls, model, obj, perm, user, perm_type, grant_or_deny):
                return False

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        assert noperms_user.has_perm("store.update_customerorder", customer_order) is False

    def test_check_instance_state_none_preserves_decision(self, customer_order, editor_user, monkeypatch):
        """check_instance_state returning None should not change the decision."""
        # No state permission → grant_or_deny=None, super=True (has model perm), check_instance=None
        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type):
                return None

            @classmethod
            def check_instance_state(cls, model, obj, perm, user, perm_type, grant_or_deny):
                return None

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        # super_value=True, all hooks return None → decision stays True
        assert editor_user.has_perm("store.update_customerorder", customer_order) is True

    def test_check_instance_state_not_called_without_workflow(self, editor_user, monkeypatch):
        """check_instance_state should not be called for non-workflow models."""
        from tests.models import Product

        product = Product.objects.create(name="Test Widget", available_for_sale=True)
        check_instance_state_called = False

        original_check_instance = Product.RowLevelPermissions.check_instance

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type):
                return original_check_instance(model, obj, perm, user, perm_type)

            @classmethod
            def check_instance_state(cls, model, obj, perm, user, perm_type, grant_or_deny):
                nonlocal check_instance_state_called
                check_instance_state_called = True
                return True

        monkeypatch.setattr(Product, "RowLevelPermissions", MockRowLevel)

        editor_user.has_perm("tests.read_product", product)
        assert not check_instance_state_called

    def test_check_instance_state_receives_grant_or_deny(self, customer_order, editor_user, monkeypatch):
        """check_instance_state should receive the grant_or_deny value from state layer."""
        self._create_state_permission(customer_order, editor_user, grant_or_deny=False)
        received_grant_or_deny = None

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance_state(cls, model, obj, perm, user, perm_type, grant_or_deny):
                nonlocal received_grant_or_deny
                received_grant_or_deny = grant_or_deny
                return None

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        editor_user.has_perm("store.update_customerorder", customer_order)
        assert received_grant_or_deny is False

    def test_row_level_grant_without_model_permission(self, customer_order, noperms_user, monkeypatch):
        """Row-level check_instance returning True should grant access even without model-level permission."""

        class MockRowLevel(BaseRowLevelPermissions):
            @classmethod
            def check_instance(cls, model, obj, perm, user, perm_type):
                return True

        monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", MockRowLevel, raising=False)

        # noperms_user has no model-level update_customerorder, but check_instance grants
        assert noperms_user.has_perm("store.update_customerorder", customer_order) is True

    def test_no_row_level_permissions_with_model_perm_grants(self, customer_order, editor_user):
        """When no RowLevelPermissions defined and user has model permission, should return True."""
        # CustomerOrder has no RowLevelPermissions by default
        assert not hasattr(store_models.CustomerOrder, "RowLevelPermissions")
        assert editor_user.has_perm("store.update_customerorder", customer_order) is True

    def test_superuser_bypasses_all_layers(self, customer_order, editor_user):
        """Superuser should always get True regardless of state or row-level logic."""
        editor_user.is_superuser = True
        editor_user.save()

        self._create_state_permission(customer_order, editor_user, grant_or_deny=False)

        assert editor_user.has_perm("store.update_customerorder", customer_order) is True
