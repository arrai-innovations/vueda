import pytest
from django.core.checks import Error
from django.core.checks.registry import registry
from django.db import models
from django.test.utils import isolate_apps
from django_filters import rest_framework

from tests.store.filtersets import ProductFilterSet
from tests.store.models import Product
from tests.store.serializers import ProductSerializer
from tests.store.viewsets import ProductViewSet
from vueda import info
from vueda.core.filters import VuedaFilterSet
from vueda.info.checks import check_filter_query_param_configuration
from vueda.vdq.filtersets import SendQueueFilterSet
from vueda.vdq.models import QueueItem


@pytest.fixture(autouse=True)
def empty_registry():
    info.registration.get_empty_registry()
    yield
    info.registration.get_empty_registry()


def register_filterset(filterset_class):
    class FilterViewSet(ProductViewSet):
        pass

    FilterViewSet.filterset_class = filterset_class
    info.register(ProductSerializer, FilterViewSet)
    return FilterViewSet


def test_declared_filter_collides_with_range_boundary():
    class CollisionFilterSet(VuedaFilterSet):
        distributor__id = rest_framework.RangeFilter(field_name="distributor__id")
        distributor__id_min = rest_framework.NumberFilter(field_name="distributor__id", lookup_expr="gte")

        class Meta:
            model = Product
            fields = []

    viewset = register_filterset(CollisionFilterSet)
    expected = Error(
        "CollisionFilterSet filters 'distributor.id', 'distributor.id_min' all accept query parameter "
        "'distributor.id_min'.",
        hint="Rename or remove a filter so each query parameter belongs to one filter.",
        obj=viewset,
        id="vueda_info.E012",
    )

    assert check_filter_query_param_configuration(app_configs=None) == [expected]
    assert check_filter_query_param_configuration in registry.registered_checks


def test_distinct_filter_parameters_pass():
    class DistinctFilterSet(VuedaFilterSet):
        distributor__id = rest_framework.RangeFilter(field_name="distributor__id")
        distributor__id_gte = rest_framework.NumberFilter(field_name="distributor__id", lookup_expr="gte")

        class Meta:
            model = Product
            fields = []

    register_filterset(DistinctFilterSet)

    assert check_filter_query_param_configuration(app_configs=None) == []


@isolate_apps("tests.store")
def test_derived_relation_filter_collides_with_range_boundary():
    class Related(models.Model):
        amount_min = models.IntegerField()

        class Meta:
            app_label = "store"

    class Parent(models.Model):
        related = models.ForeignKey(Related, on_delete=models.CASCADE)

        class Meta:
            app_label = "store"

    class DerivedCollisionFilterSet(VuedaFilterSet):
        related__amount = rest_framework.RangeFilter(field_name="related__amount_min")

        class Meta:
            model = Parent
            fields = ["related__amount_min"]

    class ParentSerializer:
        class Meta:
            model = Parent

    class ParentViewSet:
        filterset_class = DerivedCollisionFilterSet

    info.register(ParentSerializer, ParentViewSet)

    assert check_filter_query_param_configuration(app_configs=None) == [
        Error(
            "DerivedCollisionFilterSet filters 'related.amount', 'related.amount_min' all accept query "
            "parameter 'related.amount_min'.",
            hint="Rename or remove a filter so each query parameter belongs to one filter.",
            obj=ParentViewSet,
            id="vueda_info.E012",
        )
    ]


def test_filterset_without_meta_model_uses_registered_model():
    class ModelLessFilterSet(VuedaFilterSet):
        distributor__id = rest_framework.RangeFilter(field_name="distributor__id")
        distributor__id_min = rest_framework.NumberFilter(field_name="distributor__id", lookup_expr="gte")

    viewset = register_filterset(ModelLessFilterSet)

    errors = check_filter_query_param_configuration(app_configs=None)
    assert len(errors) == 1
    assert errors[0].obj is viewset
    assert errors[0].id == "vueda_info.E012"


def test_value_derived_filter_does_not_require_database_access(django_db_blocker):
    register_filterset(ProductFilterSet)

    with django_db_blocker.block():
        assert check_filter_query_param_configuration(app_configs=None) == []


def test_filterset_constructor_does_not_require_database_access(django_db_blocker):
    class QueueItemSerializer:
        class Meta:
            model = QueueItem

    class QueueItemViewSet:
        filterset_class = SendQueueFilterSet

    info.register(QueueItemSerializer, QueueItemViewSet)

    with django_db_blocker.block():
        assert check_filter_query_param_configuration(app_configs=None) == []


def test_serializer_without_viewset_has_no_filter_parameters():
    info.register_serializer(ProductSerializer)

    assert check_filter_query_param_configuration(app_configs=None) == []


def test_a_declared_lookup_filter_that_replaces_the_lookup_value_filter_is_reported():
    class OwnLookupFilterSet(VuedaFilterSet):
        lookup = rest_framework.CharFilter(field_name="name")

        class Meta:
            model = Product
            fields = []

    viewset = register_filterset(OwnLookupFilterSet)
    expected = Error(
        "OwnLookupFilterSet declares its own 'lookup' filter, which replaces the lookup value filter that "
        "LookupInFilterSet adds. For a model with a custom lookup field, the client's delete, action, and "
        "transition pages load their rows through that filter.",
        hint="Rename the filter so that query parameter 'lookup' keeps matching lookup values.",
        obj=viewset,
        id="vueda_info.E018",
    )

    assert check_filter_query_param_configuration(app_configs=None) == [expected]


def test_a_subclass_that_removes_the_lookup_value_filter_is_reported():
    class NoLookupFilterSet(VuedaFilterSet):
        lookup = None

        class Meta:
            model = Product
            fields = []

    viewset = register_filterset(NoLookupFilterSet)
    expected = Error(
        "NoLookupFilterSet removes the lookup value filter 'lookup' that LookupInFilterSet adds. For a model with a "
        "custom lookup field, the client's delete, action, and transition pages load their rows through that filter.",
        hint="Remove the 'lookup = None' declaration so that the subclass keeps the inherited filter.",
        obj=viewset,
        id="vueda_info.E018",
    )

    assert check_filter_query_param_configuration(app_configs=None) == [expected]


@isolate_apps("tests.store")
@pytest.mark.parametrize(
    ("meta_options", "setting", "hint"),
    [
        (
            {"fields": ["lookup"]},
            "Meta.fields names model field 'lookup'",
            "Remove 'lookup' from Meta.fields, and declare that field's filter under another name.",
        ),
        (
            {"fields": {"lookup": ["exact"]}},
            "Meta.fields names model field 'lookup'",
            "Remove 'lookup' from Meta.fields, and declare that field's filter under another name.",
        ),
        (
            {"fields": "__all__"},
            "Meta.fields = '__all__' includes model field 'lookup'",
            "Add 'lookup' to Meta.exclude, and declare that field's filter under another name.",
        ),
        (
            {"exclude": ["id"]},
            "Meta.exclude leaves model field 'lookup' in",
            "Add 'lookup' to Meta.exclude, and declare that field's filter under another name.",
        ),
    ],
    ids=["fields_list", "fields_dict", "fields_all", "exclude"],
)
def test_a_model_field_named_lookup_in_the_meta_options_is_reported(meta_options, setting, hint):
    class Gadget(models.Model):
        lookup = models.CharField(max_length=20)

        class Meta:
            app_label = "store"

    class GadgetFilterSet(VuedaFilterSet):
        Meta = type("Meta", (), {"model": Gadget, **meta_options})

    viewset = register_filterset(GadgetFilterSet)
    expected = Error(
        f"GadgetFilterSet.{setting}, but the lookup value filter that LookupInFilterSet adds already uses the name "
        "'lookup'. For a model with a custom lookup field, the client's delete, action, and transition pages load "
        "their rows through that filter.",
        hint=hint,
        obj=viewset,
        id="vueda_info.E018",
    )

    assert check_filter_query_param_configuration(app_configs=None) == [expected]


@isolate_apps("tests.store")
def test_a_model_field_named_lookup_with_only_other_lookups_passes():
    class Gadget(models.Model):
        lookup = models.CharField(max_length=20)

        class Meta:
            app_label = "store"

    class GadgetFilterSet(VuedaFilterSet):
        class Meta:
            model = Gadget
            fields = {"lookup": ["icontains"]}

    register_filterset(GadgetFilterSet)

    assert check_filter_query_param_configuration(app_configs=None) == []


def test_a_declared_lookup_filter_keeps_its_own_field():
    class OwnLookupFilterSet(VuedaFilterSet):
        lookup = rest_framework.CharFilter(field_name="name")

        class Meta:
            model = Product
            fields = []

    assert OwnLookupFilterSet(queryset=Product.objects.none()).filters["lookup"].field_name == "name"
