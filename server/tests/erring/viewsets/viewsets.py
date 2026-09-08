from django.db.models import F
from rest_framework.viewsets import ModelViewSet

import tests.erring.filtersets as my_filtersets
import tests.erring.models as my_models
import tests.erring.serializers as my_serializers
from vueda.core.viewsets import VuedaViewSet


class NoExpandableFieldsDataViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.NoExpandableFieldsDataSerializer


class RelatedObjectsAreMissingDataViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.RelatedObjectsAreMissingDataSerializer
    filterset_class = my_filtersets.RelatedObjectsAreMissingDataFilterSet
    permit_list_expands = ["no_name"]


class ExpandableFieldsListViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsListSerializer


class ExpandableFieldsBadTupleLengthViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsBadTupleLengthSerializer


class ExpandableFieldsUnresolvableStringViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsUnresolvableStringSerializer


class ExpandableFieldsNotClassViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNotClassSerializer


class ExpandableFieldsNonDictOptionsViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNonDictOptionsSerializer


class ExpandableFieldsNotFieldSubclassViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNotFieldSubclassSerializer


class ExpandableFieldsValidStringViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsValidStringSerializer


class ExpandableFieldsPointsAtUnregisteredViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsPointsAtUnregisteredSerializer


class ExpandableFieldsNestedInvalidViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNestedInvalidSerializer


class UnregisteredNonVuedaExpandableFieldsNonDictOptionsViewSet(ModelViewSet):
    """A plain (non-VuedaViewSet) ModelViewSet, proving the check isn't VUEDA-specific."""

    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer


class ValidGetFormattedNameOrderingViewSet(VuedaViewSet):
    """Default-orders by formatted_name on a model that computes it with a get_formatted_name()
    method, which the database has nothing to sort by."""

    queryset = my_models.ValidGetFormattedName.objects.all()
    serializer_class = my_serializers.ValidGetFormattedNameSerializer
    ordering = ["formatted_name"]


class ValidGetFormattedNameOrderingFieldsViewSet(VuedaViewSet):
    """Offers formatted_name to clients through `ordering_fields` instead of as the default ordering,
    on the same method-backed model — still nothing for the database to sort by."""

    queryset = my_models.ValidGetFormattedName.objects.all()
    serializer_class = my_serializers.ValidGetFormattedNameSerializer
    ordering_fields = ["formatted_name"]


class ValidLookupExpressionOrderingViewSet(VuedaViewSet):
    """Default-orders by formatted_name on a model that reaches it through
    `formatted_name_lookup_expression`, which the database can sort by. A valid configuration, so the
    ordering check must stay quiet about it."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["formatted_name"]


class UnresolvableOrderingViewSet(VuedaViewSet):
    """Default-orders by a field the model doesn't have, alongside one it does — the drift a viewset's
    `ordering` can carry with nothing to catch it, since Django's own `models.E015` only reads
    `Meta.ordering`."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["the_name_field", "no_such_field"]


class UnresolvableOrderingFieldsViewSet(VuedaViewSet):
    """Offers a field the model doesn't have to clients through `ordering_fields`. Nothing fails at
    request time for this one — the metadata simply never advertises it — so the check is the only
    signal there is."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering_fields = ["the_name_field", "no_such_field"]


class LabelledOrderingFieldsViewSet(VuedaViewSet):
    """Writes both `ordering_fields` entries as DRF's `(field_name, label)` pair, one naming a real
    field and one naming a field the model doesn't have.

    The check reads a pair's name the same way the metadata does, so the stale pair is reported and
    the good one isn't. Reading the pair as an ordering term instead would find no field path in
    either, leaving a stale pair reported by nothing at all."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering_fields = [("the_name_field", "The Name"), ("no_such_field", "No Such Field")]


class ResolvableOrderingAliasesViewSet(VuedaViewSet):
    """Orders by the "pk" alias and by a formatted_name reached through
    `formatted_name_lookup_expression`, neither of which is a field name on the model. Both resolve
    the way the metadata resolves them, so the ordering check must stay quiet."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["pk"]
    ordering_fields = ["formatted_name", "pk", "?"]


class AnnotatedOrderingViewSet(VuedaViewSet):
    """Orders by an annotation its own `get_queryset` adds. It is orderable without being a model
    field, so the ordering check must resolve it against the queryset rather than reporting it."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["annotated_name"]

    def get_queryset(self):
        return super().get_queryset().annotate(annotated_name=F("the_name_field"))


class ValidNullsOrderingViewSet(VuedaViewSet):
    """Declares a nulls placement the way `VuedaOrderingFilter` documents it, with the flip list
    naming a field the placement mapping covers. A valid configuration, so `vueda_info.E007` must
    stay quiet."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering = {"the_name_field": "first"}
    nulls_ordering_flip = ["the_name_field"]


class BadNullsOrderingPlacementViewSet(VuedaViewSet):
    """Names a placement outside "first"/"last". There is no `nulls_<placement>` keyword for it to
    become, so `VuedaOrderingFilter` ignores it and `vueda_info.E007` is the only signal that the
    declaration doesn't do what it says."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering = {"the_name_field": "First"}


class NullsOrderingNotADictViewSet(VuedaViewSet):
    """Declares `nulls_ordering` as a list of field names rather than a mapping of field name to
    placement, which reads as a plausible shorthand but gives no placement to apply."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering = ["the_name_field"]


class NullsOrderingFlipWithoutPlacementViewSet(VuedaViewSet):
    """Lists a field in `nulls_ordering_flip` that `nulls_ordering` gives no placement, so there is
    nothing for the flip to act on — the half-written form of a declaration meant to work as a
    pair."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering_flip = ["the_name_field"]


class NullsOrderingBothAttributesWrongViewSet(VuedaViewSet):
    """Gets both attributes wrong at once: an unusable placement in `nulls_ordering`, and a field in
    `nulls_ordering_flip` that `nulls_ordering` doesn't cover.

    The two are separate attributes that fail independently, so the check has to report both from one
    run rather than making the reader fix one, re-run, and discover the other."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering = {"the_name_field": "First"}
    nulls_ordering_flip = ["id"]


class NullsOrderingNotADictWithFlipViewSet(VuedaViewSet):
    """Declares `nulls_ordering` as a list *and* names a field to flip.

    An unusable `nulls_ordering` gives no field a placement, so the flip entry has nothing to act on
    either. Both are reported: skipping the flip pass along with the declaration it depends on would
    hide the second half of the same mistake."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering = ["the_name_field"]
    nulls_ordering_flip = ["the_name_field"]


class NullsOrderingFlipNotIterableViewSet(VuedaViewSet):
    """Declares `nulls_ordering_flip` as something with no field names to read.

    `VuedaOrderingFilter` tests membership in it (`field_name in nulls_ordering_flip`), which raises
    `TypeError` on a non-iterable, so this would 500 every descending `?o=` for a field that has a
    placement. The filter drops it instead and the check reports the declaration."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    nulls_ordering = {"the_name_field": "first"}
    nulls_ordering_flip = 1


class ConflictingQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset one way while the model's `Meta.ordering` declares another,
    and declares no `ordering` of its own.

    The queryset's order is what a list request returns — DRF's ordering backend has no view
    `ordering` to apply, so it leaves the queryset alone — while `model_ordering.default` falls back
    to the model's declaration and reports the opposite direction. `vueda_info.E010` is the only
    signal; nothing fails, and both halves look right read on their own."""

    queryset = my_models.ModelOrderingQueryset.objects.order_by("the_name_field")
    serializer_class = my_serializers.ModelOrderingQuerysetSerializer


class UndeclaredQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset on a model that declares no `Meta.ordering`, and declares no
    `ordering` of its own.

    The same mismatch in its other shape: rows arrive sorted and the metadata reports no default
    ordering at all, so a client can't show which column sorted them."""

    queryset = my_models.ValidLookupExpression.objects.order_by("the_name_field")
    serializer_class = my_serializers.ValidLookupExpressionSerializer


class OverriddenQuerysetOrderingViewSet(VuedaViewSet):
    """Declares an `ordering` that reverses what its class-level queryset orders by.

    Here the metadata is accurate — DRF applies the view's `ordering` over whatever the queryset
    carried — so what the check reports is the dead declaration, which reads as if it set the list's
    order and sets nothing."""

    queryset = my_models.ValidLookupExpression.objects.order_by("-the_name_field")
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["the_name_field"]


class AgreeingQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset and declares the same `ordering`. Redundant, but it describes
    the order the rows arrive in, so the check must stay quiet."""

    queryset = my_models.ValidLookupExpression.objects.order_by("the_name_field")
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["the_name_field"]


class ModelAgreeingQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset exactly as the model's `Meta.ordering` does, declaring no
    `ordering` of its own. Also redundant, also accurate, so also quiet."""

    queryset = my_models.ModelOrderingQueryset.objects.order_by("-the_name_field")
    serializer_class = my_serializers.ModelOrderingQuerysetSerializer


class FormattedNameQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset by the column behind `formatted_name` while declaring
    `ordering` as `formatted_name` itself.

    One sort under two names, since the model reaches the value through
    `formatted_name_lookup_expression`, so the check has to resolve both sides to the same path
    rather than report a conflict between a name and its own column."""

    queryset = my_models.ValidLookupExpression.objects.order_by("the_name_field")
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["formatted_name"]


class PKAliasQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset by the "pk" alias while declaring `ordering` as the field the
    alias stands for. The same sort spelled two ways, so the check expands the alias the way the
    metadata does instead of reporting it."""

    queryset = my_models.ValidLookupExpression.objects.order_by("pk")
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["id"]


class RandomQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset randomly, which names no column at all.

    There is nothing to compare against the declared default, so the check says nothing rather than
    guessing — the same terms `model_ordering.default` withholds."""

    queryset = my_models.ModelOrderingQueryset.objects.order_by("?")
    serializer_class = my_serializers.ModelOrderingQuerysetSerializer
