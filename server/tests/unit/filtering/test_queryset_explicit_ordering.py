"""What `queryset_explicit_ordering` reads, and the Django behavior it depends on.

The helper reads two attributes of `django.db.models.sql.Query` — `order_by` and `extra_order_by` —
and relies on the SQL compiler preferring an explicit `order_by` over the model's `Meta.ordering`
(`SQLCompiler._order_by_pairs`). Those are internals, so this file pins both halves: what the helper
returns, and the compiled SQL that makes the returned value mean what `vueda_info.E010` takes it to
mean. A Django version that changed either would fail here rather than in the check's messages.
"""

import pytest
from django.db.models import F
from django.db.models.functions import Lower

from tests.erring.models import ModelOrderingQueryset
from tests.erring.models import ValidLookupExpression
from vueda.core.ordering import queryset_explicit_ordering


def order_by_clause(queryset):
    """The `ORDER BY` clause of a queryset's compiled SQL, or None when it has none."""
    sql = str(queryset.query)
    _select, _sep, clause = sql.partition("ORDER BY")
    return clause.strip() or None


@pytest.mark.django_db
class TestQuerysetExplicitOrdering:
    """ModelOrderingQueryset declares `Meta.ordering = ("-the_name_field",)`; ValidLookupExpression
    declares no ordering at all."""

    def test_an_explicit_order_by_is_reported(self):
        queryset = ModelOrderingQueryset.objects.order_by("the_name_field")

        assert queryset_explicit_ordering(queryset) == ["the_name_field"]

    def test_a_queryset_with_no_order_by_reports_nothing(self):
        """Even though the model declares an ordering. The model's default isn't the queryset's own
        declaration, and reporting it here would make every model with a `Meta.ordering` look like a
        viewset that had ordered its queryset."""
        queryset = ModelOrderingQueryset.objects.all()

        assert queryset_explicit_ordering(queryset) == []
        assert ModelOrderingQueryset._meta.ordering == ("-the_name_field",)

    def test_an_explicit_order_by_overrides_the_model_ordering_in_sql(self):
        """The precedence the check depends on: what the queryset declares is what the database
        sorts by, so an ordering read off the queryset describes the rows a list request returns."""
        assert order_by_clause(ModelOrderingQueryset.objects.all()).endswith("DESC")
        assert order_by_clause(ModelOrderingQueryset.objects.order_by("the_name_field")).endswith("ASC")

    def test_the_model_ordering_applies_when_the_queryset_declares_none(self):
        """The other half of the same precedence, and the reason a queryset reporting nothing is
        left alone: the reported default ordering is then the one that runs."""
        assert order_by_clause(ModelOrderingQueryset.objects.all()) is not None
        assert order_by_clause(ValidLookupExpression.objects.all()) is None

    def test_ordering_terms_are_reported_as_declared(self):
        """Terms come back as `order_by()` received them — an expression stays an expression, so the
        direction and the field paths inside it can be read the way any other ordering term's are."""
        expression = F("the_name_field").desc(nulls_last=True)

        assert queryset_explicit_ordering(ModelOrderingQueryset.objects.order_by(expression)) == [expression]
        assert queryset_explicit_ordering(ModelOrderingQueryset.objects.order_by(Lower("the_name_field"))) == [
            Lower("the_name_field")
        ]

    def test_an_ordering_survives_later_queryset_methods(self):
        """A viewset's `get_queryset` filters the class attribute it starts from, and filtering keeps
        the ordering — which is why an ordering declared on the class attribute is worth checking."""
        queryset = ModelOrderingQueryset.objects.order_by("the_name_field").filter(the_name_field="x")

        assert queryset_explicit_ordering(queryset) == ["the_name_field"]

    def test_a_raw_extra_ordering_reports_nothing(self):
        """`extra(order_by=...)` is raw SQL, so it has no ordering terms to read. Reporting the terms
        it overrides would describe an ordering the query doesn't use."""
        queryset = ModelOrderingQueryset.objects.extra(order_by=["the_name_field"])

        assert queryset_explicit_ordering(queryset) == []

    def test_an_ordering_cleared_by_a_bare_order_by_reports_nothing(self):
        """`order_by()` with no arguments removes the model's default ordering as well as any
        explicit one, leaving a query that sorts by nothing.

        Nothing is reported for it, so `vueda_info.E010` says nothing either — a known gap rather
        than a judgement: the rows arrive unordered while `model_ordering.default` still reports the
        model's declaration. See the "Queryset Ordering" section of
        docs/core-concepts/filtering-and-ordering-semantics.md.
        """
        queryset = ModelOrderingQueryset.objects.order_by()

        assert queryset_explicit_ordering(queryset) == []
        assert order_by_clause(queryset) is None
