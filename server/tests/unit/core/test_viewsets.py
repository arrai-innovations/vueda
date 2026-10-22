import datetime
import json
from http import HTTPStatus
from typing import ClassVar
from typing import TypedDict
from unittest.mock import patch

import pytest
import rest_flex_fields2.serializers as flex_serializers
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.db.models import Prefetch
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.viewsets import ReadOnlyModelViewSet

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestModelViewSet
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.conftest import use_plain_default_manager
from tests.employee.models import Employee
from tests.employee.models import User
from tests.employee.serializers import EmployeeSerializer
from tests.product.models import Product
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.timesheet import serializers as timesheet_serializers
from tests.timesheet.models import Timesheet
from tests.timesheet.models import TimesheetEntry
from tests.timesheet.viewsets import TimesheetViewSet
from tests.unit.info.utils import create_test_data
from tests.utils import object_revision_of
from vueda import info
from vueda.core.exceptions import VuedaValidationError
from vueda.core.models import FormattedNameManager
from vueda.core.serializers import VuedaListSerializer
from vueda.core.serializers import VuedaSerializer
from vueda.core.serializers import ensure_flex_fields_applied
from vueda.core.utils import implemented_builtin_actions
from vueda.core.viewsets import NoExtraFieldsForViewSetMixin
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.core.viewsets import VuedaViewSet
from vueda.core.viewsets import _filter_new_prefetch_lookups
from vueda.core.viewsets import apply_prefetch_plan
from vueda.core.viewsets import build_prefetch_plan
from vueda.user.serializers import UserSerializer


class StoreTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """
    The store objects the flex-fields viewset tests below retrieve, and the customer who is allowed
    to retrieve them. Only `read` is granted, because every test here is a GET of a single record:
    `ObjectPermissions` maps that to `read_<model>`.
    """

    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("store", "CustomerOrder", "read"),
            ("store", "Product", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        # Needed by create_test_data, which attaches a customer to this user. Nothing
        # authenticates as them, so they need no group of their own.
        "test_customer_2@domain.invalid": {
            "name": "Test Customer 2",
            "password": "testpass",
        },
    }

    def __init__(self):
        create_test_data(self)


def test_vueda_read_only_viewset_excludes_write_actions():
    assert hasattr(VuedaReadOnlyViewSet, "list")
    assert hasattr(VuedaReadOnlyViewSet, "retrieve")
    assert not hasattr(VuedaReadOnlyViewSet, "create")
    assert not hasattr(VuedaReadOnlyViewSet, "update")
    assert not hasattr(VuedaReadOnlyViewSet, "partial_update")
    assert not hasattr(VuedaReadOnlyViewSet, "destroy")


def test_implemented_builtin_actions_of_read_only_viewset():
    assert implemented_builtin_actions(VuedaReadOnlyViewSet) == ("list", "retrieve")
    assert implemented_builtin_actions(store_viewsets.CustomerDataViewSet()) == ("list", "retrieve")


def test_implemented_builtin_actions_of_full_viewset():
    assert implemented_builtin_actions(store_viewsets.DistributorViewSet) == (
        "list",
        "retrieve",
        "create",
        "update",
        "partial_update",
        "destroy",
    )


def test_vueda_viewset_warns_when_combined_with_read_only_viewset():
    with pytest.warns(RuntimeWarning, match="inherits from both VuedaViewSet and ReadOnlyModelViewSet"):

        class InvalidCombinedViewSet(VuedaViewSet, ReadOnlyModelViewSet):
            pass

    assert InvalidCombinedViewSet is not None


def test_filter_new_prefetch_lookups_keeps_a_prefetch_object_over_a_bare_string():
    # The bare string has no queryset, so the plan's Prefetch queryset loads the relation.
    queryset = Timesheet.objects.prefetch_related("timesheet_entries")
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert _filter_new_prefetch_lookups(queryset, plan) == plan


def test_filter_new_prefetch_lookups_drops_a_prefetch_object_that_an_existing_queryset_claims():
    queryset = Timesheet.objects.prefetch_related(
        Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.filter(hours__gt=0))
    )
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert _filter_new_prefetch_lookups(queryset, plan) == []


def test_filter_new_prefetch_lookups_drops_a_prefetch_object_duplicate():
    queryset = Timesheet.objects.prefetch_related(Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all()))
    plan = ["timesheet_entries"]

    assert _filter_new_prefetch_lookups(queryset, plan) == []


def test_filter_new_prefetch_lookups_keeps_a_non_overlapping_lookup():
    queryset = Timesheet.objects.prefetch_related("timesheet_entries")
    other_lookup = Prefetch("events", queryset=Timesheet.pgh_event_model.objects.all())

    assert _filter_new_prefetch_lookups(queryset, [other_lookup]) == [other_lookup]


def test_filter_new_prefetch_lookups_keeps_a_prefetch_object_the_existing_lookup_passes_through():
    # "timesheet_entries__timesheet" registers "timesheet_entries" as a cache key with no queryset
    # while Django walks it one level at a time. The plan's Prefetch queryset loads that level.
    queryset = Timesheet.objects.prefetch_related("timesheet_entries__timesheet")
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert _filter_new_prefetch_lookups(queryset, plan) == plan


def test_filter_new_prefetch_lookups_drops_a_bare_string_the_existing_lookup_passes_through():
    # The cache key is "timesheet_entries", not the whole lookup path.
    queryset = Timesheet.objects.prefetch_related("timesheet_entries__timesheet")

    assert _filter_new_prefetch_lookups(queryset, ["timesheet_entries"]) == []


def test_filter_new_prefetch_lookups_drops_a_second_plan_entry_for_the_same_path():
    # Two plan entries for the same lookup collide with each other exactly as a plan entry and an
    # existing lookup do; the first is kept and the second dropped rather than both reaching
    # queryset.prefetch_related() and raising at evaluation time.
    queryset = Timesheet.objects.all()
    first = Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.filter(hours__gt=0))
    second = Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())

    assert _filter_new_prefetch_lookups(queryset, [first, second]) == [first]


def test_filter_new_prefetch_lookups_keeps_a_plan_entry_the_existing_lookup_renamed_with_to_attr():
    # The existing lookup's cache key is its to_attr ("raw_timesheet_entries"), not its lookup path
    # ("timesheet_entries"), so it does not collide with a plan entry for the same path under the
    # relation's default attribute name.
    queryset = Timesheet.objects.prefetch_related(
        Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all(), to_attr="raw_timesheet_entries")
    )
    plan = [Prefetch("timesheet_entries", queryset=TimesheetEntry.objects.all())]

    assert _filter_new_prefetch_lookups(queryset, plan) == plan


def expanded_serializer(serializer_class, expand):
    """Build ``serializer_class`` with ``expand`` applied, the way a request's ``?e=`` applies it.

    ``build_prefetch_plan`` reads ``serializer.fields``, and an expandable field only becomes a
    nested serializer field once ``rest_flex_fields2`` has processed the request, so an unexpanded
    serializer yields an empty plan rather than the one under test.
    """
    request = Request(APIRequestFactory().get("/", {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: expand}))
    serializer = serializer_class(context={"request": request})
    ensure_flex_fields_applied(serializer)

    return serializer


def find_prefetch_for_or_fail(prefetch_related, lookup):
    """Return the ``Prefetch`` in ``prefetch_related`` for ``lookup``, failing the test when there is none."""
    for entry in prefetch_related:
        if isinstance(entry, Prefetch) and entry.prefetch_through == lookup:
            return entry

    raise AssertionError(f"no Prefetch for {lookup!r} in {prefetch_related!r}")


def test_build_prefetch_plan_annotates_formatted_name_on_a_to_many_prefetch_queryset():
    # OrderItem resolves formatted_name through formatted_name_lookup_expression and stores no
    # column of its own, so the Prefetch queryset the plan builds has to carry the annotation.
    # Without it VuedaListSerializer.to_representation re-annotates the queryset serving the
    # prefetched relation, which clones it, drops the cached prefetch result, and costs one query
    # per row. The rendered formatted_name stays correct either way, because _get_formatted_name
    # resolves it per instance when the annotation is missing, so the value proves nothing here and
    # the annotation's presence is what this asserts.
    serializer = expanded_serializer(store_serializers.CustomerOrderSerializer, "order_items")

    _, prefetch_related = build_prefetch_plan(serializer, store_models.CustomerOrder)

    annotations = find_prefetch_for_or_fail(prefetch_related, "order_items").queryset.query.annotations

    assert "formatted_name" in annotations


def test_build_prefetch_plan_leaves_a_stored_formatted_name_unannotated():
    # TimesheetEntry.formatted_name is a stored GeneratedField, so the plan must leave it alone.
    # Annotating every to-many prefetch unconditionally would satisfy the test above while shadowing
    # a real column here, which is the case annotate_formatted_name's lookup-expression check exists
    # to skip.
    serializer = expanded_serializer(timesheet_serializers.TimesheetWithAliasedEntriesSerializer, "entries")

    _, prefetch_related = build_prefetch_plan(serializer, Timesheet)

    annotations = find_prefetch_for_or_fail(prefetch_related, "timesheet_entries").queryset.query.annotations

    assert "formatted_name" not in annotations


def test_build_prefetch_plan_applies_select_related_for_a_get_formatted_name_to_many_prefetch_queryset(monkeypatch):
    # Cart resolves formatted_name through get_formatted_name() (self.customer.user.email) and
    # declares formatted_name_select_related = ("customer__user",). The plan's Prefetch queryset has
    # to select_related it, or resolving formatted_name for a prefetched cart costs two extra queries
    # per row (customer, then user) instead of one join in the list query. Cart has no
    # formatted_name_lookup_expression, so it is not the annotation the two tests above cover.
    #
    # build_prefetch_plan builds that queryset from `related_model._default_manager`, which is
    # Cart.objects (FormattedNameManager) unless patched -- and that manager already applies
    # formatted_name_select_related to every queryset it builds, which would make the assertion
    # below pass whether or not build_prefetch_plan's own annotate_formatted_name call did anything.
    # use_plain_default_manager stands a plain manager in its place, so a queryset built from
    # `_default_manager` carries no select_related to begin with.
    use_plain_default_manager(store_models.Cart, monkeypatch)

    serializer = expanded_serializer(store_serializers.CustomerWithCartsSerializer, "cart_set")

    _, prefetch_related = build_prefetch_plan(serializer, store_models.Customer)

    select_related = find_prefetch_for_or_fail(prefetch_related, "cart_set").queryset.query.select_related

    assert select_related == {"customer": {"user": {}}}


def test_build_prefetch_plan_joins_formatted_name_select_related_for_a_to_one_expand():
    # Cart resolves formatted_name through get_formatted_name() (self.customer.user.email) and
    # declares formatted_name_select_related = ("customer__user",). A to-one `cart` expand joins
    # those relations too, so resolving each cart's name costs no query per row.
    serializer = expanded_serializer(store_serializers.CartItemSerializer, "cart")

    select_related, _ = build_prefetch_plan(serializer, store_models.CartItem)

    assert select_related == ["cart", "cart__customer__user"]


def test_apply_prefetch_plan_moves_a_join_through_a_planned_prefetch_onto_its_queryset():
    plan_prefetch = Prefetch("cart__customer", queryset=store_models.Customer.objects.all())

    queryset = apply_prefetch_plan(
        store_models.CartItem.objects.all(), ["cart", "cart__customer__user"], [plan_prefetch]
    )

    assert queryset.query.select_related == {"cart": {}}
    prefetch = find_prefetch_for_or_fail(queryset._prefetch_related_lookups, "cart__customer")
    assert prefetch.queryset.query.select_related == {"user": {}}


def test_apply_prefetch_plan_loads_a_join_through_the_querysets_own_prefetch_with_a_string_lookup():
    # Cart's manager joins customer__user. The queryset's own Prefetch for `customer` stays as
    # declared, and `user` loads through a string lookup after it.
    own_prefetch = Prefetch("customer", queryset=store_models.Customer.objects.all())

    queryset = apply_prefetch_plan(store_models.Cart.objects.prefetch_related(own_prefetch), [], [])

    assert not queryset.query.select_related
    assert queryset._prefetch_related_lookups == (own_prefetch, "customer__user")


def test_apply_prefetch_plan_keeps_a_join_alongside_a_to_attr_prefetch():
    # A Prefetch with to_attr stores its rows under its own attribute, so the join on the same
    # relation leaves it unaffected.
    own_prefetch = Prefetch("customer", queryset=store_models.Customer.objects.all(), to_attr="prefetched_customer")

    queryset = apply_prefetch_plan(store_models.Cart.objects.prefetch_related(own_prefetch), [], [])

    assert queryset.query.select_related == {"customer": {"user": {}}}
    assert queryset._prefetch_related_lookups == (own_prefetch,)


def test_apply_prefetch_plan_runs_a_planned_prefetch_before_the_bare_string_that_reuses_it():
    # Django raises ValueError when a lookup with a queryset reaches a level that an earlier lookup
    # already fetched, so the planned Prefetch has to run before the bare string.
    plan_prefetch = Prefetch("customer", queryset=store_models.Customer.objects.all())

    queryset = apply_prefetch_plan(
        store_models.CustomerOrder.objects.prefetch_related("customer__user"), [], [plan_prefetch]
    )

    assert queryset._prefetch_related_lookups == (plan_prefetch, "customer__user")


def test_build_prefetch_plan_joins_the_to_one_relations_before_a_prefetched_to_one_relation():
    # The source "cart.customer" crosses the to-one `cart` before it reaches Customer, whose
    # formatted_name is an annotation. `cart` loads through a join rather than a query of its own.
    serializer = expanded_serializer(store_serializers.CartItemCartCustomerSerializer, "customer")

    select_related, prefetch_related = build_prefetch_plan(serializer, store_models.CartItem)

    assert select_related == ["cart"]
    prefetch = find_prefetch_for_or_fail(prefetch_related, "cart__customer")
    assert prefetch.queryset.query.annotations.keys() >= {"formatted_name"}


class CartFormattedNameSelectRelatedTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


@pytest.fixture
def cart_formatted_name_select_related_data():
    return CartFormattedNameSelectRelatedTestData()


@pytest.mark.django_db
class TestCartFormattedNameSelectRelatedQueryCount:
    """Cart resolves formatted_name through get_formatted_name() (self.customer.user.email) and
    declares formatted_name_select_related = ("customer__user",). annotate_formatted_name applies
    that select_related wherever it applies, so resolving formatted_name for every row costs no
    extra query beyond the request's own, however many rows are returned.

    Covers two of annotate_formatted_name's three bulk call sites: VuedaViewSet.get_queryset (a
    plain Cart list) and the prefetch-plan builder's Prefetch queryset (a to-many `cart_set` expand
    on Customer, which routes list/retrieve through build_prefetch_plan). See
    test_list_serializer_applies_select_related_for_an_unfetched_manager_relation for the third,
    VuedaListSerializer.to_representation's own call, which needs carts fetched independently of
    their customer's own related manager to isolate. The rendered formatted_name is asserted in both
    tests below too, since a flat query count alone wouldn't tell a working select_related apart from
    formatted_name silently resolving to nothing.
    """

    @pytest.fixture(autouse=True)
    def authenticated_client(self, api_client, cart_formatted_name_select_related_data):
        user = cart_formatted_name_select_related_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_list_query_count_does_not_grow_with_row_count(self, authenticated_client, settings):
        """VuedaViewSet.get_queryset's own annotate_formatted_name call."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_formatted_name_select_related"

        counts = {}
        for row_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = {}
            for i in range(row_count):
                user = get_user_model().objects.create(
                    email=f"cart-owner-{row_count}-{i}@domain.invalid", name=f"Cart Owner {i}", is_active=True
                )
                customer = store_models.Customer.objects.create(user=user)
                cart = store_models.Cart.objects.create(customer=customer)
                expected[cart.pk] = user.email

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.cart-list"), format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            actual = {row["id"]: row["formatted_name"] for row in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"Cart list query count grows with row count: {counts}"

    def test_list_with_to_many_expand_query_count_does_not_grow_with_row_count(
        self, authenticated_client, settings, monkeypatch
    ):
        """The prefetch-plan builder's Prefetch queryset (vueda.core.viewsets.build_prefetch_plan).

        Cart's own default manager (FormattedNameManager) already applies
        formatted_name_select_related to every queryset it builds, including the one
        build_prefetch_plan reads through `related_model._default_manager` to build the Prefetch
        queryset -- so leaving it in place would make this pass whether or not build_prefetch_plan's
        own annotate_formatted_name call did anything. use_plain_default_manager stands a plain
        manager in its place for the duration of this test.
        """
        use_plain_default_manager(store_models.Cart, monkeypatch)
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_with_carts"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "cart_set"}

        counts = {}
        for customer_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = {}
            for i in range(customer_count):
                user = get_user_model().objects.create(
                    email=f"cart-owner-{customer_count}-{i}@domain.invalid", name=f"Cart Owner {i}", is_active=True
                )
                customer = store_models.Customer.objects.create(user=user)
                store_models.Cart.objects.create(customer=customer)
                expected[customer.pk] = user.email

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.customer-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == customer_count
            actual = {row["id"]: row["cart_set"][0]["formatted_name"] for row in response.data["results"]}
            assert actual == expected
            counts[customer_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to-many expand query count grows with row count: {counts}"


@pytest.mark.django_db
def test_list_serializer_applies_select_related_for_an_unfetched_manager_relation():
    """VuedaListSerializer.to_representation's own annotate_formatted_name call.

    A freshly saved instance's to-many expand reaches its relation through a plain, unfetched
    manager -- the response of a PATCH/PUT that expands a to-many relation, which never runs
    get_queryset's prefetch plan (that only applies to list/retrieve) -- the "arrives as its
    manager" case documented on VuedaListSerializer.

    Each cart below belongs to its own customer/user pair rather than a single shared customer's own
    `cart_set`: Django's reverse-FK related manager sets the very same parent instance it was built
    from onto every fetched row's forward accessor, which would make a shared-customer scenario look
    query-flat regardless of formatted_name_select_related, since every row's `.customer` (and so
    `.customer.user`) would already be the one Python object already in memory. Feeding a plain
    queryset straight to the list serializer, as done here, keeps that Django optimization out of the
    picture.

    The queryset itself is built from `Cart._base_manager` rather than `Cart.objects`
    (`FormattedNameManager`), which already applies `formatted_name_select_related` to every queryset
    it builds; using it here would make a flat query count pass whether or not
    `VuedaListSerializer.to_representation`'s own call did anything. `_base_manager` is a plain
    `models.Manager` Django provides for every model, so a queryset built from it carries no
    `select_related` of its own to begin with, and a flat count here can only be
    `to_representation`'s own doing.
    """

    class _CartFormattedNameSerializer(VuedaSerializer):
        formatted_name = serializers.SerializerMethodField()

        class Meta(VuedaSerializer.Meta):
            model = store_models.Cart
            fields = ["id", "customer", "formatted_name", "object_revision"]

    list_serializer = VuedaListSerializer(child=_CartFormattedNameSerializer())

    counts = {}
    for row_count in (2, 10):
        store_models.Cart.objects.all().delete()
        store_models.Customer.objects.all().delete()
        expected = {}
        cart_ids = []
        for i in range(row_count):
            user = get_user_model().objects.create(
                email=f"cart-owner-{row_count}-{i}@domain.invalid", name=f"Cart Owner {i}", is_active=True
            )
            customer = store_models.Customer.objects.create(user=user)
            cart = store_models.Cart.objects.create(customer=customer)
            cart_ids.append(cart.pk)
            expected[cart.pk] = user.email

        queryset = store_models.Cart._base_manager.filter(pk__in=cart_ids)

        with CaptureQueriesContext(connection) as captured:
            data = list_serializer.to_representation(queryset)

        assert {row["id"]: row["formatted_name"] for row in data} == expected
        counts[row_count] = len(captured)

    assert len(set(counts.values())) == 1, f"list serializer query count grows with row count: {counts}"


@pytest.mark.django_db
class TestToOneExpandAnnotatedFormattedName:
    """A to-one expand onto Customer, whose `formatted_name` is the annotation that its
    `formatted_name_lookup_expression` ("data__formatted_name") produces. The customer's name is its
    user's email, through the `customer_data` view.

    A join cannot carry an annotation for the joined model, so build_prefetch_plan loads the relation
    through a Prefetch queryset that annotates it. The tests render the expanded `formatted_name` on
    list and retrieve requests, under nested expands, and next to the viewset's own prefetches. Most
    of them also check that the query count holds flat as the row count grows. The tests that read
    Cart's name, which comes from get_formatted_name(), check that the relations that the method
    reads load through a join.
    """

    @pytest.fixture(autouse=True)
    def authenticated_client(self, api_client, cart_formatted_name_select_related_data):
        user = cart_formatted_name_select_related_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @staticmethod
    def create_customer(email):
        user = get_user_model().objects.create(email=email, name="Customer", is_active=True)
        return store_models.Customer.objects.create(user=user)

    def create_orders(self, row_count):
        """Replace every CustomerOrder with `row_count` orders, each for its own customer. Returns
        each order's customer email, keyed by the order's primary key."""
        store_models.CustomerOrder.objects.all().delete()
        store_models.Customer.objects.all().delete()
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        expected = {}
        for i in range(row_count):
            email = f"order-customer-{row_count}-{i}@domain.invalid"
            order = store_models.CustomerOrder.objects.create(
                order_number=i + 1,
                customer=self.create_customer(email),
                order_state=order_state,
            )
            expected[order.pk] = email
        return expected

    def create_cart_items(self, row_count):
        """Replace every CartItem with `row_count` items, each in its own cart for its own customer.
        Returns each item's customer email, keyed by the item's primary key."""
        store_models.CartItem.objects.all().delete()
        store_models.Cart.objects.all().delete()
        store_models.Customer.objects.all().delete()
        distributor = store_models.Distributor.objects.create(name=f"Distributor {row_count}", description="")
        tangible_type, _ = store_models.TangibleType.objects.get_or_create(
            code="to-one-expand", defaults={"name": "To-one expand"}
        )
        product = store_models.Product.objects.create(
            distributor=distributor, name="Product", tangible_type=tangible_type, order_between=(1, 10)
        )
        product_option = store_models.ProductOption.objects.create(
            product=product, name="Option", sku=f"sku-{row_count}", gtin=f"gtin-{row_count}"
        )
        expected = {}
        for i in range(row_count):
            email = f"cart-item-customer-{row_count}-{i}@domain.invalid"
            cart = store_models.Cart.objects.create(customer=self.create_customer(email))
            item = store_models.CartItem.objects.create(cart=cart, product_option=product_option, quantity=1)
            expected[item.pk] = email
        return expected

    def test_list_returns_expanded_formatted_name(self, authenticated_client, settings):
        """No other path on the CustomerOrder queryset joins `customer`."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_order_annotated_customer"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "customer"}

        counts = {}
        for row_count in (2, 10):
            expected = self.create_orders(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.customerorder-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {row["id"]: row["customer"]["formatted_name"] for row in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to-one expand query count grows with row count: {counts}"

    def test_list_returns_expanded_formatted_name_when_queryset_joins_the_relation(
        self, authenticated_client, settings
    ):
        """Cart's `formatted_name_select_related` joins `customer__user` onto the Cart queryset, so
        the queryset caches `customer` before the Prefetch for `customer` runs."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_annotated_customer"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "customer"}

        counts = {}
        for row_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = {}
            for i in range(row_count):
                email = f"cart-customer-{row_count}-{i}@domain.invalid"
                cart = store_models.Cart.objects.create(customer=self.create_customer(email))
                expected[cart.pk] = email

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.cart-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {row["id"]: row["customer"]["formatted_name"] for row in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to-one expand query count grows with row count: {counts}"

    def test_list_returns_expanded_formatted_name_under_a_to_many_expand(self, authenticated_client, settings):
        """The `cart_set` Prefetch queryset comes from Cart's manager, which joins `customer__user`,
        and `cart_set.customer` prefetches `customer` on that same queryset."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_with_annotated_carts"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "cart_set,cart_set.customer"}

        counts = {}
        for row_count in (2, 10):
            store_models.Cart.objects.all().delete()
            store_models.Customer.objects.all().delete()
            expected = {}
            for i in range(row_count):
                email = f"carts-customer-{row_count}-{i}@domain.invalid"
                customer = self.create_customer(email)
                store_models.Cart.objects.create(customer=customer)
                expected[customer.pk] = email

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.customer-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {row["id"]: row["cart_set"][0]["customer"]["formatted_name"] for row in response.data["results"]}
            assert actual == expected
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested to-one expand query count grows with row count: {counts}"

    def test_list_returns_a_nested_expand_under_the_expanded_relation(self, authenticated_client, settings):
        """`customer.user` loads through a join on the `customer` Prefetch queryset."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_order_annotated_customer"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "customer,customer.user"}

        counts = {}
        for row_count in (2, 10):
            expected = self.create_orders(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.customerorder-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {
                row["id"]: (row["customer"]["formatted_name"], row["customer"]["user"]["email"])
                for row in response.data["results"]
            }
            assert actual == {pk: (email, email) for pk, email in expected.items()}
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested expand query count grows with row count: {counts}"

    def test_retrieve_returns_expanded_formatted_name(self, authenticated_client, settings):
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_order_annotated_customer"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "customer"}
        ((order_pk, email),) = self.create_orders(1).items()

        response = authenticated_client.get(
            reverse("store.customerorder-detail", args=[order_pk]), data=query, format="json"
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["customer"]["formatted_name"] == email

    def test_list_returns_a_customer_that_the_default_manager_hides(self, authenticated_client, settings, monkeypatch):
        """Django loads a related object through the base manager, so a default manager that filters
        rows leaves the expanded customer in the response."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_order_annotated_customer"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "customer"}
        expected = self.create_orders(2)
        hidden_customer_pk = store_models.CustomerOrder.objects.get(pk=next(iter(expected))).customer_id

        class HidingManager(FormattedNameManager):
            def get_queryset(self):
                return super().get_queryset().exclude(pk=hidden_customer_pk)

        hiding_manager = HidingManager()
        hiding_manager.name = "objects"
        hiding_manager.model = store_models.Customer
        monkeypatch.setitem(store_models.Customer._meta.__dict__, "default_manager", hiding_manager)

        response = authenticated_client.get(reverse("store.customerorder-list"), data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        actual = {row["id"]: (row["customer"] or {}).get("formatted_name") for row in response.data["results"]}
        assert actual == expected

    @pytest.mark.parametrize("own_lookup", ["customer", "customer__user"])
    def test_a_bare_string_prefetch_loads_through_the_plans_prefetch(self, own_lookup):
        """A viewset's own string lookup has no queryset to annotate `formatted_name`, so the plan's
        Prefetch loads `customer`, and the string lookup reuses its rows."""
        expected = self.create_orders(2)
        serializer = expanded_serializer(store_serializers.CustomerOrderAnnotatedCustomerSerializer, "customer")
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.CustomerOrder)

        queryset = apply_prefetch_plan(
            store_models.CustomerOrder.objects.prefetch_related(own_lookup), select_related, prefetch_related
        )

        assert {order.pk: order.customer.formatted_name for order in queryset} == expected

    def test_nested_expand_loads_after_the_viewsets_own_prefetch(self):
        """A viewset's own Prefetch for `customer` replaces the plan's Prefetch. The nested
        `customer.user` expand loads after the viewset's Prefetch, at one query for the request
        rather than one query per row."""
        serializer = expanded_serializer(
            store_serializers.CustomerOrderAnnotatedCustomerSerializer, "customer,customer.user"
        )
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.CustomerOrder)
        own_prefetch = Prefetch("customer", queryset=store_models.Customer.objects.all())

        counts = {}
        for row_count in (2, 10):
            expected = self.create_orders(row_count)
            queryset = apply_prefetch_plan(
                store_models.CustomerOrder.objects.prefetch_related(own_prefetch), select_related, prefetch_related
            )

            with CaptureQueriesContext(connection) as captured:
                actual = {order.pk: (order.customer.formatted_name, order.customer.user.email) for order in queryset}

            assert actual == {pk: (email, email) for pk, email in expected.items()}
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested expand query count grows with row count: {counts}"

    @pytest.mark.parametrize("own_prefetch", [False, True])
    def test_to_many_expand_under_the_expanded_relation(self, own_prefetch):
        """`customer.cart_set` loads through a Prefetch that runs after the one that loads `customer`,
        whether the plan's Prefetch or a viewset's own Prefetch loads `customer`."""
        serializer = expanded_serializer(
            store_serializers.CustomerOrderAnnotatedCustomerCartsSerializer, "customer,customer.cart_set"
        )
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.CustomerOrder)
        viewset_queryset = store_models.CustomerOrder.objects.all()
        if own_prefetch:
            viewset_queryset = viewset_queryset.prefetch_related(
                Prefetch("customer", queryset=store_models.Customer.objects.all())
            )

        counts = {}
        for row_count in (2, 10):
            store_models.CartItem.objects.all().delete()
            store_models.Cart.objects.all().delete()
            expected = self.create_orders(row_count)
            for order in store_models.CustomerOrder.objects.all():
                store_models.Cart.objects.create(customer_id=order.customer_id)
            queryset = apply_prefetch_plan(viewset_queryset.all(), select_related, prefetch_related)

            with CaptureQueriesContext(connection) as captured:
                actual = {
                    order.pk: (order.customer.formatted_name, len(order.customer.cart_set.all())) for order in queryset
                }

            assert actual == {pk: (email, 1) for pk, email in expected.items()}
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested to-many expand query count grows with row count: {counts}"

    def test_join_through_a_plain_prefetch_stays_a_join(self):
        """Cart's manager joins `customer__user`. A plain `prefetch_related("customer")` loads the same
        objects that the join loads, so the join stays, and the Cart query alone resolves every
        cart's get_formatted_name()."""
        store_models.CartItem.objects.all().delete()
        store_models.Cart.objects.all().delete()
        store_models.Customer.objects.all().delete()
        expected = {}
        for i in range(3):
            email = f"plain-prefetch-customer-{i}@domain.invalid"
            cart = store_models.Cart.objects.create(customer=self.create_customer(email))
            expected[cart.pk] = email
        queryset = apply_prefetch_plan(store_models.Cart.objects.prefetch_related("customer"), [], [])

        with CaptureQueriesContext(connection) as captured:
            actual = {cart.pk: cart.get_formatted_name() for cart in queryset}

        assert actual == expected
        assert len(captured) == 1, [query["sql"] for query in captured]

    def test_to_one_source_through_a_to_one_relation_joins_the_first_relation(self):
        """The source "cart.customer" crosses `cart` first. `cart` loads through the join on the
        CartItem query, and only the customers cost a query of their own."""
        expected = self.create_cart_items(3)
        serializer = expanded_serializer(store_serializers.CartItemCartCustomerSerializer, "customer")
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.CartItem)
        queryset = apply_prefetch_plan(store_models.CartItem.objects.all(), select_related, prefetch_related)

        cart_item_query_and_customer_query = 2

        with CaptureQueriesContext(connection) as captured:
            actual = {item.pk: item.cart.customer.formatted_name for item in queryset}

        assert actual == expected
        assert len(captured) == cart_item_query_and_customer_query, [query["sql"] for query in captured]

    def test_to_one_join_resolves_get_formatted_name_without_a_query_per_row(self):
        """Cart stores no `formatted_name` annotation, so a `cart` expand joins `cart`, together with
        the `customer__user` path that Cart's `formatted_name_select_related` declares for its
        get_formatted_name()."""
        expected = self.create_cart_items(3)
        serializer = expanded_serializer(store_serializers.CartItemSerializer, "cart")
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.CartItem)
        queryset = apply_prefetch_plan(store_models.CartItem.objects.all(), select_related, prefetch_related)

        with CaptureQueriesContext(connection) as captured:
            actual = {item.pk: item.cart.get_formatted_name() for item in queryset}

        assert actual == expected
        assert len(captured) == 1, [query["sql"] for query in captured]


@pytest.mark.django_db
def test_to_one_expand_keeps_the_viewsets_own_prefetch(api_client, cart_formatted_name_select_related_data, settings):
    """A viewset that prefetches a to-one relation with an annotated queryset of its own keeps that
    annotation when a request expands the relation. OrderState stores `formatted_name` as a column,
    so the plan for an `order_state` expand is a `select_related` join, and no `formatted_name`
    annotation is involved."""
    user = cart_formatted_name_select_related_data.users["test_super_user@domain.invalid"]
    api_client.force_authenticate(user=user)
    settings.ROOT_URLCONF = "tests.unit.core.urls_customer_order_prefetched_order_state"
    query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "order_state"}

    user = get_user_model().objects.create(email="order-state-customer@domain.invalid", name="Customer", is_active=True)
    customer = store_models.Customer.objects.create(user=user)
    expected = {}
    for code in ("prefetch-new", "prefetch-shipped"):
        order_state = store_models.OrderState.objects.create(code=code, name=code)
        order = store_models.CustomerOrder.objects.create(
            order_number=len(expected) + 1, customer=customer, order_state=order_state
        )
        expected[order.pk] = code.upper()

    viewset_queryset = store_viewsets.CustomerOrderPrefetchedOrderStateViewSet.queryset.all()
    assert {order.pk: order.order_state.code_upper for order in viewset_queryset} == expected

    response = api_client.get(reverse("store.customerorder-list"), data=query, format="json")

    assert response.status_code == HTTPStatus.OK, response_body(response)
    actual = {row["id"]: row["order_state"].get("code_upper") for row in response.data["results"]}
    assert actual == expected


def test_apply_prefetch_plan_splits_the_joins_inside_the_querysets_own_prefetch():
    # Cart's manager joins customer__user. The plan prefetches `customer` under the queryset's own
    # `cart_set` Prefetch, so the join is split at `customer`. The own Prefetch keeps its filter and
    # ordering.
    own_queryset = store_models.Cart.objects.filter(reserved_until=None).order_by("-pk")
    plan_prefetch = Prefetch("cart_set__customer", queryset=store_models.Customer._base_manager.all())

    queryset = apply_prefetch_plan(
        store_models.Customer.objects.prefetch_related(Prefetch("cart_set", queryset=own_queryset)), [], [plan_prefetch]
    )

    cart_prefetch = find_prefetch_for_or_fail(queryset._prefetch_related_lookups, "cart_set")
    assert not cart_prefetch.queryset.query.select_related
    assert str(cart_prefetch.queryset.query.where) == str(own_queryset.query.where)
    assert cart_prefetch.queryset.query.order_by == own_queryset.query.order_by
    customer_prefetch = find_prefetch_for_or_fail(queryset._prefetch_related_lookups, "cart_set__customer")
    assert customer_prefetch.queryset.query.select_related == {"user": {}}


@pytest.mark.django_db
class TestNestedExpandUnderAnotherPrefetch:
    """The expands nested under a relation keep their plan when another Prefetch loads the relation:
    the viewset's own Prefetch, for a to-one or a to-many relation, or the Prefetch of a second
    expand of the same to-many relation.

    Each cart holds items with quantities 2, 1, and 0, each on its own product option, so loading a
    product option per item costs one query per item. CartPrefetchedItemsViewSet's own Prefetch
    keeps the items with a positive quantity, orders them by descending quantity, and annotates
    `quantity_doubled`.
    """

    @pytest.fixture(autouse=True)
    def authenticated_client(self, api_client, cart_formatted_name_select_related_data):
        user = cart_formatted_name_select_related_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @staticmethod
    def create_carts(cart_count):
        """Replace every Cart with `cart_count` carts, each for its own customer.

        Returns `{cart_pk: (email, items)}`. `email` is the customer's email, and `items` lists each
        item as `(item_pk, quantity, product option name)`, by descending quantity.
        """
        store_models.CartItem.objects.all().delete()
        store_models.Cart.objects.all().delete()
        store_models.Customer.objects.all().delete()
        distributor = store_models.Distributor.objects.create(name=f"Distributor {cart_count}", description="")
        tangible_type, _ = store_models.TangibleType.objects.get_or_create(
            code="nested-plan", defaults={"name": "Nested plan"}
        )
        product = store_models.Product.objects.create(
            distributor=distributor, name="Product", tangible_type=tangible_type, order_between=(1, 10)
        )
        carts = {}
        for i in range(cart_count):
            email = f"nested-plan-customer-{cart_count}-{i}@domain.invalid"
            user = get_user_model().objects.create(email=email, name="Customer", is_active=True)
            cart = store_models.Cart.objects.create(customer=store_models.Customer.objects.create(user=user))
            items = []
            for quantity in (2, 1, 0):
                name = f"option-{cart_count}-{i}-{quantity}"
                product_option = store_models.ProductOption.objects.create(
                    product=product, name=name, sku=name, gtin=name
                )
                item = store_models.CartItem.objects.create(cart=cart, product_option=product_option, quantity=quantity)
                items.append((item.pk, quantity, name))
            carts[cart.pk] = (email, items)
        return carts

    def test_nested_expand_loads_after_the_viewsets_prefetch(self, authenticated_client, settings):
        """The viewset's own Prefetch loads `cart_items` with its filter, ordering, and annotation.
        `cart_items.product_option` loads after it, at one query for the request."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_prefetched_items"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "cart_items,cart_items.product_option"}

        counts = {}
        for cart_count in (2, 10):
            carts = self.create_carts(cart_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.cart-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {
                row["id"]: [
                    (item["id"], item["quantity"], item["quantity_doubled"], item["product_option"]["name"])
                    for item in row["cart_items"]
                ]
                for row in response.data["results"]
            }
            assert actual == {
                pk: [(item_pk, quantity, quantity * 2, name) for item_pk, quantity, name in items if quantity > 0]
                for pk, (_email, items) in carts.items()
            }
            counts[cart_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested expand query count grows with row count: {counts}"

    @pytest.mark.parametrize(
        ("urlconf", "viewset_prefetch"),
        [
            ("tests.unit.core.urls_cart_with_aliased_items", False),
            ("tests.unit.core.urls_cart_prefetched_items", True),
        ],
    )
    @pytest.mark.parametrize("nested_name", ["items", "cart_items"])
    def test_both_names_of_one_relation_render_their_nested_expands(
        self, authenticated_client, settings, urlconf, viewset_prefetch, nested_name
    ):
        """`cart_items` and `items` both expand the reverse `cart_items`, and only `nested_name`
        expands `product_option`. One Prefetch loads the relation for both names, the expand's own or
        the viewset's, and `product_option` loads after it.

        The order of the two names in the serializer's fields follows string hashing, because
        rest_flex_fields2 intersects the expand names with the permit list as sets. Running the test
        with each name as the nested one covers both orders under every hash seed."""
        settings.ROOT_URLCONF = urlconf
        plain_name = "cart_items" if nested_name == "items" else "items"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: f"{plain_name},{nested_name},{nested_name}.product_option"}

        counts = {}
        for cart_count in (2, 10):
            carts = self.create_carts(cart_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.cart-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {
                row["id"]: (
                    sorted(item["id"] for item in row[plain_name]),
                    sorted((item["id"], item["product_option"]["name"]) for item in row[nested_name]),
                )
                for row in response.data["results"]
            }
            expected = {}
            for pk, (_email, items) in carts.items():
                loaded = [(item_pk, name) for item_pk, quantity, name in items if quantity > 0 or not viewset_prefetch]
                expected[pk] = (sorted(item_pk for item_pk, _name in loaded), sorted(loaded))
            assert actual == expected
            counts[cart_count] = len(captured)

        assert len(set(counts.values())) == 1, f"aliased expand query count grows with row count: {counts}"

    def test_nested_formatted_name_under_the_viewsets_to_many_prefetch(self, authenticated_client, settings):
        """The viewset's own `cart_set` Prefetch comes from Cart's manager, which joins
        `customer__user`. The join is split at `customer`, so the expand's own prefetch loads each
        cart's `customer` with its `formatted_name` annotation."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_customer_prefetched_annotated_carts"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "cart_set,cart_set.customer"}

        counts = {}
        for cart_count in (2, 10):
            carts = self.create_carts(cart_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.customer-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {
                cart["id"]: cart["customer"]["formatted_name"]
                for row in response.data["results"]
                for cart in row["cart_set"]
            }
            assert actual == {pk: email for pk, (email, _items) in carts.items()}
            counts[cart_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested to-one expand query count grows with row count: {counts}"

    def test_nested_formatted_name_under_the_viewsets_to_one_prefetch(self, authenticated_client, settings):
        """The viewset's own Prefetch for the to-one `cart` comes from Cart's manager, which joins
        `customer__user`. The join is split at `customer`, so the expand's own prefetch loads each
        cart's `customer` with its `formatted_name` annotation."""
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_item_prefetched_annotated_cart"
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "cart,cart.customer"}

        counts = {}
        for cart_count in (2, 10):
            carts = self.create_carts(cart_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(reverse("store.cartitem-list"), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            actual = {
                row["id"]: (row["cart"]["id"], row["cart"]["customer"]["formatted_name"])
                for row in response.data["results"]
            }
            assert actual == {
                item_pk: (pk, email) for pk, (email, items) in carts.items() for item_pk, _quantity, _name in items
            }
            counts[cart_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested to-one expand query count grows with row count: {counts}"

    @pytest.mark.parametrize("own_path", ["cart_set", "cart_set__cart_items"])
    def test_nested_expand_under_a_viewset_prefetch_at_depth(self, own_path):
        """The viewset's own Prefetch loads `cart_set`, or `cart_set__cart_items` one level down
        under the expand's own `cart_set` Prefetch. `cart_set.cart_items.product_option` loads after
        whichever Prefetch loads the items."""
        serializer = expanded_serializer(
            store_serializers.CustomerWithAliasedItemCartsSerializer,
            "cart_set,cart_set.cart_items,cart_set.cart_items.product_option",
        )
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.Customer)
        own_querysets = {
            "cart_set": store_models.Cart.objects.all(),
            "cart_set__cart_items": store_models.CartItem.objects.filter(quantity__gt=0),
        }
        viewset_queryset = store_models.Customer.objects.prefetch_related(
            Prefetch(own_path, queryset=own_querysets[own_path])
        )
        keeps_every_item = own_path == "cart_set"

        counts = {}
        for cart_count in (2, 10):
            carts = self.create_carts(cart_count)
            queryset = apply_prefetch_plan(viewset_queryset.all(), select_related, prefetch_related)

            with CaptureQueriesContext(connection) as captured:
                actual = {
                    cart.pk: sorted((item.pk, item.product_option.name) for item in cart.cart_items.all())
                    for customer in queryset
                    for cart in customer.cart_set.all()
                }

            assert actual == {
                pk: sorted((item_pk, name) for item_pk, quantity, name in items if quantity > 0 or keeps_every_item)
                for pk, (_email, items) in carts.items()
            }
            counts[cart_count] = len(captured)

        assert len(set(counts.values())) == 1, f"nested expand query count grows with row count: {counts}"

    @pytest.mark.parametrize("own_lookups", [(), ("cart_items",)])
    def test_nested_expand_without_a_viewset_prefetch_queryset(self, own_lookups):
        """With no Prefetch queryset of the viewset's own, the expand's own Prefetch loads
        `cart_items` with `product_option` joined onto it. A plain `prefetch_related("cart_items")`
        reuses those rows, so the request costs the cart query and the item query alone."""
        serializer = expanded_serializer(
            store_serializers.CartWithAliasedItemsSerializer, "cart_items,cart_items.product_option"
        )
        select_related, prefetch_related = build_prefetch_plan(serializer, store_models.Cart)
        carts = self.create_carts(3)
        queryset = apply_prefetch_plan(
            store_models.Cart.objects.prefetch_related(*own_lookups), select_related, prefetch_related
        )

        cart_query_and_item_query = 2

        with CaptureQueriesContext(connection) as captured:
            actual = {
                cart.pk: sorted((item.pk, item.product_option.name) for item in cart.cart_items.all())
                for cart in queryset
            }

        assert actual == {
            pk: sorted((item_pk, name) for item_pk, _quantity, name in items) for pk, (_email, items) in carts.items()
        }
        assert len(captured) == cart_query_and_item_query, [query["sql"] for query in captured]


@pytest.mark.django_db
class TestProductViewSet(BaseTestModelViewSet):
    model = Product
    has_delete_permission = False

    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "Product", "read"),
            ("product", "Product", "list"),
            ("product", "Product", "create"),
            ("product", "Product", "update"),
            ("product", "Product", "manage"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }

    list_keys_arguments = {
        "name",
        "available_for_sale",
        "buzz_words",
    }

    page_data_arguments = (
        {
            "name": "Apple",
            "formatted_name": "Apple",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Local"),
        },
        {
            "name": "Banana",
            "formatted_name": "Banana",
            "available_for_sale": False,
            "buzz_words": ("Hand-held", "Tropical"),
        },
        {
            "name": "Mango",
            "formatted_name": "Mango",
            "available_for_sale": True,
            "buzz_words": ("Organic", "Tasty", "Tropical"),
        },
        {
            "name": "Orange",
            "formatted_name": "Orange",
            "available_for_sale": False,
            "buzz_words": ("Organic", "Citrus", "Tangy", "Local"),
        },
    )

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def list_querystring(self, page_data):
        ids = tuple(page_data.filter(name__in=("Apple", "Banana", "Mango")).values_list("pk", flat=True))
        return {"id": ids}

    @pytest.fixture
    def update_arguments(self, page_data):
        instance = page_data.first()
        return {
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local", "Fresh"],
            "object_revision": object_revision_of(instance),
            "id": instance.id,
            "name": "Apple",
        }

    @pytest.fixture
    def create_arguments(self):
        return {
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local"],
            "name": "Apple",
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "available_for_sale": True,
            "buzz_words": ["Organic", "Local"],
            "object_revision": object_revision_of(instance),
            "formatted_name": "Apple",
            "id": instance.id,
            "name": "Apple",
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)
        expected_create_response["formatted_name"] = expected_create_response["name"]

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)
        expected_retrieve_response["formatted_name"] = expected_retrieve_response["name"]

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)
        expected_update_response["formatted_name"] = expected_update_response["name"]

    def test_list_with_invalid_filter_returns_400(self, page_data, authenticated_client, list_querystring):
        list_querystring["nonexistent_filter"] = "value"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "nonexistent_filter" in response.data
        assert any("Invalid query parameter" in str(msg) for msg in response.data["nonexistent_filter"]), (
            f"nonexistent_filter data: {response.data['nonexistent_filter']}"
        )

    def test_list_with_multiple_invalid_filters_returns_all(self, page_data, authenticated_client, list_querystring):
        list_querystring["bad_one"] = "x"
        list_querystring["bad_two"] = "y"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "bad_one" in response.data
        assert "bad_two" in response.data

    def test_list_with_valid_filter_succeeds(self, page_data, authenticated_client, list_querystring):
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)

    def test_list_with_invalid_expands(self, page_data, authenticated_client, list_querystring):
        list_querystring[settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]] = "supervisor"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "supervisor" in response.data
        assert len(response.data["supervisor"]) == 1, f"supervisor data: {response.data['supervisor']}"
        assert response.data["supervisor"][0] == "Invalid expands. No expands are permitted.", (
            f"supervisor message: {response.data['supervisor'][0]}"
        )

    def test_bulk_destroy_without_delete_permission(self, page_data, authenticated_client):
        pks = list(page_data.values_list("pk", flat=True))

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
        assert self.model.objects.filter(pk__in=pks).count() == len(pks)

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client):
        instance = page_data.first()
        detail_querystring = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "second_history_entry"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "second_history_entry" in response.data
        assert len(response.data["second_history_entry"]) == 1, (
            f"second_history_entry data: {response.data['second_history_entry']}"
        )
        assert response.data["second_history_entry"][0] == "Invalid expands. No expands are permitted.", (
            f"second_history_entry message: {response.data['second_history_entry'][0]}"
        )


@pytest.mark.django_db
class TestStoreProductViewSet:
    @pytest.fixture
    def test_data(self):
        return StoreTestData()

    def test_retrieve_with_two_depth_invalid_expand(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "distributor.brands",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "distributor.brands" in response.data
        assert len(response.data["distributor.brands"]) == 1, (
            f"distributor.brands data: {response.data['distributor.brands']}"
        )
        assert (
            response.data["distributor.brands"][0]
            == "Invalid expands. Permitted expands are distributor. Or use a wildcard to expand all: *, ~all, distributor.*, distributor.~all"
        ), f"distributor.brands message: {response.data['distributor.brands'][0]}"

    def test_retrieve_with_two_depth_invalid_field(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "distributor",
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "distributor.brands",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "distributor.brands" in response.data
        assert len(response.data["distributor.brands"]) == 1, (
            f"distributor.brands data: {response.data['distributor.brands']}"
        )
        assert (
            response.data["distributor.brands"][0]
            == "Invalid field.  Valid fields are available_actions, current_sale_date, description, disabled, distributor, distributor.description, distributor.formatted_name, distributor.id, distributor.name, distributor.object_revision, formatted_name, future_sale_dates, id, internal_comments, last_ordered, last_ten_order_betweens, name, object_revision, order_between, reviews, special_care, tangible_type. Or use a wildcard to specify all: *, ~all, distributor.*, distributor.~all"
        ), f"distributor.brands message: {response.data['distributor.brands'][0]}"

    def test_retrieve_rejects_expanded_available_actions_field(self, api_client, test_data):
        """An expanded object never renders ``available_actions``, so requesting it is invalid."""
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "distributor",
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,distributor.available_actions",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "distributor.available_actions" in response.data

    def test_retrieve_omits_available_actions_from_expanded_object(self, api_client, test_data):
        """Requested by ``?f=``, ``available_actions`` renders on the top-level object but not an expanded one."""
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "distributor",
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,available_actions,distributor",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert "available_actions" in response.data
        assert isinstance(response.data["distributor"], dict), response_body(response)
        assert "available_actions" not in response.data["distributor"]

    def test_wildcard_expand_omits_available_actions_from_expanded_serializer(self, api_client, test_data):
        """A ``?e=*`` expand passes the ``available_actions`` omit to each expanded serializer."""
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        with patch.object(
            flex_serializers.FlexFieldsSerializerMixin,
            "_make_expanded_field_serializer",
            autospec=True,
            side_effect=flex_serializers.FlexFieldsSerializerMixin._make_expanded_field_serializer,
        ) as make_spy:
            response = api_client.get(
                reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
                data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "*"},
                format="json",
            )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        nested_omits = {
            call.args[1]: call.args[4].get(call.args[1], [])
            for call in make_spy.call_args_list
            if isinstance(call.args[0], store_serializers.ProductSerializer)
        }
        assert "distributor" in nested_omits, nested_omits
        assert "available_actions" in nested_omits["distributor"], nested_omits

    def test_wildcard_expand_respects_top_level_omit(self, api_client, test_data):
        """A top-level ``?om=`` drops a field that ``?e=*`` would otherwise expand."""
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "*",
                settings.REST_FLEX_FIELDS2["OMIT_PARAM"]: "distributor",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert "distributor" not in response.data

    def test_retrieve_reports_invalid_fields_and_expands_together(self, api_client, test_data):
        """Invalid ``f`` and ``e`` names come back in one standard validation error."""
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "distributor.brands",
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,bogus",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert set(response.data) == {"bogus", "distributor.brands", "serverStack"}, response_body(response)
        assert len(response.data["bogus"]) == 1, response_body(response)
        assert response.data["bogus"][0].startswith("Invalid field.  Valid fields are "), response_body(response)
        assert response.data["distributor.brands"] == [
            "Invalid expands. Permitted expands are distributor. Or use a wildcard to expand all: *, ~all, distributor.*, distributor.~all"
        ], response_body(response)
        assert "VuedaValidationError" in response.data["serverStack"], response_body(response)

    def test_retrieve_reports_both_messages_for_a_name_invalid_as_field_and_expand(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.products))
        obj = test_data.products[key]

        response = api_client.get(
            reverse("store.product-detail", kwargs={"pk": obj["product"].pk}),
            data={
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "bogus",
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "bogus",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        field_message, expand_message = response.data["bogus"]
        assert field_message.startswith("Invalid field.  "), response_body(response)
        assert expand_message.startswith("Invalid expands. "), response_body(response)


@pytest.mark.django_db
class TestExpandingThroughRegisteredSerializer(BaseTestAssertResponseMixin):
    @pytest.fixture
    def test_data(self):
        return StoreTestData()

    def test_expand_through(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.customer_orders))
        obj = test_data.customer_orders[key]

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": obj.pk}),
            data={
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: (
                    "*,order_items.*,order_items.product_option.*,order_items.product_option.product.*"
                ),
                settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "order_items.product_option.product",
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert {
            "id",
            "order_number",
            "when",
            "customer",
            "order_items",
            "order_state",
            "shipping_method",
            "formatted_name",
            "object_revision",
            "valid_transitions",
            "workflow_state_code",
            "workflow_state_name",
        } == frozenset(response.data.keys())
        assert isinstance(response.data["customer"], int)
        assert isinstance(response.data["order_items"], list)
        assert {"id", "customer_order", "product_option", "quantity", "formatted_name", "object_revision"} == frozenset(
            response.data["order_items"][0].keys()
        )
        assert isinstance(response.data["order_items"][0]["customer_order"], int)
        assert isinstance(response.data["order_items"][0]["product_option"], dict)
        assert {
            "product",
            "gtin",
            "id",
            "disabled",
            "price",
            "formatted_name",
            "option_type",
            "name",
            "sku",
            "quantity_available",
            "object_revision",
        } == frozenset(response.data["order_items"][0]["product_option"])
        assert isinstance(response.data["order_items"][0]["product_option"]["product"], dict)


@pytest.mark.django_db
class TestStoreCustomerOrderViewSet:
    @pytest.fixture
    def test_data(self):
        return StoreTestData()

    def test_expand_exceeds_depth(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        key = next(iter(test_data.customer_orders))
        obj = test_data.customer_orders[key]

        response = api_client.get(
            reverse("store.customerorder-detail", kwargs={"pk": obj.pk}),
            data={
                settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: (
                    "*,"
                    "order_items.*,"
                    "order_items.customer_order.*,"
                    "order_items.customer_order.product_option.*,"
                    "order_items.customer_order.product_option.product.*,"
                ),
                settings.REST_FLEX_FIELDS2[
                    "EXPAND_PARAM"
                ]: "order_items.customer_order.order_items.product_option.product",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "non_field_errors" in response.data
        assert len(response.data["non_field_errors"]) == 1, (
            f"non_field_errors data: {response.data['non_field_errors']}"
        )
        assert "Expansion depth exceeded" in response.data["non_field_errors"]


@pytest.mark.django_db
class TestTimesheetViewSet(BaseTestModelViewSet):
    model = Timesheet
    has_delete_permission = True

    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("timesheet", "Timesheet", "read"),
            ("timesheet", "Timesheet", "list"),
            ("timesheet", "Timesheet", "create"),
            ("timesheet", "Timesheet", "update"),
            ("timesheet", "Timesheet", "delete"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }

    list_keys_arguments = {
        "period_start",
        "period_end",
        "employee",
        "supervisor",
    }

    @pytest.fixture
    def page_data(self):
        self.employee_1 = employee_1 = Employee.objects.create(
            user=self.users["test_admin@domain.invalid"],
            employee_number="1",
        )
        employee_2 = Employee.objects.create(
            user=self.users["test_admin@domain.invalid"],
            employee_number="2",
        )
        self.supervisor_1 = supervisor_1 = Employee.objects.create(
            user=self.users["test_admin@domain.invalid"],
            employee_number="3",
        )
        for data in (
            {
                "period_start": datetime.date(2024, 1, 1),
                "period_end": datetime.date(2024, 1, 15),
                "employee": employee_1,
                "supervisor": None,
            },
            {
                "period_start": datetime.date(2024, 1, 16),
                "period_end": datetime.date(2024, 1, 31),
                "employee": employee_1,
                "supervisor": supervisor_1,
            },
            {
                "period_start": datetime.date(2024, 2, 1),
                "period_end": datetime.date(2024, 2, 15),
                "employee": employee_2,
                "supervisor": None,
            },
            {
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 29),
                "employee": employee_2,
                "supervisor": supervisor_1,
            },
        ):
            self.model.objects.create(**data)
        return self.model.objects.all()

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def list_querystring(self, page_data):
        ids = tuple(page_data.values_list("pk", flat=True))
        return {"id": ids}

    @pytest.fixture
    def update_arguments(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "employee": self.employee_1.id,
            "id": instance.id,
            "period_end": datetime.date(2024, 1, 15).strftime("%Y-%m-%d"),
            "period_start": datetime.date(2024, 1, 1).strftime("%Y-%m-%d"),
            "supervisor": self.supervisor_1.id,
        }

    @pytest.fixture
    def create_arguments(self):
        return {
            "employee": self.employee_1.id,
            "period_end": datetime.date(2024, 3, 15).strftime("%Y-%m-%d"),
            "period_start": datetime.date(2024, 3, 1).strftime("%Y-%m-%d"),
            "supervisor": None,
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "id": instance.id,
            "employee": self.employee_1.id,
            "period_end": datetime.date(2024, 1, 15).strftime("%Y-%m-%d"),
            "period_start": datetime.date(2024, 1, 1).strftime("%Y-%m-%d"),
            "supervisor": None,
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)

        period_start = new_instance.period_start
        period_end = new_instance.period_end
        formatted_name = f"{new_instance.employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_create_response["formatted_name"] = formatted_name

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)

        period_start = instance.period_start
        period_end = instance.period_end
        formatted_name = f"{instance.employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_retrieve_response["formatted_name"] = formatted_name

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)

        period_start = updated_instance.period_start
        period_end = updated_instance.period_end
        formatted_name = f"{updated_instance.employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_update_response["formatted_name"] = formatted_name

    def test_list_with_valid_expands(self, page_data, authenticated_client, list_querystring):
        keys = {"id", "object_revision", "formatted_name"}.union(self.list_keys_arguments)

        # Do we have a workflow?
        if hasattr(self.model, "workflow"):
            keys.update(
                {
                    "workflow_state_code": "draft",
                    "workflow_state_name": "Draft",
                }
            )

        list_querystring[settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]] = "employee,supervisor"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        response_info = {x: y for x, y in response.data.items() if x == "results"}
        object_revision = response_info["results"][0]["object_revision"]
        assert object_revision is not None
        assert keys == set(response_info["results"][0].keys())
        assert {x["id"] for x in response_info["results"]} == set(list_querystring["id"])

    def test_list_with_invalid_expands(self, page_data, authenticated_client, list_querystring):
        list_querystring[settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]] = "employee,guardian"
        response = authenticated_client.get(self.list_url(), data=list_querystring, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "guardian" in response.data
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert (
            response.data["guardian"][0]
            == "Invalid expands. Permitted expands are employee, supervisor. Or use a wildcard to expand all: *, ~all"
        ), f"guardian message: {response.data['guardian'][0]}"
        assert "employee" not in response.data

    def test_retrieve_with_valid_expands(self, page_data, authenticated_client, expected_retrieve_response):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee,supervisor"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)
        self.update_expected_retrieve_response(expected_retrieve_response, instance)
        employee = instance.employee
        expected_retrieve_response["employee"] = {
            "employee_number": employee.employee_number,
            "formatted_name": str(employee.employee_number),
            "id": employee.id,
            "user": employee.user_id,
            # An expanded object carries no revision. Only the queryset the view builds is
            # annotated, and a relation resolved through select_related is not.
            "object_revision": None,
        }
        period_start = instance.period_start
        period_end = instance.period_end
        formatted_name = f"{employee.employee_number} on {period_start.strftime('%Y')}/{period_start.strftime('%m')}/{period_start.strftime('%d')} to {period_end.strftime('%Y')}/{period_end.strftime('%m')}/{period_end.strftime('%d')}"
        expected_retrieve_response["formatted_name"] = formatted_name

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert expected_retrieve_response == response.data

    def test_retrieve_with_invalid_expands(self, page_data, authenticated_client):
        instance = page_data.first()

        detail_querystring = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee,guardian"}
        response = authenticated_client.get(self.detail_url(instance.id), data=detail_querystring)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "guardian" in response.data
        assert len(response.data["guardian"]) == 1, f"guardian data: {response.data['guardian']}"
        assert (
            response.data["guardian"][0]
            == "Invalid expands. Permitted expands are employee, foo, supervisor, timesheet_entry. Or use a wildcard to expand all: *, ~all"
        ), f"guardian message: {response.data['guardian'][0]}"
        assert "employee" not in response.data

    def test_destroy_dry_run_skips_commit(self, page_data, authenticated_client):
        instance = page_data.first()

        response = authenticated_client.delete(self.detail_url(instance.id), HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert self.model.objects.filter(pk=instance.pk).exists()

    def test_destroy_dry_run_returns_validation_error(self, page_data, authenticated_client, monkeypatch):
        def fail_validation(self, objs):
            raise VuedaValidationError({"detail": ["Destroy validation failed."]})

        monkeypatch.setattr(TimesheetViewSet, "destroy_validation", fail_validation)

        instance = page_data.first()
        response = authenticated_client.delete(self.detail_url(instance.id), HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert self.model.objects.filter(pk=instance.pk).exists()

    def test_destroy_returns_no_content_for_detailed(self, page_data, authenticated_client):
        instance = page_data.first()
        response = authenticated_client.delete(self.detail_url(instance.id))

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert not self.model.objects.filter(pk=instance.pk).exists()

    def test_bulk_destroy_returns_no_content(self, page_data, authenticated_client):
        initial_count = self.model.objects.count()
        pks = list(page_data.values_list("pk", flat=True)[:2])

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert self.model.objects.filter(pk__in=pks).count() == 0
        assert self.model.objects.count() == initial_count - len(pks)

    def test_bulk_destroy_with_missing_objects(self, page_data, authenticated_client):
        existing_pk = page_data.first().pk
        missing_pk = max(page_data.values_list("pk", flat=True)) + 100
        pks = [existing_pk, missing_pk]

        response = authenticated_client.delete(self.list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        error_key = missing_pk if missing_pk in response.data else str(missing_pk)
        assert error_key in response.data
        assert response.data[error_key][0] == f"Object with pk={missing_pk} does not exist."
        assert self.model.objects.filter(pk=existing_pk).exists()

    def _create_timesheets(self, count):
        supervisor = Employee.objects.create(user=self.users["test_admin@domain.invalid"], employee_number="super")
        for i in range(count):
            employee = Employee.objects.create(user=self.users["test_admin@domain.invalid"], employee_number=f"emp-{i}")
            self.model.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
                supervisor=supervisor,
            )
        return supervisor

    def test_list_with_expands_query_count_does_not_grow_with_row_count(self, authenticated_client):
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee,supervisor"}

        # Warm the requesting user's Django permission cache (ModelBackend.get_all_permissions,
        # cached on the user instance for the rest of the test) once, up front, so the one-time cost
        # of the first request against this user doesn't masquerade as a row-count-dependent one.
        authenticated_client.get(self.list_url(), data=query, format="json")

        counts = {}
        for row_count in (2, 10):
            self.model.objects.all().delete()
            supervisor = self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(self.list_url(), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert result["supervisor"]["id"] == supervisor.id
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"expanded list query count grows with row count: {counts}"

    def test_list_with_expand_survives_sparse_fieldset_and_query_count_does_not_grow(self, authenticated_client):
        # "f" (sparse fields) does not name "employee", but requesting it via "e" still renders it
        # (see FlexFieldsWriteableNestedSerializerMixin.apply_flex_fields), so the plan must still
        # cover it.
        query = {
            settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee",
            settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id",
        }

        # See test_list_with_expands_query_count_does_not_grow_with_row_count for why this is needed.
        authenticated_client.get(self.list_url(), data=query, format="json")

        counts = {}
        for row_count in (2, 10):
            self.model.objects.all().delete()
            self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(self.list_url(), data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert isinstance(result["employee"], dict)
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, (
            f"expanded list dropped by a sparse fieldset still grows query count with row count: {counts}"
        )


@pytest.mark.django_db
class TestTimesheetWithAliasedSupervisorViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def _create_timesheets(self, count):
        user = self.users["test_user@domain.invalid"]
        supervisor = Employee.objects.create(user=user, employee_number="super")
        for i in range(count):
            employee = Employee.objects.create(user=user, employee_number=f"emp-{i}")
            Timesheet.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
                supervisor=supervisor,
            )
        return supervisor

    def test_list_with_source_aliased_expand_query_count_does_not_grow_with_row_count(self, authenticated_client):
        # "manager" is declared with source="supervisor" (vs. TimesheetViewSet's plain "supervisor"
        # expand), so the plan must resolve it against the model's "supervisor" relation, not a
        # (nonexistent) "manager" attribute.
        url = reverse("timesheet.timesheetmanager-list")
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "manager"}

        counts = {}
        for row_count in (2, 10):
            Timesheet.objects.all().delete()
            supervisor = self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert result["manager"]["id"] == supervisor.id
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"source-aliased expand query count grows with row count: {counts}"


@pytest.mark.django_db
class TestTimesheetWithPrefetchedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithPrefetchedEntriesViewSet.queryset`` declares its own
    ``prefetch_related("timesheet_entries")``, the relation that "entries" also expands. The string
    has no queryset, so the plan's ``Prefetch`` loads the entries. Django raises ``ValueError`` when a
    lookup with a queryset reaches a relation that an earlier lookup already fetched, so
    ``apply_prefetch_plan`` runs the plan's ``Prefetch`` first, and the string reuses its rows. The
    plan's ``Prefetch`` annotates each entry's ``object_revision``, so a revision on each entry shows
    that the plan's ``Prefetch`` served the response.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def test_list_with_expand_does_not_raise_when_viewset_already_prefetches_the_relation(self, authenticated_client):
        user = self.users["test_user@domain.invalid"]
        employee = Employee.objects.create(user=user, employee_number="1")
        timesheet = Timesheet.objects.create(
            period_start=datetime.date(2024, 1, 1),
            period_end=datetime.date(2024, 1, 15),
            employee=employee,
        )
        entry = TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

        url = reverse("timesheet.timesheetprefetched-list")
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "entries"}
        response = authenticated_client.get(url, data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(response.data["results"]) == 1
        entries = response.data["results"][0]["entries"]
        assert [e["id"] for e in entries] == [entry.id]
        assert [e["object_revision"] for e in entries] == [object_revision_of(entry)]


@pytest.mark.django_db
class TestTimesheetWithAliasedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithAliasedEntriesViewSet.queryset`` is plain ``Timesheet.objects.all()``, so the plan
    that ``build_prefetch_plan`` derives serves the whole response. This covers the to-many branch's
    query count and its ``formatted_name`` pre-annotation, plus the plan colliding with itself when
    "entries" and "entries_again" both expand the same "timesheet_entries" relation.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def _create_timesheets(self, count):
        user = self.users["test_user@domain.invalid"]
        for i in range(count):
            employee = Employee.objects.create(user=user, employee_number=f"emp-{i}")
            timesheet = Timesheet.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
            )
            TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

    def test_list_with_to_many_expand_query_count_does_not_grow_with_row_count(self, authenticated_client):
        url = reverse("timesheet.timesheetaliasedentries-list")
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "entries"}

        counts = {}
        for row_count in (2, 10):
            Timesheet.objects.all().delete()
            self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert len(response.data["results"]) == row_count
            for result in response.data["results"]:
                assert len(result["entries"]) == 1
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to-many expand query count grows with row count: {counts}"

    def test_list_with_both_aliases_of_the_same_relation_does_not_raise(self, authenticated_client):
        row_count = 2
        self._create_timesheets(row_count)

        url = reverse("timesheet.timesheetaliasedentries-list")
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "entries,entries_again"}
        response = authenticated_client.get(url, data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(response.data["results"]) == row_count
        for result in response.data["results"]:
            assert len(result["entries"]) == 1
            assert len(result["entries_again"]) == 1


@pytest.mark.django_db
class TestTimesheetWithDeeperPrefetchedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithDeeperPrefetchedEntriesViewSet.queryset`` declares
    ``prefetch_related("timesheet_entries__timesheet")``, a lookup that passes through -- but never
    equals -- the "entries" expand's own "timesheet_entries" path. Django fetches
    "timesheet_entries" as an intermediate level of that lookup, with no queryset. The plan's
    ``Prefetch`` loads that level instead: ``apply_prefetch_plan`` runs it first, and the deeper
    lookup reuses its rows. A revision on each entry shows that the plan's ``Prefetch`` served the
    response.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def test_list_with_expand_does_not_raise_when_viewset_prefetches_through_the_relation(self, authenticated_client):
        user = self.users["test_user@domain.invalid"]
        employee = Employee.objects.create(user=user, employee_number="1")
        timesheet = Timesheet.objects.create(
            period_start=datetime.date(2024, 1, 1),
            period_end=datetime.date(2024, 1, 15),
            employee=employee,
        )
        entry = TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

        url = reverse("timesheet.timesheetdeeperprefetched-list")
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "entries"}
        response = authenticated_client.get(url, data=query, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        entries = response.data["results"][0]["entries"]
        assert [e["id"] for e in entries] == [entry.id]
        assert [e["object_revision"] for e in entries] == [object_revision_of(entry)]


@pytest.mark.django_db
class TestTimesheetWithToAttrPrefetchedEntriesViewSet(BaseTestAssertResponseMixin, BaseTestUserMixin):
    """
    ``TimesheetWithToAttrPrefetchedEntriesViewSet.queryset`` hand-declares its own
    "timesheet_entries" prefetch under ``to_attr="raw_timesheet_entries"``, a distinct cache key
    from the "entries" expand's own plan entry (which uses the relation's default attribute name).
    Before ``_filter_new_prefetch_lookups`` compared lookups by lookup path rather than cache key,
    the plan entry was dropped as though it collided, silently falling back to one query per row --
    this covers that it now runs and holds a flat query count.
    """

    users_to_create: ClassVar[dict] = {
        "test_user@domain.invalid": {
            "name": "Test User",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.users["test_user@domain.invalid"])
        return api_client

    def _create_timesheets(self, count):
        user = self.users["test_user@domain.invalid"]
        for i in range(count):
            employee = Employee.objects.create(user=user, employee_number=f"emp-{i}")
            timesheet = Timesheet.objects.create(
                period_start=datetime.date(2024, 1, 1),
                period_end=datetime.date(2024, 1, 15),
                employee=employee,
            )
            TimesheetEntry.objects.create(timesheet=timesheet, date=datetime.date(2024, 1, 2), hours=8)

    def test_list_with_expand_query_count_does_not_grow_with_row_count(self, authenticated_client):
        url = reverse("timesheet.timesheettoattrprefetched-list")
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "entries"}

        counts = {}
        for row_count in (2, 10):
            Timesheet.objects.all().delete()
            self._create_timesheets(row_count)

            with CaptureQueriesContext(connection) as captured:
                response = authenticated_client.get(url, data=query, format="json")

            assert response.status_code == HTTPStatus.OK, response_body(response)
            for result in response.data["results"]:
                assert len(result["entries"]) == 1
            counts[row_count] = len(captured)

        assert len(set(counts.values())) == 1, f"to_attr-prefetched expand query count grows with row count: {counts}"


@pytest.mark.django_db
class TestNoExtraFieldsSerializerMixin(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Timesheet Updater": [
            ("timesheet", "Timesheet", "create"),
            ("timesheet", "Timesheet", "update"),
            ("employee", "Employee", "update"),
        ],
        "Customer Updater": [
            ("store", "Customer", "update"),
            ("employee", "User", "update"),
        ],
        "CartItem Updater": [
            ("store", "CartItem", "update"),
            ("store", "ProductOption", "update"),
        ],
        "Timesheet Reader": [
            ("timesheet", "Timesheet", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_my_user@domain.invalid": {
            "name": "Test User update",
            "password": "testpass",
            "groups": [
                "Timesheet Updater",
                "Customer Updater",
                "CartItem Updater",
            ],
        },
        "test_reader_writer@domain.invalid": {
            "name": "Test User read and write",
            "password": "testpass",
            "groups": [
                "Timesheet Updater",
                "Timesheet Reader",
            ],
        },
    }

    @pytest.fixture(autouse=True)
    def related_write_registrations(self, monkeypatch):
        class EmployeeViewSet(VuedaViewSet):
            queryset = Employee.objects.all()
            serializer_class = EmployeeSerializer

        class UserViewSet(VuedaViewSet):
            queryset = User.objects.all()
            serializer_class = UserSerializer

        for serializer, viewset in (
            (EmployeeSerializer, EmployeeViewSet),
            (UserSerializer, UserViewSet),
            (store_serializers.ProductOptionSerializer, store_viewsets.ProductOptionViewSet),
        ):
            monkeypatch.setitem(
                info.registration._registry,
                serializer.Meta.model._meta.label_lower,
                {
                    "serializer": serializer,
                    "viewset": viewset,
                },
            )

    def test_update_timesheet_with_existing_field(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "period_start,period_end"},
            ),
            data={
                # ?f= narrows the response, not validation, so the required "employee" relation
                # must still be supplied even though the response won't include it.
                "employee": e1.pk,
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert response.data == {"period_start": "2024-02-16", "period_end": "2024-02-25"}, response.data

    def test_update_timesheet_with_field_param_excluding_required_field_fails_validation(self, api_client):
        """A required relation ("employee") dropped by ?f= must still be required (issue #205):
        ?f= shapes the response, not what the write validates."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "period_start,period_end"},
            ),
            data={
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 400)
        # "serverStack" is debug-only noise the test settings attach to error responses; strip it
        # before comparing so the assertion checks the whole error payload, not just one key.
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {"employee": [ErrorDetail("This field is required.", code="required")]}, response.data

    @pytest.mark.parametrize(
        "param_name,requested",
        [
            ("FIELDS_PARAM", "period_start,period_end"),
            ("OMIT_PARAM", "employee"),
        ],
    )
    def test_create_timesheet_with_field_param_excluding_required_field_fails_validation(
        self, api_client, param_name, requested
    ):
        """A required relation ("employee") dropped by ?f=/?om= must still be required on create
        (issue #205): the parameters shape the response, not what the write validates."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.post(
            reverse(
                "timesheet.timesheet-list",
                query={settings.REST_FLEX_FIELDS2[param_name]: requested},
            ),
            data={
                "period_start": datetime.date(2024, 3, 1),
                "period_end": datetime.date(2024, 3, 15),
            },
            format="json",
        )

        self.assert_response(response, 400)
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {"employee": [ErrorDetail("This field is required.", code="required")]}, response.data
        assert not Timesheet.objects.filter(period_start=datetime.date(2024, 3, 1)).exists()

    def test_partial_update_timesheet_with_field_param_does_not_bypass_validation(self, api_client):
        """A PATCH still validates a field present in the body even when ?f= excludes it from the
        response (issue #205): sparse fieldset narrows the response, not what gets validated."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.patch(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "period_start"},
            ),
            data={"employee": 999999},  # no employee with this pk
            format="json",
        )

        self.assert_response(response, 400)
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {
            "employee": [ErrorDetail('Invalid pk "999999" - object does not exist.', code="does_not_exist")]
        }, response.data
        t1.refresh_from_db()
        assert t1.employee_id == e1.pk

    @pytest.mark.parametrize(
        "param_name,requested",
        [
            ("FIELDS_PARAM", "period_start"),
            ("OMIT_PARAM", "employee"),
            (None, None),
        ],
    )
    def test_partial_update_timesheet_with_field_param_does_not_require_an_omitted_field(
        self, api_client, param_name, requested
    ):
        """The complement of test_partial_update_timesheet_with_field_param_does_not_bypass_validation:
        a PATCH that never sends "employee" at all still succeeds even though ?f=/?om= also
        excludes "employee" from the response. Sparse-fieldset parameters shape the response only;
        they do not make an absent field required on a partial update (issue #205). The
        (None, None) case is the baseline this compares against: an ordinary PATCH with no
        flex-fields query parameter at all succeeds the same way, which is what shows ?f=/?om= are
        a genuine no-op here rather than coincidentally not breaking anything."""
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        query = {settings.REST_FLEX_FIELDS2[param_name]: requested} if param_name else {}
        response = api_client.patch(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query=query,
            ),
            data={"period_start": datetime.date(2024, 2, 16)},  # employee omitted entirely
            format="json",
        )

        self.assert_response(response, 200)
        # The write succeeds identically in all three cases, but the response narrows
        # per-parameter exactly as it would on a read: ?f= restricts to the requested field,
        # ?om= drops only "employee", and the no-param baseline includes it.
        if param_name == "FIELDS_PARAM":
            assert response.data == {"period_start": "2024-02-16"}, response.data
        elif param_name == "OMIT_PARAM":
            assert "employee" not in response.data, response.data
            assert response.data["period_start"] == "2024-02-16", response.data
        else:
            assert response.data["employee"] == e1.pk, response.data
            assert response.data["period_start"] == "2024-02-16", response.data
        t1.refresh_from_db()
        assert t1.period_start == datetime.date(2024, 2, 16)
        assert t1.employee_id == e1.pk  # unchanged: never supplied, so the partial update left it alone

    def test_update_timesheet_with_non_existing_field(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "period_start"},
            ),
            data={
                "employee": e1.pk,
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
                "une": "ssss",
            },
            format="json",
        )

        self.assert_response(response, 400)
        # ?f= no longer narrows the field set that validates the write, so "period_end" -- a real
        # field left out of the requested subset -- validates normally instead of being rejected
        # as an unknown field. The full-payload comparison confirms that: only "une" errors.
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == {
            "une": [
                ErrorDetail(
                    "Invalid field.  Valid fields are available_actions, employee, "
                    "formatted_name, id, object_revision, period_end, period_start, supervisor.",
                    code="invalid",
                )
            ]
        }, response.data

    def test_expand_with_existing_expands(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee,foo"},
            ),
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-12345"},
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "period_start" in response.data
        assert "period_end" in response.data
        assert "employee" in response.data
        assert "foo" in response.data
        assert "user" in response.data["employee"]

    def test_expand_with_non_existing_expands(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "foo,label10"},
            ),
            data={
                "employee": e1.pk,
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "label10" in response.data

    def test_expand_with_existing_fields(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-1234",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={
                    settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "period_start,period_end,employee",
                    settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee",
                },
            ),
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-123456"},
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "period_start" in response.data
        assert "period_end" in response.data
        assert "employee" in response.data
        assert "user" in response.data["employee"]

    def test_expand_with_existing_fields_customer(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        c1 = store_models.Customer.objects.create(user=user)

        response = api_client.put(
            reverse(
                "store.customer-detail",
                kwargs={"pk": c1.pk},
                query={
                    settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "user",
                    settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "user",
                },
            ),
            data={"user": {"id": user.pk, "email": user.email, "name": user.name}},
            format="json",
        )

        self.assert_response(response, 200)
        assert "user" in response.data
        assert "email" in response.data["user"]

    def test_expand_with_existing_fields_cart_item(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        customer = store_models.Customer.objects.create(user=user)
        cart = store_models.Cart.objects.create(customer=customer)
        distributor = store_models.Distributor.objects.create(
            name="Test Distributor",
            description="Test Distributor Description",
        )
        tangible_type = store_models.TangibleType.objects.get(code="physical")
        product = store_models.Product.objects.create(
            distributor=distributor,
            name="Test Product",
            tangible_type=tangible_type,
            order_between=(1, 10),
        )
        option_type = store_models.OptionType.objects.get(code="size")
        product_option = store_models.ProductOption.objects.create(
            product=product,
            option_type=option_type,
            name="Test Option",
            sku="TEST-SKU-001",
            gtin="0000000000001",
            price="9.99",
        )
        ci1 = store_models.CartItem.objects.create(
            cart=cart,
            product_option=product_option,
            quantity=1,
        )

        response = api_client.put(
            reverse(
                "store.cartitem-detail",
                kwargs={"pk": ci1.pk},
                query={
                    settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "cart,product_option",
                    settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "product_option",
                },
            ),
            data={
                # ?f= narrows the response, not validation, so the required "quantity" scalar
                # must still be supplied even though the response won't include it.
                "quantity": ci1.quantity,
                "cart": cart.pk,
                "product_option": {
                    "disabled": False,
                    "gtin": product_option.gtin,
                    "id": product_option.pk,
                    "name": product_option.name,
                    "option_type": option_type.pk,
                    "price": product_option.price,
                    "product": product.pk,
                    "quantity_available": 16,
                    "sku": product_option.sku,
                },
            },
            format="json",
        )

        self.assert_response(response, 200)
        assert "cart" in response.data
        assert "product_option" in response.data
        assert "name" in response.data["product_option"]

    def test_expand_with_non_existing_fields(self, api_client):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        e1 = Employee.objects.create(
            user=user,
            employee_number="abcd-12348",
        )
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )

        response = api_client.put(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={
                    settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "period_start,period_end,employee,invalid_field_name",
                    settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee",
                },
            ),
            data={
                "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-123456"},
                "period_start": datetime.date(2024, 2, 16),
                "period_end": datetime.date(2024, 2, 25),
                "invalid_field_name": "invalid_value",
            },
            format="json",
        )

        self.assert_response(response, 400)
        assert "invalid_field_name" in response.data
        assert "period_start" not in response.data

    def _patch_timesheet(self, api_client, expand, data):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(user=user, employee_number="abcd-1234")
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )
        response = api_client.patch(
            reverse(
                "timesheet.timesheet-detail",
                kwargs={"pk": t1.pk},
                query={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: expand},
            ),
            data=data,
            format="json",
        )
        return response, t1

    def test_partial_update_accepts_a_permitted_expand(self, api_client, monkeypatch):
        monkeypatch.setattr(TimesheetViewSet, "permit_partial_update_expands", ["employee"], raising=False)

        response, t1 = self._patch_timesheet(api_client, "employee", {"period_end": "2024-03-01"})

        self.assert_response(response, 200)
        assert response.data["employee"]["id"] == t1.employee_id
        t1.refresh_from_db()
        assert t1.period_end == datetime.date(2024, 3, 1)

    def test_partial_update_reports_an_unknown_expand_before_body_errors(self, api_client):
        """With no permit list, an unknown expand is reported before the body is validated."""
        response, t1 = self._patch_timesheet(api_client, "bogus", {"employee": 999999})

        self.assert_response(response, 400)
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert list(errors) == ["bogus"], response.data
        assert str(errors["bogus"][0]).startswith("Invalid expands. Permitted expands are employee, "), response.data
        t1.refresh_from_db()
        assert t1.employee.employee_number == "abcd-1234"

    @pytest.mark.parametrize(
        "query",
        [
            pytest.param({settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "bogus"}, id="unknown-field"),
            pytest.param({settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,bogus.id"}, id="unknown-dotted-field"),
            pytest.param({settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "bogus"}, id="unknown-expand"),
            pytest.param(
                {
                    settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,bogus",
                    settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "bogus",
                },
                id="unknown-field-and-expand",
            ),
        ],
    )
    @pytest.mark.parametrize("method", ["post", "put", "patch"])
    def test_write_rejects_invalid_flex_params_like_retrieve_and_saves_nothing(self, api_client, method, query):
        user = self.users["test_reader_writer@domain.invalid"]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(user=user, employee_number="abcd-1234")
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )
        detail_url = reverse("timesheet.timesheet-detail", kwargs={"pk": t1.pk}, query=query)

        retrieve_response = api_client.get(detail_url)
        self.assert_response(retrieve_response, 400)
        retrieve_errors = {k: v for k, v in retrieve_response.data.items() if k != "serverStack"}

        data = {"employee": e1.pk, "period_start": "2024-03-01", "period_end": "2024-03-15"}
        if method == "post":
            url = reverse("timesheet.timesheet-list", query=query)
        else:
            url = detail_url
        response = getattr(api_client, method)(url, data=data, format="json")

        self.assert_response(response, 400)
        assert "serverStack" in response.data, response.data
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert errors == retrieve_errors, response.data
        assert set(errors) == {name for value in query.values() for name in value.split(",") if name != "id"}
        assert list(Timesheet.objects.values_list("pk", "period_start", "period_end")) == [
            (t1.pk, datetime.date(2024, 2, 15), datetime.date(2024, 2, 29))
        ]

    @pytest.mark.parametrize("method", ["post", "put", "patch"])
    def test_write_accepts_valid_flex_params(self, api_client, method):
        user = self.users["test_my_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(user=user, employee_number="abcd-1234")
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )
        query = {
            settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,period_start,employee.employee_number",
            settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "employee",
        }
        data = {
            "employee": {"id": e1.pk, "user": user.pk, "employee_number": "abcd-1234"},
            "period_start": "2024-03-01",
            "period_end": "2024-03-15",
        }
        if method == "post":
            response = api_client.post(reverse("timesheet.timesheet-list", query=query), data=data, format="json")
            self.assert_response(response, 201)
        else:
            url = reverse("timesheet.timesheet-detail", kwargs={"pk": t1.pk}, query=query)
            response = getattr(api_client, method)(url, data=data, format="json")
            self.assert_response(response, 200)

        saved = Timesheet.objects.get(pk=response.data["id"])
        assert response.data == {
            "id": saved.pk,
            "period_start": "2024-03-01",
            "employee": {"employee_number": "abcd-1234"},
        }, response.data
        assert saved.period_end == datetime.date(2024, 3, 15)

    @pytest.mark.parametrize(
        ("permitted", "message"),
        [
            pytest.param(
                ["employee"],
                "Invalid expands. Permitted expands are employee. Or use a wildcard to expand all: *, ~all",
                id="left-out",
            ),
            pytest.param([], "Invalid expands. No expands are permitted.", id="empty-permit-list"),
        ],
    )
    @pytest.mark.parametrize(("method", "action"), [("post", "create"), ("put", "update"), ("patch", "partial_update")])
    def test_write_rejects_an_unpermitted_expand_like_retrieve_and_saves_nothing(
        self, api_client, monkeypatch, method, action, permitted, message
    ):
        monkeypatch.setattr(TimesheetViewSet, "permit_retrieve_expands", permitted, raising=False)
        monkeypatch.setattr(TimesheetViewSet, f"permit_{action}_expands", permitted, raising=False)
        user = self.users["test_reader_writer@domain.invalid"]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(user=user, employee_number="abcd-1234")
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )
        query = {settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "supervisor"}
        detail_url = reverse("timesheet.timesheet-detail", kwargs={"pk": t1.pk}, query=query)
        expected_errors = {"supervisor": [ErrorDetail(message, code="invalid")]}

        retrieve_response = api_client.get(detail_url)
        self.assert_response(retrieve_response, 400)
        assert {k: v for k, v in retrieve_response.data.items() if k != "serverStack"} == expected_errors

        data = {"employee": e1.pk, "period_start": "2024-03-01", "period_end": "2024-03-15"}
        if method == "post":
            url = reverse("timesheet.timesheet-list", query=query)
        else:
            url = detail_url
        response = getattr(api_client, method)(url, data=data, format="json")

        self.assert_response(response, 400)
        assert {k: v for k, v in response.data.items() if k != "serverStack"} == expected_errors, response.data
        assert list(Timesheet.objects.values_list("pk", "period_start", "period_end")) == [
            (t1.pk, datetime.date(2024, 2, 15), datetime.date(2024, 2, 29))
        ]

    @pytest.mark.parametrize("method", ["post", "put", "patch"])
    def test_write_checks_names_against_the_write_actions_serializer(self, api_client, monkeypatch, method):
        class TimesheetWriteSerializer(timesheet_serializers.TimesheetSerializer):
            class Meta(timesheet_serializers.TimesheetSerializer.Meta):
                fields = ["id", "period_start", "period_end", "employee"] + VuedaSerializer.Meta.fields
                expandable_fields = {
                    name: value
                    for name, value in timesheet_serializers.TimesheetSerializer.Meta.expandable_fields.items()
                    if name != "supervisor"
                }

        read_get_serializer_class = TimesheetViewSet.get_serializer_class

        def get_serializer_class(viewset):
            if viewset.action in ("create", "update", "partial_update"):
                return TimesheetWriteSerializer
            return read_get_serializer_class(viewset)

        monkeypatch.setattr(TimesheetViewSet, "get_serializer_class", get_serializer_class)
        user = self.users["test_reader_writer@domain.invalid"]
        api_client.force_authenticate(user=user)
        e1 = Employee.objects.create(user=user, employee_number="abcd-1234")
        t1 = Timesheet.objects.create(
            employee=e1,
            period_start=datetime.date(2024, 2, 15),
            period_end=datetime.date(2024, 2, 29),
        )
        query = {settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,supervisor"}
        detail_url = reverse("timesheet.timesheet-detail", kwargs={"pk": t1.pk}, query=query)

        retrieve_response = api_client.get(detail_url)
        self.assert_response(retrieve_response, 200)
        assert retrieve_response.data == {"id": t1.pk, "supervisor": None}, retrieve_response.data

        data = {"employee": e1.pk, "period_start": "2024-03-01", "period_end": "2024-03-15"}
        if method == "post":
            url = reverse("timesheet.timesheet-list", query=query)
        else:
            url = detail_url
        response = getattr(api_client, method)(url, data=data, format="json")

        self.assert_response(response, 400)
        errors = {k: v for k, v in response.data.items() if k != "serverStack"}
        assert list(errors) == ["supervisor"], response.data
        message = str(errors["supervisor"][0])
        valid_fields = message.removeprefix("Invalid field.  Valid fields are ").split(".")[0].split(", ")
        assert "period_end" in valid_fields, message
        assert "supervisor" not in valid_fields, message
        assert list(Timesheet.objects.values_list("pk", "period_start", "period_end")) == [
            (t1.pk, datetime.date(2024, 2, 15), datetime.date(2024, 2, 29))
        ]


class _OrderItemCompositePKResponse(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["1", "1"]'
    order: int
    product: int
    quantity: int
    formatted_name: str
    available_actions: list[str]


class _OrderItemCompositePKInExpandResponse(TypedDict):
    pk: str  # JSON-encoded composite key, e.g. '["1", "1"]'
    order: int
    product: int
    quantity: int
    formatted_name: str


class _OrderCompositePKWithExpandResponse(TypedDict):
    id: int
    order_number: str
    order_date: str
    order_items_composite_pks: list[_OrderItemCompositePKInExpandResponse]
    formatted_name: str
    available_actions: list[str]


@pytest.mark.django_db
class TestNoExtraFieldsFormattedNameLookupExpression(
    BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin
):
    groups_to_create: ClassVar[dict] = {
        "Order Updater": [
            ("store", "OrderCompositePK", "update"),
            ("store", "OrderItemCompositePK", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_order_updater@domain.invalid": {
            "name": "Test Order Updater",
            "password": "testpass",
            "groups": ["Order Updater"],
        },
    }

    @pytest.fixture
    def order_item(self):
        product = store_models.ProductCompositePK.objects.create(name="Test Product")
        order = store_models.OrderCompositePK.objects.create(order_number="9999")
        return store_models.OrderItemCompositePK.objects.create(order=order, product=product, quantity=5)

    def test_formatted_name_on_main_model_no_error(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.orderitemcompositepk-detail",
                args=(json.dumps(order_item.pk),),
            ),
            data={"formatted_name": "test value"},
            format="json",
        )

        self.assert_response(response, 200)

        data: _OrderItemCompositePKResponse = response.json()
        assert data["formatted_name"] == "Test Product"

    def test_invalid_field_message_includes_formatted_name_main_model(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.orderitemcompositepk-detail",
                args=(json.dumps(order_item.pk),),
            ),
            data={"xxx_invalid_field": "value"},
            format="json",
        )

        self.assert_response(response, 400)
        assert "xxx_invalid_field" in response.data
        assert "formatted_name" in response.data["xxx_invalid_field"][0]

    def test_formatted_name_on_expanded_model_no_error(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.ordercompositepk-detail",
                kwargs={"pk": order_item.order.pk},
                query={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "order_items_composite_pks"},
            ),
            data={"formatted_name": str(order_item.order.order_number)},
            format="json",
        )

        self.assert_response(response, 200)

        data: _OrderCompositePKWithExpandResponse = response.json()
        assert data["order_items_composite_pks"][0]["formatted_name"] == "Test Product"

    def test_invalid_field_message_includes_formatted_name_expanded_model(self, order_item, api_client):
        user = self.users["test_order_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            reverse(
                "store.ordercompositepk-detail",
                kwargs={"pk": order_item.order.pk},
                query={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "order_items_composite_pks"},
            ),
            data={"xxx_invalid_field": "value"},
            format="json",
        )

        self.assert_response(response, 400)
        assert "xxx_invalid_field" in response.data
        assert "formatted_name" in response.data["xxx_invalid_field"][0]


@pytest.mark.django_db
class TestStoreDistributorProxyViewSet(BaseTestModelViewSet):
    model = store_models.DistributorProxy
    has_delete_permission = True

    groups_to_create: ClassVar[dict] = {
        "Distributor Proxy Admin": [
            ("store", "DistributorProxy", "read"),
            ("store", "DistributorProxy", "list"),
            ("store", "DistributorProxy", "create"),
            ("store", "DistributorProxy", "update"),
            ("store", "DistributorProxy", "delete"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_distributor_proxy_admin@domain.invalid": {
            "name": "Test Distributor Proxy Admin",
            "password": "testpass",
            "groups": ["Distributor Proxy Admin"],
        },
    }

    list_keys_arguments = {"name", "description"}

    page_data_arguments = (
        {"name": "Distributor A", "description": "Description A"},
        {"name": "Distributor B", "description": "Description B"},
        {"name": "Distributor C", "description": "Description C"},
    )

    @pytest.fixture
    def authenticated_client(self, api_client):
        user = self.users["test_distributor_proxy_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def list_querystring(self, page_data):
        ids = tuple(page_data.values_list("pk", flat=True))
        return {"id": ids}

    @pytest.fixture
    def create_arguments(self):
        return {
            "name": "Distributor New",
            "description": "New Description",
        }

    @pytest.fixture
    def update_arguments(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "description": "Updated Description",
            "id": instance.id,
            "name": instance.name,
        }

    @pytest.fixture
    def expected_retrieve_response(self, page_data):
        instance = page_data.first()
        return {
            "object_revision": object_revision_of(instance),
            "description": instance.description,
            "id": instance.id,
            "name": instance.name,
        }

    def update_expected_create_response(self, expected_create_response, new_instance):
        super().update_expected_create_response(expected_create_response, new_instance)
        expected_create_response["formatted_name"] = expected_create_response["name"]

    def update_expected_retrieve_response(self, expected_retrieve_response, instance):
        super().update_expected_retrieve_response(expected_retrieve_response, instance)
        expected_retrieve_response["formatted_name"] = expected_retrieve_response["name"]

    def update_expected_update_response(self, expected_update_response, updated_instance):
        super().update_expected_update_response(expected_update_response, updated_instance)
        expected_update_response["formatted_name"] = expected_update_response["name"]


class NoExtraFieldsTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """
    The distributor rows tests/store/migrations/0003_setup_lookup_test_data.py already inserted, plus a
    customer who may both list and retrieve distributors and notes -- the two viewsets
    TestNoExtraFieldsForViewSetMixin drives (one with a filterset_class, one without).

    Nothing is created here: the tests below make their own Note rows, and the distributors come from
    the migration, so this only needs to grant the permissions and hand back the lookup.
    """

    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "Note", "list"),
            ("store", "Note", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }

    def __init__(self):
        self.distributors = {obj.name: obj for obj in store_models.Distributor.objects.all()}


@pytest.mark.django_db
class TestNoExtraFieldsForViewSetMixin(BaseTestAssertResponseMixin):
    """
    DistributorViewSet declares a filterset_class; NoteViewSet does not. Together they cover
    both branches of NoExtraFieldsForViewSetMixin on both list and retrieve.
    """

    @pytest.fixture
    def test_data(self):
        return NoExtraFieldsTestData()

    @pytest.fixture
    def authenticated_client(self, api_client, test_data):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_list_with_filterset_class_accepts_valid_filter(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(reverse("store.distributor-list"), data={"name": distributor.name})

        self.assert_response(response, HTTPStatus.OK)
        assert [result["id"] for result in response.data["results"]] == [distributor.pk]

    def test_list_with_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        response = authenticated_client.get(reverse("store.distributor-list"), data={"nosuchparam": "1"})

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == ["Invalid query parameter.  Valid filters are id, name, name_icontains."]

    def test_retrieve_with_filterset_class_accepts_flex_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "name"},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["name"] == distributor.name

    def test_retrieve_with_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"nosuchparam": "1"},
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == ["Invalid query parameter.  Valid filters are e, f, om."]

    def test_retrieve_with_filterset_class_rejects_filterset_field(self, authenticated_client, test_data):
        """A filterset field name is only recognized on list; retrieve identifies its object by pk alone."""
        distributor = test_data.distributors["T-Shirt Corp."]
        response = authenticated_client.get(
            reverse("store.distributor-detail", kwargs={"pk": distributor.pk}),
            data={"name": distributor.name},
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["name"] == ["Invalid query parameter.  Valid filters are e, f, om."]

    def test_list_without_filterset_class_accepts_extra_allowed_param(self, authenticated_client, test_data):
        """
        NoteViewSet has no filterset_class and permits a list expand, so it can exercise all eight
        get_extra_allowed_fields() params as genuinely valid values, not just recognized keys.
        """
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)

        distributor = test_data.distributors["T-Shirt Corp."]
        note = store_models.Note.objects.create(
            content_type=ContentType.objects.get_for_model(store_models.Distributor),
            object_id=distributor.pk,
            text="A note about the distributor.",
        )

        query = {
            # NoteViewSet declares no `column_totals`, so the only value the totals param can carry
            # here is the empty one, which asks for nothing.
            settings.COLUMN_TOTALS_PARAM: "",
            settings.PAGE_QUERY_PARAM: 1,
            settings.PAGE_SIZE_QUERY_PARAM: 10,
            settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "content_object",
            settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "id,text,content_object.*",
            settings.REST_FLEX_FIELDS2["OMIT_PARAM"]: "text",
            settings.REST_FRAMEWORK["SEARCH_PARAM"]: "distributor",
            settings.REST_FRAMEWORK["ORDERING_PARAM"]: "object_id",
        }
        assert set(query) == set(store_viewsets.NoteViewSet().get_extra_allowed_fields()), (
            "query should exercise every param get_extra_allowed_fields() recognizes"
        )

        response = authenticated_client.get(reverse("store.note-list"), data=query)

        self.assert_response(response, HTTPStatus.OK)
        result = next(result for result in response.data["results"] if result["id"] == note.pk)
        assert "text" not in result
        assert result["content_object"]["id"] == distributor.pk

    def test_list_without_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        response = authenticated_client.get(reverse("store.note-list"), data={"nosuchparam": "1"})

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == [
            "Invalid query parameter.  Valid filters are ct, e, f, o, om, p, ps, s."
        ]

    def test_retrieve_without_filterset_class_accepts_flex_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        note = store_models.Note.objects.create(
            content_type=ContentType.objects.get_for_model(store_models.Distributor),
            object_id=distributor.pk,
            text="A note about the distributor.",
        )
        response = authenticated_client.get(
            reverse("store.note-detail", kwargs={"pk": note.pk}),
            data={settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]: "text"},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["text"] == note.text

    def test_retrieve_without_filterset_class_rejects_unrecognized_param(self, authenticated_client, test_data):
        distributor = test_data.distributors["T-Shirt Corp."]
        note = store_models.Note.objects.create(
            content_type=ContentType.objects.get_for_model(store_models.Distributor),
            object_id=distributor.pk,
            text="A note about the distributor.",
        )
        response = authenticated_client.get(
            reverse("store.note-detail", kwargs={"pk": note.pk}),
            data={"nosuchparam": "1"},
        )

        self.assert_response(response, HTTPStatus.BAD_REQUEST)
        assert response.data["nosuchparam"] == ["Invalid query parameter.  Valid filters are e, f, om."]


class TestExtraAllowedFieldsFollowsTheTotalsReader:
    """The totals parameter is recognized only where something reads it.

    `ListRowLevelViewSetMixin.list` is what validates the names the parameter carries and answers
    400 for an undeclared one. Recognizing it without that is the failure this mixin exists to
    prevent: any value accepted, nothing done with it, no error.

    None of these touch the database, so the class takes no fixtures.
    """

    def test_recognized_when_the_list_mixin_reads_it(self):
        assert settings.COLUMN_TOTALS_PARAM in store_viewsets.NoteViewSet().get_extra_allowed_fields()

    def test_not_recognized_without_the_list_mixin(self):
        class TotallessViewSet(NoExtraFieldsForViewSetMixin):
            """The shape the gate is for: strict parameters, but no `list` that reads totals."""

        assert not hasattr(TotallessViewSet, "get_declared_column_totals")
        assert settings.COLUMN_TOTALS_PARAM not in TotallessViewSet().get_extra_allowed_fields()

    def test_the_rest_of_the_parameters_are_unconditional(self):
        """Only the totals entry is gated; nothing else here depends on another mixin."""

        class TotallessViewSet(NoExtraFieldsForViewSetMixin):
            pass

        gated = set(store_viewsets.NoteViewSet().get_extra_allowed_fields())
        ungated = set(TotallessViewSet().get_extra_allowed_fields())

        assert gated - ungated == {settings.COLUMN_TOTALS_PARAM}
