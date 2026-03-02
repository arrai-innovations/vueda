"""Abstract model bases with CRUDL permissions, singleton support, and email templates."""

__all__ = (
    "ActivatableBaseModel",
    "BaseModelMeta",
    "EmailTemplateBase",
    "Lookup",
    "SingletonModel",
    "VuedaModel",
)

from django.contrib.postgres.fields import ArrayField
from django.db import models


class BaseModelMeta:
    """Default Django ``Meta`` base that replaces Django's add/change/view/delete permissions with CRUDL names."""

    default_permissions = ("create", "read", "update", "delete", "list")


class Lookup(models.Model):
    """
    Abstract base for code/name lookup tables. Provides ``code`` (unique identifier),
    ``name`` (display label), and a generated ``formatted_name`` field for consistent
    display across the API.
    """

    code = models.CharField(max_length=255, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    formatted_name = models.GeneratedField(
        expression=models.F("name"),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        abstract = True

    def __str__(self):
        return f"name: {self.name}, code:{self.code}"


class VuedaModel(models.Model):
    """
    Abstract base model for all VUEDA domain models. Adds a ``formatted_name``
    generated field (defaults to ``name``) used by the API for consistent display.
    Subclasses should override ``formatted_name_lookup_expression`` to change the source field.
    """

    formatted_name = models.GeneratedField(
        expression=models.F("name"),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
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


class SingletonModel(VuedaModel):
    """
    Abstract model that enforces at most one row per subclass. Saving any instance
    deletes all other rows and forces ``id=1``. Use ``load()`` to retrieve or
    instantiate the single record.
    """

    class Meta(BaseModelMeta):
        abstract = True

    def save(self, *args, **kwargs):
        """Delete all other rows and force ``id=1`` before saving."""
        self.__class__.objects.exclude(id=self.id).delete()
        self.id = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "SingletonModel":
        """Return the single instance, or an unsaved default instance if none exists."""
        try:
            return cls.objects.get()
        except cls.DoesNotExist:
            return cls()


class EmailTemplateBase(VuedaModel):
    """
    Abstract base for editable email templates. Stores subject, plain-text body,
    sender address, default BCC addresses, and a ``preview_tag_data`` JSON blob
    used to render the template preview in the admin UI.
    """

    subject = models.CharField(max_length=255)
    body = models.TextField()
    from_email = models.EmailField(max_length=255)
    bcc_email = ArrayField(models.EmailField(), default=list, verbose_name="Default bcc address(es)")
    preview_tag_data = models.JSONField(default=dict, help_text="Data used to render the preview tag in emails")

    class Meta(BaseModelMeta):
        abstract = True
