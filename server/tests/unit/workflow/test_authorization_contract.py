"""Endpoint-by-endpoint coverage of the workflow authorization contract.

Each test records one row of the contract: which target-model gate, global workflow gate, and
configured workflow gates a workflow endpoint applies, and where a workflow state rule may take
part in that decision.
"""

from decimal import Decimal
from http import HTTPStatus

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework.permissions import BasePermission

from tests.conftest import response_body
from tests.store import models as store_models
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow
from vueda.workflow.models import WorkflowPermission
from vueda.workflow.permissions import WorkflowObjectPermissions
from vueda.workflow.viewsets import WorkflowViewSet


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestWorkflowAuthorizationContract:
    @pytest.fixture
    def permission_group(self):
        group, _ = Group.objects.get_or_create(name="Workflow contract group")
        group.permissions.clear()
        return group

    @pytest.fixture
    def other_group(self):
        group, _ = Group.objects.get_or_create(name="Workflow contract other group")
        group.permissions.clear()
        return group

    @pytest.fixture
    def user(self, permission_group):
        user = get_user_model().objects.create_user(
            email="workflow-contract@domain.invalid",
            name="Workflow Contract User",
            password="password",
        )
        user.groups.add(permission_group)
        return user

    @pytest.fixture
    def customer(self, user):
        return store_models.Customer.objects.create(user=user)

    @pytest.fixture
    def order_state(self):
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        return order_state

    @pytest.fixture
    def customer_order(self, customer, order_state):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("19101"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def another_order(self, customer, order_state):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("19102"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def workflow(self, customer_order):
        workflow = Workflow.objects.get(content_type=customer_order.get_content_type())
        # The store fixtures ship state rules of their own. Clearing them lets each test state the
        # rules it means to exercise.
        StatePermission.objects.filter(state__workflow=workflow).delete()
        return workflow

    @pytest.fixture
    def content_type(self):
        return ContentType.objects.get_for_model(store_models.CustomerOrder)

    @staticmethod
    def add_state_permission(*, workflow, content_type, group, codename, state="new", grant=True):
        return StatePermission.objects.create(
            state=State.objects.get(workflow=workflow, code=state),
            permission=Permission.objects.get(content_type=content_type, codename=codename),
            group=group,
            grant_or_deny=grant,
        )

    @staticmethod
    def grant(user, codename, app_label="store"):
        user.user_permissions.add(Permission.objects.get(codename=codename, content_type__app_label=app_label))
        return user

    @staticmethod
    def grant_configured_workflow_permissions(user, workflow):
        user.user_permissions.add(
            *Permission.objects.filter(
                pk__in=WorkflowPermission.objects.filter(workflow=workflow).values_list("permission_id", flat=True)
            )
        )
        return user

    @staticmethod
    def object_state_url(order):
        return reverse(
            "workflow.workflow-object-state",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": order.pk},
        )

    @staticmethod
    def object_transitions_url(order):
        return reverse(
            "workflow.workflow-object-transitions",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": order.pk},
        )

    @staticmethod
    def state_history_url(order):
        return reverse(
            "workflow-state-history",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": order.pk},
        )

    # Workflow list and detail: read_workflow only, and no target-model gate.

    def test_workflow_list_requires_read_workflow(self, api_client, user):
        api_client.force_authenticate(user)

        denied = api_client.get(reverse("workflow.workflow-list"), format="json")

        self.grant(user, "read_workflow", app_label="vueda_workflow")
        api_client.force_authenticate(get_user_model().objects.get(pk=user.pk))
        admitted = api_client.get(reverse("workflow.workflow-list"), format="json")

        assert denied.status_code == status.HTTP_403_FORBIDDEN, response_body(denied)
        assert admitted.status_code == status.HTTP_200_OK, response_body(admitted)

    def test_workflow_list_ignores_target_model_state_rules(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        # A workflow definition is not target-model data, so a state rule about the target model
        # neither admits nor denies this endpoint.
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
            grant=False,
        )
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        api_client.force_authenticate(user)

        response = api_client.get(reverse("workflow.workflow-list"), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)

    # Current object state: object-level read on the target model, and nothing else.

    def test_object_state_admits_matching_state_grant(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.object_state_url(customer_order), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["state"]["code"] == "new"

    @pytest.mark.parametrize(
        ("codename", "state", "use_other_group"),
        [
            ("list_customerorder", "new", False),
            ("read_customerorder", "packed", False),
            ("read_customerorder", "new", True),
        ],
        ids=["other codename", "other state", "other group"],
    )
    def test_object_state_denies_unmatched_state_grant(
        self,
        api_client,
        user,
        permission_group,
        other_group,
        customer_order,
        workflow,
        content_type,
        codename,
        state,
        use_other_group,
    ):
        # A grant participates only when it matches the caller's groups, the requested codename,
        # the model's content type, and the object's own state.
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=other_group if use_other_group else permission_group,
            codename=codename,
            state=state,
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.object_state_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_object_state_matching_state_deny_beats_model_permission(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.grant(user, "read_customerorder")
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
            grant=False,
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.object_state_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_object_state_deny_wins_across_groups(
        self, api_client, user, permission_group, other_group, customer_order, workflow, content_type
    ):
        user.groups.add(other_group)
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=other_group,
            codename="read_customerorder",
            grant=False,
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.object_state_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    # Workflow state history: the target object's read permission, and nothing else.

    @pytest.mark.parametrize("endpoint", ["state", "history"])
    @pytest.mark.parametrize("read_access", ["absent", "state_grant", "state_deny"])
    def test_head_uses_the_same_object_read_gate_as_get(
        self,
        settings,
        api_client,
        user,
        permission_group,
        customer_order,
        workflow,
        content_type,
        endpoint,
        read_access,
    ):
        if endpoint == "history":
            settings.ROOT_URLCONF = "tests.unit.history.urls_workflow_state_history"
            url = self.state_history_url(customer_order)
        else:
            url = self.object_state_url(customer_order)
        if read_access != "absent":
            self.add_state_permission(
                workflow=workflow,
                content_type=content_type,
                group=permission_group,
                codename="read_customerorder",
                grant=read_access == "state_grant",
            )
        if read_access == "state_deny":
            self.grant(user, "read_customerorder")
        api_client.force_authenticate(user)

        get_response = api_client.get(url)
        head_response = api_client.head(url)

        expected = status.HTTP_200_OK if read_access == "state_grant" else status.HTTP_403_FORBIDDEN
        assert get_response.status_code == expected, response_body(get_response)
        assert head_response.status_code == expected, response_body(head_response)
        assert head_response.content == b""

    def test_workflow_state_history_requires_object_read(self, settings, api_client, user, customer_order, workflow):
        settings.ROOT_URLCONF = "tests.unit.history.urls_workflow_state_history"
        api_client.force_authenticate(user)

        response = api_client.get(self.state_history_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_workflow_state_history_follows_object_read_without_read_workflow(
        self, settings, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        settings.ROOT_URLCONF = "tests.unit.history.urls_workflow_state_history"
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.state_history_url(customer_order), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert [entry["state"] for entry in response.data] == ["new"]

    def test_workflow_state_history_ignores_unmatched_state_grant(
        self, settings, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        settings.ROOT_URLCONF = "tests.unit.history.urls_workflow_state_history"
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
            state="packed",
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.state_history_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    # Model-scope transition discovery: no object, so no state overlay.

    def test_permitted_transitions_is_not_admitted_by_a_state_grant(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        # Model-level discovery has no object whose state could be read, so a state grant cannot
        # stand in for the target model's own read permission.
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        self.grant_configured_workflow_permissions(user, workflow)
        api_client.force_authenticate(user)

        response = api_client.get(
            reverse(
                "workflow.workflow-permitted-transitions",
                kwargs={"app_label": "store", "model": "customerorder"},
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    # Object transition discovery: object read, read_workflow, and the configured workflow gates.

    def test_object_transitions_requires_object_read(self, api_client, user, customer_order, workflow):
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        self.grant_configured_workflow_permissions(user, workflow)
        api_client.force_authenticate(user)

        response = api_client.get(self.object_transitions_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_object_transitions_admits_matching_state_grant(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        self.grant(user, "fulfill_orders")
        self.grant_configured_workflow_permissions(user, workflow)
        api_client.force_authenticate(user)

        response = api_client.get(self.object_transitions_url(customer_order), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert "pack_order" in {transition["code"] for transition in response.data}

    # Transition execution: object read for every object, read_workflow, and the workflow gates.

    def test_execute_transition_does_not_require_model_update_permission(
        self, api_client, user, customer_order, workflow
    ):
        # Workflow and transition permissions authorize the state-machine mutation. update_* is
        # the separate capability to edit ordinary model fields.
        self.grant(user, "read_customerorder")
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        self.grant(user, "fulfill_orders")
        self.grant_configured_workflow_permissions(user, workflow)
        assert not user.has_perm("store.update_customerorder")
        api_client.force_authenticate(user)

        response = api_client.patch(
            reverse(
                "workflow.workflow-execute-transition",
                kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
            ),
            {"transition_code": "pack_order"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        customer_order.refresh_from_db()
        assert customer_order.workflow_state.code == "packed"

    def test_an_additional_permission_class_still_denies_a_state_granted_object(
        self, api_client, user, permission_group, customer_order, workflow, content_type, monkeypatch
    ):
        # A matching state grant admits the workflow permission class. Another permission class in
        # the expression stays an independent authority over the same request.
        class DenyObjectPermission(BasePermission):
            def has_object_permission(self, request, view, obj):
                return False

        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        monkeypatch.setattr(
            WorkflowViewSet,
            "permission_classes",
            [WorkflowObjectPermissions, DenyObjectPermission],
        )
        api_client.force_authenticate(user)

        response = api_client.get(self.object_state_url(customer_order), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_execute_transition_bulk_reports_an_unreadable_object_as_missing(
        self, api_client, user, permission_group, customer_order, another_order, workflow, content_type
    ):
        # customer_order sits in a granted state and another_order does not, so the batch holds one
        # readable and one unreadable object. The unreadable one must be reported the way a missing
        # id is, and the batch must write nothing.
        another_order.apply_transition("pack_order")
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        self.grant(user, "fulfill_orders")
        self.grant_configured_workflow_permissions(user, workflow)
        api_client.force_authenticate(user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={"app_label": "store", "model": "customerorder"},
        )

        unreadable = api_client.patch(
            bulk_url,
            {"transition_code": "pack_order", "object_ids": [customer_order.pk, another_order.pk]},
            format="json",
        )
        missing = api_client.patch(
            bulk_url,
            {"transition_code": "pack_order", "object_ids": [customer_order.pk, another_order.pk + 1000]},
            format="json",
        )

        assert unreadable.status_code == HTTPStatus.NOT_FOUND, response_body(unreadable)
        assert missing.status_code == HTTPStatus.NOT_FOUND, response_body(missing)
        assert unreadable.data["detail"] == missing.data["detail"]
        customer_order.refresh_from_db()
        assert customer_order.workflow_state.code == "new"

    @pytest.mark.parametrize("bulk", [False, True], ids=["detail", "bulk"])
    @pytest.mark.parametrize("permission_gate", ["state_read", "additional_class"])
    def test_execute_transition_rechecks_object_permissions_under_lock(
        self,
        api_client,
        user,
        permission_group,
        customer_order,
        another_order,
        workflow,
        content_type,
        monkeypatch,
        bulk,
        permission_gate,
    ):
        if permission_gate == "state_read":
            self.add_state_permission(
                workflow=workflow,
                content_type=content_type,
                group=permission_group,
                codename="read_customerorder",
            )
        else:
            self.grant(user, "read_customerorder")

            class OnlyNewObjects(BasePermission):
                def has_object_permission(self, request, view, obj):
                    return obj.workflow_state.code == "new"

            monkeypatch.setattr(WorkflowViewSet, "permission_classes", [WorkflowObjectPermissions, OnlyNewObjects])
        self.grant(user, "read_workflow", app_label="vueda_workflow")
        self.grant(user, "fulfill_orders")
        self.grant_configured_workflow_permissions(user, workflow)
        api_client.force_authenticate(user)
        original_apply = WorkflowViewSet._apply_transition_to_instance
        attempted_ids = []

        def change_state_before_lock(view, instance, transition_code, request):
            attempted_ids.append(instance.pk)
            if instance.pk == customer_order.pk:
                # Simulate another writer changing the state after preflight and before locking.
                # cancel_order is valid from both states; only object authorization now denies it.
                instance.update_object_state(State.objects.get(workflow=workflow, code="packed"))
            return original_apply(view, instance, transition_code, request)

        monkeypatch.setattr(WorkflowViewSet, "_apply_transition_to_instance", change_state_before_lock)
        kwargs = {"app_label": "store", "model": "customerorder"}
        data = {"transition_code": "cancel_order"}
        if bulk:
            # The first write must roll back when the second object fails its locked check.
            data["object_ids"] = [another_order.pk, customer_order.pk]
        else:
            kwargs["object_id"] = customer_order.pk
        url = reverse("workflow.workflow-execute-transition", kwargs=kwargs)

        response = api_client.patch(url, data, format="json")

        expected = status.HTTP_404_NOT_FOUND if bulk else status.HTTP_403_FORBIDDEN
        assert response.status_code == expected, response_body(response)
        assert attempted_ids == ([another_order.pk, customer_order.pk] if bulk else [customer_order.pk])
        assert customer_order.workflow_state.code == "new"
        assert another_order.workflow_state.code == "new"
        if bulk:
            data["object_ids"] = [customer_order.pk + another_order.pk + 1000]
            missing = api_client.patch(url, data, format="json")
            assert missing.status_code == status.HTTP_404_NOT_FOUND, response_body(missing)
            assert response.data["detail"] == missing.data["detail"]
