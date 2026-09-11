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
from django.db.models.deletion import Collector

from tests.conftest import use_plain_base_manager
from tests.product.models import ProductCascadeOrderedByFormattedName
from tests.product.models import ProductCascadeOrderedNote
from tests.product.models import ProductCascadeOwner
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


@pytest.mark.django_db
class TestCascadeDeleteThroughTheBaseManager:
    """The one path `FormattedNameManager` does not reach, and the failure `vueda_core.E017` prevents.

    `Collector.related_objects` builds its queryset from `related_model._base_manager`, and
    `Collector.collect` evaluates it whenever `can_fast_delete` said no. That queryset carries the
    related model's `Meta.ordering`, so a model ordering by a `formatted_name` its base manager
    cannot annotate raises `FieldError` on a delete of its parent — a query nobody in the calling
    code wrote, naming a field that isn't on the table.

    `ProductCascadeOwner` -> `ProductCascadeOrderedByFormattedName` -> `ProductCascadeOrderedNote` is
    the shape that reaches it. The note table is what keeps the middle model off the fast-delete
    path; without it Django deletes those rows with one statement and never compiles the ordering.
    """

    @pytest.fixture
    def cascade_rows(self):
        owner = ProductCascadeOwner.objects.create(name="Owner")
        for label in ("Cherry", "Apple", "Banana"):
            row = ProductCascadeOrderedByFormattedName.objects.create(owner=owner, label=label)
            ProductCascadeOrderedNote.objects.create(ordered_row=row, name=f"note for {label}")

        return owner

    def test_the_collected_model_cannot_be_fast_deleted(self):
        """The fixture's own precondition. If Django could fast-delete these rows the collector would
        never evaluate the queryset, and the test below would pass whatever the base manager was."""
        collector = Collector(using="default")

        assert collector.can_fast_delete(ProductCascadeOrderedByFormattedName) is False

    def test_the_cascade_delete_succeeds(self, cascade_rows):
        """With `Meta.base_manager_name` selecting the annotating manager, the collected queryset
        resolves its own ordering and the delete goes through to the notes."""
        cascade_rows.delete()

        assert ProductCascadeOrderedByFormattedName.objects.count() == 0
        assert ProductCascadeOrderedNote.objects.count() == 0

    def test_a_plain_base_manager_makes_the_cascade_raise(self, cascade_rows, monkeypatch):
        """The regression itself. Nothing about the delete mentions `formatted_name`, and neither does
        the model's own table — the ordering is compiled into a queryset the collector built."""
        use_plain_base_manager(ProductCascadeOrderedByFormattedName, monkeypatch)

        with pytest.raises(FieldError, match="Cannot resolve keyword 'formatted_name'"):
            cascade_rows.delete()

    def test_the_check_reports_what_the_delete_would_have_hit(self, monkeypatch):
        """Same model, same patched base manager, at startup instead of on a delete. This is the whole
        point of the check: the configuration is visible from `manage.py check`, so nobody has to
        reach it through a cascade to find out."""
        use_plain_base_manager(ProductCascadeOrderedByFormattedName, monkeypatch)

        errors = [error for error in ProductCascadeOrderedByFormattedName.check() if error.id == "vueda_core.E017"]

        assert len(errors) == 1
