from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse
from rest_framework import serializers
from rest_framework.fields import SkipField

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.erring.models import NonVuedaFormattedName
from tests.product.models import ProductModelOrderingLookupFormattedName
from tests.store import models as store_models
from vueda.core.serializers import VuedaSerializer
from vueda.core.serializers.fields import FormattedNameField


class ProductColumnSerializer(VuedaSerializer):
    """Product keeps the default formatted_name GeneratedField column."""

    class Meta(VuedaSerializer.Meta):
        model = store_models.Product
        fields = ["id", "name"] + VuedaSerializer.Meta.fields


class CartItemLookupSerializer(VuedaSerializer):
    """CartItem sets formatted_name = None and formatted_name_lookup_expression = "data__formatted_name"."""

    class Meta(VuedaSerializer.Meta):
        model = store_models.CartItem
        fields = ["id", "quantity"] + VuedaSerializer.Meta.fields


class CartMethodSerializer(VuedaSerializer):
    """Cart sets formatted_name = None and computes the value with get_formatted_name()."""

    class Meta(VuedaSerializer.Meta):
        model = store_models.Cart
        fields = ["id", "customer"] + VuedaSerializer.Meta.fields


class CartDeclaredSerializer(VuedaSerializer):
    """Declares its own formatted_name field on a get_formatted_name() model."""

    formatted_name = serializers.CharField(source="customer.user.name", read_only=True)

    class Meta(VuedaSerializer.Meta):
        model = store_models.Cart
        fields = ["id", "customer"] + VuedaSerializer.Meta.fields


class CartAllFieldsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = store_models.Cart
        fields = "__all__"


class CartItemAllFieldsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = store_models.CartItem
        fields = "__all__"


class ProductAllFieldsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = store_models.Product
        fields = "__all__"


@pytest.mark.parametrize(
    "serializer_class",
    [
        ProductColumnSerializer,
        CartItemLookupSerializer,
        CartMethodSerializer,
        ProductAllFieldsSerializer,
        CartItemAllFieldsSerializer,
        CartAllFieldsSerializer,
    ],
)
def test_formatted_name_is_built_for_every_kind_of_model(serializer_class):
    """VuedaSerializer builds a hidden FormattedNameField for formatted_name, with no declaration.

    The serializers cover a formatted_name column (Product), a lookup expression (CartItem), and a
    get_formatted_name() method (Cart). The "__all__" serializers check that formatted_name is
    selected even for the two models that have no formatted_name column.
    """
    field = serializer_class().fields["formatted_name"]

    assert type(field) is FormattedNameField
    assert field.style == {"hidden": True}


def test_lookup_expression_instance_without_the_annotation_falls_back_to_the_lookup():
    """PackingBox sets formatted_name_lookup_expression = "name". An instance built in code has no annotation."""
    field = FormattedNameField()

    assert field.get_attribute(store_models.PackingBox(name="Large box")) == "Large box"


def test_loaded_null_formatted_name_is_returned_without_a_fallback():
    """A formatted_name that the database loaded as null stays null, rather than being looked up again per row."""
    box = store_models.PackingBox(name="Large box")
    box.formatted_name = None

    assert FormattedNameField().get_attribute(box) is None


def test_declared_formatted_name_field_takes_precedence():
    """A subclass that declares formatted_name keeps that declaration instead of the built field."""
    field = CartDeclaredSerializer().fields["formatted_name"]

    assert type(field) is serializers.CharField
    assert field.source == "customer.user.name"


def test_a_plain_model_formatted_name_property_is_read(monkeypatch):
    """A plain Django model with neither method may still name its rows with a formatted_name property."""
    monkeypatch.setattr(
        NonVuedaFormattedName, "formatted_name", property(lambda self: f"Plain {self.some_field}"), raising=False
    )

    assert FormattedNameField().get_attribute(NonVuedaFormattedName(some_field="Widget")) == "Plain Widget"


def test_an_unreadable_formatted_name_leaves_the_field_out():
    """Django refuses to read a generated column on an unsaved instance.

    DRF skips a read-only field that it cannot read.
    """
    with pytest.raises(SkipField):
        FormattedNameField().get_attribute(store_models.Product(name="Widget"))


def test_a_none_style_keeps_the_field_hidden():
    """DRF accepts style=None as no style."""
    assert FormattedNameField(style=None).style == {"hidden": True}


def test_passing_a_style_keeps_the_field_hidden():
    """Other style keys, such as list_default, are added to hidden instead of replacing it."""
    assert FormattedNameField(style={"list_default": True}).style == {"hidden": True, "list_default": True}


def test_model_info_reports_a_formatted_name_field_under_another_name_as_a_char_field():
    """A FormattedNameField declared as customer_label still serves a string."""
    from vueda.info.serializers import ModelInfoSerializer

    field_type = ModelInfoSerializer.get_model_fields_serializer_field_type(
        "customer_label", FormattedNameField(), False
    )

    assert field_type == "CharField"


class PackingBoxNameSerializer(VuedaSerializer):
    """PackingBox sets formatted_name_lookup_expression = "name"."""

    box_label = FormattedNameField()

    class Meta(VuedaSerializer.Meta):
        model = store_models.PackingBox
        fields = ["id", "name", "box_label"] + VuedaSerializer.Meta.fields


def test_a_formatted_name_field_under_another_name_serves_the_formatted_name():
    """box_label names no source of its own, so it serves the formatted name rather than a box_label attribute."""
    field = PackingBoxNameSerializer().fields["box_label"]

    assert field.get_attribute(store_models.PackingBox(name="Large box")) == "Large box"


def test_a_plain_model_formatted_name_method_is_called(monkeypatch):
    """A plain Django model may name its rows with a formatted_name method instead of get_formatted_name()."""
    monkeypatch.setattr(NonVuedaFormattedName, "formatted_name", lambda self: f"Plain {self.some_field}", raising=False)

    assert FormattedNameField().get_attribute(NonVuedaFormattedName(some_field="Widget")) == "Plain Widget"


def test_model_info_reports_a_formatted_name_field_subclass_as_a_char_field():
    """A project subclass of FormattedNameField serves a string too."""
    from vueda.info.serializers import ModelInfoSerializer

    class LabelField(FormattedNameField):
        pass

    field_type = ModelInfoSerializer.get_model_fields_serializer_field_type("customer_label", LabelField(), False)

    assert field_type == "CharField"


def test_a_mapping_is_read_by_its_formatted_name_key():
    """A mapping, such as validated_data or a values() row, is read by key, as a ReadOnlyField reads it."""
    assert FormattedNameField().get_attribute({"formatted_name": "Large box"}) == "Large box"


def test_a_mapping_without_a_formatted_name_key_leaves_the_field_out():
    """validated_data has no formatted_name, so the field is skipped instead of serializing null."""
    with pytest.raises(SkipField):
        FormattedNameField().get_attribute({"name": "Large box"})


def test_declared_formatted_name_field_with_its_own_source_reads_that_source():
    """A FormattedNameField with a source other than formatted_name reads that path, with no fallback."""
    field = FormattedNameField(source="text")
    field.bind("formatted_name", None)

    # Note's own formatted name comes from its subject, so returning the text shows the source won.
    assert field.get_attribute(store_models.Note(subject="Subject", text="Text")) == "Text"
    assert field.read_only
    assert field.style == {"hidden": True}


class PlainModelSerializer(VuedaSerializer):
    """NonVuedaFormattedName is a plain Django model, so it has no _get_formatted_name()."""

    class Meta(VuedaSerializer.Meta):
        model = NonVuedaFormattedName
        fields = ["id", "some_field"] + VuedaSerializer.Meta.fields


def test_plain_model_with_get_formatted_name_serializes_the_method_value(monkeypatch):
    """A plain Django model has no _get_formatted_name(), so the built field calls get_formatted_name() itself."""
    monkeypatch.setattr(
        NonVuedaFormattedName, "get_formatted_name", lambda self: f"Plain {self.some_field}", raising=False
    )
    field = PlainModelSerializer().fields["formatted_name"]

    assert field.get_attribute(NonVuedaFormattedName(some_field="Widget")) == "Plain Widget"


class CartFormattedNameTestData(BaseTestUserMixin, BaseTestGroupMixin):
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
def cart_formatted_name_data():
    return CartFormattedNameTestData()


@pytest.mark.django_db
class TestCartFormattedNameResponses:
    """CartSerializer declares no formatted_name field, and Cart computes it with get_formatted_name().

    The superuser owns the cart, because CartViewSet only lets the cart's owner or a staff user
    retrieve it.
    """

    @pytest.fixture(autouse=True)
    def authenticated_client(self, api_client, cart_formatted_name_data):
        user = cart_formatted_name_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def cart(self, cart_formatted_name_data):
        user = cart_formatted_name_data.users["test_super_user@domain.invalid"]
        customer = store_models.Customer.objects.create(user=user)
        return store_models.Cart.objects.create(customer=customer)

    def test_list_returns_the_method_value(self, authenticated_client, cart):
        response = authenticated_client.get(reverse("store.cart-list"), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert [row["formatted_name"] for row in response.data["results"]] == ["test_super_user@domain.invalid"]

    def test_detail_returns_the_method_value(self, authenticated_client, cart):
        response = authenticated_client.get(reverse("store.cart-detail", kwargs={"pk": cart.pk}), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["formatted_name"] == "test_super_user@domain.invalid"


@pytest.mark.django_db
class TestUntrackedLookupExpressionUpdateResponse:
    """ProductModelOrderingLookupFormattedName reads its name through `formatted_name_lookup_expression = "label"`.

    The model records no history, so an update response is not re-read after the write. The
    instance that the view loaded carries the annotation from before the write.
    """

    @pytest.fixture(autouse=True)
    def authenticated_client(self, api_client, cart_formatted_name_data, settings):
        settings.ROOT_URLCONF = "tests.unit.core.urls_product_lookup_formatted_name_label"
        user = cart_formatted_name_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def test_an_update_response_serves_the_updated_label(self, authenticated_client):
        row = ProductModelOrderingLookupFormattedName.objects.create(label="Small box")

        response = authenticated_client.patch(
            reverse("product.productmodelorderinglookupformattedname-detail", kwargs={"pk": row.pk}),
            data={"label": "Large box"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["formatted_name"] == "Large box"
