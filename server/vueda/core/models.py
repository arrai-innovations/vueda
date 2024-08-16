from django.db import models


class BaseModelMeta:
    default_permissions = ("create", "read", "update", "delete", "list")


class Lookup(models.Model):
    code = models.CharField(max_length=255, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    formatted_name = models.GeneratedField(
        expression=models.F("name"),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta:
        abstract = True

    def __str__(self):
        return f"name: {self.name}, code:{self.code}"


class VuedaBaseModel(models.Model):
    formatted_name = models.GeneratedField(
        expression=models.F("name"),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta:
        abstract = True


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
