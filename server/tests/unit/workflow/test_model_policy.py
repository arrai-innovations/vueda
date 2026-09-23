"""Coverage for ``class Vueda.Workflow``: how an enabled model receives its workflow behaviour."""

from decimal import Decimal
from typing import ClassVar
from unittest.mock import Mock

import pytest
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.test.utils import isolate_apps

from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from vueda.core.checks import check_model_feature_declaration
from vueda.core.installed_apps import workflow_enabled
from vueda.core.models import VuedaModel
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.workflow.models import ObjectStateProxy
from vueda.workflow.models import WorkflowModelMethods
from vueda.workflow.models import ensure_object_state


class TestContribution:
    def test_an_enabled_model_receives_the_workflow_methods_last(self):
        mro = store_models.CustomerOrder.__mro__

        assert mro[-2:] == (WorkflowModelMethods, object)
        assert hasattr(store_models.CustomerOrder, "available_transitions")

    def test_an_enabled_model_receives_the_object_state_relation(self):
        field = store_models.CustomerOrder._meta.get_field("object_states_proxy")

        assert isinstance(field, GenericRelation)
        assert field.related_model is ObjectStateProxy

    def test_a_model_that_does_not_enable_workflow_receives_nothing(self):
        assert not issubclass(store_models.Customer, WorkflowModelMethods)
        assert not hasattr(store_models.Customer, "available_transitions")
        field_names = {field.name for field in store_models.Customer._meta.get_fields()}
        assert "object_states_proxy" not in field_names

    def test_a_proxy_inherits_from_its_enabled_concrete_model(self):
        assert issubclass(SentItem, WorkflowModelMethods)
        assert SentItem.__mro__.count(WorkflowModelMethods) == 1

    def test_an_override_takes_precedence_and_reaches_the_default_through_super(self):
        with isolate_apps("tests.features"):

            class Overrides(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Workflow:
                        enabled = True

                class Meta:
                    app_label = "features"

                def get_transition_warnings(self, transition, user=None):
                    return {"non_field_errors": ["checked"], **super().get_transition_warnings(transition, user)}

                def on_transition(self, transition, user=None, dry_run=False):
                    return super().on_transition(transition, user, dry_run)

            instance = Overrides(name="probe")

            assert instance.get_transition_warnings(Mock()) == {"non_field_errors": ["checked"]}
            assert instance.on_transition(Mock()) is None
            assert check_model_feature_declaration(Overrides) == []


class TestFieldConflicts:
    def test_a_field_that_hides_a_workflow_attribute_is_reported(self):
        with isolate_apps("tests.features"):

            class HidesWorkflow(VuedaModel):
                workflow = models.CharField(max_length=255)

                class Vueda:
                    class Workflow:
                        enabled = True

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(HidesWorkflow)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "declares a field named 'workflow'" in errors[0].hint

    def test_the_same_field_on_a_model_without_workflow_is_allowed(self):
        with isolate_apps("tests.features"):

            class OwnsWorkflowField(VuedaModel):
                workflow = models.CharField(max_length=255)

                class Meta:
                    app_label = "features"

            assert check_model_feature_declaration(OwnsWorkflowField) == []


class TestWorkflowEnabled:
    @pytest.mark.parametrize(
        ("model", "expected"),
        [
            (store_models.CustomerOrder, True),
            (QueueItem, True),
            (SentItem, True),
            (store_models.Customer, False),
            (ContentType, False),
        ],
    )
    def test_reports_the_model_policy(self, model, expected):
        assert workflow_enabled(model) is expected

    def test_accepts_an_instance(self):
        assert workflow_enabled(store_models.CustomerOrder()) is True
        assert workflow_enabled(store_models.Customer()) is False


class TestEnsureObjectState:
    def test_a_raw_save_creates_nothing(self):
        instance = Mock(spec=WorkflowModelMethods)

        ensure_object_state(sender=type(instance), instance=instance, raw=True)

        instance.create_object_state.assert_not_called()

    def test_a_model_without_workflow_is_ignored(self):
        instance = Mock(spec=store_models.Customer)

        ensure_object_state(sender=store_models.Customer, instance=instance)

        assert not hasattr(instance, "create_object_state")


@pytest.mark.django_db
class TestObjectStateOnSave(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "policy-user@domain.invalid": {"name": "Policy User", "password": "password", "groups": []},
    }

    def _order_values(self):
        customer = store_models.Customer.objects.create(user=self.users["policy-user@domain.invalid"])
        order_state = store_models.OrderState.objects.create(code="order_state_new", name="New")
        return {"order_number": Decimal("1001"), "customer": customer, "order_state": order_state}

    def test_saving_an_enabled_model_creates_its_object_state(self):
        order = store_models.CustomerOrder.objects.create(**self._order_values())

        assert order.workflow_state.code == "new"

    def test_saving_through_a_proxy_creates_the_object_state(self):
        """A proxy's save sends the proxy class, which the policy contributor never sees."""
        with isolate_apps("tests.store"):

            class CustomerOrderProxy(store_models.CustomerOrder):
                class Meta:
                    app_label = "store"
                    proxy = True

            order = CustomerOrderProxy.objects.create(**self._order_values())

            assert order.workflow_state.code == "new"
