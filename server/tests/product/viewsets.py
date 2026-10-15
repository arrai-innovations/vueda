from django.db.models import F
from django.db.models.functions import Coalesce
from django.db.models.functions import Concat
from django.db.models.functions import Length

from tests.product.filtersets import LookupFormattedNameTransformFilterSet
from tests.product.filtersets import ProductFilterSet
from tests.product.models import Product
from tests.product.models import ProductModelOrderingFormattedName
from tests.product.models import ProductModelOrderingLookupFormattedName
from tests.product.models import ProductModelOrderingPK
from tests.product.models import ProductRelease
from tests.product.serializers import ProductModelOrderingFormattedNameSerializer
from tests.product.serializers import ProductModelOrderingLookupFormattedNameSerializer
from tests.product.serializers import ProductModelOrderingPKSerializer
from tests.product.serializers import ProductPropertyFieldSerializer
from tests.product.serializers import ProductReleaseSerializer
from tests.product.serializers import ProductRenamedFieldSerializer
from tests.product.serializers import ProductSerializer
from tests.product.serializers import ProductSourceFieldSerializer
from vueda.core.viewsets import VuedaViewSet


class ProductViewSet(VuedaViewSet):
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


class ProductModelOrderingLookupFormattedNameFilterViewSet(VuedaViewSet):
    """Adds a filter on `formatted_name__lower` to ProductModelOrderingLookupFormattedName, whose
    formatted name comes from `formatted_name_lookup_expression = "label"`."""

    queryset = ProductModelOrderingLookupFormattedName.objects.all()
    serializer_class = ProductModelOrderingLookupFormattedNameSerializer
    filterset_class = LookupFormattedNameTransformFilterSet


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


class ProductReleaseTransformDefaultViewSet(VuedaViewSet):
    """Declares a default `ordering` whose terms end in transforms, and an empty `ordering_fields`.

    Django accepts both terms in `order_by()`, so the system checks pass and `model_ordering.default`
    reports them under their dotted names."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering = ["released__year", "-released__month"]
    ordering_fields = []


class ProductReleaseTransformFieldsViewSet(VuedaViewSet):
    """Offers three paths that end in transforms through `ordering_fields`: a single transform, a
    chain of two (`released__date__year`), and a key on a `JSONField` (`specs__rank`).

    The default `ordering` is `name`, so a request for `?o=released.year` can only be explained by the
    year if the rows come back in a different order."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering = ["name"]
    ordering_fields = ["released__year", "released__date__year", "specs__rank"]


class ProductReleaseMisspelledTransformViewSet(VuedaViewSet):
    """Offers `released__yaer` through `ordering_fields`. `yaer` is no transform that Django holds for
    a `DateTimeField`, so the path names nothing and `vueda_info.E006` reports it."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name", "released__yaer"]


class ProductReleaseUnrequestableTransformNullsViewSet(VuedaViewSet):
    """Declares a nulls placement on `released__year`, which `ordering_fields` and the default
    ordering leave out. The path resolves, so `vueda_info.E007` hints to add it to `ordering_fields`
    rather than saying that the model has no such field."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name"]
    nulls_ordering = {"released__year": "first"}


class ProductReleaseAnnotationTransformViewSet(VuedaViewSet):
    """Offers `launched__year` through `ordering_fields`, where `launched` is an annotation that
    `get_queryset` adds rather than a model field.

    Django resolves the first segment against the annotations and applies `year` to the annotation
    as a transform, so the ordering works, and the checks and the metadata resolve it the same way."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering = ["name"]
    ordering_fields = ["launched__year"]

    def get_queryset(self):
        return super().get_queryset().annotate(launched=F("released"))


class ProductReleaseAnnotationDefaultViewSet(VuedaViewSet):
    """Declares a default `ordering` of `-launched__year` and `name_length`, where both `launched` and
    `name_length` are annotations that `get_queryset` adds, and an empty `ordering_fields`.

    `model_ordering` reports both in `default`, with their directions, and in `fields`, typed from
    the annotations: the year as a number, and the length as a number."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering = ["-launched__year", "name_length"]
    ordering_fields = []

    def get_queryset(self):
        return super().get_queryset().annotate(launched=F("released"), name_length=Length("name"))


class ProductReleaseAnnotationTransformTotalViewSet(VuedaViewSet):
    """Declares a total of `launched__year`, a transform on an annotation that `get_queryset` adds.

    The total annotates `launched__year` under a generated name, selects it once per row, and sums
    it, so each release adds its year. A year makes a meaningless total, but the check judges only
    the output type, and an integer can be summed."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    column_totals = {"launch_year": "launched__year"}

    def get_queryset(self):
        return super().get_queryset().annotate(launched=F("released"))


class ProductReleaseMisspelledAnnotationTransformTotalViewSet(VuedaViewSet):
    """Declares a total of `launched__yaer`. `yaer` is no transform that Django holds for the
    date/time annotation, so `vueda_info.E013` names the misspelled transform."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    column_totals = {"launch_year": "launched__yaer"}

    def get_queryset(self):
        return super().get_queryset().annotate(launched=F("released"))


class ProductReleaseAliasTransformViewSet(VuedaViewSet):
    """Offers `launched` and `launched__year`, where `launched` comes from `.alias()` rather than
    `.annotate()`.

    A plain string `order_by("launched__year")` raises `FieldError`, because Django resolves a
    transform in a string only against the selected annotations. `VuedaOrderingFilter` orders by the
    path through `F("launched__year")` instead, which resolves against every annotation, so both
    entries work and the checks accept both."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["launched", "launched__year"]

    def get_queryset(self):
        return super().get_queryset().alias(launched=F("released"))


class ProductReleaseAliasTransformTotalViewSet(VuedaViewSet):
    """Declares a total of `launched__year` and a total of `name_length`, where both `launched` and
    `name_length` come from `.alias()`.

    `values()` refuses to select an alias, so both totals are summed through a generated
    annotation, `F("launched__year")` and `F("name_length")`. Django resolves those against every
    annotation, aliases included, so both totals work and `vueda_info.E013` accepts them."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    column_totals = {"launch_year": "launched__year", "name_length": "name_length"}

    def get_queryset(self):
        return super().get_queryset().alias(launched=F("released"), name_length=Length("name"))


class ProductReleaseUntypedAnnotationTotalViewSet(VuedaViewSet):
    """Declares a total of `launched__year`, where `launched` is a `Coalesce` over a date/time and a
    string with no `output_field`.

    Django can't determine the annotation's type, so it can't look up any transform for it.
    `vueda_info.E013` says that, rather than blaming the transform's spelling."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    column_totals = {"launch_year": "launched__year"}

    def get_queryset(self):
        return super().get_queryset().annotate(launched=Coalesce("released", "name"))


class ProductReleaseDottedJSONKeyViewSet(VuedaViewSet):
    """Offers `specs__v1.2` and `specs__a,b`, keys on a `JSONField` whose names contain a dot and a
    comma.

    The query can sort by either, but no client can request them. The dotted name `specs.v1.2` reads
    back as `specs__v1__2`, and DRF splits `specs.a,b` into two terms. `vueda_info.E006` reports both,
    and `model_ordering` leaves both out."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name", "specs__v1.2", "specs__a,b"]


class ProductReleaseDottedAnnotationViewSet(VuedaViewSet):
    """Offers `v1.2`, an annotation whose name contains a dot. `annotate()` accepts it when the name
    is passed through `**kwargs`, and the query sorts by it.

    A client sends dotted names, though, so `?o=v1.2` reads back as `v1__2`, and no request can name
    this annotation. `vueda_info.E006` reports it, and `model_ordering` leaves it out."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name", "v1.2"]

    def get_queryset(self):
        return super().get_queryset().annotate(**{"v1.2": F("name")})


class ProductReleaseDottedNullsOrderingViewSet(VuedaViewSet):
    """Keys a nulls placement on `specs__v1.2`, a key on a `JSONField` whose name contains a dot, and
    leaves it out of `ordering_fields`.

    Adding it to `ordering_fields` wouldn't help, because no `?o=` request can name a dotted key, so
    the `vueda_info.E007` hint says to annotate the value under a plain name instead."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name"]
    nulls_ordering = {"specs__v1.2": "last"}


class ProductReleaseJSONPKKeyViewSet(VuedaViewSet):
    """Offers `specs__pk`, a key named `pk` on a `JSONField`.

    A trailing `pk` is usually the primary key alias, but `specs` is not a relation, so here it is a
    key transform that Django orders by."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["specs__pk"]


class ProductReleaseFunctionLookupViewSet(VuedaViewSet):
    """Offers `name__left`. The tests register `Left` on `CharField` under the name `left`.

    `Left` is a database function rather than a `Transform`, so Django's lookup registry holds it but
    never hands it out as a transform, and `order_by("name__left")` fails with a `FieldError`.
    `vueda_info.E006` reports the path with that error."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name", "name__left"]


class ProductReleaseTwoArgumentTransformViewSet(VuedaViewSet):
    """Offers `name__twoarg`. The tests register a `Transform` subclass under that name that needs two
    arguments, which a path can't give it.

    Django raises `TypeError` for it when a query orders by the path, and the check run raises the
    same `TypeError`, so the error points at the broken transform."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    ordering_fields = ["name__twoarg"]


class ProductReleaseJSONKeyTotalViewSet(VuedaViewSet):
    """Declares a total of `specs__rank`, a key on a `JSONField`.

    The key resolves, but its output is JSON rather than a number, so `vueda_info.E013` reports that
    it cannot be summed."""

    queryset = ProductRelease.objects.all()
    serializer_class = ProductReleaseSerializer
    column_totals = {"rank": "specs__rank"}


class ProductModelOrderingLookupFormattedNameTransformViewSet(VuedaViewSet):
    """Offers `formatted_name__lower` through `ordering_fields`, on a model that reaches
    `formatted_name` through `formatted_name_lookup_expression = "label"`.

    Django has no `lower` transform until a project registers one, so the tests register `Lower` on
    `CharField` around each request. The default `ordering` is `id`, so the rows come back in a
    different order unless the request sorts by the transformed name."""

    queryset = ProductModelOrderingLookupFormattedName.objects.all()
    serializer_class = ProductModelOrderingLookupFormattedNameSerializer
    ordering = ["id"]
    ordering_fields = ["formatted_name__lower"]


class ProductModelOrderingWhitelistViewSet(ProductViewSet):
    """Declares `ordering_fields` and no `ordering`, so the default ordering is Product.Meta.ordering
    ("name") — a field `ordering_fields` doesn't name.

    Which declaration supplements the `?o=` whitelist is the question here. The model's is the
    default ordering DRF applies, so the field it names has to be an explicit target too, and the
    field `ordering_fields` names stays available alongside it."""

    ordering_fields = ["available_for_sale"]


class ProductOrderingAnnotationDefaultViewSet(ProductViewSet):
    """Orders by default on a queryset annotation that the viewset's own `get_queryset` adds, with an
    empty `ordering_fields` so nothing else offers it.

    `name_length` is an integer, unlike the column it is computed from, so the type `model_ordering`
    reports for it shows that the annotation's own output field types it."""

    ordering = ["-name_length"]
    ordering_fields = []

    def get_queryset(self):
        return super().get_queryset().annotate(name_length=Length("name"))


class ProductOrderingManagerAnnotationDefaultViewSet(ProductViewSet):
    """Orders by default on `reversed_name`, the annotation that `ProductManager` adds before the
    viewset's `get_queryset` runs, to show that an annotation from a manager is reported as readily as
    one that the viewset adds."""

    ordering = ["reversed_name"]
    ordering_fields = []


class ProductOrderingFieldAndAnnotationDefaultViewSet(ProductViewSet):
    """Orders by default on a model field and then on a queryset annotation, to show that both terms
    are reported in their declared order with their own directions."""

    ordering = ["available_for_sale", "-name_length"]
    ordering_fields = []

    def get_queryset(self):
        return super().get_queryset().annotate(name_length=Length("name"))


class ProductOrderingAnnotationAndUnresolvableDefaultViewSet(ProductViewSet):
    """Orders by default on a queryset annotation and then on a name that is neither a field nor an
    annotation. The stale name still drops the whole default, although the annotation resolves."""

    ordering = ["-name_length", "no_such_field"]

    def get_queryset(self):
        return super().get_queryset().annotate(name_length=Length("name"))


class ProductOrderingAnnotationMultiColumnDefaultViewSet(ProductViewSet):
    """Orders by default on one term that reads a model field and a queryset annotation
    (`Concat("name", "reversed_name")`), with an empty `ordering_fields`.

    The term has no single name that stands for its sort, so the default is dropped. Each name that it
    reads is still a valid `?o=` target, so each is still advertised, the annotation included."""

    ordering = [Concat("name", "reversed_name")]
    ordering_fields = []
