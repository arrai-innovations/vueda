from datetime import timedelta
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.product.models import ProductModelOrderingLookupFormattedName
from tests.store.models import Cart
from tests.store.models import Customer
from tests.store.models import PackingBox


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


@pytest.fixture
def product_ordering_availability_data():
    data = ProductOrderingTestData()
    # available_for_sale isn't unique, but name is, so the boolean sequence in response order still
    # proves the sort ran on available_for_sale rather than on insertion/pk order.
    Product.objects.create(name="Cherry", available_for_sale=True, buzz_words=["Fresh"])
    Product.objects.create(name="Apple", available_for_sale=False, buzz_words=["Fresh"])
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
class TestOrderingMultiFieldDefaultAllowsExplicitOrderingOnEachField:
    """ProductOrderingMultiFieldDefaultViewSet declares a two-field default `ordering = ["-name",
    "available_for_sale"]` and an empty `ordering_fields`, so neither field is otherwise whitelisted.
    VuedaOrderingFilter should still accept an explicit `?o=` request naming either default field.
    """

    def test_default_order_applies_both_fields(self, product_ordering_availability_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_multi_field_default"

        user = product_ordering_availability_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_first_default_field_is_applied(
        self, product_ordering_availability_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_multi_field_default"

        user = product_ordering_availability_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "name" isn't in `ordering_fields` (it's empty), but it is named in the default ordering, so
        # VuedaOrderingFilter accepts it as an explicit target instead of falling back to the default.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_second_default_field_is_applied(
        self, product_ordering_availability_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_multi_field_default"

        user = product_ordering_availability_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "available_for_sale"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "available_for_sale" is the *second* field in the default ordering, not the first, so this
        # also proves every field in a multi-field default is added, not just the first one.
        assert [x["available_for_sale"] for x in response.data["results"]] == [False, True, True]


@pytest.mark.django_db
class TestModelOrderingSupplementsTheOrderingFieldsWhitelist:
    """ProductModelOrderingWhitelistViewSet declares `ordering_fields = ["available_for_sale"]` and no
    `ordering`, so Product.Meta.ordering ("name") is the default ordering DRF applies.

    A default ordering's fields are valid `?o=` targets whichever declaration the default came from,
    so "name" is requestable here through the model's declaration alone — the same rule the
    viewset-`ordering` scenarios above cover, applied to the other source. What `ordering_fields`
    names is unaffected by that widening and stays requestable.
    """

    def test_default_order_is_the_model_ordering(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_model_ordering_whitelist"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_a_model_ordering_field_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        """ "name" isn't in `ordering_fields`, and the default ordering it belongs to is the model's
        rather than the viewset's. It is still accepted, instead of being ignored in favour of the
        default — a field a client can see the list sorted by should be requestable directly."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_model_ordering_whitelist"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_an_ordering_fields_entry_is_still_applied(
        self, product_ordering_availability_data, api_client, settings
    ):
        """The half that widening must not cost: an explicitly whitelisted field keeps working
        whether or not the default ordering names it."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_model_ordering_whitelist"

        user = product_ordering_availability_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "available_for_sale"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["available_for_sale"] for x in response.data["results"]] == [False, True, True]


@pytest.mark.django_db
class TestOrderingScalarFunctionMultiFieldDefault:
    """ProductOrderingScalarFunctionMultiFieldViewSet's default `ordering` is one scalar-function term
    reading two columns, `Coalesce("name", "formatted_name")`, with an empty `ordering_fields`.

    `VuedaOrderingFilter` reads every field a term references, so both columns become valid explicit
    `?o=` targets on their own even though a single term named them. Each request below asks
    descending, which is the opposite of what the default produces, so a result matching the request
    can't be a silent fallback to the default.
    """

    def test_default_order_applies_the_function(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_scalar_function_multi_field"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # `name` is never null, so `Coalesce` sorts on it ascending.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_first_referenced_field_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_scalar_function_multi_field"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_ordering_param_on_second_referenced_field_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_scalar_function_multi_field"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "formatted_name" is the *second* argument to `Coalesce`, not the first, so this also proves
        # every field a term references is collected, not just the one it happens to start with.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


@pytest.mark.django_db
class TestOrderingSingleDefaultPlusOrderingField:
    """ProductOrderingSingleDefaultPlusFieldViewSet declares a single-field default `ordering =
    ["-name"]` and `ordering_fields = ["available_for_sale"]` — a different field. Both the
    explicitly-whitelisted field and the default-only field should be valid explicit `?o=` targets.
    """

    def test_explicit_ordering_param_on_whitelisted_field_is_applied(
        self, product_ordering_availability_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_single_default_plus_field"

        user = product_ordering_availability_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "available_for_sale"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["available_for_sale"] for x in response.data["results"]] == [False, True, True]

    def test_explicit_ordering_param_on_default_only_field_is_applied(
        self, product_ordering_availability_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_single_default_plus_field"

        user = product_ordering_availability_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # "name" isn't in `ordering_fields` (only "available_for_sale" is), but it is the default
        # ordering field, so VuedaOrderingFilter accepts it as an explicit target too.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


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

    def test_explicit_ordering_param_on_a_manager_added_annotation_is_accepted(
        self, product_ordering_data, api_client, settings
    ):
        """`reversed_name` is annotated by `ProductManager`, the model's own default manager — not by
        this viewset's `get_queryset`. It is on every Product queryset before any viewset touches it,
        so `"__all__"` picks it up the same way, and `model_ordering.fields` advertises it (see
        tests/unit/info/test_model_ordering_all_fields.py). This proves the advertised name is one the
        server actually honours rather than rejecting or erroring on.
        """
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_all_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "reversed_name"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Sorting "elppA", "ananaB" and "yrrehC" puts the rows in an order nothing else here
        # produces: not alphabetical, not reverse-alphabetical, and not insertion order. So it can't
        # be explained by a silent fall back to the viewset's `ordering = ["-name"]` default.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Banana", "Apple", "Cherry"]


@pytest.mark.django_db
class TestOrderingLabelledOrderingFields:
    """ProductOrderingLabelledFieldsViewSet declares `ordering_fields = ["available_for_sale",
    ("name", "Product Name"), ("title", "Title")]`, mixing a plain field name with DRF's
    `(field_name, label)` pair form.

    `OrderingFilter.get_valid_fields` normalizes a string entry to `(item, item)` and passes anything
    else through as it stands, after which `remove_invalid_fields` compares `?o=` against the first
    element only. So the two forms offer exactly the same field and the label reaches nothing but
    DRF's own browsable-API control. These prove the server honours each pair's field, which is the
    other half of what `tests/unit/info/test_model_ordering_field_coverage.py
    ::TestModelOrderingLabelledOrderingFields` advertises: a pair the metadata dropped would be a
    field a client can order by and is never offered.
    """

    def test_explicit_ordering_param_on_a_labelled_model_field_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_labelled_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Ascending, so this can't be the viewset's `ordering = ["-name"]` default being silently
        # fallen back to.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_ordering_param_on_a_labelled_annotation_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_labelled_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "title"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # `title` annotates `F("name")`, so ordering by it sorts the same way `?o=name` does.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_the_label_is_not_itself_an_ordering_key(self, product_ordering_data, api_client, settings):
        """Only the first element of a pair is compared against `?o=`, so the label names nothing a
        client can send — which is why the metadata reports the field and never the label."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_labelled_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "Product Name"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Ignored like any other unrecognized `?o=` value, falling back to `ordering = ["-name"]`.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


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
    - Ordering by "name", the underlying model column, is also applied, but not because DRF's own
      source-based resolution recognizes it ("name" isn't a serializer field's source here, only
      "title" is). `VuedaOrderingFilter` always accepts an explicit `?o=` request for a field named in
      the viewset's default `ordering` (`["-name"]`, inherited from `ProductOrderingViewSet`),
      regardless of whether `ordering_fields`/source resolution would otherwise allow it.
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

    def test_explicit_ordering_param_on_model_field_name_is_applied_via_default_ordering(
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
        # "name" isn't defined on the serializer at all (only "title" is), so DRF's own source-based
        # resolution wouldn't recognize it. But "name" is the field named in the viewset's default
        # `ordering`, so VuedaOrderingFilter accepts it as an explicit target anyway.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

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
    CartOrderingFieldsViewSet additionally whitelists `expected_delivery_time` in `ordering_fields` and
    declares `nulls_ordering = {"expected_delivery_time": "first"}`, so `VuedaOrderingFilter` gives an
    explicit `?o=` request on that same field the same nulls-first placement the default ordering uses,
    for both ascending and descending requests (no `nulls_ordering_flip` is declared here).
    """

    def test_default_order_puts_nulls_first(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_fields"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("store.cart-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        durations = [Cart.objects.get(pk=x["id"]).expected_delivery_time for x in response.data["results"]]
        assert durations == [None, timedelta(days=1), timedelta(days=2)]

    def test_explicit_ascending_ordering_param_on_same_field_keeps_nulls_first(
        self, cart_ordering_data, api_client, settings
    ):
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
        # Without VuedaOrderingFilter, a `?o=` param matching a valid `ordering_fields` entry would be
        # passed to `order_by()` as a plain field name, losing the nulls-first placement (PostgreSQL's
        # default ASC null ordering is NULLS LAST). `nulls_ordering` on the viewset restores it.
        assert durations == [None, timedelta(days=1), timedelta(days=2)]

    def test_explicit_descending_ordering_param_on_same_field_keeps_nulls_first(
        self, cart_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_fields"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-expected_delivery_time"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        durations = [Cart.objects.get(pk=x["id"]).expected_delivery_time for x in response.data["results"]]
        # CartOrderingFieldsViewSet doesn't declare `nulls_ordering_flip`, so nulls stay first even
        # though the rest of the values are now sorted descending.
        assert durations == [None, timedelta(days=2), timedelta(days=1)]


@pytest.mark.django_db
class TestCartOrderingFieldsNullsFlip:
    """CartOrderingFieldsNullsFlipViewSet additionally lists `expected_delivery_time` in
    `nulls_ordering_flip`, so a descending `?o=` request on that field flips its nulls placement from
    first to last, instead of keeping nulls first regardless of sort direction.
    """

    def test_explicit_ascending_ordering_param_keeps_nulls_first(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_fields_nulls_flip"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "expected_delivery_time"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        durations = [Cart.objects.get(pk=x["id"]).expected_delivery_time for x in response.data["results"]]
        # Flip only applies to descending requests, so ascending still puts nulls first.
        assert durations == [None, timedelta(days=1), timedelta(days=2)]

    def test_explicit_descending_ordering_param_flips_nulls_to_last(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_fields_nulls_flip"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-expected_delivery_time"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        durations = [Cart.objects.get(pk=x["id"]).expected_delivery_time for x in response.data["results"]]
        # `expected_delivery_time` is listed in `nulls_ordering_flip`, so requesting it descending
        # flips its nulls placement from first to last.
        assert durations == [timedelta(days=2), timedelta(days=1), None]


@pytest.mark.django_db
class TestOrderingParamOnPKAlias:
    """ProductOrderingPKViewSet declares `ordering = ["pk"]` and no `ordering_fields`.

    Model-info metadata never hands a client the literal "pk" — it reports the field the alias stands
    for — but the alias is still a valid `?o=` target here, because `VuedaOrderingFilter` treats every
    term of the default ordering as explicitly requestable. Django resolves the alias in the query, so
    these prove a client that does send `?o=pk` gets primary-key order rather than a fallback or an
    error.
    """

    def test_explicit_pk_ordering_param_sorts_by_the_primary_key(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "pk"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        ids = [x["id"] for x in response.data["results"]]
        assert ids == sorted(ids), response_body(response)
        # Insertion order, which is neither alphabetical nor reverse-alphabetical, so the result can't
        # be explained by a fallback to a name ordering.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]

    def test_explicit_descending_pk_ordering_param_reverses_it(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-pk"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        ids = [x["id"] for x in response.data["results"]]
        assert ids == sorted(ids, reverse=True), response_body(response)
        assert [x["formatted_name"] for x in response.data["results"]] == ["Banana", "Apple", "Cherry"]

    def test_the_primary_key_field_name_orders_the_same_way_as_the_alias(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        # "id" is what `model_ordering` reports for this viewset's default ordering, so this is the
        # request a metadata-driven client actually makes. It must sort the way "pk" does.
        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "id"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]


@pytest.mark.django_db
class TestOrderingParamOnPKAliasThatIsNotDeclared:
    """ProductOrderingViewSet declares `ordering = ["-name"]` and no `ordering_fields`, so nothing puts
    the "pk" alias in DRF's valid fields: the serializer-derived default offers "id", the real field
    name, and never "pk".
    """

    def test_explicit_pk_ordering_param_falls_back_to_the_viewset_default(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "pk"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Silently ignored, like any other field outside the valid set, so the rows arrive in the
        # viewset's own default order.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


@pytest.mark.django_db
class TestOrderingParamOnGeneratedFormattedName:
    """Product reaches its formatted name as its own generated-field column, and
    ProductOrderingPKViewSet declares no `ordering_fields`, so the serializer-derived default makes
    `formatted_name` a valid `?o=` target. The database sorts the column directly.

    `formatted_name` holds the same value as `name` for these rows, so a viewset whose default
    ordering is a name ordering would return one of the two directions below without honouring `?o=`
    at all. `ProductOrderingPKViewSet` defaults to primary-key order instead — insertion order, which
    is neither alphabetical nor reverse-alphabetical — so neither result can be a silent fallback.
    """

    def test_explicit_formatted_name_ordering_param_is_applied(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_descending_formatted_name_ordering_param_is_applied(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


class PackingBoxOrderingTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("store", "PackingBox", "list"),
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
def packing_box_ordering_data():
    data = PackingBoxOrderingTestData()

    def make_box(name):
        return PackingBox.objects.create(name=name, depth=1, height=1, width=1, carrying_weight=1)

    # Created out of both alphabetical and reverse-alphabetical order, so a passing assertion can't be
    # explained away by insertion/pk order matching the expected result.
    make_box("Medium")
    make_box("Large")
    make_box("Small")
    return data


@pytest.mark.django_db
class TestOrderingParamOnLookupExpressionFormattedName:
    """PackingBox has no formatted_name column: it reaches the value through
    `formatted_name_lookup_expression = "name"`, which `VuedaViewSet.get_queryset` annotates onto the
    queryset under the name `formatted_name`. PackingBoxViewSet's
    `ordering = [Lower("formatted_name").desc()]` makes it a valid `?o=` target even though
    `ordering_fields` only names "name".

    So the client orders by the one name metadata advertises, `formatted_name`, while the database
    sorts the annotation behind it.

    The default is declared as a scalar function rather than a plain name, which `order_by()` accepts
    alongside plain names and `F(...)` expressions. Its explicit `.desc()` is what makes these tests
    tell the two apart: the default arrives descending, and an explicit ascending `?o=` request
    arrives ascending, so neither result could come from the other.
    """

    def test_default_order_uses_the_annotated_formatted_name(self, packing_box_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_packing_box_ordering"

        user = packing_box_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("store.packingbox-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Descending, from the `.desc()` on the function term: the direction has to survive being read
        # off an expression rather than off a "-" prefix.
        assert [x["name"] for x in response.data["results"]] == ["Small", "Medium", "Large"]

    def test_explicit_formatted_name_ordering_param_is_applied(self, packing_box_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_packing_box_ordering"

        user = packing_box_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.packingbox-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        # Ascending, the opposite of the descending default, so this can't be a silent fallback:
        # "formatted_name" is only a valid `?o=` target because the default ordering names it from
        # inside `Lower(...)`, and `ordering_fields` lists just "name".
        assert [x["name"] for x in response.data["results"]] == ["Large", "Medium", "Small"]

    def test_explicit_descending_formatted_name_ordering_param_is_applied(
        self, packing_box_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_packing_box_ordering"

        user = packing_box_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.packingbox-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["name"] for x in response.data["results"]] == ["Small", "Medium", "Large"]


@pytest.mark.django_db
class TestOrderingParamOnMethodBackedFormattedName:
    """CartOrderingFormattedNameViewSet orders by formatted_name on a model that computes it with a
    `get_formatted_name()` method, so there is no column and no annotation for the database to sort by.

    This is the configuration `vueda_info.E005` reports at `manage.py check` time, and these tests are
    what that check is protecting against: the request fails outright, on the default ordering and on
    an explicit `?o=` alike, because `ordering_fields` whitelists the name and DRF's own validation
    passes it straight to `order_by()`.
    """

    def test_default_ordering_fails_the_request(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_formatted_name"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("store.cart-list"), format="json")

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, response_body(response)
        assert "FieldError" in response.data["serverStack"], response_body(response)

    def test_explicit_formatted_name_ordering_param_fails_the_request(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_formatted_name"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "formatted_name"},
            format="json",
        )

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, response_body(response)
        assert "FieldError" in response.data["serverStack"], response_body(response)


class ProductModelOrderingLookupFormattedNameTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Admin": [
            ("product", "ProductModelOrderingLookupFormattedName", "list"),
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
def product_model_ordering_lookup_formatted_name_data():
    data = ProductModelOrderingLookupFormattedNameTestData()
    # Created out of both alphabetical and reverse-alphabetical order, so a passing assertion can't be
    # explained away by insertion/pk order matching the expected result.
    ProductModelOrderingLookupFormattedName.objects.create(label="Cherry")
    ProductModelOrderingLookupFormattedName.objects.create(label="Apple")
    ProductModelOrderingLookupFormattedName.objects.create(label="Banana")
    return data


@pytest.mark.django_db
class TestModelDeclaredLookupExpressionFormattedNameOrdering:
    """ProductModelOrderingLookupFormattedName declares `ordering = ["formatted_name"]` in its own
    Meta, and has no formatted_name column: the value comes from
    `formatted_name_lookup_expression = "label"`, which `VuedaViewSet.get_queryset` annotates under the
    name `formatted_name`.

    So the ordering is declared on the model, resolved through an annotation added at query time, and
    sorted by the database. These prove that chain actually orders rows, not just that the metadata
    describes it.
    """

    def test_declared_model_ordering_sorts_by_the_looked_up_column(
        self, product_model_ordering_lookup_formatted_name_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_model_ordering_lookup_formatted_name"

        user = product_model_ordering_lookup_formatted_name_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.productmodelorderinglookupformattedname-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]

    def test_explicit_descending_formatted_name_ordering_param_reverses_it(
        self, product_model_ordering_lookup_formatted_name_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_model_ordering_lookup_formatted_name"

        user = product_model_ordering_lookup_formatted_name_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        # "formatted_name" is a valid `?o=` target here because the model's default ordering names it:
        # `VuedaOrderingFilter` accepts any default-ordering field, so an explicit request works even
        # though the viewset declares no `ordering_fields`.
        response = api_client.get(
            reverse("product.productmodelorderinglookupformattedname-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-formatted_name"},
            format="json",
        )
        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


@pytest.mark.django_db
class TestOrderingParamOnRelatedFormattedName:
    """CartOrderingRelatedFormattedNameViewSet orders by `Lower("customer__formatted_name")`: the
    formatted name of a related model, not of the model being listed, read by a scalar function rather
    than named outright.

    Customer has no formatted_name column and reaches the value through
    `formatted_name_lookup_expression = "data__formatted_name"`. The annotation
    `VuedaViewSet.get_queryset` adds is on the Cart queryset being ordered, not on the Customer rows it
    joins, so ordering by `customer__formatted_name` would raise `FieldError` on its own.
    `VuedaOrderingFilter` rewrites the path to `customer__data__formatted_name` first — reaching inside
    the function to do it, so the `Lower` still applies to the column it lands on.

    `customer_data.formatted_name` is the customer's user email, so the expected order is the
    alphabetical order of the emails `cart_ordering_data` creates — which is neither the insertion
    order nor the viewset's `expected_delivery_time` order, so a passing assertion can't be explained
    by the rewrite silently doing nothing. A rewrite that failed to reach into the function would fail
    the request outright with `FieldError` instead.

    `customer__formatted_name` is not in this viewset's `ordering_fields`, so the explicit `?o=`
    requests below are only valid because `VuedaOrderingFilter` reads the field name out of the
    function term in the default ordering.
    """

    def test_default_ordering_sorts_by_the_related_lookup_column(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_related_formatted_name"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("store.cart-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        emails = [Cart.objects.get(pk=x["id"]).customer.user.email for x in response.data["results"]]
        assert emails == [
            "customer_1day@domain.invalid",
            "customer_2days@domain.invalid",
            "customer_null@domain.invalid",
        ], response_body(response)

    def test_explicit_ordering_param_sorts_by_the_related_lookup_column(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_related_formatted_name"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        # The name the client sends is the one `model_ordering` reports, not the path behind it.
        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "customer__formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        emails = [Cart.objects.get(pk=x["id"]).customer.user.email for x in response.data["results"]]
        assert emails == [
            "customer_1day@domain.invalid",
            "customer_2days@domain.invalid",
            "customer_null@domain.invalid",
        ], response_body(response)

    def test_explicit_descending_ordering_param_reverses_it(self, cart_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_related_formatted_name"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        # The "-" prefix has to survive the rewrite, which replaces the field name inside the term
        # rather than the term itself.
        response = api_client.get(
            reverse("store.cart-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-customer__formatted_name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        emails = [Cart.objects.get(pk=x["id"]).customer.user.email for x in response.data["results"]]
        assert emails == [
            "customer_null@domain.invalid",
            "customer_2days@domain.invalid",
            "customer_1day@domain.invalid",
        ], response_body(response)

    def test_no_rows_are_duplicated_by_the_join(self, cart_ordering_data, api_client, settings):
        """The rewritten path follows a forward foreign key and a reverse one-to-one, both
        single-valued, so the join it adds can't produce more than one row per cart. A multi-valued
        path is refused outright rather than allowed to multiply rows this way."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_cart_ordering_related_formatted_name"

        user = cart_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("store.cart-list"), format="json")

        ids = [x["id"] for x in response.data["results"]]
        assert len(ids) == len(set(ids)) == Cart.objects.count(), response_body(response)


@pytest.mark.django_db
class TestOrderingParamOnRestrictedPKDefault:
    """ProductOrderingPKRestrictedFieldsViewSet declares `ordering = ["pk"]` alongside an
    `ordering_fields` that names neither "pk" nor "id", so the default ordering is the only thing that
    can make either requestable.

    `model_ordering` never hands a client the literal "pk" — it reports "id", the field the alias
    stands for — so "id" is the name a metadata-driven client sends, and it has to be accepted. "pk"
    is accepted too, since Django's query machinery resolves it and a reader of the viewset's source
    may well send it.
    """

    def test_explicit_id_ordering_param_sorts_by_the_primary_key(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_restricted_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "id"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        ids = [x["id"] for x in response.data["results"]]
        assert ids == sorted(ids), response_body(response)
        # Insertion order, which is neither alphabetical nor reverse-alphabetical, so this can't be
        # explained by a silent fall back to a name ordering.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]

    def test_explicit_descending_id_ordering_param_reverses_it(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_restricted_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-id"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Banana", "Apple", "Cherry"]

    def test_explicit_pk_alias_ordering_param_sorts_the_same_way(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_restricted_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "pk"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]

    def test_a_field_outside_ordering_fields_and_the_default_is_still_ignored(
        self, product_ordering_data, api_client, settings
    ):
        """Expanding the valid set to cover the default ordering must not open it up generally:
        "buzz_words" is neither whitelisted nor part of the default, so it stays invalid and the
        request falls back to primary-key order."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_restricted_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "buzz_words"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]


@pytest.mark.django_db
class TestOrderingParamOnPKInOrderingFields:
    """ProductOrderingPKInFieldsViewSet names the "pk" alias in `ordering_fields` rather than in
    `ordering`, and its default `ordering = ["-name"]` names neither the alias nor "id".

    `model_ordering` expands the alias wherever it is declared, so it advertises "id" here too — and
    the default ordering isn't what makes "id" requestable, so `ordering_fields` has to be. DRF passes
    an `ordering_fields` entry through verbatim, so without expanding it here the metadata would offer
    "id" and every `?o=id` request would be silently dropped back to `-name` order.
    """

    def test_the_default_ordering_is_not_primary_key_order(self, product_ordering_data, api_client, settings):
        """Anchors the rest: `-name` order differs from pk order, so a pk-ordered result below can't be
        a silent fall back to the default."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_in_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(reverse("product.product-list"), format="json")

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]

    def test_explicit_id_ordering_param_sorts_by_the_primary_key(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_in_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "id"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        ids = [x["id"] for x in response.data["results"]]
        assert ids == sorted(ids), response_body(response)
        # Insertion order, which is neither the default `-name` order nor its reverse.
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]

    def test_explicit_descending_id_ordering_param_reverses_it(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_in_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "-id"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Banana", "Apple", "Cherry"]

    def test_explicit_pk_alias_ordering_param_sorts_the_same_way(self, product_ordering_data, api_client, settings):
        """The alias stays valid alongside the field behind it, since it is what the viewset's own
        source declares and Django's query machinery resolves it."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_in_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "pk"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Apple", "Banana"]

    def test_a_field_outside_ordering_fields_and_the_default_is_still_ignored(
        self, product_ordering_data, api_client, settings
    ):
        """Expanding the alias must not open the valid set up generally: "buzz_words" is neither
        whitelisted nor part of the default, so it stays invalid and the request falls back to
        `-name`."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_pk_in_fields"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "buzz_words"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Cherry", "Banana", "Apple"]


@pytest.mark.django_db
class TestOrderingFieldsDeclaredAsNone:
    """ProductOrderingFieldsNoneViewSet spells out `ordering_fields = None`.

    DRF reads `None` as "not declared" rather than "nothing is orderable" — it is `OrderingFilter`'s
    own class default, and `get_valid_fields` falls through to `get_default_valid_fields` for it — so
    the serializer's own fields are what a client may order by.
    """

    def test_explicit_ordering_param_on_a_serializer_field_is_honoured(
        self, product_ordering_data, api_client, settings
    ):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_fields_none"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "name"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]


@pytest.mark.django_db
class TestOrderingParamOnAnnotationNamedInOrderingFields:
    """ProductOrderingAnnotationFieldViewSet names its own queryset annotation ("title") outright in
    `ordering_fields`, rather than reaching it through `ordering_fields = "__all__"`. DRF accepts a
    `?o=` request for it either way.
    """

    def test_explicit_ordering_param_on_the_annotation_is_honoured(self, product_ordering_data, api_client, settings):
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_ordering_annotation_field"

        user = product_ordering_data.users["test_admin@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("product.product-list"),
            data={settings.REST_FRAMEWORK["ORDERING_PARAM"]: "title"},
            format="json",
        )

        assert response.data["totalRecords"] == 3, response_body(response)  # noqa: PLR2004
        assert [x["formatted_name"] for x in response.data["results"]] == ["Apple", "Banana", "Cherry"]
