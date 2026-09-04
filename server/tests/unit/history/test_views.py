from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from tests.conftest import response_body
from tests.store import models as store_models
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestGetObjectHistoryView:
    @pytest.fixture
    def order_state(self):
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        return order_state

    @pytest.fixture
    def customer(self):
        user = get_user_model().objects.create(email="history-customer@domain.invalid", name="History Customer")
        return store_models.Customer.objects.create(user=user)

    @pytest.fixture
    def customer_order(self, customer, order_state):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("18001"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )

    def test_get_reads_permission_names_mapping_at_call_time(self, settings, api_client, customer_order):
        # GetObjectHistoryView.get previously closed over PERMISSION_NAMES_MAPPING at import
        # (vueda/history/views.py), so overriding "read" left the permission check pinned to
        # "read_customerorder" regardless of what the override requested.
        settings.ROOT_URLCONF = "tests.unit.history.urls_object_history"

        # DynamicObjectPermissions.has_permission bypasses the requesting user's own permissions
        # entirely whenever any StatePermission row exists for the model's workflow, regardless of
        # its group or codename. Creating one isolates the view's own has_perm check as the only
        # thing gating this request.
        workflow = Workflow.objects.get(content_type=customer_order.get_content_type())
        bypass_group = Group.objects.create(name="History Bypass Group")
        StatePermission.objects.create(
            state=State.objects.get(workflow=workflow, code="new"),
            permission=Permission.objects.get(
                content_type=customer_order.get_content_type(), codename="list_customerorder"
            ),
            group=bypass_group,
            grant_or_deny=True,
        )

        content_type = ContentType.objects.get_for_model(store_models.CustomerOrder)
        stale_permission = Permission.objects.get(content_type=content_type, codename="read_customerorder")
        mutated_permission, _ = Permission.objects.get_or_create(
            content_type=content_type,
            codename="mutated_read_customerorder",
            defaults={"name": "Can mutated read customer order"},
        )
        stale_reader = get_user_model().objects.create(
            email="history-stale-reader@domain.invalid", name="History Stale Reader"
        )
        stale_reader.user_permissions.add(stale_permission)
        mutated_reader = get_user_model().objects.create(
            email="history-mutated-reader@domain.invalid", name="History Mutated Reader"
        )
        mutated_reader.user_permissions.add(mutated_permission)

        history_url = reverse(
            "get-object-history",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        # Hit the endpoint once outside the override so any lazily-imported module involved is
        # already loaded under the default setting, like a real app import at process startup.
        api_client.force_authenticate(stale_reader)
        baseline_response = api_client.get(history_url, format="json")
        assert baseline_response.status_code == status.HTTP_200_OK, response_body(baseline_response)

        with override_settings(PERMISSION_NAMES_MAPPING={"read": "mutated_read"}):
            api_client.force_authenticate(stale_reader)
            stale_permission_response = api_client.get(history_url, format="json")

            api_client.force_authenticate(mutated_reader)
            mutated_permission_response = api_client.get(history_url, format="json")

        # stale_reader holds the stale "read_customerorder" permission, which no longer satisfies
        # the check once the override maps "read" to "mutated_read".
        assert stale_permission_response.status_code == status.HTTP_403_FORBIDDEN, response_body(
            stale_permission_response
        )
        assert mutated_permission_response.status_code == status.HTTP_200_OK, response_body(mutated_permission_response)
