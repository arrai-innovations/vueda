from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import serializers
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
from vueda.info import viewsets as info_viewsets


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
        # field, so it also requires "list_tangibletype" on the related model. This test overrides
        # "read" only, so both users need that list permission unconditionally.
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

    def test_related_choices_map_the_list_permission_name(self, settings, api_client):
        # A relation field's choices also require list permission on the related model. That name
        # goes through PERMISSION_NAMES_MAPPING, as the filter-choices endpoint's does.
        product_content_type = ContentType.objects.get_for_model(store_models.Product)
        tangible_type_content_type = ContentType.objects.get_for_model(store_models.TangibleType)
        read_product_permission, _ = Permission.objects.get_or_create(
            content_type=product_content_type, codename="read_product", defaults={"name": "Can read product"}
        )
        default_list_permission = Permission.objects.get(
            content_type=tangible_type_content_type, codename="list_tangibletype"
        )
        mapped_list_permission, _ = Permission.objects.get_or_create(
            content_type=tangible_type_content_type,
            codename="mutated_list_tangibletype",
            defaults={"name": "Can mutated list tangible type"},
        )
        default_lister = get_user_model().objects.create_user(
            email="choices-default-lister@domain.invalid", name="Choices Default Lister", password="password"
        )
        default_lister.user_permissions.add(read_product_permission, default_list_permission)
        mapped_lister = get_user_model().objects.create_user(
            email="choices-mapped-lister@domain.invalid", name="Choices Mapped Lister", password="password"
        )
        mapped_lister.user_permissions.add(read_product_permission, mapped_list_permission)

        register_model("store", "product")
        choices_url = reverse("info.model_info_choices-list", args=("store", "product", "tangible_type"))
        settings.PERMISSION_NAMES_MAPPING = {"list": "mutated_list"}

        api_client.force_authenticate(default_lister)
        default_response = api_client.get(choices_url, format="json")
        api_client.force_authenticate(mapped_lister)
        mapped_response = api_client.get(choices_url, format="json")

        assert default_response.status_code == HTTPStatus.FORBIDDEN, response_body(default_response)
        assert mapped_response.status_code == HTTPStatus.OK, response_body(mapped_response)

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

    def test_denied_choices_request_does_not_read_the_addressed_models(self, authenticated_client, monkeypatch):
        """
        A denied request used to build and evaluate the whole choices queryset before anything
        checked whether the user could see it. The customer may read a cart but may not list
        customers, so the response is 403 and neither table is read.
        """
        register_model("store", "cart")

        handled = []
        original_get_queryset = info_viewsets.ModelInfoChoicesViewSet.get_queryset

        def recording_get_queryset(self):
            handled.append(self.choices_field)
            return original_get_queryset(self)

        monkeypatch.setattr(info_viewsets.ModelInfoChoicesViewSet, "get_queryset", recording_get_queryset)

        with CaptureQueriesContext(connection) as captured:
            response = authenticated_client.get(
                reverse("info.model_info_choices-list", args=("store", "cart", "customer")), format="json"
            )

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
        assert handled == [], "the handler ran for a request the user is not allowed to make"

        read_tables = [
            query["sql"]
            for query in captured.captured_queries
            if "store_customer" in query["sql"] or "store_cart" in query["sql"]
        ]
        assert read_tables == [], read_tables


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

    def test_successful_choices_response_runs_one_dispatch(
        self, authenticated_client, django_assert_num_queries, monkeypatch
    ):
        """
        The viewset used to answer a choices request by running the whole request twice. The first
        run populated choices_permissions as a side effect of get_queryset, so only the second run
        could deny. Resolution now happens before the handler, and one request is one dispatch.

        The query count is exact so that a reintroduced second dispatch fails here. Send one
        request before measuring: the first request for a user fills that user's permission cache.
        """
        register_model("store", "product")

        url = reverse("info.model_info_choices-list", args=("store", "product", "tangible_type"))
        warm_up_response = authenticated_client.get(url, format="json")
        assert warm_up_response.status_code == HTTPStatus.OK, response_body(warm_up_response)

        dispatched = []
        original_initial = info_viewsets.ModelInfoChoicesBaseViewSet.initial

        def counting_initial(self, request, *args, **kwargs):
            dispatched.append(request)
            return original_initial(self, request, *args, **kwargs)

        monkeypatch.setattr(info_viewsets.ModelInfoChoicesBaseViewSet, "initial", counting_initial)

        with django_assert_num_queries(9):
            response = authenticated_client.get(url, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(dispatched) == 1


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


class BaseManagerChoiceTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """A superuser, so these tests aren't tangled up in exactly which permissions
    ModelInfoChoicesViewSet.resolve_choices computes for a field -- which model-introspected name a
    field's choices are checked against is not what any of these tests are about."""

    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


def _make_carts(row_count):
    """`row_count` Carts, each with its own Customer and User, keyed by (str) pk -> owner email --
    the shape Cart.get_formatted_name() (self.customer.user.email) renders and a choices response's
    "value"/"label" pair uses.

    A field's choices come from its own queryset in full (see the three tests below), not from any
    particular addressed row, so nothing here needs a CartItem or a Customer "under test" -- only the
    Cart rows themselves.
    """
    carts = {}
    for i in range(row_count):
        user = get_user_model().objects.create(
            email=f"cart-owner-{row_count}-{i}@domain.invalid", name=f"Cart Owner {i}", is_active=True
        )
        customer = store_models.Customer.objects.create(user=user)
        cart = store_models.Cart.objects.create(customer=customer)
        carts[str(cart.pk)] = user.email
    return carts


@pytest.mark.django_db
def test_field_choices_query_count_does_not_grow_with_row_count_for_the_plain_queryset_branch(api_client):
    """ModelInfoChoicesViewSet.get_queryset's own annotate_formatted_name call, on the plain
    (non-`slug_field`) `hasattr(field, "queryset")` branch.

    CartItemCartBaseManagerSerializer's `cart` field builds its queryset from `Cart._base_manager`
    rather than `Cart.objects` (`FormattedNameManager`), so FormattedNameManager never gets a chance
    to apply `formatted_name_select_related` first the way it would through `Cart.objects.all()` --
    a flat query count here can only be this resolver's own doing.
    """
    info.registration.get_empty_registry()
    try:
        info.register(
            store_serializers.CartItemCartBaseManagerSerializer, store_viewsets.CartItemCartBaseManagerViewSet
        )

        test_data = BaseManagerChoiceTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        url = reverse("info.model_info_choices-list", args=("store", "cartitem", "cart"))

        counts = {}
        for row_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = _make_carts(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = api_client.get(url, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {result["value"]: result["label"] for result in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"field choices query count grows with row count: {counts}"
    finally:
        info.registration.get_empty_registry()


@pytest.mark.django_db
def test_field_choices_query_count_does_not_grow_with_row_count_for_the_slug_field_branch(api_client):
    """ModelInfoChoicesViewSet.get_queryset's own annotate_formatted_name call, on the `slug_field`
    (`SlugRelatedField`) branch -- also covers the fix to that branch's "value", which previously read
    the literal attribute `instance.key_field` instead of `getattr(instance, key_field)` and so raised
    AttributeError the moment anything exercised it (nothing did, until now).

    CartItemCartSlugBaseManagerSerializer's `cart` field builds its queryset from `Cart._base_manager`
    for the same isolation reason as the plain-queryset-branch test above.
    """
    info.registration.get_empty_registry()
    try:
        info.register(
            store_serializers.CartItemCartSlugBaseManagerSerializer, store_viewsets.CartItemCartSlugBaseManagerViewSet
        )

        test_data = BaseManagerChoiceTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        url = reverse("info.model_info_choices-list", args=("store", "cartitem", "cart"))

        counts = {}
        for row_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = _make_carts(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = api_client.get(url, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {result["value"]: result["label"] for result in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"field choices query count grows with row count: {counts}"
    finally:
        info.registration.get_empty_registry()


@pytest.mark.django_db
def test_field_choices_query_count_does_not_grow_with_row_count_for_the_child_relation_branch(api_client):
    """ModelInfoChoicesViewSet.get_queryset's own annotate_formatted_name call, on the
    `hasattr(field, "child_relation")` (`ManyRelatedField`) branch.

    CustomerCartsBaseManagerSerializer's `carts` field (source="cart_set") builds its queryset from
    `Cart._base_manager` for the same isolation reason as the other two tests above.
    """
    info.registration.get_empty_registry()
    try:
        info.register(
            store_serializers.CustomerCartsBaseManagerSerializer, store_viewsets.CustomerCartsBaseManagerViewSet
        )

        test_data = BaseManagerChoiceTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        url = reverse("info.model_info_choices-list", args=("store", "customer", "carts"))

        counts = {}
        for row_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = _make_carts(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = api_client.get(url, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {result["value"]: result["label"] for result in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"field choices query count grows with row count: {counts}"
    finally:
        info.registration.get_empty_registry()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("serializer_class", "viewset_class", "url_args"),
    [
        pytest.param(
            store_serializers.CartItemCartBaseManagerSerializer,
            store_viewsets.CartItemCartBaseManagerViewSet,
            ("store", "cartitem", "cart"),
            id="plain_queryset_branch",
        ),
        pytest.param(
            store_serializers.CartItemCartSlugBaseManagerSerializer,
            store_viewsets.CartItemCartSlugBaseManagerViewSet,
            ("store", "cartitem", "cart"),
            id="slug_field_branch",
        ),
        pytest.param(
            store_serializers.CustomerCartsBaseManagerSerializer,
            store_viewsets.CustomerCartsBaseManagerViewSet,
            ("store", "customer", "carts"),
            id="child_relation_branch",
        ),
    ],
)
def test_field_choices_from_get_formatted_name_are_sorted_by_label(
    api_client, serializer_class, viewset_class, url_args
):
    """Choices whose labels come from ``get_formatted_name()`` are sorted by label, as the
    ``F()``-annotated branches and the filter-choices endpoint already are. The carts are created in
    reverse label order, so primary-key order and label order disagree."""
    info.registration.get_empty_registry()
    try:
        info.register(serializer_class, viewset_class)

        test_data = BaseManagerChoiceTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        for letter in ("c", "b", "a"):
            user = get_user_model().objects.create(
                email=f"{letter}-cart-owner@domain.invalid", name=f"Cart Owner {letter}", is_active=True
            )
            store_models.Cart.objects.create(customer=store_models.Customer.objects.create(user=user))

        response = api_client.get(reverse("info.model_info_choices-list", args=url_args), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [result["label"] for result in response.data["results"]] == [
            "a-cart-owner@domain.invalid",
            "b-cart-owner@domain.invalid",
            "c-cart-owner@domain.invalid",
        ]
    finally:
        info.registration.get_empty_registry()


class _DistributorSerializerOnlyChoicesSerializer(store_serializers.DistributorSerializer):
    """Declares a choice field and a related field that map to no model field or relation."""

    priority = serializers.ChoiceField(choices=[("low", "Low"), ("high", "High")], write_only=True, required=False)
    related_product = serializers.PrimaryKeyRelatedField(
        queryset=store_models.Product.objects.all(), write_only=True, required=False
    )

    class Meta(store_serializers.DistributorSerializer.Meta):
        fields = [*store_serializers.DistributorSerializer.Meta.fields, "priority", "related_product"]


@pytest.mark.django_db
class TestSerializerOnlyFieldChoicesPermissions:
    """A field with no model field or relation behind it still needs ``read`` on the serializer's
    model, and a related one also needs ``list`` on its queryset's model."""

    @pytest.fixture(autouse=True)
    def registration(self):
        info.registration.get_empty_registry()
        info.register(_DistributorSerializerOnlyChoicesSerializer, store_viewsets.DistributorViewSet)
        yield
        info.registration.get_empty_registry()

    @staticmethod
    def user_with(*codenames):
        user = get_user_model().objects.create_user(
            email=f"choices-{'-'.join(codenames) or 'none'}@domain.invalid", name="Choices User", password="testpass"
        )
        user.user_permissions.add(*Permission.objects.filter(content_type__app_label="store", codename__in=codenames))
        return get_user_model().objects.get(pk=user.pk)

    @staticmethod
    def get(api_client, field):
        return api_client.get(reverse("info.model_info_choices-list", args=("store", "distributor", field)))

    @pytest.mark.parametrize("field", ["priority", "related_product"])
    def test_anonymous_is_refused(self, api_client, field):
        response = self.get(api_client, field)

        assert response.status_code in {HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN}, response_body(response)

    @pytest.mark.parametrize("field", ["priority", "related_product"])
    def test_without_read_on_the_model_is_refused(self, api_client, field):
        api_client.force_authenticate(user=self.user_with("list_product"))

        response = self.get(api_client, field)

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    def test_static_choices_need_only_read(self, api_client):
        api_client.force_authenticate(user=self.user_with("read_distributor"))

        response = self.get(api_client, "priority")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert {result["value"] for result in response.data["results"]} == {"low", "high"}

    def test_related_choices_also_need_list_on_the_related_model(self, api_client):
        api_client.force_authenticate(user=self.user_with("read_distributor"))

        response = self.get(api_client, "related_product")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)

    def test_related_choices_with_read_and_list(self, api_client):
        store_models.Product.objects.create(
            name="Choices Product",
            distributor=store_models.Distributor.objects.create(name="Choices Distributor"),
            order_between=[1, 2],
            tangible_type=store_models.TangibleType.objects.create(name="Choices Type"),
        )
        api_client.force_authenticate(user=self.user_with("read_distributor", "list_product"))

        response = self.get(api_client, "related_product")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert "Choices Product" in {result["label"] for result in response.data["results"]}
