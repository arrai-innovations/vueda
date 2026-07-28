from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q

from vueda.core.permissions import BaseRowLevelPermissions
from vueda.history.models import VuedaHistoryModel


class Product(VuedaHistoryModel):
    name = models.CharField(max_length=255)
    available_for_sale = models.BooleanField(db_default=True)
    buzz_words = ArrayField(models.CharField(max_length=255, blank=True), null=True)

    class Meta(VuedaHistoryModel.Meta):
        default_related_name = "products"
        ordering = ["name"]

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
