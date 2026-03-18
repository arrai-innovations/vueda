import pytest
from django.db import connection
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.utils import create_test_data
from vueda import info
from vueda.core.filters import SEARCH_LOOKUP_PREFIX
from vueda.core.filters import TRIGRAM_SIMILAR_PREFIX
from vueda.core.filters import VuedaSearchFilterBackend


class VuedaTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Admin": [
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
            ("store", "Distributor", "list"),
            ("store", "Distributor", "read"),
            ("store", "Product", "list"),
            ("store", "Product", "read"),
            ("tests", "User", "list"),
            ("tests", "User", "read"),
        ],
        "Customer": [  # Needed by create_test_data
            ("contenttypes", "ContentType", "list"),
            ("contenttypes", "ContentType", "read"),
        ],
    }

    users_to_create = {
        "test_admin@example.com": {
            "name": "Test Admin",
            "password": "testpass",
            "groups": ["Admin"],
        },
        "test_customer_1@example.com": {  # Needed by create_test_data
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
        "test_customer_2@example.com": {  # Needed by create_test_data
            "name": "Test Customer 2",
            "password": "testpass",
            "groups": ["Customer"],
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
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse("store.cart-list"),
            data={"last_modified_after": "2024-08-01", "last_modified_before": "2024-09-01"},
            format="json",
        )
        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"

        response = api_client.get(
            reverse("store.cart-list"),
            data={"last_modified_after": "2024-10-01", "last_modified_before": "2024-11-01"},
            format="json",
        )

        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_filtering_choices(self, test_data, api_client):
        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)

        self.register_viewsets()

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Vibrant Looks Inc."},
            format="json",
        )

        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004
        assert frozenset(x["name"] for x in response.data["results"]) == frozenset({"Spray Paint", "Paint"})

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor": "Tasty Treats"},  # Tasty Treats Assoc. would work.
            format="json",
        )

        for err in response.data["distributor"]:
            assert str(err) == "Select a valid choice. Tasty Treats is not one of the available choices.", (
                f"response.data: {response.data}"
            )

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_name": "Men's White T-Shirt"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        cart_item_pks = frozenset([x.pk for x in test_data.carts["test_customer_1@example.com"]["cart_items"]])
        for result in response.data["results"]:
            assert frozenset(result["cart_items"]) == cart_item_pks

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_quantity": "4"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        cart_item_pks = frozenset([x.pk for x in test_data.carts["test_customer_2@example.com"]["cart_items"]])
        for result in response.data["results"]:
            assert frozenset(result["cart_items"]) == cart_item_pks

        response = api_client.get(
            reverse("store.cart-list"),
            data={"product_quantity": "24"},
            format="json",
        )

        for err in response.data["product_quantity"]:
            assert str(err) == "Select a valid choice. 24 is not one of the available choices.", (
                f"response.data: {response.data}"
            )


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

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant Looks Inc."},
            format="json",
        )
        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

    def test_trigram_similar_close_match(self, test_data, api_client, settings):
        """name_similar filter matches names with minor differences."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )

        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.similarity_threshold = %s", [self.similarity_threshold_failing_close])

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.similarity_threshold = %s", [self.similarity_threshold_default])

    def test_trigram_similar_no_match(self, test_data, api_client, settings):
        """name_similar filter returns no results when nothing is similar."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_trigram_similar_no_filter_returns_all(self, test_data, api_client, settings):
        """When name_similar is omitted the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 4, f"response.data: {response.data}"  # noqa: PLR2004


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

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant Looks Inc."},
            format="json",
        )
        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

    def test_trigram_word_similar_word_match(self, test_data, api_client, settings):
        """Single word matches within a longer field value via trigram_word_similar."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibran"},
            format="json",
        )
        assert response.data["totalRecords"] == 1, f"response.data: {response.data}"
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.word_similarity_threshold = %s", [self.similarity_word_threshold_failing_close])

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibran"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

        with connection.cursor() as cursor:
            cursor.execute("SET pg_trgm.word_similarity_threshold = %s", [self.similarity_word_threshold_default])

    def test_trigram_word_similar_no_match(self, test_data, api_client, settings):
        """Search with no word similarity returns no results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_trigram_word_similar_no_filter_returns_all(self, test_data, api_client, settings):
        """When no search term is provided the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_trigram_word_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 4, f"response.data: {response.data}"  # noqa: PLR2004


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

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        # "Vibrant" Looks Inc.: A Sprinkle Of "Vibrant" Colour In Your Life. - combined_rank: 1.6431320905685425
        # T-Shirt Corp.: From the "Vibrant" T-Shirts To The Hoodie." - combined_rank: 1.242610901594162
        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )
        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004
        assert response.data["results"][0]["name"] == "Vibrant Looks Inc."

    def test_ranked_search_no_match(self, test_data, api_client, settings):
        """Search with no similarity returns no results (all below threshold)."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_search"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_ranked_search_no_filter_returns_all(self, test_data, api_client, settings):
        """When no search term is provided the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_search"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 4, f"response.data: {response.data}"  # noqa: PLR2004


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

        user = test_data.users["test_admin@example.com"]
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
        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004

        # Treat King LLC. - combined_rank: 1.203649863600731
        # Tasty Treats Assoc. - combined_rank: 1.174351543188095
        assert [x["name"] for x in response.data["results"]] == ["Treat King LLC.", "Tasty Treats Assoc."]

    def test_ranked_description_no_match(self, test_data, api_client, settings):
        """Search with no similarity in descriptions returns no results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_name_filter_no_match(self, test_data, api_client, settings):
        """Search with no similarity in descriptions returns no results."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={"name_icontains": "xylophone"},
            format="json",
        )
        assert response.data["totalRecords"] == 0, f"response.data: {response.data}"

    def test_ranked_description_no_filter_returns_all(self, test_data, api_client, settings):
        """When no search term is provided the filter is skipped and all results are returned."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_ranked_description"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            format="json",
        )
        assert response.data["totalRecords"] == 4, f"response.data: {response.data}"  # noqa: PLR2004


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

        user = test_data.users["test_admin@example.com"]
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
        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004
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

        user = test_data.users["test_admin@example.com"]
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
        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004
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
        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004
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

        This directly verifies the classification bug: construct_search turns
        ~description into description__trigram_word_similar, but the splitting
        logic only checks for __vueda_search and __trigram_similar suffixes.
        """
        backend = VuedaSearchFilterBackend()

        # These are the suffix checks from filter_queryset lines 165-166
        v_suffix = f"__{backend.customized_lookup_prefixes[SEARCH_LOOKUP_PREFIX]}"
        trig_suffix = f"__{backend.customized_lookup_prefixes[TRIGRAM_SIMILAR_PREFIX]}"

        # ~ produces __trigram_word_similar
        word_similar_lookup = backend.construct_search("~description", None)
        assert word_similar_lookup == "description__trigram_word_similar"

        # Bug: it matches neither suffix, so it falls into det_lookups
        assert not word_similar_lookup.endswith(v_suffix), "sanity: not a V: lookup"
        assert not word_similar_lookup.endswith(trig_suffix), (
            "This assertion failing means the bug is fixed: ~ is now recognized "
            "as a trigram lookup instead of falling through to det_lookups."
        )

    @pytest.mark.xfail(
        reason="Bug: ~ field lands in det_lookups, applying AND-across-terms "
        "instead of combining terms for trigram_word_similar. Searching "
        "'Treat Hoodie' requires BOTH words to independently pass "
        "trigram_word_similar on description, which excludes all distributors.",
        strict=True,
    )
    def test_mixed_multi_term_not_gated_by_word_similar_and(self, test_data, api_client, settings):
        """Multi-term search where no single distributor has both terms in
        its description, but V:name matches should still return results.

        search_fields = ["V:name", "~description"], search = "Treat Hoodie"

        V:name ranked path: "Treat King LLC." and "Tasty Treats Assoc." match "Treat".
        ~description as det_lookup (bug): AND requires each term to independently
        pass trigram_word_similar on description:
          - "Treat" matches some descriptions, "Hoodie" matches only T-Shirt Corp.
          - No single distributor passes BOTH. Result: 0.

        Correct behavior: ~ should combine terms ("Treat Hoodie") into a single
        trigram_word_similar check, and V:name matches should not be gated by it.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_mixed_ranked_word_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Treat Hoodie"},
            format="json",
        )
        # V:name should match "Treat King LLC." and "Tasty Treats Assoc." for "Treat".
        # The ~ field should not gate these results out.
        assert response.data["totalRecords"] >= 1, (
            f"Expected results from V:name matching 'Treat', but the ~ field's "
            f"AND-across-terms deterministic filter excluded everything. "
            f"response.data: {response.data}"
        )

    def test_mixed_single_term_works_accidentally(self, test_data, api_client, settings):
        """Single-term searches mask the bug because AND-across-one-term is
        equivalent to a single filter. This test documents that single-term
        queries work despite the misclassification.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_mixed_ranked_word_similar"

        user = test_data.users["test_admin@example.com"]
        api_client.force_authenticate(user=user)
        self.register_viewsets()

        # "Vibrant" matches V:name and also passes trigram_word_similar on
        # descriptions. With a single term, AND-across-terms has only one
        # term, so the bug doesn't manifest as missing results.
        response = api_client.get(
            reverse("store.distributor-list"),
            data={settings.REST_FRAMEWORK["SEARCH_PARAM"]: "Vibrant"},
            format="json",
        )
        assert response.data["totalRecords"] == 2, f"response.data: {response.data}"  # noqa: PLR2004


@pytest.mark.django_db
class TestM2MDistinctOrderByTiebreaker:
    """Tests that the pk tiebreaker in order_by is preserved after distinct.

    Bug: when mcd=True and no explicit ordering, lines ~253-258 set
    .order_by("-combined_rank", "pk") for DISTINCT ON, but line ~272
    unconditionally replaces it with .order_by("-combined_rank"), dropping
    the pk tiebreaker. Rows with identical combined_rank get undefined order.
    """

    @pytest.mark.xfail(
        reason="Bug: line ~272 of filters.py unconditionally sets "
        ".order_by('-combined_rank'), overwriting the "
        ".order_by('-combined_rank', 'pk') set on line ~255 for DISTINCT ON.",
        strict=True,
    )
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
