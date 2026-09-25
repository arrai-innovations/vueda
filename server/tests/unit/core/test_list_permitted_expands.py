"""
A list request's expands are validated against the viewset's `permit_list_expands` the way
drf-flex-fields applies it: a requested path must be listed as written, or be a root wildcard.
"""

from http import HTTPStatus

import pytest
from django.conf import settings
from django.urls import reverse

from tests.conftest import response_body
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.unit.filtering.test_filtering import VuedaTestData
from vueda import info
from vueda.core.viewsets import get_recursive_expands_and_fields


@pytest.mark.django_db
class TestListPermittedExpands:
    """`CartViewSet.permit_list_expands` is `["cart_items", "customer"]`."""

    @pytest.fixture(autouse=True)
    def register_cart(self):
        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def admin_client(self, api_client):
        test_data = VuedaTestData()
        api_client.force_authenticate(user=test_data.users["test_admin@domain.invalid"])
        return api_client

    def list_with_expand(self, client, expand):
        return client.get(
            reverse("store.cart-list"), data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: expand}, format="json"
        )

    def test_a_permitted_expand_is_expanded(self, admin_client):
        response = self.list_with_expand(admin_client, "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert all(isinstance(row["customer"], dict) for row in response.data["results"]), response_body(response)

    @pytest.mark.parametrize("expand", ["customer.user", "customer.*"])
    def test_a_dotted_expand_the_permit_list_does_not_name_is_rejected(self, admin_client, expand):
        response = self.list_with_expand(admin_client, expand)

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert str(response.data[expand][0]["message"]) == (
            "Invalid expands. Permitted expands are cart_items, customer. Or use a wildcard to expand all: *, ~all"
        ), response_body(response)


def test_a_dotted_permit_entry_permits_that_path():
    serializer = store_serializers.CartSerializer(context={"permitted_expands": ["customer.user"]})

    valid_expands, valid_wildcard_expands, _, _ = get_recursive_expands_and_fields(
        serializer, 0, settings.REST_FLEX_FIELDS["MAXIMUM_EXPANSION_DEPTH"]
    )

    assert valid_expands == {"customer.user"}
    assert valid_wildcard_expands == {"*", "~all"}
