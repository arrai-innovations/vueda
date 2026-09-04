from django.db.models import F
from django.db.models.functions import Coalesce

from tests.product.filtersets import ProductFilterSet
from tests.product.models import Product
from tests.product.models import ProductModelOrderingFormattedName
from tests.product.models import ProductModelOrderingLookupFormattedName
from tests.product.models import ProductModelOrderingPK
from tests.product.serializers import ProductModelOrderingFormattedNameSerializer
from tests.product.serializers import ProductModelOrderingLookupFormattedNameSerializer
from tests.product.serializers import ProductModelOrderingPKSerializer
from tests.product.serializers import ProductPropertyFieldSerializer
from tests.product.serializers import ProductRenamedFieldSerializer
from tests.product.serializers import ProductSerializer
from tests.product.serializers import ProductSourceFieldSerializer
from vueda.core.viewsets import VuedaViewSet
from vueda.history.viewsets import VuedaHistoryViewSet


class ProductViewSet(VuedaHistoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilterSet


class ProductOrderingViewSet(ProductViewSet):
    """Adds a viewset `ordering` that differs from Product.Meta.ordering, to prove viewset ordering wins."""

    ordering = ["-name"]


class ProductOrderingStringViewSet(ProductViewSet):
    """Sets the viewset's `ordering` as a bare string instead of a list/tuple, which DRF's own
    OrderingFilter also allows, to prove the model-info metadata handles it without iterating the
    string character by character."""

    ordering = "-name"


class ProductOrderingPKViewSet(ProductViewSet):
    """Sets the viewset's `ordering` to the "pk" alias instead of a real field name, which Django's
    own query machinery resolves for itself, to prove the model-info metadata reports the field the
    alias stands for rather than dropping it or passing "pk" on to the client."""

    ordering = ["pk"]


class ProductOrderingPartialPKViewSet(ProductViewSet):
    """Mixes a real field name with the "pk" alias in the viewset's `ordering`, to prove the alias is
    expanded in place and the rest of the default ordering keeps its declared position."""

    ordering = ["-name", "pk"]


class ProductModelOrderingPKViewSet(VuedaViewSet):
    """Declares no `ordering` of its own, so ProductModelOrderingPK.Meta.ordering — the "pk" alias —
    is the default ordering DRF applies, to prove the alias is expanded the same way whether it is
    declared on the viewset or on the model."""

    queryset = ProductModelOrderingPK.objects.all()
    serializer_class = ProductModelOrderingPKSerializer


class ProductModelOrderingLookupFormattedNameViewSet(VuedaViewSet):
    """Declares no `ordering` of its own, so ProductModelOrderingLookupFormattedName's own
    `Meta.ordering` — "formatted_name" on a model with no such column — is the default ordering DRF
    applies, against the annotation `VuedaViewSet.get_queryset` adds."""

    queryset = ProductModelOrderingLookupFormattedName.objects.all()
    serializer_class = ProductModelOrderingLookupFormattedNameSerializer


class ProductModelOrderingFormattedNameViewSet(VuedaViewSet):
    """Declares no `ordering` of its own, so ProductModelOrderingFormattedName.Meta.ordering — its
    formatted_name column — is the default ordering DRF applies."""

    queryset = ProductModelOrderingFormattedName.objects.all()
    serializer_class = ProductModelOrderingFormattedNameSerializer


class ProductOrderingUnresolvableViewSet(ProductViewSet):
    """Names a field the model doesn't have in the viewset's `ordering`, to prove a default ordering
    that can't be fully resolved is dropped whole instead of being reported as the part of it that
    did resolve."""

    ordering = ["-name", "no_such_field"]


class ProductOrderingFieldsUnresolvableViewSet(ProductViewSet):
    """Names a field the model doesn't have in the viewset's `ordering_fields`, to prove the entry is
    left out of the fields offered to clients — which couldn't order by it — while the rest of the
    declaration, and the default ordering, survive. The `vueda_info.E006` system check is what reports
    the declaration itself (see tests/unit/info/test_checks.py)."""

    ordering_fields = ["name", "no_such_field"]


class ProductOrderingFieldsViewSet(ProductOrderingViewSet):
    """Adds `ordering_fields` on top of viewset `ordering`, to test whether it changes the default order."""

    ordering_fields = ["name"]


class ProductOrderingMultiFieldDefaultViewSet(ProductViewSet):
    """`ordering` declares two default fields and `ordering_fields` is empty, so neither field is
    otherwise whitelisted. Proves VuedaOrderingFilter treats every field named in a multi-field
    default as a valid explicit `?o=` target on its own, not just the first."""

    ordering = ["-name", "available_for_sale"]
    ordering_fields = []


class ProductOrderingScalarFunctionMultiFieldViewSet(ProductViewSet):
    """`ordering` is a single scalar-function term that reads two columns
    (`Coalesce("name", "formatted_name")`), with an empty `ordering_fields` so nothing else
    whitelists either one.

    Proves the two halves of how a multi-field term is treated. `VuedaOrderingFilter` makes every
    field the term references an explicit `?o=` target, so both "name" and "formatted_name" are
    requestable. `model_ordering` reports no default ordering at all, because there is no single
    field name that stands for the sort the expression performs — listing both would tell the client
    the rows arrive sorted by one and then the other, which is not what `Coalesce` does."""

    ordering = [Coalesce("name", "formatted_name")]
    ordering_fields = []


class ProductOrderingSingleDefaultPlusFieldViewSet(ProductViewSet):
    """`ordering` declares one default field, distinct from the one field `ordering_fields`
    whitelists, to test the merge between a single default field and an explicitly-declared
    ordering field."""

    ordering = ["-name"]
    ordering_fields = ["available_for_sale"]


class ProductOrderingAllFieldsViewSet(ProductOrderingViewSet):
    """Sets `ordering_fields = "__all__"` and swaps in a serializer where Product.name is exposed as
    `title`, to prove `__all__` resolves against the model's own field names, not the serializer's."""

    serializer_class = ProductRenamedFieldSerializer
    ordering_fields = "__all__"

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(title=F("name"))
        return queryset


class ProductOrderingDefaultFieldsViewSet(ProductOrderingViewSet):
    """Declares neither `ordering_fields` nor `ordering_fields = "__all__"`, and swaps in a serializer
    where Product.title is exposed as `name` through a queryset annotate, to prove DRF's default
    (any readable serializer field) resolves."""

    serializer_class = ProductRenamedFieldSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(title=F("name"))
        return queryset


class ProductOrderingSourceFieldViewSet(ProductOrderingViewSet):
    """Declares neither `ordering_fields` nor `ordering_fields = "__all__"`, and swaps in a serializer
    where Product.name is exposed as `title` via an explicit `source="name"`, with no matching queryset
    annotation, to prove DRF's default resolution keys valid ordering fields by source, not by the
    serializer's exposed field name."""

    serializer_class = ProductSourceFieldSerializer


class ProductOrderingPropertyFieldViewSet(ProductOrderingViewSet):
    """Declares neither `ordering_fields` nor `ordering_fields = "__all__"`, and swaps in a serializer
    where a model property (Product.computed_title) is exposed as `title`, to prove DRF's default
    resolution excludes serializer fields sourced from model properties."""

    serializer_class = ProductPropertyFieldSerializer


class ProductOrderingFieldsNoneViewSet(ProductOrderingViewSet):
    """Spells out `ordering_fields = None`, which is `OrderingFilter`'s own class default and DRF
    reads as "not declared" rather than "no ordering fields" — `get_valid_fields` falls through to
    `get_default_valid_fields` for it. Proves the metadata reaches the same branch as a viewset that
    omits the attribute, instead of treating `None` as something to iterate."""

    ordering_fields = None


class ProductOrderingPKRestrictedFieldsViewSet(ProductViewSet):
    """`ordering = ["pk"]` with an `ordering_fields` that names neither the alias nor the field behind
    it, so nothing but the default ordering can make either requestable.

    Proves both spellings survive `remove_invalid_fields`: "id", which is what `model_ordering`
    advertises and therefore what a metadata-driven client sends, and "pk", which a reader of the
    viewset's source might send instead."""

    ordering = ["pk"]
    ordering_fields = ["available_for_sale"]


class ProductOrderingPKInFieldsViewSet(ProductViewSet):
    """Names the "pk" alias in `ordering_fields` instead of in `ordering`, with a default `ordering`
    that names neither the alias nor the field behind it.

    `model_ordering` expands the alias wherever it is declared, so it advertises "id" here just as it
    does for a `"pk"` default — and here the default ordering can't be what makes "id" requestable,
    so `ordering_fields` has to be. Proves the expansion isn't tied to the default ordering."""

    ordering = ["-name"]
    ordering_fields = ["pk", "available_for_sale"]


class ProductOrderingAnnotationFieldViewSet(ProductOrderingViewSet):
    """Names a queryset annotation outright in `ordering_fields`, rather than reaching it through
    `ordering_fields = "__all__"`.

    DRF accepts `?o=title` for it, so `model_ordering` has to advertise it: an annotation resolves to
    no model field path, so without being collected as an annotation it would be dropped from the
    metadata and left orderable but invisible to every client."""

    ordering_fields = ["name", "title"]

    def get_queryset(self):
        return super().get_queryset().annotate(title=F("name"))


class ProductOrderingLabelledFieldsViewSet(ProductOrderingViewSet):
    """Mixes DRF's two permitted `ordering_fields` entry shapes: a plain field name, a
    `(field_name, label)` pair naming a model field, and a pair naming a queryset annotation.

    `OrderingFilter.get_valid_fields` normalizes a string entry to `(item, item)` and passes anything
    else through as it stands, then `remove_invalid_fields` compares `?o=` against the first element
    only — so a pair offers exactly the same field a plain name does, and the label captions DRF's
    own browsable-API control rather than reaching a client.

    Proves `model_ordering` reads the field name off a pair instead of dropping the entry, which
    would leave the field orderable through `?o=` but absent from the metadata, and that the label
    itself is never reported."""

    ordering_fields = ["available_for_sale", ("name", "Product Name"), ("title", "Title")]

    def get_queryset(self):
        return super().get_queryset().annotate(title=F("name"))


class ProductOrderingUnreadableFieldsEntryViewSet(ProductOrderingViewSet):
    """Mixes a real entry with one DRF itself can read no field name from — an `ordering_fields`
    entry that is neither a string nor something with a string first element.

    Such an entry offers nothing: DRF's `remove_invalid_fields` raises on it the moment any `?o=`
    arrives. Proves model-info drops it and keeps reporting the rest, rather than raising the same
    way and taking the metadata endpoint down with a declaration it only has to describe."""

    ordering_fields = ["name", 7]
