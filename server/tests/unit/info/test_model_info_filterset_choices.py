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
from tests.unit.info.utils import create_test_data
from tests.unit.info.utils import idfn
from vueda import info


DETAIL_CHOICES_FILTERING_PARAMETRIZE = [
    (
        "store",
        "cart",
        "product_quantity",
        (
            {"label": "0", "value": "0"},
            {"label": "10", "value": "10"},
            {"label": "4", "value": "4"},
            {"label": "6", "value": "6"},
        ),
    ),
    (
        "store",
        "cart",
        "product_name",
        (
            {"label": "Men's White T-Shirt", "value": "Men's White T-Shirt"},
            {"label": "Shaped Cookies For Drapes", "value": "Shaped Cookies For Drapes"},
            {"label": "Square Cookies For Squares", "value": "Square Cookies For Squares"},
            {"label": "Women's White T-Shirt", "value": "Women's White T-Shirt"},
        ),
    ),
    (
        "store",
        "product",
        "disabled",
        (
            {"label": "Yes", "value": "true"},
            {"label": "No", "value": "false"},
        ),
    ),
    (
        "store",
        "product",
        "distributor",
        (
            {"label": "Awesome Music Co.", "value": "Awesome Music Co."},
            {"label": "Tasty Treats Assoc.", "value": "Tasty Treats Assoc."},
            {"label": "T-Shirt Corp.", "value": "T-Shirt Corp."},
            {"label": "Vibrant Looks Inc.", "value": "Vibrant Looks Inc."},
        ),
    ),
    (
        "store",
        "product",
        "special_care",
        (
            {"label": "Dangerous"},
            {"label": "Fragile"},
            {"label": "Perishable"},
            {"label": "Temperature Controlled"},
        ),
    ),
    (
        "store",
        "product",
        "tangible_type",
        (
            {
                "label": "Digital",
            },
            {
                "label": "Physical",
            },
        ),
    ),
    (
        "store",
        "productoption",
        "disabled",
        (
            {"label": "True", "value": "true"},
            {"label": "False", "value": "false"},
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "is_added",
        (
            {"label": "No", "value": "false"},
            {"label": "Yes", "value": "true"},
        ),
    ),
    (
        "store",
        "inventoryrecord",
        "reason",
        (
            {"label": "Damaged Inventory"},
            {"label": "Order Fulfillment"},
            {"label": "Received Inventory"},
            {"label": "Returned Inventory"},
        ),
    ),
    (
        "store",
        "customerorder",
        "shipping_method",
        (
            {"label": "Regular", "value": "regular"},
            {"label": "Express", "value": "express"},
        ),
    ),
]

# The filterset choices endpoint checks "read" on the model under test, and also "list" on the
# related model when the filter is queryset-backed. These are only those permissions, so each group
# is the set its own test cases consult rather than a full CRUDL set for every store model.
ADMIN_PERMISSIONS = (
    ("store", "Cart", "read"),
    ("store", "CustomerOrder", "read"),
    ("store", "InventoryRecord", "read"),
    ("store", "InventoryRecordReason", "list"),
    ("store", "Product", "read"),
    ("store", "ProductOption", "read"),
    ("store", "SpecialCare", "list"),
    ("store", "TangibleType", "list"),
)

# The customer has no inventory record permissions at all, which is what makes the two inventory
# record cases in the customer test forbidden. The absent permissions are as much a part of this set
# as the present ones.
CUSTOMER_PERMISSIONS = (
    ("store", "Cart", "read"),
    ("store", "CustomerOrder", "read"),
    ("store", "Product", "read"),
    ("store", "ProductOption", "read"),
    ("store", "SpecialCare", "list"),
    ("store", "TangibleType", "list"),
)

# Every registration these tests need, as (serializer, viewset) pairs. The filterset comes off the
# viewset, so every model under test here is registered with one.
REGISTRATIONS = (
    (store_serializers.CartSerializer, store_viewsets.CartViewSet),
    (store_serializers.CustomerOrderSerializer, store_viewsets.CustomerOrderViewSet),
    (store_serializers.InventoryRecordSerializer, store_viewsets.InventoryRecordViewSet),
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

    The choices come from the filterset on the canonical viewset of the model named in the URL, so
    the models behind its queryset-backed filters don't need registering; the related model is
    reached through the filter's own queryset, and the permission on it is a plain Django permission
    check. Registering the rest is work every parametrized case would pay for and no case would use.
    """
    info.registration.get_empty_registry()
    info.register(*REGISTRATIONS_BY_MODEL[(app_label, model_name)])


class AdminTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """The admin group only, so admin tests don't create the customer group as well."""

    groups_to_create: ClassVar[dict] = {"Admin": ADMIN_PERMISSIONS}

    # Both customers exist in every data class because they own the objects create_test_data()
    # builds. Only the user a test authenticates as needs a group.
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


class InvalidFilterTestData(BaseTestUserMixin):
    """
    One user, no group, and none of the store objects.

    The invalid-filter response is raised while the choices queryset is being built, before any
    permission is checked and without reading a row, so neither the group nor the test data is
    needed to reach it.
    """

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
        },
    }


class BaseModelInfoFilterSetChoices:
    """
    Shared setup for the filterset choices tests. ``test_data_class`` names the group and users the
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

    def test_filter_choices_reads_permission_names_mapping_at_call_time(self, settings, api_client):
        # ModelInfoFilterSetChoicesViewSet.get_queryset previously closed over
        # PERMISSION_NAMES_MAPPING at import (vueda/info/viewsets.py), so overriding "read"/"list"
        # left choices_permissions pinned to "read_product"/"list_tangibletype" regardless of what
        # the override requested. Both permissions are settings-driven here (unlike the plain
        # choices viewset, where the related model's "list" permission is hardcoded).
        product_content_type = ContentType.objects.get_for_model(store_models.Product)
        tangible_type_content_type = ContentType.objects.get_for_model(store_models.TangibleType)
        stale_read_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type, codename="read_product", defaults={"name": "Can read product"}
        )
        stale_list_permission = Permission.objects.get(
            content_type=tangible_type_content_type, codename="list_tangibletype"
        )
        mutated_read_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type,
            codename="mutated_read_product",
            defaults={"name": "Can mutated read product"},
        )
        mutated_list_permission, _ = Permission.objects.get_or_create(
            content_type=tangible_type_content_type,
            codename="mutated_list_tangibletype",
            defaults={"name": "Can mutated list tangible type"},
        )
        stale_reader = get_user_model().objects.create_user(
            email="filterset-choices-stale-reader@domain.invalid",
            name="Filterset Choices Stale Reader",
            password="password",
        )
        stale_reader.user_permissions.add(stale_read_permission, stale_list_permission)
        mutated_reader = get_user_model().objects.create_user(
            email="filterset-choices-mutated-reader@domain.invalid",
            name="Filterset Choices Mutated Reader",
            password="password",
        )
        mutated_reader.user_permissions.add(mutated_read_permission, mutated_list_permission)

        self.register_viewsets()
        choices_url = reverse("info.model_info_filterset_choices-list", args=("store", "product", "tangible_type"))

        # Hit the endpoint once outside the override so any lazily-imported module involved is
        # already loaded under the default setting, like a real app import at process startup.
        api_client.force_authenticate(stale_reader)
        baseline_response = api_client.get(choices_url, format="json")
        assert baseline_response.status_code == HTTPStatus.OK, response_body(baseline_response)

        settings.PERMISSION_NAMES_MAPPING = {"read": "mutated_read", "list": "mutated_list"}

        api_client.force_authenticate(stale_reader)
        stale_permission_response = api_client.get(choices_url, format="json")

        api_client.force_authenticate(mutated_reader)
        mutated_permission_response = api_client.get(choices_url, format="json")

        # stale_reader holds the stale "read_product"/"list_tangibletype" permissions, which no
        # longer satisfy the check once the override maps "read"/"list" to mutated names.
        assert stale_permission_response.status_code == HTTPStatus.FORBIDDEN, response_body(stale_permission_response)
        assert mutated_permission_response.status_code == HTTPStatus.OK, response_body(mutated_permission_response)

    @staticmethod
    def assert_choice_value_contract(response_data, expected_choices, context):
        """
        Filter-choice responses always include a serialized `value` field.
        The serializer contract is CharField, so runtime values are expected as strings.
        """
        response_values_by_label = {result["label"]: result["value"] for result in response_data["results"]}
        for expected_choice in expected_choices:
            label = expected_choice["label"]
            msg = f"{context} -> label={label!r}"
            assert label in response_values_by_label, msg

            response_value = response_values_by_label[label]
            assert isinstance(response_value, str), f"{msg} -> value should be str, got {type(response_value).__name__}"

            if "value" in expected_choice:
                assert response_value == expected_choice["value"], (
                    f"{msg} -> expected value={expected_choice['value']!r}, got {response_value!r}"
                )


@pytest.mark.django_db
class TestModelInfoFiltersetChoicesCustomer(BaseModelInfoFilterSetChoices):
    test_data_class = CustomerTestData
    user_email = "test_customer_1@domain.invalid"

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
        DETAIL_CHOICES_FILTERING_PARAMETRIZE,  # pytest dumps the whole def, so move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_filter_customer(
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
                "info.model_info_filterset_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        # The customer is not able to list inventory records.
        match (app_label, model_name, field_name):
            case ("store", "inventoryrecord", "is_added") | ("store", "inventoryrecord", "reason"):
                assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

            case _:
                msg = (
                    f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_choices"
                )

                assert response.status_code == HTTPStatus.OK, response_body(response)
                assert frozenset(result["label"] for result in response.data["results"]) == frozenset(
                    result["label"] for result in expected_choices
                ), msg
                self.assert_choice_value_contract(response.data, expected_choices, msg)


@pytest.mark.django_db
class TestModelInfoFiltersetChoicesAdmin(BaseModelInfoFilterSetChoices):
    test_data_class = AdminTestData
    user_email = "test_admin@domain.invalid"

    @pytest.mark.parametrize(
        "app_label, model_name, field_name, expected_choices",
        DETAIL_CHOICES_FILTERING_PARAMETRIZE,  # pytest dumps the whole def, so move the parameterize details elsewhere
        ids=idfn,
    )
    def test_info_choices_filter_admin(
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
                "info.model_info_filterset_choices-list",
                args=(
                    app_label,
                    model_name,
                    field_name,
                ),
            ),
            format="json",
        )

        msg = f"DETAIL_CHOICES_FILTERING_PARAMETRIZE -> {(app_label, model_name, field_name)} -> expected_choices"

        assert response.status_code == HTTPStatus.OK, response_body(response)

        assert frozenset(result["label"] for result in response.data["results"]) == frozenset(
            result["label"] for result in expected_choices
        ), msg
        self.assert_choice_value_contract(response.data, expected_choices, msg)

    def test_all_values_filter_choices_drop_blank_string_values(self, authenticated_client, test_data):
        register_model("store", "product")

        blank_distributor = store_models.Distributor.objects.create(name="", description="Blank distributor")
        store_models.Product.objects.create(
            distributor=blank_distributor,
            name="Blank Distributor Product",
            order_between=[1, 2],
            tangible_type=test_data.tangible_type["physical"],
        )

        response = authenticated_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "distributor")),
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert "" not in {result["label"] for result in response.data["results"]}
        assert "" not in {result["value"] for result in response.data["results"]}


@pytest.mark.django_db
class TestModelInfoFiltersetChoicesInvalidFilter(BaseModelInfoFilterSetChoices):
    """The invalid-filter response, which is raised before permissions and before any row is read."""

    test_data_class = InvalidFilterTestData
    user_email = "test_admin@domain.invalid"

    def test_info_choices_filter_list_invalid_field(self, authenticated_client):
        register_model("store", "product")

        response = authenticated_client.get(
            reverse(
                "info.model_info_filterset_choices-list",
                args=(
                    "store",
                    "product",
                    "invalid_filterset_field",
                ),
            ),
            format="json",
        )

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert response.data["detail"] == (
            "Invalid filter 'invalid_filterset_field'. Valid filters are condition, disabled, "
            "distributor, id, last_ordered, name, name_icontains, quantity, special_care, tangible_type."
        )


@pytest.mark.django_db
class TestModelInfoFilterSetChoicesQueryParamFiltering(BaseModelInfoFilterSetChoices):
    """Tests that passing filterset query params to the choices endpoint narrows the returned choices."""

    test_data_class = AdminTestData
    user_email = "test_admin@domain.invalid"

    def test_distributor_choices_filtered_by_name_icontains_cookies(self, authenticated_client):
        """name_icontains=cookies matches only the two Tasty Treats products, so only that distributor appears."""
        register_model("store", "product")

        response = authenticated_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "distributor")),
            data={"name_icontains": "cookies"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"Tasty Treats Assoc."}), (
            f"Expected distributor choices filtered to cookie-product distributor only, got: {result_labels}"
        )

    def test_distributor_choices_filtered_by_quantity_of_ten(self, authenticated_client):
        """quantity=3 matches only the one T-Shirt product, so only that distributor appears."""
        register_model("store", "product")

        response = authenticated_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "distributor")),
            data={"quantity": "10"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"T-Shirt Corp.", "Vibrant Looks Inc."}), (
            f"Expected distributor choices filtered to shirt-product distributor only, got: {result_labels}"
        )

    def test_special_care_choices_filtered_by_name_icontains_cookies(self, authenticated_client):
        """name_icontains=cookies narrows special_care choices (queryset path) to only those used by cookie products.

        Cookie products use: fragile, perishable, temperature_controlled.
        Dangerous (paint products only) and Oversized (unused) should be absent.
        """
        register_model("store", "product")

        response = authenticated_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "special_care")),
            data={"name_icontains": "cookies"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"Fragile", "Perishable", "Temperature Controlled"}), (
            f"Expected special_care choices filtered to cookie-product values only, got: {result_labels}"
        )

    def test_tangible_type_choices_filtered_by_tangible_type_digital(self, authenticated_client):
        """name_icontains=cookies narrows tangible_type choices (queryset path) to only those used by cookie products.

        All cookie products are Physical; Digital is not used by any product, so it should be absent.
        """
        register_model("store", "product")

        response = authenticated_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "tangible_type")),
            data={"name_icontains": "cookies"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"Physical"}), (
            f"Expected tangible_type choices filtered to cookie-product values only, got: {result_labels}"
        )

    def test_condition_choices_filtered_by_ne(self, authenticated_client):
        """Passing condition=ne filters static choices to those whose value contains 'ne'.

        'ne' is a substring of 'new' and 'like_new' but not 'refurbished' or 'used'.
        The ChoiceFilter blank placeholder ('---------', empty value) is dropped from the
        choices metadata, and the empty 'None' choice is no longer prepended by default.
        """
        register_model("store", "product")

        response = authenticated_client.get(
            reverse("info.model_info_filterset_choices-list", args=("store", "product", "condition")),
            data={"condition": "ne"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        result_labels = frozenset(r["label"] for r in response.data["results"])
        assert result_labels == frozenset({"New", "Like New"}), (
            f"Expected only choices containing 'ne', got: {result_labels}"
        )
