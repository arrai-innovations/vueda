import datetime
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.db import connection
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
        """Searching across an M2M field calls distinct() to prevent duplicate results.

        Two products each have three special_care entries: perishable, temperature_controlled,
        and fragile. Searching for 'Perishable Fragile' matches two special_care entries
        per product via the M2M join. Without distinct(), each product would appear twice
        in the result set (once per matching special_care row). The must_call_distinct path
        in VuedaSearchFilterBackend deduplicates back to one row per product.
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

        # Two products have both "perishable" and "fragile" special_care entries.
        # Without distinct(), each would appear twice (once per matching M2M row).
        # The combined_rank is the same for each.
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        result_names = frozenset(x["name"] for x in response.data["results"])
        assert result_names == frozenset({"Square Cookies For Squares", "Shaped Cookies For Drapes"})

    def test_m2m_ordering_search_deduplicates_results(self, test_data, api_client, settings):
        """Searching across an M2M field calls distinct() to prevent duplicate results.

        Two products each have three special_care entries: perishable, temperature_controlled,
        and fragile. Searching for 'Perishable Fragile' matches two special_care entries
        per product via the M2M join. Without distinct(), each product would appear twice
        in the result set (once per matching special_care row). The must_call_distinct path
        in VuedaSearchFilterBackend deduplicates back to one row per product.
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

        # Two products have both "perishable" and "fragile" special_care entries.
        # Without distinct(), each would appear twice (once per matching M2M row).
        # The combined_rank is the same for each.
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

        # Two products have both "perishable" and "fragile" special_care entries.
        # Without distinct(), each would appear twice (once per matching M2M row).
        # The combined_rank is the same for each.
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
class TestM2MDistinctOrderByTiebreaker:
    """Tests that the pk tiebreaker in order_by is preserved after distinct.

    Bug: when mcd=True and no explicit ordering, lines ~253-258 set
    .order_by("-combined_rank", "pk") for DISTINCT ON, but line ~272
    unconditionally replaces it with .order_by("-combined_rank"), dropping
    the pk tiebreaker. Rows with identical combined_rank get undefined order.
    """

    def test_mcd_no_ordering_preserves_pk_tiebreaker(self):
        """Directly verify the final ORDER BY clause includes pk when
        mcd=True and no explicit ordering parameter is provided.

        The bug is on line ~272 of filters.py: the unconditional
        queryset.order_by("-combined_rank") overwrites the
        .order_by("-combined_rank", "pk") set on line ~255 for the
        DISTINCT ON path.
        """
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

        # Django's query.order_by contains the ORM-level ordering fields.
        # Line ~255 sets .order_by("-combined_rank", "pk"), but line ~272
        # overwrites it with .order_by("-combined_rank") only.
        order_by = result_qs.query.order_by
        assert "pk" in order_by or "-pk" in order_by, (
            f"ORDER BY should contain pk tiebreaker for deterministic ordering "
            f"with DISTINCT ON, but line ~272 overwrites the order_by and drops it. "
            f"query.order_by: {order_by}"
        )


@pytest.mark.django_db
class TestSearchDistinctKeepsTheResolvedOrdering:
    """A searched list that has to deduplicate keeps the ordering `VuedaOrderingFilter` resolved.

    `VuedaSearchFilterBackend` runs after `VuedaOrderingFilter` and, on the `DISTINCT ON` path it
    takes when a search joins a multi-valued relation, re-applies the ordering itself so the distinct
    columns match it. The terms for that have to come from the queryset the ordering filter already
    built: a related model's `formatted_name` has been rewritten to the column behind it by then, and
    a field with a declared `nulls_ordering` placement has become an
    `F(...).asc(nulls_first=True)` expression. Re-reading the raw `?o=` value would order by
    `customer__formatted_name`, which names no column on Cart, and would drop the placement.

    Both carts `create_test_data` builds hold more than one cart item, so every one of these searches
    matches a cart through several rows and the deduplication is what brings each back to one.
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
        `formatted_name_lookup_expression = "data__formatted_name"`, so `customer__formatted_name`
        names nothing the database knows. Ordering by the raw request here raised `FieldError`."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        self.register_viewsets()

        response = self.list_carts(api_client, settings, "customer__formatted_name")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        # One row per cart rather than one per matching cart item.
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        # `customer_data.formatted_name` is the customer's user email, so this is the order the
        # rewritten path sorts by.
        emails = [
            store_models.Cart.objects.get(pk=result["id"]).customer.user.email for result in response.data["results"]
        ]
        assert emails == ["test_customer_1@domain.invalid", "test_customer_2@domain.invalid"]

        response = self.list_carts(api_client, settings, "-customer__formatted_name")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004
        emails = [
            store_models.Cart.objects.get(pk=result["id"]).customer.user.email for result in response.data["results"]
        ]
        assert emails == ["test_customer_2@domain.invalid", "test_customer_1@domain.invalid"]

    def test_ordering_keeps_the_declared_nulls_placement(self, test_data, api_client, settings):
        """`nulls_ordering = {"expected_delivery_time": "first"}` puts the cart with no delivery time
        first. Ordering by the raw request here fell back to the database default, which for an
        ascending sort is nulls last."""
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
class TestSearchDistinctPairsOnlyBareColumns:
    """A searched list that has to deduplicate re-applies its ordering only when every term has a
    column to pair with, and sorts by rank when one does not.

    `VuedaSearchFilterBackend` pairs the ordering it re-applies with the `DISTINCT ON` columns that
    have to match it, and PostgreSQL compares those expressions rather than the values behind them.
    A term that reads one column is not necessarily that column, and a relation name is not
    necessarily the column Django orders by, so reading the column names out of a term is not enough
    to pair it. Each case below produced `SELECT DISTINCT ON expressions must match initial ORDER BY
    expressions`, an unhandled 500, before the pairing judged the resolved expressions.
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

    def test_a_function_over_one_column_falls_back_to_rank(self, test_data, api_client, settings):
        """`ordering = [Lower("name")]` reads `name` and compiles to `LOWER("name")`, which
        `distinct("name")` cannot match. A nonempty `?o=` that DRF rejects is what reaches it: the
        rejected value leaves the default ordering on the queryset while still asking this backend
        for explicit-order handling."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_m2m_search_function_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(
            store_serializers.ProductSerializer,
            store_viewsets.ProductM2MSearchFunctionOrderingViewSet,
        )

        response = self.list_url(
            api_client,
            settings,
            "store.product-list",
            self.PRODUCT_SEARCH_TERMS,
            ordering="not_an_allowed_field",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 2, response_body(response)  # noqa: PLR2004

        # The same request without `?o=` is the rank path this falls back to, so the two agree row
        # for row. Asserting against it rather than a fixed order keeps this about the fallback
        # rather than about which product happens to rank first.
        ranked = self.list_url(api_client, settings, "store.product-list", self.PRODUCT_SEARCH_TERMS)

        assert ranked.status_code == HTTPStatus.OK, response_body(ranked)
        assert [result["id"] for result in response.data["results"]] == [
            result["id"] for result in ranked.data["results"]
        ]

    def test_a_relation_whose_related_model_orders_itself_falls_back_to_rank(
        self,
        test_data,
        api_client,
        settings,
    ):
        """`Customer` declares `ordering = ["user__name"]`, so Django replaces `order_by("customer")`
        with that ordering over the joined table while `distinct("customer")` trims the join back to
        the local foreign key column. Unlike the case above, this arrives through a `?o=` the viewset
        offers and metadata advertises."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_m2m_search_relation_ordering"

        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        info.registration.get_empty_registry()
        info.register(
            store_serializers.CartSerializer,
            store_viewsets.CartM2MSearchRelationOrderingViewSet,
        )

        response = self.list_url(
            api_client,
            settings,
            "store.cart-list",
            self.CART_SEARCH_TERMS,
            ordering="customer",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)

        # Row for row the same as the rank path, which is what falling back to rank means. This
        # search returns each cart once per matching cart item on that path, because the rank branch
        # deduplicates on `combined_rank` alongside the primary key and each joined row scores its
        # own rank. That is how the branch already behaves for a cart search sending no `?o=` at all,
        # so the count is asserted against it rather than against one row per cart.
        ranked = self.list_url(api_client, settings, "store.cart-list", self.CART_SEARCH_TERMS)

        assert ranked.status_code == HTTPStatus.OK, response_body(ranked)
        assert [result["id"] for result in response.data["results"]] == [
            result["id"] for result in ranked.data["results"]
        ]

    def test_a_relation_whose_related_model_declares_no_ordering_is_kept(
        self,
        test_data,
        api_client,
        settings,
    ):
        """The counterpart that has to keep working: `Distributor` declares no `Meta.ordering`, so
        both sides of the query reach `store_product.distributor_id` and the ordering pairs. Rejecting
        every relation name would sort this by rank instead."""
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
