from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.expected_results_model_info import EXPECTED_RESULTS
from vueda import info
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission


ADMIN_PERMISSIONS = (
    ("contenttypes", "ContentType", "list"),
    ("contenttypes", "ContentType", "read"),
    ("store", "Cart", "delete"),
    ("store", "Cart", "list"),
    ("store", "Cart", "read"),
    ("store", "CartItem", "delete"),
    ("store", "CartItem", "list"),
    ("store", "CartItem", "read"),
    ("store", "Customer", "list"),
    ("store", "Customer", "read"),
    ("store", "CustomerData", "list"),
    ("store", "CustomerData", "read"),
    ("store", "CustomerOrder", "create"),
    ("store", "CustomerOrder", "delete"),
    ("store", "CustomerOrder", "list"),
    ("store", "CustomerOrder", "read"),
    ("store", "CustomerOrder", "update"),
    ("store", "Distributor", "create"),
    ("store", "Distributor", "delete"),
    ("store", "Distributor", "list"),
    ("store", "Distributor", "read"),
    ("store", "Distributor", "update"),
    ("store", "DistributorProxy", "create"),
    ("store", "DistributorProxy", "delete"),
    ("store", "DistributorProxy", "list"),
    ("store", "DistributorProxy", "read"),
    ("store", "DistributorProxy", "update"),
    ("store", "InventoryRecord", "create"),
    ("store", "InventoryRecord", "delete"),
    ("store", "InventoryRecord", "list"),
    ("store", "InventoryRecord", "read"),
    ("store", "InventoryRecord", "update"),
    ("store", "InventoryRecordReason", "create"),
    ("store", "InventoryRecordReason", "delete"),
    ("store", "InventoryRecordReason", "list"),
    ("store", "InventoryRecordReason", "read"),
    ("store", "InventoryRecordReason", "update"),
    ("store", "Note", "create"),
    ("store", "Note", "delete"),
    ("store", "Note", "list"),
    ("store", "Note", "read"),
    ("store", "Note", "update"),
    ("store", "OptionType", "create"),
    ("store", "OptionType", "delete"),
    ("store", "OptionType", "list"),
    ("store", "OptionType", "read"),
    ("store", "OptionType", "update"),
    ("store", "OrderItem", "create"),
    ("store", "OrderItem", "delete"),
    ("store", "OrderItem", "list"),
    ("store", "OrderItem", "read"),
    ("store", "OrderItem", "update"),
    ("store", "OrderCompositePK", "create"),
    ("store", "OrderCompositePK", "delete"),
    ("store", "OrderCompositePK", "list"),
    ("store", "OrderCompositePK", "read"),
    ("store", "OrderCompositePK", "update"),
    ("store", "OrderItemCompositePK", "create"),
    ("store", "OrderItemCompositePK", "delete"),
    ("store", "OrderItemCompositePK", "list"),
    ("store", "OrderItemCompositePK", "read"),
    ("store", "OrderItemCompositePK", "update"),
    ("store", "OrderItemAltCompositePK", "create"),
    ("store", "OrderItemAltCompositePK", "delete"),
    ("store", "OrderItemAltCompositePK", "list"),
    ("store", "OrderItemAltCompositePK", "read"),
    ("store", "OrderItemAltCompositePK", "update"),
    ("store", "OrderState", "create"),
    ("store", "OrderState", "delete"),
    ("store", "OrderState", "list"),
    ("store", "OrderState", "read"),
    ("store", "OrderState", "update"),
    ("store", "PackingBox", "create"),
    ("store", "PackingBox", "delete"),
    ("store", "PackingBox", "list"),
    ("store", "PackingBox", "read"),
    ("store", "PackingBox", "update"),
    ("store", "Product", "create"),
    ("store", "Product", "delete"),
    ("store", "Product", "list"),
    ("store", "Product", "read"),
    ("store", "Product", "update"),
    ("store", "ProductOption", "create"),
    ("store", "ProductOption", "delete"),
    ("store", "ProductOption", "list"),
    ("store", "ProductOption", "read"),
    ("store", "ProductOption", "update"),
    ("store", "SpecialCare", "create"),
    ("store", "SpecialCare", "delete"),
    ("store", "SpecialCare", "list"),
    ("store", "SpecialCare", "read"),
    ("store", "SpecialCare", "update"),
    ("store", "TangibleType", "create"),
    ("store", "TangibleType", "delete"),
    ("store", "TangibleType", "list"),
    ("store", "TangibleType", "read"),
    ("store", "TangibleType", "update"),
    ("employee", "User", "create"),
    ("employee", "User", "delete"),
    ("employee", "User", "list"),
    ("employee", "User", "read"),
    ("employee", "User", "update"),
)

CUSTOMER_PERMISSIONS = (
    ("contenttypes", "ContentType", "list"),
    ("contenttypes", "ContentType", "read"),
    ("store", "Cart", "create"),
    ("store", "Cart", "delete"),
    ("store", "Cart", "read"),
    ("store", "Cart", "update"),
    ("store", "CartItem", "create"),
    ("store", "CartItem", "delete"),
    ("store", "CartItem", "list"),
    ("store", "CartItem", "read"),
    ("store", "CartItem", "update"),
    ("store", "Customer", "read"),
    ("store", "Customer", "delete"),
    ("store", "CustomerData", "list"),
    ("store", "CustomerData", "read"),
    ("store", "CustomerOrder", "create"),
    ("store", "CustomerOrder", "read"),
    ("store", "Distributor", "list"),
    ("store", "Distributor", "read"),
    ("store", "DistributorProxy", "list"),
    ("store", "DistributorProxy", "read"),
    ("store", "Note", "list"),
    ("store", "Note", "read"),
    ("store", "OptionType", "list"),
    ("store", "OptionType", "read"),
    ("store", "OrderItem", "create"),
    ("store", "OrderItem", "list"),
    ("store", "OrderItem", "read"),
    ("store", "OrderCompositePK", "create"),
    ("store", "OrderCompositePK", "list"),
    ("store", "OrderCompositePK", "read"),
    ("store", "OrderItemCompositePK", "create"),
    ("store", "OrderItemCompositePK", "list"),
    ("store", "OrderItemCompositePK", "read"),
    ("store", "OrderItemAltCompositePK", "create"),
    ("store", "OrderItemAltCompositePK", "list"),
    ("store", "OrderItemAltCompositePK", "read"),
    ("store", "OrderState", "list"),
    ("store", "OrderState", "read"),
    ("store", "PackingBox", "list"),
    ("store", "PackingBox", "read"),
    ("store", "Product", "list"),
    ("store", "Product", "read"),
    ("store", "ProductOption", "list"),
    ("store", "ProductOption", "read"),
    ("store", "SpecialCare", "list"),
    ("store", "SpecialCare", "read"),
    ("store", "TangibleType", "list"),
    ("store", "TangibleType", "read"),
    ("employee", "User", "read"),
)

# Every registration the info API is expected to know about, as (serializer, viewset) pairs.
# A viewset of None means the model is registered with its serializer only.
REGISTRATIONS = (
    (store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet),
    (store_serializers.CustomerDataSerializer, store_viewsets.CustomerDataViewSet),
    (store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet),
    (store_serializers.ProductSerializer, store_viewsets.ProductViewSet),
    (store_serializers.OptionTypeSerializer, store_viewsets.OptionTypeViewSet),
    (store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet),
    (store_serializers.CartSerializer, store_viewsets.CartViewSet),
    (store_serializers.CartItemSerializer, store_viewsets.CartItemViewSet),
    (store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet),
    (store_serializers.OrderItemSerializer, None),
    (store_serializers.InventoryRecordReasonSerializer, store_viewsets.InventoryRecordReasonViewSet),
    (store_serializers.InventoryRecordSerializer, store_viewsets.InventoryRecordViewSet),
    (store_serializers.PackingBoxSerializer, store_viewsets.PackingBoxViewSet),
    (store_serializers.NoteSerializer, store_viewsets.NoteViewSet),
    (store_serializers.OrderCompositePKSerializer, store_viewsets.OrderCompositePKViewSet),
    (store_serializers.OrderItemCompositePKSerializer, store_viewsets.OrderItemCompositePKViewSet),
    (store_serializers.OrderItemAltCompositePKSerializer, store_viewsets.OrderItemAltCompositePKViewSet),
    (store_serializers.DistributorProxySerializer, store_viewsets.DistributorProxyViewSet),
    # Registration doesn't require the serializer to inherit VuedaSerializer; this is a plain
    # rest_framework ModelSerializer registered to prove that path doesn't blow up.
    (store_serializers.InvoiceLineBaseSerializer, None),
)

# The same registrations, keyed the way the parametrized cases and the detail route name a model.
REGISTRATIONS_BY_MODEL = {
    (serializer.Meta.model._meta.app_label, serializer.Meta.model._meta.model_name): (serializer, viewset)
    for serializer, viewset in REGISTRATIONS
}

EXPANDED_FIELDS = [
    "model_actions",
    "model_column_totals",
    "model_expands",
    "model_fields",
    "model_filtering",
    "model_ordering",
    "model_permissions",
]


def apply_registration(serializer, viewset):
    if viewset is None:
        info.register_serializer(serializer)
    else:
        info.register(serializer, viewset)


def register_all_models():
    """Register every model, which is what the list endpoint reports on."""
    info.registration.get_empty_registry()
    for serializer, viewset in REGISTRATIONS:
        apply_registration(serializer, viewset)


def register_model(app_label, model_name):
    """
    Register the model under test and nothing else.

    The detail response for a model is built from that model's own registration, so registering the
    rest is work every parametrized case would pay for and no case would use.
    """
    info.registration.get_empty_registry()

    apply_registration(*REGISTRATIONS_BY_MODEL[(app_label, model_name)])


class AdminTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """The admin group and user only, so admin tests don't create the customer group as well."""

    groups_to_create: ClassVar[dict] = {"Admin": ADMIN_PERMISSIONS}

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }


class CustomerTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """The customer group and user only, so customer tests don't create the admin group as well."""

    groups_to_create: ClassVar[dict] = {"Customer": CUSTOMER_PERMISSIONS}

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


class BaseModelInfo:
    """
    Shared setup for the model info tests. ``test_data_class`` names the group and user the
    subclass authenticates as, so each test creates one group instead of all of them.
    """

    test_data_class: ClassVar[type]
    user_email: ClassVar[str]

    @pytest.fixture(autouse=True)
    def empty_registry_after_test(self):
        """Leave an empty registry behind, whichever module runs next."""
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def authenticated_client(self, api_client):
        test_data = self.test_data_class()
        api_client.force_authenticate(user=test_data.users[self.user_email])
        return api_client


class BaseModelInfoDetail(BaseModelInfo):
    """
    The detail response for every registered model, checked against the expected results. Subclasses
    differ only in who asks: ``expected_actions_key`` names the actions the subclass's user is
    allowed to see.
    """

    expected_actions_key: ClassVar[str]

    def check_model_actions_data(self, response_data, expected_data, expected_actions_key, app_label, model_name):
        data = response_data.data["model_actions"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, (
            f'"{app_label}", "{model_name}" -> "{expected_actions_key}" -> {{keys}}'
        )
        for model_action in data:
            for expected_model_action in expected_data:
                if model_action["name"] == expected_model_action["name"]:
                    assert frozenset(model_action) == frozenset(expected_model_action), (
                        f'"{app_label}", "{model_name}" -> "{expected_actions_key}" -> '
                        f'"name": "{model_action["name"]}" -> {{keys}}'
                    )
                    for key, value in model_action.items():
                        assert value == expected_model_action[key], (
                            f'"{app_label}", "{model_name}" -> "{expected_actions_key}" -> '
                            f'"name": "{model_action["name"]}" -> {key}'
                        )

    def check_model_expands_data(self, response_data, expected_data, app_label, model_name):
        data = response_data.data["model_expands"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, "expected_expands -> {{keys}}"
        for model_expand in data:
            for expected_model_expand in expected_data:
                if model_expand["name"] == expected_model_expand["name"]:
                    assert frozenset(model_expand) == frozenset(expected_model_expand), (
                        f'"{app_label}", "{model_name}" -> "expected_expands" -> "name": "{model_expand["name"]}" -> {{keys}}'
                    )
                    for key, value in model_expand.items():
                        if key == settings.REST_FLEX_FIELDS["FIELDS_PARAM"]:
                            self.check_model_fields(
                                value,
                                expected_model_expand[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]],
                                app_label,
                                model_name,
                                f'"{app_label}", "{model_name}" -> "expected_expands" -> "name": "{model_expand["name"]}"',
                            )
                            continue
                        assert value == expected_model_expand[key], (
                            f'"{app_label}", "{model_name}" -> "expected_expands" -> "name": "{model_expand["name"]}" -> {key}'
                        )

    def check_model_fields(self, data, expected_data, app_label, model_name, extra_key=None):
        if extra_key is not None:
            assert frozenset(data) == frozenset(expected_data), f"{extra_key} -> FIELDS_PARAM -> {{keys}}"
        else:
            assert frozenset(data) == frozenset(expected_data), (
                f'"{app_label}", "{model_name}" -> "expected_fields -> {{keys}}'
            )
        for field_name, field_data in data.items():
            for expected_field_name, expected_field_data in expected_data.items():
                if field_name == expected_field_name:
                    if extra_key is not None:
                        failure_msg = f"{extra_key} -> FIELDS_PARAM -> {field_name}"
                    else:
                        failure_msg = f'"{app_label}", "{model_name}" -> "expected_fields" -> {field_name}'
                    assert frozenset(field_data) == frozenset(expected_field_data), f"{failure_msg} -> {{keys}}"
                    for key, value in field_data.items():
                        if key == "help_text":  # Don't worry about adding help text messages into our test data.
                            value = None
                        assert value == expected_field_data[key], f"{failure_msg} -> {key}"

    def check_model_fields_data(self, response_data, expected_data, app_label, model_name):
        self.check_model_fields(response_data.data["model_fields"], expected_data, app_label, model_name)

    @staticmethod
    def check_model_filtering_data(response_data, expected_data, app_label, model_name):
        data = response_data.data["model_filtering"]
        assert frozenset(data) == frozenset(expected_data), (
            f'"{app_label}", "{model_name}" -> "expected_filtering" -> {{keys}}'
        )
        for model_filter_name, model_filter in data.items():
            for expected_model_filter_name, expected_model_filter in expected_data.items():
                if model_filter_name == expected_model_filter_name:
                    failure_msg = f'"{app_label}", "{model_name}" -> "expected_filtering" -> {model_filter_name}'
                    assert frozenset(model_filter) == frozenset(expected_model_filter), f"{failure_msg} -> {{keys}}"
                    for key, value in model_filter.items():
                        assert value == expected_model_filter[key], f"{failure_msg} -> {key}"

    @staticmethod
    def check_model_ordering_data(response_data, expected_ordering_data, app_label, model_name):
        ordering_data = response_data.data["model_ordering"]
        assert ordering_data["default"] == expected_ordering_data["default"], (
            f'"{app_label}", "{model_name}" -> "expected_ordering" -> "default"'
        )
        expected_data = expected_ordering_data["fields"]
        data = ordering_data["fields"]
        assert {x["name"] for x in data} == {x["name"] for x in expected_data}, (
            f'"{app_label}", "{model_name}" -> "expected_ordering" -> "fields"'
        )
        for model_order in data:
            for expected_model_order in expected_data:
                if model_order["name"] == expected_model_order["name"]:
                    assert frozenset(model_order) == frozenset(expected_model_order), (
                        f'"{app_label}", "{model_name}" -> "expected_ordering" -> "fields" -> "{model_order}"'
                    )
                    for key, value in model_order.items():
                        assert value == expected_model_order[key], (
                            f'"{app_label}", "{model_name}" -> "expected_ordering" -> "fields" -> "{model_order}"'
                        )

    @staticmethod
    def check_model_column_totals_data(response_data, expected_data, app_label, model_name):
        """The totals a client may ask for.

        Order is part of the contract: it is the order the viewset declares its totals in, and the
        order they come back in. The section reports the names only -- the parameter that asks for
        them is a client-side constant until parameter-name discovery ships.
        """
        data = response_data.data["model_column_totals"]
        assert data["fields"] == expected_data, f'"{app_label}", "{model_name}" -> "expected_column_totals" -> "fields"'

    @staticmethod
    def check_model_permissions_data(response_data, expected_data, app_label, model_name):
        data = response_data.data["model_permissions"]
        assert {frozenset(x) for x in data} == {frozenset(x) for x in expected_data}, (
            f'"{app_label}", "{model_name}" -> "expected_permissions" -> {{keys}}'
        )
        assert {x["codename"] for x in data} == {x["codename"] for x in expected_data}
        for model_permission in data:
            for expected_model_permission in expected_data:
                if model_permission["codename"] == expected_model_permission["codename"]:
                    assert frozenset(model_permission) == frozenset(expected_model_permission), (
                        f'"{app_label}", "{model_name}" -> "expected_permissions" -> "{model_permission}"'
                    )
                    for key, value in model_permission.items():
                        assert value == expected_model_permission[key], (
                            f'"{app_label}", "{model_name}" -> "expected_permissions" -> "{model_permission}"'
                        )

    @pytest.mark.parametrize(
        "app_label, model_name, kwargs",
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
    )
    def test_info_detail(
        self,
        authenticated_client,
        app_label,
        model_name,
        kwargs,
    ):
        register_model(app_label, model_name)

        response = authenticated_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    app_label,
                    model_name,
                ),
            ),
            format="json",
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: EXPANDED_FIELDS},
        )

        expected_actions_key = self.expected_actions_key

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["verbose_name"] == kwargs["verbose_name"]
        assert response.data["verbose_name_plural"] == kwargs["verbose_name_plural"]
        self.check_model_actions_data(
            response, kwargs[expected_actions_key], expected_actions_key, app_label, model_name
        )
        self.check_model_expands_data(response, kwargs["expected_expands"], app_label, model_name)
        self.check_model_fields_data(response, kwargs["expected_fields"], app_label, model_name)
        self.check_model_filtering_data(response, kwargs["expected_filtering"], app_label, model_name)
        self.check_model_ordering_data(response, kwargs["expected_ordering"], app_label, model_name)
        self.check_model_column_totals_data(response, kwargs["expected_column_totals"], app_label, model_name)
        self.check_model_permissions_data(response, kwargs["expected_permissions"], app_label, model_name)


@pytest.mark.django_db
class TestModelInfoList(BaseModelInfo):
    test_data_class = CustomerTestData
    user_email = "test_customer_1@domain.invalid"

    def test_info_list(self, authenticated_client):
        register_all_models()

        response = authenticated_client.get(reverse("info.model_info-list"), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        # Compare 'app_label.model' instead of totals, so you can see what is missing.
        assert {f"{result['app_label']}.{result['model']}" for result in response.data["results"]} == {
            f"{result[0]}.{result[1]}" for result in EXPECTED_RESULTS
        }


@pytest.mark.django_db
class TestModelInfoSerializerAdmin(BaseModelInfoDetail):
    test_data_class = AdminTestData
    user_email = "test_admin@domain.invalid"
    expected_actions_key = "expected_actions_admin"


@pytest.mark.django_db
class TestModelInfoSerializerCustomer(BaseModelInfoDetail):
    test_data_class = CustomerTestData
    user_email = "test_customer_1@domain.invalid"
    expected_actions_key = "expected_actions_customer"


def get_model_action_names_expecting_ok(client, app_label, model_name):
    """Request a model's info with ``model_actions`` expanded, assert a 200, and return the action names."""
    response = client.get(
        reverse("info.model_info-detail", args=(app_label, model_name)),
        format="json",
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_actions"},
    )
    assert response.status_code == HTTPStatus.OK, response_body(response)
    return {action["name"] for action in response.data["model_actions"]}


@pytest.mark.django_db
class TestHistoryActionMetadataAvailability(BaseTestUserMixin, BaseTestGroupMixin):
    """
    ``history-list`` in a model's metadata follows read authorization rather than merely
    existing, so a requester never sees an action the direct history request would refuse with a
    403. Reproduces #280: a requester with no permission at all on a tracked model saw
    ``history-list`` as its only reported action.
    """

    groups_to_create: ClassVar[dict] = {
        "No Distributor Permission": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
        ],
        "Distributor Lister": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Distributor", "list"),
        ],
        "Distributor Reader": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Distributor", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "no_permission@domain.invalid": {
            "name": "No Permission",
            "password": "testpass",
            "groups": ["No Distributor Permission"],
        },
        "lister@domain.invalid": {
            "name": "Lister",
            "password": "testpass",
            "groups": ["Distributor Lister"],
        },
        "reader@domain.invalid": {
            "name": "Reader",
            "password": "testpass",
            "groups": ["Distributor Reader"],
        },
    }

    @pytest.fixture(autouse=True)
    def register_distributor(self):
        """Register the distributor model for each test, and leave an empty registry behind."""
        register_model("store", "distributor")
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def distributor(self):
        return store_serializers.DistributorSerializer.Meta.model.objects.create(
            name="Widget Co.", description="Fine widgets."
        )

    def test_no_permission_reports_no_actions_at_all(self, api_client, distributor):
        api_client.force_authenticate(user=self.users["no_permission@domain.invalid"])

        assert get_model_action_names_expecting_ok(api_client, "store", "distributor") == set()

    def test_list_permission_alone_does_not_grant_history_access(self, api_client, distributor):
        api_client.force_authenticate(user=self.users["lister@domain.invalid"])

        names = get_model_action_names_expecting_ok(api_client, "store", "distributor")

        assert "history-list" not in names

    def test_read_permission_grants_history_access(self, api_client, distributor):
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        names = get_model_action_names_expecting_ok(api_client, "store", "distributor")

        assert "history-list" in names


@pytest.mark.django_db
class TestHistoryActionMetadataAvailabilityUnderWorkflowState(BaseTestUserMixin, BaseTestGroupMixin):
    """
    Model metadata's ``history-list`` decision folds in a workflow-state grant that can settle an
    otherwise-denied model-level read, the same deferral every other CRUD action's own metadata
    discovery already relies on (``ObjectPermissions.has_permission`` deferring to
    ``has_matching_state_grant``). This is the ``instance=None`` branch of
    ``VuedaViewSet._read_permitted``, distinct from the per-object branch covered by
    ``TestHistoryActionObjectAvailabilityUnderWorkflowState`` in ``test_history_action_api.py``.
    """

    groups_to_create: ClassVar[dict] = {
        "Order Metadata Viewer": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "viewer@domain.invalid": {
            "name": "Viewer",
            "password": "testpass",
            "groups": ["Order Metadata Viewer"],
        },
    }

    @pytest.fixture(autouse=True)
    def register_customer_order(self):
        """Register the customerorder model for each test, and leave an empty registry behind."""
        register_model("store", "customerorder")
        yield
        info.registration.get_empty_registry()

    def test_a_state_grant_settles_a_model_level_denial_in_metadata(self, api_client):
        """
        "Order Metadata Viewer" holds no ``read_customerorder`` permission at all. A state grant
        on the workflow's own initial state is enough to settle the model-level denial for
        metadata discovery, without any ``CustomerOrder`` row existing to check against.
        """
        api_client.force_authenticate(user=self.users["viewer@domain.invalid"])
        StatePermission.objects.create(
            state=State.objects.get(workflow__code="order_fulfillment", code="new"),
            permission=Permission.objects.get(codename="read_customerorder", content_type__app_label="store"),
            group=Group.objects.get(name="Order Metadata Viewer"),
            grant_or_deny=True,
        )

        names = get_model_action_names_expecting_ok(api_client, "store", "customerorder")

        assert "history-list" in names
        assert "retrieve" in names, (
            "the state grant is registered under read_customerorder, so it must settle retrieve's "
            "own model-level denial through the same has_permission deferral as history-list, not "
            "only history-list's"
        )


@pytest.mark.django_db
class TestModelActionsSeparatesListFromRetrieve(BaseTestUserMixin, BaseTestGroupMixin):
    """
    Model metadata decides ``list`` and ``retrieve`` against their own required permissions, not
    against whichever of the two the collision in ``ObjectPermissions.perms_map`` happened to
    resolve. Reproduces #292 at the model-metadata discovery path: ``get_model_actions()`` never
    set the viewset's ``action`` before checking either, so both resolved to ``read_*`` -- a
    list-only requester was told ``retrieve`` was available, and a read-only requester was told
    ``list`` was available.
    """

    groups_to_create: ClassVar[dict] = {
        "Distributor Lister Only": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Distributor", "list"),
        ],
        "Distributor Reader Only": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Distributor", "read"),
        ],
        "Distributor Lister And Reader": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "lister@domain.invalid": {
            "name": "Lister",
            "password": "testpass",
            "groups": ["Distributor Lister Only"],
        },
        "reader@domain.invalid": {
            "name": "Reader",
            "password": "testpass",
            "groups": ["Distributor Reader Only"],
        },
        "both@domain.invalid": {
            "name": "Both",
            "password": "testpass",
            "groups": ["Distributor Lister And Reader"],
        },
    }

    @pytest.fixture(autouse=True)
    def register_distributor(self):
        """Register the distributor model for each test, and leave an empty registry behind."""
        register_model("store", "distributor")
        yield
        info.registration.get_empty_registry()

    def test_list_permission_alone_does_not_grant_retrieve(self, api_client):
        api_client.force_authenticate(user=self.users["lister@domain.invalid"])

        names = get_model_action_names_expecting_ok(api_client, "store", "distributor")

        assert "list" in names
        assert "retrieve" not in names

    def test_read_permission_alone_does_not_grant_list(self, api_client):
        api_client.force_authenticate(user=self.users["reader@domain.invalid"])

        names = get_model_action_names_expecting_ok(api_client, "store", "distributor")

        assert "retrieve" in names
        assert "list" not in names

    def test_both_permissions_keep_both_entries(self, api_client):
        api_client.force_authenticate(user=self.users["both@domain.invalid"])

        names = get_model_action_names_expecting_ok(api_client, "store", "distributor")

        assert {"list", "retrieve"}.issubset(names)


@pytest.mark.django_db
class TestModelColumnTotalsSection(BaseModelInfo):
    """What the column totals section reports, beyond the per-model name lists.

    The names themselves are checked per model in `BaseModelInfoDetail`. What is checked here is
    what no per-model expectation can show: the section carries the declared names and nothing else,
    and it is expanded rather than returned by default.
    """

    test_data_class = CustomerTestData
    user_email = "test_customer_1@domain.invalid"

    def get_column_totals_section_expecting_ok(self, authenticated_client):
        response = authenticated_client.get(
            reverse("info.model_info-detail", args=("store", "cartitem")),
            format="json",
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_column_totals"},
        )
        assert response.status_code == HTTPStatus.OK, response_body(response)
        return response.data["model_column_totals"], response

    def test_section_reports_names_only(self, authenticated_client, settings):
        """The parameter a client sends is its own constant, so renaming `COLUMN_TOTALS_PARAM`
        changes what the server accepts without changing what this section reports. Reporting the
        name here waits for parameter-name discovery, after v3.0.0."""
        settings.COLUMN_TOTALS_PARAM = "totals"
        register_model("store", "cartitem")

        section, response = self.get_column_totals_section_expecting_ok(authenticated_client)

        assert section == {"fields": ["quantity", "product_price"]}, response_body(response)

    def test_total_name_need_not_be_a_serializer_field(self, authenticated_client):
        """`product_price` sums `product_option__price` and names no field of the serializer, which
        is what a flag on each `model_fields` entry could not have reported."""
        register_model("store", "cartitem")

        section, response = self.get_column_totals_section_expecting_ok(authenticated_client)

        assert "product_price" in section["fields"], response_body(response)
        assert "product_price" not in store_serializers.CartItemSerializer().fields

    def test_section_is_not_returned_unless_expanded(self, authenticated_client):
        register_model("store", "cartitem")

        response = authenticated_client.get(
            reverse("info.model_info-detail", args=("store", "cartitem")), format="json"
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert "model_column_totals" not in response.data
