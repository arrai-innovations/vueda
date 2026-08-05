from datetime import timedelta
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.store.models import Cart
from tests.store.models import Customer


class ProductOrderingTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "Product", "list"),
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


@pytest.fixture
def product_ordering_data():
    data = ProductOrderingTestData()
    # Created out of both alphabetical and reverse-alphabetical order, so a passing
    # assertion can't be explained away by insertion/pk order matching the expected result.
    Product.objects.create(name="Cherry", available_for_sale=True, buzz_words=["Fresh"])
    Product.objects.create(name="Apple", available_for_sale=True, buzz_words=["Fresh"])
    Product.objects.create(name="Banana", available_for_sale=True, buzz_words=["Fresh"])
    return data


@pytest.mark.django_db
class TestModelOrderingOnly:
    """Product.Meta.ordering = ["name"]; ProductViewSet declares neither `ordering` nor `ordering_fields`."""

    def test_list_uses_model_default_ordering(self, product_ordering_data, api_client):
        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


@pytest.mark.django_db
class TestModelAndViewsetOrdering:
    """ProductOrderingViewSet adds `ordering = ["-name"]`, which should override Product.Meta.ordering."""

    def test_list_uses_viewset_ordering_over_model_default(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_overrides_viewset_ordering_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"), data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"}, format="json"
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


@pytest.mark.django_db
class TestModelViewsetAndOrderingFieldsOrdering:
    """ProductOrderingFieldsViewSet adds `ordering_fields = ["name"]` on top of `ordering = ["-name"]`.

    `ordering_fields` only whitelists which fields a client's `?o=` param may reference; on its own it
    should not change the default order applied when no `?o=` param is given.
    """

    def test_default_order_ignores_ordering_fields(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Same order as the viewset-ordering-only scenario: ordering_fields alone changes nothing here.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_allowed_field_is_applied(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_disallowed_field_falls_back_to_viewset_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "available_for_sale"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # available_for_sale isn't in ordering_fields, so OrderingFilter ignores it and falls back
        # to the viewset's default ordering, same as when no `?o=` is passed at all.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


@pytest.mark.django_db
class TestOrderingFieldsAllValue:
    """ProductOrderingAllFieldsViewSet sets `ordering_fields = "__all__"` on top of `ordering = ["-name"]`,
    and serves Product.name under the serializer field name `title` (via ProductRenamedFieldSerializer).

    DRF's OrderingFilter resolves "__all__" against `queryset.model._meta.fields` plus any queryset
    annotations (OrderingFilter.get_valid_fields), not the serializer's declared fields. A client can
    order by the model's field name ("name") because it is a real column, and can also order by "title"
    here — not because "title" is the serializer's name for Product.name, but because `get_queryset()`
    annotates the queryset with `title=F('name')`, and "__all__" includes queryset annotations by name.
    """

    def test_default_order_ignores_ordering_fields(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_all_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_model_field_name_is_applied(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_all_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "name" is a real model column, so it's a valid "__all__" ordering key on its own terms.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_annotated_serializer_field_name_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_all_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "title"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "title" isn't a real model column, but "__all__" also allows ordering by any queryset
        # annotation name, and ProductOrderingAllFieldsViewSet.get_queryset() annotates title=F("name").
        # It's the annotation, not the serializer's use of "title" as a field name, that makes this work.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


@pytest.mark.django_db
class TestOrderingFieldsUnsetDefaultsToSerializer:
    """ProductOrderingDefaultFieldsViewSet declares neither `ordering_fields` nor an `ordering`
    override beyond `ordering = ["-name"]` (inherited from ProductOrderingViewSet).

    Per DRF's docs, when `ordering_fields` isn't declared, the OrderingFilter defaults to allowing
    ordering on any readable field of the serializer, resolved by each field's `source`, not its own
    name (OrderingFilter.get_default_valid_fields). So a client's `?o=` param only matches a serializer
    field's `source`, never the model's own field names or the serializer's own field names, unless
    those happen to be the same string:

    - ProductRenamedFieldSerializer.title has no explicit `source`, so it defaults to "title", and
      get_queryset() annotates the queryset with `title=F("name")`. Ordering by "title" is applied,
      because the field's source and the annotation share that name.
    - Ordering by "name", the underlying model column, falls back to the viewset default instead:
      "name" isn't a serializer field's source here (only "title" is), so DRF doesn't recognize it.
    - ProductOrderingSourceFieldViewSet swaps in a serializer whose `title` field is declared with an
      explicit `source="name"`, and no matching annotation. Ordering by "title" falls back here,
      because DRF resolves valid ordering keys by source ("name"), never by the field's own name.
    - ProductOrderingPropertyFieldViewSet swaps in a serializer whose `title` field sources from a
      model property (Product.computed_title). Ordering by "title" falls back here too, because DRF's
      default resolution explicitly excludes any serializer field sourced from a model property — a
      property has no column for the database to order by.
    """

    def test_default_order_ignores_serializer_fields(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_default_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_model_field_name_falls_back_to_viewset_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_default_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "name" isn't defined on the serializer at all (only "title" is), so it can't be any
        # serializer field's source either. DRF only recognizes serializer field sources here, so
        # "name" is invalid and OrderingFilter falls back to the viewset default.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_annotated_serializer_field_name_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_default_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "title"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "title" is applied because it is both the serializer field's own source (no explicit
        # `source=` was given) and a queryset annotation. Ordering by the field's exposed name only
        # works here because that name happens to coincide with its source.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_serializer_field_with_explicit_source_falls_back_to_viewset_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_source_field"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "title"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # ProductOrderingSourceFieldViewSet's serializer exposes Product.name as "title" via an
        # explicit source="name", with no matching annotation. DRF resolves valid ordering keys by
        # each field's source ("name"), not its exposed name, so "title" itself isn't recognized and
        # OrderingFilter falls back to the viewset default.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_serializer_field_sourced_from_model_property_falls_back_to_viewset_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_property_field"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "title"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # ProductOrderingPropertyFieldViewSet's serializer exposes the model property
        # Product.computed_title as "title". DRF's default resolution explicitly strips any
        # serializer field whose source names a model property, rather than resolving it under a
        # different name, so OrderingFilter falls back to the viewset default.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


class CartOrderingTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("store", "Cart", "list"),
            ("store", "Cart", "read"),
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
def cart_ordering_data():
    data = CartOrderingTestData()

    def make_cart(email, expected_delivery_time):
        user = get_user_model().objects.create(email=email, name=email, is_active=True)
        customer = Customer.objects.create(user=user)
        return Cart.objects.create(customer=customer, expected_delivery_time=expected_delivery_time)

    # Created out of nulls-first order, so a passing assertion can't be explained away by
    # insertion/pk order matching the expected result.
    make_cart("customer_2days@domain.invalid", timedelta(days=2))
    make_cart("customer_null@domain.invalid", None)
    make_cart("customer_1day@domain.invalid", timedelta(days=1))
    return data


@pytest.mark.django_db
class TestCartOrderingFieldsNullsFirst:
    """CartViewSet's default `ordering` is `F("expected_delivery_time").asc(nulls_first=True)`.
    CartOrderingFieldsViewSet additionally whitelists `expected_delivery_time` in `ordering_fields` — the
    exact field name the default ordering already sorts by — to check whether an explicit `?o=` request
    on that same field preserves the nulls-first behavior baked into the default, or loses it.
    """

    def test_default_order_puts_nulls_first(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_fields"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("store.cart-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        durations = [Cart.objects.get(pk=x["id"]).expected_delivery_time for x in response.data["results"]]
        assert durations == [None, timedelta(days=1), timedelta(days=2)]

    def test_explicit_ordering_param_on_same_field_loses_nulls_first(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_fields"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "expected_delivery_time"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        durations = [Cart.objects.get(pk=x["id"]).expected_delivery_time for x in response.data["results"]]
        # An explicit `?o=` param that matches a valid `ordering_fields` entry is passed to `order_by()`
        # as a plain field name, not the `F(...).asc(nulls_first=True)` expression the default ordering
        # uses, so PostgreSQL's default ASC null ordering (NULLS LAST) applies instead of nulls-first.
        assert durations == [timedelta(days=1), timedelta(days=2), None]
