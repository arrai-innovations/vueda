from decimal import Decimal

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
from tests.store import viewsets as store_viewsets
from vueda.core.permissions import ObjectPermissions
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestWorkflowModelViewSetPermissions:
    @pytest.fixture
    def permission_group(self):
        group, _ = Group.objects.get_or_create(name="Issue 173 permissions")
        group.permissions.clear()
        return group

    @pytest.fixture
    def user(self, permission_group):
        user = get_user_model().objects.create_user(
            email="issue-173-user@domain.invalid",
            name="Issue 173 User",
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
            order_number=Decimal("17301"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    @pytest.fixture
    def another_order(self, customer, order_state):
        order = store_models.CustomerOrder.objects.create(
            order_number=Decimal("17302"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )
        object_state = order.object_state
        object_state.state = State.objects.get(workflow=order.workflow, code="packed")
        object_state.save()
        return order

    @pytest.fixture
    def workflow(self, customer_order):
        workflow = Workflow.objects.get(content_type=customer_order.get_content_type())
        StatePermission.objects.filter(state__workflow=workflow).delete()
        return workflow

    @pytest.fixture
    def content_type(self):
        return ContentType.objects.get_for_model(store_models.CustomerOrder)

    @staticmethod
    def add_state_permission(*, workflow, content_type, group, codename, state="new", grant=True):
        permission = Permission.objects.get(content_type=content_type, codename=codename)
        return StatePermission.objects.create(
            state=State.objects.get(workflow=workflow, code=state),
            permission=permission,
            group=group,
            grant_or_deny=grant,
        )

    def test_list_denies_user_when_only_unrelated_state_grant_matches_group(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        api_client.force_authenticate(user)

        response = api_client.get(reverse("store.customerorder-list"), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_list_denies_user_when_state_grant_matches_another_group(
        self, api_client, user, customer_order, workflow, content_type
    ):
        other_group = Group.objects.create(name="Issue 173 other permissions")
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=other_group,
            codename="list_customerorder",
        )
        api_client.force_authenticate(user)

        response = api_client.get(reverse("store.customerorder-list"), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_list_denies_user_when_only_matching_state_deny_exists(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="list_customerorder",
            grant=False,
        )
        api_client.force_authenticate(user)

        response = api_client.get(reverse("store.customerorder-list"), format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    def test_list_state_grant_admits_only_rows_in_granted_state(
        self, api_client, user, permission_group, customer_order, another_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="list_customerorder",
        )
        api_client.force_authenticate(user)

        response = api_client.get(reverse("store.customerorder-list"), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert [result["id"] for result in response.data["results"]] == [customer_order.pk]
        assert another_order.pk not in {result["id"] for result in response.data["results"]}

    def test_list_reads_permission_names_mapping_at_call_time(
        self, settings, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        # apply_row_level_filter previously closed over PERMISSION_NAMES_MAPPING at import
        # (vueda/core/viewsets/__init__.py), so overriding "list" left the workflow
        # state-permission lookup pinned to the "list_customerorder" codename below regardless of
        # what the override requested.
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="list_customerorder",
        )
        api_client.force_authenticate(user)

        settings.PERMISSION_NAMES_MAPPING = {"list": "mutated_list"}
        response = api_client.get(reverse("store.customerorder-list"), format="json")

        # The state grant above targets "list_customerorder"; once the override maps "list" to
        # "mutated_list", apply_row_level_filter looks for a "mutated_list_customerorder" state
        # permission instead, finds none, and admits no rows.
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["results"] == []

    def test_list_state_deny_filters_row_from_user_with_model_permission(
        self, api_client, user, permission_group, customer_order, another_order, workflow, content_type
    ):
        permission_group.permissions.add(
            Permission.objects.get(content_type=content_type, codename="list_customerorder")
        )
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="list_customerorder",
            grant=False,
        )
        api_client.force_authenticate(user)

        response = api_client.get(reverse("store.customerorder-list"), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert [result["id"] for result in response.data["results"]] == [another_order.pk]
        assert customer_order.pk not in {result["id"] for result in response.data["results"]}

    def test_list_state_deny_wins_when_user_groups_have_conflicting_rules(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        deny_group = Group.objects.create(name="Issue 173 deny permissions")
        user.groups.add(deny_group)
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="list_customerorder",
        )
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=deny_group,
            codename="list_customerorder",
            grant=False,
        )
        api_client.force_authenticate(user)

        response = api_client.get(reverse("store.customerorder-list"), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["results"] == []

    def test_create_does_not_defer_to_matching_state_grant(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="create_customerorder",
        )
        api_client.force_authenticate(user)
        original_count = store_models.CustomerOrder.objects.count()

        response = api_client.post(
            reverse("store.customerorder-list"),
            data={
                "order_number": "17303",
                "customer": customer_order.customer.pk,
                "order_state": customer_order.order_state.pk,
                "shipping_method": "free",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
        assert store_models.CustomerOrder.objects.count() == original_count

    def test_retrieve_defers_to_matching_state_grant(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        api_client.force_authenticate(user)

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": customer_order.pk}),
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)

    def test_retrieve_matching_state_deny_overrides_model_permission(
        self, api_client, user, permission_group, customer_order, workflow, content_type
    ):
        permission_group.permissions.add(
            Permission.objects.get(content_type=content_type, codename="read_customerorder")
        )
        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
            grant=False,
        )
        api_client.force_authenticate(user)

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": customer_order.pk}),
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND, response_body(response)

    def test_additional_permission_class_denial_is_not_suppressed(
        self,
        api_client,
        user,
        permission_group,
        customer_order,
        workflow,
        content_type,
        monkeypatch,
    ):
        class DenyPermission(BasePermission):
            def has_permission(self, request, view):
                return False

        self.add_state_permission(
            workflow=workflow,
            content_type=content_type,
            group=permission_group,
            codename="read_customerorder",
        )
        monkeypatch.setattr(
            store_viewsets.CustomerOrderViewSet,
            "permission_classes",
            [ObjectPermissions & DenyPermission],
        )
        api_client.force_authenticate(user)

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": customer_order.pk}),
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
