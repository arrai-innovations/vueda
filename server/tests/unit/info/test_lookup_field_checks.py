"""System checks that report rows that the client cannot address or identify (``vueda_info.E017``, ``E019``)."""

import pytest
from django.core.checks import Error
from django.core.checks.registry import registry
from django.db.models import Q
from django.db.models import UniqueConstraint
from django_filters.rest_framework import FilterSet

from tests.store.models import SpecialCare
from tests.store.serializers import SpecialCareSerializer
from vueda import info
from vueda.core.filters import VuedaFilterSet
from vueda.core.serializers import VuedaSerializer
from vueda.core.viewsets import VuedaViewSet
from vueda.info.checks import check_lookup_field_configuration


@pytest.fixture(autouse=True)
def empty_registry():
    info.registration.get_empty_registry()
    yield
    info.registration.get_empty_registry()


class SpecialCareFilterSet(VuedaFilterSet):
    class Meta:
        model = SpecialCare
        fields = []


def register_lookup(lookup_field, serializer_class=SpecialCareSerializer, filterset_class=SpecialCareFilterSet):
    attrs = {"queryset": SpecialCare.objects.all(), "serializer_class": serializer_class, "lookup_field": lookup_field}
    if filterset_class is not None:
        attrs["filterset_class"] = filterset_class
    viewset = type("SpecialCareViewSet", (VuedaViewSet,), attrs)
    info.register(serializer_class, viewset)
    return viewset


def test_the_check_is_registered():
    assert check_lookup_field_configuration in registry.registered_checks


@pytest.mark.parametrize("lookup_field", ["pk", "id", "code"])
def test_the_primary_key_or_a_unique_returned_field_passes(lookup_field):
    register_lookup(lookup_field)

    assert check_lookup_field_configuration(app_configs=None) == []


def test_a_field_missing_from_the_model_is_reported():
    viewset = register_lookup("sage_id")

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet.lookup_field is 'sage_id', which is not a field of SpecialCare.",
            hint="Set lookup_field to a unique field of the model, or remove it to use the primary key.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


def test_a_field_that_is_not_unique_is_reported():
    viewset = register_lookup("field_that_contains_the_name")

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet.lookup_field is 'field_that_contains_the_name', which is not a unique column of "
            "SpecialCare, so one URL value can match several rows.",
            hint=(
                "Declare the field with unique=True or a UniqueConstraint on that field alone, or set "
                "lookup_field to a unique field."
            ),
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


class SpecialCareWithNameSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = SpecialCare
        fields = ["id", "code", "field_that_contains_the_name"]


@pytest.fixture
def special_care_constraints(monkeypatch):
    """Replace the constraints of ``SpecialCare`` for one test."""

    def set_constraints(*constraints):
        monkeypatch.setattr(SpecialCare._meta, "constraints", list(constraints))
        monkeypatch.delitem(SpecialCare._meta.__dict__, "total_unique_constraints", raising=False)

    yield set_constraints
    SpecialCare._meta.__dict__.pop("total_unique_constraints", None)


def test_a_field_that_a_unique_constraint_names_alone_passes(special_care_constraints, monkeypatch):
    # The fixture field allows blank values, which the check reports on its own.
    monkeypatch.setattr(SpecialCare._meta.get_field("field_that_contains_the_name"), "blank", False)
    special_care_constraints(UniqueConstraint(fields=["field_that_contains_the_name"], name="unique_name"))
    register_lookup("field_that_contains_the_name", SpecialCareWithNameSerializer)

    assert check_lookup_field_configuration(app_configs=None) == []


@pytest.mark.parametrize(
    "constraint",
    [
        UniqueConstraint(fields=["field_that_contains_the_name", "code"], name="unique_name_and_code"),
        UniqueConstraint(
            fields=["field_that_contains_the_name"], condition=Q(code__startswith="A"), name="unique_name_for_a"
        ),
    ],
    ids=["several_fields", "condition"],
)
def test_a_field_that_a_unique_constraint_does_not_make_unique_is_reported(special_care_constraints, constraint):
    special_care_constraints(constraint)
    register_lookup("field_that_contains_the_name", SpecialCareWithNameSerializer)

    errors = check_lookup_field_configuration(app_configs=None)

    assert [error.id for error in errors] == ["vueda_info.E017"]
    assert "which is not a unique column of SpecialCare" in errors[0].msg


def test_a_unique_field_that_allows_null_is_reported(monkeypatch):
    monkeypatch.setattr(SpecialCare._meta.get_field("code"), "null", True)
    viewset = register_lookup("code")

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet.lookup_field is 'code', which allows null on SpecialCare, so a row that holds null "
            "has no URL value.",
            hint="Declare the field with null=False, or set lookup_field to a field that always holds a value.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


def test_a_field_that_the_serializer_does_not_return_is_reported():
    class SpecialCareWithoutCodeSerializer(VuedaSerializer):
        class Meta(VuedaSerializer.Meta):
            model = SpecialCare
            fields = ["id", "field_that_contains_the_name"]

    viewset = register_lookup("code", SpecialCareWithoutCodeSerializer)

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet.lookup_field is 'code', but SpecialCareWithoutCodeSerializer does not return that "
            "field, so the client cannot read an object's lookup value from its row.",
            hint="Add 'code' to SpecialCareWithoutCodeSerializer.Meta.fields.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


def test_a_serializer_that_does_not_return_the_primary_key_is_reported():
    class SpecialCareWithoutIdSerializer(VuedaSerializer):
        class Meta(VuedaSerializer.Meta):
            model = SpecialCare
            fields = ["code", "field_that_contains_the_name"]

    info.register_serializer(SpecialCareWithoutIdSerializer)

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareWithoutIdSerializer does not return 'id', the primary key of SpecialCare, so the client "
            "cannot identify a row.",
            hint="Add 'id' to SpecialCareWithoutIdSerializer.Meta.fields.",
            obj=SpecialCareWithoutIdSerializer,
            id="vueda_info.E019",
        )
    ]


def test_a_composite_primary_key_that_the_serializer_returns_passes():
    from tests.bulk_actions.models import CompositeKeyGadget
    from tests.bulk_actions.serializers import CompositeKeyGadgetSerializer

    assert CompositeKeyGadget._meta.pk.name == "pk"
    info.register_serializer(CompositeKeyGadgetSerializer)

    assert check_lookup_field_configuration(app_configs=None) == []


def test_a_multi_table_child_serializer_that_returns_the_root_primary_key_passes():
    from tests.bulk_actions.models import InheritedKeyGadget
    from tests.bulk_actions.serializers import InheritedKeyGadgetSerializer

    assert InheritedKeyGadget._meta.pk.name == "integerkeygadget_ptr"
    info.register_serializer(InheritedKeyGadgetSerializer)

    assert check_lookup_field_configuration(app_configs=None) == []


@pytest.mark.parametrize("fields", [["name", "colour"], ["integerkeygadget_ptr", "name", "colour"]])
def test_a_multi_table_child_serializer_without_the_root_primary_key_is_reported(fields):
    # DRF returns the parent link as the parent object, so the parent link does not return the primary key value.
    from tests.bulk_actions.models import InheritedKeyGadget

    class InheritedKeyGadgetWithoutIdSerializer(VuedaSerializer):
        class Meta(VuedaSerializer.Meta):
            model = InheritedKeyGadget

    InheritedKeyGadgetWithoutIdSerializer.Meta.fields = fields
    info.register_serializer(InheritedKeyGadgetWithoutIdSerializer)

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "InheritedKeyGadgetWithoutIdSerializer does not return 'id', the primary key of InheritedKeyGadget, so "
            "the client cannot identify a row.",
            hint="Add 'id' to InheritedKeyGadgetWithoutIdSerializer.Meta.fields.",
            obj=InheritedKeyGadgetWithoutIdSerializer,
            id="vueda_info.E019",
        )
    ]


def test_a_serializer_that_returns_the_primary_key_under_the_pk_alias_passes():
    class SpecialCareByPkSerializer(VuedaSerializer):
        class Meta(VuedaSerializer.Meta):
            model = SpecialCare
            fields = ["pk", "code"]

    info.register_serializer(SpecialCareByPkSerializer)

    assert check_lookup_field_configuration(app_configs=None) == []


def test_a_custom_lookup_field_without_a_filterset_class_is_reported():
    viewset = register_lookup("code", filterset_class=None)

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet has no 'lookup' filter, because it declares no filterset_class, so the client cannot "
            "load the rows that a route names.",
            hint="Set filterset_class to a VuedaFilterSet subclass, or add LookupInFilterSet to its bases.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


def test_the_primary_key_lookup_needs_no_lookup_filter():
    register_lookup("pk", filterset_class=None)

    assert check_lookup_field_configuration(app_configs=None) == []


def test_a_filterset_without_the_lookup_filter_is_reported():
    class PlainSpecialCareFilterSet(FilterSet):
        class Meta:
            model = SpecialCare
            fields = ["code"]

    viewset = register_lookup("code", filterset_class=PlainSpecialCareFilterSet)

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet has no 'lookup' filter, because its filterset_class PlainSpecialCareFilterSet does "
            "not extend LookupInFilterSet, so the client cannot load the rows that a route names.",
            hint="Set filterset_class to a VuedaFilterSet subclass, or add LookupInFilterSet to its bases.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


def test_a_unique_text_field_that_allows_blank_values_is_reported(monkeypatch):
    monkeypatch.setattr(SpecialCare._meta.get_field("code"), "blank", True)
    viewset = register_lookup("code")

    assert check_lookup_field_configuration(app_configs=None) == [
        Error(
            "SpecialCareViewSet.lookup_field is 'code', which allows an empty string on SpecialCare, so a row that "
            "holds an empty string has no URL value.",
            hint="Declare the field with blank=False, or set lookup_field to a field that always holds a value.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]


def test_a_unique_number_field_that_allows_blank_values_passes(monkeypatch):
    # A number field cannot hold an empty string, so `blank=True` only lets a form leave it out.
    from tests.store.models import CustomerOrder
    from tests.store.serializers import CustomerOrderSerializer
    from tests.store.viewsets import CustomerOrderViewSet

    monkeypatch.setattr(CustomerOrder._meta.get_field("order_number"), "blank", True)
    viewset = type("CustomerOrderByOrderNumberViewSet", (CustomerOrderViewSet,), {"lookup_field": "order_number"})
    info.register(CustomerOrderSerializer, viewset)

    assert check_lookup_field_configuration(app_configs=None) == []
