"""Which ordering terms can be paired with a ``distinct()`` column, and which cannot.

``VuedaSearchFilterBackend`` re-applies a list's ordering alongside a ``DISTINCT ON`` that has to
match it, and PostgreSQL compares those expressions rather than the values behind them. These are
focused tests for the two helpers that judgement rests on, against real querysets, so each branch is
covered without a search request to carry it.
"""

import pytest
from django.db.models import F
from django.db.models.functions import Concat
from django.db.models.functions import Lower
from django.db.models.functions import Now

from tests.store import models as store_models
from vueda.core.ordering import ordering_term_column_path
from vueda.core.ordering import ordering_term_distinct_column


class TestOrderingTermColumnPath:
    """The three shapes that compile to a bare column reference, and the ones that do not."""

    @pytest.mark.parametrize(
        ("term", "expected"),
        [
            ("name", "name"),
            ("-name", "name"),
            ("customer__data__formatted_name", "customer__data__formatted_name"),
            (F("name"), "name"),
            (F("name").asc(), "name"),
            (F("name").desc(nulls_last=True), "name"),
            (F("name").asc(nulls_first=True), "name"),
        ],
    )
    def test_a_bare_column_reference_reports_its_path(self, term, expected):
        assert ordering_term_column_path(term) == expected

    @pytest.mark.parametrize(
        "term",
        [
            "?",
            Lower("name"),
            Lower("name").desc(),
            Concat("code", "name"),
            Now(),
        ],
    )
    def test_anything_else_reports_no_path(self, term):
        assert ordering_term_column_path(term) is None


@pytest.mark.django_db
class TestOrderingTermDistinctColumn:
    def test_a_concrete_field_pairs_with_itself(self):
        queryset = store_models.Product.objects.all()

        assert ordering_term_distinct_column(queryset, "name") == "name"
        assert ordering_term_distinct_column(queryset, "-name") == "name"
        assert ordering_term_distinct_column(queryset, F("name").asc(nulls_first=True)) == "name"

    def test_a_path_through_a_relation_pairs_with_itself(self):
        """The shape `VuedaOrderingFilter` rewrites `customer__formatted_name` into. Both sides of the
        query resolve the path the same way, so it pairs."""
        queryset = store_models.Cart.objects.all()

        assert (
            ordering_term_distinct_column(queryset, "customer__data__formatted_name")
            == "customer__data__formatted_name"
        )

    def test_an_annotation_pairs_with_its_own_name(self):
        """`Customer` reaches its formatted name through `formatted_name_lookup_expression`, so
        `FormattedNameManager` annotates it onto every queryset. `distinct()` resolves an annotation
        as readily as `order_by()` does."""
        queryset = store_models.Customer.objects.all()

        assert "formatted_name" in queryset.query.annotations
        assert ordering_term_distinct_column(queryset, "formatted_name") == "formatted_name"

    def test_a_function_over_one_column_pairs_with_nothing(self):
        """The column count is not the question. `Lower("name")` reads exactly one column and still
        compiles to `LOWER("name")`, which no `distinct()` argument can produce."""
        queryset = store_models.Product.objects.all()

        assert ordering_term_distinct_column(queryset, Lower("name")) is None
        assert ordering_term_distinct_column(queryset, Lower("name").desc()) is None

    def test_a_relation_whose_related_model_orders_itself_pairs_with_nothing(self):
        """`Customer` declares `ordering = ["user__name"]`, which Django puts in place of the relation
        name over the joined table, while `distinct()` trims the join back to the local column."""
        queryset = store_models.Cart.objects.all()

        assert store_models.Customer._meta.ordering == ["user__name"]
        assert ordering_term_distinct_column(queryset, "customer") is None

    def test_a_relation_whose_related_model_declares_no_ordering_pairs_with_itself(self):
        """`Distributor` declares no `Meta.ordering`, so Django leaves the ordering on the local
        foreign key column and both sides reach it."""
        queryset = store_models.Product.objects.all()

        assert not store_models.Distributor._meta.ordering
        assert ordering_term_distinct_column(queryset, "distributor") == "distributor"

    def test_the_pk_alias_pairs_with_the_field_behind_it(self):
        queryset = store_models.Product.objects.all()

        assert ordering_term_distinct_column(queryset, "pk") == "id"
        assert ordering_term_distinct_column(queryset, "-pk") == "id"

    def test_a_composite_pk_alias_pairs_with_nothing(self):
        """The alias stands for more than one column there, and the pairing is one term to one
        column."""
        queryset = store_models.OrderItemCompositePK.objects.all()

        assert ordering_term_distinct_column(queryset, "pk") is None

    @pytest.mark.parametrize("term", ["?", "not_a_field", "customer__not_a_field"])
    def test_an_unpairable_or_unresolvable_term_pairs_with_nothing(self, term):
        queryset = store_models.Cart.objects.all()

        assert ordering_term_distinct_column(queryset, term) is None
