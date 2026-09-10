from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingFieldsUnresolvableViewSet
from tests.product.viewsets import ProductOrderingUnresolvableViewSet
from tests.product.viewsets import ProductViewSet
from vueda import info


class ModelOrderingUnresolvableDefaultTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


def get_product_ordering_response(api_client, settings):
    """The model-info response for the registered Product viewset, expanded onto `model_ordering`."""
    test_data = ModelOrderingUnresolvableDefaultTestData()
    user = test_data.users["test_super_user@domain.invalid"]
    api_client.force_authenticate(user=user)

    return api_client.get(
        reverse("info.model_info-detail", args=("product", "product")),
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
        format="json",
    )


@pytest.mark.django_db
class TestModelOrderingUnresolvableViewSetDefaultValue:
    """ProductOrderingUnresolvableViewSet declares `ordering = ["-name", "no_such_field"]`, where
    only the first term resolves to a real model field. A default ordering only means something as a
    whole, so `default` should be empty rather than reporting the rows as sorted by "name" alone —
    which is not the order DRF would return them in.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingUnresolvableViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_is_dropped_whole(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        # Product.Meta.ordering is ["name"], so an empty default also proves the viewset's own
        # unresolvable `ordering` doesn't fall back to the model's — DRF wouldn't either.
        assert response.data["model_ordering"]["default"] == [], response_body(response)

    def test_resolvable_field_stays_requestable_without_a_direction(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        fields_by_name = {field["name"]: field for field in response.data["model_ordering"]["fields"]}

        # "name" is still an orderable field the client may ask for; it just isn't part of a default
        # ordering any more, so it carries no `ascending` key.
        assert fields_by_name["name"] == {"name": "name", "type": "alpha"}, response_body(response)


@pytest.mark.django_db
class TestModelOrderingUnresolvableModelDefaultValue:
    """A model's `Meta.ordering` can go stale the same way a viewset's `ordering` can — a field
    renamed or removed without its ordering being updated. ProductViewSet declares no `ordering` of
    its own, so the model's is what DRF applies, and it should be dropped whole as well.

    `Meta.ordering` is patched rather than declared on a dedicated model, and here it has to be: a
    declared one never gets this far, because Django's own `models.E015` reports it at
    `manage.py check` time. Patching it after the checks have run is what puts the stale ordering in
    front of the metadata at all.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_is_dropped_whole(self, api_client, settings, monkeypatch):
        monkeypatch.setattr(Product._meta, "ordering", ["name", "no_such_field"])

        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_ordering"]["default"] == [], response_body(response)


@pytest.mark.django_db
class TestModelOrderingUnresolvableOrderingFieldsEntry:
    """ProductOrderingFieldsUnresolvableViewSet declares `ordering_fields = ["name", "no_such_field"]`.
    Unlike a default ordering, `ordering_fields` is a list of fields a client may ask for one at a
    time, so an entry that doesn't resolve costs only itself: it is left out of `fields` while the
    rest stays on offer. Nothing fails at request time either — DRF validates `?o=` against the
    declared `ordering_fields`, so the bad name would only reach `order_by()` if a client asked for it
    by name, which it can't learn to do from metadata that never advertised it. The
    `vueda_info.E006` system check is what reports the declaration.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingFieldsUnresolvableViewSet)
        yield
        info.registration.get_empty_registry()

    def test_only_the_resolvable_entry_is_advertised(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        names = [field["name"] for field in response.data["model_ordering"]["fields"]]

        assert names == ["name"], response_body(response)

        # The viewset declares no `ordering`, so Product.Meta.ordering (["name"]) is still the default
        # and is unaffected by the bad `ordering_fields` entry.
        assert response.data["model_ordering"]["default"] == ["name"], response_body(response)
