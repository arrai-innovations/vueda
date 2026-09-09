"""`FormattedNameManager` puts `formatted_name` on every queryset, not just the ones a viewset builds.

A model that reaches its formatted name through `formatted_name_lookup_expression` has no
`formatted_name` column, so the name only means something to the database once something annotates
it. Annotating in the default manager is what lets `Meta.ordering = ["formatted_name"]` compile at
all: `Meta.ordering` applies to every queryset of the model, and `FormattedNameBaseModel._check_ordering`
suppresses the `models.E015` that would otherwise reject the declaration at startup. That suppression
asks about the manager first, so a model without it keeps Django's error rather than trading a
startup error for a `FieldError` on any queryset a viewset didn't build — see
`tests/unit/info/test_model_ordering_formatted_name.py::TestDeclaredFormattedNameOrderingSystemChecks`.
"""

import pytest
from django.core.exceptions import FieldError
from django.db import models

from tests.product.models import ProductModelOrderingFormattedName
from tests.product.models import ProductModelOrderingLookupFormattedName
from vueda.core.formatted_name import formatted_name_annotation_path
from vueda.core.models import FormattedNameManager


@pytest.fixture
def lookup_formatted_name_rows():
    """Created out of both alphabetical and reverse-alphabetical order, so a passing assertion can't
    be explained by insertion or primary-key order matching the expected result."""
    return [
        ProductModelOrderingLookupFormattedName.objects.create(label="Cherry"),
        ProductModelOrderingLookupFormattedName.objects.create(label="Apple"),
        ProductModelOrderingLookupFormattedName.objects.create(label="Banana"),
    ]


@pytest.mark.django_db
class TestLookupExpressionModelQuerysets:
    """ProductModelOrderingLookupFormattedName has no formatted_name column, reaches the value through
    `formatted_name_lookup_expression = "label"`, and declares `Meta.ordering = ["formatted_name"]`.
    """

    def test_the_model_default_ordering_applies_outside_a_viewset(self, lookup_formatted_name_rows):
        """The regression this manager exists for. `Meta.ordering` is compiled into every query, so
        before the annotation moved here this raised `FieldError: Cannot resolve keyword
        'formatted_name'` for any queryset `VuedaViewSet.get_queryset` hadn't touched."""
        labels = list(ProductModelOrderingLookupFormattedName.objects.values_list("label", flat=True))

        assert labels == ["Apple", "Banana", "Cherry"]

    def test_formatted_name_is_readable_as_an_annotation(self, lookup_formatted_name_rows):
        """It resolves to the lookup expression's column, not to something that merely shares the
        name: `label` is the source, and no field called `name` exists on this model."""
        rows = ProductModelOrderingLookupFormattedName.objects.all()

        assert [row.formatted_name for row in rows] == ["Apple", "Banana", "Cherry"]

    def test_formatted_name_is_filterable_on_a_plain_queryset(self, lookup_formatted_name_rows):
        found = ProductModelOrderingLookupFormattedName.objects.filter(formatted_name="Banana")

        assert [row.label for row in found] == ["Banana"]

    def test_explicit_ordering_by_formatted_name_works(self, lookup_formatted_name_rows):
        labels = list(
            ProductModelOrderingLookupFormattedName.objects.order_by("-formatted_name").values_list("label", flat=True)
        )

        assert labels == ["Cherry", "Banana", "Apple"]

    def test_the_default_manager_is_a_formatted_name_manager(self):
        """Django builds related managers from the default manager's class, so reverse relations and
        related-field access inherit the annotation rather than losing it."""
        assert isinstance(ProductModelOrderingLookupFormattedName._default_manager, FormattedNameManager)

    def test_the_annotation_path_is_the_lookup_expression(self):
        assert formatted_name_annotation_path(ProductModelOrderingLookupFormattedName) == "label"


@pytest.mark.django_db
class TestGeneratedFieldModelQuerysets:
    """ProductModelOrderingFormattedName keeps VuedaModel's `formatted_name` GeneratedField column, so
    there is nothing to annotate — and annotating over an existing field name would raise.
    """

    def test_no_annotation_is_added(self):
        queryset = ProductModelOrderingFormattedName.objects.all()

        assert "formatted_name" not in queryset.query.annotations

    def test_the_annotation_path_is_none(self):
        assert formatted_name_annotation_path(ProductModelOrderingFormattedName) is None

    def test_the_model_default_ordering_still_applies(self):
        ProductModelOrderingFormattedName.objects.create(name="Cherry")
        ProductModelOrderingFormattedName.objects.create(name="Apple")

        names = list(ProductModelOrderingFormattedName.objects.values_list("name", flat=True))

        assert names == ["Apple", "Cherry"]

    def test_a_column_wins_over_a_lookup_expression(self, monkeypatch):
        """The rare model that declares both. The column is what the database already sorts and
        filters by, and annotating over it raises `ValueError`, so the column wins. `vueda_info.E004`
        reports the pairing itself."""
        monkeypatch.setattr(
            ProductModelOrderingFormattedName, "formatted_name_lookup_expression", "name", raising=False
        )

        assert formatted_name_annotation_path(ProductModelOrderingFormattedName) is None
        assert "formatted_name" not in ProductModelOrderingFormattedName.objects.all().query.annotations


@pytest.mark.django_db
class TestInheritingTheManager:
    """A model that declares its own `objects` shadows the default manager, so a manager meant for a
    VUEDA model has to inherit `FormattedNameManager` to keep the annotation. These prove inheriting
    is enough, and that not inheriting is what loses it.
    """

    def test_a_subclass_keeps_the_annotation(self, lookup_formatted_name_rows):
        class ArchivedAwareManager(FormattedNameManager):
            pass

        manager = ArchivedAwareManager()
        manager.model = ProductModelOrderingLookupFormattedName

        queryset = manager.get_queryset()

        assert "formatted_name" in queryset.query.annotations
        assert [row.formatted_name for row in queryset] == ["Apple", "Banana", "Cherry"]

    def test_a_subclass_that_narrows_get_queryset_keeps_the_annotation(self, lookup_formatted_name_rows):
        """The shape the docstring recommends: filter on top of `super().get_queryset()` rather than
        building a fresh one."""

        class NoCherriesManager(FormattedNameManager):
            def get_queryset(self):
                return super().get_queryset().exclude(label="Cherry")

        manager = NoCherriesManager()
        manager.model = ProductModelOrderingLookupFormattedName

        assert [row.formatted_name for row in manager.get_queryset()] == ["Apple", "Banana"]

    def test_a_plain_manager_loses_the_annotation(self, lookup_formatted_name_rows):
        """Why the inheritance requirement is documented rather than assumed. A bare `models.Manager`
        on this model produces querysets whose `Meta.ordering` can no longer be resolved."""
        manager = models.Manager()
        manager.model = ProductModelOrderingLookupFormattedName

        queryset = manager.get_queryset()

        assert "formatted_name" not in queryset.query.annotations
        with pytest.raises(FieldError, match="Cannot resolve keyword 'formatted_name'"):
            list(queryset)
