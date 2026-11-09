# Models used to exercise bulk delete, activate, and deactivate across primary key types.

import uuid

from django.db import models
from django.db.models import Q

from vueda.core.models import ActivatableBaseModel
from vueda.core.models import VuedaModel
from vueda.core.permissions import BaseRowLevelPermissions


class IntegerKeyGadget(VuedaModel, ActivatableBaseModel):
    name = models.CharField(max_length=255)
    # A locked gadget refuses update and delete for every user, through row-level permissions.
    locked = models.BooleanField(default=False)

    class Vueda:
        class History:
            enabled = False
            reason = "A bulk action fixture; history would add an event table and triggers it never exercises."

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


class UUIDKeyGadget(VuedaModel, ActivatableBaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "A bulk action fixture; history would add an event table and triggers it never exercises."

    def __str__(self):
        return self.name


class StringKeyGadget(VuedaModel, ActivatableBaseModel):
    code = models.CharField(primary_key=True, max_length=50)
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "A bulk action fixture; history would add an event table and triggers it never exercises."

    def __str__(self):
        return self.name


class CompositeKeyGadget(VuedaModel, ActivatableBaseModel):
    pk = models.CompositePrimaryKey("batch", "number")
    batch = models.IntegerField()
    number = models.IntegerField()
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "pghistory cannot track a composite primary key."

    def __str__(self):
        return self.name
