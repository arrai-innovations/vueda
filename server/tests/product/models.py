from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q

from vueda.core.models import VuedaModel
from vueda.core.permissions import BaseRowLevelPermissions
from vueda.history.models import VuedaHistoryModel


class Product(VuedaHistoryModel):
    name = models.CharField(max_length=255)
    available_for_sale = models.BooleanField(db_default=True)
    buzz_words = ArrayField(models.CharField(max_length=255, blank=True), null=True)

    class Meta(VuedaHistoryModel.Meta):
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
    """

    label = models.CharField(max_length=255)

    formatted_name = None
    formatted_name_lookup_expression = "label"

    class Meta(VuedaModel.Meta):
        ordering = ["formatted_name"]

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

    class Meta(VuedaModel.Meta):
        ordering = ["formatted_name"]

    def __str__(self):
        return self.name


class ProductModelOrderingPK(VuedaModel):
    """Declares the "pk" alias as the model's own `Meta.ordering`, so ordering tests have a model
    Django itself loaded that way rather than one with a patched `Meta.ordering`."""

    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        ordering = ["pk"]

    def __str__(self):
        return self.name
