"""
Model-info `model_filtering` metadata reports the dotted public name `PublicFilterAliasMixin`
derives for a filter whose declared name contains `__` -- never the declared name itself, nor the
`__`-joined `field_name`/ORM path behind it.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import ProductAutoDerivedFilterViewSet
from vueda import info


class ModelFilteringDottedAliasTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


def get_product_filtering_response(api_client, settings):
    """The model-info response for ProductAutoDerivedFilterViewSet, expanded onto `model_filtering`."""
    test_data = ModelFilteringDottedAliasTestData()
    api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

    return api_client.get(
        reverse("info.model_info-detail", args=("store", "product")),
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_filtering"},
        format="json",
    )


@pytest.mark.django_db
class TestModelFilteringAutoDerivedAlias:
    """`ProductAutoDerivedFilterSet` gets a dotted public name for every one of its filters with no
    configuration at all: `distributor__name`/`distributor__name__icontains`, which django-filter
    itself builds from `Meta.fields = {"distributor__name": ["exact", "icontains"]}`;
    `tangible_type__code`, a `CharFilter` declared by hand whose own attribute name happens to
    contain `__`; `distributor__id`/`distributor__id__in`, a `NumericRangeFilter` and a
    `NumberArrayFilter` declared the same hand-written way; and `distributor__description`, a
    `CharFilter` with a `HiddenInput` widget. `PublicFilterAliasMixin` derives a dotted name from
    any `__`-joined declared name the same way, regardless of the filter's own class or its
    widget's visibility.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductAutoDerivedFilterViewSet)
        yield
        info.registration.get_empty_registry()

    def test_model_filtering_reports_the_derived_dotted_names(self, api_client, settings):
        """One response, several facets of the same rename: the dotted names are the keys reported,
        the `__`-joined names behind them never appear, `tangible_type__code`'s own
        `label="Tangible Type Code"` -- read by `vueda_declared_filter_name`, not by the renamed key
        `model_filtering` reports it under -- survives being renamed to `tangible_type.code`, a
        range filter (`distributor__id`) and an array filter (`distributor__id__in`) are renamed the
        same way a `CharFilter` is, keeping their own `type_filter`/`suffixes` metadata intact, and a
        `HiddenInput`-widget filter (`distributor__description`) is renamed and reported the same
        way too, still carrying `hidden: True`."""
        response = get_product_filtering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_filtering = response.data["model_filtering"]

        assert "distributor.name" in model_filtering, response_body(response)
        assert "distributor.name.icontains" in model_filtering, response_body(response)
        assert "tangible_type.code" in model_filtering, response_body(response)
        assert "distributor.id" in model_filtering, response_body(response)
        assert "distributor.id.in" in model_filtering, response_body(response)
        assert "distributor.description" in model_filtering, response_body(response)

        assert "distributor__name" not in model_filtering, response_body(response)
        assert "distributor__name__icontains" not in model_filtering, response_body(response)
        assert "tangible_type__code" not in model_filtering, response_body(response)
        assert "distributor__id" not in model_filtering, response_body(response)
        assert "distributor__id__in" not in model_filtering, response_body(response)
        assert "distributor__description" not in model_filtering, response_body(response)

        assert model_filtering["tangible_type.code"]["label"] == "Tangible Type Code", response_body(response)
        assert model_filtering["distributor.id"]["suffixes"] == ["min", "max"], response_body(response)
        assert model_filtering["distributor.id.in"]["type_filter"] == "DecimalInField", response_body(response)
        assert model_filtering["distributor.description"]["hidden"] is True, response_body(response)

    def test_the_derived_dotted_name_is_a_recognized_query_parameter(self, api_client, settings):
        # `info.register` above swaps the viewset `/info/` metadata reads; the actual list route
        # still resolves through the static URLconf, so a request against it needs a URLconf that
        # wires this same viewset under `store.product-list` too.
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_auto_derived_filter"
        test_data = ModelFilteringDottedAliasTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("store.product-list"),
            data={
                "distributor.name": "Acme",
                "distributor.name.icontains": "Ac",
                "tangible_type.code": "ELECTRONIC",
                # A range filter's suffix is a fixed keyword, not a path segment, so it joins the
                # dotted base name with `_` rather than extending the dotted grammar: `distributor.id`
                # renamed from `distributor__id`, then `_min`/`_max` appended the same way
                # `get_filterset_query_param_names` and the client's `getFilterParams` both build it.
                "distributor.id_min": "1",
                "distributor.id_max": "9",
                "distributor.id.in": "1,2",
                # A `HiddenInput` widget only changes how a form would render the field; it is not a
                # server-side restriction, so the dotted alias is just as reachable as any other.
                "distributor.description": "some description",
            },
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)

    def test_the_django_filter_generated_name_is_not_recognized(self, api_client, settings):
        """django-filter itself would have bound `?distributor__name=` had
        `PublicFilterAliasMixin` not renamed the filter away from it first."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_auto_derived_filter"
        test_data = ModelFilteringDottedAliasTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor__name": "Acme"},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)

    def test_the_hand_declared_name_is_not_recognized(self, api_client, settings):
        """`tangible_type__code`, the name the filter was declared under, is renamed away the same
        way a `Meta.fields`-generated name is -- there is no compatibility period where both work."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_auto_derived_filter"
        test_data = ModelFilteringDottedAliasTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("store.product-list"),
            data={"tangible_type__code": "ELECTRONIC"},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)

    def test_the_hand_declared_range_and_array_names_are_not_recognized(self, api_client, settings):
        """`distributor__id` and `distributor__id__in`, the names a `NumericRangeFilter` and a
        `NumberArrayFilter` were declared under, are renamed away the same way `tangible_type__code`
        is -- the rename applies uniformly regardless of the filter's own class."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_auto_derived_filter"
        test_data = ModelFilteringDottedAliasTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor__id_min": "1", "distributor__id_max": "9", "distributor__id__in": "1,2"},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)

    def test_the_hidden_filters_hand_declared_name_is_not_recognized(self, api_client, settings):
        """`distributor__description`, a `HiddenInput`-widget filter, is renamed away the same way a
        client-facing filter is -- a widget meant to keep a filter out of a rendered form is not a
        signal to skip the rename, and the old name is rejected exactly like `tangible_type__code`."""
        settings.ROOT_URLCONF = "tests.unit.filtering.urls_product_auto_derived_filter"
        test_data = ModelFilteringDottedAliasTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("store.product-list"),
            data={"distributor__description": "some description"},
            format="json",
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
