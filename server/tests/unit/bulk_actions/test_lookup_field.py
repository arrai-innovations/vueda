"""Requests to a viewset whose ``lookup_field`` names a unique field other than the primary key."""

import json
from http import HTTPStatus

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.http import QueryDict
from django.urls import reverse
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.viewsets import GenericViewSet

from tests.bulk_actions import serializers as bulk_serializers
from tests.bulk_actions import viewsets as bulk_viewsets
from tests.bulk_actions.models import CompositeKeyGadget
from tests.bulk_actions.models import InheritedKeyGadget
from tests.bulk_actions.models import IntegerKeyGadget
from tests.bulk_actions.models import LookupKeyGadget
from tests.conftest import response_body
from vueda import info
from vueda.core.filters import VuedaCompositePrimaryKeyFilterSet
from vueda.core.serializers import VuedaSerializer
from vueda.info.field_resolution import serializer_primary_key_field_name
from vueda.info.serializers import ModelInfoSerializer


def detail_url(action, key):
    return reverse(f"bulk_actions.lookupkeygadget-{action}", kwargs={"sage_id": key})


def list_url(action="list"):
    return reverse(f"bulk_actions.lookupkeygadget-{action}")


def errors(response):
    """The response's error body, without the traceback that the test settings add."""
    return {key: value for key, value in response.json().items() if key != "serverStack"}


@pytest.fixture(autouse=True)
def registered_gadgets():
    """Register the gadget viewsets, as an application's ``AppConfig.ready`` does."""
    info.registration.get_empty_registry()
    info.register(bulk_serializers.LookupKeyGadgetSerializer, bulk_viewsets.LookupKeyGadgetViewSet)
    info.register(bulk_serializers.IntegerKeyGadgetSerializer, bulk_viewsets.IntegerKeyGadgetViewSet)
    info.register(bulk_serializers.InheritedKeyGadgetSerializer, bulk_viewsets.InheritedKeyGadgetViewSet)
    yield
    info.registration.get_empty_registry()


@pytest.fixture
def superuser_client(api_client):
    user = get_user_model().objects.create_superuser(email="lookup@domain.invalid", password="password123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def gadgets():
    return [
        LookupKeyGadget.objects.create(sage_id="SAGE-1", name="first"),
        LookupKeyGadget.objects.create(sage_id="SAGE,2", name="second"),
        LookupKeyGadget.objects.create(sage_id="SAGE-3", name="third"),
    ]


@pytest.mark.django_db
class TestModelInfoLookupField:
    def test_reports_the_viewset_lookup_field(self):
        content_type = ContentType.objects.get_for_model(LookupKeyGadget)

        assert ModelInfoSerializer(content_type, context={}).data["lookup_field"] == "sage_id"

    def test_reports_no_lookup_field_for_the_default_lookup(self):
        content_type = ContentType.objects.get_for_model(IntegerKeyGadget)

        assert ModelInfoSerializer(content_type, context={}).data["lookup_field"] is None


@pytest.mark.django_db
class TestSingleObjectRequests:
    def test_retrieve_finds_the_object_by_its_lookup_value(self, superuser_client, gadgets):
        response = superuser_client.get(detail_url("detail", "SAGE-1"))

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["sage_id"] == "SAGE-1"

    def test_retrieve_by_primary_key_answers_404(self, superuser_client, gadgets):
        response = superuser_client.get(detail_url("detail", str(gadgets[0].pk)))

        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)

    def test_delete_removes_the_row_that_the_url_names(self, superuser_client, gadgets):
        response = superuser_client.delete(detail_url("detail", "SAGE,2"))

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert list(LookupKeyGadget.objects.values_list("sage_id", flat=True).order_by("sage_id")) == [
            "SAGE-1",
            "SAGE-3",
        ]

    def test_deactivate_acts_on_the_row_that_the_url_names(self, superuser_client, gadgets):
        response = superuser_client.patch(detail_url("deactivate", "SAGE-1"))

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert not LookupKeyGadget.objects.get(sage_id="SAGE-1").is_active
        assert LookupKeyGadget.objects.get(sage_id="SAGE-3").is_active

    def test_activate_acts_on_the_row_that_the_url_names(self, superuser_client, gadgets):
        LookupKeyGadget.objects.update(is_active=False)

        response = superuser_client.patch(detail_url("activate", "SAGE-1"))

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert LookupKeyGadget.objects.get(sage_id="SAGE-1").is_active
        assert not LookupKeyGadget.objects.get(sage_id="SAGE-3").is_active

    def test_deactivating_an_inactive_row_keys_the_error_by_its_primary_key(self, superuser_client, gadgets):
        LookupKeyGadget.objects.filter(sage_id="SAGE-1").update(is_active=False)

        response = superuser_client.patch(detail_url("deactivate", "SAGE-1"))

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert errors(response) == {str(gadgets[0].pk): ["This LookupKeyGadget is already deactivated"]}

    def test_activating_an_active_row_keys_the_error_by_its_primary_key(self, superuser_client, gadgets):
        response = superuser_client.patch(detail_url("activate", "SAGE-1"))

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert errors(response) == {str(gadgets[0].pk): ["This LookupKeyGadget is already activated"]}


def renamed_kwarg_detail_url(action, key):
    return reverse(f"bulk_actions.renamedkwarglookupkeygadget-{action}", kwargs={"gadget_key": key})


@pytest.mark.django_db
class TestRenamedLookupUrlKwarg:
    def test_retrieve_finds_the_object_by_its_lookup_value(self, superuser_client, gadgets):
        response = superuser_client.get(renamed_kwarg_detail_url("detail", "SAGE-1"))

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["sage_id"] == "SAGE-1"

    def test_delete_removes_the_row_that_the_url_names(self, superuser_client, gadgets):
        response = superuser_client.delete(renamed_kwarg_detail_url("detail", "SAGE,2"))

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert sorted(LookupKeyGadget.objects.values_list("sage_id", flat=True)) == ["SAGE-1", "SAGE-3"]

    def test_deactivate_acts_on_the_row_that_the_url_names(self, superuser_client, gadgets):
        response = superuser_client.patch(renamed_kwarg_detail_url("deactivate", "SAGE-1"))

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert not LookupKeyGadget.objects.get(sage_id="SAGE-1").is_active
        assert LookupKeyGadget.objects.get(sage_id="SAGE-3").is_active


@pytest.mark.django_db
class TestBulkRequests:
    def test_bulk_delete_removes_the_rows_that_the_primary_keys_name(self, superuser_client, gadgets):
        pks = [gadgets[0].pk, gadgets[1].pk]

        response = superuser_client.delete(list_url(), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert list(LookupKeyGadget.objects.values_list("sage_id", flat=True)) == ["SAGE-3"]

    def test_bulk_delete_rejects_a_lookup_value(self, superuser_client, gadgets):
        response = superuser_client.delete(list_url(), data={"pks": ["SAGE-1"]}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert LookupKeyGadget.objects.count() == len(gadgets)

    def test_bulk_deactivate_acts_on_the_rows_that_the_primary_keys_name(self, superuser_client, gadgets):
        pks = [gadgets[0].pk, gadgets[2].pk]

        response = superuser_client.patch(list_url("deactivate"), data={"pks": pks}, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert set(LookupKeyGadget.objects.filter(is_active=False).values_list("sage_id", flat=True)) == {
            "SAGE-1",
            "SAGE-3",
        }

    def test_bulk_activate_names_an_active_row_by_its_primary_key(self, superuser_client, gadgets):
        response = superuser_client.patch(list_url("activate"), data={"pks": [gadgets[1].pk]}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert list(errors(response)) == [str(gadgets[1].pk)]


@pytest.mark.django_db
class TestLookupFilter:
    def test_matches_each_repeated_value(self, superuser_client, gadgets):
        response = superuser_client.get(f"{list_url()}?lookup=SAGE-1&lookup=SAGE,2")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert sorted(row["sage_id"] for row in response.data["results"]) == ["SAGE,2", "SAGE-1"]

    def test_keeps_a_value_that_contains_a_comma_whole(self, superuser_client, gadgets):
        response = superuser_client.get(f"{list_url()}?lookup=SAGE,2")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [row["sage_id"] for row in response.data["results"]] == ["SAGE,2"]

    def test_keeps_leading_and_trailing_spaces(self, superuser_client, gadgets):
        LookupKeyGadget.objects.create(sage_id=" SAGE-4 ", name="padded")

        padded = superuser_client.get(list_url(), data={"lookup": " SAGE-4 "})
        trimmed = superuser_client.get(list_url(), data={"lookup": "SAGE-4"})

        assert padded.status_code == HTTPStatus.OK, response_body(padded)
        assert [row["sage_id"] for row in padded.data["results"]] == [" SAGE-4 "]
        assert trimmed.data["results"] == []

    def test_an_empty_value_does_not_filter(self, superuser_client, gadgets):
        response = superuser_client.get(f"{list_url()}?lookup=")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert len(response.data["results"]) == len(gadgets)

    def test_a_value_that_the_lookup_field_cannot_hold_answers_400(self, superuser_client):
        response = superuser_client.get(reverse("store.distributor-list"), data={"lookup": "abc"})

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert errors(response) == {"lookup": ["Values must be valid for the id field."]}

    def test_a_filterset_outside_a_request_matches_the_registered_lookup_field(self, gadgets):
        filterset = bulk_viewsets.LookupKeyGadgetFilterSet(
            data=QueryDict("lookup=SAGE-3"), queryset=LookupKeyGadget.objects.all()
        )

        assert filterset.is_valid(), filterset.errors
        assert [gadget.sage_id for gadget in filterset.qs] == ["SAGE-3"]

    def test_matches_the_lookup_field_of_the_viewset_that_serves_the_request(self, gadgets):
        # A second viewset for the model that keeps the default lookup: its ``lookup`` filter matches
        # the primary key that its own detail URLs carry, not the registered viewset's ``sage_id``.
        view = GenericViewSet(lookup_field="pk", queryset=LookupKeyGadget.objects.all())
        request = Request(APIRequestFactory().get("/", {"lookup": str(gadgets[1].pk)}), parser_context={"view": view})

        filterset = bulk_viewsets.LookupKeyGadgetFilterSet(
            data=request.query_params, queryset=LookupKeyGadget.objects.all(), request=request
        )

        assert filterset.is_valid(), filterset.errors
        assert [gadget.sage_id for gadget in filterset.qs] == ["SAGE,2"]

    def test_a_view_that_serves_another_model_does_not_change_the_lookup_field(self, gadgets):
        # An endpoint such as the filter choices endpoint builds a model's filterset inside its own request. Its
        # own lookup field describes its own URLs, so the filter keeps the registered viewset's ``sage_id``.
        view = GenericViewSet(lookup_field="pk", queryset=IntegerKeyGadget.objects.all())
        request = Request(APIRequestFactory().get("/", {"lookup": "SAGE-3"}), parser_context={"view": view})

        filterset = bulk_viewsets.LookupKeyGadgetFilterSet(
            data=request.query_params, queryset=LookupKeyGadget.objects.all(), request=request
        )

        assert filterset.is_valid(), filterset.errors
        assert [gadget.sage_id for gadget in filterset.qs] == ["SAGE-3"]

    def test_a_composite_primary_key_filterset_matches_the_key(self, superuser_client):
        first = CompositeKeyGadget.objects.create(batch=1, number=1, name="first")
        CompositeKeyGadget.objects.create(batch=1, number=2, name="second")

        filterset = CompositeKeyGadgetFilterSet(
            data=QueryDict(f"lookup={json.dumps([str(first.batch), str(first.number)])}"),
            queryset=CompositeKeyGadget.objects.all(),
        )

        assert filterset.is_valid(), filterset.errors
        assert [gadget.name for gadget in filterset.qs] == ["first"]


class CompositeKeyGadgetFilterSet(VuedaCompositePrimaryKeyFilterSet):
    class Meta:
        model = CompositeKeyGadget
        fields = ["name"]


@pytest.mark.django_db
class TestMultiTableInheritanceChild:
    """A child model whose primary key is its parent link. The serializer returns that value under ``id``."""

    @pytest.fixture
    def children(self):
        return [
            InheritedKeyGadget.objects.create(name="first", colour="red"),
            InheritedKeyGadget.objects.create(name="second", colour="blue"),
        ]

    def test_model_info_marks_the_root_primary_key_field_as_the_primary_key(self):
        content_type = ContentType.objects.get_for_model(InheritedKeyGadget)

        model_fields = ModelInfoSerializer(content_type, context={}).get_model_fields(content_type)

        assert [name for name, field in model_fields.items() if field.get("pk")] == ["id"]

    def test_model_info_reports_no_lookup_field_for_the_default_lookup(self):
        content_type = ContentType.objects.get_for_model(InheritedKeyGadget)

        assert ModelInfoSerializer(content_type, context={}).data["lookup_field"] is None

    def test_a_field_renamed_from_the_root_primary_key_returns_the_primary_key(self):
        class RenamedKeySerializer(VuedaSerializer):
            key = serializers.IntegerField(source="id", read_only=True)

            class Meta(VuedaSerializer.Meta):
                model = InheritedKeyGadget
                fields = ["key", "colour"]

        assert serializer_primary_key_field_name(InheritedKeyGadget, RenamedKeySerializer().get_fields()) == "key"

    def test_retrieve_finds_the_object_by_its_primary_key(self, superuser_client, children):
        url = reverse("bulk_actions.inheritedkeygadget-detail", kwargs={"pk": children[1].pk})

        response = superuser_client.get(url)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["id"] == children[1].pk

    def test_the_lookup_filter_matches_the_primary_keys(self, superuser_client, children):
        url = reverse("bulk_actions.inheritedkeygadget-list")

        response = superuser_client.get(f"{url}?lookup={children[0].pk}")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [row["colour"] for row in response.data["results"]] == ["red"]

    def test_bulk_deactivate_acts_on_the_rows_that_the_primary_keys_name(self, superuser_client, children):
        url = reverse("bulk_actions.inheritedkeygadget-deactivate")

        response = superuser_client.patch(url, data={"pks": [children[0].pk]}, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert list(InheritedKeyGadget.objects.filter(is_active=False).values_list("colour", flat=True)) == ["red"]
