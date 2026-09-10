from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.db.models.functions import Reverse

from vueda.core.models import FormattedNameManager
from vueda.core.models import VuedaModel
from vueda.core.permissions import BaseRowLevelPermissions


class ProductManager(FormattedNameManager):
    """Puts `reversed_name` on every Product queryset, before any viewset touches it.

    A fixture for the one thing only a manager can demonstrate: `ordering_fields = "__all__"`
    resolves against `queryset.query.annotations`, so it has to pick up an annotation the *model's*
    default manager added as readily as one a viewset's `get_queryset` added. VUEDA carried such an
    annotation of its own until `object_revision` replaced it and moved to
    `VuedaViewSet.get_queryset`, which left nothing exercising the manager half of that behaviour.

    Inherits `FormattedNameManager` rather than `models.Manager` because a VUEDA model that declares
    its own `objects` shadows the default manager and takes the `formatted_name` annotation with it —
    the mistake `vueda_info.E009` reports, and the reason the inheritance is documented on
    `FormattedNameManager` itself.

    `reverse()` reads one column and needs no join or subquery, so the annotation costs nothing on
    the other Product tests it now rides along on. It also sorts the ordering fixtures into an order
    nothing else in those tests produces — "Banana", "Apple", "Cherry", against `name`'s "Apple",
    "Banana", "Cherry", `-name`'s reverse of that, and insertion order's "Cherry", "Apple",
    "Banana" — so an assertion on that order can only be explained by the annotation.
    """

    def get_queryset(self):
        return super().get_queryset().annotate(reversed_name=Reverse("name"))


class Product(VuedaModel):
    name = models.CharField(max_length=255)
    available_for_sale = models.BooleanField(db_default=True)
    buzz_words = ArrayField(models.CharField(max_length=255, blank=True), null=True)

    objects = ProductManager()

    class Meta(VuedaModel.Meta):
        default_related_name = "products"
        ordering = ["name"]
        permissions = [("manage_product", "Can manage products"), ("purchase_product", "Can purchase products")]

    class RowLevelPermissions(BaseRowLevelPermissions):
        @classmethod
        def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
            """
            True if the user has the permission, False if the user does not have the permission, None if the check is not
            applicable due to there being no row level permissions for the model.
            """
            if user.is_superuser:
                return None

            elif user.has_perm("product.purchase_product"):
                return obj.available_for_sale

            elif user.has_perm("product.manage_product"):
                return True

            return False

        @classmethod
        def check_queryset(cls, queryset, perm, user, perm_type) -> Q | bool | None:
            """
            Return of None means do not filter based on row level permissions.
            Return of True means the user has the permission without needing to check the rows.
            Return of False means the user does not have the permission, and we can stop checking.
            Return of Q means we need to filter the rows based on the row level permissions.
            """
            if user.is_superuser:
                return None

            elif user.has_perm("product.purchase_product"):
                return Q(available_for_sale=True)

            elif user.has_perm("product.manage_product"):
                return True

            return False

    def __str__(self):
        return self.name

    @property
    def computed_title(self):
        """A plain Python property (no underlying column), so ordering tests can prove DRF excludes
        serializer fields sourced from model properties when resolving default ordering fields."""
        return self.name


class ProductModelOrderingLookupFormattedName(VuedaModel):
    """Declares formatted_name as the model's own default ordering, on a model that has no
    formatted_name column and reaches the value through `formatted_name_lookup_expression` instead.
    `FormattedNameManager` annotates that expression onto every queryset the model builds under the
    name `formatted_name`, so the database sorts the annotation — which is what lets a `Meta.ordering`
    naming it work on any queryset, not just the ones a viewset builds.

    Declared as the plain string "formatted_name", which is what `FormattedNameBaseModel._check_ordering`
    makes possible: Django's `models.E015` resolves `Meta.ordering` names against the model's own
    fields, where the annotation doesn't exist yet, and would reject it.

    `label` rather than `name` is the source column, so a test asserting rows came back in
    formatted_name order can't be explained by ordering on a field that merely shares the name.

    `base_manager_name = "objects"` points Django's base manager at `FormattedNameManager` too.
    Without it the base manager is a plain `models.Manager` carrying no annotation, and any
    base-manager queryset built on this model raises `FieldError` the moment the ordering compiles.
    `vueda_core.E017` reports a model in that position.
    """

    label = models.CharField(max_length=255)

    formatted_name = None
    formatted_name_lookup_expression = "label"

    class Vueda:
        class History:
            enabled = False
            reason = "An ordering fixture; history would add an event table and triggers it never exercises."

    class Meta(VuedaModel.Meta):
        ordering = ["formatted_name"]
        base_manager_name = "objects"

    def __str__(self):
        return self.label


class ProductModelOrderingFormattedName(VuedaModel):
    """Declares formatted_name as the model's own `Meta.ordering`.

    VuedaModel gives it a `formatted_name` generated-field column, so Django resolves the term like
    any other field and no check has to make room for it — unlike
    ProductModelOrderingLookupFormattedName, which declares the same ordering over an annotation.
    The third strategy, a `get_formatted_name()` method, still can't be named here: nothing gives the
    database a value to sort, so `models.E015` rejects it and `vueda_info.E005` says why.
    """

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "An ordering fixture; history would add an event table and triggers it never exercises."

    class Meta(VuedaModel.Meta):
        ordering = ["formatted_name"]

    def __str__(self):
        return self.name


class ProductModelOrderingPK(VuedaModel):
    """Declares the "pk" alias as the model's own `Meta.ordering`, so ordering tests have a model
    Django itself loaded that way rather than one with a patched `Meta.ordering`."""

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "An ordering fixture; history would add an event table and triggers it never exercises."

    class Meta(VuedaModel.Meta):
        ordering = ["pk"]

    def __str__(self):
        return self.name


class ProductCascadeOwner(VuedaModel):
    """Parent of the cascade-delete regression fixture. Deleting one of these collects the
    `ProductCascadeOrderedByFormattedName` rows pointing at it, which is where a base manager that
    can't resolve `Meta.ordering` fails."""

    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "A cascade fixture; history would add an event table and triggers it never exercises."

    def __str__(self):
        return self.name


class AnnotatingBaseManagerModel(VuedaModel):
    """Abstract base that selects the annotating manager as the base manager for its subclasses.

    `Meta.base_manager_name` is an ordinary Meta option, so a concrete model whose `Meta` inherits
    this one is selecting `objects` as readily as if it had written the line itself. That is the
    inheritance `vueda_core.E017` has to honour: it reads `Model._base_manager`, which Django
    resolves from the inherited option, rather than looking for a literal declaration on the model.
    """

    class Meta(VuedaModel.Meta):
        abstract = True
        base_manager_name = "objects"


class ProductCascadeOrderedByFormattedName(AnnotatingBaseManagerModel):
    """The model a cascade delete collects: no formatted_name column, the value reached through
    `formatted_name_lookup_expression`, and `Meta.ordering` naming the annotation.

    `Collector.related_objects` builds its queryset from `_base_manager`, and `Collector.collect`
    evaluates it whenever `can_fast_delete` returned False. That queryset carries this
    `Meta.ordering`, so the base manager has to be able to resolve `formatted_name` or the delete
    raises `FieldError`. The `base_manager_name` inherited from `AnnotatingBaseManagerModel.Meta` is
    what supplies it; `vueda_core.E017` reports the same model without it.

    Nothing registers this model with a serializer or a viewset, so it is also what shows the check
    reaching a model VUEDA's registry has never heard of.

    `label` rather than `name` is the source column, for the same reason
    `ProductModelOrderingLookupFormattedName` uses it: an assertion about formatted_name order can't
    be explained by a field that merely shares the name.
    """

    owner = models.ForeignKey(ProductCascadeOwner, on_delete=models.CASCADE, related_name="ordered_rows")
    label = models.CharField(max_length=255)

    formatted_name = None
    formatted_name_lookup_expression = "label"

    class Vueda:
        class History:
            enabled = False
            reason = "A cascade fixture; history would add an event table and triggers it never exercises."

    class Meta(AnnotatingBaseManagerModel.Meta):
        ordering = ["formatted_name"]

    def __str__(self):
        return self.label


class ProductCascadeOrderedNote(VuedaModel):
    """What keeps the cascade off Django's fast-delete path.

    `Collector.can_fast_delete` refuses a model that anything else cascades from, so this foreign key
    is the whole reason for the model: without it Django deletes the
    `ProductCascadeOrderedByFormattedName` rows with a single query that never evaluates the
    collected queryset, and the ordering never compiles. A delete signal receiver would do the same
    job, but a receiver connected at import time is global to the suite while a table nothing else
    touches is inert.
    """

    ordered_row = models.ForeignKey(
        ProductCascadeOrderedByFormattedName, on_delete=models.CASCADE, related_name="notes"
    )
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "A cascade fixture; history would add an event table and triggers it never exercises."

    def __str__(self):
        return self.name
