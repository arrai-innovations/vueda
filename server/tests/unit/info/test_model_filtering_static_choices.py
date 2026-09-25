"""
Model-info `model_filtering` reports static filter choices the way the filter-choices endpoint does:
values as strings, with no empty placeholder option.
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


class ProductStaticChoicesFilterSet(VuedaFilterSet):
    rank = rest_framework.ChoiceFilter(field_name="name", choices=[(1, "One"), (2, "Two")])
    ranks = rest_framework.MultipleChoiceFilter(field_name="name", choices=[(1, "One"), (2, "Two")])

    class Meta:
        model = Product
        fields = ["name"]


class ProductStaticChoicesFilterViewSet(ProductViewSet):
    filterset_class = ProductStaticChoicesFilterSet


class StaticChoicesTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
class TestModelFilteringStaticChoices:
    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductStaticChoicesFilterViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.mark.parametrize("filter_name", ["rank", "ranks"])
    def test_choices_are_strings_without_a_placeholder(self, api_client, settings, filter_name):
        test_data = StaticChoicesTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

        response = api_client.get(
            reverse("info.model_info-detail", args=("store", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_filtering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        choices = response.data["model_filtering"][filter_name]["choices"]
        assert choices == [{"label": "One", "value": "1"}, {"label": "Two", "value": "2"}], response_body(response)
