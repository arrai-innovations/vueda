"""Abstract model bases with CRUDL permissions, singleton support, and email templates."""

__all__ = (
    "ActivatableBaseModel",
    "BaseModelMeta",
    "EmailTemplateBase",
    "FormattedNameBaseModel",
    "Lookup",
    "SingletonModel",
    "VuedaModel",
    "apply_vueda_feature_policy",
    "supports_vueda_feature_policy",
)

import django
from django.contrib.admin.utils import lookup_field
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.signals import class_prepared

from vueda.core.formatted_name import FORMATTED_NAME
from vueda.core.formatted_name import annotate_formatted_name
from vueda.core.formatted_name import formatted_name_annotation_path
from vueda.core.options import failed_sections
from vueda.core.options import resolve_vueda_options


class BaseModelMeta:
    """Default Django ``Meta`` base that replaces Django's add/change/view/delete permissions with CRUDL names."""

    default_permissions = ("create", "read", "update", "delete", "list")


def _names_own_formatted_name(term):
    """Whether an ordering term names the model's own ``formatted_name``, in either direction.

    A term reaching another model's formatted name (``owner__formatted_name``) is not one of these:
    the annotation belongs to the queryset being ordered, not to the ones it joins.
    """
    return isinstance(term, str) and term.removeprefix("-") == FORMATTED_NAME


class FormattedNameManager(models.Manager):
    """
    Default manager for ``FormattedNameBaseModel``, which annotates ``formatted_name`` onto every
    queryset of a model that reaches its formatted name through
    ``formatted_name_lookup_expression``.

    A model with a ``formatted_name`` ``GeneratedField`` has that column already, and one that
    computes the value in Python with ``get_formatted_name()`` has no database path to annotate; this
    manager changes nothing for either (see ``formatted_name_annotation_path``). It only matters for
    the third form, where ``formatted_name`` is a name for some other path — a column on this model,
    or one reached through single-valued relations.

    Annotating here rather than only in ``VuedaViewSet.get_queryset`` is what makes
    ``formatted_name`` usable everywhere a queryset is, not just on a list request:
    ``Meta.ordering = ["formatted_name"]`` compiles, a ``ModelChoiceFilter`` rendering its choices
    sorts by it, and a management command, a reverse relation, ``dumpdata``, or the admin sees the
    same value the API does. Without it, ordering declared on the model would raise ``FieldError``
    on every queryset the viewset didn't build.

    **Replacing the default manager.** Django uses the first manager declared on a model as its
    default, so a model that declares its own ``objects`` shadows this one and loses the annotation.
    Subclass this manager rather than ``models.Manager`` when a VUEDA model needs a manager of its
    own::

        class WidgetManager(FormattedNameManager):
            def get_queryset(self):
                return super().get_queryset().filter(archived=False)

        class Widget(VuedaModel):
            formatted_name = None
            formatted_name_lookup_expression = "label"

            objects = WidgetManager()

    The same applies to a manager built with ``Manager.from_queryset()``: pass
    ``FormattedNameManager`` as the base (``FormattedNameManager.from_queryset(WidgetQuerySet)``).
    A manager declared on an abstract base shadows this one just as readily, and is the easier case
    to miss, since the model that names a lookup expression can be several classes away from the one
    that names the manager. ``VUEDAUserManager`` and ``SentItemManager`` sit on concrete models that
    have a ``formatted_name`` column, so they have no annotation to lose. The ``vueda_info.E009``
    system check reports a model whose default manager doesn't provide the annotation it needs,
    rather than leaving it to fail at query time.

    **The base manager is not this manager.** Django builds ``Model._base_manager`` itself, as a
    plain ``models.Manager``, unless ``Meta.base_manager_name`` names one — so it carries no
    ``formatted_name`` annotation even on a model whose ``objects`` is this manager. That is
    deliberate on Django's part: the base manager is what fetches related objects, precisely because
    a default manager may filter them out, and Django doesn't use it when querying *on* a related
    model.

    A model with a ``Meta.ordering`` naming ``formatted_name`` is the one that has to care, since a
    base-manager queryset carrying that ordering has no annotation to sort and raises ``FieldError``.
    Anything reached through ``get()`` is safe, because ``get()`` clears ordering: ``refresh_from_db``
    and dereferencing a foreign key both go that way, and so do ``select_related`` and
    ``prefetch_related``, which order by nothing of the related model's own. What is *not* safe is a
    base-manager queryset that gets evaluated as a whole — ``dumpdata --use-base-manager``, and the
    related-object collection a cascade delete performs (``Collector.related_objects`` returns a plain
    ``_base_manager`` queryset, which ``Collector.collect`` evaluates without clearing ordering). Set
    ``Meta.base_manager_name = "objects"`` on a model that needs those paths to work, which makes
    Django use this manager for them too. Ordering by the lookup expression's own path instead of by
    ``formatted_name`` avoids the problem without touching the base manager.
    """

    def get_queryset(self):
        return annotate_formatted_name(super().get_queryset())


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

    objects = FormattedNameManager()

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

    @classmethod
    def _check_ordering(cls):
        """
        Django's own ordering checks, minus the ``formatted_name`` term Django cannot resolve.

        A model whose formatted name comes from ``formatted_name_lookup_expression`` has no
        ``formatted_name`` column, and Django's ``models.E015`` resolves the names in ``Meta.ordering``
        against the model's own fields. It would reject ``ordering = ["formatted_name"]`` on such a
        model even though the ordering is valid: ``FormattedNameManager`` annotates the lookup
        expression under that name onto every queryset the model builds, and the database sorts the
        annotation.

        The manager is what makes withholding the term safe, so the manager is what this asks about.
        ``Meta.ordering`` applies to every queryset of the model, not just the ones a viewset builds,
        so suppressing ``models.E015`` on a model whose default manager doesn't annotate would trade a
        startup error for a ``FieldError`` at query time on any path that didn't go through
        ``VuedaViewSet.get_queryset``. Such a model is left to ``models.E015``, which is right about
        it: there really is no ``formatted_name`` to order by. ``vueda_info.E009`` reports the same
        model with a hint aimed at the manager rather than at the ordering, but it is a second opinion
        rather than the thing that makes this sound — it only reaches registered models, while
        ``Meta.ordering`` breaks queries whether or not anything registered the model.

        ``formatted_name_annotation_path`` is the single rule behind every ``formatted_name``
        annotation VUEDA adds, so asking it rather than reading the lookup expression directly keeps
        this in step with what the manager will actually do. It answers ``None`` for a model that
        declares a lookup expression *and* keeps a ``formatted_name`` column, which is annotated by
        nothing and needs no suppression: the column is a real field, so ``models.E015`` resolves the
        term on its own.

        ``Model._base_manager`` is the one path the manager doesn't cover, since Django builds that
        one itself as a plain ``models.Manager``. Evaluating a base-manager queryset that keeps this
        ordering raises ``FieldError``; see the note at the end of ``FormattedNameManager`` for which
        callers reach it and why almost none do.

        Only that term is withheld, and only on a model that has a lookup expression to reach it
        through. Every other term is still Django's to check, including a ``formatted_name`` on a
        model that resolves it in Python with ``get_formatted_name()`` — nothing annotates that one,
        so ``models.E015`` is right to reject it, and ``vueda_info.E005`` explains why.
        """
        ordering = cls._meta.ordering

        if formatted_name_annotation_path(cls) is None or not isinstance(ordering, (list, tuple)):
            return super()._check_ordering()

        # Read from `_meta` rather than from the class, so a `Meta.default_manager_name` pointing at a
        # manager that does inherit FormattedNameManager counts — that is a supported way to fix the
        # model, and Django uses the same attribute to decide which manager the annotation comes from.
        if not isinstance(cls._meta.default_manager, FormattedNameManager):
            return super()._check_ordering()

        remaining = [term for term in ordering if not _names_own_formatted_name(term)]
        if len(remaining) == len(ordering):
            return super()._check_ordering()

        # Django reads the terms off `_meta`, so the term it can't resolve is withheld there rather
        # than by matching the message it would produce. System checks run once at startup on a single
        # thread, and the original list is back before this returns.
        cls._meta.ordering = remaining
        try:
            return super()._check_ordering()
        finally:
            cls._meta.ordering = ordering


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
