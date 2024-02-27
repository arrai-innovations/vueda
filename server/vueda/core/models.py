from django.db import models


class BaseModelMeta:
    default_permissions = ("create", "read", "update", "delete", "list")


class Lookup(models.Model):
    code = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)

    class Meta:
        abstract = True

    def __str__(self):
        return f"name: {self.name}, code:{self.code}"


class ActivatableBaseModel(models.Model):
    """
    A base model for models that can be activated or deactivated.
    """

    is_active = models.BooleanField(
        "active",
        default=True,
    )

    class Meta:
        abstract = True
