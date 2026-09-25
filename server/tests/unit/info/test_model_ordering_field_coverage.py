"""`model_ordering.fields` has to name every field a `?o=` request is actually accepted for.

A field DRF accepts but the metadata leaves out is orderable and invisible: no metadata-driven client
is ever offered it. The reverse is just as bad, and is the same contract read the other way: a field
the metadata advertises but DRF rejects is a name every client is offered and none can use. These
cover four ways the two can disagree — a `"pk"` default, whose expanded field name has to be
advertised as valid; a `"pk"` in `ordering_fields`, whose expanded field name has to be accepted as
well as advertised; an annotation named outright in `ordering_fields`; and an `ordering_fields`
entry written as DRF's `(field_name, label)` pair. They also cover `ordering_fields = None`, which
has to report rather than raise, and an entry DRF itself can read no field name from, which has to
be dropped rather than described or raised over.

A default term naming more than one field is another way, covered by
`test_model_ordering_multi_field_default.py`, which owns that viewset's metadata.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductRenamedFieldSerializer
from tests.product.serializers import ProductSerializer
from tests.product.viewsets import ProductOrderingAnnotationFieldViewSet
from tests.product.viewsets import ProductOrderingFieldsNoneViewSet
from tests.product.viewsets import ProductOrderingLabelledFieldsViewSet
from tests.product.viewsets import ProductOrderingPKInFieldsViewSet
from tests.product.viewsets import ProductOrderingPKRestrictedFieldsViewSet
from tests.product.viewsets import ProductOrderingUnreadableFieldsEntryViewSet
from vueda import info


class ModelOrderingFieldCoverageTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
    test_data = ModelOrderingFieldCoverageTestData()
    user = test_data.users["test_super_user@domain.invalid"]
    api_client.force_authenticate(user=user)

    return api_client.get(
        reverse("info.model_info-detail", args=("product", "product")),
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
        format="json",
    )


@pytest.mark.django_db
class TestModelOrderingRestrictedPKDefault:
    """ProductOrderingPKRestrictedFieldsViewSet declares `ordering = ["pk"]` with an `ordering_fields`
    that names neither the alias nor the field behind it.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingPKRestrictedFieldsViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_reports_the_field_behind_the_alias(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["id"], response_body(response)

    def test_the_expanded_field_is_advertised_alongside_ordering_fields(self, api_client, settings):
        """ "id" comes from the default ordering, "available_for_sale" from `ordering_fields`. Both are
        valid `?o=` targets, so both belong here."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = [field["name"] for field in model_ordering["fields"]]
        assert set(field_names) == {"id", "available_for_sale"}, response_body(response)

    def test_the_pk_alias_is_never_advertised(self, api_client, settings):
        """`?o=pk` is accepted, but the alias names no field a client can otherwise see, so metadata
        reports the field behind it instead of offering two names for one sort."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = [field["name"] for field in model_ordering["fields"]]
        assert "pk" not in field_names, response_body(response)
        assert "pk" not in model_ordering["default"], response_body(response)

    def test_the_default_field_carries_its_direction(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields = {field["name"]: field for field in model_ordering["fields"]}
        assert fields["id"]["ascending"] is True, response_body(response)
        assert fields["id"]["type"] == "numeric", response_body(response)
        # `ascending` describes the default ordering, so a field that isn't part of it has none.
        assert "ascending" not in fields["available_for_sale"], response_body(response)


@pytest.mark.django_db
class TestModelOrderingPKInOrderingFields:
    """ProductOrderingPKInFieldsViewSet names the "pk" alias in `ordering_fields` rather than in
    `ordering`, whose `-name` default names neither the alias nor "id".

    Metadata expands the alias wherever it is declared, so what it advertises here has to be a name
    `VuedaOrderingFilter` accepts — see `TestOrderingParamOnPKInOrderingFields` in
    `tests/unit/filtering/test_ordering.py` for the request side of the same contract.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingPKInFieldsViewSet)
        yield
        info.registration.get_empty_registry()

    def test_the_field_behind_the_alias_is_advertised(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = [field["name"] for field in model_ordering["fields"]]
        assert set(field_names) == {"id", "available_for_sale", "name"}, response_body(response)

    def test_the_pk_alias_is_never_advertised(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = [field["name"] for field in model_ordering["fields"]]
        assert "pk" not in field_names, response_body(response)

    def test_the_expanded_field_carries_no_direction(self, api_client, settings):
        """ "id" comes from `ordering_fields`, not from the default ordering, so it says nothing about
        how the rows currently arrive. `-name` is the default, and that is the field with a direction."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields = {field["name"]: field for field in model_ordering["fields"]}
        assert model_ordering["default"] == ["name"], response_body(response)
        assert fields["name"]["ascending"] is False, response_body(response)
        assert "ascending" not in fields["id"], response_body(response)


@pytest.mark.django_db
class TestModelOrderingFieldsDeclaredAsNone:
    """ProductOrderingFieldsNoneViewSet spells out `ordering_fields = None`, which DRF reads as "not
    declared" — `OrderingFilter.get_valid_fields` falls through to `get_default_valid_fields` for it.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingFieldsNoneViewSet)
        yield
        info.registration.get_empty_registry()

    def test_metadata_is_served_rather_than_raising(self, api_client, settings):
        """`None` used to reach the branch that iterates `ordering_fields`, raising `TypeError` and
        turning every model-info request for the model into a 500."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"], response_body(response)

    def test_fields_fall_back_to_the_serializer_sources(self, api_client, settings):
        """The same set a viewset that omits `ordering_fields` reports, since DRF treats the two
        declarations identically."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = {field["name"] for field in model_ordering["fields"]}
        assert {"id", "name", "available_for_sale"} <= field_names, response_body(response)
        # A serializer field sourced from a model property is still excluded, as DRF excludes it.
        assert "computed_title" not in field_names, response_body(response)


@pytest.mark.django_db
class TestModelOrderingAnnotationNamedInOrderingFields:
    """ProductOrderingAnnotationFieldViewSet names its queryset annotation ("title") outright in
    `ordering_fields` rather than reaching it through `"__all__"`.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductRenamedFieldSerializer, ProductOrderingAnnotationFieldViewSet)
        yield
        info.registration.get_empty_registry()

    def test_the_annotation_is_advertised(self, api_client, settings):
        """It resolves to no model field path, so before annotations were collected outside the
        `"__all__"` branch it was dropped here while `?o=title` kept working."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = {field["name"] for field in model_ordering["fields"]}
        assert field_names == {"name", "title"}, response_body(response)

    def test_the_annotation_is_typed_from_its_output_field(self, api_client, settings):
        """`title` annotates `F("name")`, a CharField, so the annotation's own output field types it."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields = {field["name"]: field for field in model_ordering["fields"]}
        assert fields["title"]["type"] == "alpha", response_body(response)


@pytest.mark.django_db
class TestModelOrderingLabelledOrderingFields:
    """ProductOrderingLabelledFieldsViewSet writes two of its three `ordering_fields` entries as
    DRF's `(field_name, label)` pair — one naming a model field, one naming a queryset annotation —
    alongside a plain name.

    DRF offers `?o=` the same field either way (`get_valid_fields` passes a non-string entry through
    as it stands and `remove_invalid_fields` compares only its first element), so a pair whose name
    the metadata doesn't read is a field that is orderable and invisible. See
    `tests/unit/filtering/test_ordering.py::TestOrderingLabelledOrderingFields` for the `?o=` half of
    the same contract.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingLabelledFieldsViewSet)
        yield
        info.registration.get_empty_registry()

    def test_a_labelled_model_field_is_advertised(self, api_client, settings):
        """The pair's field is reported under the same name and type a plain entry would carry."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields = {field["name"]: field for field in model_ordering["fields"]}
        # `name` is also the viewset's default ordering field, so it carries `ascending` — declaring
        # it as a pair doesn't change how the default merges into `fields`.
        assert fields["name"] == {"name": "name", "type": "alpha", "ascending": False}, response_body(response)

    def test_a_labelled_annotation_is_advertised(self, api_client, settings):
        """An annotation reached through a pair is collected the same way one named as a plain string
        is: the name has to be read off the entry before it can be matched against the queryset's
        annotations at all."""
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields = {field["name"]: field for field in model_ordering["fields"]}
        assert fields["title"] == {"name": "title", "type": "alpha"}, response_body(response)

    def test_a_plain_entry_alongside_pairs_is_unaffected(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields = {field["name"]: field for field in model_ordering["fields"]}
        assert fields["available_for_sale"] == {
            "name": "available_for_sale",
            "type": "boolean",
        }, response_body(response)

    def test_the_label_is_never_reported(self, api_client, settings):
        """A label captions DRF's own browsable-API ordering control. Nothing in the VUEDA metadata
        contract carries it, and a client builds its own column headings, so the pair contributes a
        field name and nothing else.

        The three tests above assert each entry's exact shape, so what is left for this one is that
        those three are the whole set — no fourth entry named after a label.
        """
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = {field["name"] for field in model_ordering["fields"]}
        assert field_names == {"available_for_sale", "name", "title"}, response_body(response)


@pytest.mark.django_db
class TestModelOrderingUnreadableOrderingFieldsEntry:
    """ProductOrderingUnreadableFieldsEntryViewSet declares `ordering_fields = ["name", 7]`.

    DRF can read no field name off `7`: it isn't a string, and `remove_invalid_fields` raises on it
    as soon as any `?o=` arrives. So the entry offers a client nothing, and there is nothing for the
    metadata to report. Model-info describes declarations rather than validating them, so it drops
    the entry and keeps the rest rather than raising the same way and taking the endpoint down over
    a viewset it only has to describe.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductSerializer, ProductOrderingUnreadableFieldsEntryViewSet)
        yield
        info.registration.get_empty_registry()

    def test_the_endpoint_still_reports_the_readable_entries(self, api_client, settings):
        response = get_product_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        field_names = {field["name"] for field in model_ordering["fields"]}
        assert field_names == {"name"}, response_body(response)
