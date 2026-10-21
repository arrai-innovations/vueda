"""What the path resolvers in `vueda.core.paths` return, and the Django behavior they depend on.

`query_path_field`, `query_path_multiplies_rows`, and `annotation_path_output_field` ask Django's own
`Query.names_to_path` and `Query.resolve_ref` to resolve a path, rather than repeating Django's rules
for relations, the `pk` alias, transforms, and annotations. Those are Django internals, so this file
pins the results that VUEDA's ordering checks, ordering metadata, and column totals rely on. A Django
version that changed them would fail here rather than in a check message or a metadata response.

Nothing here runs a query, so no database is needed.
"""

import pytest
from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.db.models import F
from django.db.models import Max
from django.db.models import Transform
from django.db.models.functions import Ceil
from django.db.models.functions import Coalesce
from django.test.utils import register_lookup

from tests.product.models import ProductRelease
from tests.store.models import Cart
from tests.store.models import CartItem
from tests.store.models import Invoice
from tests.store.models import Product as StoreProduct
from tests.timesheet.models import TimesheetEntry
from vueda.core.paths import annotation_path_field
from vueda.core.paths import annotation_path_output_field
from vueda.core.paths import has_public_ordering_name
from vueda.core.paths import path_annotation_name
from vueda.core.paths import query_path_field
from vueda.core.paths import query_path_multiplies_rows


class TwoArgumentTransform(Transform):
    """A transform that needs two arguments, which a query path can't give it."""

    lookup_name = "twoarg"
    arity = 2


class TestQueryPathField:
    """The field that describes the value a path names on a model."""

    def test_a_plain_field_is_itself(self):
        assert query_path_field(ProductRelease, "name") is ProductRelease._meta.get_field("name")

    def test_a_foreign_key_is_the_foreign_key(self):
        """Django sorts by the key's column, but the path names the relation, and the metadata has
        always typed it from the relation field."""
        assert query_path_field(Cart, "customer") is Cart._meta.get_field("customer")

    def test_a_path_through_a_relation_is_the_field_at_its_end(self):
        """`names_to_path` keeps the field that the path names, where `resolve_ref` would trim the
        join and hand back the foreign key."""
        customer_model = Cart._meta.get_field("customer").related_model

        assert query_path_field(Cart, "customer__id") is customer_model._meta.get_field("id")

    def test_a_many_to_many_path_is_the_many_to_many_field(self):
        """`names_to_path` reaches the through table's foreign key here. Filter metadata reads choices
        and a type from the field, so the `ManyToManyField` itself is what has to come back."""
        assert query_path_field(StoreProduct, "special_care") is StoreProduct._meta.get_field("special_care")

    def test_the_pk_alias_is_the_primary_key(self):
        assert query_path_field(ProductRelease, "pk") is ProductRelease._meta.pk

    def test_a_transform_is_typed_from_its_output(self):
        assert isinstance(query_path_field(ProductRelease, "released__year"), models.IntegerField)

    def test_a_chain_of_transforms_is_typed_from_the_last_one(self):
        assert isinstance(query_path_field(ProductRelease, "released__date__year"), models.IntegerField)

    def test_a_key_on_a_json_field_is_json(self):
        assert isinstance(query_path_field(ProductRelease, "specs__rank"), models.JSONField)

    def test_a_json_key_named_pk_is_a_key_rather_than_the_alias(self):
        assert isinstance(query_path_field(ProductRelease, "specs__pk"), models.JSONField)

    def test_a_misspelled_transform_does_not_resolve(self):
        """The message is the one that Django's `FieldError` carries when a query orders by the path."""
        with pytest.raises(FieldDoesNotExist, match=r"^Cannot resolve keyword 'yaer' into field\. Join on 'released'"):
            query_path_field(ProductRelease, "released__yaer")

    def test_a_missing_field_does_not_resolve(self):
        with pytest.raises(FieldDoesNotExist, match=r"^Cannot resolve keyword 'no_such_field' into field\."):
            query_path_field(ProductRelease, "no_such_field")

    def test_a_transform_that_cannot_be_built_raises_djangos_own_error(self):
        """Django raises `TypeError` for a `Transform` that needs more than the one value a path gives
        it. That error passes through unchanged, so it points at the broken transform."""
        with (
            register_lookup(models.CharField, TwoArgumentTransform),
            pytest.raises(TypeError, match="takes exactly 2 arguments"),
        ):
            query_path_field(ProductRelease, "name__twoarg")

    def test_a_registered_transform_resolves_only_while_registered(self):
        """`ceil` is a transform only once a project registers `Ceil`, and Django reads the registry
        each time it resolves a path."""
        with register_lookup(models.DecimalField, Ceil):
            assert isinstance(query_path_field(TimesheetEntry, "hours__ceil"), models.DecimalField)

        with pytest.raises(FieldDoesNotExist):
            query_path_field(TimesheetEntry, "hours__ceil")


class TestQueryPathMultipliesRows:
    """Whether a path joins through a relation that can match more than one row."""

    def test_a_reverse_foreign_key_multiplies_rows(self):
        assert query_path_multiplies_rows(Invoice, "invoice_lines__amount") is True

    def test_forward_foreign_keys_do_not(self):
        assert query_path_multiplies_rows(CartItem, "cart__customer__id") is False

    def test_a_transform_on_a_column_does_not(self):
        assert query_path_multiplies_rows(ProductRelease, "released__year") is False


class TestAnnotationPathOutputField:
    """The output field of a path that starts with a queryset annotation."""

    def test_a_plain_annotation_is_typed_from_the_annotation(self):
        query = ProductRelease.objects.annotate(launched=F("released")).query

        assert isinstance(annotation_path_output_field(query, "launched"), models.DateTimeField)

    def test_a_transform_on_an_annotation_is_typed_from_the_transform(self):
        query = ProductRelease.objects.annotate(launched=F("released")).query

        assert isinstance(annotation_path_output_field(query, "launched__year"), models.IntegerField)

    def test_a_transform_on_an_alias_resolves(self):
        """`resolve_ref` reads every annotation, including the ones `.alias()` added. That is what lets
        `VuedaOrderingFilter` order by such a path through `F()`."""
        query = ProductRelease.objects.alias(launched=F("released")).query

        assert isinstance(annotation_path_output_field(query, "launched__year"), models.IntegerField)

    def test_a_transform_on_an_aggregate_annotation_resolves(self):
        query = ProductRelease.objects.annotate(latest=Max("released")).query

        assert isinstance(annotation_path_output_field(query, "latest__year"), models.IntegerField)

    def test_an_annotation_of_mixed_types_does_not_resolve(self):
        query = ProductRelease.objects.annotate(launched=Coalesce("released", "name")).query

        assert annotation_path_output_field(query, "launched") is None
        assert annotation_path_output_field(query, "launched__year") is None

    def test_a_misspelled_transform_does_not_resolve(self):
        query = ProductRelease.objects.annotate(launched=F("released")).query

        assert annotation_path_output_field(query, "launched__yaer") is None

    def test_annotation_path_field_raises_with_djangos_message(self):
        """`annotation_path_field` is what a check calls for Django's reason. A path on an annotation is
        resolved through the transform lookup, whose message suggests the transform that was meant."""
        query = ProductRelease.objects.annotate(launched=F("released")).query

        with pytest.raises(FieldDoesNotExist, match=r"Unsupported lookup 'yaer' .* perhaps you meant year\?$"):
            annotation_path_field(query, "launched__yaer")

    def test_a_path_that_starts_with_a_model_field_is_not_an_annotation_path(self):
        query = ProductRelease.objects.annotate(launched=F("released")).query

        assert annotation_path_output_field(query, "released__year") is None

    def test_resolving_leaves_the_query_unchanged(self):
        """`resolve_ref` adds the joins it needs to the query it runs on, so the resolver works on a
        clone. A changed query would change the SQL of the queryset it belongs to."""
        query = Cart.objects.annotate(joined=F("customer__user__date_joined")).query
        joins_before = dict(query.alias_map)

        assert isinstance(annotation_path_output_field(query, "joined__year"), models.IntegerField)
        assert dict(query.alias_map) == joins_before


class TestPathAnnotationName:
    def test_the_annotation_a_path_starts_with_is_named(self):
        assert path_annotation_name({"launched": None}, "launched__year") == "launched"

    def test_a_plain_annotation_name_is_named(self):
        assert path_annotation_name({"launched": None}, "launched") == "launched"

    def test_a_path_that_starts_with_anything_else_names_nothing(self):
        assert path_annotation_name({"launched": None}, "released__year") is None


class TestHasPublicOrderingName:
    @pytest.mark.parametrize("path", ["name", "customer__formatted_name", "released__year", "specs__rank"])
    def test_an_ordinary_path_has_one(self, path):
        assert has_public_ordering_name(path) is True

    @pytest.mark.parametrize("path", ["specs__v1.2", "specs__a,b"])
    def test_a_key_with_a_dot_or_a_comma_has_none(self, path):
        assert has_public_ordering_name(path) is False
