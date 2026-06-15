from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from vueda import info


@pytest.mark.django_db
class TestViewSetContentObjectExpand(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Note Reader": [
            ("store", "Note", "list"),
            ("store", "Note", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "note_reader@domain.invalid": {
            "name": "Note Reader",
            "password": "testpass",
            "groups": ["Note Reader"],
        },
    }

    @staticmethod
    def register_viewsets():
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.PackingBoxSerializer, store_viewsets.PackingBoxViewSet)

    @pytest.fixture
    def reader_client(self, api_client):
        user = self.users["note_reader@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(
            name="Sparks & Co.",
            description="Electrical components distributor.",
        )

    @pytest.fixture
    def packing_box(self):
        return store_models.PackingBox.objects.create(
            name="Medium Flat Box",
            depth="5.0000",
            height="30.0000",
            width="40.0000",
            carrying_weight="10.0000",
        )

    @pytest.fixture
    def notes(self, distributor, packing_box):
        return [
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Distributor),
                object_id=distributor.pk,
                text="Note on a distributor.",
            ),
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.PackingBox),
                object_id=packing_box.pk,
                text="Note on a packing box.",
            ),
        ]

    def test_list_expand_returns_content_object_for_each_model(self, reader_client, notes, distributor, packing_box):
        self.register_viewsets()

        response = reader_client.get(
            reverse("store.note-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,text,formatted_name,content_object.*",
            },
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        formatted_names = frozenset(r["formatted_name"] for r in response.data["results"])
        assert "Note on a distributor." in formatted_names
        assert "Note on a packing box." in formatted_names

        expanded_data = {
            f"{r['content_object']['app_label']}.{r['content_object']['model']}": r["content_object"]
            for r in response.data["results"]
        }
        assert expanded_data["store.distributor"] == {
            "id": distributor.pk,
            "name": distributor.name,
            "description": distributor.description,
            "formatted_name": distributor.name,
            "app_label": "store",
            "model": "distributor",
        }
        # The following fields should be omitted from the data:
        #   carrying_weight, depth, height, width
        assert expanded_data["store.packingbox"] == {
            "id": packing_box.pk,
            "name": packing_box.name,
            "in_stock": False,
            "number_in_stock": 0,
            "formatted_name": packing_box.name,
            "app_label": "store",
            "model": "packingbox",
        }

    def test_list_without_expand_omits_content_object(self, reader_client, notes):
        response = reader_client.get(reverse("store.note-list"))

        self.assert_response(response, HTTPStatus.OK)
        for result in response.data["results"]:
            assert "content_object" not in result
