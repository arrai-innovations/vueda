from django.db.models import F
from rest_framework.viewsets import ModelViewSet

import tests.erring.filtersets as my_filtersets
import tests.erring.models as my_models
import tests.erring.serializers as my_serializers
import tests.store.models as store_models
import tests.store.serializers as store_serializers
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


class ExpandableFieldsEmptyTupleViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsEmptyTupleSerializer


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
    ordering_fields = ["the_name_field"]
    nulls_ordering = {"the_name_field": "first"}
    nulls_ordering_flip = ["the_name_field"]


class BadNullsOrderingPlacementViewSet(VuedaViewSet):
    """Names a placement outside "first"/"last". There is no `nulls_<placement>` keyword for it to
    become, so `VuedaOrderingFilter` ignores it and `vueda_info.E007` is the only signal that the
    declaration doesn't do what it says."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering_fields = ["the_name_field"]
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
    ordering_fields = ["the_name_field"]
    nulls_ordering_flip = ["the_name_field"]


class NullsOrderingBothAttributesWrongViewSet(VuedaViewSet):
    """Gets both attributes wrong at once: an unusable placement in `nulls_ordering`, and a field in
    `nulls_ordering_flip` that `nulls_ordering` doesn't cover.

    The two are separate attributes that fail independently, so the check has to report both from one
    run rather than making the reader fix one, re-run, and discover the other."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering_fields = ["the_name_field", "id"]
    nulls_ordering = {"the_name_field": "First"}
    nulls_ordering_flip = ["id"]


class NullsOrderingNotADictWithFlipViewSet(VuedaViewSet):
    """Declares `nulls_ordering` as a list *and* names a field to flip.

    An unusable `nulls_ordering` gives no field a placement, so the flip entry has nothing to act on
    either. Both are reported: skipping the flip pass along with the declaration it depends on would
    hide the second half of the same mistake."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering_fields = ["the_name_field"]
    nulls_ordering = ["the_name_field"]
    nulls_ordering_flip = ["the_name_field"]


class NullsOrderingFlipNotIterableViewSet(VuedaViewSet):
    """Declares `nulls_ordering_flip` as something with no field names to read.

    `VuedaOrderingFilter` tests membership in it (`field_name in nulls_ordering_flip`), which raises
    `TypeError` on a non-iterable, so this would 500 every descending `?o=` for a field that has a
    placement. The filter drops it instead and the check reports the declaration."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering_fields = ["the_name_field"]
    nulls_ordering = {"the_name_field": "first"}
    nulls_ordering_flip = 1


class RelationNullsOrderingViewSet(VuedaViewSet):
    """Declares placements on three relation paths that `ordering_fields` offers: a plain path, a path
    ending in the "pk" alias, and a related formatted_name reached through a lookup expression.

    Each key is the `__`-joined term the filter orders by, so every placement applies and
    `vueda_info.E007` must stay quiet."""

    queryset = my_models.SingleValuedLookupExpression.objects.all()
    serializer_class = my_serializers.SingleValuedLookupExpressionSerializer
    ordering_fields = ["the_name_source__the_name_field", "the_name_source__pk", "the_name_source__formatted_name"]
    nulls_ordering = {
        "the_name_source__the_name_field": "first",
        "the_name_source__pk": "last",
        "the_name_source__formatted_name": "first",
    }
    nulls_ordering_flip = ["the_name_source__the_name_field"]


class CrossSpelledPKNullsOrderingViewSet(VuedaViewSet):
    """Spells one field two ways: `ordering_fields` and the flip entry name `the_name_source__id`, and
    the `nulls_ordering` key names the "pk" alias in front of it.

    `VuedaOrderingFilter` matches the alias and the field behind it as one field, so the placement
    applies to `?o=the_name_source.id` and flips when that request is descending. `vueda_info.E007`
    has to match them the same way and stay quiet."""

    queryset = my_models.SingleValuedLookupExpression.objects.all()
    serializer_class = my_serializers.SingleValuedLookupExpressionSerializer
    ordering_fields = ["the_name_source__id"]
    nulls_ordering = {"the_name_source__pk": "first"}
    nulls_ordering_flip = ["the_name_source__id"]


class CompositePKNullsOrderingViewSet(VuedaViewSet):
    """Keys a nulls placement and its flip on the "pk" alias of a model whose primary key is made of
    two columns.

    `model_ordering` advertises `order` and `product` rather than `pk`, so a metadata-driven client
    sends one column at a time, and a placement on the whole key matches none of those terms. It
    applies only when the list is sorted by `pk` itself."""

    queryset = store_models.OrderItemCompositePK.objects.all()
    serializer_class = store_serializers.OrderItemCompositePKSerializer
    ordering_fields = ["pk"]
    nulls_ordering = {"pk": "first"}
    nulls_ordering_flip = ["pk"]


class CompositePKColumnNullsOrderingViewSet(VuedaViewSet):
    """Keys a nulls placement and its flip on the "pk" of a two-column primary key and on each of its
    columns.

    The `pk` entry reaches a list sorted by the whole key, and the column entries reach a request for
    either column, which is the spelling `model_ordering` advertises. Every route is covered, so
    `vueda_info.E007` must stay quiet."""

    queryset = store_models.OrderItemCompositePK.objects.all()
    serializer_class = store_serializers.OrderItemCompositePKSerializer
    ordering_fields = ["pk"]
    nulls_ordering = {"pk": "first", "order": "first", "product": "first"}
    nulls_ordering_flip = ["pk", "order", "product"]


class DottedNullsOrderingKeyViewSet(VuedaViewSet):
    """Writes a `nulls_ordering` key in the dotted `?o=` spelling.

    The filter translates `?o=the_name_source.the_name_field` to `the_name_source__the_name_field`
    before it looks up a placement, so the dotted key matches nothing and the placement is silently
    dropped."""

    queryset = my_models.SingleValuedLookupExpression.objects.all()
    serializer_class = my_serializers.SingleValuedLookupExpressionSerializer
    ordering_fields = ["the_name_source__the_name_field"]
    nulls_ordering = {"the_name_source.the_name_field": "first"}


class DottedNullsOrderingFlipViewSet(VuedaViewSet):
    """Spells the `nulls_ordering` key correctly but writes the matching `nulls_ordering_flip` entry
    in the dotted `?o=` spelling, so the placement never flips."""

    queryset = my_models.SingleValuedLookupExpression.objects.all()
    serializer_class = my_serializers.SingleValuedLookupExpressionSerializer
    ordering_fields = ["the_name_source__the_name_field"]
    nulls_ordering = {"the_name_source__the_name_field": "first"}
    nulls_ordering_flip = ["the_name_source.the_name_field"]


class UnrequestableNullsOrderingViewSet(VuedaViewSet):
    """Declares placements on two keys that no list request can sort by.

    `the_name_source__the_name_field` is a real path, but neither `ordering_fields` nor the default
    ordering names it, so no request reaches it. `no_such_field` names nothing on the model at all."""

    queryset = my_models.SingleValuedLookupExpression.objects.all()
    serializer_class = my_serializers.SingleValuedLookupExpressionSerializer
    ordering_fields = ["id"]
    nulls_ordering = {"the_name_source__the_name_field": "first", "no_such_field": "first"}


class RequestOnlyQuerysetNullsOrderingViewSet(VuedaViewSet):
    """Writes a dotted `nulls_ordering` key on a viewset whose `get_queryset` needs the request.

    The check builds the view without a request, so it can't read the names a request may sort by
    and has nothing to judge the key against. It stays quiet rather than failing the check run."""

    queryset = my_models.SingleValuedLookupExpression.objects.all()
    serializer_class = my_serializers.SingleValuedLookupExpressionSerializer
    ordering_fields = ["the_name_source__the_name_field"]
    nulls_ordering = {"the_name_source.the_name_field": "first"}

    def get_queryset(self):
        return super().get_queryset().filter(the_name_source__the_name_field=self.request.user.username)


class GetQuerysetConflictingOrderingViewSet(VuedaViewSet):
    """Orders inside `get_queryset()` one way while the model's `Meta.ordering` declares another, and
    declares no `ordering` of its own.

    The `get_queryset()` counterpart of ConflictingQuerysetOrderingViewSet: the rows arrive in the
    ascending order that `get_queryset()` applies, while `model_ordering.default` reports the model's
    descending one."""

    queryset = my_models.ModelOrderingQueryset.objects.all()
    serializer_class = my_serializers.ModelOrderingQuerysetSerializer

    def get_queryset(self):
        return super().get_queryset().order_by("the_name_field")


class GetQuerysetUndeclaredOrderingViewSet(VuedaViewSet):
    """Orders inside `get_queryset()` on a model that declares no `Meta.ordering`, and declares no
    `ordering` of its own, so the metadata reports no default ordering at all."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer

    def get_queryset(self):
        return super().get_queryset().order_by("the_name_field")


class GetQuerysetOverriddenOrderingViewSet(VuedaViewSet):
    """Declares an `ordering` that reverses the one `get_queryset()` applies. DRF applies the
    declaration on every list request, so the `get_queryset()` ordering reaches no response."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["the_name_field"]

    def get_queryset(self):
        return super().get_queryset().order_by("-the_name_field")


class RequestOnlyGetQuerysetOrderingViewSet(VuedaViewSet):
    """Orders its class-level queryset against the model's `Meta.ordering`, and has a `get_queryset()`
    that needs the request.

    A view built at check time has no request, so the check falls back to the class-level `queryset`
    and still reports the conflict there."""

    queryset = my_models.ModelOrderingQueryset.objects.order_by("the_name_field")
    serializer_class = my_serializers.ModelOrderingQuerysetSerializer

    def get_queryset(self):
        return super().get_queryset().filter(the_name_field=self.request.user.username)


class GetQuerysetNullsPlacementViewSet(VuedaViewSet):
    """Declares `ordering = ["the_name_field"]` while `get_queryset()` orders the same field with nulls
    first.

    PostgreSQL puts nulls last in an ascending sort, so the two put null rows at opposite ends even
    though they name the same field in the same direction."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["the_name_field"]

    def get_queryset(self):
        return super().get_queryset().order_by(F("the_name_field").asc(nulls_first=True))


class NullsOrderingAgreeingGetQuerysetViewSet(VuedaViewSet):
    """Declares the same nulls-first placement through `nulls_ordering` that `get_queryset()` states
    in its expression. A list request applies the declaration to `ordering`, so the two agree."""

    queryset = my_models.ValidLookupExpression.objects.all()
    serializer_class = my_serializers.ValidLookupExpressionSerializer
    ordering = ["the_name_field"]
    nulls_ordering = {"the_name_field": "first"}

    def get_queryset(self):
        return super().get_queryset().order_by(F("the_name_field").asc(nulls_first=True))


class QuerySetMethodOrderingViewSet(VuedaViewSet):
    """Orders through a custom QuerySet method in `get_queryset()`, on a model that declares no
    `Meta.ordering`.

    `by_name()` calls `order_by()`, so the queryset carries the same terms a direct call would leave,
    and the check reports it the same way."""

    queryset = my_models.SecondaryManagerOrdering.objects.all()
    serializer_class = my_serializers.SecondaryManagerOrderingSerializer

    def get_queryset(self):
        return super().get_queryset().by_name()


class SecondaryManagerQuerysetOrderingViewSet(VuedaViewSet):
    """Starts from a second manager that orders, on a model whose default manager doesn't.

    The model-wide check leaves that manager alone, since it orders only the code that names it. This
    viewset names it, so its list arrives in that order and `vueda_info.E010` compares it."""

    queryset = my_models.SecondaryManagerOrdering.ordered.all()
    serializer_class = my_serializers.SecondaryManagerOrderingSerializer


class SecondaryManagerModelViewSet(VuedaViewSet):
    """Starts from the unordered default manager of a model whose second manager orders."""

    queryset = my_models.SecondaryManagerOrdering.objects.all()
    serializer_class = my_serializers.SecondaryManagerOrderingSerializer


class OtherNameManagerOrderingViewSet(VuedaViewSet):
    """Serves a model whose only manager is named `ordered`, and orders by a plain field."""

    queryset = my_models.OtherNameManagerOrdering.ordered.all()
    serializer_class = my_serializers.OtherNameManagerOrderingSerializer


class DefaultManagerNameOrderingViewSet(VuedaViewSet):
    """Serves a model whose `Meta.default_manager_name` picks an ordering manager."""

    queryset = my_models.DefaultManagerNameOrdering.ordered.all()
    serializer_class = my_serializers.DefaultManagerNameOrderingSerializer


class AggregateManagerOrderingViewSet(VuedaViewSet):
    """Serves a model whose default manager orders by an aggregate annotation it adds."""

    queryset = my_models.AggregateManagerOrdering.objects.all()
    serializer_class = my_serializers.AggregateManagerOrderingSerializer


class AggregateManagerMetaOrderingViewSet(VuedaViewSet):
    """Starts from a default manager that sorts by an aggregate annotation, on a model whose
    `Meta.ordering` disagrees, and declares no `ordering` of its own."""

    queryset = my_models.AggregateManagerMetaOrdering.objects.all()
    serializer_class = my_serializers.AggregateManagerMetaOrderingSerializer


class SimpleAnnotationManagerOrderingViewSet(VuedaViewSet):
    """Serves a model whose default manager orders by a single-column annotation it adds."""

    queryset = my_models.SimpleAnnotationManagerOrdering.objects.all()
    serializer_class = my_serializers.SimpleAnnotationManagerOrderingSerializer


class MisspelledFManagerOrderingViewSet(VuedaViewSet):
    """Serves a model whose default manager misspells a name inside an `F()`."""

    queryset = my_models.MisspelledFManagerOrdering.objects.all()
    serializer_class = my_serializers.MisspelledFManagerOrderingSerializer


class MisspelledNameManagerOrderingViewSet(VuedaViewSet):
    """Serves a model whose default manager misspells a plain string name.

    Building the queryset raises, so this viewset builds it only in `get_queryset()`. A class-level
    `queryset` would fail when this module is imported."""

    serializer_class = my_serializers.MisspelledNameManagerOrderingSerializer

    def get_queryset(self):
        return my_models.MisspelledNameManagerOrdering.objects.all()


class MisspelledTransformManagerOrderingViewSet(VuedaViewSet):
    """Serves a model whose default manager misspells a transform."""

    queryset = my_models.MisspelledTransformManagerOrdering.objects.all()
    serializer_class = my_serializers.MisspelledTransformManagerOrderingSerializer


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
