"""Abstract model bases with CRUDL permissions, singleton support, and email templates."""

__all__ = (
    "ActivatableBaseModel",
    "BaseModelMeta",
    "EmailTemplateBase",
    "FormattedNameBaseModel",
    "Lookup",
    "SingletonModel",
    "VuedaModel",
    "annotate_formatted_name",
    "apply_vueda_feature_policy",
    "supports_vueda_feature_policy",
)

import django
from django.contrib.admin.utils import lookup_field
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.signals import class_prepared

from vueda.core.options import failed_sections
from vueda.core.options import resolve_vueda_options


class BaseModelMeta:
    """Default Django ``Meta`` base that replaces Django's add/change/view/delete permissions with CRUDL names."""

    default_permissions = ("create", "read", "update", "delete", "list")


class FormattedNameBaseModel(models.Model):
    """Shared base of every VUEDA model base, and the set that carries ``class Vueda`` policy.

    ``VuedaModel`` and ``Lookup`` are siblings rather than parent and child, so feature policy keys
    off this base to reach both.
    """

    formatted_name = models.GeneratedField(
        expression=models.F("name"),
        output_field=models.CharField(),
        db_persist=True,
    )

    class Meta(BaseModelMeta):
        abstract = True

    def _get_formatted_name(self):
        formatted_name = self.formatted_name
        if formatted_name is None:
            get_formatted_name = getattr(self, "get_formatted_name", None)
            if callable(get_formatted_name):
                formatted_name = get_formatted_name()

            else:
                formatted_name_lookup_expression = getattr(self._meta.model, "formatted_name_lookup_expression", None)
                if isinstance(formatted_name_lookup_expression, str):
                    _, _, formatted_name = lookup_field(formatted_name_lookup_expression, self)

        return formatted_name or None

    @classmethod
    def _has_formatted_name_field(cls):
        # The system check validates that formatted_name_lookup_expression is a string.
        return getattr(cls, "formatted_name_lookup_expression", None) or callable(
            getattr(cls, "get_formatted_name", None)
        )


def annotate_formatted_name(queryset):
    """
    Annotate ``formatted_name`` on ``queryset`` from the model's ``formatted_name_lookup_expression``,
    when it declares one. A no-op for a model without one.

    Shared by ``VuedaViewSet.get_queryset`` (the root queryset), ``VuedaListSerializer.to_representation``
    (a "many" expand fetched through a related manager), and the prefetch-plan builder in
    ``vueda.core.viewsets`` (a "many" expand's ``Prefetch`` queryset), so the three agree on when
    ``formatted_name`` needs the annotation rather than each re-deriving it.
    """
    lookup_expression = getattr(queryset.model, "formatted_name_lookup_expression", None)
    if isinstance(lookup_expression, str):
        queryset = queryset.annotate(formatted_name=models.F(lookup_expression))
    return queryset


class Lookup(FormattedNameBaseModel):
    """
    Abstract base for code/name lookup tables. Provides ``code`` (unique identifier),
    ``name`` (display label), and a generated ``formatted_name`` field for consistent
    display across the API.
    """

    code = models.CharField(max_length=255, unique=True, db_index=True)
    name = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        abstract = True

    def __str__(self):
        return f"name: {self.name}, code:{self.code}"


class VuedaModel(FormattedNameBaseModel):
    """
    Abstract base model for all VUEDA domain models. Adds a ``formatted_name``
    generated field (defaults to ``name``) used by the API for consistent display.
    Subclasses should override ``formatted_name_lookup_expression`` to change the source field.
    """

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

    if django.VERSION >= (6, 0):

        def save(self, **kwargs):
            """Delete all other rows and force ``id=1`` before saving."""
            self.__class__.objects.exclude(id=self.id).delete()
            self.id = 1
            super().save(**kwargs)

    else:

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


def supports_vueda_feature_policy(model):
    """Return whether ``model`` belongs to the current family of VUEDA model bases."""
    return isinstance(model, type) and issubclass(model, FormattedNameBaseModel)


def apply_vueda_feature_policy(sender, **kwargs):
    """Resolve a prepared model's ``class Vueda`` policy and let each feature contribute to it.

    Django sends ``class_prepared`` only for concrete and proxy models, after it has built the
    model's fields and options, so a contributor sees a complete model. A contributor may call
    ``sender.add_to_class()`` to add a field, a generic relation, or a descriptor; a database field
    added here reaches ``ModelState``, which is what makes it visible to migration generation.

    A proxy takes the policy of its concrete model and gets no contributor pass of its own, because
    both history triggers and workflow object state resolve a proxy to that shared table.
    """
    if not supports_vueda_feature_policy(sender):
        return

    options = resolve_vueda_options(sender)
    if sender._meta.proxy:
        return

    unresolved = failed_sections(options.problems)
    ordered = sorted(options.items(), key=lambda item: (item[1].section.contribute_order, item[0]))
    for name, section_options in ordered:
        contribute = section_options.section.contribute
        if contribute is not None and name not in unresolved:
            contribute(sender, options)


class_prepared.connect(apply_vueda_feature_policy, dispatch_uid="vueda.core.apply_vueda_feature_policy")
