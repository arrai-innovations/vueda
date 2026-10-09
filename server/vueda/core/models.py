"""Abstract model bases with CRUD permissions, singleton support, and email templates."""

__all__ = (
    "ActivatableBaseModel",
    "BaseModelMeta",
    "EmailTemplateBase",
    "FormattedNameBaseModel",
    "FormattedNameManager",
    "Lookup",
    "SingletonModel",
    "VuedaModel",
    "apply_vueda_feature_policy",
    "supports_vueda_feature_policy",
)

from typing import ClassVar

import django
from django.contrib.admin.utils import lookup_field
from django.contrib.postgres.fields import ArrayField
from django.core import checks
from django.core.exceptions import FieldError
from django.db import models
from django.db.models.signals import class_prepared

from vueda.core.formatted_name import FORMATTED_NAME
from vueda.core.formatted_name import annotate_formatted_name
from vueda.core.formatted_name import formatted_name_annotation_path
from vueda.core.options import failed_sections
from vueda.core.options import resolve_vueda_options


class BaseModelMeta:
    """Default Django ``Meta`` base that replaces Django's add/change/view/delete permissions with CRUD names."""

    default_permissions = ("create", "read", "update", "delete", "list")


def _names_own_formatted_name(term):
    """Whether an ordering term names the model's own ``formatted_name``, in either direction.

    A term reaching another model's formatted name (``owner__formatted_name``) is not one of these:
    the annotation belongs to the queryset being ordered, not to the ones it joins.

    Only a plain string counts, because this decides what to withhold from Django's ``models.E015``
    and that check reads nothing else: it skips every non-string term in ``Meta.ordering``.
    """
    return isinstance(term, str) and term.removeprefix("-") == FORMATTED_NAME


def _ordering_resolves(manager):
    """
    Whether the queryset ``manager`` builds can compile the ordering its model declares.

    Compiling is what resolves an ordering term against the columns and annotations a queryset
    actually carries, so this asks the question that reading the manager's class cannot: not "is this
    the manager VUEDA ships" but "does what it builds have the ``formatted_name`` the ordering
    needs". A manager of a project's own that annotates the path passes, and a
    ``FormattedNameManager`` subclass whose ``get_queryset`` dropped the annotation does not. It also
    makes the answer independent of how the ordering names the annotation, including inside a
    ``Case(When(...))`` condition, which no reading of the terms recovers.

    ``sql_with_params`` builds the SQL string and opens no database connection, so this is safe in a
    check that runs before anything reaches a database.

    ``None`` when the question has no answer: a ``get_queryset`` that reaches for request state
    raises here, and a queryset nobody can build says nothing about its ordering.
    """
    try:
        queryset = manager.get_queryset()
    except Exception:
        return None

    try:
        queryset.query.sql_with_params()
    except FieldError:
        return False
    except Exception:
        # Anything else is not this check's business, and a check has no business raising.
        return None

    return True


def _annotates_formatted_name(manager):
    """
    Whether the queryset ``manager`` builds carries a ``formatted_name`` annotation.

    The queryset is read rather than the manager's class, so a manager of a project's own that
    annotates the path counts whatever it inherits, and a ``FormattedNameManager`` subclass whose
    ``get_queryset`` dropped the annotation does not. Reading the queryset's annotations, rather than
    compiling its ordering, answers for every model alike: a ``Meta.ordering`` that never names
    ``formatted_name`` compiles without the annotation, and filtering by it still raises.

    Building a queryset opens no database connection, so this is safe in a check that runs before
    anything reaches a database.

    ``None`` when the question has no answer: a ``get_queryset`` that reaches for request state
    raises here, and so does one annotating a lookup expression that names no field.
    """
    if manager is None:
        return False

    try:
        queryset = manager.get_queryset()
    except Exception:
        # A queryset nobody can build says nothing about its annotations, and a check has no
        # business raising.
        return None

    return FORMATTED_NAME in queryset.query.annotations


def _used_without_formatted_name(manager):
    """
    Whether ``manager`` opts out of the ``formatted_name`` manager check.

    Only the value ``True`` opts out. A missing attribute leaves the manager checked, and so does a
    value such as ``1`` or ``"yes"``, so a typo cannot switch the check off by accident.
    """
    return getattr(manager, "used_without_formatted_name", False) is True


def _manager_class_phrase(manager):
    """The class of ``manager`` with its article, such as ``"a Manager"`` or ``"an ExportManager"``."""
    class_name = type(manager).__name__
    article = "an" if class_name[:1] in "AEIOU" else "a"
    return f"{article} {class_name}"


def _formatted_name_manager_fix(manager):
    """
    The hint sentences that say how to give ``manager`` the ``formatted_name`` annotation.

    Every way of building a manager has its own fix, so the hint names each one. A manager built with
    ``QuerySet.as_manager()`` has no base class to change. Its fix names the real queryset class
    when the manager is one of those.
    """
    fix = (
        "FormattedNameManager is what annotates the lookup expression as `formatted_name` on the "
        "model's own querysets. Subclass it instead of `models.Manager`, or pass it to "
        "`Manager.from_queryset()` as the base."
    )

    queryset_class = "QuerySet"
    if getattr(manager, "_built_with_as_manager", False):
        queryset_class = manager._queryset_class.__name__

    return (
        f"{fix} A manager built with `{queryset_class}.as_manager()` has no base to pass, so replace it "
        f"with `FormattedNameManager.from_queryset({queryset_class})()`."
    )


class FormattedNameManager(models.Manager):
    """
    Default manager for ``FormattedNameBaseModel``, which annotates ``formatted_name`` onto every
    queryset of a model that reaches its formatted name through
    ``formatted_name_lookup_expression``.

    A model with a ``formatted_name`` ``GeneratedField`` has that column already, so this manager
    annotates nothing for it (see ``formatted_name_annotation_path``). One that computes the value in
    Python with ``get_formatted_name()`` has no database path to annotate either, but may still
    declare ``formatted_name_select_related``, which this manager applies the same as
    ``annotate_formatted_name`` does everywhere else. The annotation itself only matters for the third
    form, where ``formatted_name`` is a name for some other path — a column on this model, or one
    reached through single-valued relations.

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
    A manager built with ``QuerySet.as_manager()`` has no base to pass. Replace
    ``WidgetQuerySet.as_manager()`` with ``FormattedNameManager.from_queryset(WidgetQuerySet)()``,
    which builds the same manager on top of this one.

    A manager declared on an abstract base shadows this one just as readily, and is the easier case
    to miss, since the model that names a lookup expression can be several classes away from the one
    that names the manager. ``VUEDAUserManager`` sits on a model with a ``formatted_name`` column,
    and ``SentItemManager`` on one that computes it with ``get_formatted_name()``, so neither has an
    annotation to lose.

    **Every manager needs the annotation, not only the default.** A second manager, such as
    ``unfulfilled = UnfulfilledOrderManager()``, builds querysets of its own. Ordering or filtering
    them by ``formatted_name`` raises ``FieldError`` unless that manager annotates it too. The
    ``vueda_core.E019`` system check reports each manager that does not, by name, rather than leaving
    it to fail at query time. It checks every installed model, whether or not anything registered it.

    **Opting a manager out.** Some managers never use ``formatted_name``. Examples are a manager that
    feeds a data export, or one that sends data to or receives data from another system's API. When
    the lookup expression crosses a relation, the annotation also adds a join that such a manager does
    not want. Set ``used_without_formatted_name = True`` on the manager's class to leave it out of
    ``vueda_core.E019``::

        class OrderExportManager(models.Manager):
            used_without_formatted_name = True

        class Order(VuedaModel):
            formatted_name = None
            formatted_name_lookup_expression = "customer__name"

            objects = FormattedNameManager()
            export = OrderExportManager()

    Declare ``objects`` above the opted-out manager. Django makes the first manager a model declares
    its default, ahead of the ``objects`` this base provides, so a model that declares only ``export``
    would make it the default manager. Setting ``Meta.default_manager_name = "objects"`` also works,
    and then the order of the declarations does not matter.

    Only the value ``True`` opts out. Subclasses inherit the attribute. A subclass that sets it back
    to ``False`` is checked again.

    The opt-out has no effect on the default manager. Related managers, the admin, and ``dumpdata``
    all build their querysets from the default manager, so it always needs the annotation.

    An opted-out manager still has to run with the model's ``Meta.ordering``. Django applies
    ``Meta.ordering`` to the querysets of every manager. When it names ``formatted_name``, every
    query from an opted-out manager raises ``FieldError``, even a plain ``all()``. The
    ``vueda_core.E020`` system check reports that manager. Give its ``get_queryset()`` an
    ``order_by()`` of its own, or give it the annotation.

    A viewset built on an opted-out manager still returns ``formatted_name``, because
    ``VuedaViewSet.get_queryset`` adds the annotation itself. A model that VUEDA never displays can
    inherit Django's ``models.Model`` instead, and no ``formatted_name`` check runs on it. The guide
    "Data That VUEDA Does Not Display" compares the two options.

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
    base-manager queryset that gets evaluated as a whole, which is the related-object collection a
    cascade delete performs (``Collector.related_objects`` returns a plain ``_base_manager``
    queryset, which ``Collector.collect`` evaluates without clearing ordering). ``dumpdata --all``
    reads the base manager but replaces the ordering with the primary key, so it is safe too. Set
    ``Meta.base_manager_name = "objects"`` on a model that needs those paths to work, which makes
    Django use this manager for them too. Ordering by the lookup expression's own path instead of by
    ``formatted_name`` avoids the problem without touching the base manager. The
    ``vueda_core.E017`` system check reports a model that ordered by ``formatted_name`` and did
    neither, so the failure surfaces at startup rather than on a delete.
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

    formatted_name_lookup_expression: ClassVar[str | None] = None
    """A lookup path, such as ``"customer__name"``, that gives this model's formatted name.

    Declare it with ``formatted_name = None`` to name a column on this model or one reached through
    single-valued relations. ``FormattedNameManager`` annotates ``formatted_name`` from it.

    A model that declares a lookup expression may name its own ``formatted_name`` in
    ``Meta.ordering``. Django's ``models.E015`` check resolves ordering terms against the model's
    fields, so VUEDA withholds that one term from the check. The check tests every other term as
    usual. VUEDA withholds the term only when the default manager annotates ``formatted_name``.
    ``Meta.ordering`` applies to every queryset, including those that a management command, a data
    migration, or the admin builds, and only the manager's annotation makes the term valid there.
    With any other default manager, ``models.E015`` reports the term, and ``vueda_core.E019`` also
    reports the manager. A related path such as ``customer__formatted_name``
    is never withheld. ``FormattedNameManager`` describes Django's base manager, whose querysets its
    annotation does not reach.
    """

    formatted_name_select_related: ClassVar[tuple[str, ...] | None] = None
    """Relation paths to join whenever this model is queried, for a ``get_formatted_name()`` that reads them.

    ``annotate_formatted_name`` passes them to ``select_related()``, so the method's relations load in
    the same query instead of one extra query per row.
    """

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
        it: there really is no ``formatted_name`` to order by. ``vueda_core.E019`` reports the same
        model with a hint aimed at the manager rather than at the ordering. The two report different
        things, a term and a manager, so a model in this state gets both.

        The manager is asked by reading the queryset it builds, not its class, so a manager of a
        project's own that annotates the path keeps the term withheld whatever it inherits.

        ``formatted_name_annotation_path`` is the single rule behind every ``formatted_name``
        annotation VUEDA adds, so asking it rather than reading the lookup expression directly keeps
        this in step with what the manager will actually do. It answers ``None`` for a model that
        declares a lookup expression *and* keeps a ``formatted_name`` column, which is annotated by
        nothing and needs no suppression: the column is a real field, so ``models.E015`` resolves the
        term on its own.

        ``Model._base_manager`` is the one path the manager doesn't cover, since Django builds that
        one itself as a plain ``models.Manager``. Evaluating a base-manager queryset that keeps this
        ordering raises ``FieldError``, so withholding the term without asking about that manager
        too would hide a second failure behind the first: ``_formatted_name_base_manager_errors``
        reports it as ``vueda_core.E017``. See the note at the end of ``FormattedNameManager`` for
        which callers reach such a queryset and why almost none do.

        Only that term is withheld, and only on a model that has a lookup expression to reach it
        through. Every other term is still Django's to check, including a ``formatted_name`` on a
        model that resolves it in Python with ``get_formatted_name()`` — nothing annotates that one,
        so ``models.E015`` is right to reject it, and ``vueda_info.E005`` explains why.
        """
        ordering = cls._meta.ordering

        if formatted_name_annotation_path(cls) is None or not isinstance(ordering, (list, tuple)):
            return super()._check_ordering()

        # Read from `_meta` rather than from the class, so a `Meta.default_manager_name` pointing at a
        # manager that annotates counts — that is a supported way to fix the model, and Django uses
        # the same attribute to decide which manager the annotation comes from.
        if _annotates_formatted_name(cls._meta.default_manager) is not True:
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

    @classmethod
    def check(cls, **kwargs):
        """Django's model checks plus the manager checks ``vueda_core.E019`` and ``vueda_core.E020``,
        and the base-manager check ``vueda_core.E017``.

        Hooked here rather than inside ``_check_ordering`` because they answer different questions.
        ``_check_ordering`` withholds a term Django would misjudge, so it only runs where a term
        names ``formatted_name`` outright. The base manager fails on any ordering that needs the
        annotation, including one that names it only inside a ``Case(When(...))`` condition, and
        that ordering withholds nothing. The model's managers matter whatever the ordering says,
        because filtering or ordering by ``formatted_name`` anywhere needs their annotation.

        Django runs model checks on every installed model, once each, so ``vueda_core.E019``
        reaches a model whether or not anything registered it.

        ``vueda_core.E019`` is reported beside ``models.E015``, since the two name different faults:
        a term the model does not have, and a manager that does not supply it. An ordering Django
        already rejects is otherwise left at that. The base manager is not the fault ``models.E015``
        names, so fixing the term and running the checks again is what surfaces
        ``vueda_core.E017`` if the model is also in that state.
        """
        errors = (
            super().check(**kwargs)
            + cls._formatted_name_default_manager_errors()
            + cls._formatted_name_other_manager_errors()
        )

        if any(error.id == "models.E015" for error in errors):
            return errors

        return errors + cls._formatted_name_base_manager_errors()

    @classmethod
    def _formatted_name_default_manager_errors(cls):
        """
        Report a model that needs the ``formatted_name`` annotation but whose default manager won't add it.

        ``FormattedNameManager`` is what puts ``formatted_name`` on every queryset of a model that
        reaches the value through ``formatted_name_lookup_expression``. Django uses the first manager
        in ``Meta.managers`` order as the default, so a model that declares its own ``objects``
        shadows the one this base provides. Nothing fails at import time. Instead, ``formatted_name``
        stops resolving on every queryset that manager builds, which is every queryset except the ones
        ``VuedaViewSet.get_queryset`` annotates for itself.

        A ``Meta.ordering`` that names ``formatted_name`` makes every query raise ``FieldError``.
        Django's ``models.E015`` reports a plain string term, but skips an expression such as
        ``F("formatted_name").asc()``. A ``Meta.ordering`` that names something else lets ordinary
        queries work, and filtering or ordering by ``formatted_name`` raises. This check reports all
        three, because the manager is the fault in each.

        A manager declared on an abstract base counts as much as one declared on the model, and is the
        easier case to miss, since the model naming the lookup expression may be several classes away
        from the one naming the manager. The same holds for ``formatted_name = None`` itself: the rule
        reads the model's fields, not its own class body.

        ``used_without_formatted_name`` does not exempt the default manager. Related managers, the
        admin, and ``dumpdata`` all build their querysets from it, so a default manager that sets the
        attribute and does not annotate is still reported. The message says the opt-out does not apply,
        so a developer who set it learns why it changed nothing.
        """
        # The same rule the annotation itself is built from, so a model this reports is exactly a model
        # that would have been annotated.
        if formatted_name_annotation_path(cls) is None:
            return []

        # Read from `_meta`, the attribute `Meta.default_manager_name` resolves to, so pointing it at
        # a manager that annotates is a fix this accepts.
        default_manager = cls._meta.default_manager
        if _annotates_formatted_name(default_manager) is not False:
            return []

        hint = (
            f"{_formatted_name_manager_fix(default_manager)} Pointing `Meta.default_manager_name` at a "
            "manager that does also works, and the manager it replaces is then checked as a second manager. "
            "Without the annotation, `formatted_name` resolves only on querysets `VuedaViewSet.get_queryset` "
            "builds. Ordering or filtering by it anywhere else raises FieldError, and a `Meta.ordering` "
            "naming it makes every query raise."
        )

        if default_manager is None:
            declared = "declares no default manager"
        else:
            manager_class = _manager_class_phrase(default_manager)
            declared = f"its default manager ({default_manager.name}, {manager_class}) does not annotate it"
            if _used_without_formatted_name(default_manager):
                declared += ". used_without_formatted_name does not apply to a default manager"
                hint += (
                    " Related managers, the admin, and `dumpdata` all build querysets from the default "
                    f"manager, so it cannot opt out. {cls._opted_out_default_manager_fix(default_manager)}"
                )

        return [
            checks.Error(
                f"{cls.__name__} reaches formatted_name through formatted_name_lookup_expression, but {declared}.",
                hint=hint,
                obj=cls,
                id="vueda_core.E019",
            )
        ]

    @classmethod
    def _opted_out_default_manager_fix(cls, default_manager):
        """
        The hint sentence that says how to stop an opted-out manager from being the default.

        How the manager became the default decides the fix. ``Meta.default_manager_name`` overrides
        declaration order, so moving declarations around does nothing while it names the manager. A
        manager named ``objects`` cannot have another ``objects`` declared above it, because the second
        assignment replaces the first. Otherwise, the manager is the default because it is the first
        one the model declares.
        """
        name = default_manager.name

        if cls._meta.default_manager_name == name:
            return (
                f"`Meta.default_manager_name` selects {name}. Point it at a manager that annotates "
                "`formatted_name` instead, or remove it."
            )

        if name == "objects":
            return (
                "Rename the opted-out manager, for example to `export`, and declare "
                "`objects = FormattedNameManager()` above it, because Django makes the first manager a model "
                'declares its default. Setting `Meta.default_manager_name = "objects"` also works, and then '
                "the order of the declarations does not matter."
            )

        return (
            f"Declare `objects = FormattedNameManager()` above {name}, because Django makes the first manager "
            'a model declares its default. Setting `Meta.default_manager_name = "objects"` also works, and '
            "then the order of the declarations does not matter."
        )

    @classmethod
    def _formatted_name_other_manager_errors(cls):
        """
        Report each manager other than the default that cannot give ``formatted_name`` to its querysets.

        A model can declare more managers than its default, and each one builds querysets of its own.
        ``Order.unfulfilled.order_by("formatted_name")`` raises ``FieldError`` when ``unfulfilled``
        does not annotate the lookup expression, even though ``Order.objects`` does. A viewset built
        on that manager still works, because ``VuedaViewSet.get_queryset`` adds the annotation itself,
        so the failure would otherwise surface later in a report, a management command, or the shell.
        Each such manager is reported as ``vueda_core.E019``, by its attribute name, so one
        ``manage.py check`` run lists all of them.

        A manager that sets ``used_without_formatted_name = True`` is left out of ``vueda_core.E019``.
        Its querysets still carry the model's ``Meta.ordering``, because Django applies it to every
        manager, so ``_formatted_name_opted_out_manager_errors`` asks whether that ordering compiles.

        ``Model._base_manager`` is not in ``_meta.managers`` unless the model names it, and
        ``_formatted_name_base_manager_errors`` covers it with a hint of its own.
        """
        if formatted_name_annotation_path(cls) is None:
            return []

        default_manager = cls._meta.default_manager
        errors = []
        for manager in cls._meta.managers:
            # `_meta.default_manager` is one of the objects in `_meta.managers`, so identity tells the
            # default apart even when `Meta.default_manager_name` picked a manager other than the first.
            if manager is default_manager:
                continue

            if _used_without_formatted_name(manager):
                errors.extend(cls._formatted_name_opted_out_manager_errors(manager, default_manager))
                continue

            if _annotates_formatted_name(manager) is not False:
                continue

            manager_class = _manager_class_phrase(manager)
            errors.append(
                checks.Error(
                    f"{cls.__name__} reaches formatted_name through formatted_name_lookup_expression, but "
                    f"its manager {manager.name} ({manager_class}) does not annotate it.",
                    hint=(
                        f"{_formatted_name_manager_fix(manager)} Without the annotation, ordering or "
                        f"filtering `{cls.__name__}.{manager.name}` by `formatted_name` raises FieldError, "
                        "and so does every query when `Meta.ordering` names it. If nothing orders, filters, "
                        "or serializes this manager's querysets by `formatted_name`, such as a manager that "
                        "feeds an export, set `used_without_formatted_name = True` on its class instead."
                    ),
                    obj=cls,
                    id="vueda_core.E019",
                )
            )

        return errors

    @classmethod
    def _formatted_name_opted_out_manager_errors(cls, manager, default_manager):
        """
        Report an opted-out manager whose querysets cannot compile the model's ``Meta.ordering``.

        ``used_without_formatted_name = True`` says that nothing orders, filters, or serializes the
        manager's querysets by ``formatted_name``. The model's ``Meta.ordering`` can still do it for
        them. Django applies ``Meta.ordering`` to the querysets of every manager, so when it names
        ``formatted_name``, every query from the manager raises ``FieldError``, even a plain ``all()``.

        The manager is asked by compiling its queryset, the same way ``vueda_core.E017`` asks the base
        manager. A manager whose ``get_queryset()`` applies an ``order_by()`` of its own replaces
        ``Meta.ordering`` and passes. The default manager is asked second. When the ordering does not
        compile there either, the ordering is the fault, and ``models.E015`` or ``vueda_core.E019``
        names it with the fix it deserves.
        """
        if not cls._meta.ordering:
            return []

        if _ordering_resolves(manager) is not False:
            return []

        if _ordering_resolves(default_manager) is not True:
            return []

        manager_class = _manager_class_phrase(manager)
        return [
            checks.Error(
                f"{cls.__name__}.Meta.ordering needs the formatted_name annotation to compile, but its manager "
                f"{manager.name} ({manager_class}) sets used_without_formatted_name and adds none.",
                hint=(
                    "Django applies Meta.ordering to the querysets of every manager, including one used "
                    f"without `formatted_name`, so every query `{cls.__name__}.{manager.name}` builds raises "
                    "FieldError. Give the manager's `get_queryset()` an `order_by()` of its own that does not "
                    "need `formatted_name`, or remove `used_without_formatted_name` and give the manager the "
                    "annotation."
                ),
                obj=cls,
                id="vueda_core.E020",
            )
        ]

    @classmethod
    def _formatted_name_base_manager_errors(cls):
        """
        Report a base manager that cannot compile the ordering the model declares.

        ``FormattedNameManager`` annotates ``formatted_name`` onto the querysets the model itself
        builds, so a ``Meta.ordering`` naming it sorts on the annotation. Django builds
        ``Model._base_manager`` itself, as a plain ``models.Manager``, unless
        ``Meta.base_manager_name`` names one, so that queryset carries the ordering with nothing to
        sort and raises ``FieldError`` the moment it compiles.

        Almost nothing evaluates a base-manager queryset whole. ``get()`` clears ordering, which
        covers ``refresh_from_db`` and dereferencing a foreign key, and ``select_related`` and
        ``prefetch_related`` order by nothing of the related model's own. A cascade delete does:
        ``Collector.related_objects`` hands back a plain ``_base_manager`` queryset, and
        ``Collector.collect`` evaluates it whenever ``can_fast_delete`` said no, which a related
        model with cascading children of its own, a parent link, or a delete signal receiver all say.
        Deleting the parent then fails with a ``FieldError`` naming a field nobody wrote.

        Both managers are asked by compiling, not by reading their classes. A project's own manager
        that annotates the path is a base manager this model can use, whatever it inherits, and a
        ``FormattedNameManager`` subclass whose ``get_queryset`` dropped the annotation is not. The
        default manager is asked second, and its answer is what keeps this from reporting an ordering
        that is simply broken: when the ordering doesn't compile there either, the ordering is the
        fault, and ``models.E015`` or ``vueda_core.E019`` names it with the fix it deserves.

        ``_base_manager`` is read rather than ``Meta.base_manager_name``, because Django resolves
        that name up the MRO before building a manager of its own. A base manager an abstract parent
        selected counts as much as one this model names.
        """
        if formatted_name_annotation_path(cls) is None or not cls._meta.ordering:
            return []

        try:
            base_manager = cls._base_manager
        except ValueError:
            # `Meta.base_manager_name` naming a manager the model doesn't have raises here. That
            # declaration is broken whatever the ordering says, and reporting it as an ordering
            # problem would point at the wrong line.
            return []

        if _ordering_resolves(base_manager) is not False:
            return []

        if _ordering_resolves(cls._meta.default_manager) is not True:
            return []

        # "_base_manager" is the name Django gives the manager it builds when no declaration named
        # one, so it is what distinguishes the fallback from a manager the model actually selected.
        if base_manager.name == "_base_manager":
            selected = (
                "the model names no Meta.base_manager_name, so Django builds a plain models.Manager that adds none"
            )
        else:
            selected = f"the base manager it selects ({base_manager.name}) adds none"

        return [
            checks.Error(
                f"{cls.__name__}.Meta.ordering needs the formatted_name annotation to compile, but {selected}.",
                hint=(
                    "Meta.ordering is compiled into every queryset of the model, including the ones "
                    "Model._base_manager builds, and only a manager that annotates `formatted_name` "
                    "can resolve it there. A cascade delete that cannot take Django's fast-delete "
                    "path evaluates such a queryset and raises FieldError. Point "
                    "`Meta.base_manager_name` at a manager whose queryset carries the annotation "
                    '(`"objects"` on a model that kept FormattedNameManager), or order by the path '
                    "`formatted_name_lookup_expression` names instead of by `formatted_name`."
                ),
                obj=cls,
                id="vueda_core.E017",
            )
        ]


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
