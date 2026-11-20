"""System check ``vueda_info.E017``, which reports a viewset ``lookup_field`` that cannot identify one row."""

import pytest
from django.core.checks import Error
from django.core.checks.registry import registry
from django.db.models import Q
from django.db.models import UniqueConstraint

from tests.store.models import SpecialCare
from tests.store.serializers import SpecialCareSerializer
from vueda import info
from vueda.core.serializers import VuedaSerializer
from vueda.core.viewsets import VuedaViewSet
from vueda.info.checks import check_lookup_field_configuration


@pytest.fixture(autouse=True)
def empty_registry():
    info.registration.get_empty_registry()
    yield
    info.registration.get_empty_registry()


def register_lookup(lookup_field, serializer_class=SpecialCareSerializer):
    viewset = type(
        "SpecialCareViewSet",
        (VuedaViewSet,),
        {"queryset": SpecialCare.objects.all(), "serializer_class": serializer_class, "lookup_field": lookup_field},
    )
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


def test_a_field_that_a_unique_constraint_names_alone_passes(special_care_constraints):
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
            "field, so the client cannot read an object's key from its row.",
            hint="Add 'code' to SpecialCareWithoutCodeSerializer.Meta.fields.",
            obj=viewset,
            id="vueda_info.E017",
        )
    ]
