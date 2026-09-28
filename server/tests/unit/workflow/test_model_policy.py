"""Coverage for ``class Vueda.Workflow``: how an enabled model receives its workflow behaviour."""

from decimal import Decimal
from typing import ClassVar
from unittest.mock import Mock

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.test.utils import isolate_apps
from django_filters import rest_framework
from rest_framework import serializers
from rest_framework import status
from rest_framework.reverse import reverse

from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.unit.info.test_model_info import register_model
from vueda import info
from vueda.core.checks import check_model_feature_declaration
from vueda.core.filters import ModelChoiceArrayFilter
from vueda.core.filters import VuedaFilterSet
from vueda.core.installed_apps import workflow_enabled
from vueda.core.models import VuedaModel
from vueda.core.serializers import VuedaSerializer
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.workflow.models import ObjectStateProxy
from vueda.workflow.models import State
from vueda.workflow.models import WorkflowModelMethods
from vueda.workflow.models import ensure_object_state
from vueda.workflow.serializers import WORKFLOW_SERIALIZER_FIELDS


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

    def test_a_child_of_an_enabled_parent_is_not_checked_again(self):
        with isolate_apps("tests.features"):

            class EnabledParent(VuedaModel):
                class Vueda:
                    class Workflow:
                        enabled = True

                class Meta:
                    app_label = "features"

            class InheritingChild(EnabledParent):
                class Meta:
                    app_label = "features"

            # The child inherits the parent's object_states_proxy relation, which is workflow's own.
            assert check_model_feature_declaration(InheritingChild) == []


class TestWorkflowEnabled:
    @pytest.mark.parametrize(
        ("model", "expected"),
        [
            (store_models.CustomerOrder, True),
            (QueueItem, True),
            (SentItem, True),
            (store_models.Customer, False),
            (ContentType, False),
            (None, False),
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


class TestSerializerFields:
    def test_every_serializer_of_an_enabled_model_receives_the_fields(self):
        class SecondaryOrderSerializer(VuedaSerializer):
            class Meta(VuedaSerializer.Meta):
                model = store_models.CustomerOrder
                fields = ["id"]

        assert set(WORKFLOW_SERIALIZER_FIELDS) <= set(SecondaryOrderSerializer().fields)

    def test_a_serializer_that_opts_out_receives_none(self):
        class CompactOrderSerializer(VuedaSerializer):
            class Meta(VuedaSerializer.Meta):
                model = store_models.CustomerOrder
                fields = ["id"]
                workflow_fields = False

        assert set(CompactOrderSerializer().fields) == {"id"}

    def test_a_serializer_of_a_model_without_workflow_receives_none(self):
        class CustomerSerializer(VuedaSerializer):
            class Meta(VuedaSerializer.Meta):
                model = store_models.Customer
                fields = ["id"]

        assert not set(WORKFLOW_SERIALIZER_FIELDS) & set(CustomerSerializer().fields)

    def test_a_workflow_field_the_serializer_lists_and_declares_is_its_own(self):
        class RelabelledOrderSerializer(VuedaSerializer):
            workflow_state_name = serializers.CharField(source="workflow_state.name", read_only=True, label="Stage")

            class Meta(VuedaSerializer.Meta):
                model = store_models.CustomerOrder
                fields = ["id", "workflow_state_name"]

        assert RelabelledOrderSerializer().fields["workflow_state_name"].label == "Stage"


class TestFilterSetFilter:
    def test_a_filterset_of_an_enabled_model_receives_the_filter(self):
        class OrderFilterSet(VuedaFilterSet):
            class Meta:
                model = store_models.CustomerOrder
                fields = []

        # base_filters is what drf-spectacular reads for the schema.
        assert getattr(OrderFilterSet.base_filters.get("workflow_state"), "vueda_workflow_state", False)

    def test_a_declared_filter_of_the_same_name_is_kept(self):
        class OrderFilterSet(VuedaFilterSet):
            workflow_state = rest_framework.CharFilter(field_name="object_states_proxy__state__code")

            class Meta:
                model = store_models.CustomerOrder
                fields = []

        assert isinstance(OrderFilterSet.base_filters["workflow_state"], rest_framework.CharFilter)

    @pytest.mark.django_db
    def test_a_declared_filter_keeps_its_own_choices(self):
        declared_queryset = State.objects.filter(code="declared-only")

        class OrderFilterSet(VuedaFilterSet):
            workflow_state = ModelChoiceArrayFilter(field_name="object_states_proxy__state", queryset=declared_queryset)

            class Meta:
                model = store_models.CustomerOrder
                fields = []

        # An order in a state is what makes narrowing run for the default filter.
        user = get_user_model().objects.create(email="filter-probe@domain.invalid", name="Filter Probe")
        store_models.CustomerOrder.objects.create(
            order_number=Decimal("3001"),
            customer=store_models.Customer.objects.create(user=user),
            order_state=store_models.OrderState.objects.create(code="order_state_probe", name="Probe"),
        )
        filterset = OrderFilterSet(queryset=store_models.CustomerOrder.objects.all())

        # The filterset works on a deep copy of its filters, so compare what the queryset selects.
        assert str(filterset.filters["workflow_state"].queryset.query) == str(declared_queryset.query)

    def test_a_filterset_of_a_model_without_workflow_receives_none(self):
        class CustomerFilterSet(VuedaFilterSet):
            class Meta:
                model = store_models.Customer
                fields = []

        assert "workflow_state" not in CustomerFilterSet.base_filters


@pytest.mark.django_db
class TestModelInfoFlag(BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "superuser@domain.invalid": {"name": "Superuser", "password": "password", "groups": [], "is_superuser": True},
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        yield
        info.registration.get_empty_registry()

    @pytest.mark.parametrize(("model_name", "expected"), [("customerorder", True), ("customer", False)])
    def test_reports_whether_the_model_enables_workflow(self, api_client, model_name, expected):
        register_model("store", model_name)
        api_client.force_authenticate(self.users["superuser@domain.invalid"])

        response = api_client.get(reverse("info.model_info-detail", args=("store", model_name)), format="json")

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert response.data["workflow_enabled"] is expected


@pytest.mark.django_db
class TestSchema:
    def test_the_schema_comes_from_the_model_policy_without_reading_workflow_rows(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        from drf_spectacular.generators import SchemaGenerator

        with CaptureQueriesContext(connection) as queries:
            schema = SchemaGenerator().get_schema(request=None, public=True)

        assert not [query["sql"] for query in queries.captured_queries if "vueda_workflow" in query["sql"]]
        list_parameters = schema["paths"]["/routes/vueda.vdq/queueitem/"]["get"]["parameters"]
        assert "workflow_state" in {parameter["name"] for parameter in list_parameters}
        assert set(WORKFLOW_SERIALIZER_FIELDS) <= set(schema["components"]["schemas"]["DefaultQueueItem"]["properties"])
