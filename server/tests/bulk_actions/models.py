# Models used to exercise bulk delete, activate, and deactivate across primary key types.

import uuid

from django.db import models
from django.db.models import Q

from vueda.core.models import ActivatableBaseModel
from vueda.core.permissions import BaseRowLevelPermissions


class IntegerKeyGadget(ActivatableBaseModel):
    name = models.CharField(max_length=255)
    # A locked gadget refuses update and delete for every user, through row-level permissions.
    locked = models.BooleanField(default=False)

    formatted_name = None

    class RowLevelPermissions(BaseRowLevelPermissions):
        @classmethod
        def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
            if perm_type in ("update", "delete"):
                return not obj.locked
            return None

        @classmethod
        def check_queryset(cls, queryset, perm, user, perm_type) -> Q | bool | None:
            if perm_type in ("update", "delete"):
                return Q(locked=False)
            return None

    def __str__(self):
        return self.name


class UUIDKeyGadget(ActivatableBaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)

    formatted_name = None

    def __str__(self):
        return self.name


class StringKeyGadget(ActivatableBaseModel):
    code = models.CharField(primary_key=True, max_length=50)
    name = models.CharField(max_length=255)

    formatted_name = None

    def __str__(self):
        return self.name


class CompositeKeyGadget(ActivatableBaseModel):
    pk = models.CompositePrimaryKey("batch", "number")
    batch = models.IntegerField()
    number = models.IntegerField()
    name = models.CharField(max_length=255)

    formatted_name = None

    def __str__(self):
        return self.name
