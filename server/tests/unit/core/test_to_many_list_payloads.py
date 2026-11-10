"""
The list payloads that the client's to-many column reads.

`tests/fixtures/to-many-list-payloads.json` holds, for a many-to-many field and a reverse foreign key, the
field's model-info entry and the list rows with and without an expand. The client column tests import that file,
so these tests keep it matched to the server's real responses.
"""

import json
from http import HTTPStatus
from pathlib import Path
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from vueda import info


FIXTURES = json.loads((Path(__file__).parents[2] / "fixtures" / "to-many-list-payloads.json").read_text())

# The model-info keys that the client reads to choose and drive the column.
MODEL_INFO_KEYS = ("type_serializer", "type_model", "many", "app_label", "model")


class ToManyTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }

    def __init__(self):
        super().__init__()
        distributor = store_models.Distributor.objects.create(name="Payload Distributor", description="")
        tangible_type = store_models.TangibleType.objects.get(code="physical")
        special_care = {care.code: care for care in store_models.SpecialCare.objects.all()}

        # Explicit primary keys keep the captured payloads the same on every run.
        products = [
            (9001, "Plain Lamp", []),
            (9002, "Glass Lamp", ["fragile"]),
            (
                9003,
                "Chemistry Set",
                ["alcohol", "dangerous", "fragile", "perishable", "temperature_controlled"],
            ),
        ]
        for pk, name, codes in products:
            product = store_models.Product.objects.create(
                pk=pk, distributor=distributor, name=name, order_between=[1, 2], tangible_type=tangible_type
            )
            product.special_care.set([special_care[code] for code in codes])

        product = store_models.Product.objects.get(pk=9001)
        options = [
            store_models.ProductOption.objects.create(
                pk=9100 + index, product=product, name=name, sku=f"SKU-{index}", gtin=f"GTIN-{index}"
            )
            for index, name in enumerate(["Small", "Medium", "Large", "Huge"], start=1)
        ]
        customer = store_models.Customer.objects.create(user=self.users["test_super_user@domain.invalid"])
        store_models.Cart.objects.create(pk=9201, customer=customer)
        full_cart = store_models.Cart.objects.create(pk=9202, customer=customer)
        for index, option in enumerate(options, start=1):
            store_models.CartItem.objects.create(pk=9300 + index, cart=full_cart, product_option=option, quantity=index)


@pytest.mark.django_db
class TestToManyListPayloads:
    @pytest.fixture(autouse=True)
    def register_models(self):
        info.registration.get_empty_registry()
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)
        info.register(store_serializers.CartSerializer, store_viewsets.CartViewSet)
        yield
        info.registration.get_empty_registry()

    @pytest.fixture
    def client(self, api_client):
        test_data = ToManyTestData()
        api_client.force_authenticate(user=test_data.users["test_super_user@domain.invalid"])
        return api_client

    @pytest.mark.parametrize("scenario", FIXTURES, ids=lambda scenario: scenario["scenario"])
    def test_model_info_matches_fixture(self, client, settings, scenario):
        response = client.get(
            reverse("info.model_info-detail", args=("store", scenario["model"])),
            data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_fields"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        field_data = response.data["model_fields"][scenario["field"]]
        assert {key: field_data[key] for key in MODEL_INFO_KEYS} == scenario["model_info"], response_body(response)

    @pytest.mark.parametrize("scenario", FIXTURES, ids=lambda scenario: scenario["scenario"])
    @pytest.mark.parametrize("expanded", [False, True], ids=["unexpanded", "expanded"])
    def test_list_rows_match_fixture(self, client, settings, scenario, expanded):
        field = scenario["field"]
        params = settings.REST_FLEX_FIELDS2
        data = {
            "id": scenario["row_ids"],
            params["FIELDS_PARAM"]: f"id,{field}.id,{field}.formatted_name" if expanded else f"id,{field}",
        }
        if expanded:
            data[params["EXPAND_PARAM"]] = field

        response = client.get(reverse(f"store.{scenario['model']}-list"), data=data, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        rows = sorted(json.loads(response.content)["results"], key=lambda row: row["id"])
        assert rows == scenario["expanded_rows" if expanded else "unexpanded_rows"], response_body(response)
