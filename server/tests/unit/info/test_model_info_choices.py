from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.expected_results_model_info_choices import EXPECTED_RESULTS
from tests.unit.info.utils import create_test_data
from tests.unit.info.utils import idfn
from vueda import info


# The choices endpoint checks "read" on the model under test, and also "list" on the related model
# when the field is a relation. These are only those permissions, so each group is the set its own
# test cases consult rather than a full CRUDL set for every store model.
ADMIN_PERMISSIONS = (
    ("employee", "User", "list"),
    ("store", "Cart", "list"),
    ("store", "Cart", "read"),
    ("store", "CartItem", "read"),
    ("store", "Customer", "list"),
    ("store", "Customer", "read"),
    ("store", "CustomerOrder", "list"),
    ("store", "CustomerOrder", "read"),
    ("store", "InventoryRecord", "list"),
    ("store", "InventoryRecord", "read"),
    ("store", "InventoryRecordReason", "list"),
    ("store", "OptionType", "list"),
    ("store", "OrderItem", "list"),
    ("store", "OrderItem", "read"),
    ("store", "OrderState", "list"),
    ("store", "Product", "list"),
    ("store", "Product", "read"),
    ("store", "ProductOption", "list"),
    ("store", "ProductOption", "read"),
    ("store", "SpecialCare", "list"),
    ("store", "TangibleType", "list"),
)

# The customer can "read" the models it owns but cannot "list" the models behind several of their
# relations, which is what makes the forbidden cases in the customer test forbidden. The absent
# permissions are as much a part of this set as the present ones.
CUSTOMER_PERMISSIONS = (
    ("store", "Cart", "read"),
    ("store", "CartItem", "read"),
    ("store", "Customer", "read"),
    ("store", "CustomerOrder", "read"),
    ("store", "OptionType", "list"),
    ("store", "OrderItem", "read"),
    ("store", "OrderState", "list"),
    ("store", "Product", "list"),
    ("store", "Product", "read"),
    ("store", "ProductOption", "list"),
    ("store", "ProductOption", "read"),
    ("store", "SpecialCare", "list"),
    ("store", "TangibleType", "list"),
)

# Every registration these tests need, as (serializer, viewset) pairs.
# A viewset of None means the model is registered with its serializer only.
REGISTRATIONS = (
    (store_serializers.CartSerializer, store_viewsets.CartViewSet),
    (store_serializers.CartItemSerializer, store_viewsets.CartItemViewSet),
    (store_serializers.CustomerSerializer, store_viewsets.CustomerViewSet),
    (store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet),
    (store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet),
    (store_serializers.InventoryRecordSerializer, store_viewsets.InventoryRecordViewSet),
    (store_serializers.OrderItemSerializer, None),
    (store_serializers.ProductSerializer, store_viewsets.ProductViewSet),
    (store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet),
)

# The same registrations, keyed the way the parametrized cases and the choices route name a model.
REGISTRATIONS_BY_MODEL = {
    (serializer.Meta.model._meta.app_label, serializer.Meta.model._meta.model_name): (serializer, viewset)
    for serializer, viewset in REGISTRATIONS
}


def register_model(app_label, model_name):
    """
    Register the model under test and nothing else.

    The choices response is built from the canonical serializer of the model named in the URL, so
    the models behind its relations don't need registering; the related model is reached through the
    serializer field's own queryset, and the permission on it is a plain Django permission check.
    Registering the rest is work every parametrized case would pay for and no case would use.
    """
    info.registration.get_empty_registry()

    serializer, viewset = REGISTRATIONS_BY_MODEL[(app_label, model_name)]
    if viewset is None:
        info.register_serializer(serializer)
    else:
        info.register(serializer, viewset)


class AdminTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """The admin group only, so admin tests don't create the customer group as well."""

    groups_to_create: ClassVar[dict] = {"Admin": ADMIN_PERMISSIONS}

    # All three users exist in every data class: the two customers own the objects create_test_data()
    # builds, and all three are expected choices for store.customer.user. Only the user a test
    # authenticates as needs a group.
    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
        },
        "test_customer_2@domain.invalid": {
            "name": "Test Customer 2",
            "password": "testpass",
        },
    }

    def __init__(self):
        create_test_data(self)


class CustomerTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """The customer group only, so customer tests don't create the admin group as well."""

    groups_to_create: ClassVar[dict] = {"Customer": CUSTOMER_PERMISSIONS}

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
        },
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_2@domain.invalid": {
            "name": "Test Customer 2",
            "password": "testpass",
        },
    }

    def __init__(self):
        create_test_data(self)


class InvalidFieldTestData(BaseTestUserMixin):
    """
    One user, no group, and none of the store objects.

    The invalid-field responses are raised while the choices queryset is being built, before any
    permission is checked and without reading a row, so neither the group nor the test data is
    needed to reach them.
    """

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
        },
    }


class BaseModelInfoChoices:
    """
    Shared setup for the model info choices tests. ``test_data_class`` names the group and users the
    subclass needs, so each test creates one group instead of all of them.
    """

    test_data_class: ClassVar[type]
    user_email: ClassVar[str]

    @pytest.fixture(autouse=True)
    def registry(self):
        """Leave an empty registry behind, whichever module runs next."""
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def test_data(self):
        return self.test_data_class()

    @pytest.fixture
    def authenticated_client(self, api_client, test_data):
        api_client.force_authenticate(user=test_data.users[self.user_email])
        return api_client


@pytest.mark.django_db
class TestModelInfoChoicesCustomer(BaseModelInfoChoices):
    test_data_class = CustomerTestData
    user_email = "test_customer_1@domain.invalid"

    def test_choices_reads_permission_names_mapping_at_call_time(self, settings, api_client):
        # ModelInfoChoicesViewSet.get_queryset previously closed over PERMISSION_NAMES_MAPPING at
        # import (vueda/info/viewsets.py), so overriding "read" left choices_permissions pinned to
        # "read_product" regardless of what the override requested. "tangible_type" is a relation
        # field, so it also requires "list_tangibletype" on the related model -- that requirement
        # is hardcoded in get_queryset, not settings-driven, so both users need it unconditionally.
        product_content_type = ContentType.objects.get_for_model(store_models.Product)
        tangible_type_content_type = ContentType.objects.get_for_model(store_models.TangibleType)
        list_tangible_type_permission = Permission.objects.get(
            content_type=tangible_type_content_type, codename="list_tangibletype"
        )
        stale_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type, codename="read_product", defaults={"name": "Can read product"}
        )
        mutated_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type,
            codename="mutated_read_product",
            defaults={"name": "Can mutated read product"},
        )
        stale_reader = get_user_model().objects.create_user(
            email="choices-stale-reader@domain.invalid", name="Choices Stale Reader", password="password"
        )
        stale_reader.user_permissions.add(stale_permission, list_tangible_type_permission)
        mutated_reader = get_user_model().objects.create_user(
            email="choices-mutated-reader@domain.invalid", name="Choices Mutated Reader", password="password"
        )
        mutated_reader.user_permissions.add(mutated_permission, list_tangible_type_permission)

        register_model("store", "product")
        choices_url = reverse("info.model_info_choices-list", args=("store", "product", "tangible_type"))

        # Hit the endpoint once outside the override so any lazily-imported module involved is
        # already loaded under the default setting, like a real app import at process startup.
        api_client.force_authenticate(stale_reader)
        baseline_response = api_client.get(choices_url, format="json")
        assert baseline_response.status_code == HTTPStatus.OK, response_body(baseline_response)

        settings.PERMISSION_NAMES_MAPPING = {"read": "mutated_read"}

        api_client.force_authenticate(stale_reader)
        stale_permission_response = api_client.get(choices_url, format="json")

        api_client.force_authenticate(mutated_reader)
        mutated_permission_response = api_client.get(choices_url, format="json")

        # stale_reader holds the stale "read_product" permission, which no longer satisfies the
        # check once the override maps "read" to "mutated_read".
        assert stale_permission_response.status_code == HTTPStatus.FORBIDDEN, response_body(stale_permission_response)
        assert mutated_permission_response.status_code == HTTPStatus.OK, response_body(mutated_permission_response)

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_list_customer(
        self,
        authenticated_client,
        app_label,
        model_name,
        field_name,
        expected_choices,
    ):
        register_model(app_label, model_name)

        response = authenticated_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        # The customer is not able to list customer orders or inventory records.
        match (app_label, model_name, field_name):
            case (
                ("store", "customer", "user")
                | ("store", "cart", "customer")
                | ("store", "customerorder", "customer")
                | ("store", "orderitem", "customer_order")
                | ("store", "inventoryrecord", "product_option")
                | ("store", "inventoryrecord", "reason")
                | ("store", "inventoryrecord", "added_inventory_record")
                | ("store", "inventoryrecord", "order_item")
                | ("store", "cartitem", "cart")
            ):
                assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

            case _:
                assert response.status_code == HTTPStatus.OK, (
                    f"{(app_label, model_name, field_name)}",
                    response_body(response),
                )
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(expected_choices)


@pytest.mark.django_db
class TestModelInfoChoicesAdmin(BaseModelInfoChoices):
    test_data_class = AdminTestData
    user_email = "test_admin@domain.invalid"

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
        EXPECTED_RESULTS,  # pytest likes to dump the whole def, so we move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_list_admin(
        self,
        authenticated_client,
        app_label,
        model_name,
        field_name,
        expected_choices,
    ):
        register_model(app_label, model_name)

        response = authenticated_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, (
            f"{(app_label, model_name, field_name)}",
            response_body(response),
        )

        match (app_label, model_name, field_name):
            case ("store", "inventoryrecord", "added_inventory_record"):
                # Remove the date from the label.  The date has 2
                # dashes and the 3rd is the separator after the date.
                assert frozenset(
                    "-".join(result["label"].split("-")[3:]).strip() for result in response.data["results"]
                ) == frozenset(expected_choices)

            case _:
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(expected_choices)


@pytest.mark.django_db
class TestModelInfoChoicesInvalidField(BaseModelInfoChoices):
    """The invalid-field responses, which are raised before permissions and before any row is read."""

    test_data_class = InvalidFieldTestData
    user_email = "test_admin@domain.invalid"

    def test_info_choices_list_non_choice_field_on_model_with_choice_fields(self, authenticated_client):
        register_model("store", "product")

        response = authenticated_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "product",
                    "name",
                ),
            ),
            format="json",
        )

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert (
            response.data["detail"]
            == "Invalid field 'name'. Valid fields with choices are special_care, tangible_type."
        )

    def test_info_choices_list_non_choice_field_on_model_with_no_choice_fields(self, authenticated_client):
        register_model("store", "distributor")

        response = authenticated_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "distributor",
                    "name",
                ),
            ),
            format="json",
        )

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert response.data["detail"] == "Invalid field 'name'. No choice fields found on store.Distributor."

    def test_info_choices_list_invalid_field_on_model_with_choice_fields(self, authenticated_client):
        register_model("store", "product")

        response = authenticated_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "product",
                    "named",
                ),
            ),
            format="json",
        )

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert (
            response.data["detail"]
            == "Invalid field 'named'. Valid fields with choices are special_care, tangible_type."
        )

    def test_info_choices_list_invalid_field_on_model_with_no_choice_fields(self, authenticated_client):
        register_model("store", "distributor")

        response = authenticated_client.get(
            reverse(
                "info.model_info_choices-list",
                args=(
                    "store",
                    "distributor",
                    "named",
                ),
            ),
            format="json",
        )

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert response.data["detail"] == "Invalid field 'named'. No choice fields found on store.Distributor."
