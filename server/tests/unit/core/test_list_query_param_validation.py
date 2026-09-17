"""
List query parameter validation does not depend on the filterset parameter-name cache.

`NoExtraFieldsForViewSetMixin.list` asks `get_filterset_query_param_names` which parameters the
viewset's filterset accepts before it rejects the ones it does not recognize. Discovering those names
for a model-backed filterset must not build the view's queryset: `VuedaViewSet.get_queryset`
constructs a serializer, and that serializer rejects an over-deep expansion. Building it on a cache
miss and skipping it on a cache hit would make one request fail two different ways depending on what
an earlier request left in the cache.
"""

import gc
import weakref
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings as django_settings
from django.urls import reverse
from django_filters import rest_framework

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import cached_filterset_field_names
from tests.conftest import clear_cached_filterset_fields
from tests.conftest import response_body
from tests.store import filtersets as store_filtersets
from tests.store import models as store_models
from tests.store import viewsets as store_viewsets
from vueda.core import viewsets as core_viewsets


# The test settings cap expansion at four levels, so six segments exceed it.
TOO_DEEP_EXPAND = "customer.customer.customer.customer.customer.customer"

# An unrecognized parameter alongside an expansion the serializer rejects. Each of the two errors
# comes from a different stage of `list()`, so which one a response carries says which stage ran.
COMBINED_INVALID_PARAMS = {
    "unexpected": "1",
    django_settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: TOO_DEEP_EXPAND,
}


class ListValidationTestData(BaseTestUserMixin, BaseTestGroupMixin):
    """A user who may list and read carts, which is all the viewsets under test ask of a request."""

    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.fixture
def test_data():
    return ListValidationTestData()


@pytest.fixture
def authenticated_client(api_client, test_data):
    api_client.force_authenticate(user=test_data.users["test_customer_1@domain.invalid"])
    return api_client


@pytest.fixture(autouse=True)
def empty_filterset_name_cache():
    """
    Start and finish with an empty parameter-name cache, so what these tests see is what a fresh
    process would see, and what they leave behind does not decide what a later test sees.
    """
    core_viewsets._FILTERSET_QUERY_PARAM_NAMES.clear()
    yield
    core_viewsets._FILTERSET_QUERY_PARAM_NAMES.clear()


@pytest.mark.django_db
class TestListValidationIsCacheIndependent:
    """`CartEmptyFilterSetViewSet` authenticates only, so `list()` reaches its own validation."""

    @pytest.fixture(autouse=True)
    def empty_filterset_viewset_urls(self, settings):
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_empty_filterset"

    def test_an_empty_cache_rejects_the_unrecognized_parameter(self, authenticated_client):
        response = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "unexpected" in response.data, response_body(response)

    def test_a_populated_cache_returns_the_same_response(self, authenticated_client):
        empty_cache_response = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)

        populating_response = authenticated_client.get(reverse("store.cart-list"))
        assert populating_response.status_code == HTTPStatus.OK, response_body(populating_response)

        populated_cache_response = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)

        assert populated_cache_response.status_code == empty_cache_response.status_code
        assert populated_cache_response.data == empty_cache_response.data

    def test_a_repeated_failure_returns_the_same_response(self, authenticated_client):
        first = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)
        second = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)

        assert second.status_code == first.status_code
        assert second.data == first.data


@pytest.mark.django_db
class TestParameterNameDiscoveryBuildsNoQueryset:
    """A model-backed filterset names its own model, so discovery has no use for the view's queryset."""

    @pytest.fixture(autouse=True)
    def empty_filterset_viewset_urls(self, settings):
        settings.ROOT_URLCONF = "tests.unit.core.urls_cart_empty_filterset"

    @pytest.fixture(autouse=True)
    def get_queryset_calls(self, empty_filterset_viewset_urls, monkeypatch):
        # Django imports the URLconf the first time a test reverses one of its routes, and the router
        # asks the viewset it registers for a queryset. Reversing before the spy is installed keeps
        # that call out of the count.
        reverse("store.cart-list")

        calls = []
        get_queryset = store_viewsets.CartEmptyFilterSetViewSet.get_queryset

        def counting_get_queryset(viewset):
            calls.append(viewset.action)
            return get_queryset(viewset)

        monkeypatch.setattr(store_viewsets.CartEmptyFilterSetViewSet, "get_queryset", counting_get_queryset)
        return calls

    def test_rejecting_an_unrecognized_parameter_builds_no_queryset(self, authenticated_client, get_queryset_calls):
        response = authenticated_client.get(reverse("store.cart-list"), data={"unexpected": "1"})

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert get_queryset_calls == []

    def test_a_successful_list_builds_one_queryset_on_a_cache_miss(self, authenticated_client, get_queryset_calls):
        response = authenticated_client.get(reverse("store.cart-list"))

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert get_queryset_calls == ["list"]


@pytest.mark.django_db
class TestListValidationUnderObjectPermissions:
    """
    The default Cart permissions keep the behavior they have.

    `ObjectPermissions` builds the queryset from `initial()`, so the combined invalid request fails on
    the expansion depth before `list()` runs. That is the same in both cache states.
    """

    @staticmethod
    def assert_expansion_depth_error(response):
        """
        The error `get_queryset` raises, which under these permissions can only come from the check
        `initial()` runs. `list()` rejects `unexpected` before it builds a serializer, so this error
        proves the request never reached the handler.
        """
        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert set(response.data) == {"non_field_errors", "serverStack"}, response_body(response)
        assert response.data["non_field_errors"] == ["Expansion depth exceeded"], response_body(response)

    def test_both_cache_states_report_the_expansion_depth(self, authenticated_client):
        empty_cache_response = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)
        self.assert_expansion_depth_error(empty_cache_response)

        populating_response = authenticated_client.get(reverse("store.cart-list"))
        assert populating_response.status_code == HTTPStatus.OK, response_body(populating_response)

        populated_cache_response = authenticated_client.get(reverse("store.cart-list"), data=COMBINED_INVALID_PARAMS)
        self.assert_expansion_depth_error(populated_cache_response)


@pytest.mark.django_db
class TestFilterSetQueryParamNameCache:
    def test_a_filterset_built_at_runtime_is_collectable(self):
        """
        The cache holds its keys weakly, so a filterset class composed per view or per test is freed
        once the code that made it drops it.
        """
        dynamic_filterset_class = type(
            "DynamicCartFilterSet",
            (rest_framework.FilterSet,),
            {"Meta": type("Meta", (), {"model": store_models.Cart, "fields": []})},
        )
        reference = weakref.ref(dynamic_filterset_class)

        core_viewsets.get_filterset_query_param_names(dynamic_filterset_class, store_models.Cart.objects.all)

        del dynamic_filterset_class
        gc.collect()

        assert reference() is None

    def test_discovery_caches_no_form_field_on_the_filterset_class(self):
        """
        Discovery reads each filter from a filterset instance, whose filters are per-request copies,
        so it leaves no form field on the class-level filter every request shares. A field cached
        there would freeze an `AllValuesMultipleFilter`'s choices at whatever the first request that
        populated the cache saw, and later values would be rejected as invalid choices.
        """
        clear_cached_filterset_fields(store_filtersets.ProductFilterSet)

        names = core_viewsets.get_filterset_query_param_names(
            store_filtersets.ProductFilterSet, store_models.Product.objects.all
        )

        assert "distributor" in names
        assert cached_filterset_field_names(store_filtersets.ProductFilterSet) == []
