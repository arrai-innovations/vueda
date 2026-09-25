"""
Model-info `model_filtering` reports a negated filter (django-filter's `exclude=True`) like any
other filter the list endpoint accepts, and leaves out only a filter whose form field is disabled.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse
from django_filters import rest_framework

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store.models import Product
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import ProductViewSet
from vueda import info
from vueda.core.filters import VuedaFilterSet


class ProductNegatedFilterSet(VuedaFilterSet):
    name = rest_framework.CharFilter(field_name="name")
    name_not = rest_framework.CharFilter(field_name="name", exclude=True)
    name_disabled = rest_framework.CharFilter(field_name="name", disabled=True)

    class Meta:
        model = Product
        fields = ["name"]


class ProductNegatedFilterViewSet(ProductViewSet):
    filterset_class = ProductNegatedFilterSet


class NegatedFilterTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


@pytest.mark.django_db
class TestModelFilteringNegatedFilter:
    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductNegatedFilterViewSet)
        yield
        info.registration.get_empty_registry()

    def test_negated_filter_is_reported_and_disabled_filter_is_not(self, api_client, settings):
        test_data = NegatedFilterTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("info.model_info-detail", args=("store", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_filtering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_filtering = response.data["model_filtering"]
        assert "name_not" in model_filtering, response_body(response)
        assert model_filtering["name_not"]["label"] == "Exclude Name", response_body(response)
        assert "name_disabled" not in model_filtering, response_body(response)
