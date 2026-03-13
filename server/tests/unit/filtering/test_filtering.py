import pytest
from django.db import connection
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.info.utils import create_test_data
from vueda import info


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
