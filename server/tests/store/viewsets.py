from dateutil.relativedelta import relativedelta
from django.db.models import F
from django.db.models.functions import Lower
from django.http import Http404
from django.utils.timezone import now
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

import tests.store.filtersets as my_filtersets
import tests.store.models as my_models
import tests.store.serializers as my_serializers
from tests.permissions import IsAdminUser
from tests.permissions import IsCartOrOrderCreator
from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.core.viewsets import VuedaViewSet
from vueda.workflow.views import HasWorkflowViewMixin


class CustomerViewSet(VuedaViewSet):
    queryset = my_models.Customer.objects.all()
    serializer_class = my_serializers.CustomerSerializer
    ordering_fields = ["user__email"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        # Make 'current' and 'history-list' not allowed for admin or customer.
        return frozenset()


class CustomerOrderingFormattedNameViewSet(CustomerViewSet):
    """`ordering` names formatted_name on a model that has no formatted_name column of its own and
    reaches it through `formatted_name_lookup_expression` ("data__formatted_name"), which
    VuedaViewSet.get_queryset annotates so the database can sort by it. Proves the model-info
    metadata resolves the lookup expression while still reporting the field as "formatted_name"."""

    ordering = ["formatted_name"]


class CustomerDataViewSet(VuedaReadOnlyViewSet):
    queryset = my_models.CustomerData.objects.all()
    serializer_class = my_serializers.CustomerDataSerializer
    ordering_fields = ["formatted_name"]


class DistributorViewSet(VuedaViewSet):
    queryset = my_models.Distributor.objects.all()
    serializer_class = my_serializers.DistributorSerializer
    filterset_class = my_filtersets.DistributorFilterSet
    ordering_fields = ["name"]
    ordering = ["name"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        # Make 'current' and 'history-list' not allowed for customer.
        if "Customer" in request.user.groups.values_list("name", flat=True):
            return frozenset()

        return super().get_allowed_extra_actions(request, instance=instance)


class DistributorTrigramSimilarViewSet(DistributorViewSet):
    search_fields = ["#name"]


class DistributorTrigramWordSimilarViewSet(DistributorViewSet):
    search_fields = ["~name"]


class DistributorRankedSearchViewSet(DistributorViewSet):
    search_fields = ["V:name", "V:description"]


class DistributorRankedDescriptionViewSet(DistributorViewSet):
    search_fields = ["V:description"]


class ProductViewSet(VuedaViewSet):
    queryset = my_models.Product.objects.all()
    serializer_class = my_serializers.ProductSerializer
    filterset_class = my_filtersets.ProductFilterSet
    ordering_fields = ["distributor__name", "name", "disabled"]


class OptionTypeViewSet(VuedaViewSet):
    queryset = my_models.OptionType.objects.all()
    serializer_class = my_serializers.OptionTypeSerializer


class ProductOptionViewSet(VuedaViewSet):
    queryset = my_models.ProductOption.objects.all()
    serializer_class = my_serializers.ProductOptionSerializer
    filterset_class = my_filtersets.ProductOptionFilterSet
    ordering_fields = ["name", "option_type", "sku", "gtin", "price"]


class CartViewSet(VuedaViewSet):
    queryset = my_models.Cart.objects.all()
    serializer_class = my_serializers.CartSerializer
    permission_classes = [ObjectPermissions & (IsCartOrOrderCreator | IsAdminUser)]
    filterset_class = my_filtersets.CartFilterSet
    permit_list_expands = ["cart_items", "customer"]
    permit_retrieve_expands = ["cart_items", "customer"]
    ordering_fields = ["customer__user__email", "last_modified"]
    ordering = [F("expected_delivery_time").asc(nulls_first=True)]

    @action(detail=False, methods=["post"], permission_classes=(), bulk=True)
    def dry_run_outer(self, request):
        return self.dry_run_inner(request)

    @action(detail=False, methods=["post"], permission_classes=(), bulk=True)
    def dry_run_inner(self, request):
        if request.data.get("fail"):
            raise VuedaValidationError({"detail": ["Action failed"]})

        my_models.Distributor.objects.create(name="Dry Run", description="Dry Run Test")
        return Response({"created": True})

    @action(detail=True, methods=["post"], permission_classes=(IsCartOrOrderCreator,))
    def create_order(self, request, pk):
        queryset = self.get_queryset()
        cart = queryset.filter(pk=pk).first()
        if cart is None:
            raise Http404

        user = request.user
        if cart.customer.user != user:
            raise PermissionDenied

        customer_order = my_models.CustomerOrder.objects.create(
            customer=cart.customer,
            order_number=my_models.CustomerOrder.get_next_order_number(),
            order_state=my_models.OrderState.objects.get(code="new"),
        )
        for cart_item in cart.cart_items.all():
            my_models.OrderItem.objects.create(
                customer_order=customer_order,
                product_option=cart_item.product_option,
                quantity=cart_item.quantity,
            )
        return Response(customer_order.pk)

    @action(detail=False, methods=["get"], permission_classes=(IsAdminUser,))
    def abandoned_carts_count(self, request):
        if not request.user.has_perm("store.read_customer"):
            raise PermissionDenied

        queryset = self.get_queryset()
        abandoned_carts = queryset.filter(last_modified__gt=now() - relativedelta(days=7))
        return Response(abandoned_carts.count())


class CartOrderingFieldsViewSet(CartViewSet):
    """Adds `expected_delivery_time` to `ordering_fields` — the same field name `ordering` already sorts
    by via `F("expected_delivery_time").asc(nulls_first=True)` — and declares `nulls_ordering` so an
    explicit `?o=` request on that field keeps nulls-first placement instead of falling back to the
    database's default (plain ascending order puts nulls last)."""

    ordering_fields = [*CartViewSet.ordering_fields, "expected_delivery_time"]
    nulls_ordering = {"expected_delivery_time": "first"}


class CartOrderingFieldsNullsFlipViewSet(CartOrderingFieldsViewSet):
    """Adds `expected_delivery_time` to `nulls_ordering_flip`, so requesting that field in descending
    order flips its nulls placement from first to last, instead of keeping nulls first regardless of
    sort direction."""

    nulls_ordering_flip = ("expected_delivery_time",)


class CartOrderingFormattedNameViewSet(CartViewSet):
    """Orders by formatted_name on a model that computes it with a `get_formatted_name()` method, so
    there is no column or annotation for the database to sort by. Deliberately invalid: the
    `vueda_info.E005` system check reports it, and the model-info metadata neither advertises the
    field nor reports a default ordering built on it."""

    ordering = ["formatted_name"]
    ordering_fields = [*CartViewSet.ordering_fields, "formatted_name"]


class CartOrderingRelatedFormattedNameViewSet(CartViewSet):
    """Orders by `customer__formatted_name` — the formatted name of a *related* model rather than this
    one. Customer has no formatted_name column and reaches the value through
    `formatted_name_lookup_expression = "data__formatted_name"`, and the annotation
    `VuedaViewSet.get_queryset` adds belongs to the Cart queryset being ordered, not to the Customer
    rows it joins.

    `VuedaOrderingFilter` rewrites the term to `customer__data__formatted_name` before it reaches
    `order_by()`, so the database sorts by the column while the client sends and is told the declared
    name.

    The term is a scalar function over the path rather than the bare path, so the rewrite has to reach
    inside the expression instead of replacing it. `Lower` is used un-wrapped by any `.asc()`/`.desc()`
    — which `order_by()` accepts, sorting ascending — so this also covers a term that carries no
    direction of its own. `customer__formatted_name` is deliberately left out of `ordering_fields`:
    the only thing making it a valid explicit `?o=` target is that the default ordering names it from
    inside the function, so `ordering_fields` is left as CartViewSet declared it."""

    ordering = [Lower("customer__formatted_name")]


class CartOrderingMultiValuedFormattedNameViewSet(CartViewSet):
    """Offers formatted_name across a reverse foreign key (`cart_items__formatted_name`).

    CartItem does have a lookup expression to follow, but following it would join a row per cart item
    and silently multiply the rows a list request returns. The path is deliberately left unresolved:
    not advertised in `model_ordering`, and reported by the `vueda_info.E006` system check."""

    ordering_fields = [*CartViewSet.ordering_fields, "cart_items__formatted_name"]


class CartRelatedFormattedNameFilterViewSet(CartViewSet):
    """Swaps in a filterset whose filters query a related model's formatted_name, so the same path
    rewriting can be exercised on the filtering side."""

    filterset_class = my_filtersets.CartRelatedFormattedNameFilterSet


class CartEmptyFilterSetViewSet(CartViewSet):
    """Serves Cart with permission checks that build no queryset and a filterset that accepts nothing.

    `ObjectPermissions` calls `get_queryset` from `initial()`, before `list()` runs, so a request
    carrying an over-deep `?e=` fails there whichever names the filterset parameter-name cache holds.
    Authenticating only lets `list()` reach its own validation, where the order between rejecting an
    unrecognized parameter and building the serializer is what a test can see."""

    filterset_class = my_filtersets.EmptyCartFilterSet
    permission_classes = [permissions.IsAuthenticated]


class CartM2MSearchOrderingViewSet(CartOrderingFieldsViewSet):
    """Searches across a reverse foreign key while offering orderings only `VuedaOrderingFilter` can
    resolve, so the two backends have to agree on the terms.

    A search field reaching through `cart_items` joins a row per cart item, so
    `VuedaSearchFilterBackend` takes its `DISTINCT ON` path — the one that re-applies the ordering
    itself, alongside the distinct columns that have to match it. Both orderings offered here mean
    something different before and after `VuedaOrderingFilter` has run:
    `customer__formatted_name` is only a real path once it has been rewritten to
    `customer__data__formatted_name`, and `expected_delivery_time` only keeps the nulls-first
    placement `nulls_ordering` declares for it as the expression that filter builds. Re-deriving
    either from the raw `?o=` value in the search backend would order by a column the database
    doesn't have, or silently drop the placement."""

    search_fields = ["V:cart_items__product_option__name"]
    ordering_fields = [*CartOrderingFieldsViewSet.ordering_fields, "customer__formatted_name"]


class CartM2MSearchRelationOrderingViewSet(CartM2MSearchOrderingViewSet):
    """Offers a plain relation name on a searched list that deduplicates.

    `Customer` declares `ordering = ["user__name"]`, so Django replaces an `order_by("customer")` with
    the related model's own ordering over the joined table, while `distinct("customer")` trims the
    join back to `store_cart.customer_id`. The two cannot match, so the ordering has no column to
    pair with and such a request sorts by rank."""

    ordering_fields = [*CartM2MSearchOrderingViewSet.ordering_fields, "customer"]


class CartItemViewSet(VuedaViewSet):
    queryset = my_models.CartItem.objects.all()
    serializer_class = my_serializers.CartItemSerializer
    ordering_fields = ["product_option__name", "quantity"]
    # Two totals, one named after the column it sums and one not. `product_price` is what a client
    # asks for and what comes back; `product_option__price` is the path summed for it, and never
    # leaves the server. The pair is what makes "only the requested totals are aggregated" testable
    # -- asking for one has to leave the other out of both the response and the SQL -- and what
    # proves a response key is the declared name rather than the ORM path.
    column_totals = {"quantity": "quantity", "product_price": "product_option__price"}


class CartItemDurationColumnTotalsViewSet(CartItemViewSet):
    """Totals a DurationField reached through two forward foreign keys, the one non-numeric column
    type `Sum` still means something for. Valid, so `vueda_info.E011` has to stay quiet about it."""

    column_totals = {"delivery_time": "cart__expected_delivery_time"}


class CartItemListColumnTotalsViewSet(CartItemViewSet):
    """Still declares `column_totals` in the list-of-paths form VUEDA used before the mapping.

    Nothing fails at request time for this one -- the names simply never resolve as totals -- so
    `vueda_info.E011` is the only signal that the declaration stopped meaning anything."""

    column_totals = ["quantity"]


class CartItemUnresolvableColumnTotalsViewSet(CartItemViewSet):
    """Totals a path the model has no field for. `queryset.aggregate()` raises `FieldError`, but
    only for a request that asks for this total, and totals are opt-in -- so that may be no request
    at all until a client first tries."""

    column_totals = {"quantity": "no_such_field"}


class CartItemUnsummableColumnTotalsViewSet(CartItemViewSet):
    """Totals a CharField reached through a forward foreign key. The path resolves; the database is
    what refuses it."""

    column_totals = {"product_name": "product_option__name"}


class CartItemRelationColumnTotalsViewSet(CartItemViewSet):
    """Totals the relation itself rather than a column on the far side of it, the shape a path is
    left in when the column at the end of it is forgotten."""

    column_totals = {"product_option": "product_option"}


class CartItemWildcardColumnTotalsViewSet(CartItemViewSet):
    """Names a total after a wildcard value, which a client could only ever send to mean "every
    declared total"."""

    column_totals = {"*": "quantity"}


class CartItemBadNameColumnTotalsViewSet(CartItemViewSet):
    """Names a total something the query parameter could not carry back: it separates the names it
    carries with commas, so this one arrives as two that match nothing.

    Django has no objection to a comma in an alias, so this stands for VUEDA's half of the rule
    alone. `CartItemAliasUnsafeNameColumnTotalsViewSet` stands for Django's."""

    column_totals = {"total,quantity": "quantity"}


class CartItemAliasUnsafeNameColumnTotalsViewSet(CartItemViewSet):
    """Names a total something `aggregate()` would refuse as a column alias, for the whitespace.

    Nothing about the query parameter objects to it, so this stands for Django's half of the rule
    alone -- the half VUEDA asks Django rather than restating."""

    column_totals = {"total quantity": "quantity"}


class InvoiceReverseColumnTotalsViewSet(VuedaViewSet):
    """Totals across a reverse foreign key, which joins a row per invoice line.

    The reason `column_totals` is checked at all rather than left to fail in the database: this one
    raises nothing, ever. It returns an inflated number for itself, and inflates every other total
    computed in the same `aggregate()` call along with it."""

    queryset = my_models.Invoice.objects.all()
    serializer_class = my_serializers.InvoiceSerializer
    column_totals = {"line_amount": "invoice_lines__amount"}


class ProductManyToManyColumnTotalsViewSet(VuedaViewSet):
    """Totals across a many-to-many, which multiplies rows the same way a reverse foreign key does."""

    queryset = my_models.Product.objects.all()
    serializer_class = my_serializers.ProductSerializer
    column_totals = {"special_care_id": "special_care__id"}


class CartItemCartBaseManagerChoiceFilterViewSet(CartItemViewSet):
    """Swaps in CartItemCartBaseManagerChoiceFilterSet, whose `cart` filter's queryset bypasses
    FormattedNameManager -- see that filterset for why."""

    filterset_class = my_filtersets.CartItemCartBaseManagerChoiceFilterSet


class CartItemOrderingRelatedFormattedNameViewSet(CartItemViewSet):
    """Offers formatted_name across two relations: one that can be followed and one that can't.

    `cart__customer__formatted_name` reaches Customer, which has a lookup expression, so the path is
    rewritten to `cart__customer__data__formatted_name` and works over any number of hops.
    `cart__formatted_name` reaches Cart, which computes its formatted name with `get_formatted_name()`
    and so has no column to rewrite to. Deliberately mixed: the first is advertised and orderable, the
    second is left out of `model_ordering` and reported by the `vueda_info.E006` system check."""

    ordering_fields = ["quantity", "cart__customer__formatted_name", "cart__formatted_name"]


class CartFormattedNameMethodViewSet(VuedaViewSet):
    """Serves CartFormattedNameMethodSerializer directly, so a plain list request exercises
    VuedaViewSet.get_queryset's own annotate_formatted_name call with a get_formatted_name() model
    declaring formatted_name_select_related.

    ``queryset`` is built from ``Cart._base_manager`` rather than ``Cart.objects``
    (``FormattedNameManager``), which already applies ``formatted_name_select_related`` to every
    queryset it builds -- using it here would make a query-count test pass whether or not
    ``VuedaViewSet.get_queryset``'s own call did anything. ``_base_manager`` is a plain
    ``models.Manager`` Django provides for every model, so a queryset built from it carries no
    ``select_related`` of its own to begin with.
    """

    queryset = my_models.Cart._base_manager.all()
    serializer_class = my_serializers.CartFormattedNameMethodSerializer


class CustomerWithCartsViewSet(VuedaViewSet):
    """Serves CustomerWithCartsSerializer, expanding `cart_set` -- a to-many relation onto Cart, whose
    formatted_name is computed by get_formatted_name(). A list/retrieve request routes that expand's
    queryset through build_prefetch_plan's Prefetch queryset; an update response (which never calls
    get_queryset's prefetch plan) reaches the same relation as a plain, unfetched manager, which is
    VuedaListSerializer.to_representation's own call to annotate_formatted_name to cover."""

    queryset = my_models.Customer.objects.all()
    serializer_class = my_serializers.CustomerWithCartsSerializer
    permit_list_expands = ["cart_set"]
    permit_retrieve_expands = ["cart_set"]


class CartItemCartBaseManagerViewSet(VuedaViewSet):
    """Serves CartItemCartBaseManagerSerializer -- see that serializer for why its `cart` field's
    queryset is built from `Cart._base_manager`."""

    queryset = my_models.CartItem.objects.all()
    serializer_class = my_serializers.CartItemCartBaseManagerSerializer


class CartItemCartSlugBaseManagerViewSet(VuedaViewSet):
    """Serves CartItemCartSlugBaseManagerSerializer -- see that serializer for why its `cart` field's
    queryset is built from `Cart._base_manager`."""

    queryset = my_models.CartItem.objects.all()
    serializer_class = my_serializers.CartItemCartSlugBaseManagerSerializer


class CustomerCartsBaseManagerViewSet(VuedaViewSet):
    """Serves CustomerCartsBaseManagerSerializer -- see that serializer for why its `carts` field's
    queryset is built from `Cart._base_manager`."""

    queryset = my_models.Customer.objects.all()
    serializer_class = my_serializers.CustomerCartsBaseManagerSerializer


class CustomerOrderViewSet(HasWorkflowViewMixin, VuedaViewSet):
    queryset = my_models.CustomerOrder.objects.all()
    serializer_class = my_serializers.CustomerOrderSerializer
    filterset_class = my_filtersets.CustomerOrderFilterSet
    ordering_fields = ["order_number", "customer__user__email", "when", "order_state"]


class InventoryRecordReasonViewSet(VuedaViewSet):
    queryset = my_models.InventoryRecordReason.objects.all()
    serializer_class = my_serializers.InventoryRecordReasonSerializer
    ordering_fields = ["name"]


class InventoryRecordViewSet(VuedaViewSet):
    queryset = my_models.InventoryRecord.objects.all()
    serializer_class = my_serializers.InventoryRecordSerializer
    filterset_class = my_filtersets.InventoryRecordFilterSet
    ordering_fields = ["when", "reason", "quantity"]
    # Three totals, so "asking for one adds one SUM, not three" has somewhere to be observed, and so
    # `model_column_totals` reports a list long enough to show it keeps declaration order.
    column_totals = {"quantity": "quantity", "cost": "cost", "unit_price": "product_option__price"}


class InventoryRecordAnnotatedColumnTotalsViewSet(InventoryRecordViewSet):
    """Totals an annotation its own `get_queryset` adds, rather than a column on the model.

    The case `vueda_info.E011` cannot resolve through `_meta` and defers to the queryset for, the
    same way ordering does for a term naming an annotation.

    The annotation reaches through a foreign key on purpose. `get_column_info` aggregates a total
    over a real column on the matched rows re-selected by primary key, and an annotation cannot go
    with them -- the expressions in `query.annotations` are resolved, so their `Col` leaves name the
    original query's aliases and carrying one adds no join. An annotation over two local columns
    hides that, because the base table's alias is the same in both queries; this one compiles to SQL
    naming a table the query never joined.
    """

    column_totals = {"line_total": "line_total"}

    def get_queryset(self):
        return super().get_queryset().annotate(line_total=F("product_option__price") * F("quantity"))


class ProductM2MSearchViewSet(ProductViewSet):
    search_fields = ["V:special_care__field_that_contains_the_name"]
    # `formatted_name` is added because a test orders by it. `ProductViewSet` declares an explicit
    # `ordering_fields`, and Product's `Meta.ordering` names only "name", so without this entry
    # `?o=formatted_name` is a field DRF rejects: `remove_invalid_fields` drops it, the request falls
    # back to a default ordering the viewset doesn't declare, and nothing sorts by it.
    ordering_fields = [*ProductViewSet.ordering_fields, "formatted_name"]


class ProductM2MSearchFunctionOrderingViewSet(ProductM2MSearchViewSet):
    """Declares a default ordering that reads one column without being that column.

    `Lower("name")` compiles to `LOWER("name")` while `distinct("name")` compiles to the column, so
    the ordering has no column to pair with on a searched list that deduplicates and such a request
    sorts by rank. Reached through the default rather than through `?o=`, because a `?o=` value is a
    plain field name and never carries the function: a nonempty `?o=` that DRF rejects leaves this
    default in place while still asking the search backend for explicit-order handling."""

    ordering = [Lower("name")]


class ProductM2MSearchRelationOrderingViewSet(ProductM2MSearchViewSet):
    """Offers a plain relation name whose related model declares no ordering of its own.

    The counterpart to `CartM2MSearchRelationOrderingViewSet`: `Distributor` declares no
    `Meta.ordering`, so Django leaves an `order_by("distributor")` on the local foreign key column
    and `distinct("distributor")` reaches the same column. The two match, so this ordering pairs and
    the request sorts by it rather than by rank."""

    ordering_fields = [*ProductM2MSearchViewSet.ordering_fields, "distributor"]


class ProductM2MSearchColumnTotalsViewSet(ProductM2MSearchViewSet):
    """Totals a local column and a queryset annotation, on a viewset whose *search* reaches across a
    many-to-many.

    `vueda_info.E011` has nothing to say about either one -- `quantity` is a column on Product
    itself, and the check does not look at what an annotation computes. The join arrives from the
    search backend instead, and a `SUM` over the joined rows counts a product once per matching
    `special_care` row. So this is the half of the guarantee the check cannot cover: a single-valued
    declaration is not enough on its own.

    Both kinds are declared together because `get_column_info` protects them by different routes --
    a column by re-selecting the matched rows by primary key, an annotation by summing over a
    distinct `(pk, value)` subquery, in two `aggregate()` calls -- and a request naming both has to
    come back with both un-multiplied.
    """

    column_totals = {"quantity": "quantity", "double_quantity": "double_quantity"}

    def get_queryset(self):
        return super().get_queryset().annotate(double_quantity=F("quantity") * 2)


class DistributorMixedRankedAndWordSimilarViewSet(DistributorViewSet):
    """Mixes V: (ranked) and ~ (trigram word similar) prefixes to expose a classification bug."""

    search_fields = ["V:name", "~description"]


class PackingBoxViewSet(VuedaViewSet):
    queryset = my_models.PackingBox.objects.all()
    serializer_class = my_serializers.PackingBoxSerializer
    ordering_fields = ["name"]
    # PackingBox has no formatted_name column and reaches it through
    # `formatted_name_lookup_expression = "name"`, so this shows what a client receives for a default
    # ordering on a formatted_name that lives behind a lookup expression.
    #
    # Declared as a scalar function with an explicit direction, which `order_by()` accepts alongside
    # plain field names and `F(...)` expressions: `model_ordering` reports the field the function
    # reads ("formatted_name") and the direction the term sorts in, and `VuedaOrderingFilter` makes
    # that field an explicit `?o=` target even though `ordering_fields` only names "name".
    ordering = [Lower("formatted_name").desc()]


class InvoiceViewSet(VuedaViewSet):
    queryset = my_models.Invoice.objects.all()
    serializer_class = my_serializers.InvoiceSerializer
    ordering_fields = ["name"]


class InvoiceBaseViewSet(ModelViewSet):
    """Plain drf_writable_nested viewset — no vueda fixes applied."""

    queryset = my_models.Invoice.objects.all()
    serializer_class = my_serializers.InvoiceBaseSerializer
    permission_classes = [permissions.AllowAny]


class OrderCompositePKViewSet(VuedaViewSet):
    queryset = my_models.OrderCompositePK.objects.all()
    serializer_class = my_serializers.OrderCompositePKSerializer
    ordering_fields = ["order_number", "order_date"]


class OrderItemCompositePKViewSet(VuedaViewSet):
    queryset = my_models.OrderItemCompositePK.objects.all()
    serializer_class = my_serializers.OrderItemCompositePKSerializer
    filterset_class = my_filtersets.OrderItemCompositePKFilterSet
    ordering_fields = ["order", "product", "quantity"]

    @action(detail=False, methods=["post"], permission_classes=(), bulk=True)
    def test_action(self, request):
        return Response(status=204)


class OrderItemCompositePKOrderingPKViewSet(OrderItemCompositePKViewSet):
    """Sets `ordering` to the "pk" alias on a model whose primary key is a `CompositePrimaryKey`, to
    prove the alias expands to every field the key is built from instead of reaching the client as
    "pk", which names no field a client could order by."""

    ordering = ["pk"]


class OrderItemPKOrderedCompositePKViewSet(VuedaViewSet):
    """Declares no `ordering` of its own, so OrderItemPKOrderedCompositePK.Meta.ordering — the "pk"
    alias on a `CompositePrimaryKey` — is the default ordering DRF applies."""

    queryset = my_models.OrderItemPKOrderedCompositePK.objects.all()
    serializer_class = my_serializers.OrderItemPKOrderedCompositePKSerializer
    ordering_fields = ["order", "product", "quantity"]


class OrderItemAltCompositePKViewSet(VuedaViewSet):
    queryset = my_models.OrderItemAltCompositePK.objects.all()
    serializer_class = my_serializers.OrderItemAltCompositePKSerializer


class DistributorProxyViewSet(VuedaViewSet):
    queryset = my_models.DistributorProxy.objects.all()
    serializer_class = my_serializers.DistributorProxySerializer
    filterset_class = my_filtersets.DistributorProxyFilterSet
    ordering_fields = ["name"]
    ordering = ["name"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        if "Customer" in request.user.groups.values_list("name", flat=True):
            return frozenset()
        return super().get_allowed_extra_actions(request, instance=instance)


class NoteViewSet(VuedaViewSet):
    queryset = my_models.Note.objects.all()
    serializer_class = my_serializers.NoteSerializer
    permit_list_expands = ["content_object"]
    permit_retrieve_expands = ["content_object"]
    ordering_fields = ["content_type", "object_id"]


class AnotherNoteViewSet(VuedaViewSet):
    queryset = my_models.Note.objects.all()
    serializer_class = my_serializers.AnotherNoteSerializer
    permit_list_expands = ["content_object"]
    permit_retrieve_expands = ["content_object"]
    ordering_fields = ["content_type", "object_id"]


class NoteStaticOmitViewSet(VuedaViewSet):
    queryset = my_models.Note.objects.all()
    serializer_class = my_serializers.NoteStaticOmitSerializer
    permit_list_expands = ["content_object"]
    permit_retrieve_expands = ["content_object"]
    ordering_fields = ["content_type", "object_id"]
