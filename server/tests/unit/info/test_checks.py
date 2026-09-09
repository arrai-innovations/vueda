import pytest

from tests.erring import models as err_models
from tests.erring import serializers as err_serializers
from tests.erring import viewsets as err_viewsets
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from vueda import info


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

    def test_formatted_name_expression_not_string(self):
        """FormattedNameExpressionNotString has a lookup expression that is not a string; check must flag it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.FormattedNameExpressionNotStringSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "FormattedNameExpressionNotString defines formatted_name_lookup_expression as something other than a string.",
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
        """A model that does not override formatted_name should be skipped by the check (no errors)."""
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
        """ValidGetFormattedName sets formatted_name=None with a plain get_formatted_name() method; check must produce no errors."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_valid_lookup_expression_passes_system_check(self):
        """ValidLookupExpression sets formatted_name=None with a string lookup expression; check must produce no errors."""
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

    def test_plain_default_manager_system_check_error(self):
        """PlainManagerLookupExpression declares its own `objects = models.Manager()`, which shadows the
        `FormattedNameManager` that `FormattedNameBaseModel` provides.

        Nothing then annotates `formatted_name` onto the model's own querysets, so it resolves only on
        the ones `VuedaViewSet.get_queryset` builds, and `vueda_info.E009` is the signal for that.
        A `Meta.ordering` naming `formatted_name` is reported separately by Django's own
        `models.E015`, since `FormattedNameBaseModel._check_ordering` asks about the default manager
        before withholding that term — this model declares no such ordering, so E009 stands alone
        here.
        """
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.PlainManagerLookupExpressionSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert [error.id for error in errors] == ["vueda_info.E009"]
        assert (
            errors[0].msg == "PlainManagerLookupExpression reaches formatted_name through "
            "formatted_name_lookup_expression but uses Manager as its default manager, which does not "
            "inherit FormattedNameManager."
        )
        assert "Subclass it instead of `models.Manager`" in errors[0].hint
        assert errors[0].obj is err_models.PlainManagerLookupExpression

    def test_formatted_name_manager_default_passes_system_check(self):
        """ValidLookupExpression declares no manager of its own, so it keeps the inherited
        `FormattedNameManager` and E009 has to stay quiet."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidLookupExpressionSerializer)

        assert check_formatted_name_configuration(app_configs=None) == []

    def test_a_manager_subclassing_formatted_name_manager_passes_system_check(self):
        """The documented way to keep the annotation while adding manager behaviour of your own.

        `tests.product.ProductManager` is one instance of it: it declares `objects` on the model
        itself, which shadows the `FormattedNameManager` that `FormattedNameBaseModel` provides, so
        it has to inherit that manager rather than `models.Manager` to avoid taking the annotation
        with it. A manager declared on an abstract base closer in the MRO than
        `FormattedNameBaseModel` shadows it the same way.
        """
        from django.db import models

        from vueda.core.models import FormattedNameManager
        from vueda.info.checks import check_formatted_name_configuration

        class NarrowingManager(FormattedNameManager):
            pass

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.PlainManagerLookupExpressionSerializer)

        model = err_models.PlainManagerLookupExpression
        # `default_manager` is a cached_property, so the cache entry is what has to be swapped.
        original = model._meta.__dict__.get("default_manager")
        model._meta.__dict__["default_manager"] = NarrowingManager()
        try:
            errors = check_formatted_name_configuration(app_configs=None)
        finally:
            if original is None:
                model._meta.__dict__.pop("default_manager", None)
            else:
                model._meta.__dict__["default_manager"] = original

        assert errors == []
        # Guards the assertion above against passing for the wrong reason.
        assert issubclass(NarrowingManager, models.Manager)

    def test_no_name_field_system_check_error(self):
        """NoNameField has formatted_name = None with no lookup expression or get_formatted_name(); check must flag it."""
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
        """NonVuedaFormattedName is a plain model (no VuedaModel heritage); formatted name checks must be skipped entirely."""
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
        """The enhanced check scans expandable_fields; NoNameField is not registered directly but is flagged because it appears in RelatedObjectsAreMissingDataSerializer.expandable_fields."""
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
        flag it as E006 and name `ordering`."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UnresolvableOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "Ordering by 'no_such_field' is declared in UnresolvableOrderingViewSet.ordering, but "
                "ValidLookupExpression has no such field, related field, or lookup.",
                hint=(
                    "Point it at a field ValidLookupExpression has, at a path through its relations, "
                    "or at an annotation the viewset's own `get_queryset` adds. Model-info metadata "
                    "leaves what it can't resolve out of `model_ordering`, and a list request that "
                    "falls back to this ordering fails with a `FieldError`."
                ),
                obj=err_viewsets.UnresolvableOrderingViewSet,
                id="vueda_info.E006",
            )
        ]

    def test_unresolvable_ordering_fields_entry_system_check_error(self):
        """UnresolvableOrderingFieldsViewSet offers a field the model doesn't have through
        `ordering_fields`. Nothing fails at request time for this one, so the check is the only signal
        it produces; the hint says so rather than promising a `FieldError`."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UnresolvableOrderingFieldsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "Ordering by 'no_such_field' is declared in "
                "UnresolvableOrderingFieldsViewSet.ordering_fields, but ValidLookupExpression has no "
                "such field, related field, or lookup.",
                hint=(
                    "Point it at a field ValidLookupExpression has, at a path through its relations, "
                    "or at an annotation the viewset's own `get_queryset` adds. Model-info metadata "
                    "leaves what it can't resolve out of `model_ordering`, so clients are never "
                    "offered this field to order by."
                ),
                obj=err_viewsets.UnresolvableOrderingFieldsViewSet,
                id="vueda_info.E006",
            )
        ]

    def test_unresolvable_labelled_ordering_fields_entry_system_check_error(self):
        """LabelledOrderingFieldsViewSet writes both `ordering_fields` entries as DRF's
        `(field_name, label)` pair. The check reads the name off a pair the way DRF and the metadata
        do, so the stale one is reported by its field name — not by the pair — and the label stays
        out of the message. Read as an ordering term instead, a pair yields no field path at all and
        a stale one would be reported by nothing."""
        from django.core.checks import Error

        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.LabelledOrderingFieldsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert errors == [
            Error(
                "Ordering by 'no_such_field' is declared in LabelledOrderingFieldsViewSet.ordering_fields, "
                "but ValidLookupExpression has no such field, related field, or lookup.",
                hint=(
                    "Point it at a field ValidLookupExpression has, at a path through its relations, "
                    "or at an annotation the viewset's own `get_queryset` adds. Model-info metadata "
                    "leaves what it can't resolve out of `model_ordering`, so clients are never "
                    "offered this field to order by."
                ),
                obj=err_viewsets.LabelledOrderingFieldsViewSet,
                id="vueda_info.E006",
            )
        ]

    def test_resolvable_labelled_ordering_fields_entry_is_not_flagged(self):
        """The pair naming a real field is left alone, so declaring a field with a label doesn't
        become an error in itself."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.LabelledOrderingFieldsViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert len(errors) == 1
        assert "the_name_field" not in errors[0].msg
        assert "The Name" not in errors[0].msg

    def test_resolvable_field_in_the_same_declaration_is_not_flagged(self):
        """Both declarations pair the bad term with a real one; only the bad term is reported."""
        from vueda.info.checks import check_ordering_configuration

        info.registration.get_empty_registry()
        info.register(err_serializers.ValidLookupExpressionSerializer, err_viewsets.UnresolvableOrderingViewSet)

        errors = check_ordering_configuration(app_configs=None)

        assert len(errors) == 1
        assert "the_name_field" not in errors[0].msg

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
    """`vueda_info.E010` covers an ordering declared on a viewset's class-level `queryset`.

    DRF's ordering backend reads a view's `ordering` and nothing else, so an `order_by()` on the
    queryset is an ordering the metadata never reports — and, with no `ordering` declared, the one a
    list request actually returns. Nothing fails either way, which is why a check is the only signal.
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
                    "order to every client. Dropping the `order_by()` is the other answer, and "
                    "reverses the list."
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
