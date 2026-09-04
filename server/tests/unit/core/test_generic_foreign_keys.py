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
from vueda.core.serializers import _parse_model_targeted_field


class TestParseModelTargetedField:
    def test_well_formed_specifier(self):
        assert _parse_model_targeted_field("_store__distributor__description") == (
            "store",
            "distributor",
            "description",
        )

    def test_app_label_with_underscore(self):
        assert _parse_model_targeted_field("_my_app__mymodel__name") == ("my_app", "mymodel", "name")

    def test_field_with_underscore(self):
        assert _parse_model_targeted_field("_store__distributor__first_name") == (
            "store",
            "distributor",
            "first_name",
        )

    def test_regular_field_returns_none(self):
        assert _parse_model_targeted_field("name") is None
        assert _parse_model_targeted_field("description") is None

    def test_wildcard_returns_none(self):
        assert _parse_model_targeted_field("*") is None
        assert _parse_model_targeted_field("~all") is None

    def test_double_underscore_prefix_returns_none(self):
        assert _parse_model_targeted_field("__private") is None

    def test_missing_separator_returns_none(self):
        # starts with _ but only one part after stripping
        assert _parse_model_targeted_field("_justonepart") is None

    def test_too_many_parts_returns_none(self):
        # four parts instead of three
        assert _parse_model_targeted_field("_a__b__c__d") is None

    def test_empty_component_returns_none(self):
        assert _parse_model_targeted_field("_store____description") is None


@pytest.mark.django_db
class TestViewSetContentObjectExpand(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Note Reader": [
            ("store", "Note", "list"),
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
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

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
    def product(self, distributor):
        return store_models.Product.objects.create(
            name="Stuffed Animal",
            description="Soft and fluffy.",
            quantity=10,
            distributor=distributor,
            order_between=[1, 3],  # Limit of 3 per order
            tangible_type=store_models.TangibleType.objects.get(code="physical"),
            condition="new",
        )

    @pytest.fixture
    def notes(self, distributor, product):
        return [
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Distributor),
                object_id=distributor.pk,
                text="Note on a distributor.",
            ),
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Product),
                object_id=product.pk,
                text="Note on a product.",
            ),
        ]

    def test_list_expand_returns_content_object_for_each_model(self, reader_client, notes, distributor, product):
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
        assert "Note on a product." in formatted_names

        expanded_data = {
            f"{r['content_object']['app_label']}.{r['content_object']['model']}": r["content_object"]
            for r in response.data["results"]
        }
        # description is omitted via the model-targeted specifier _store__distributor__description.
        assert expanded_data["store.distributor"] == {
            "id": distributor.pk,
            "name": distributor.name,
            "formatted_name": distributor.name,
            "app_label": "store",
            "model": "distributor",
        }
        # carrying_weight, depth, height, width are omitted via model-targeted specifiers
        # _store__product__<field>.  description is not in this model so is unaffected.
        # quantity doesn't get returned, because the ProductSerializer doesn't define it as a field.
        assert expanded_data["store.product"] == {
            "id": product.pk,
            "name": product.name,
            "description": product.description,
            "formatted_name": product.name,
            "app_label": "store",
            "model": "product",
        }

    def test_model_targeted_omit_only_applies_to_specified_model(self, reader_client, notes, distributor, product):
        """Model-targeted omit specifiers do not affect models they are not targeting."""
        self.register_viewsets()

        response = reader_client.get(
            reverse("store.note-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,content_object.*",
            },
        )

        self.assert_response(response, HTTPStatus.OK)

        expanded_data = {
            f"{r['content_object']['app_label']}.{r['content_object']['model']}": r["content_object"]
            for r in response.data["results"]
        }

        # _store__distributor__description omits description from Distributor only.
        assert "description" not in expanded_data["store.distributor"]
        assert "description" in expanded_data["store.product"]
        # name is not targeted, so it is present on both models.
        assert "name" in expanded_data["store.distributor"]
        assert "name" in expanded_data["store.product"]
        # Product-targeted specifiers do not touch Distributor.
        assert "quantity" not in expanded_data["store.distributor"]  # field doesn't exist on Distributor

    def test_request_time_fields_filter_content_object(self, reader_client, notes):
        """Runtime FIELDS_PARAM selection applies to GFK expansions, not just static specifiers."""
        self.register_viewsets()

        response = reader_client.get(
            reverse("store.note-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,content_object.id",
            },
        )

        self.assert_response(response, HTTPStatus.OK)

        for result in response.data["results"]:
            co = result["content_object"]
            # Only id should be present (plus always-injected identity metadata).
            assert set(co.keys()) == {"id", "app_label", "model", "formatted_name"}

    def test_request_time_omit_filters_content_object(self, reader_client, notes):
        """Runtime OMIT_PARAM selection applies to GFK expansions, not just static specifiers."""
        self.register_viewsets()

        response = reader_client.get(
            reverse("store.note-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,content_object.*",
                settings.REST_FLEX_FIELDS["OMIT_PARAM"]: "content_object.name",
            },
        )

        self.assert_response(response, HTTPStatus.OK)

        for result in response.data["results"]:
            assert "name" not in result["content_object"]

    def test_list_without_expand_omits_content_object(self, reader_client, notes):
        response = reader_client.get(reverse("store.note-list"))

        self.assert_response(response, HTTPStatus.OK)
        for result in response.data["results"]:
            assert "content_object" not in result


@pytest.mark.django_db
class TestViewSetAnotherNoteContentObjectExpand(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """Tests for AnotherNoteSerializer, which declares expandable_fields as a bare class (no options tuple)."""

    groups_to_create: ClassVar[dict] = {
        "Another Note Reader": [
            ("store", "Note", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "another_note_reader@domain.invalid": {
            "name": "Another Note Reader",
            "password": "testpass",
            "groups": ["Another Note Reader"],
        },
    }

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

    @pytest.fixture
    def reader_client(self, api_client):
        user = self.users["another_note_reader@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(
            name="Sparks & Co.",
            description="Electrical components distributor.",
        )

    @pytest.fixture
    def product(self, distributor):
        return store_models.Product.objects.create(
            name="Stuffed Animal",
            description="Soft and fluffy.",
            quantity=10,
            distributor=distributor,
            order_between=[1, 3],
            tangible_type=store_models.TangibleType.objects.get(code="physical"),
            condition="new",
        )

    @pytest.fixture
    def notes(self, distributor, product):
        return [
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Distributor),
                object_id=distributor.pk,
                text="Note on a distributor.",
            ),
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Product),
                object_id=product.pk,
                text="Note on a product.",
            ),
        ]

    def test_runtime_fields_without_static_fields(self, reader_client, notes):
        """Runtime FIELDS_PARAM applies when expandable_fields is a bare class with no static field options."""
        self.register_viewsets()

        response = reader_client.get(
            reverse("store.another-note-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,content_object.id",
            },
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        for result in response.data["results"]:
            co = result["content_object"]
            # Only id should be present (plus always-injected identity metadata).
            assert set(co.keys()) == {"id", "app_label", "model", "formatted_name"}


@pytest.mark.django_db
class TestViewSetNoteStaticOmitContentObjectExpand(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """Tests for NoteStaticOmitSerializer: plain (non-model-targeted) field names in FIELDS_PARAM and
    available_actions pre-omitted statically."""

    groups_to_create: ClassVar[dict] = {
        "Static Omit Note Reader": [
            ("store", "Note", "list"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "static_omit_note_reader@domain.invalid": {
            "name": "Static Omit Note Reader",
            "password": "testpass",
            "groups": ["Static Omit Note Reader"],
        },
    }

    @staticmethod
    def register_viewsets():
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

    @pytest.fixture
    def reader_client(self, api_client):
        user = self.users["static_omit_note_reader@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(
            name="Sparks & Co.",
            description="Electrical components distributor.",
        )

    @pytest.fixture
    def product(self, distributor):
        return store_models.Product.objects.create(
            name="Stuffed Animal",
            description="Soft and fluffy.",
            quantity=10,
            distributor=distributor,
            order_between=[1, 3],
            tangible_type=store_models.TangibleType.objects.get(code="physical"),
            condition="new",
        )

    @pytest.fixture
    def notes(self, distributor, product):
        return [
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Distributor),
                object_id=distributor.pk,
                text="Note on a distributor.",
            ),
            store_models.Note.objects.create(
                content_type=ContentType.objects.get_for_model(store_models.Product),
                object_id=product.pk,
                text="Note on a product.",
            ),
        ]

    def test_plain_field_specifiers_with_static_available_actions_omit(self, reader_client, notes):
        """Plain (non-model-targeted) FIELDS_PARAM specifiers pass through unchanged, and static omit of
        available_actions means extra is empty so the if-extra branch is not taken."""
        self.register_viewsets()

        response = reader_client.get(
            reverse("store.note-static-omit-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
            },
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        for result in response.data["results"]:
            co = result["content_object"]
            # Static FIELDS_PARAM ["id", "name"] narrows the result; available_actions is absent
            # because it was already in static_omit, so extra was empty (if extra: not taken).
            assert set(co.keys()) == {"id", "name", "app_label", "model", "formatted_name"}

    def test_unregistered_content_object_expands_to_null(self, reader_client, notes, product):
        # Register only Product; Distributor stays unregistered, so the
        # distributor-backed note's content_object has no serializer.
        info.registration.get_empty_registry()
        info.register(store_serializers.ProductSerializer, store_viewsets.ProductViewSet)

        response = reader_client.get(
            reverse("store.note-list"),
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "content_object",
                settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: "id,text,content_object.*",
            },
        )

        self.assert_response(response, HTTPStatus.OK)
        expanded = {r["text"]: r["content_object"] for r in response.data["results"]}
        assert expanded["Note on a distributor."] is None
        assert expanded["Note on a product."]["id"] == product.pk
