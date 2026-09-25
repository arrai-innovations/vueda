import datetime
from http import HTTPStatus
from typing import ClassVar
from unittest.mock import MagicMock

import pytest
from django.conf import settings
from django.db import connection
from django.db.models import Count
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import cached_filterset_field_names
from tests.conftest import clear_cached_filterset_fields
from tests.conftest import response_body
from tests.store import filtersets as store_filtersets
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.utils import create_test_data
from vueda import info
from vueda.core import viewsets as core_viewsets
from vueda.core.filters import SEARCH_LOOKUP_PREFIX
from vueda.core.filters import TRIGRAM_SIMILAR_PREFIX
from vueda.core.filters import TRIGRAM_WORD_SIMILAR_PREFIX
from vueda.core.filters import VuedaSearchFilterBackend


class VuedaTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("store", "Cart", "list"),
            ("store", "Distributor", "list"),
            ("store", "Product", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        # These two are needed by create_test_data, which attaches a customer to each of them.
        # Nothing here authenticates as them, so they need no group of their own.
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


@pytest.mark.django_db
class TestModelInfoChoices:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)

    def test_filtering_range(self, test_data, api_client):
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse("store.cart-list"),
            data={"last_modified_after": "2024-08-01", "last_modified_before": "2024-09-01"},
            format="json",
        )
        assert response.data["totalRecords"] == 1, response_body(response)

        response = api_client.get(
            reverse("store.cart-list"),
            data={"last_modified_after": "2024-10-01", "last_modified_before": "2024-11-01"},
            format="json",
        )

        assert response.data["totalRecords"] == 0, response_body(response)

    def test_filtering_choices(self, test_data, api_client):
        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Vibrant Looks Inc."},
            format="json",
        )

        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        assert frozenset(x["name"] for x in response.data["results"]) == frozenset({"Spray Paint", "Paint"})

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Tasty Treats"},  # Tasty Treats Assoc. would work.
            format="json",
        )

        for err in response.data["distributor"]:
            assert str(err) == "Select a valid choice. Tasty Treats is not one of the available choices.", (
                response_body(response)
            )

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_name": "Men's White T-Shirt"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, response_body(response)
        cart_item_pks = frozenset([x.pk for x in test_data.carts["test_customer_1@domain.invalid"]["cart_items"]])
        for result in response.data["results"]:
            assert frozenset(result["cart_items"]) == cart_item_pks

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_quantity": "4"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, response_body(response)
        cart_item_pks = frozenset([x.pk for x in test_data.carts["test_customer_2@domain.invalid"]["cart_items"]])
        for result in response.data["results"]:
            assert frozenset(result["cart_items"]) == cart_item_pks

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_quantity": "24"},
            format="json",
        )

        for err in response.data["product_quantity"]:
            assert str(err) == "Select a valid choice. 24 is not one of the available choices.", response_body(response)


@pytest.mark.django_db
class TestValueDerivedFilterChoicesStayFresh:
    """
    `AllValuesFilter` and `AllValuesMultipleFilter` read their choices out of the column each time
    their form field is built, so the choices are only current while that field is built per request.

    `Filter.field` caches the field it builds on the filter it is read from, and
    `FilterSet.get_filters()` is a classmethod handing back the filter objects declared on the class
    itself, which every request shares. Reading `.field` from there caches the choices of the first
    request the process handles onto shared state, and every later request — including the real
    filtering DRF does through `filterset.filters` copies, which are deep-copied from those same
    class-level filters — reuses that stale snapshot. Read the filters from a filterset instance
    instead.
    """

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @pytest.fixture(autouse=True)
    def fresh_filterset_class(self):
        """
        Start from, and leave behind, the state a fresh process would be in, so these tests fail on a
        regression regardless of which tests ran before them in this worker.

        The parameter-name cache is cleared alongside the filters: a populated cache would skip the
        filterset instantiation these tests are here to watch.
        """
        clear_cached_filterset_fields(store_filtersets.ProductFilterSet)
        core_viewsets._FILTERSET_QUERY_PARAM_NAMES.clear()
        yield
        clear_cached_filterset_fields(store_filtersets.ProductFilterSet)
        core_viewsets._FILTERSET_QUERY_PARAM_NAMES.clear()

    def test_list_caches_no_form_field_on_the_filterset_class(self, test_data, api_client):
        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])

        response = api_client.get(reverse("store.product-list"), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert cached_filterset_field_names(store_filtersets.ProductFilterSet) == []

    def test_values_added_after_a_list_request_are_still_filterable(self, test_data, api_client):
        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])

        response = api_client.get(reverse("store.product-list"), format="json")
        assert response.status_code == HTTPStatus.OK, response_body(response)

        distributor = store_models.Distributor.objects.create(
            name="Late Arrival Ltd.",
            description="Added after the first list request of this process.",
        )
        store_models.Product.objects.create(
            distributor=distributor,
            name="Late Arrival Paint",
            order_between=[1, 2],
            tangible_type=test_data.tangible_type["physical"],
        )

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Late Arrival Ltd."},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [result["name"] for result in response.data["results"]] == ["Late Arrival Paint"]


@pytest.mark.django_db
class TestTrigramSimilarFilter:
    similarity_threshold_default = 0.3
    # similarity('Vibrant', 'Vibrant Looks Inc.') = 0.444444
    similarity_threshold_failing_close = 0.5

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorTrigramSimilarViewSet)

    def test_trigram_similar_exact_match(self, test_data, api_client, settings):
        """name_similar filter matches exact names via trigram_similar lookup."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant Looks Inc."},
            format="json",
        )
        assert response.data["totalRecords"] == 1, response_body(response)
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

    def test_trigram_similar_close_match(self, test_data, api_client, settings):
        """name_similar filter matches names with minor differences."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, response_body(response)
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.similarity_threshold = %s", [self.similarity_threshold_failing_close])

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.similarity_threshold = %s", [self.similarity_threshold_default])

    def test_trigram_similar_no_match(self, test_data, api_client, settings):
        """name_similar filter returns no results when nothing is similar."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

    def test_trigram_similar_no_filter_returns_all(self, test_data, api_client, settings):
        """When name_similar is omitted the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 5, response_body(response)  # noqa: PLR2004


@pytest.mark.django_db
class TestTrigramWordSimilarFilter:
    similarity_word_threshold_default = 0.6
    # word_similarity('Vibran', 'Vibrant') = 0.85714287
    similarity_word_threshold_failing_close = 0.9

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorTrigramWordSimilarViewSet)

    def test_trigram_word_similar_exact_match(self, test_data, api_client, settings):
        """Exact name matches via trigram_word_similar lookup."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant Looks Inc."},
            format="json",
        )
        assert response.data["totalRecords"] == 1, response_body(response)
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

    def test_trigram_word_similar_word_match(self, test_data, api_client, settings):
        """Single word matches within a longer field value via trigram_word_similar."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibran"},
            format="json",
        )
        assert response.data["totalRecords"] == 1, response_body(response)
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.word_similarity_threshold = %s", [self.similarity_word_threshold_failing_close])

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibran"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.word_similarity_threshold = %s", [self.similarity_word_threshold_default])

    def test_trigram_word_similar_no_match(self, test_data, api_client, settings):
        """Search with no word similarity returns no results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

    def test_trigram_word_similar_no_filter_returns_all(self, test_data, api_client, settings):
        """When no search term is provided the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 5, response_body(response)  # noqa: PLR2004


@pytest.mark.django_db
class TestVuedaRankedSearchFilter:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorRankedSearchViewSet)

    def test_ranked_search_ranked_order(self, test_data, api_client, settings):
        """Results are ordered by combined rank, not alphabetically."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_search"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        # "Vibrant" Looks Inc.: A Sprinkle Of "Vibrant" Colour In Your Life. - combined_rank: 1.6431320905685425
        # T-Shirt Corp.: From the "Vibrant" T-Shirts To The Hoodie." - combined_rank: 1.242610901594162
        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

    def test_ranked_search_no_match(self, test_data, api_client, settings):
        """Search with no similarity returns no results (all below threshold)."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_search"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

    def test_ranked_search_no_filter_returns_all(self, test_data, api_client, settings):
        """When no search term is provided the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_search"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 5, response_body(response)  # noqa: PLR2004


@pytest.mark.django_db
class TestVuedaRankedDescriptionFilter:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorRankedDescriptionViewSet)

    def test_ranked_description_name_filter_with_search(self, test_data, api_client, settings):
        """Combining name_icontains='Treat' with a description search narrows and ranks results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={
                "name_icontains": "Treat",
                settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Treat",
            },
            format="json",
        )
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004

        # Treat King LLC. - combined_rank: 1.203649863600731
        # Tasty Treats Assoc. - combined_rank: 1.174351543188095
        assert [x["name"] for x in response.data["results"]] == ["Treat King LLC.", "Tasty Treats Assoc."]

    def test_ranked_description_no_match(self, test_data, api_client, settings):
        """Search with no similarity in descriptions returns no results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

    def test_name_filter_no_match(self, test_data, api_client, settings):
        """Search with no similarity in descriptions returns no results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={"name_icontains": "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, response_body(response)

    def test_ranked_description_no_filter_returns_all(self, test_data, api_client, settings):
        """When no search term is provided the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 5, response_body(response)  # noqa: PLR2004


@pytest.mark.django_db
class TestVuedaSearchFilterDistinct:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductM2MSearchViewSet)

    def test_m2m_search_deduplicates_results(self, test_data, api_client, settings):
        """A search across an M2M field returns each matching product once.

        Two products each have three special_care entries: perishable, temperature_controlled,
        and fragile. Searching for 'Perishable Fragile' matches two special_care entries
        per product. VuedaSearchFilterBackend keeps the M2M join inside a subquery, so the
        list holds one row per product.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.product-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Perishable Fragile"},
            format="json",
        )

        # Two products have both "perishable" and "fragile" special_care entries, each matching
        # through two M2M rows of equal rank.
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        result_names = frozenset(x["name"] for x in response.data["results"])
        assert result_names == frozenset({"Square Cookies For Squares", "Shaped Cookies For Drapes"})

    def test_reverse_fk_search_with_unequal_ranks_returns_one_row_per_object(self, test_data, api_client, settings):
        """A ranked search returns one row per cart when a cart's matching items score different ranks.

        The search matches two cart items in each cart: "Medium" and "Small" in the first cart, "Gentle
        Cinnamon" and "Sweet Sugar" in the second. Each joined row scores its own rank, so the two rows
        for one cart differ in rank. The rows come back ordered by the best rank each cart reaches, and
        the first cart's best match outranks the second cart's.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartM2MSearchOrderingViewSet)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Small Medium Sugar Cinnamon"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        assert [result["id"] for result in response.data["results"]] == [
            test_data.carts["test_customer_1@domain.invalid"]["cart"].pk,
            test_data.carts["test_customer_2@domain.invalid"]["cart"].pk,
        ], response_body(response)

    def test_reverse_fk_search_ranks_each_object_by_its_best_row(self, test_data, api_client, settings):
        """A ranked search orders objects by the best rank each one reaches.

        The second cart gains a "Sugar Cinnamon" item, which matches two search terms and outranks every
        item in the first cart. The second cart's other items still rank below the first cart's items,
        so the second cart leads only when each cart ranks by its best row.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_ordering"

        second_cart = test_data.carts["test_customer_2@domain.invalid"]["cart"]
        product_option = store_models.ProductOption.objects.create(
            product=test_data.products["Square Cookies For Squares"]["product"],
            name="Sugar Cinnamon",
            sku="SUGAR-CINNAMON",
            gtin="SUGAR-CINNAMON",
        )
        store_models.CartItem.objects.create(cart=second_cart, product_option=product_option, quantity=1)

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartM2MSearchOrderingViewSet)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Small Medium Sugar Cinnamon"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [result["id"] for result in response.data["results"]] == [
            second_cart.pk,
            test_data.carts["test_customer_1@domain.invalid"]["cart"].pk,
        ], response_body(response)

    def test_reverse_fk_search_keeps_an_object_with_one_row_over_the_threshold(self, test_data, api_client, settings):
        """A ranked search keeps an object when at least one of its matching rows reaches the threshold.

        "Explosive Dynamite" is the only cart item that matches "Dynamite", and it sits in the second
        cart beside two items that score below the threshold. The first cart has no item that reaches
        it.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartM2MSearchOrderingViewSet)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Dynamite"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [result["id"] for result in response.data["results"]] == [
            test_data.carts["test_customer_2@domain.invalid"]["cart"].pk
        ], response_body(response)

    def test_m2m_search_does_not_inflate_column_totals(self, test_data, api_client, settings):
        """A column total counts a matched row once, not once per joined row.

        The search matches two special_care entries per product. A `SUM` over the joined rows would
        count each product's quantity twice. `vueda_info.E011` does not cover this case: `quantity` is
        a column on Product itself, and the join comes from the search rather than from the declared
        path.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search_totals"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        info.registration.get_empty_registry()
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductM2MSearchColumnTotalsViewSet)

        matched = store_models.Product.objects.filter(
            name__in=["Square Cookies For Squares", "Shaped Cookies For Drapes"]
        )
        assert matched.count() == 2, "the two products the search matches"  # noqa: PLR2004
        matched.filter(name="Square Cookies For Squares").update(quantity=7)
        matched.filter(name="Shaped Cookies For Drapes").update(quantity=11)

        response = api_client.get(
            reverse("store.product-list"),
            data={
                settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Perishable Fragile",
                settings.COLUMN_TOTALS_PARAM: "quantity",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        # 7 + 11, each counted once. Summed over the joined rows it would be 36.
        assert response.data["columnTotals"] == {"quantity": 18}, response_body(response)

    def test_m2m_search_does_not_inflate_an_annotation_total(self, test_data, api_client, settings):
        """An annotation total is deduplicated too, by a different route than a column total.

        An annotation cannot be moved onto the rows re-selected by primary key -- the expressions on
        a queryset are resolved against it and carry its table aliases -- so it is summed over a
        distinct `(pk, value)` subquery instead. Both routes have to survive the same M2M join, and
        a request naming one of each has to come back with both un-multiplied.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search_totals"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        info.registration.get_empty_registry()
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductM2MSearchColumnTotalsViewSet)

        matched = store_models.Product.objects.filter(
            name__in=["Square Cookies For Squares", "Shaped Cookies For Drapes"]
        )
        matched.filter(name="Square Cookies For Squares").update(quantity=7)
        matched.filter(name="Shaped Cookies For Drapes").update(quantity=11)

        response = api_client.get(
            reverse("store.product-list"),
            data={
                settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Perishable Fragile",
                settings.COLUMN_TOTALS_PARAM: "*",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        # 7 + 11 counted once each, and twice that for the annotation. Summed over the joined rows
        # they would be 36 and 72.
        assert response.data["columnTotals"] == {"quantity": 18, "double_quantity": 36}, response_body(response)

    def test_m2m_ordering_search_deduplicates_results(self, test_data, api_client, settings):
        """A search across an M2M field returns each matching product once.

        Two products each have three special_care entries: perishable, temperature_controlled,
        and fragile. Searching for 'Perishable Fragile' matches two special_care entries
        per product. VuedaSearchFilterBackend keeps the M2M join inside a subquery, so the
        list holds one row per product.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.product-list"),
            data={
                settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Perishable Fragile",
                settings.REST_FRAMEWORK["ORDERING_PARAM"]: "formatted_name",
            },
            format="json",
        )

        # Two products have both "perishable" and "fragile" special_care entries, each matching
        # through two M2M rows of equal rank.
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        result_names = [x["name"] for x in response.data["results"]]
        assert result_names == ["Shaped Cookies For Drapes", "Square Cookies For Squares"]

        response = api_client.get(
            reverse("store.product-list"),
            data={
                settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Perishable Fragile",
                settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-formatted_name",
            },
            format="json",
        )

        # Two products have both "perishable" and "fragile" special_care entries, each matching
        # through two M2M rows of equal rank.
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        result_names = [x["name"] for x in response.data["results"]]
        assert result_names == ["Square Cookies For Squares", "Shaped Cookies For Drapes"]


@pytest.mark.django_db
class TestMixedRankedAndWordSimilarSearch:
    """Tests for mixing V: (ranked) and ~ (trigram word similar) search prefixes.

    Bug: filter_queryset only splits out V: (__vueda_search) and # (__trigram_similar)
    prefixed lookups. The ~ prefix produces __trigram_word_similar, which doesn't
    match either suffix check, so it falls into det_lookups. This causes two problems:

    1. The ~ field is filtered with AND-across-terms instead of combining terms
       into a single trigram_word_similar check.
    2. It receives a flat deterministic_score boost (10 per match) instead of
       contributing actual similarity scores to combined_rank.
    """

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(
            store_serializers.DistributorSerializer,
            store_viewsets.DistributorMixedRankedAndWordSimilarViewSet,
        )

    def test_word_similar_field_not_classified_as_deterministic(self):
        """The ~ prefix should not end up in det_lookups when mixed with V: fields.

        construct_search turns ~description into description__trigram_word_similar.
        The splitting logic must recognize this suffix separately from
        __trigram_similar (the # prefix) so it doesn't fall into det_lookups.
        """
        backend = VuedaSearchFilterBackend()

        v_suffix = f"__{backend.customized_lookup_prefixes[SEARCH_LOOKUP_PREFIX]}"
        trig_suffix = f"__{backend.customized_lookup_prefixes[TRIGRAM_SIMILAR_PREFIX]}"
        trig_word_suffix = f"__{backend.customized_lookup_prefixes[TRIGRAM_WORD_SIMILAR_PREFIX]}"

        word_similar_lookup = backend.construct_search("~description", None)
        assert word_similar_lookup == "description__trigram_word_similar"

        # ~ must match the trigram_word_similar suffix, not fall through
        assert not word_similar_lookup.endswith(v_suffix), "sanity: not a V: lookup"
        assert not word_similar_lookup.endswith(trig_suffix), "sanity: not a # lookup"
        assert word_similar_lookup.endswith(trig_word_suffix)

    def test_mixed_multi_term_combines_for_word_similar(self, test_data, api_client, settings):
        """Multi-term search combines terms into a single trigram_word_similar
        check rather than AND'ing each term independently.

        search_fields = ["V:name", "~description"], search = "Treat Sugar"

        Before the fix, ~ landed in det_lookups, which AND'd terms:
        description__trigram_word_similar="Treat" AND
        description__trigram_word_similar="Sugar". Only distributors where
        BOTH words independently pass word_similarity would survive.

        After the fix, ~ combines terms: description__trigram_word_similar="Treat Sugar".
        The combined phrase is checked as a single trigram_word_similar filter.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_mixed_ranked_word_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        # "Treat" matches V:name for "Treat King LLC." and "Tasty Treats Assoc."
        # Both also have "Treat" in their descriptions, passing ~description.
        # "Sugar" appears in Tasty Treats Assoc. description ("Glorious Sugar")
        # and Treat King LLC. description ("Sugary").
        # With combined terms: "Treat Sugar" as a single string is checked
        # via word_similarity against each description.
        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Treat Sugar"},
            format="json",
        )
        # Both treat distributors match V:name for "Treat" and their descriptions
        # should pass trigram_word_similar for the combined "Treat Sugar".
        assert response.data["totalRecords"] >= 1, (
            f"Expected results where V:name matches 'Treat' and description "
            f"passes trigram_word_similar for combined 'Treat Sugar'. "
            f"response.data: {response.data}"
        )

    def test_mixed_single_term_filters_by_word_similar(self, test_data, api_client, settings):
        """Single-term search where ~description acts as a hard filter,
        narrowing results to rows passing trigram_word_similar on description,
        then V:name ranks the survivors.

        "Vibrant" appears in two descriptions:
        - Vibrant Looks Inc.: "A Sprinkle Of Vibrant Colour In Your Life..."
        - T-Shirt Corp.: "Shirts For The World. From The Vibrant T-Shirt To The Hoodie."

        The trigram_word_similar threshold (default 0.6) determines which pass.
        Vibrant Looks has "Vibrant" as a prominent word (high word_similarity).
        T-Shirt Corp. has "Vibrant" embedded in a longer description (may or
        may not pass depending on threshold).
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_mixed_ranked_word_similar"

        user = test_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )
        # At minimum, Vibrant Looks Inc. should match via both V:name and ~description
        assert response.data["totalRecords"] >= 1, response_body(response)
        result_names = [x["name"] for x in response.data["results"]]
        assert "Vibrant Looks Inc." in result_names


@pytest.mark.django_db
class TestMultiValuedSearchPkTieBreaker:
    """A ranked search through a multi-valued relation breaks ties by primary key, so objects that tie
    on the ordering come back in a stable order, whether the list is sorted by rank or by a requested
    ordering."""

    @staticmethod
    def search_carts(ordering):
        request = MagicMock()
        request.query_params = {
            settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Small Medium Sugar Cinnamon",
            settings.REST_FRAMEWORK["ORDERING_PARAM"]: ordering,
        }
        view = MagicMock()
        view.search_fields = ["V:cart_items__product_option__name"]
        queryset = store_models.Cart.objects.order_by(ordering)
        return VuedaSearchFilterBackend().filter_queryset(request, queryset, view)

    @pytest.mark.parametrize("ordering", ["expected_delivery_time", "-expected_delivery_time", "customer"])
    def test_requested_ordering_breaks_ties_by_pk(self, ordering):
        assert self.search_carts(ordering).query.order_by == (ordering, "pk")

    @pytest.mark.parametrize("ordering", ["pk", "-pk", "id", "-id"])
    def test_requested_ordering_by_pk_gets_no_second_pk(self, ordering):
        assert self.search_carts(ordering).query.order_by == (ordering,)

    def test_rank_ordering_breaks_ties_by_pk(self):
        """The final ORDER BY includes pk when mcd=True and no ordering parameter is sent."""
        from unittest.mock import MagicMock
        from unittest.mock import patch

        from tests.store.models import Product

        backend = VuedaSearchFilterBackend()
        queryset = Product.objects.all()

        # Mock request with a search term but no ordering param
        request = MagicMock()
        request.query_params = {"s": "test"}

        # Mock view with M2M search field (triggers must_call_distinct=True)
        view = MagicMock()
        view.search_fields = ["V:special_care__field_that_contains_the_name"]

        with patch.object(backend, "must_call_distinct", return_value=True):
            result_qs = backend.filter_queryset(request, queryset, view)

        order_by = result_qs.query.order_by
        assert order_by == ("-combined_rank", "pk"), order_by


@pytest.mark.django_db
class TestSearchKeepsQuerysetAggregates:
    """A ranked search leaves the aggregates already on the queryset unchanged.

    A viewset can hand the search backend a queryset that already counts or sums over a relation. A
    search reaching through a multi-valued relation joins one row per matching related row, and an
    aggregate computed over those joined rows counts each of its own rows once per match. Each object
    should report the same aggregate with and without the search.
    """

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def search(queryset, search_field, terms, ordering=None):
        request = MagicMock()
        request.query_params = {settings.REST_FRAMEWORK["SEARCH_PARAM"]: terms}
        if ordering is not None:
            request.query_params[settings.REST_FRAMEWORK["ORDERING_PARAM"]] = ordering
            queryset = queryset.order_by(ordering)

        view = MagicMock()
        view.search_fields = [search_field]
        return VuedaSearchFilterBackend().filter_queryset(request, queryset, view)

    @pytest.mark.parametrize(
        ("model", "aggregate_path", "search_field", "terms", "ordering"),
        [
            pytest.param(
                store_models.Product,
                "product_options",
                "V:special_care__field_that_contains_the_name",
                "Perishable Fragile",
                None,
                id="other-relation-equal-ranks",
            ),
            pytest.param(
                store_models.Product,
                "product_options",
                "V:special_care__field_that_contains_the_name",
                "Perishable Fragile",
                "name",
                id="other-relation-requested-ordering",
            ),
            pytest.param(
                store_models.Product,
                "product_options",
                f"{TRIGRAM_SIMILAR_PREFIX}special_care__field_that_contains_the_name",
                "Perishable Fragile",
                None,
                id="other-relation-trigram",
            ),
            pytest.param(
                store_models.Cart,
                "cart_items",
                "V:cart_items__product_option__name",
                "Small Medium Sugar Cinnamon",
                None,
                id="searched-relation-unequal-ranks",
            ),
            pytest.param(
                store_models.Cart,
                "customer__customerorder",
                "V:cart_items__product_option__name",
                "Small Medium Sugar Cinnamon",
                None,
                id="other-relation-unequal-ranks",
            ),
        ],
    )
    def test_search_keeps_a_count_annotation(self, test_data, model, aggregate_path, search_field, terms, ordering):
        queryset = model.objects.annotate(related_count=Count(aggregate_path))
        expected = dict(queryset.values_list("pk", "related_count"))

        results = list(self.search(queryset, search_field, terms, ordering))

        assert results, "the search matches at least one object"
        assert {obj.pk: obj.related_count for obj in results} == {obj.pk: expected[obj.pk] for obj in results}

    @pytest.mark.parametrize(
        "ordering",
        [
            pytest.param(None, id="rank-ordering"),
            pytest.param("expected_delivery_time", id="requested-ordering"),
        ],
    )
    def test_list_searches_a_viewset_whose_queryset_sums_a_relation(self, test_data, api_client, settings, ordering):
        """A list request searches a viewset whose queryset carries `Sum("cart_items__quantity")`.

        The aggregate gives the queryset a `GROUP BY`, and the search through `cart_items` joins one
        row per matching cart item. The request succeeds and returns each cart once, whether the results
        are ordered by rank or by an ordering the client requested.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_aggregate"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartM2MSearchAggregateViewSet)

        data = {settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Small Medium Sugar Cinnamon"}
        if ordering is not None:
            data[settings.REST_FRAMEWORK["ORDERING_PARAM"]] = ordering

        response = api_client.get(reverse("store.cart-list"), data=data, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        assert sorted(result["id"] for result in response.data["results"]) == sorted(
            cart["cart"].pk for cart in test_data.carts.values()
        ), response_body(response)


@pytest.mark.django_db
class TestSearchKeepsTheResolvedOrdering:
    """A searched list that reaches through a multi-valued relation keeps the ordering
    `VuedaOrderingFilter` resolved.

    `VuedaSearchFilterBackend` runs after `VuedaOrderingFilter`. When a search joins a multi-valued
    relation, the backend returns the ordered queryset narrowed to the matching objects, so the
    ordering is the one the ordering filter built: a related model's `formatted_name` rewritten to
    the column behind it, and a field with a declared `nulls_ordering` placement turned into an
    `F(...).asc(nulls_first=True)` expression.

    Both carts `create_test_data` builds hold more than one cart item, so every one of these searches
    matches a cart through several rows.
    """

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartM2MSearchOrderingViewSet)

    # Matches two cart items in each cart: "Medium" and "Small" in the first, "Gentle Cinnamon" and
    # "Sweet Sugar" in the second.
    SEARCH_TERMS = "Small Medium Sugar Cinnamon"

    def list_carts(self, api_client, settings, ordering):
        return api_client.get(
            reverse("store.cart-list"),
            data={
                settings.REST_FRAMEWORK["SEARCH_PARAM"]: self.SEARCH_TERMS,
                settings.REST_FRAMEWORK["ORDERING_PARAM"]: ordering,
            },
            format="json",
        )

    def test_ordering_by_a_related_formatted_name_uses_the_column_behind_it(self, test_data, api_client, settings):
        """Customer reaches its formatted name through
        `formatted_name_lookup_expression = "data__formatted_name"`, so the list sorts by
        `customer__data__formatted_name`."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        self.register_viewsets()

        response = self.list_carts(api_client, settings, "customer.formatted_name")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        # One row per cart rather than one per matching cart item.
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        # `customer_data.formatted_name` is the customer's user email, so this is the order the
        # rewritten path sorts by.
        emails = [
            store_models.Cart.objects.get(pk=result["id"]).customer.user.email for result in response.data["results"]
        ]
        assert emails == ["test_customer_1@domain.invalid", "test_customer_2@domain.invalid"]

        response = self.list_carts(api_client, settings, "-customer.formatted_name")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        emails = [
            store_models.Cart.objects.get(pk=result["id"]).customer.user.email for result in response.data["results"]
        ]
        assert emails == ["test_customer_2@domain.invalid", "test_customer_1@domain.invalid"]

    def test_ordering_keeps_the_declared_nulls_placement(self, test_data, api_client, settings):
        """`nulls_ordering = {"expected_delivery_time": "first"}` puts the cart with no delivery time
        first, where a plain ascending sort would put it last."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_ordering"

        # `create_test_data` leaves every cart's `expected_delivery_time` null, so one is given a
        # value: with two nulls there would be no placement to observe.
        first_cart = test_data.carts["test_customer_1@domain.invalid"]["cart"]
        first_cart.expected_delivery_time = datetime.timedelta(hours=2)
        first_cart.save()

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        self.register_viewsets()

        response = self.list_carts(api_client, settings, "expected_delivery_time")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        # The null-valued cart leads, which is the placement the viewset declared rather than the
        # ascending default.
        assert response.data["results"][0]["id"] == test_data.carts["test_customer_2@domain.invalid"]["cart"].pk
        assert response.data["results"][1]["id"] == first_cart.pk


@pytest.mark.django_db
class TestSearchKeepsAnyOrdering:
    """A searched list that reaches through a multi-valued relation sorts by any ordering the same list
    sorts by without a search.

    The search keeps its joins inside a subquery, so the ordering applies to a queryset with one row
    per object. An ordering that expands to more than a single column, such as a relation whose
    related model declares its own `Meta.ordering`, sorts the searched list the same way.
    """

    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    # Matches two special_care entries on each of the two products that carry them.
    PRODUCT_SEARCH_TERMS = "Perishable Fragile"
    # Widened to reach the two products under a second distributor, so an ordering by distributor has
    # more than one value to sort.
    MULTI_DISTRIBUTOR_SEARCH_TERMS = "Perishable Fragile Dangerous"
    CART_SEARCH_TERMS = "Small Medium Sugar Cinnamon"

    @staticmethod
    def list_url(api_client, settings, url_name, terms, ordering=None):
        data = {settings.REST_FRAMEWORK["SEARCH_PARAM"]: terms}
        if ordering is not None:
            data[settings.REST_FRAMEWORK["ORDERING_PARAM"]] = ordering

        return api_client.get(reverse(url_name), data=data, format="json")

    def test_a_default_ordering_over_a_function_gives_way_to_rank(self, test_data, api_client, settings):
        """`ordering = [Lower("name")]` is the viewset's default, and a search that sends no `?o=`
        sorts by rank instead."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search_function_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(
            store_serializers.ProductSerializer,
            store_viewsets.ProductM2MSearchFunctionOrderingViewSet,
        )

        response = self.list_url(api_client, settings, "store.product-list", self.PRODUCT_SEARCH_TERMS)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        # Both products score the same rank, so the primary key orders them.
        ids = [result["id"] for result in response.data["results"]]
        assert ids == sorted(ids), response_body(response)

    def test_a_relation_whose_related_model_orders_itself_is_kept(
        self,
        test_data,
        api_client,
        settings,
    ):
        """`Customer` declares `ordering = ["user__name"]`, so `?o=customer` sorts carts by their
        customer's user name."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_relation_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(
            store_serializers.CartSerializer,
            store_viewsets.CartM2MSearchRelationOrderingViewSet,
        )

        def customer_names(ordering):
            response = self.list_url(api_client, settings, "store.cart-list", self.CART_SEARCH_TERMS, ordering)

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
            return [
                store_models.Cart.objects.get(pk=result["id"]).customer.user.name for result in response.data["results"]
            ]

        assert customer_names("customer") == ["Test Customer 1", "Test Customer 2"]
        assert customer_names("-customer") == ["Test Customer 2", "Test Customer 1"]

    def test_a_relation_whose_related_model_declares_no_ordering_is_kept(
        self,
        test_data,
        api_client,
        settings,
    ):
        """`Distributor` declares no `Meta.ordering`, so `?o=distributor` sorts products by the local
        foreign key column."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search_relation_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(
            store_serializers.ProductSerializer,
            store_viewsets.ProductM2MSearchRelationOrderingViewSet,
        )

        def distributor_ids(ordering):
            response = self.list_url(
                api_client,
                settings,
                "store.product-list",
                self.MULTI_DISTRIBUTOR_SEARCH_TERMS,
                ordering=ordering,
            )

            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert response.data["totalRecords"] == 4, response_body(response)  # noqa: PLR2004
            return [
                store_models.Product.objects.get(pk=result["id"]).distributor_id for result in response.data["results"]
            ]

        ascending = distributor_ids("distributor")
        descending = distributor_ids("-distributor")

        assert ascending == sorted(ascending)
        assert descending == sorted(descending, reverse=True)
        # Two distributors among the matched rows, so the two directions really do differ. Without
        # this the assertions above would hold for any order at all.
        assert len(frozenset(ascending)) == 2, ascending  # noqa: PLR2004
        assert ascending != descending


class CartRelatedFormattedNameTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("store", "Cart", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_admin@domain.invalid": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
    }


@pytest.fixture
def cart_related_formatted_name_data():
    from django.contrib.auth import get_user_model

    data = CartRelatedFormattedNameTestData()

    def make_cart(email):
        user = get_user_model().objects.create(email=email, name=email, is_active=True)
        customer = store_models.Customer.objects.create(user=user)
        return store_models.Cart.objects.create(customer=customer)

    # `customer_data.formatted_name` is the customer's user email, so these are the values the
    # filters below match against.
    make_cart("apple@domain.invalid")
    make_cart("banana@domain.invalid")
    make_cart("cherry@domain.invalid")
    return data


@pytest.mark.django_db
class TestFilteringOnRelatedFormattedName:
    """CartRelatedFormattedNameFilterSet declares filters against `customer__formatted_name`, the
    formatted name of a related model rather than of the model being filtered.

    Customer has no formatted_name column and reaches the value through
    `formatted_name_lookup_expression = "data__formatted_name"`. django-filter builds its lookup
    straight from a filter's `field_name`, and the annotation `VuedaViewSet.get_queryset` adds is on the
    Cart queryset being filtered rather than on the Customer rows it joins, so the declared path would
    raise `FieldError`. `FormattedNamePathFilterSetMixin` points the filter at
    `customer__data__formatted_name` on the filterset instance instead.

    `customer_formatted_name`/`customer_formatted_name_icontains` have no `__` in their own declared
    names, so `PublicFilterAliasMixin` derives nothing from them and a client keeps using those names
    exactly as declared — see `tests.unit.info.test_model_filtering_dotted_alias` for a filter whose
    name does get a dotted public alias derived from it.
    """

    def test_exact_filter_matches_the_related_lookup_column(
        self, cart_related_formatted_name_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_related_formatted_name_filter"

        user = cart_related_formatted_name_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={"customer_formatted_name": "banana@domain.invalid"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 1, response_body(response)
        cart = store_models.Cart.objects.get(pk=response.data["results"][0]["id"])
        assert cart.customer.user.email == "banana@domain.invalid"

    def test_lookup_expression_filter_matches_the_related_lookup_column(
        self, cart_related_formatted_name_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_related_formatted_name_filter"

        user = cart_related_formatted_name_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        # The rewrite replaces `field_name` only; `lookup_expr` is appended to it afterwards by
        # django-filter, so an icontains filter keeps working the same way.
        response = api_client.get(
            reverse("store.cart-list"),
            data={"customer_formatted_name_icontains": "CHERRY"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 1, response_body(response)
        cart = store_models.Cart.objects.get(pk=response.data["results"][0]["id"])
        assert cart.customer.user.email == "cherry@domain.invalid"

    def test_a_non_matching_value_filters_everything_out(self, cart_related_formatted_name_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_related_formatted_name_filter"

        user = cart_related_formatted_name_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        # Proves the filter is actually reaching the column rather than being dropped: a filter that
        # silently did nothing would return all three carts.
        response = api_client.get(
            reverse("store.cart-list"),
            data={"customer_formatted_name": "nobody@domain.invalid"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 0, response_body(response)

    def test_the_query_parameter_is_the_declared_name(self, cart_related_formatted_name_data, api_client, settings):
        """The rewrite is server-side: the path behind the filter is not a query parameter the
        namespace check accepts, so a client can only use the name as declared."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_related_formatted_name_filter"

        user = cart_related_formatted_name_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={"customer__data__formatted_name": "banana@domain.invalid"},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)

    def test_the_class_level_filters_keep_their_declared_field_name(self):
        """The rewrite happens on the filterset instance's own copy of the filters. The declaration is
        shared by every request the process handles, so rewriting it there would be a process-wide
        mutation — and would leave nothing to generate the client-facing label from."""
        filterset_class = store_filtersets.CartRelatedFormattedNameFilterSet

        filterset_class(queryset=store_models.Cart.objects.all())

        assert filterset_class.base_filters["customer_formatted_name"].field_name == "customer__formatted_name"
