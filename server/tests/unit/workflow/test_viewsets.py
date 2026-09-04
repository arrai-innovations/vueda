from decimal import Decimal
from http import HTTPStatus
from typing import ClassVar
from unittest.mock import Mock
from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.settings import api_settings

from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from vueda.workflow.models import State
from vueda.workflow.models import WorkflowPermission


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestWorkflowViewSet(BaseTestUserMixin):
    groups_to_create: ClassVar[dict] = {}
    users_to_create: ClassVar[dict] = {
        "workflow-user@domain.invalid": {
            "name": "Workflow User",
            "password": "password",
            "groups": ["Order Workflow Managers"],
        },
        "workflow-reader@domain.invalid": {
            "name": "Workflow Reader",
            "password": "password",
            "groups": ["Order Workflow Readers"],
        },
        "workflow-read-only@domain.invalid": {
            "name": "Workflow Read Only",
            "password": "password",
            "groups": ["Workflow Read Only"],
        },
        "customer-reader@domain.invalid": {
            "name": "Customer Reader",
            "password": "password",
            "groups": ["Customer Readers"],
        },
    }

    @pytest.fixture
    def workflow_user(self):
        return self.users["workflow-user@domain.invalid"]

    @pytest.fixture
    def workflow_reader(self):
        return self.users["workflow-reader@domain.invalid"]

    @pytest.fixture
    def workflow_read_only_user(self):
        return self.users["workflow-read-only@domain.invalid"]

    @pytest.fixture
    def customer_reader(self):
        return self.users["customer-reader@domain.invalid"]

    @property
    def groups(self):
        if hasattr(self, "_groups"):
            return self._groups

        self._groups = []
        manager_group, _ = Group.objects.get_or_create(name="Order Workflow Managers")
        manager_permissions = Permission.objects.filter(codename__in=["fulfill_orders", "read_workflow"])
        manager_group.permissions.set(manager_permissions)
        self._groups.append(manager_group)

        reader_group, _ = Group.objects.get_or_create(name="Order Workflow Readers")
        reader_permissions = Permission.objects.filter(
            codename__in=["fulfill_orders", "read_workflow", "read_customerorder"]
        )
        reader_group.permissions.set(reader_permissions)
        self._groups.append(reader_group)

        read_only_group, _ = Group.objects.get_or_create(name="Workflow Read Only")
        read_only_permissions = Permission.objects.filter(codename__in=["read_workflow"])
        read_only_group.permissions.set(read_only_permissions)
        self._groups.append(read_only_group)

        customer_reader_group, _ = Group.objects.get_or_create(name="Customer Readers")
        customer_reader_permissions = Permission.objects.filter(
            codename="read_customer", content_type__app_label="store"
        )
        customer_reader_group.permissions.set(customer_reader_permissions)
        self._groups.append(customer_reader_group)
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
        user = get_user_model().objects.create(email="workflow-user2@domain.invalid", name="Workflow User 2")
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

    @pytest.fixture
    def express_order(self, customer, order_state):
        # CustomerOrder.get_transition_warnings warns on any transition when shipping_method is
        # "express"; the other fixtures use "free" so existing tests stay ungated.
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("2001"),
            customer=customer,
            order_state=order_state,
            shipping_method="express",
        )

    @pytest.fixture
    def another_express_order(self, other_customer, order_state):
        return store_models.CustomerOrder.objects.create(
            order_number=Decimal("2002"),
            customer=other_customer,
            order_state=order_state,
            shipping_method="express",
        )

    def test_object_state_returns_state_when_user_has_object_read_permission(
        self, api_client, workflow_reader, customer_order
    ):
        api_client.force_authenticate(workflow_reader)
        object_state_url = reverse(
            "workflow.workflow-object-state",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        response = api_client.get(object_state_url, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["state"] == {"code": "new", "name": "New"}
        assert "current_history_id" in response.data

    def test_object_state_returns_403_without_object_read_permission(self, api_client, workflow_user, customer_order):
        api_client.force_authenticate(workflow_user)
        object_state_url = reverse(
            "workflow.workflow-object-state",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        response = api_client.get(object_state_url, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
        assert response.data["detail"] == "You do not have permission to perform this action."

    def test_object_state_reads_permission_names_mapping_at_call_time(
        self, api_client, workflow_reader, customer_order
    ):
        # object_state previously closed over PERMISSION_NAMES_MAPPING at import (vueda/workflow/
        # viewsets.py), so overriding the setting left the permission check pinned to
        # "read_customerorder" regardless of what the override requested.
        read_workflow = Permission.objects.get(codename="read_workflow")
        mutated_read_permission, _ = Permission.objects.get_or_create(
            codename="mutated_read_customerorder",
            content_type=ContentType.objects.get_for_model(store_models.CustomerOrder),
            defaults={"name": "Can mutated read customer order"},
        )
        mutated_reader = get_user_model().objects.create(
            email="workflow-mutated-reader@domain.invalid", name="Workflow Mutated Reader"
        )
        mutated_reader.set_password("password")
        mutated_reader.save()
        mutated_reader.user_permissions.add(read_workflow, mutated_read_permission)

        object_state_url = reverse(
            "workflow.workflow-object-state",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        with override_settings(PERMISSION_NAMES_MAPPING={"read": "mutated_read"}):
            api_client.force_authenticate(workflow_reader)
            stale_permission_response = api_client.get(object_state_url, format="json")

            api_client.force_authenticate(mutated_reader)
            mutated_permission_response = api_client.get(object_state_url, format="json")

        # workflow_reader holds the stale "read_customerorder" permission, which no longer
        # satisfies the check once the override maps "read" to "mutated_read".
        assert stale_permission_response.status_code == status.HTTP_403_FORBIDDEN, response_body(
            stale_permission_response
        )
        assert mutated_permission_response.status_code == status.HTTP_200_OK, response_body(mutated_permission_response)

    def test_permitted_transitions_returns_transitions_when_user_has_workflow_permissions(
        self, api_client, workflow_reader, customer_order
    ):
        workflow_permission_ids = WorkflowPermission.objects.filter(
            workflow__content_type=customer_order.get_content_type()
        ).values_list("permission_id", flat=True)
        workflow_reader.user_permissions.add(*Permission.objects.filter(pk__in=workflow_permission_ids))
        api_client.force_authenticate(workflow_reader)
        permitted_transitions_url = reverse(
            "workflow.workflow-permitted-transitions",
            kwargs={"app_label": "store", "model": "customerorder"},
        )

        response = api_client.get(permitted_transitions_url, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert isinstance(response.data, list)
        assert "pack_order" in {transition["code"] for transition in response.data}

    def test_permitted_transitions_returns_403_without_workflow_permissions(self, api_client, workflow_read_only_user):
        api_client.force_authenticate(workflow_read_only_user)
        permitted_transitions_url = reverse(
            "workflow.workflow-permitted-transitions",
            kwargs={"app_label": "store", "model": "customerorder"},
        )

        response = api_client.get(permitted_transitions_url, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
        assert "does not have workflow permissions" in response.data["detail"]

    def test_permitted_transitions_returns_403_when_workflow_has_no_permissions_configured(
        self, api_client, workflow_read_only_user, customer_order
    ):
        WorkflowPermission.objects.filter(workflow__content_type=customer_order.get_content_type()).delete()
        api_client.force_authenticate(workflow_read_only_user)
        permitted_transitions_url = reverse(
            "workflow.workflow-permitted-transitions",
            kwargs={"app_label": "store", "model": "customerorder"},
        )

        response = api_client.get(permitted_transitions_url, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
        assert "does not have workflow permissions" in response.data["detail"]

    def test_permitted_transitions_returns_empty_list_for_readable_model_without_workflow(
        self, api_client, customer_reader
    ):
        api_client.force_authenticate(customer_reader)
        permitted_transitions_url = reverse(
            "workflow.workflow-permitted-transitions",
            kwargs={"app_label": "store", "model": "customer"},
        )

        response = api_client.get(permitted_transitions_url, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data == []

    def test_permitted_transitions_returns_403_for_unreadable_model_without_workflow(
        self, api_client, workflow_read_only_user
    ):
        api_client.force_authenticate(workflow_read_only_user)
        permitted_transitions_url = reverse(
            "workflow.workflow-permitted-transitions",
            kwargs={"app_label": "store", "model": "customer"},
        )

        response = api_client.get(permitted_transitions_url, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)

    @pytest.mark.parametrize("model", ["customerorder", "customer_order"])
    def test_permitted_transitions_returns_403_for_configured_workflow_without_read_workflow(
        self, api_client, customer_reader, customer_order, model
    ):
        # customer_reader can read customerorder but lacks vueda_workflow.read_workflow; the
        # missing-workflow exception must not extend to models with a configured workflow. The
        # underscore-spelled "customer_order" case guards get_workflow(), which resolves this
        # model's identity by stripping underscores -- the same normalization the object
        # permission check applies -- so both agree a workflow is configured, and neither lets
        # the alternate spelling fall into the missing-workflow exception.
        customer_reader.user_permissions.add(
            Permission.objects.get(codename="read_customerorder", content_type__app_label="store")
        )
        api_client.force_authenticate(customer_reader)
        permitted_transitions_url = reverse(
            "workflow.workflow-permitted-transitions",
            kwargs={"app_label": "store", "model": model},
        )

        response = api_client.get(permitted_transitions_url, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
        assert response.data["detail"] == "You do not have permission to perform this action."

    def test_object_state_requires_read_workflow_even_with_object_read_permission(
        self, api_client, customer_reader, customer_order
    ):
        # read_workflow gates every workflow endpoint except permitted_transitions for models
        # without a configured workflow. customer_reader can read customerorder objects but
        # lacks read_workflow, so the viewset-level gate must deny before object_state's own
        # object-read check ever runs.
        customer_reader.user_permissions.add(
            Permission.objects.get(codename="read_customerorder", content_type__app_label="store")
        )
        api_client.force_authenticate(customer_reader)
        object_state_url = reverse(
            "workflow.workflow-object-state",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        response = api_client.get(object_state_url, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN, response_body(response)
        assert response.data["detail"] == "You do not have permission to perform this action."

    def test_object_transitions_returns_state_scoped_transitions(self, api_client, workflow_user, customer_order):
        api_client.force_authenticate(workflow_user)
        object_transitions_url = reverse(
            "workflow.workflow-object-transitions",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": customer_order.pk},
        )

        response = api_client.get(object_transitions_url, format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert {transition["code"] for transition in response.data} == {"hold_order", "pack_order"}

    def test_object_detail_returns_named_valid_transitions(self, api_client, workflow_reader, customer_order):
        api_client.force_authenticate(workflow_reader)

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": customer_order.pk}),
            data={settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "valid_transitions"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["valid_transitions"] == [
            {"code": "hold_order", "name": "Hold Order"},
            {"code": "pack_order", "name": "Pack Order"},
        ]

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

        assert response.status_code == status.HTTP_200_OK, response_body(response)
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
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data[str(customer_order.pk)]["new_state"]["code"] == "packed"
        assert response.data[str(another_order.pk)]["new_state"]["code"] == "packed"
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

        assert response.status_code == status.HTTP_200_OK, response_body(response)
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

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
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

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        customer_order.refresh_from_db()
        another_order.refresh_from_db()
        assert customer_order.workflow_state.code == "packed"
        assert another_order.workflow_state.code == "packed"
        called_times = 2
        assert lock_spy.call_count == called_times
        assert response.data[str(customer_order.pk)]["new_state"]["code"] == "packed"
        assert response.data[str(another_order.pk)]["new_state"]["code"] == "packed"

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

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
        message = "This object cannot be updated right now. Please try again."

        def get_errors(object_id):
            return response.data.get(object_id) or response.data.get(str(object_id))

        assert [str(err) for err in get_errors(customer_order.pk)] == [message]
        assert [str(err) for err in get_errors(another_order.pk)] == [message]
        customer_order.refresh_from_db()
        another_order.refresh_from_db()
        assert customer_order.workflow_state.code == "new"
        assert another_order.workflow_state.code == "new"

    def test_execute_transition_bulk_returns_validation_error_when_object_ids_not_a_list(
        self, api_client, workflow_user
    ):
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )
        response = api_client.patch(
            bulk_url,
            {"transition_code": "pack_order", "object_ids": "not-a-list"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
        assert "object_ids" in response.data

    def test_execute_transition_single_is_gated_then_applies_on_acknowledgement(
        self, api_client, workflow_user, express_order
    ):
        api_client.force_authenticate(workflow_user)
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": express_order.pk},
        )

        gated = api_client.patch(detail_url, {"transition_code": "pack_order"}, format="json")

        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated)
        assert gated.data["confirmation_required"] is True
        assert gated.data["warnings"] == {
            "non_field_errors": [
                f"Order {express_order.order_number} ships express; Pack Order needs a fulfillment double-check."
            ]
        }
        assert gated.data["digest"]
        express_order.refresh_from_db()
        assert express_order.workflow_state.code == "new"  # no mutation happened

        confirmed = api_client.patch(
            detail_url,
            {"transition_code": "pack_order"},
            format="json",
            HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"],
        )

        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed)
        assert confirmed.data["new_state"]["code"] == "packed"
        express_order.refresh_from_db()
        assert express_order.workflow_state.code == "packed"

    def test_execute_transition_single_stale_digest_re_prompts_with_current_warnings(
        self, api_client, workflow_user, express_order
    ):
        api_client.force_authenticate(workflow_user)
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={"app_label": "store", "model": "customerorder", "object_id": express_order.pk},
        )

        response = api_client.patch(
            detail_url,
            {"transition_code": "pack_order"},
            format="json",
            HTTP_ACKNOWLEDGE_WARNINGS="not-the-right-digest",
        )

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response)
        assert response.data["warnings"] == {
            "non_field_errors": [
                f"Order {express_order.order_number} ships express; Pack Order needs a fulfillment double-check."
            ]
        }
        assert response.data["digest"]
        express_order.refresh_from_db()
        assert express_order.workflow_state.code == "new"

    def test_execute_transition_bulk_is_gated_with_one_aggregate_digest_then_applies_on_acknowledgement(
        self, api_client, workflow_user, express_order, another_express_order
    ):
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )
        payload = {"transition_code": "pack_order", "object_ids": [express_order.pk, another_express_order.pk]}

        gated = api_client.patch(bulk_url, payload, format="json")

        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated)
        assert gated.data["warnings"] == {
            str(express_order.pk): {
                "non_field_errors": [
                    f"Order {express_order.order_number} ships express; Pack Order needs a fulfillment double-check."
                ]
            },
            str(another_express_order.pk): {
                "non_field_errors": [
                    f"Order {another_express_order.order_number} ships express; Pack Order needs a fulfillment double-check."
                ]
            },
        }
        express_order.refresh_from_db()
        another_express_order.refresh_from_db()
        # No partial writes: neither instance transitioned before acknowledgement.
        assert express_order.workflow_state.code == "new"
        assert another_express_order.workflow_state.code == "new"

        confirmed = api_client.patch(bulk_url, payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])

        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed)
        express_order.refresh_from_db()
        another_express_order.refresh_from_db()
        assert express_order.workflow_state.code == "packed"
        assert another_express_order.workflow_state.code == "packed"

    def test_execute_transition_bulk_missing_object_id_takes_precedence_over_warnings(
        self, api_client, workflow_user, express_order, another_express_order
    ):
        # A missing object_id in the batch is reported (and stops the bulk write) the same way it
        # was before warnings existed, without ever exposing the warnings gate.
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )
        missing_pk = another_express_order.pk + 1000

        response = api_client.patch(
            bulk_url,
            {"transition_code": "pack_order", "object_ids": [express_order.pk, missing_pk]},
            format="json",
        )

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        express_order.refresh_from_db()
        assert express_order.workflow_state.code == "new"

    def test_execute_transition_bulk_accepts_mixed_int_and_string_object_ids(
        self, api_client, workflow_user, express_order, another_express_order
    ):
        # object_ids is client-supplied JSON and may mix numeric and string types for the same
        # request (e.g. [5, "12"]). Warnings are keyed by the resolved instance's own pk (always
        # str), not the raw request value.
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )
        payload = {
            "transition_code": "pack_order",
            "object_ids": [express_order.pk, str(another_express_order.pk)],
        }

        gated = api_client.patch(bulk_url, payload, format="json")

        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated)
        assert gated.data["digest"]
        express_order.refresh_from_db()
        another_express_order.refresh_from_db()
        assert express_order.workflow_state.code == "new"
        assert another_express_order.workflow_state.code == "new"

        confirmed = api_client.patch(bulk_url, payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])

        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed)
        express_order.refresh_from_db()
        another_express_order.refresh_from_db()
        assert express_order.workflow_state.code == "packed"
        assert another_express_order.workflow_state.code == "packed"

    def test_execute_transition_bulk_digest_is_stable_across_object_id_types(
        self, api_client, workflow_user, express_order, another_express_order
    ):
        # The same logical batch, submitted once with int object_ids and once with string
        # object_ids, must gate with the same digest. Keying warnings by the raw request value
        # would sort int keys numerically and string keys lexicographically, changing the digest
        # for identical warning content depending on which JSON type the client happened to send.
        api_client.force_authenticate(workflow_user)
        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )

        int_ids_response = api_client.patch(
            bulk_url,
            {"transition_code": "pack_order", "object_ids": [express_order.pk, another_express_order.pk]},
            format="json",
        )
        str_ids_response = api_client.patch(
            bulk_url,
            {
                "transition_code": "pack_order",
                "object_ids": [str(another_express_order.pk), str(express_order.pk)],
            },
            format="json",
        )

        assert int_ids_response.status_code == HTTPStatus.CONFLICT, response_body(int_ids_response)
        assert str_ids_response.status_code == HTTPStatus.CONFLICT, response_body(str_ids_response)
        assert int_ids_response.data["digest"] == str_ids_response.data["digest"]

    def test_execute_transition_bulk_aggregates_pre_check_errors_for_every_failing_instance(
        self, api_client, workflow_user, customer_order, another_order
    ):
        # Both instances fail the pre-check loop (pack_order is not available from "shipped"), not
        # just one, so the aggregation contract must report every failing object_id -- not stop at
        # the first -- and the batch must write nothing for either instance.
        api_client.force_authenticate(workflow_user)
        shipped_state = State.objects.get(code="shipped", workflow__code="order_fulfillment")
        for order in (customer_order, another_order):
            object_state = order.object_state
            object_state.state = shipped_state
            object_state.save()

        bulk_url = reverse(
            "workflow.workflow-execute-transition", kwargs={"app_label": "store", "model": "customerorder"}
        )

        response = api_client.patch(
            bulk_url,
            {"transition_code": "pack_order", "object_ids": [customer_order.pk, another_order.pk]},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        message = "Transition 'pack_order' not available from state 'shipped'"
        assert response.data[str(customer_order.pk)] == [message]
        assert response.data[str(another_order.pk)] == [message]
        customer_order.refresh_from_db()
        another_order.refresh_from_db()
        assert customer_order.workflow_state.code == "shipped"
        assert another_order.workflow_state.code == "shipped"
