"""
Model-info `model_filtering` metadata for value-derived filters — `AllValuesFilter` and
`AllValuesMultipleFilter` — whose choices are the values currently stored in a column rather than a
set declared on the filter.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import cached_filterset_field_names
from tests.conftest import clear_cached_filterset_fields
from tests.conftest import response_body
from tests.store import filtersets as store_filtersets
from tests.store import models as store_models
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import ProductViewSet
from vueda import info


class ModelFilteringTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
    """The model-info response for the registered Product viewset, expanded onto `model_filtering`."""
    test_data = ModelFilteringTestData()
    api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

    return api_client.get(
        reverse("info.model_info-detail", args=("store", "product")),
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_filtering"},
        format="json",
    )


@pytest.mark.django_db
class TestModelFilteringValueDerivedChoices:
    """
    `ProductFilterSet.distributor` is an `AllValuesMultipleFilter` over `distributor__name`, so its
    choices are whatever distributor names the product rows currently carry.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.fixture(autouse=True)
    def fresh_filterset_class(self):
        """
        Start from — and leave behind — the state a fresh process would be in, so these tests fail on
        a regression regardless of which tests ran before them in this worker.
        """
        clear_cached_filterset_fields(store_filtersets.ProductFilterSet)
        yield
        clear_cached_filterset_fields(store_filtersets.ProductFilterSet)

    def test_metadata_caches_no_form_field_on_the_filterset_class(self, api_client, settings):
        """
        `model_filtering` must read the filters from a filterset instance. `FilterSet.get_filters()`
        is a classmethod handing back the filter objects declared on the class, which every request
        shares, and `Filter.field` caches the form field it builds on the filter it is read from.
        Building it there freezes a value-derived filter's choices at whatever the first request the
        process handled saw — for this endpoint's own metadata, and for the real filtering DRF does
        through the per-request copies deep-copied from those same class-level filters.
        """
        response = get_product_filtering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert cached_filterset_field_names(store_filtersets.ProductFilterSet) == []

    def test_value_derived_filter_is_model_backed_with_no_rows(self, api_client, settings):
        """
        An empty column is not the same as a filter with no choices. The values are dynamic either
        way, so the filter stays model-backed and the client reads the current set from
        `model_info_filter_choices` rather than being told there is nothing to choose from.
        """
        assert not store_models.Product.objects.exists()

        response = get_product_filtering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        distributor = response.data["model_filtering"]["distributor"]

        assert distributor.get("choices") is True, response_body(response)
        assert {key: distributor.get(key) for key in ("app_label", "model", "filterset_name")} == {
            "app_label": "store",
            "model": "product",
            "filterset_name": "ProductFilterSet",
        }, response_body(response)

    def test_metadata_is_the_same_once_rows_exist(self, api_client, settings):
        """
        The metadata doesn't change with the contents of the column, so a client can rely on it
        before any row is created. Reporting a value-derived filter as model-backed only while its
        column happens to hold rows would make this pair of responses disagree.
        """
        empty_response = get_product_filtering_response(api_client, settings)

        assert empty_response.status_code == HTTPStatus.OK, response_body(empty_response)
        empty_filtering = empty_response.data["model_filtering"]

        distributor = store_models.Distributor.objects.create(
            name="Late Arrival Ltd.",
            description="Added after the first metadata request of this process.",
        )
        store_models.Product.objects.create(
            distributor=distributor,
            name="Late Arrival Paint",
            order_between=[1, 2],
            tangible_type=store_models.TangibleType.objects.get(code="physical"),
        )

        response = get_product_filtering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        populated_filtering = response.data["model_filtering"]
        assert populated_filtering["distributor"] == empty_filtering["distributor"], response_body(response)

    def test_declared_choices_filter_reports_its_values(self, api_client, settings):
        """
        Only a value-derived filter is model-backed. `ProductFilterSet.condition` declares its choices
        on the filter, so the metadata carries the values themselves and no pointer for the client to
        follow — reading the filters from a filterset instance must not change that. `BaseFilterSet`
        assigns `model` to every filter it holds, so "has a `model`" does not distinguish a
        value-derived filter from one with declared choices.
        """
        response = get_product_filtering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        condition = response.data["model_filtering"]["condition"]

        assert condition["choices"] == [
            {"label": "---------", "value": ""},
            {"label": "New", "value": "new"},
            {"label": "Like New", "value": "like_new"},
            {"label": "Refurbished", "value": "refurbished"},
            {"label": "Used", "value": "used"},
        ], response_body(response)
        assert not {"app_label", "model", "filterset_name"} & condition.keys(), response_body(response)
