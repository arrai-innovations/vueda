import warnings

import pytest
from django.db import models
from django.db.models import Transform
from django.db.models.functions import Ceil
from django.db.models.functions import Left
from django.db.models.functions import Lower
from django.db.models.sql.query import Query
from django.test.utils import register_lookup

from tests.erring import models as err_models
from tests.erring import serializers as err_serializers
from tests.erring import viewsets as err_viewsets
from tests.product import serializers as product_serializers
from tests.product import viewsets as product_viewsets
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from tests.timesheet import serializers as timesheet_serializers
from tests.timesheet import viewsets as timesheet_viewsets
from vueda import info
from vueda.info import checks


class TwoArgumentTransform(Transform):
    """A transform that needs two arguments, which a query path can't give it. Django raises
    `TypeError` when it builds this from a path."""

    lookup_name = "twoarg"
    arity = 2


ORDERING_HINT = (
    "formatted_name cannot be used for ordering alongside a get_formatted_name() method: "
    "the value is computed in Python, so the database has no column to sort by, and "
    "sorting in Python would mean loading every row. Set "
    "formatted_name_lookup_expression to a database path instead, or order by a "
    "different field."
)


@pytest.mark.django_db
class TestFormattedNameChecks:
    def test_property_formatted_name_system_check_error(self):
        """PropertyFormattedName decorates get_formatted_name with @property; check must flag it as E003."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.PropertyFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "PropertyFormattedName.get_formatted_name is decorated with @property.",
                hint="Remove the @property decorator; get_formatted_name() must be a plain method.",
                obj=err_models.PropertyFormattedName,
                id="vueda_info.E003",
            )
        ]

    def test_both_formatted_name_options_system_check_error(self):
        """BothFormattedNameConfigured has both a lookup expression and get_formatted_name(); check must flag it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.BothFormattedNameConfiguredSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "BothFormattedNameConfigured defines both formatted_name_lookup_expression and get_formatted_name().",
                hint=(
                    "Use formatted_name_lookup_expression for DB field lookups, "
                    "or get_formatted_name() for computed values — not both."
                ),
                obj=err_models.BothFormattedNameConfigured,
                id="vueda_info.E002",
            )
        ]

    def test_both_lookup_expression_and_select_related_system_check_error(self):
        """BothFormattedNameSelectRelatedConfigured has both a lookup expression and
        formatted_name_select_related; check must flag it as E011, since select_related only has an
        effect alongside get_formatted_name()."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.BothFormattedNameSelectRelatedConfiguredSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "BothFormattedNameSelectRelatedConfigured defines both formatted_name_lookup_expression "
                "and formatted_name_select_related.",
                hint=(
                    "formatted_name_select_related only has an effect alongside a get_formatted_name() "
                    "method: formatted_name_lookup_expression resolves entirely through a database "
                    "annotation, so there is no per-instance computation for select_related to prepare "
                    "relations for. Remove whichever one the model doesn't use."
                ),
                obj=err_models.BothFormattedNameSelectRelatedConfigured,
                id="vueda_info.E011",
            )
        ]

    def test_formatted_name_expression_not_string(self):
        """FormattedNameExpressionNotString has a lookup expression that is not a string; check must flag it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.FormattedNameExpressionNotStringSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "FormattedNameExpressionNotString defines formatted_name_lookup_expression as something other than "
                "a string.",
                hint=("formatted_name_lookup_expression is used by DB field lookups, so it must be a string."),
                obj=err_models.FormattedNameExpressionNotString,
                id="vueda_info.E004",
            )
        ]

    def test_model_without_formatted_name_override_passes_system_check(self):
        """A model that does not override formatted_name should be skipped by the check (no errors)."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.NoExpandableFieldsDataSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_model_with_falsey_formatted_name_expression_fails_system_check(self):
        """A model whose formatted name lookup expression is falsey fails the system check."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.FalseyFormattedNamesLookupSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "FalseyFormattedNamesLookup defines formatted_name_lookup_expression as something other than a string.",
                hint=("formatted_name_lookup_expression is used by DB field lookups, so it must be a string."),
                obj=err_models.FalseyFormattedNamesLookup,
                id="vueda_info.E004",
            )
        ]

    def test_valid_get_formatted_name_passes_system_check(self):
        """ValidGetFormattedName sets formatted_name=None with a plain get_formatted_name() method; check must produce
        no errors."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_valid_lookup_expression_passes_system_check(self):
        """ValidLookupExpression sets formatted_name=None with a string lookup expression; check must produce no
        errors."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidLookupExpressionSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_multi_valued_lookup_expression_system_check_error(self):
        """MultiValuedLookupExpression reaches its formatted name across a many-to-many.

        VUEDA annotates the expression onto every queryset of the model, so this would return a row
        per related object everywhere rather than failing anywhere; E008 is what surfaces it.
        """
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.MultiValuedLookupExpressionSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "MultiValuedLookupExpression.formatted_name_lookup_expression is "
                "'the_name_fields__the_name_field', which reaches through a relation that can match "
                "more than one row.",
                hint=(
                    "VUEDA annotates this path as `formatted_name` on every queryset of the model, so "
                    "joining a reverse foreign key, a many-to-many, or a GenericRelation would return a "
                    "row per related object rather than a row per object. Point it at a column on this "
                    "model, or at one reached through single-valued relations (a forward foreign key or "
                    "a one-to-one, nullable or not)."
                ),
                obj=err_models.MultiValuedLookupExpression,
                id="vueda_info.E008",
            )
        ]

    def test_single_valued_lookup_expression_passes_system_check(self):
        """SingleValuedLookupExpression reaches its formatted name across a nullable forward FK.

        That is a LEFT OUTER JOIN matching at most one row, so it multiplies nothing and E008 has to
        stay quiet — the check is about row count, not about whether a relation is traversed.
        """
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SingleValuedLookupExpressionSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_unresolvable_lookup_expression_is_not_reported_by_e008(self):
        """A lookup expression naming no path is left to fail at query time, not reported as E008.

        FormattedNameExpressionNotString is the non-string case (E004); this covers the other way a
        path can fail to resolve, and asserts E008 doesn't claim it.
        """
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidLookupExpressionSerializer)

        model = err_models.ValidLookupExpression
        original = model.formatted_name_lookup_expression
        model.formatted_name_lookup_expression = "no_such_field"
        try:
            errors = check_formatted_name_configuration(app_configs=None)
        finally:
            model.formatted_name_lookup_expression = original

        assert errors == []

    def test_no_name_field_system_check_error(self):
        """NoNameField has formatted_name = None with no lookup expression or get_formatted_name(); check must flag
        it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.NoNameFieldSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "NoNameField sets formatted_name = None but provides no alternative.",
                hint=(
                    "Set formatted_name_lookup_expression to a DB field name, "
                    "or define get_formatted_name() on the model."
                ),
                obj=err_models.NoNameField,
                id="vueda_info.E001",
            )
        ]

    def test_non_vueda_model_skips_formatted_name_check(self):
        """NonVuedaFormattedName is a plain model (no VuedaModel heritage); formatted name checks must be skipped
        entirely."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.NonVuedaFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_viewset_ordering_by_method_backed_formatted_name_system_check_error(self):
        """ValidGetFormattedNameOrderingViewSet default-orders by a formatted_name computed by
        get_formatted_name(), which the database can't sort by; check must flag it as E005."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidGetFormattedNameSerializer, err_viewsets.ValidGetFormattedNameOrderingViewSet
        )

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "Ordering by formatted_name is declared in ValidGetFormattedNameOrderingViewSet.ordering, but "
                "ValidGetFormattedName.formatted_name is computed by get_formatted_name().",
                hint=ORDERING_HINT,
                obj=err_models.ValidGetFormattedName,
                id="vueda_info.E005",
            )
        ]

    def test_viewset_ordering_fields_with_method_backed_formatted_name_system_check_error(self):
        """A method-backed formatted_name offered through `ordering_fields` is just as unorderable as
        one used for the default ordering; check must flag it and name `ordering_fields`."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidGetFormattedNameSerializer,
            err_viewsets.ValidGetFormattedNameOrderingFieldsViewSet,
        )

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "Ordering by formatted_name is declared in "
                "ValidGetFormattedNameOrderingFieldsViewSet.ordering_fields, but "
                "ValidGetFormattedName.formatted_name is computed by get_formatted_name().",
                hint=ORDERING_HINT,
                obj=err_models.ValidGetFormattedName,
                id="vueda_info.E005",
            )
        ]

    def test_model_meta_ordering_by_method_backed_formatted_name_system_check_error(self):
        """`Meta.ordering` is checked as well as the viewset's declarations, and is reported even when
        the model is registered without a viewset at all.

        `Meta.ordering` is patched rather than declared on a dedicated model: the check reads it
        directly, so patching exercises the same path without a test model and migration existing only
        to hold one invalid Meta option.
        """
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        original_ordering = err_models.ValidGetFormattedName._meta.ordering
        err_models.ValidGetFormattedName._meta.ordering = ["-formatted_name"]
        try:
            errors = check_formatted_name_configuration(app_configs=None)
        finally:
            err_models.ValidGetFormattedName._meta.ordering = original_ordering

        assert errors == [
            Error(
                "Ordering by formatted_name is declared in ValidGetFormattedName.Meta.ordering, but "
                "ValidGetFormattedName.formatted_name is computed by get_formatted_name().",
                hint=ORDERING_HINT,
                obj=err_models.ValidGetFormattedName,
                id="vueda_info.E005",
            )
        ]

    def test_ordering_by_lookup_expression_formatted_name_passes_system_check(self):
        """ValidLookupExpressionOrderingViewSet orders by a formatted_name backed by
        `formatted_name_lookup_expression`, which the database can sort by; check must stay quiet."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer,
            err_viewsets.ValidLookupExpressionOrderingViewSet,
        )

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_method_backed_formatted_name_without_ordering_passes_system_check(self):
        """A method-backed formatted_name is only a problem when something orders by it; a model that
        merely has one must not be flagged."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_expandable_model_with_no_formatted_name_found_by_system_check(self):
        """The enhanced check scans expandable_fields; NoNameField is not registered directly but is flagged because it
        appears in RelatedObjectsAreMissingDataSerializer.expandable_fields."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.RelatedObjectsAreMissingDataSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        error_objs = {e.obj for e in errors}
        assert err_models.RelatedObjectsAreMissingData in error_objs
        assert err_models.NoNameField in error_objs
        assert all(e.id == "vueda_info.E001" for e in errors)


@pytest.mark.django_db
class TestOrderingDeclarationChecks:
    """`vueda_info.E006` covers a viewset's `ordering` and `ordering_fields`.

    A model's `Meta.ordering` is left to Django's own `models.E015`, which reports the same drift with
    the same message, so it isn't checked twice.
    """

    def test_unresolvable_viewset_ordering_system_check_error(self):
        """UnresolvableOrderingViewSet default-orders by a field the model doesn't have; check must
        flag it as E006 and name `ordering`.

        The message ends with Django's own `FieldError` text, which is what a list request falling
        back to this ordering fails with. Django lists the model's field and relation names after it,
        and those change with the test models, so only the sentence before the list is pinned."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UnresolvableOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E006"
        assert errors[0].obj is err_viewsets.UnresolvableOrderingViewSet
        assert errors[0].msg.startswith(
            "Ordering by 'no_such_field' is declared in UnresolvableOrderingViewSet.ordering, but Django can't "
            "resolve it: Cannot resolve keyword 'no_such_field' into field. Choices are: "
        ), errors[0].msg
        assert errors[0].hint == (
            "Point it at a field ValidLookupExpression has, at a path through its relations, "
            "or at an annotation the viewset's own `get_queryset` adds. Model-info metadata "
            "leaves what it can't resolve out of `model_ordering`, and a list request that "
            "falls back to this ordering fails with a `FieldError`."
        )

    def test_unresolvable_ordering_fields_entry_system_check_error(self):
        """UnresolvableOrderingFieldsViewSet offers a field the model doesn't have through
        `ordering_fields`. Nothing fails at request time for this one, so the check is the only signal
        it produces; the hint says so rather than promising a `FieldError`."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UnresolvableOrderingFieldsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E006"
        assert errors[0].obj is err_viewsets.UnresolvableOrderingFieldsViewSet
        assert errors[0].msg.startswith(
            "Ordering by 'no_such_field' is declared in UnresolvableOrderingFieldsViewSet.ordering_fields, but "
            "Django can't resolve it: Cannot resolve keyword 'no_such_field' into field. Choices are: "
        ), errors[0].msg
        assert errors[0].hint == (
            "Point it at a field ValidLookupExpression has, at a path through its relations, "
            "or at an annotation the viewset's own `get_queryset` adds. Model-info metadata "
            "leaves what it can't resolve out of `model_ordering`, so clients are never "
            "offered this field to order by."
        )

    def test_unresolvable_labelled_ordering_fields_entry_system_check_error(self):
        """LabelledOrderingFieldsViewSet writes both `ordering_fields` entries as DRF's
        `(field_name, label)` pair. The check reads the name off a pair the way DRF and the metadata
        do, so the stale one is reported by its field name — not by the pair — and the label stays
        out of the message. Read as an ordering term instead, a pair yields no field path at all and
        a stale one would be reported by nothing."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.LabelledOrderingFieldsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E006"
        assert errors[0].obj is err_viewsets.LabelledOrderingFieldsViewSet
        assert errors[0].msg.startswith(
            "Ordering by 'no_such_field' is declared in LabelledOrderingFieldsViewSet.ordering_fields, but "
            "Django can't resolve it: Cannot resolve keyword 'no_such_field' into field. Choices are: "
        ), errors[0].msg
        assert errors[0].hint == (
            "Point it at a field ValidLookupExpression has, at a path through its relations, "
            "or at an annotation the viewset's own `get_queryset` adds. Model-info metadata "
            "leaves what it can't resolve out of `model_ordering`, so clients are never "
            "offered this field to order by."
        )

    def test_resolvable_labelled_ordering_fields_entry_is_not_flagged(self):
        """The pair naming a real field is left alone, so declaring a field with a label doesn't
        become an error in itself."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.LabelledOrderingFieldsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        # The one error is about the stale pair. `the_name_field` still appears in the message, but
        # only in Django's list of the model's field names after "Choices are:".
        assert len(errors) == 1
        assert errors[0].msg.startswith("Ordering by 'no_such_field' is declared in "), errors[0].msg
        assert "The Name" not in errors[0].msg

    def test_resolvable_field_in_the_same_declaration_is_not_flagged(self):
        """Both declarations pair the bad term with a real one; only the bad term is reported."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UnresolvableOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        # The one error is about the bad term. `the_name_field` still appears in the message, but only
        # in Django's list of the model's field names after "Choices are:".
        assert len(errors) == 1
        assert errors[0].msg.startswith("Ordering by 'no_such_field' is declared in "), errors[0].msg

    def test_pk_and_lookup_expression_aliases_pass_system_check(self):
        """ResolvableOrderingAliasesViewSet orders by "pk", by a lookup-expression formatted_name, and
        offers "?" — none of them a field name on the model, all of them resolvable (or, for "?",
        Django's random ordering); check must stay quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.ResolvableOrderingAliasesViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == []

    def test_queryset_annotation_passes_system_check(self):
        """AnnotatedOrderingViewSet orders by an annotation its own `get_queryset` adds. The metadata
        can't resolve it against the model and leaves it out, but ordering by it works, so the check
        must not report a working configuration."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.AnnotatedOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == []

    def test_method_backed_formatted_name_ordering_is_left_to_e005(self):
        """A formatted_name computed in Python resolves to nothing here either, but E005 already reports
        it with an answer specific to that case, so the ordering check must not report it a second
        time."""
        from vueda.info.checks import check_formatted_name_configuration
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidGetFormattedNameSerializer,
            err_viewsets.ValidGetFormattedNameOrderingViewSet,
        )

        assert check_ordering_configuration(app_configs=None) == []
        assert [error.id for error in check_formatted_name_configuration(app_configs=None)] == ["vueda_info.E005"]

    def test_model_meta_ordering_is_left_to_django(self):
        """A stale `Meta.ordering` is Django's `models.E015` to report, so this check stays quiet about
        it and doesn't double up on the same declaration."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer,
            err_viewsets.ValidLookupExpressionOrderingViewSet,
        )

        original_ordering = err_models.ValidLookupExpression._meta.ordering
        err_models.ValidLookupExpression._meta.ordering = ["no_such_field"]
        try:
            errors = check_ordering_configuration(app_configs=None)
        finally:
            err_models.ValidLookupExpression._meta.ordering = original_ordering

        assert errors == []

    def test_related_lookup_expression_formatted_name_passes_system_check(self):
        """CartOrderingRelatedFormattedNameViewSet orders by `Lower("customer__formatted_name")`.
        Customer has a lookup expression, and `VuedaOrderingFilter` rewrites the path to the column
        behind it before the query runs, so this is a working configuration the check must stay quiet
        about — which it can only tell by reading the path out of the function term."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartOrderingRelatedFormattedNameViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == []

    def test_method_backed_related_formatted_name_system_check_error(self):
        """CartItemOrderingRelatedFormattedNameViewSet offers both `cart__customer__formatted_name`,
        which can be followed over two hops, and `cart__formatted_name`, which can't: Cart computes its
        formatted name in Python, so no rewrite reaches it. Only the second is reported."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.CartItemSerializer, store_viewsets.CartItemOrderingRelatedFormattedNameViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E006"]
        assert "Ordering by 'cart__formatted_name' is declared in " in errors[0].msg
        assert "cart__customer__formatted_name" not in errors[0].msg

    def test_multi_valued_related_formatted_name_system_check_error(self):
        """CartOrderingMultiValuedFormattedNameViewSet offers `cart_items__formatted_name`. CartItem has
        a lookup expression, so the path could be rewritten — but the reverse foreign key would join a
        row per cart item and multiply the rows a list returns, so it is refused and reported."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartOrderingMultiValuedFormattedNameViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E006"]
        assert "Ordering by 'cart_items__formatted_name' is declared in " in errors[0].msg

    def test_transform_in_viewset_ordering_passes_system_check(self):
        """ProductReleaseTransformDefaultViewSet default-orders by `released__year` and
        `-released__month`. Django resolves `year` and `month` as transforms on the date/time column,
        so the ordering works and the check must stay quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseTransformDefaultViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_transforms_in_ordering_fields_pass_system_check(self):
        """ProductReleaseTransformFieldsViewSet offers a single transform, a chain of two transforms,
        and a key on a `JSONField`. Each one resolves through Django's lookup registry, so the check
        must stay quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseTransformFieldsViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_misspelled_transform_system_check_error(self):
        """ProductReleaseMisspelledTransformViewSet offers `released__yaer`. Django holds no `yaer`
        transform for a date/time column, so the path names nothing and is reported with the
        `FieldError` that Django raises for it when a query orders by it. The real field beside it is
        not reported."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseMisspelledTransformViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "Ordering by 'released__yaer' is declared in "
                "ProductReleaseMisspelledTransformViewSet.ordering_fields, but Django can't resolve it: "
                "Cannot resolve keyword 'yaer' into field. Join on 'released' not permitted.",
                hint=(
                    "Point it at a field ProductRelease has, at a path through its relations, or at an "
                    "annotation the viewset's own `get_queryset` adds. Model-info metadata leaves what it "
                    "can't resolve out of `model_ordering`, so clients are never offered this field to "
                    "order by."
                ),
                obj=product_viewsets.ProductReleaseMisspelledTransformViewSet,
                id="vueda_info.E006",
            )
        ]

    def test_transform_after_an_annotation_passes_system_check(self):
        """ProductReleaseAnnotationTransformViewSet offers `launched__year`, where `launched` is an
        annotation that `get_queryset` adds. Django applies `year` to the annotation, so the check
        must stay quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseAnnotationTransformViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_transform_after_a_lookup_expression_formatted_name_passes_system_check(self):
        """ProductModelOrderingLookupFormattedNameTransformViewSet offers `formatted_name__lower` on
        a model that reaches `formatted_name` through a lookup expression. With `Lower` registered on
        `CharField`, the path resolves through the lookup expression, so the check must stay quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductModelOrderingLookupFormattedNameSerializer,
            product_viewsets.ProductModelOrderingLookupFormattedNameTransformViewSet,
        )

        with register_lookup(models.CharField, Lower):
            assert check_ordering_configuration(app_configs=None) == []

    def test_transform_after_a_related_formatted_name_passes_system_check(self):
        """CartOrderingRelatedFormattedNameTransformViewSet offers `customer__formatted_name__lower`.
        Customer reaches its formatted name through a lookup expression, and the transform is applied
        to the path behind it, so the check must stay quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartOrderingRelatedFormattedNameTransformViewSet)

        with register_lookup(models.CharField, Lower):
            assert check_ordering_configuration(app_configs=None) == []

    def test_unregistered_transform_after_a_formatted_name_system_check_error(self):
        """Without `Lower` registered, `lower` is no transform that Django holds for a `CharField`, so
        `customer__formatted_name__lower` names nothing and is reported."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, store_viewsets.CartOrderingRelatedFormattedNameTransformViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E006"]
        assert "Ordering by 'customer__formatted_name__lower' is declared in " in errors[0].msg

    def test_annotation_name_containing_a_dot_system_check_error(self):
        """ProductReleaseDottedAnnotationViewSet offers `v1.2`, an annotation name with a dot in it.
        Every annotation name resolves, but this one can't be named in a `?o=` request, so it is
        reported with the same message as a dotted `JSONField` key."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseDottedAnnotationViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.msg for error in errors] == [
            "Ordering by 'v1.2' is declared in ProductReleaseDottedAnnotationViewSet.ordering_fields, but no "
            "`?o=` name can carry the path, because it contains a '.' or a ','.",
        ]
        assert errors[0].id == "vueda_info.E006"

    def test_transform_after_an_alias_passes_system_check(self):
        """ProductReleaseAliasTransformViewSet offers `launched` and `launched__year`, where `launched`
        comes from `.alias()`. `VuedaOrderingFilter` orders by the transform path through `F()`, which
        Django resolves against aliases, so the check must stay quiet about both."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseAliasTransformViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_json_key_containing_a_dot_or_a_comma_system_check_error(self):
        """ProductReleaseDottedJSONKeyViewSet offers `specs__v1.2` and `specs__a,b`. Both paths resolve,
        but no client can request either, so the message says that rather than claiming the model has
        no such field."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseDottedJSONKeyViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.msg for error in errors] == [
            "Ordering by 'specs__v1.2' is declared in ProductReleaseDottedJSONKeyViewSet.ordering_fields, but no "
            "`?o=` name can carry the path, because it contains a '.' or a ','.",
            "Ordering by 'specs__a,b' is declared in ProductReleaseDottedJSONKeyViewSet.ordering_fields, but no "
            "`?o=` name can carry the path, because it contains a '.' or a ','.",
        ]
        assert {error.id for error in errors} == {"vueda_info.E006"}

    def test_json_key_named_pk_passes_system_check(self):
        """ProductReleaseJSONPKKeyViewSet offers `specs__pk`. `specs` is not a relation, so the trailing
        `pk` is a key on the `JSONField` rather than the primary key alias, and the check must stay
        quiet."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseJSONPKKeyViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_function_registered_as_a_lookup_is_not_a_transform(self):
        """ProductReleaseFunctionLookupViewSet offers `name__left`, with `Left` registered on
        `CharField`. `Left` is not a `Transform`, so Django doesn't apply it, and the check reports the
        `FieldError` that a query ordered by the path fails with."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseFunctionLookupViewSet
        )

        with register_lookup(models.CharField, Left, lookup_name="left"):
            errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E006"]
        assert errors[0].msg == (
            "Ordering by 'name__left' is declared in ProductReleaseFunctionLookupViewSet.ordering_fields, but "
            "Django can't resolve it: Cannot resolve keyword 'left' into field. Join on 'name' not permitted."
        )

    def test_transform_that_cannot_be_built_from_the_path_raises_djangos_error(self):
        """ProductReleaseTwoArgumentTransformViewSet offers `name__twoarg`, with a two-argument
        `Transform` registered under that name. Django raises `TypeError` when it builds the transform,
        and the check run raises the same `TypeError` rather than reporting a missing field, so the
        error points at the transform's own bug."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseTwoArgumentTransformViewSet
        )

        with (
            register_lookup(models.CharField, TwoArgumentTransform),
            pytest.raises(TypeError, match="takes exactly 2 arguments"),
        ):
            check_ordering_configuration(app_configs=None)

    def test_transform_after_a_method_backed_formatted_name_is_left_to_e005(self):
        """ValidGetFormattedNameTransformOrderingViewSet offers `formatted_name__unaccent` on a model
        that computes formatted_name in Python. E005 reports it with the answer specific to that case,
        so the ordering check must not report it as a missing field."""
        from vueda.info.checks import check_formatted_name_configuration
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidGetFormattedNameSerializer,
            err_viewsets.ValidGetFormattedNameTransformOrderingViewSet,
        )

        assert check_ordering_configuration(app_configs=None) == []
        assert [error.id for error in check_formatted_name_configuration(app_configs=None)] == ["vueda_info.E005"]


@pytest.mark.django_db
class TestNullsOrderingChecks:
    """`vueda_info.E007` covers a viewset's `nulls_ordering` and `nulls_ordering_flip`.

    `VuedaOrderingFilter` turns a placement into the `nulls_first`/`nulls_last` keyword of
    `F().asc()`/`F().desc()`, so only "first" and "last" have a keyword to become. Anything else is
    ignored at request time — a list endpoint keeps working and returns rows in the database's default
    nulls order — which makes the check the only signal that the declaration isn't doing what it says.
    """

    def test_valid_nulls_ordering_passes_system_check(self):
        """ValidNullsOrderingViewSet declares a placement the filter can apply, with a flip list naming
        a field the placement mapping covers."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.ValidNullsOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_unknown_placement_system_check_error(self):
        """BadNullsOrderingPlacementViewSet says "First" rather than "first". There is no
        `nulls_First` keyword, so the placement is silently dropped at request time."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.BadNullsOrderingPlacementViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007"]
        assert (
            errors[0].msg == "BadNullsOrderingPlacementViewSet.nulls_ordering['the_name_field'] is 'First', "
            "which is not a nulls placement."
        )
        assert "Use 'first' or 'last'." in errors[0].hint
        # The hint has to say what still works, so the reader knows this isn't a broken endpoint.
        assert "Ordering by this field still works" in errors[0].hint

    def test_nulls_ordering_declared_as_a_list_system_check_error(self):
        """NullsOrderingNotADictViewSet declares a list of field names, a plausible shorthand that
        carries no placement at all. `nulls_ordering.get(...)` on a list would raise, so the filter
        can't even reach the per-entry check."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.NullsOrderingNotADictViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007"]
        assert errors[0].msg == "NullsOrderingNotADictViewSet.nulls_ordering is a list, not a dict."

    def test_flip_without_a_placement_system_check_error(self):
        """NullsOrderingFlipWithoutPlacementViewSet lists a field to flip that `nulls_ordering` gives
        no placement, so there is nothing for the flip to act on."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.NullsOrderingFlipWithoutPlacementViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007"]
        assert (
            errors[0].msg == "'the_name_field' is listed in "
            "NullsOrderingFlipWithoutPlacementViewSet.nulls_ordering_flip, but "
            "NullsOrderingFlipWithoutPlacementViewSet.nulls_ordering gives it no placement to flip."
        )

    def test_both_attributes_are_reported_from_one_run(self):
        """NullsOrderingBothAttributesWrongViewSet gets both attributes wrong independently.

        They are separate declarations, so reporting only the first would make the reader fix it,
        re-run, and discover the second.
        """
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.NullsOrderingBothAttributesWrongViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007", "vueda_info.E007"]
        messages = [error.msg for error in errors]
        assert (
            "NullsOrderingBothAttributesWrongViewSet.nulls_ordering['the_name_field'] is 'First', "
            "which is not a nulls placement." in messages
        )
        assert (
            "'id' is listed in NullsOrderingBothAttributesWrongViewSet.nulls_ordering_flip, but "
            "NullsOrderingBothAttributesWrongViewSet.nulls_ordering gives it no placement to flip." in messages
        )

    def test_an_unusable_nulls_ordering_still_reports_its_flip_entries(self):
        """NullsOrderingNotADictWithFlipViewSet declares `nulls_ordering` as a list and names a field to
        flip.

        An unusable declaration gives no field a placement, so the flip entry has nothing to act on
        either. Stopping at the type error would leave the second half of the same mistake unreported.
        """
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.NullsOrderingNotADictWithFlipViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007", "vueda_info.E007"]
        assert errors[0].msg == "NullsOrderingNotADictWithFlipViewSet.nulls_ordering is a list, not a dict."
        assert (
            errors[1].msg == "'the_name_field' is listed in "
            "NullsOrderingNotADictWithFlipViewSet.nulls_ordering_flip, but "
            "NullsOrderingNotADictWithFlipViewSet.nulls_ordering gives it no placement to flip."
        )

    def test_nulls_ordering_flip_that_cannot_be_iterated_system_check_error(self):
        """NullsOrderingFlipNotIterableViewSet declares `nulls_ordering_flip` as an int.

        `VuedaOrderingFilter` tests membership in it, which raises `TypeError` on a non-iterable, and
        so did this check before it was guarded — crashing `manage.py check` instead of reporting the
        declaration it exists to report.
        """
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.NullsOrderingFlipNotIterableViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007"]
        assert (
            errors[0].msg == "NullsOrderingFlipNotIterableViewSet.nulls_ordering_flip is a int, not a "
            "list of field names."
        )
        # The placement itself is usable, so nothing is reported about `nulls_ordering`.
        assert "nulls_ordering[" not in errors[0].msg

    def test_relation_path_keys_pass_system_check(self):
        """RelationNullsOrderingViewSet keys placements on a relation path, on a path ending in "pk",
        and on a related formatted_name. Each is a `__`-joined name that `ordering_fields` offers, so
        each is a term the filter orders by."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.SingleValuedLookupExpressionSerializer, err_viewsets.RelationNullsOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_pk_alias_and_the_field_behind_it_match_each_other(self):
        """CrossSpelledPKNullsOrderingViewSet keys its placement on `the_name_source__pk` while
        `ordering_fields` and the flip entry name `the_name_source__id`. The filter treats the two
        spellings as one field, so the key is requestable and the flip entry has a placement to flip."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SingleValuedLookupExpressionSerializer, err_viewsets.CrossSpelledPKNullsOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_composite_primary_key_without_its_columns_system_check_error(self):
        """CompositePKNullsOrderingViewSet keys its placement and flip on the "pk" of a two-column
        primary key and on neither column. A metadata-driven client sorts by one column at a time, so
        both entries are reported with the columns to add, and neither is reported a second time as
        unrequestable."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.OrderItemCompositePKSerializer, err_viewsets.CompositePKNullsOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "CompositePKNullsOrderingViewSet.nulls_ordering['pk'] names a primary key made of 2 columns, but "
                "`nulls_ordering` leaves out 'order', 'product'.",
                hint=(
                    "Add 'order', 'product' to `nulls_ordering` as well. `model_ordering` advertises each "
                    "column of the key separately, so a client sorts by one column at a time, and only a "
                    "placement on that column reaches the request. The placement on 'pk' still applies when "
                    "the list is sorted by the whole key."
                ),
                obj=err_viewsets.CompositePKNullsOrderingViewSet,
                id="vueda_info.E007",
            ),
            Error(
                "'pk' in CompositePKNullsOrderingViewSet.nulls_ordering_flip names a primary key made of 2 "
                "columns, but `nulls_ordering_flip` leaves out 'order', 'product'.",
                hint=(
                    "Add 'order', 'product' to `nulls_ordering_flip` as well. `model_ordering` advertises each "
                    "column of the key separately, so a client sorts by one column at a time, and only a "
                    "placement on that column reaches the request. The placement on 'pk' still applies when "
                    "the list is sorted by the whole key."
                ),
                obj=err_viewsets.CompositePKNullsOrderingViewSet,
                id="vueda_info.E007",
            ),
        ]

    def test_composite_primary_key_with_its_columns_passes_system_check(self):
        """CompositePKColumnNullsOrderingViewSet keys a placement on the "pk" of a two-column primary key
        and on each column, so a list sorted by the whole key and a request for either column both
        reach a placement."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            store_serializers.OrderItemCompositePKSerializer, err_viewsets.CompositePKColumnNullsOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_dotted_key_system_check_error(self):
        """DottedNullsOrderingKeyViewSet writes its key in the dotted `?o=` spelling. The filter looks the
        placement up by the `__`-joined term, so the key matches nothing and the placement is dropped."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SingleValuedLookupExpressionSerializer, err_viewsets.DottedNullsOrderingKeyViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "DottedNullsOrderingKeyViewSet.nulls_ordering['the_name_source.the_name_field'] names no field "
                "that a list request can sort DottedNullsOrderingKeyViewSet by.",
                hint=(
                    "Write it as 'the_name_source__the_name_field'. `nulls_ordering` uses `__`-joined paths, "
                    "the same as `ordering`; only the `?o=` query parameter is dotted. As declared, the "
                    "placement is never applied, so nulls arrive wherever the database puts them by default."
                ),
                obj=err_viewsets.DottedNullsOrderingKeyViewSet,
                id="vueda_info.E007",
            )
        ]

    def test_dotted_flip_entry_system_check_error(self):
        """DottedNullsOrderingFlipViewSet spells its `nulls_ordering` key correctly and its
        `nulls_ordering_flip` entry dotted. The entry gives no placement to flip, and it names no term
        the filter orders by. Both are reported, and the second names the spelling the entry needs."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SingleValuedLookupExpressionSerializer, err_viewsets.DottedNullsOrderingFlipViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007", "vueda_info.E007"]
        assert errors[0].msg == (
            "'the_name_source.the_name_field' is listed in DottedNullsOrderingFlipViewSet.nulls_ordering_flip, "
            "but DottedNullsOrderingFlipViewSet.nulls_ordering gives it no placement to flip."
        )
        assert errors[1].msg == (
            "'the_name_source.the_name_field' in DottedNullsOrderingFlipViewSet.nulls_ordering_flip names no "
            "field that a list request can sort DottedNullsOrderingFlipViewSet by."
        )
        assert errors[1].hint.startswith(
            "Write it as 'the_name_source__the_name_field'. `nulls_ordering_flip` uses `__`-joined paths"
        )

    def test_key_outside_ordering_fields_system_check_error(self):
        """UnrequestableNullsOrderingViewSet keys a placement on a real path that neither
        `ordering_fields` nor the default ordering names. No request sorts by it, so the hint says to
        offer the field rather than claiming it doesn't exist."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SingleValuedLookupExpressionSerializer, err_viewsets.UnrequestableNullsOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007", "vueda_info.E007"]
        assert errors[0].msg == (
            "UnrequestableNullsOrderingViewSet.nulls_ordering['the_name_source__the_name_field'] names no field "
            "that a list request can sort UnrequestableNullsOrderingViewSet by."
        )
        assert errors[0].hint == (
            "Add 'the_name_source__the_name_field' to `ordering_fields`, or remove it from `nulls_ordering`. "
            "A list request can only sort by a field that `ordering_fields` or the default ordering names. "
            "As declared, the placement is never applied, so nulls arrive wherever the database puts them by "
            "default."
        )

    def test_key_naming_no_field_system_check_error(self):
        """UnrequestableNullsOrderingViewSet also keys a placement on `no_such_field`, which names
        nothing on the model, so the hint says that instead of suggesting `ordering_fields`."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SingleValuedLookupExpressionSerializer, err_viewsets.UnrequestableNullsOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert errors[1].msg == (
            "UnrequestableNullsOrderingViewSet.nulls_ordering['no_such_field'] names no field that a list "
            "request can sort UnrequestableNullsOrderingViewSet by."
        )
        # Django's own `FieldError` text, whose list of field names after "Choices are:" changes with
        # the test models, so only the parts around it are pinned.
        assert errors[1].hint.startswith(
            "Django can't resolve that path: Cannot resolve keyword 'no_such_field' into field. Choices are: "
        ), errors[1].hint
        assert errors[1].hint.endswith(
            ". As declared, the placement is never applied, so nulls arrive wherever the database puts them by default."
        ), errors[1].hint

    def test_dotted_json_key_hint_does_not_suggest_ordering_fields(self):
        """ProductReleaseDottedNullsOrderingViewSet keys a placement on `specs__v1.2`. The key
        resolves, but no `?o=` request can name it, so offering it through `ordering_fields` would only
        trade this error for `vueda_info.E006`. The hint says to annotate the value instead."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseDottedNullsOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007"]
        assert errors[0].hint.startswith(
            "No `?o=` name can carry 'specs__v1.2', because it contains a '.' or a ','. Annotate the value"
        ), errors[0].hint
        assert "ordering_fields" not in errors[0].hint

    def test_transform_key_outside_ordering_fields_system_check_error(self):
        """ProductReleaseUnrequestableTransformNullsViewSet keys a placement on `released__year`,
        which `ordering_fields` leaves out. The path ends in a transform that Django resolves, so the
        hint says to offer the field rather than claiming that the model has no such field."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer,
            product_viewsets.ProductReleaseUnrequestableTransformNullsViewSet,
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E007"]
        assert errors[0].hint == (
            "Add 'released__year' to `ordering_fields`, or remove it from `nulls_ordering`. A list request can "
            "only sort by a field that `ordering_fields` or the default ordering names. As declared, the "
            "placement is never applied, so nulls arrive wherever the database puts them by default."
        )

    def test_keys_are_not_judged_when_the_queryset_needs_a_request(self):
        """RequestOnlyQuerysetNullsOrderingViewSet has a dotted key, but its `get_queryset` reads
        `self.request`, which a view built at check time doesn't have. With the requestable names
        unknown there is nothing to judge the key against, so the check stays quiet instead of failing
        the check run."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SingleValuedLookupExpressionSerializer,
            err_viewsets.RequestOnlyQuerysetNullsOrderingViewSet,
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_a_viewset_without_nulls_ordering_passes_system_check(self):
        """Neither attribute is required, so a viewset that declares neither has nothing to report."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.ValidLookupExpressionOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []


@pytest.mark.django_db
class TestQuerysetOrderingChecks:
    """`vueda_info.E010` covers the ordering that a viewset's list queryset carries, from
    `get_queryset()`, the class-level `queryset`, or the default manager.

    DRF's ordering backend reads a view's `ordering` and nothing else, so an `order_by()` on the
    queryset is an ordering the metadata never reports — and, with no `ordering` declared, the one a
    list request actually returns. Nothing fails either way, which is why a check is the only signal.
    The check applies three rules: the metadata must not lie, an ordering of fields alone is declared
    rather than applied, and an `order_by()` that a declared `ordering` replaces is removed.
    """

    def test_queryset_ordering_conflicting_with_model_ordering_system_check_error(self):
        """ConflictingQuerysetOrderingViewSet orders its queryset ascending on a model whose
        `Meta.ordering` is descending, and declares no `ordering` of its own. The queryset's order is
        what the rows arrive in; the model's is what `model_ordering.default` reports."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.ConflictingQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "ConflictingQuerysetOrderingViewSet.queryset orders by 'the_name_field', but the "
                "default ordering reported for it comes from ModelOrderingQueryset.Meta.ordering "
                "('-the_name_field'), which no list request here applies.",
                hint=(
                    "Declare it as `ordering = ['the_name_field']` on "
                    "ConflictingQuerysetOrderingViewSet instead, so the ordering DRF applies is the "
                    "one `model_ordering.default` reports. DRF's ordering backend reads a view's "
                    "`ordering` and nothing else, so with none declared it applies no ordering and "
                    "the queryset's own survives to the response — while `model_ordering.default` "
                    "falls back to ModelOrderingQueryset.Meta.ordering and describes a different "
                    "order to every client. Dropping the `order_by()` is the other answer, and changes "
                    "the list's order."
                ),
                obj=err_viewsets.ConflictingQuerysetOrderingViewSet,
                id="vueda_info.E010",
            )
        ]

    def test_queryset_ordering_declared_nowhere_else_system_check_error(self):
        """UndeclaredQuerysetOrderingViewSet orders its queryset on a model that declares no
        `Meta.ordering`, so there is no default ordering to report at all — the rows arrive sorted and
        the metadata says nothing about the column that sorted them."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UndeclaredQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "UndeclaredQuerysetOrderingViewSet.queryset orders by 'the_name_field', which neither "
            "UndeclaredQuerysetOrderingViewSet.ordering nor ValidLookupExpression.Meta.ordering "
            "declares."
        )
        assert "reports no default ordering at all" in errors[0].hint

    def test_queryset_ordering_a_viewset_ordering_replaces_system_check_error(self):
        """OverriddenQuerysetOrderingViewSet declares an `ordering` that reverses its queryset's.

        The metadata is accurate here, because DRF applies the view's `ordering` over whatever the
        queryset carried. What the check reports is the queryset's declaration, which reaches no
        response and reads as if it set the list's order."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.OverriddenQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "OverriddenQuerysetOrderingViewSet.queryset orders by '-the_name_field', which "
            "OverriddenQuerysetOrderingViewSet.ordering ('the_name_field') replaces on every list "
            "request."
        )
        assert errors[0].hint.startswith("Remove the `order_by()` from the queryset")

    def test_queryset_ordering_matching_the_viewset_ordering_passes_system_check(self):
        """AgreeingQuerysetOrderingViewSet declares both, identically. Redundant, but it describes the
        order the rows arrive in, so there is nothing to report."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.AgreeingQuerysetOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_queryset_ordering_matching_the_model_ordering_passes_system_check(self):
        """ModelAgreeingQuerysetOrderingViewSet's queryset orders exactly as the model's
        `Meta.ordering` does, so the reported default and the rows agree."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.ModelAgreeingQuerysetOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_queryset_ordering_on_the_column_behind_formatted_name_passes_system_check(self):
        """FormattedNameQuerysetOrderingViewSet orders its queryset by the column
        `formatted_name_lookup_expression` names, while declaring `ordering = ["formatted_name"]`.

        One sort under two names, so both sides resolve to the same path instead of being reported as
        a conflict between a name and its own column."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.FormattedNameQuerysetOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_queryset_ordering_on_the_pk_alias_passes_system_check(self):
        """PKAliasQuerysetOrderingViewSet orders its queryset by the "pk" alias while declaring
        `ordering` as the field the alias stands for. The alias expands the way the metadata expands
        it, so the two are recognized as the same sort."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.PKAliasQuerysetOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_random_queryset_ordering_passes_system_check(self):
        """RandomQuerysetOrderingViewSet orders its queryset randomly, which names no column.

        There is nothing to compare against the declared default, so the check stays quiet rather than
        guessing — the same terms `model_ordering.default` withholds."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.RandomQuerysetOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_a_viewset_whose_queryset_declares_no_ordering_passes_system_check(self):
        """The ordinary case: a queryset with no `order_by()` of its own, leaving the default ordering
        to the viewset's `ordering` — the one place DRF reads it from."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.ValidLookupExpressionOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_get_queryset_ordering_conflicting_with_model_ordering_system_check_error(self):
        """GetQuerysetConflictingOrderingViewSet orders ascending inside `get_queryset()` on a model
        whose `Meta.ordering` is descending. The check reads what `get_queryset()` returns, so it
        reports the conflict and names `get_queryset()` as the place the ordering was written."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.GetQuerysetConflictingOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "GetQuerysetConflictingOrderingViewSet.get_queryset() orders by 'the_name_field', but the "
            "default ordering reported for it comes from ModelOrderingQueryset.Meta.ordering "
            "('-the_name_field'), which no list request here applies."
        )

    def test_get_queryset_ordering_declared_nowhere_else_system_check_error(self):
        """GetQuerysetUndeclaredOrderingViewSet orders inside `get_queryset()` on a model that declares
        no `Meta.ordering`, so the metadata reports no default ordering for rows that arrive sorted."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.GetQuerysetUndeclaredOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "GetQuerysetUndeclaredOrderingViewSet.get_queryset() orders by 'the_name_field', which neither "
            "GetQuerysetUndeclaredOrderingViewSet.ordering nor ValidLookupExpression.Meta.ordering declares."
        )

    def test_get_queryset_ordering_a_viewset_ordering_replaces_system_check_error(self):
        """GetQuerysetOverriddenOrderingViewSet declares an `ordering` that reverses the one
        `get_queryset()` applies, so the hint points at `get_queryset()` rather than the queryset."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.GetQuerysetOverriddenOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "GetQuerysetOverriddenOrderingViewSet.get_queryset() orders by '-the_name_field', which "
            "GetQuerysetOverriddenOrderingViewSet.ordering ('the_name_field') replaces on every list request."
        )
        assert errors[0].hint.startswith("Remove the `order_by()` from `get_queryset()`")

    def test_get_queryset_that_needs_a_request_falls_back_to_the_queryset_attribute(self):
        """RequestOnlyGetQuerysetOrderingViewSet's `get_queryset()` reads `self.request`, which a view
        built at check time doesn't have. The check reads the class-level `queryset` instead, as it
        did before it called `get_queryset()`, and reports the conflict there."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.RequestOnlyGetQuerysetOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith("RequestOnlyGetQuerysetOrderingViewSet.queryset orders by 'the_name_field'")

    def test_nulls_placement_that_differs_system_check_error(self):
        """GetQuerysetNullsPlacementViewSet names the same field in the same direction on both sides,
        but `get_queryset()` puts nulls first and the declared `ordering` leaves them last, which is
        where PostgreSQL puts them in an ascending sort."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.GetQuerysetNullsPlacementViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "GetQuerysetNullsPlacementViewSet.get_queryset() orders by 'the_name_field' (nulls first), which "
            "GetQuerysetNullsPlacementViewSet.ordering ('the_name_field') replaces on every list request."
        )

    def test_nulls_placement_declared_through_nulls_ordering_passes_system_check(self):
        """NullsOrderingAgreeingGetQuerysetViewSet declares the same placement through `nulls_ordering`.
        A list request applies it to the declared `ordering`, so the two sort the same way."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.NullsOrderingAgreeingGetQuerysetViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_queryset_method_ordering_system_check_error(self):
        """QuerySetMethodOrderingViewSet orders through a custom QuerySet method rather than calling
        `order_by()` itself. The method leaves the same terms on the query, so it is reported the same
        way."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.SecondaryManagerOrderingSerializer, err_viewsets.QuerySetMethodOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "QuerySetMethodOrderingViewSet.get_queryset() orders by '-the_name_field', which neither "
            "QuerySetMethodOrderingViewSet.ordering nor SecondaryManagerOrdering.Meta.ordering declares."
        )

    def test_a_viewset_starting_from_a_second_manager_system_check_error(self):
        """SecondaryManagerQuerysetOrderingViewSet starts from a second manager that orders. That manager
        isn't the model's default, so the model-wide check leaves it alone, but this viewset's list
        arrives in its order, so `vueda_info.E010` reports the viewset."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SecondaryManagerOrderingSerializer, err_viewsets.SecondaryManagerQuerysetOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "SecondaryManagerQuerysetOrderingViewSet.queryset orders by 'the_name_field', which neither "
            "SecondaryManagerQuerysetOrderingViewSet.ordering nor SecondaryManagerOrdering.Meta.ordering "
            "declares."
        )

    def test_get_queryset_annotation_ordering_with_no_declared_default_passes_system_check(self):
        """GetQuerysetAnnotationOrderingViewSet orders inside `get_queryset()` by an annotation it adds,
        and neither the viewset nor the model declares a default. An ordering that names an annotation
        may stay in `get_queryset()`, and an empty `model_ordering.default` makes no claim for it to
        contradict."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.GetQuerysetAnnotationOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_reversed_list_queryset_on_a_sortable_viewset_system_check_error(self):
        """ReversedGetQuerysetOrderingViewSet calls `.reverse()` in `get_queryset()`. It declares no
        `ordering_fields`, so DRF lets `?o=` sort by its serializer's fields. Django keeps the
        `.reverse()` through DRF's `order_by()`, so every sort that a client asks for comes back in the
        opposite order."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.ReversedGetQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "ReversedGetQuerysetOrderingViewSet.get_queryset() calls `.reverse()`, which stays on the query "
                "when DRF sorts it, so every list request on ReversedGetQuerysetOrderingViewSet returns the "
                "opposite of the order that it asks for.",
                hint=(
                    "Remove the `.reverse()` from `get_queryset()`, and declare the order that you want as "
                    "ReversedGetQuerysetOrderingViewSet.ordering. DRF's ordering backend calls `order_by()` with "
                    "ReversedGetQuerysetOrderingViewSet.ordering or a client's `?o=`, and Django keeps a "
                    "`.reverse()` through that call, so a client that sorts by a column gets the rows in the "
                    "opposite order."
                ),
                obj=err_viewsets.ReversedGetQuerysetOrderingViewSet,
                id="vueda_info.E010",
            )
        ]

    def test_reversed_list_queryset_on_an_unsortable_viewset_follows_the_three_rules(self):
        """ReversedUnsortableGetQuerysetOrderingViewSet calls `.reverse()` on a viewset that no list
        request can sort, so its rows always arrive in one order and a client has nothing to get
        backwards. The `.reverse()` itself isn't reported. The reversed ordering is still an ordering of
        fields alone with no declared default, which rule 2 reports."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.ReversedUnsortableGetQuerysetOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "ReversedUnsortableGetQuerysetOrderingViewSet.get_queryset() orders by '-the_name_field', which "
            "neither ReversedUnsortableGetQuerysetOrderingViewSet.ordering nor ValidLookupExpression.Meta.ordering "
            "declares."
        )
        assert errors[0].hint.endswith(
            "Remove the `.reverse()` from `get_queryset()` as well, because DRF's `order_by()` keeps it."
        )

    def test_function_ordering_that_a_viewset_ordering_replaces_system_check_error(self):
        """LowerGetQuerysetOrderingViewSet orders by `Lower` of the field that its `ordering` names.
        Both read one column but sort differently, so the `get_queryset()` ordering isn't the declared
        one, and DRF replaces it on every list request."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.LowerGetQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "LowerGetQuerysetOrderingViewSet.get_queryset() orders by 'Lower(F(the_name_field))', which "
            "LowerGetQuerysetOrderingViewSet.ordering ('the_name_field') replaces on every list request."
        )

    def test_a_manager_as_the_queryset_attribute_passes_system_check(self):
        """ManagerQuerysetAttributeViewSet sets `queryset` to a manager, and its `get_queryset()` needs
        the request, so the check falls back to the class attribute. A manager has no `.query` of its
        own, and DRF returns it unchanged, so the check calls `.all()` on it instead of failing."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.ManagerQuerysetAttributeViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_get_queryset_transform_on_an_annotation_passes_system_check(self):
        """ProductReleaseGetQuerysetAnnotationTransformViewSet orders by `-launched__year`, a transform
        on an annotation that its `get_queryset()` adds, with no declared default. The transform names
        the annotation, so rule 2 exempts it, and no default makes a claim for it to contradict."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer,
            product_viewsets.ProductReleaseGetQuerysetAnnotationTransformViewSet,
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_get_queryset_transform_on_a_field_system_check_error(self):
        """ProductReleaseGetQuerysetTransformViewSet orders by `released__year`, a transform on a model
        field, with no declared default. A field with a transform can be declared as the viewset's
        `ordering`, so rule 2 reports it under its `__`-joined path."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            product_serializers.ProductReleaseSerializer, product_viewsets.ProductReleaseGetQuerysetTransformViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "ProductReleaseGetQuerysetTransformViewSet.get_queryset() orders by 'released__year', which neither "
            "ProductReleaseGetQuerysetTransformViewSet.ordering nor ProductRelease.Meta.ordering declares."
        )
        assert "`ordering = ['released__year']`" in errors[0].hint

    def test_grouped_list_queryset_that_drops_meta_ordering_system_check_error(self):
        """GroupedGetQuerysetOrderingViewSet annotates an aggregate, which groups the query. Django leaves
        `Meta.ordering` out of a grouped query, so the rows arrive unordered while
        `model_ordering.default` reports `Meta.ordering`. That breaks rule 1."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.GroupedGetQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "GroupedGetQuerysetOrderingViewSet.get_queryset() groups its rows, so Django leaves out "
                "ModelOrderingQueryset.Meta.ordering ('-the_name_field') and the rows arrive unordered, but "
                "`model_ordering.default` reports that ordering for GroupedGetQuerysetOrderingViewSet.",
                hint=(
                    "Declare `ordering = ['-the_name_field']` on GroupedGetQuerysetOrderingViewSet, so DRF "
                    "applies it to every list request and `model_ordering.default` reports it. Django doesn't "
                    "use `Meta.ordering` in a query with `GROUP BY`, such as one that annotates an aggregate."
                ),
                obj=err_viewsets.GroupedGetQuerysetOrderingViewSet,
                id="vueda_info.E010",
            )
        ]

    def test_grouped_list_queryset_with_a_declared_ordering_passes_system_check(self):
        """GroupedDeclaredOrderingViewSet groups its query the same way, but declares `ordering`. DRF
        applies it with `order_by()`, which Django keeps on a grouped query, so the rows arrive in the
        reported order."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.GroupedDeclaredOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_two_collations_of_one_column_system_check_error(self):
        """CollateGetQuerysetOrderingViewSet's `ordering` and `get_queryset()` collate the same column
        differently. Django renders both as `Collate(F(the_name_field))`, so the check compares the SQL
        that each compiles to, and the two differ."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.CollateGetQuerysetOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith("CollateGetQuerysetOrderingViewSet.get_queryset() orders by")

    def test_a_viewset_without_an_ordering_backend_passes_system_check(self):
        """ReversedWithoutOrderingBackendViewSet has no ordering backend, so nothing applies a declared
        `ordering` or a client's `?o=` to its list. The ordering rules can't judge it, so its
        `.reverse()` and its undeclared ordering are both left alone."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.ReversedWithoutOrderingBackendViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_reverse_on_the_class_queryset_names_the_class_queryset(self):
        """ReversedClassQuerysetViewSet calls `.reverse()` on its class-level `queryset`, and its
        `get_queryset()` adds its own `order_by()`. The message names the layer that holds the
        `.reverse()`, not the one that last changed the ordering."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.ReversedClassQuerysetViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith("ReversedClassQuerysetViewSet.queryset calls `.reverse()`")
        assert errors[0].hint.startswith("Remove the `.reverse()` from the queryset")

    def test_grouped_list_queryset_with_an_extra_ordering_passes_system_check(self):
        """GroupedExtraOrderingViewSet groups its query and orders it with `extra(order_by=...)`. Django
        drops `Meta.ordering`, but the extra ordering still sorts the rows, so nothing arrives
        unordered."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ModelOrderingQuerysetSerializer, err_viewsets.GroupedExtraOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_a_viewset_error_beside_a_rejected_default_manager_system_check_error(self):
        """MisspelledFManagerOwnErrorViewSet starts from a default manager that E015 reports, and its
        own `get_queryset()` misspells a different name. E010 leaves the manager's error to E015 but
        reports the viewset's own."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.MisspelledFManagerOrderingSerializer, err_viewsets.MisspelledFManagerOwnErrorViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert sorted(error.id for error in errors) == ["vueda_info.E010", "vueda_info.E015"]
        (viewset_error,) = (error for error in errors if error.id == "vueda_info.E010")
        assert viewset_error.msg.startswith(
            "MisspelledFManagerOwnErrorViewSet.get_queryset() builds a query that Django rejects: "
            "Cannot resolve keyword 'the_name_fiel' into field."
        )

    def test_a_rejected_manager_as_the_queryset_attribute_names_the_queryset(self):
        """MisspelledSecondManagerQuerysetViewSet sets `queryset` to a second manager whose query Django
        rejects. `get_queryset()` builds from that manager, so it raises too, but the message names the
        `queryset` attribute, where the broken manager was chosen."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SecondaryManagerOrderingSerializer, err_viewsets.MisspelledSecondManagerQuerysetViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith(
            "MisspelledSecondManagerQuerysetViewSet.queryset builds a query that Django rejects: "
            "Cannot resolve keyword 'the_name_feild' into field."
        )

    def test_a_rejected_default_manager_under_an_annotated_list_is_left_to_e015(self):
        """AnnotatedMisspelledFManagerViewSet starts from a default manager whose query Django rejects,
        and annotates its own list. Django's message then lists the annotation among its choices, so it
        differs from E015's. The check compares the messages without that list, and leaves the error to
        E015."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.MisspelledFManagerOrderingSerializer, err_viewsets.AnnotatedMisspelledFManagerViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E015"]

    def test_plain_ordering_filter_applies_no_nulls_ordering(self):
        """PlainOrderingFilterNullsViewSet uses DRF's own `OrderingFilter`, which never applies
        `nulls_ordering`. Its declared `ordering` therefore puts nulls last, so the nulls-first ordering
        in `get_queryset()` differs from it, and DRF replaces it on every list request."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.PlainOrderingFilterNullsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg == (
            "PlainOrderingFilterNullsViewSet.get_queryset() orders by 'the_name_field' (nulls first), which "
            "PlainOrderingFilterNullsViewSet.ordering ('the_name_field') replaces on every list request."
        )

    def test_misspelled_name_in_get_queryset_system_check_error(self):
        """MisspelledNameGetQuerysetOrderingViewSet misspells a plain string name in `order_by()`, which
        Django rejects as soon as `get_queryset()` calls it. The check reports Django's own message
        instead of falling back to the class-level `queryset`."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.MisspelledNameGetQuerysetOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith(
            "MisspelledNameGetQuerysetOrderingViewSet.get_queryset() builds a query that Django rejects: "
            "Cannot resolve keyword 'the_name_feild' into field."
        )
        assert errors[0].hint == (
            "Fix the query that MisspelledNameGetQuerysetOrderingViewSet lists from. Django raises this "
            "`FieldError` when it builds or runs the query, so the check reports it at startup."
        )

    def test_misspelled_relation_in_an_f_path_system_check_error(self):
        """MisspelledPathGetQuerysetOrderingViewSet misspells a relation inside an `F()`. Django resolves
        an `F()` only when the query is compiled, so the check compiles the list queryset and reports
        Django's message instead of crashing on the path."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.MisspelledPathGetQuerysetOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith(
            "The list queryset of MisspelledPathGetQuerysetOrderingViewSet builds a query that Django rejects: "
            "Cannot resolve keyword 'custmer' into field."
        )

    def test_aggregate_written_into_order_by_system_check_error(self):
        """GetQuerysetInlineAggregateOrderingViewSet passes `Count(...)` straight to `order_by()`. Django
        rejects an aggregate there unless it is annotated and ordered by name, so the check reports
        Django's message."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.ValidLookupExpressionSerializer, err_viewsets.GetQuerysetInlineAggregateOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E010"]
        assert errors[0].msg.startswith(
            "GetQuerysetInlineAggregateOrderingViewSet.get_queryset() builds a query that Django rejects: "
            "Using an aggregate in order_by() without also including it in annotate() is not allowed"
        )


@pytest.mark.django_db
class TestDefaultManagerOrderingChecks:
    """`vueda_info.E015` covers an ordering applied by a registered model's default manager.

    The default manager sorts every query of the model that names no other manager, so its ordering
    is a model-wide default. `Meta.ordering` is where Django, DRF, and `model_ordering.default` read
    that default, so an ordering `Meta.ordering` could hold is reported, unless `Meta.ordering` already
    declares the same order. An ordering by an annotation
    the manager adds has nowhere else to live and is allowed.
    """

    def test_default_manager_under_another_name_system_check_error(self):
        """OtherNameManagerOrdering's only manager is `ordered`. Django makes it the default, so the
        check finds it without reading `objects`. Its viewset starts from the same manager, and
        `vueda_info.E010` leaves that ordering to this check rather than reporting it again."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.OtherNameManagerOrderingSerializer, err_viewsets.OtherNameManagerOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "OtherNameManagerOrdering.ordered, the default manager, orders every query of "
                "OtherNameManagerOrdering by 'the_name_field', which `model_ordering.default` never reports.",
                hint=(
                    "Declare the ordering as OtherNameManagerOrdering.Meta.ordering and remove the "
                    "`order_by()` or `.reverse()` from the manager. `Meta.ordering` is the model-wide default "
                    "that Django, DRF, and `model_ordering.default` all read. A default manager may keep an "
                    "ordering that names an annotation that it adds, since `Meta.ordering` can't name one."
                ),
                obj=err_models.OtherNameManagerOrdering,
                id="vueda_info.E015",
            )
        ]

    def test_default_manager_chosen_by_default_manager_name_system_check_error(self):
        """DefaultManagerNameOrdering declares a plain `objects` first, then names its ordering manager
        in `Meta.default_manager_name`. Django makes that one the default, and so does the check."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.DefaultManagerNameOrderingSerializer, err_viewsets.DefaultManagerNameOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E015"]
        assert errors[0].msg.startswith("DefaultManagerNameOrdering.ordered, the default manager, orders every query")

    def test_a_second_manager_that_orders_passes_system_check(self):
        """SecondaryManagerOrdering's default manager applies no ordering. Its second manager does, but
        that orders only the code that names it, and this viewset starts from the default."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.SecondaryManagerOrderingSerializer, err_viewsets.SecondaryManagerModelViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_manager_ordering_that_matches_meta_ordering_passes_system_check(self):
        """MatchingMetaManagerOrdering's default manager orders by `the_name_field`, and so does its
        `Meta.ordering`. `model_ordering.default` reads `Meta.ordering`, so it describes the rows the
        manager returns. Its viewset declares no `ordering` and starts from the same manager, and
        `vueda_info.E010` finds nothing to report either."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.MatchingMetaManagerOrderingSerializer, err_viewsets.MatchingMetaManagerOrderingViewSet
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_ordering_by_an_aggregate_annotation_passes_system_check(self):
        """AggregateManagerOrdering's default manager orders by a `Count` it annotates, then by a plain
        field. `Meta.ordering` can't hold the aggregate, and the tie-breaker can't move there on its
        own, so the whole ordering is allowed. `vueda_info.E010` doesn't report it for the viewset
        either."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.AggregateManagerOrderingSerializer, err_viewsets.AggregateManagerOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_aggregate_annotation_with_a_disagreeing_meta_ordering_system_check_error(self):
        """AggregateManagerMetaOrdering's default manager orders by an aggregate annotation, and its
        `Meta.ordering` names a different order. The manager ordering is allowed, so E015 stays quiet,
        but a viewset that starts from the manager and declares no `ordering` returns rows the metadata
        describes wrongly. `Meta.ordering` still applies through the base manager, so the viewset is
        what gets reported, and it can fix this by declaring the annotation ordering itself. The message
        names the default manager, because that is where the `order_by()` is."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.AggregateManagerMetaOrderingSerializer, err_viewsets.AggregateManagerMetaOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "AggregateManagerMetaOrdering.objects, the default manager that AggregateManagerMetaOrderingViewSet "
                "starts from, orders by '-source_count', 'the_name_field', but the default ordering reported for "
                "AggregateManagerMetaOrderingViewSet comes from AggregateManagerMetaOrdering.Meta.ordering "
                "('the_name_field'), which no list request here applies.",
                hint=(
                    "Declare `ordering = ['-source_count', 'the_name_field']` on "
                    "AggregateManagerMetaOrderingViewSet, so the ordering DRF applies is the one "
                    "`model_ordering.default` reports. Or remove AggregateManagerMetaOrdering.Meta.ordering, so "
                    "that `model_ordering.default` makes no claim about the order. An ordering that names an "
                    "annotation may stay in AggregateManagerMetaOrdering.objects when no default ordering is "
                    "declared."
                ),
                obj=err_viewsets.AggregateManagerMetaOrderingViewSet,
                id="vueda_info.E010",
            )
        ]

    def test_ordering_by_a_simple_annotation_passes_system_check(self):
        """SimpleAnnotationManagerOrdering's default manager orders by a single-column annotation. The
        check doesn't judge how complex an annotation is, so this is allowed like an aggregate."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.SimpleAnnotationManagerOrderingSerializer,
            err_viewsets.SimpleAnnotationManagerOrderingViewSet,
        )

        assert check_ordering_configuration(app_configs=None) == []

    def test_misspelled_f_name_system_check_error(self):
        """MisspelledFManagerOrdering's default manager misspells the field inside an `F()`. Django
        resolves it only when a query runs, so compiling the query is what reports it at startup."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.MisspelledFManagerOrderingSerializer, err_viewsets.MisspelledFManagerOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E015"]
        assert errors[0].msg.startswith(
            "MisspelledFManagerOrdering.objects, the default manager, builds a query that Django rejects: "
            "Cannot resolve keyword 'the_name_feild' into field."
        )

    def test_misspelled_plain_name_system_check_error(self):
        """MisspelledNameManagerOrdering's default manager misspells a plain string name. Django rejects
        it inside `order_by()`, so the manager raises as soon as it builds a queryset. Its viewset builds
        the queryset only in `get_queryset()`, so nothing fails at import, and the check is what reports
        it at startup."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.MisspelledNameManagerOrderingSerializer, err_viewsets.MisspelledNameManagerOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "MisspelledNameManagerOrdering.objects, the default manager, builds a query that Django rejects: "
                "Cannot resolve keyword 'the_name_feild' into field. Choices are: id, the_name_field",
                hint=(
                    "Fix the manager's `get_queryset()`. A manager builds its queryset only when code first "
                    "uses it, so nothing fails when MisspelledNameManagerOrdering is imported, and the first "
                    "query of MisspelledNameManagerOrdering would raise this `FieldError`."
                ),
                obj=err_models.MisspelledNameManagerOrdering,
                id="vueda_info.E015",
            )
        ]

    def test_manager_ordering_by_a_transform_on_formatted_name_passes_system_check(self):
        """LowerFormattedNameManagerOrdering's default manager orders by `formatted_name__lower`.
        `Meta.ordering` can name the bare `formatted_name` only, so E015 doesn't ask for this ordering
        to move there, and treats it like an ordering by an annotation that the manager adds."""
        from django.db.models import CharField
        from django.db.models.functions import Lower
        from django.test.utils import register_lookup

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.LowerFormattedNameManagerOrderingSerializer,
            err_viewsets.LowerFormattedNameManagerOrderingViewSet,
        )

        with register_lookup(CharField, Lower):
            assert check_ordering_configuration(app_configs=None) == []

    def test_aggregate_written_into_the_managers_order_by_system_check_error(self):
        """InlineAggregateManagerOrdering's default manager passes `Count(...)` straight to `order_by()`,
        which Django rejects as soon as the manager builds its queryset. E015 reports Django's message
        once for the model, and `vueda_info.E010` doesn't repeat it for the viewset."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.InlineAggregateManagerOrderingSerializer, err_viewsets.InlineAggregateManagerOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E015"]
        assert errors[0].msg.startswith(
            "InlineAggregateManagerOrdering.objects, the default manager, builds a query that Django rejects: "
            "Using an aggregate in order_by() without also including it in annotate() is not allowed"
        )

    def test_manager_query_that_compiles_to_no_sql_is_still_checked(self):
        """EmptyFilterManagerOrdering's default manager filters with `pk__in=[]`, which Django compiles to
        `EmptyResultSet` rather than SQL. That says nothing about the ordering, so E015 still reports
        an ordering that `Meta.ordering` could declare."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.EmptyFilterManagerOrderingSerializer, err_viewsets.EmptyFilterManagerOrderingViewSet
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E015"]
        assert errors[0].msg == (
            "EmptyFilterManagerOrdering.objects, the default manager, orders every query of "
            "EmptyFilterManagerOrdering by 'the_name_field', which `model_ordering.default` never reports."
        )

    def test_random_manager_ordering_passes_system_check(self):
        """RandomManagerOrdering's default manager orders randomly, which names no column. The checks
        have nothing to compare it with, so they leave it alone, the same as a random queryset
        ordering."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.RandomManagerOrderingSerializer, err_viewsets.RandomManagerOrderingViewSet)

        assert check_ordering_configuration(app_configs=None) == []

    def test_misspelled_transform_system_check_error(self):
        """MisspelledTransformManagerOrdering's default manager misspells a transform after a real
        field. Django accepts the string when `order_by()` is called and fails only when a query
        runs."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(
            err_serializers.MisspelledTransformManagerOrderingSerializer,
            err_viewsets.MisspelledTransformManagerOrderingViewSet,
        )

        errors = check_ordering_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E015"]
        assert "Cannot resolve keyword 'lowr' into field." in errors[0].msg


@pytest.mark.django_db
class TestFieldSourceResolutionCheck:
    """Regression coverage for the vueda_info.W001 system check (issue #207).

    Coverage for ModelInfoSerializer.get_model_fields_data's own field.source resolution when it
    succeeds (a source-mapped field, a dotted source, a traversing lookup expression, and a
    SerializerMethodField) lives against the real tests.store fixtures in
    tests.unit.info.test_model_info instead: PackingBoxSerializer.label, CartSerializer.
    customer_relation, Customer/CartItem/OrderItem/InventoryRecord/OrderItemCompositePK's
    formatted_name, and CustomerSerializer.number_of_ordered_products. This class covers the
    unresolvable cases, which have no natural home outside a deliberately misconfigured fixture.

    source= and <field>_lookup_expression are both reported on any failure to resolve -- whether
    field.source was set explicitly or left to DRF's default (equal to field_name), and whether the
    walk fails on its first segment or partway through a relation. A field is only exempt from
    resolution by one of two explicit opt-outs, never merely because its source was implicit:

    - field.source == "*" (SerializerMethodField forces this; a plain Field that computes its own
      value can set it explicitly the same way -- ObjectRevisionField, AvailableActionsField, and
      AvailableTransitionField all do, since each overrides get_attribute() outright and never
      reads source at runtime).
    - A model defining a callable get_<field_name>(), mirroring the get_formatted_name() convention
      FormattedNameBaseModel._get_formatted_name already reads this way (a model may opt out of a
      generated column, e.g. formatted_name = None, in favor of a plain method).
    """

    def test_serializer_method_field_produces_no_warning(self):
        """computed is a SerializerMethodField; it must never produce a warning."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        warnings = check_field_source_resolution(app_configs=None)
        assert all("computed" not in warning.msg for warning in warnings)

    def test_source_star_field_produces_no_warning(self):
        """available_actions has field.source == "*" (AvailableActionsField sets this explicitly, since it overrides
        get_attribute() and never reads source at runtime); it is excluded from resolution entirely, the same as a
        SerializerMethodField, and must not warn."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        warnings = check_field_source_resolution(app_configs=None)

        assert all("available_actions" not in warning.msg for warning in warnings)

    def test_get_field_name_method_opt_out_produces_no_warning(self):
        """ValidGetFormattedName has formatted_name = None (opting out of the generated column) and a plain
        get_formatted_name() method; the source= walk fails to resolve "formatted_name" as a model field, but the
        callable get_formatted_name() is an explicit opt-out, so it must not warn -- even though its source is implicit
        (defaults to its field name), just like available_actions."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        warnings = check_field_source_resolution(app_configs=None)

        assert all("formatted_name" not in warning.msg for warning in warnings)

    def test_implicit_source_field_name_typo_reports_null_and_produces_system_check_warning(self):
        """implicit_typo = CharField(read_only=True) sets no source= at all (defaults to its own field name, which does
        not exist on the model, and there is no get_implicit_typo() opt-out) -- it is reported the same as an explicit
        source= failure, since DRF's default gives no way to tell a field-name typo from a deliberate computed field
        apart from the two explicit opt-outs."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["implicit_typo"]["type_db"] is None
        assert fields["implicit_typo"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if "implicit_typo" in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "implicit_typo" in matches[0].hint

    def test_single_segment_explicit_source_typo_reports_null_and_produces_system_check_warning(self):
        """typo = CharField(source="does_not_exist_at_all") fails at its very first segment -- it is reported the same
        as a source failing partway."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["typo"]["type_db"] is None
        assert fields["typo"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if ".typo " in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "does_not_exist_at_all" in matches[0].hint

    def test_get_field_model_info_correction_silences_warning_and_object_revision_stays_silent(self):
        """CustomerOrderSerializer.workflow_state_code/workflow_state_name source through
        WorkflowModelMethods.workflow_state, a real @property with no database column behind it -- unresolvable through
        source= alone, same as any other explicit source failure. But VuedaSerializer.get_field_model_info fills in
        their real type through workflow_field_model_info (State.code/State.name are both CharField), so the check
        consults that correction before deciding to warn and finds nothing left to report. object_revision, also
        unresolvable through source= alone, stays silent for a different reason: its source is "*" (ObjectRevisionField
        sets this explicitly, the same convention SerializerMethodField uses), so it is excluded from resolution
        entirely rather than evaluated as an explicit path."""
        from tests.store import serializers as store_serializers
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(store_serializers.CustomerOrderSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(store_serializers.CustomerOrderSerializer)
        fields = store_serializers.CustomerOrderSerializer().get_field_model_info(fields)
        assert fields["workflow_state_code"]["type_db"] == "CharField"
        assert fields["workflow_state_name"]["type_model"] == "CharField"

        warnings = check_field_source_resolution(app_configs=None)

        assert all("workflow_state_code" not in warning.msg for warning in warnings)
        assert all("workflow_state_name" not in warning.msg for warning in warnings)
        assert all("object_revision" not in warning.msg for warning in warnings)

    def test_unresolvable_source_reports_null_and_produces_system_check_warning(self):
        """bogus = CharField(source="related.does_not_exist") resolves "related" but not "does_not_exist" -- partial
        progress. Reports null model types rather than raising, and is reported as a warning through the source= hint
        (offering get_field_model_info as one option), naming the serializer, field, and path."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["bogus"]["type_db"] is None
        assert fields["bogus"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if "bogus" in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "SourceResolutionSerializer" in matches[0].msg
        assert "related.does_not_exist" in matches[0].hint
        assert "get_field_model_info" in matches[0].hint

    def test_source_through_non_relation_field_reports_null_and_produces_system_check_warning(self):
        """through_non_relation = CharField(source="formatted_name.foo") resolves "formatted_name" (a real field) but
        can't continue past it, since a CharField/GeneratedField isn't a relation -- also partial progress, also warned,
        but through the NotRelationField branch of the walk rather than FieldDoesNotExist."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["through_non_relation"]["type_db"] is None
        assert fields["through_non_relation"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if "through_non_relation" in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "formatted_name.foo" in matches[0].hint

    def test_unresolvable_lookup_expression_reports_null_and_produces_system_check_warning(self):
        """formatted_name_lookup_expression = "related__does_not_exist" resolves the relation but not the terminal field
        name: null model types rather than raising, plus a warning through the lookup_expression hint, which does not
        offer get_field_model_info as an option -- unlike source=, a lookup_expression has no legitimate
        non-model-backed reading."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.UnresolvableLookupExpressionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.UnresolvableLookupExpressionSerializer)
        assert fields["formatted_name"]["type_db"] is None
        assert fields["formatted_name"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)

        assert len(warnings) == 1
        assert warnings[0].id == "vueda_info.W001"
        assert "UnresolvableLookupExpressionSerializer" in warnings[0].msg
        assert "formatted_name" in warnings[0].msg
        assert "related__does_not_exist" in warnings[0].hint
        assert "get_field_model_info" not in warnings[0].hint

    def test_unresolvable_lookup_expression_at_first_segment_reports_null_and_produces_system_check_warning(self):
        """formatted_name_lookup_expression = "does_not_exist" fails at its very first segment -- unlike a source=
        failing the same way, this still warns, since a lookup_expression is fed straight to models.F() for queryset
        annotation and to Django admin's lookup_field(), both DB-level operations that can never reach a @property or
        method."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.UnresolvableLookupExpressionAtFirstSegmentSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(
            err_serializers.UnresolvableLookupExpressionAtFirstSegmentSerializer
        )
        assert fields["formatted_name"]["type_db"] is None
        assert fields["formatted_name"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)

        assert len(warnings) == 1
        assert warnings[0].id == "vueda_info.W001"
        assert "UnresolvableLookupExpressionAtFirstSegmentSerializer" in warnings[0].msg
        assert "formatted_name" in warnings[0].msg
        assert "does_not_exist" in warnings[0].hint
        assert "get_field_model_info" not in warnings[0].hint

    def test_exclude_fields_serializer_registration_passes_manage_py_check(self):
        """ExcludeFieldsSerializer inherits ExcludeFieldsSerializerMixin, whose get_extra_kwargs() reads the
        view's action while get_fields() builds the serializer's fields. check_field_source_resolution
        builds the serializer with _CheckContextView, a stand-in view whose action is None, so the mixin
        excludes nothing and the whole manage.py check run completes. The other coverage of
        this registration (tests.unit.core.test_checks.test_registered_with_a_view_passes_system_check)
        only calls check_exclude_fields_serializer_usage directly, so it never exercised this path.
        `databases=["default"]` keeps manage.py check's own model checks from opening a probe
        connection to db_logging, which this test's registration has no reason to touch."""
        from django.core.management import call_command

        info.registration.get_empty_registry()
        info.register(err_serializers.ExcludeFieldsSerializer, err_viewsets.ExcludeFieldsViewSet)

        call_command("check", databases=["default"])


@pytest.mark.django_db
class TestFieldResolutionMechanics:
    """Direct coverage of resolve_serializer_field_model_field's own walking rules (PR #228 review),
    below the check/warning layer TestFieldSourceResolutionCheck covers. Reuses tests.store.models.
    CustomerOrder, a real production model with both a real ForeignKey (customer, to Customer) and a
    real DateTimeField (when), rather than adding new fixture models for these cases.
    """

    def test_dunder_in_source_is_not_reinterpreted_as_relation_traversal(self):
        """source="customer__user" has no dot, so it names one literal attribute -- DRF's own getattr()
        looks up "customer__user" as one attribute and fails, since no such attribute exists. The walk
        this replaced used to split on "__" too, incorrectly resolving this as customer -> user and
        reporting Customer.user's type for a source DRF itself can never traverse that way."""
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        field = drf_serializers.CharField(source="customer__user", read_only=True)
        field.bind("fake", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "fake", field)

        assert model_field is None
        assert unresolved_path == "customer__user"

    def test_intermediate_attname_segment_is_not_traversed_as_a_relation(self):
        """source="customer_id.user" resolves "customer_id" to the same ForeignKey field _meta.get_field
        returns for "customer" (both a field's name and its attname resolve to the same field object,
        a documented Django internals quirk), but DRF's real getattr() reads a raw scalar ID off
        customer_id, not a traversable Customer instance -- so a further ".user" is never reachable at
        runtime, and must not be treated as a successful relation traversal even though _meta.get_field
        alone would allow it."""
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        field = drf_serializers.CharField(source="customer_id.user", read_only=True)
        field.bind("fake", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "fake", field)

        assert model_field is None
        assert unresolved_path == "customer_id.user"

    def test_terminal_attname_still_resolves_to_its_field(self):
        """source="customer_id" alone (no further segment after it) still resolves to the same
        ForeignKey field "customer" would, since nothing needs to be read off of it afterward -- only
        using an attname as an intermediate segment is unsafe, never as the terminal one."""
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        field = drf_serializers.CharField(source="customer_id", read_only=True)
        field.bind("fake", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "fake", field)

        assert model_field is CustomerOrder._meta.get_field("customer")
        assert unresolved_path is None

    def test_lookup_expression_transform_resolves_through_django_query_expressions(self, monkeypatch):
        """formatted_name_lookup_expression = "when__year" is a transform, not a relation --
        F("when__year").resolve_expression() is what annotate_formatted_name actually feeds it to, and
        Django accepts it, resolving to the IntegerField behind ExtractYear. A relation-only walk would
        incorrectly reject this as broken even though both annotation and Django admin's lookup_field()
        accept it."""
        from django.db.models import IntegerField
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        monkeypatch.setattr(CustomerOrder, "formatted_name_lookup_expression", "when__year", raising=False)
        field = drf_serializers.CharField(read_only=True)
        field.bind("formatted_name", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "formatted_name", field)

        assert isinstance(model_field, IntegerField)
        assert unresolved_path is None


@pytest.mark.django_db
class TestColumnTotalsChecks:
    """`vueda_info.E013` on the `column_totals` declarations in `tests.store.viewsets`.

    Each fixture viewset there carries a docstring saying what its declaration costs at runtime;
    what is asserted here is that the check names the viewset, the total, and the problem.
    """

    @staticmethod
    def column_totals_errors_for(viewset, serializer=None):
        from vueda.info.checks import check_column_totals_configuration

        info.registration.get_empty_registry()
        info.register(serializer or store_serializers.CartItemSerializer, viewset)

        return check_column_totals_configuration(app_configs=None)

    def test_valid_mapping_passes(self):
        assert self.column_totals_errors_for(store_viewsets.CartItemViewSet) == []

    def test_duration_field_total_passes(self):
        """A DurationField is an interval, which adds up; it is the one non-numeric column `Sum`
        means something for."""
        assert self.column_totals_errors_for(store_viewsets.CartItemDurationColumnTotalsViewSet) == []

    def test_viewset_without_column_totals_passes(self):
        assert (
            self.column_totals_errors_for(
                store_viewsets.ProductOptionViewSet, serializer=store_serializers.ProductOptionSerializer
            )
            == []
        )

    def test_list_form_is_reported(self):
        errors = self.column_totals_errors_for(store_viewsets.CartItemListColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].obj is store_viewsets.CartItemListColumnTotalsViewSet
        assert errors[0].msg == "CartItemListColumnTotalsViewSet.column_totals is a list, not a dict."
        assert "'quantity': 'quantity'" in errors[0].hint

    def test_unresolvable_path_is_reported(self):
        """The annotation allowance below is for annotations the queryset actually carries, not for
        anything that fails to resolve: a typo'd path is still an error, which is most of what this
        check is for."""
        errors = self.column_totals_errors_for(store_viewsets.CartItemUnresolvableColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        # Django's own `FieldError` text, whose list of field names after "Choices are:" changes with
        # the test models, so only the sentence before it is pinned.
        assert errors[0].msg.startswith(
            "CartItemUnresolvableColumnTotalsViewSet.column_totals['quantity'] is 'no_such_field', but Django "
            "can't resolve it: Cannot resolve keyword 'no_such_field' into field. Choices are: "
        ), errors[0].msg

    def test_unsummable_leaf_is_reported(self):
        errors = self.column_totals_errors_for(store_viewsets.CartItemUnsummableColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "CartItemUnsummableColumnTotalsViewSet.column_totals['product_name'] is "
            "'product_option__name', which is a CharField and cannot be summed."
        )

    def test_relation_leaf_is_reported(self):
        errors = self.column_totals_errors_for(store_viewsets.CartItemRelationColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "CartItemRelationColumnTotalsViewSet.column_totals['product_option'] is 'product_option', "
            "which names a relation rather than a column."
        )

    def test_reverse_foreign_key_path_is_reported(self):
        """The case nothing else catches: it raises no error and returns wrong numbers, for every
        total in the same `aggregate()` call."""
        errors = self.column_totals_errors_for(
            store_viewsets.InvoiceReverseColumnTotalsViewSet, serializer=store_serializers.InvoiceSerializer
        )

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "InvoiceReverseColumnTotalsViewSet.column_totals['line_amount'] is 'invoice_lines__amount', "
            "which reaches through a relation that can match more than one row."
        )

    def test_many_to_many_path_is_reported(self):
        errors = self.column_totals_errors_for(
            store_viewsets.ProductManyToManyColumnTotalsViewSet, serializer=store_serializers.ProductSerializer
        )

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "ProductManyToManyColumnTotalsViewSet.column_totals['special_care_id'] is 'special_care__id', "
            "which reaches through a relation that can match more than one row."
        )

    def test_annotation_path_passes(self):
        """A path naming an annotation the viewset's own `get_queryset` adds resolves for
        `aggregate()` but not through `_meta`, so the check defers to the queryset for it -- the
        same allowance `_validate_ordering_declarations` makes for an ordering term."""
        errors = self.column_totals_errors_for(
            store_viewsets.InventoryRecordAnnotatedColumnTotalsViewSet,
            serializer=store_serializers.InventoryRecordSerializer,
        )

        assert errors == []

    def test_registered_transform_path_passes(self):
        """TimesheetEntryBillableHoursViewSet totals `hours__ceil`. With `Ceil` registered on
        `DecimalField`, the transform resolves and its output is a decimal, so the check stays
        quiet."""
        with register_lookup(models.DecimalField, Ceil):
            errors = self.column_totals_errors_for(
                timesheet_viewsets.TimesheetEntryBillableHoursViewSet,
                serializer=timesheet_serializers.TimesheetEntrySerializer,
            )

        assert errors == []

    def test_unregistered_transform_path_is_reported(self):
        """Without `Ceil` registered, `ceil` is no transform that Django holds for a `DecimalField`, so
        `hours__ceil` names nothing."""
        errors = self.column_totals_errors_for(
            timesheet_viewsets.TimesheetEntryBillableHoursViewSet,
            serializer=timesheet_serializers.TimesheetEntrySerializer,
        )

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "TimesheetEntryBillableHoursViewSet.column_totals['billable_hours'] is 'hours__ceil', but Django "
            "can't resolve it: Cannot resolve keyword 'ceil' into field. Join on 'hours' not permitted."
        )

    def test_unsummable_transform_output_is_reported(self):
        """ProductReleaseJSONKeyTotalViewSet totals `specs__rank`. The key resolves, and its output is
        JSON, which is judged the same way a JSON column is."""
        errors = self.column_totals_errors_for(
            product_viewsets.ProductReleaseJSONKeyTotalViewSet,
            serializer=product_serializers.ProductReleaseSerializer,
        )

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "ProductReleaseJSONKeyTotalViewSet.column_totals['rank'] is 'specs__rank', which is a JSONField "
            "and cannot be summed."
        )

    def test_transform_on_an_annotation_passes(self):
        """ProductReleaseAnnotationTransformTotalViewSet totals `launched__year`, a transform on an
        annotation. The transform resolves and its output is an integer, so the check stays quiet."""
        errors = self.column_totals_errors_for(
            product_viewsets.ProductReleaseAnnotationTransformTotalViewSet,
            serializer=product_serializers.ProductReleaseSerializer,
        )

        assert errors == []

    def test_transform_on_an_alias_passes(self):
        """ProductReleaseAliasTransformTotalViewSet totals `launched__year`, where `launched` comes from
        `.alias()`. The total sums the path through `F()`, which Django resolves against aliases, so
        the check stays quiet."""
        errors = self.column_totals_errors_for(
            product_viewsets.ProductReleaseAliasTransformTotalViewSet,
            serializer=product_serializers.ProductReleaseSerializer,
        )

        assert errors == []

    def test_transform_on_an_untyped_annotation_is_reported(self):
        """ProductReleaseUntypedAnnotationTotalViewSet totals `launched__year` over a `Coalesce` of
        mixed types. Django's own message blames the annotation's missing type, and the hint says how
        to give it one, rather than pointing at the spelling of `year`, which is a real transform."""
        errors = self.column_totals_errors_for(
            product_viewsets.ProductReleaseUntypedAnnotationTotalViewSet,
            serializer=product_serializers.ProductReleaseSerializer,
        )

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "ProductReleaseUntypedAnnotationTotalViewSet.column_totals['launch_year'] is 'launched__year', but "
            "Django can't resolve it: Expression contains mixed types: DateTimeField, CharField. You must set "
            "output_field."
        )
        assert errors[0].hint.startswith("Give the annotation's expression an `output_field`"), errors[0].hint

    def test_misspelled_transform_on_an_annotation_is_reported(self):
        """ProductReleaseMisspelledAnnotationTransformTotalViewSet totals `launched__yaer`. Django
        resolves a path on an annotation through its transform lookup, so its own message names the
        part that isn't a transform and suggests the one that was meant."""
        errors = self.column_totals_errors_for(
            product_viewsets.ProductReleaseMisspelledAnnotationTransformTotalViewSet,
            serializer=product_serializers.ProductReleaseSerializer,
        )

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "ProductReleaseMisspelledAnnotationTransformTotalViewSet.column_totals['launch_year'] is "
            "'launched__yaer', but Django can't resolve it: Unsupported lookup 'yaer' for DateTimeField or join "
            "on the field not permitted, perhaps you meant year?"
        )

    def test_wildcard_name_is_reported(self):
        errors = self.column_totals_errors_for(store_viewsets.CartItemWildcardColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "CartItemWildcardColumnTotalsViewSet.column_totals declares a total named '*', which is a wildcard value."
        )

    def test_name_carrying_a_separator_is_reported(self):
        """VUEDA's half of the name rule: the query parameter could not carry this name back."""
        errors = self.column_totals_errors_for(store_viewsets.CartItemBadNameColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "CartItemBadNameColumnTotalsViewSet.column_totals declares a total named 'total,quantity', "
            "which contains a comma."
        )

    def test_name_django_refuses_as_an_alias_is_reported(self):
        """Django's half, quoted from Django, so the hint says what the installed version objects to."""
        errors = self.column_totals_errors_for(store_viewsets.CartItemAliasUnsafeNameColumnTotalsViewSet)

        assert len(errors) == 1, errors
        assert errors[0].id == "vueda_info.E013"
        assert errors[0].msg == (
            "CartItemAliasUnsafeNameColumnTotalsViewSet.column_totals declares a total named 'total quantity', "
            "which Django will not accept as a column alias."
        )
        assert "whitespace" in errors[0].hint

    def test_valid_column_totals_pass_manage_py_check(self):
        from django.core.management import call_command

        info.registration.get_empty_registry()
        info.register(store_serializers.CartItemSerializer, store_viewsets.CartItemViewSet)

        call_command("check", databases=["default"])


class TestColumnTotalName:
    """What `vueda_info.E013` makes of a `column_totals` key, per class of name.

    The rule is two questions, and the tests follow that split. Django answers whether the name can
    be the alias `queryset.aggregate()` is called with, and VUEDA asks that of Django rather than
    restating it, so the answer is whatever the installed Django says. VUEDA answers whether a
    client can ask for the name, which is only about the query parameter that carries it.

    No test here touches the database.
    """

    # Names VUEDA adds nothing to and Django accepts, so the check has nothing to say. `foo__bar` is
    # the form the client uses for a column reached through an expanded object; the rest are names
    # the old identifier-shaped rule refused for reasons neither half of the contract has.
    ACCEPTED = ("hours", "product_price", "foo__bar", "_leading", "a1", "X", "_", "a.b", "1x", "*a", "**", "load~all")

    # One representative per class Django's own blocklist covers. Asserted against Django too, so a
    # sample cannot quietly stop standing for the rule it was chosen for.
    DJANGO_FORBIDDEN = (
        "a'b",
        "a`b",
        'a"b',
        "a[b",
        "a]b",
        "a;b",
        "a b",
        "a\tb",
        "a\nb",
        # Trailing rather than interior: the rule this stands for is the one an anchored `$` pattern
        # silently let through, since `$` also matches before a final newline.
        "trailing\n",
        "a\x00b",
        "a\x7fb",
        "a#b",
        "a--b",
        "a/*b",
        "a*/b",
    )

    # Django accepts these; VUEDA does not, because the name also has to survive being read back out
    # of the query parameter that carries it -- which splits on commas and drops empties -- and two
    # spellings are reserved for asking for every total.
    OURS_ONLY = ("a,b", "", "*", "~all")

    @staticmethod
    def column_total_name_errors(name):
        return checks._validate_column_total_name(store_viewsets.CartItemViewSet, name)

    def test_accepted_names_pass_and_are_usable_aggregate_aliases(self):
        for name in self.ACCEPTED:
            assert self.column_total_name_errors(name) == [], name
            with warnings.catch_warnings():
                warnings.simplefilter("error")
                Query(None).check_alias(name)

    def test_names_django_refuses_are_errors(self):
        for name in self.DJANGO_FORBIDDEN:
            messages = self.column_total_name_errors(name)
            assert [message.id for message in messages] == ["vueda_info.E013"], name
            with pytest.raises(ValueError):
                Query(None).check_alias(name)

    def test_names_only_vueda_refuses_are_errors(self):
        """Django has no objection to these, so the check has to carry them itself."""
        for name in self.OURS_ONLY:
            messages = self.column_total_name_errors(name)
            assert [message.id for message in messages] == ["vueda_info.E013"], name
            Query(None).check_alias(name)

    def test_a_non_string_name_is_an_error(self):
        messages = self.column_total_name_errors(3)

        assert [message.id for message in messages] == ["vueda_info.E013"]
        assert "not a string" in messages[0].msg

    def test_percent_sign_follows_the_installed_django(self):
        """A percent sign in an alias is whatever the installed Django says it is, and so is VUEDA.

        Django added the deprecation in 6.0 and removes it in 7.0, and this package supports 5.2
        through 6.1 -- so the same name is accepted silently on 5.2, deprecated on 6.0 and 6.1, and
        an error later. Asserting any one of those outcomes would pin the test to one row of the CI
        matrix, which is the opposite of what the check is for: a project is held to the rule its
        own Django enforces. So Django is asked here too, directly rather than through
        ``_django_alias_problem``, and VUEDA is held to the same answer.

        RemovedInDjango70Warning: when Django folds the percent sign into its own blocklist the
        error branch is the only one left, and this collapses back to asserting `vueda_info.E013`.
        """
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            try:
                Query(None).check_alias("a%b")
            except ValueError:
                django_refuses, django_deprecates = True, False
            else:
                django_refuses, django_deprecates = False, bool(caught)

        messages = self.column_total_name_errors("a%b")

        if django_refuses:
            assert [message.id for message in messages] == ["vueda_info.E013"]
        elif django_deprecates:
            assert [message.id for message in messages] == ["vueda_info.W002"]
            assert "percent" in messages[0].hint.lower()
        else:
            assert messages == [], "Django accepts it, so VUEDA has nothing to say about it"

    def test_the_empty_name_says_so(self):
        """Its own message, because `{name!r}` reads as nothing at all for this one."""
        messages = self.column_total_name_errors("")

        assert [message.id for message in messages] == ["vueda_info.E013"]
        assert "empty name" in messages[0].msg


class TestSearchQuerysetChecks:
    """`vueda_info.E014` on the search querysets of the cart viewsets in `tests.store.viewsets`."""

    @staticmethod
    def check_errors(viewset):
        from vueda.info.checks import check_search_queryset_configuration

        info.registration.get_empty_registry()
        info.register(store_serializers.CartSerializer, viewset)

        return check_search_queryset_configuration(app_configs=None)

    def test_annotation_missing_from_the_default_manager_is_reported(self):
        from django.core.checks import Error

        viewset = store_viewsets.CartM2MSearchAnnotationViewSet
        name = viewset.__name__

        assert self.check_errors(viewset) == [
            Error(
                f"{name}.search_fields names 'customer_name', which is neither a field of Cart nor an annotation "
                f"of Cart's default manager. {name}.search_fields reach through a multi-valued relation (a reverse "
                "foreign key or a many-to-many), so the search matches inside a subquery built from Cart's default "
                "manager, and a search request fails with a FieldError.",
                hint=(
                    f"If 'customer_name' names an annotation {name}.get_queryset() adds, define "
                    f"{name}.get_search_queryset() returning a Cart queryset with the same annotation and no filters."
                ),
                obj=viewset,
                id="vueda_info.E014",
            )
        ]

    def test_annotation_missing_from_the_search_queryset_is_reported(self):
        from django.core.checks import Error

        class CartM2MSearchAnnotationEmptySearchQuerysetViewSet(store_viewsets.CartM2MSearchAnnotationViewSet):
            def get_search_queryset(self):
                return store_models.Cart.objects.all()

        viewset = CartM2MSearchAnnotationEmptySearchQuerysetViewSet
        name = viewset.__name__

        assert self.check_errors(viewset) == [
            Error(
                f"{name}.search_fields names 'customer_name', which is neither a field of Cart nor an annotation "
                f"of {name}.get_search_queryset(). {name}.search_fields reach through a multi-valued relation (a "
                "reverse foreign key or a many-to-many), so the search matches inside a subquery built from "
                f"{name}.get_search_queryset(), and a search request fails with a FieldError.",
                hint=f"Add the 'customer_name' annotation to {name}.get_search_queryset().",
                obj=viewset,
                id="vueda_info.E014",
            )
        ]

    def test_search_queryset_filtering_on_an_aggregate_is_reported(self):
        from django.core.checks import Error

        viewset = store_viewsets.CartM2MSearchAggregateFilterInSearchQuerysetViewSet
        name = viewset.__name__

        assert self.check_errors(viewset) == [
            Error(
                f"{name}.get_search_queryset() filters on an aggregate or a window function, and "
                f"{name}.search_fields reach through a multi-valued relation (a reverse foreign key or a "
                "many-to-many). The search matches inside a subquery that holds only the matching related rows, "
                "where that filter gives a different answer, so the search drops objects that match.",
                hint=(
                    "Remove that filter from get_search_queryset(). The viewset's queryset applies its filters "
                    "outside the subquery, where they see every related row."
                ),
                obj=viewset,
                id="vueda_info.E014",
            )
        ]

    def test_search_queryset_filtering_on_a_window_function_is_reported(self):
        from django.db.models import F
        from django.db.models import Window
        from django.db.models.functions import RowNumber

        class CartM2MSearchWindowFilterViewSet(store_viewsets.CartM2MSearchOrderingViewSet):
            def get_search_queryset(self):
                row_number = Window(RowNumber(), order_by=F("pk").asc())
                return store_models.Cart.objects.annotate(row_number=row_number).filter(row_number__lte=1)

        assert [error.id for error in self.check_errors(CartM2MSearchWindowFilterViewSet)] == ["vueda_info.E014"]

    @pytest.mark.parametrize(
        "viewset",
        [
            pytest.param(store_viewsets.CartM2MSearchAggregateFilterViewSet, id="aggregate-filter-on-viewset"),
            pytest.param(store_viewsets.CartM2MSearchAnnotationSearchQuerysetViewSet, id="annotation-in-hook"),
            pytest.param(store_viewsets.CartSearchAnnotationOnlyViewSet, id="annotation-only-search"),
            pytest.param(store_viewsets.CartSingleValuedSearchAggregateFilterViewSet, id="single-valued-search"),
            pytest.param(store_viewsets.CartM2MSearchAggregateViewSet, id="aggregate-without-filter"),
            pytest.param(store_viewsets.CartViewSet, id="no-search-fields"),
        ],
    )
    def test_passes(self, viewset):
        assert self.check_errors(viewset) == []

    def test_search_queryset_needing_a_request_is_skipped(self):
        class CartRequestSearchQuerysetViewSet(store_viewsets.CartM2MSearchAnnotationViewSet):
            def get_search_queryset(self):
                return store_models.Cart.objects.filter(customer__user=self.request.user)

        assert self.check_errors(CartRequestSearchQuerysetViewSet) == []

    def test_serializer_without_viewset_is_skipped(self):
        from vueda.info.checks import check_search_queryset_configuration

        info.registration.get_empty_registry()
        info.register_serializer(store_serializers.CartSerializer)

        assert check_search_queryset_configuration(app_configs=None) == []
