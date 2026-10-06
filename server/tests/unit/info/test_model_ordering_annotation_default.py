"""`model_ordering.default` reports a default ordering term that names a queryset annotation.

The annotation is reported under its own name and typed from its output field, the same way an
annotation in `fields` is. A stale name and a multi-column term still drop the whole default.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingAnnotationAndUnresolvableDefaultViewSet
from tests.product.viewsets import ProductOrderingAnnotationDefaultViewSet
from tests.product.viewsets import ProductOrderingAnnotationMultiColumnDefaultViewSet
from tests.product.viewsets import ProductOrderingFieldAndAnnotationDefaultViewSet
from tests.product.viewsets import ProductOrderingManagerAnnotationDefaultViewSet
from vueda import info


class ModelOrderingAnnotationDefaultTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


@pytest.fixture
def model_ordering(api_client, settings, request):
    """The `model_ordering` section for Product, registered with the viewset that the test class names."""
    info.registration.get_empty_registry()
    info.register(ProductSerializer, request.cls.viewset)

    test_data = ModelOrderingAnnotationDefaultTestData()
    api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])

    response = api_client.get(
        reverse("info.model_info-detail", args=("product", "product")),
        data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_ordering"},
        format="json",
    )
    assert response.status_code == HTTPStatus.OK, response_body(response)

    yield response.data["model_ordering"]

    info.registration.get_empty_registry()


@pytest.mark.django_db
class TestViewSetAnnotationDefault:
    viewset = ProductOrderingAnnotationDefaultViewSet

    def test_default_names_the_annotation(self, model_ordering):
        assert model_ordering["default"] == ["name_length"]

    def test_annotation_is_typed_from_its_output_field(self, model_ordering):
        assert model_ordering["fields"] == [{"name": "name_length", "type": "numeric", "ascending": False}]


@pytest.mark.django_db
class TestManagerAnnotationDefault:
    viewset = ProductOrderingManagerAnnotationDefaultViewSet

    def test_default_names_the_manager_annotation(self, model_ordering):
        assert model_ordering["default"] == ["reversed_name"]
        assert model_ordering["fields"] == [{"name": "reversed_name", "type": "alpha", "ascending": True}]


@pytest.mark.django_db
class TestFieldAndAnnotationDefault:
    viewset = ProductOrderingFieldAndAnnotationDefaultViewSet

    def test_both_terms_are_reported_in_order(self, model_ordering):
        assert model_ordering["default"] == ["available_for_sale", "name_length"]
        assert model_ordering["fields"] == [
            {"name": "available_for_sale", "type": "boolean", "ascending": True},
            {"name": "name_length", "type": "numeric", "ascending": False},
        ]


@pytest.mark.django_db
class TestAnnotationAndUnresolvableDefault:
    viewset = ProductOrderingAnnotationAndUnresolvableDefaultViewSet

    def test_stale_name_still_drops_the_default(self, model_ordering):
        assert model_ordering["default"] == []

    def test_annotation_stays_requestable_without_a_direction(self, model_ordering):
        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        assert fields_by_name["name_length"] == {"name": "name_length", "type": "numeric"}


@pytest.mark.django_db
class TestAnnotationMultiColumnDefault:
    viewset = ProductOrderingAnnotationMultiColumnDefaultViewSet

    def test_multi_column_term_still_drops_the_default(self, model_ordering):
        assert model_ordering["default"] == []

    def test_each_name_the_term_reads_is_advertised_without_a_direction(self, model_ordering):
        assert model_ordering["fields"] == [
            {"name": "name", "type": "alpha"},
            {"name": "reversed_name", "type": "alpha"},
        ]
