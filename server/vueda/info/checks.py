"""System checks for the model, serializer, and viewset configuration that model info metadata reads."""

import re
import warnings
from collections.abc import Iterable

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_fields_from_path
from django.core.checks import Error
from django.core.checks import Warning as CheckWarning
from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import FieldError
from django.db.models.constants import LOOKUP_SEP
from django.db.models.sql.query import Query
from rest_flex_fields2.config import WILDCARD_VALUES

from vueda.core.formatted_name import FORMATTED_NAME
from vueda.core.formatted_name import FORMATTED_NAME_LOOKUP_EXPRESSION
from vueda.core.formatted_name import FORMATTED_NAME_SELECT_RELATED
from vueda.core.formatted_name import formatted_name_annotation_path
from vueda.core.formatted_name import path_multiplies_rows
from vueda.core.formatted_name import resolve_formatted_name_path
from vueda.core.ordering import NULLS_PLACEMENTS
from vueda.core.ordering import PK_ALIAS
from vueda.core.ordering import expand_ordering_pk
from vueda.core.ordering import ordering_field_key
from vueda.core.ordering import ordering_fields_entry_name
from vueda.core.ordering import ordering_fields_from_path
from vueda.core.ordering import ordering_term_field_names
from vueda.core.ordering import ordering_term_is_ascending
from vueda.core.ordering import queryset_explicit_ordering
from vueda.core.paths import PUBLIC_PATH_SEP
from vueda.core.paths import public_ordering_path_to_orm


# The column types `Sum` means something for. Numeric columns, plus `DurationField` -- an interval,
# which adds up the same way. Everything else (a `CharField`, a `BooleanField`, a `DateField`, a
# relation) either raises in the database or produces a number that stands for nothing.
SUMMABLE_INTERNAL_TYPES = frozenset(
    {
        "AutoField",
        "BigAutoField",
        "BigIntegerField",
        "DecimalField",
        "DurationField",
        "FloatField",
        "IntegerField",
        "PositiveBigIntegerField",
        "PositiveIntegerField",
        "PositiveSmallIntegerField",
        "SmallAutoField",
        "SmallIntegerField",
    }
)

# What VUEDA needs of a `column_totals` key beyond what Django needs of a column alias, and only
# that. Django's half of the question is asked of Django itself, in `_django_alias_problem` below.
#
# The key is three things at once: a value a client sends in the column totals query parameter, the
# alias VUEDA hands `queryset.aggregate()`, and the name of the column the total renders under. Only
# the first of those asks for anything Django does not, and what it asks is that the name survive
# `get_requested_column_totals` reading it back: that parser splits each value on commas (the
# convention `?e=` and `?f=` already use), strips what it gets, and drops what is left empty. So a
# name carrying a comma arrives as fragments that match nothing, and an empty name never arrives at
# all -- both are declared totals no client could ever ask for. Django already refuses whitespace,
# so the strip needs nothing here. The wildcard spellings are reserved as exact values, which is all
# the parser compares them as: `*a`, `**` and `load~all` are names like any other.
#
# Nothing about the rest of the round trip constrains the spelling. The name comes back as a key of
# the JSON `columnTotals` object and is read as `columnTotals[name]`, and a name that could not be a
# JavaScript variable is still a perfectly good object key.
COLUMN_TOTAL_SEPARATOR_PATTERN = re.compile(r",")


def _is_property_on_model(model, attr_name):
    """Return True if attr_name is defined as a @property anywhere in the model's MRO."""
    for klass in model.__mro__:
        if attr_name in klass.__dict__:
            return isinstance(klass.__dict__[attr_name], property)
    return False


def _validate_lookup_expression_path(model, lookup_expression):
    """
    Report a ``formatted_name_lookup_expression`` that reaches through a multi-valued relation.

    The expression names the database path VUEDA annotates as ``formatted_name`` — on every queryset
    the model builds, through ``FormattedNameManager``, and on the ones a viewset builds, through
    ``VuedaViewSet.get_queryset``. Annotating across a reverse foreign key, a many-to-many, or a
    ``GenericRelation`` joins a row per related object, so the model would silently return more rows
    than its table holds, everywhere, with no error to trace it back to the declaration. A
    single-valued relation is fine at any depth, nullable or not.

    A path that doesn't resolve at all is left alone here. It fails loudly the first time a queryset
    is built, and it isn't what this check is for.
    """
    try:
        fields = get_fields_from_path(model, lookup_expression)
    except (FieldDoesNotExist, NotRelationField):
        return []

    if not path_multiplies_rows(fields):
        return []

    return [
        Error(
            f"{model.__name__}.formatted_name_lookup_expression is '{lookup_expression}', which "
            "reaches through a relation that can match more than one row.",
            hint=(
                "VUEDA annotates this path as `formatted_name` on every queryset of the model, so "
                "joining a reverse foreign key, a many-to-many, or a GenericRelation would return a "
                "row per related object rather than a row per object. Point it at a column on this "
                "model, or at one reached through single-valued relations (a forward foreign key or "
                "a one-to-one, nullable or not)."
            ),
            obj=model,
            id="vueda_info.E008",
        )
    ]


def _validate_default_manager(model):
    """
    Report a model that needs the ``formatted_name`` annotation but whose default manager won't add it.

    ``FormattedNameManager`` is what puts ``formatted_name`` on every queryset of a model that reaches
    the value through ``formatted_name_lookup_expression``, and Django uses the first manager in
    ``Meta.managers`` order as the default — so a model declaring its own ``objects`` shadows the one
    ``FormattedNameBaseModel`` provides and silently loses the annotation. Nothing fails at import
    time; instead ``formatted_name`` stops resolving on every queryset that manager builds, which is
    every queryset except the ones ``VuedaViewSet.get_queryset`` annotates for itself.

    That matters most for a model whose ``Meta.ordering`` names ``formatted_name``, which would raise
    ``FieldError`` on every query rather than only where the name is used.
    ``FormattedNameBaseModel._check_ordering`` asks about the default manager itself before
    withholding that term from Django's ``models.E015``, so such a model is reported whether or not
    it is registered — this check adds a hint aimed at the manager rather than at the ordering, and
    covers the models whose ``Meta.ordering`` names something else while filtering and ordering by
    ``formatted_name`` outside a request break just the same.

    A manager declared on an abstract base counts as much as one declared on the model, and is the
    easier case to miss, since the model naming the lookup expression may be several classes away
    from the one naming the manager.
    """
    from vueda.core.models import FormattedNameManager

    # The same rule the annotation itself is built from, so a model this reports is exactly a model
    # that would have been annotated.
    if formatted_name_annotation_path(model) is None:
        return []

    default_manager = model._meta.default_manager
    if isinstance(default_manager, FormattedNameManager):
        return []

    if default_manager is None:
        declared = "declares no default manager"
    else:
        declared = (
            f"uses {type(default_manager).__name__} as its default manager, which does not inherit FormattedNameManager"
        )

    return [
        Error(
            f"{model.__name__} reaches formatted_name through formatted_name_lookup_expression but {declared}.",
            hint=(
                "FormattedNameManager is what annotates the lookup expression as `formatted_name` on "
                "the model's own querysets. Subclass it instead of `models.Manager` (or pass it to "
                "`Manager.from_queryset()` as the base), or point `Meta.default_manager_name` at a "
                "manager that does. Without it `formatted_name` resolves only on querysets "
                "`VuedaViewSet.get_queryset` builds, so ordering or filtering by it anywhere else — "
                "including a `Meta.ordering` naming it — raises FieldError."
            ),
            obj=model,
            id="vueda_info.E009",
        )
    ]


def _validate_select_related_pairing(model):
    """
    Report a model that declares both ``formatted_name_lookup_expression`` and
    ``formatted_name_select_related``.

    ``formatted_name_select_related`` only has an effect alongside ``get_formatted_name()``: a
    lookup expression resolves ``formatted_name`` entirely through the database annotation, so there
    is no per-instance Python method for a ``select_related`` to prepare relations for. Declaring
    both suggests the model meant to use one and left the other behind.
    """
    lookup_expression = getattr(model, FORMATTED_NAME_LOOKUP_EXPRESSION, None)
    select_related = getattr(model, FORMATTED_NAME_SELECT_RELATED, None)
    if not lookup_expression or not select_related:
        return []

    return [
        Error(
            f"{model.__name__} defines both formatted_name_lookup_expression and formatted_name_select_related.",
            hint=(
                "formatted_name_select_related only has an effect alongside a get_formatted_name() "
                "method: formatted_name_lookup_expression resolves entirely through a database "
                "annotation, so there is no per-instance computation for select_related to prepare "
                "relations for. Remove whichever one the model doesn't use."
            ),
            obj=model,
            id="vueda_info.E011",
        )
    ]


def _validate_model_formatted_name(model):
    from vueda.core.models import FormattedNameBaseModel

    errors = []
    # Only validate models that inherit FormattedNameBaseModel.
    if not issubclass(model, FormattedNameBaseModel):
        return errors

    # Only check models that explicitly override formatted_name with None, signalling
    # the developer opted out of the default GeneratedField and must provide an alternative.
    if "formatted_name" not in model.__dict__ or model.__dict__["formatted_name"] is not None:
        return errors

    has_lookup = getattr(model, "formatted_name_lookup_expression", None)
    # callable() returns False for @property, so check that separately for a targeted error.
    has_method = callable(getattr(model, "get_formatted_name", None))
    has_property = _is_property_on_model(model, "get_formatted_name")

    if has_property:
        errors.append(
            Error(
                f"{model.__name__}.get_formatted_name is decorated with @property.",
                hint="Remove the @property decorator; get_formatted_name() must be a plain method.",
                obj=model,
                id="vueda_info.E003",
            )
        )
    elif has_lookup is not None and not isinstance(has_lookup, str):
        errors.append(
            Error(
                f"{model.__name__} defines formatted_name_lookup_expression as something other than a string.",
                hint=("formatted_name_lookup_expression is used by DB field lookups, so it must be a string."),
                obj=model,
                id="vueda_info.E004",
            )
        )
    elif has_lookup and has_method:
        errors.append(
            Error(
                f"{model.__name__} defines both formatted_name_lookup_expression and get_formatted_name().",
                hint=(
                    "Use formatted_name_lookup_expression for DB field lookups, "
                    "or get_formatted_name() for computed values — not both."
                ),
                obj=model,
                id="vueda_info.E002",
            )
        )
    elif not has_lookup and not has_method:
        errors.append(
            Error(
                f"{model.__name__} sets formatted_name = None but provides no alternative.",
                hint=(
                    "Set formatted_name_lookup_expression to a DB field name, "
                    "or define get_formatted_name() on the model."
                ),
                obj=model,
                id="vueda_info.E001",
            )
        )

    # What the expression points at, once it is known to be a usable string. Reported alongside
    # whatever the chain above found rather than instead of it: a model can declare both a
    # get_formatted_name() (E002) and an expression that multiplies rows, and each is fixed on its
    # own. A falsey value never reaches here — the chain above reads it as "not configured".
    if has_lookup and isinstance(has_lookup, str):
        errors.extend(_validate_lookup_expression_path(model, has_lookup))
        errors.extend(_validate_default_manager(model))

    errors.extend(_validate_select_related_pairing(model))

    return errors


def _formatted_name_is_python_only(model):
    """
    Return True when the model's formatted_name is computed by get_formatted_name(), leaving the
    database nothing to sort by: no formatted_name column of its own, and no
    formatted_name_lookup_expression for VuedaViewSet.get_queryset to annotate onto the queryset.
    """
    try:
        model._meta.get_field("formatted_name")
    except FieldDoesNotExist:
        pass
    else:
        return False

    if isinstance(getattr(model, "formatted_name_lookup_expression", None), str):
        return False

    return callable(getattr(model, "get_formatted_name", None))


def _names_formatted_name(ordering):
    """Return True when an ``ordering``/``ordering_fields``/``Meta.ordering`` declaration names formatted_name."""
    if not ordering:
        return False

    # Both a viewset's `ordering` and its `ordering_fields` may be a bare string rather than a
    # list/tuple. `ordering_fields = "__all__"` means every model field, which for a model with no
    # formatted_name column doesn't include one.
    if isinstance(ordering, str):
        ordering = (ordering,)

    # A term names formatted_name whether it is written as a plain name, as an ordering expression
    # (`F("formatted_name").asc(nulls_first=True)`), or with a scalar function over it
    # (`Lower("formatted_name")`), and a term built on several fields is caught if any one of them is
    # the formatted name. Only the model's own un-prefixed name counts: a related
    # `customer__formatted_name` is the related model's to resolve, not this one's.
    return any(field_name == FORMATTED_NAME for term in ordering for field_name in ordering_term_field_names(term))


def _validate_formatted_name_ordering(model, viewset, *, include_model_ordering=True):
    """
    Report ordering declared on a formatted_name that only exists in Python.

    A get_formatted_name() method is computed per object, so there is no column or annotation for
    the database to sort by, and sorting in Python would mean loading every row of the table.

    ``include_model_ordering`` is how the caller keeps ``Meta.ordering`` from being reported once per
    registration. The viewset half has to run for every registration, because two viewsets on the
    same model can declare different orderings, but the model half is the same answer every time.
    """
    if not _formatted_name_is_python_only(model):
        return []

    declarations = []
    if include_model_ordering and _names_formatted_name(model._meta.ordering):
        declarations.append(f"{model.__name__}.Meta.ordering")

    if viewset is not None:
        for attr_name in ("ordering", "ordering_fields"):
            if _names_formatted_name(getattr(viewset, attr_name, None)):
                declarations.append(f"{viewset.__name__}.{attr_name}")

    if not declarations:
        return []

    return [
        Error(
            f"Ordering by formatted_name is declared in {', '.join(declarations)}, but "
            f"{model.__name__}.formatted_name is computed by get_formatted_name().",
            hint=(
                "formatted_name cannot be used for ordering alongside a get_formatted_name() method: "
                "the value is computed in Python, so the database has no column to sort by, and "
                "sorting in Python would mean loading every row. Set "
                "formatted_name_lookup_expression to a database path instead, or order by a "
                "different field."
            ),
            obj=model,
            id="vueda_info.E005",
        )
    ]


def _queryset_annotation_names(viewset):
    """
    The annotations a viewset's own queryset carries, which are orderable without being model fields.

    ``None`` when the queryset can't be built at check time — a ``get_queryset`` that reaches for
    ``self.request`` raises here, and without knowing its annotations a term can't be judged.
    """
    try:
        return set(viewset().get_queryset().query.annotations)
    except Exception:
        # Any failure here means the annotations are simply unknown, which is not the check's business.
        return None


def _ordering_path_resolves(model, path):
    """
    Whether an ordering path names a field, a path through the model's relations, or a lookup.

    Resolving follows the same rules the metadata does, so a path the metadata resolves (a "pk" alias,
    or a formatted_name reached through a lookup expression) is never reported as if it were broken.
    An annotation on the viewset's queryset resolves to nothing here, so a caller checks those first.
    """
    try:
        for expanded in expand_ordering_pk(model, path):
            ordering_fields_from_path(model, expanded)
    except (FieldDoesNotExist, NotRelationField):
        return False

    return True


def _requestable_ordering_names(viewset):
    """
    The ``__``-joined names that a list request can sort a viewset by.

    These are the names ``VuedaOrderingFilter.get_valid_fields`` accepts: the ``ordering_fields``
    entries, every field that the default ordering names, and the field behind each ``"pk"`` alias.
    The filter translates a ``?o=`` term to one of these names before it applies a nulls placement,
    and a default ordering term written as a string already is one. A placement keyed on any other
    name is never applied.

    The view is built without a request, the same way ``_queryset_annotation_names`` builds it, and is
    given the ``list`` action that ``?o=`` is sent to. When ``ordering_fields`` isn't declared, DRF
    builds the viewset's serializer to read its fields. The context carries the view because a
    serializer mixin may read ``context["view"].action`` to decide what those fields are.

    ``None`` when the names can't be read at check time. A serializer or ``get_queryset`` that needs
    the request raises here, and without the names nothing can be judged.
    """
    from vueda.core.filters import VuedaOrderingFilter

    try:
        view = viewset()
        queryset = view.get_queryset()
        view.action = "list"
        valid_fields = VuedaOrderingFilter().get_valid_fields(queryset, view, {"view": view})
    except Exception:
        # Any failure here means the names are simply unknown, which is not the check's business.
        return None

    return {item[0] for item in valid_fields if isinstance(item[0], str)}


def _validate_ordering_declarations(model, viewset):
    """
    Report a viewset's ``ordering``/``ordering_fields`` terms that name no orderable path.

    Django's own ``models.E015`` already covers a model's ``Meta.ordering``, but nothing covers the
    same drift on a viewset, where it is just as easy: a field renamed or removed leaves the
    declaration behind. What happens next depends on which attribute holds the stale term. An
    ``ordering`` term fails every list request that doesn't override it with ``?o=``, because DRF
    hands a viewset's default ordering to ``order_by()`` without validating it. An ``ordering_fields``
    entry fails nothing at all: the model-info metadata leaves it out of the fields it advertises, so
    no client is offered it, and DRF only raises if one asks for that exact name anyway. That one is
    silent everywhere, which is what this check is for.
    """
    if viewset is None:
        return []

    annotation_names = _queryset_annotation_names(viewset)
    if annotation_names is None:
        return []

    errors = []
    for attr_name in ("ordering", "ordering_fields"):
        declaration = getattr(viewset, attr_name, None)

        # Both may be a bare string rather than a list/tuple. `ordering_fields = "__all__"` is DRF's
        # shorthand for the model's own fields, which resolve by definition.
        if not declaration or declaration == "__all__":
            continue

        if isinstance(declaration, str):
            declaration = (declaration,)

        # An `ordering_fields` entry may be a `(field_name, label)` pair rather than a plain name, so
        # the name is read off it before the term walk below, which knows ordering terms and would
        # find no field path in a pair. Without this a stale pair is reported by nothing: the
        # metadata drops it for the same reason it drops a stale name. A viewset's `ordering` takes
        # no such pair — Django's `order_by()` wouldn't accept one — so only this attribute is read
        # that way.
        if attr_name == "ordering_fields":
            declaration = [name for name in map(ordering_fields_entry_name, declaration) if name is not None]

        # A term carries no path at all when it is `"?"` or an expression built on no column, and
        # several when a scalar function reads more than one (`Concat("first_name", "last_name")`).
        # Every path a term names has to resolve for the ordering to run, so each one is checked on
        # its own and reported by name rather than by the term it came from.
        for term in declaration:
            for path in ordering_term_field_names(term):
                if path in annotation_names:
                    continue

                # A formatted_name computed in Python resolves to nothing either, but
                # `vueda_info.E005` already reports that with an answer specific to it, so it isn't
                # reported twice.
                if _names_formatted_name((path,)) and _formatted_name_is_python_only(model):
                    continue

                if not _ordering_path_resolves(model, path):
                    # What a stale term costs depends on which attribute holds it, so the hint says
                    # which of the two this is rather than describing both.
                    if attr_name == "ordering":
                        consequence = ", and a list request that falls back to this ordering fails with a `FieldError`."
                    else:
                        consequence = ", so clients are never offered this field to order by."

                    errors.append(
                        Error(
                            f"Ordering by '{path}' is declared in {viewset.__name__}.{attr_name}, but "
                            f"{model.__name__} has no such field, related field, or lookup.",
                            hint=(
                                f"Point it at a field {model.__name__} has, at a path through its "
                                "relations, or at an annotation the viewset's own `get_queryset` adds. "
                                "Model-info metadata leaves what it can't resolve out of "
                                f"`model_ordering`{consequence}"
                            ),
                            obj=viewset,
                            id="vueda_info.E006",
                        )
                    )

    return errors


def check_formatted_name_configuration(app_configs, **kwargs):
    """Report models whose ``formatted_name`` or ``<field>_lookup_expression`` configuration cannot resolve (``vueda_info.E001`` to ``E005``, ``E008``, ``E009``, ``E011``)."""
    from vueda.info.registration import get_all_registrations

    errors = []
    checked_models = set()
    models_with_ordering_checked = set()

    for _key, registration in get_all_registrations().items():
        serializer_class = registration["serializer"]
        model = serializer_class.Meta.model
        if model not in checked_models:
            checked_models.add(model)
            errors.extend(_validate_model_formatted_name(model))

        # Ordering is validated per registration rather than per model, because the declaration being
        # checked can live on the registered viewset as well as on the model. Only the model's own
        # `Meta.ordering` is held to one report across registrations, so two viewsets on the same
        # model don't produce the same message twice.
        errors.extend(
            _validate_formatted_name_ordering(
                model,
                registration["viewset"],
                include_model_ordering=model not in models_with_ordering_checked,
            )
        )
        models_with_ordering_checked.add(model)

        # Also validate models referenced in expandable_fields so misconfigured
        # related models are caught even if they are not directly registered.
        expandable = getattr(getattr(serializer_class, "Meta", None), "expandable_fields", {})
        for _field_name, field_data in expandable.items():
            child_serializer_class = field_data[0] if isinstance(field_data, tuple) else field_data
            if isinstance(child_serializer_class, str):
                continue  # lazy-loaded; cannot resolve at check time
            child_model = getattr(getattr(child_serializer_class, "Meta", None), "model", None)
            if child_model and child_model not in checked_models:
                checked_models.add(child_model)
                errors.extend(_validate_model_formatted_name(child_model))

    return errors


def _unrequestable_nulls_ordering_error(model, viewset, attr_name, label, field_name, requestable_keys):
    """
    An error for a ``nulls_ordering`` or ``nulls_ordering_flip`` entry that names no field a list
    request can sort by. ``None`` when the entry names one.

    The filter looks a placement up by the exact ``__``-joined term it is about to order by, so an
    entry naming anything else applies nothing, and nothing fails. The hint says which of three
    mistakes this is, because each has a different fix:

    - A dotted entry whose ``__``-joined form works. ``?o=`` is dotted, so this is the likeliest
      spelling mistake, and the hint names the spelling the declaration needs.
    - An entry that resolves to a field that ``ordering_fields`` and the default ordering leave out.
      No request reaches that field, so its placement has nothing to apply to.
    - An entry that resolves to nothing at all.

    ``requestable_keys`` holds the ``ordering_field_key`` of each name a request can sort by, so a
    ``"pk"`` alias and the field behind it match each other here the same way the filter matches them.
    """

    def requestable(path):
        return ordering_field_key(model, path) in requestable_keys

    if requestable(field_name):
        return None

    annotation_names = _queryset_annotation_names(viewset) or set()

    def resolves(path):
        return requestable(path) or path in annotation_names or _ordering_path_resolves(model, path)

    spelling = field_name
    hint_parts = []
    if PUBLIC_PATH_SEP in field_name:
        candidate = public_ordering_path_to_orm(field_name)
        if resolves(candidate):
            spelling = candidate
            hint_parts.append(
                f"Write it as '{candidate}'. `{attr_name}` uses `__`-joined paths, the same as `ordering`; "
                "only the `?o=` query parameter is dotted."
            )

    if not requestable(spelling):
        if resolves(spelling):
            hint_parts.append(
                f"Add '{spelling}' to `ordering_fields`, or remove it from `{attr_name}`. A list request can "
                "only sort by a field that `ordering_fields` or the default ordering names."
            )
        else:
            hint_parts.append(
                f"{model.__name__} has no field, related field, or lookup at that path for the database to sort by."
            )

    hint_parts.append(
        "As declared, the placement is never applied, so nulls arrive wherever the database puts them by default."
    )

    return Error(
        f"{label} names no field that a list request can sort {viewset.__name__} by.",
        hint=" ".join(hint_parts),
        obj=viewset,
        id="vueda_info.E007",
    )


def _validate_nulls_ordering(model, viewset):
    """
    Report a viewset's ``nulls_ordering`` entries that name no usable nulls placement.

    ``VuedaOrderingFilter`` turns a placement into the ``nulls_first``/``nulls_last`` keyword of
    ``F().asc()``/``F().desc()``, so only ``"first"`` and ``"last"`` have a keyword to become.
    Anything else is ignored at request time rather than raising, which keeps a list endpoint working
    but silently drops the placement the declaration asked for — so the declaration is what gets
    reported.

    ``nulls_ordering_flip`` names fields rather than placements, and a name in it that
    ``nulls_ordering`` doesn't cover simply has no placement to flip, so it is reported here too:
    it means the pair was meant to work together and one half is missing.

    Both declarations are validated on every run, and every problem found in either is reported. The
    two are separate attributes that fail independently, so stopping at the first would hide the rest
    of the work behind however many ``manage.py check`` runs it took to walk them one at a time. An
    unusable ``nulls_ordering`` is read as giving no field a placement, which is what it does, so each
    ``nulls_ordering_flip`` entry is then reported as having nothing to flip — accurate, and it goes
    away with the one fix that caused it.

    An entry in either declaration must also name a field that a list request can sort by. The filter
    looks a placement up by the ``__``-joined term it orders by, so an entry naming anything else is
    never applied (see ``_unrequestable_nulls_ordering_error``). The flip entry is checked on its own
    even when ``nulls_ordering`` names the same field, because each declaration needs its own fix.
    """
    if viewset is None:
        return []

    errors = []

    # `or {}` first, so an empty declaration of any type — `{}`, `[]`, `None` — reads as "not
    # declared" and reports nothing. Only a non-empty value reaches the type check below, which is the
    # only case where the author meant something the filter can't use.
    nulls_ordering = getattr(viewset, "nulls_ordering", None) or {}
    if isinstance(nulls_ordering, dict):
        for field_name, placement in nulls_ordering.items():
            if placement in NULLS_PLACEMENTS:
                continue

            errors.append(
                Error(
                    f"{viewset.__name__}.nulls_ordering['{field_name}'] is {placement!r}, which is not a "
                    "nulls placement.",
                    hint=(
                        "Use "
                        f"{' or '.join(repr(valid_placement) for valid_placement in sorted(NULLS_PLACEMENTS))}. "
                        "Ordering by this field still works; the nulls placement is ignored, so nulls "
                        "arrive wherever the database puts them by default."
                    ),
                    obj=viewset,
                    id="vueda_info.E007",
                )
            )
    else:
        errors.append(
            Error(
                f"{viewset.__name__}.nulls_ordering is a {type(nulls_ordering).__name__}, not a dict.",
                hint=(
                    "Declare it as a dict of field name -> "
                    f"{' or '.join(repr(placement) for placement in sorted(NULLS_PLACEMENTS))}, e.g. "
                    '`nulls_ordering = {"due_date": "first"}`.'
                ),
                obj=viewset,
                id="vueda_info.E007",
            )
        )
        # Nothing to look a field up in, so the flip pass below reports each of its entries as
        # unpaired rather than being skipped along with the declaration it depends on.
        nulls_ordering = {}

    nulls_ordering_flip = getattr(viewset, "nulls_ordering_flip", None) or ()
    if isinstance(nulls_ordering_flip, str):
        nulls_ordering_flip = (nulls_ordering_flip,)
    elif not isinstance(nulls_ordering_flip, Iterable):
        errors.append(
            Error(
                f"{viewset.__name__}.nulls_ordering_flip is a {type(nulls_ordering_flip).__name__}, not a "
                "list of field names.",
                hint=(
                    "Declare it as a list or tuple of the field names whose nulls placement should "
                    'flip when sorted descending, e.g. `nulls_ordering_flip = ["due_date"]`. A single '
                    "field name may be given as a bare string."
                ),
                obj=viewset,
                id="vueda_info.E007",
            )
        )
        # No field names to read, so there is nothing left for the flip pass to report.
        nulls_ordering_flip = ()

    # Each entry is also checked against the names a list request can sort by. That needs the viewset
    # built, so the entries are collected first and the viewset is built once, only when there is
    # something to check. Only a string can match a term the filter orders by.
    entries = [
        ("nulls_ordering", f"{viewset.__name__}.nulls_ordering['{field_name}']", field_name)
        for field_name in nulls_ordering
        if isinstance(field_name, str)
    ]

    placement_keys = {
        ordering_field_key(model, field_name) for field_name in nulls_ordering if isinstance(field_name, str)
    }

    for field_name in nulls_ordering_flip:
        if isinstance(field_name, str):
            entries.append(
                ("nulls_ordering_flip", f"'{field_name}' in {viewset.__name__}.nulls_ordering_flip", field_name)
            )

        # The filter pairs a flip entry with a placement the same way it pairs a request term with
        # one, so a "pk" alias and the field behind it pair with each other here too.
        if field_name in nulls_ordering or (
            isinstance(field_name, str) and ordering_field_key(model, field_name) in placement_keys
        ):
            continue

        errors.append(
            Error(
                f"'{field_name}' is listed in {viewset.__name__}.nulls_ordering_flip, but "
                f"{viewset.__name__}.nulls_ordering gives it no placement to flip.",
                hint=(
                    "Add it to `nulls_ordering` with the placement it should use when sorted "
                    "ascending, or remove it from `nulls_ordering_flip`."
                ),
                obj=viewset,
                id="vueda_info.E007",
            )
        )

    # A "pk" that stands for several columns reaches only a list sorted by `pk` itself.
    # `model_ordering` advertises each column of a composite key separately, so a metadata-driven
    # client sorts by one column at a time, and only a placement keyed on that column matches the
    # term. A composite "pk" entry is reported when its own declaration leaves out any of the columns,
    # and is not checked again below. Once every column is declared too, it is checked like any other
    # entry.
    flip_keys = {
        ordering_field_key(model, field_name) for field_name in nulls_ordering_flip if isinstance(field_name, str)
    }
    declared_keys = {"nulls_ordering": placement_keys, "nulls_ordering_flip": flip_keys}
    checked_entries = []
    for attr_name, label, field_name in entries:
        columns = ordering_field_key(model, field_name)
        missing_columns = [column for column in columns if (column,) not in declared_keys[attr_name]]
        if len(columns) == 1 or not missing_columns:
            checked_entries.append((attr_name, label, field_name))
            continue

        missing = ", ".join(repr(column) for column in missing_columns)
        errors.append(
            Error(
                f"{label} names a primary key made of {len(columns)} columns, but `{attr_name}` leaves out {missing}.",
                hint=(
                    f"Add {missing} to `{attr_name}` as well. `model_ordering` advertises each column of the "
                    "key separately, so a client sorts by one column at a time, and only a placement on that "
                    f"column reaches the request. The placement on '{field_name}' still applies when the list "
                    "is sorted by the whole key."
                ),
                obj=viewset,
                id="vueda_info.E007",
            )
        )
    entries = checked_entries

    if entries:
        requestable_names = _requestable_ordering_names(viewset)
        # Unknown names leave nothing to judge an entry against, the same way `vueda_info.E006`
        # stays quiet when the viewset's annotations are unknown.
        if requestable_names is not None:
            requestable_keys = {ordering_field_key(model, name) for name in requestable_names}
            for attr_name, label, field_name in entries:
                error = _unrequestable_nulls_ordering_error(
                    model, viewset, attr_name, label, field_name, requestable_keys
                )
                if error is not None:
                    errors.append(error)

    return errors


def _effective_nulls_placement(term, ascending):
    """
    The nulls placement an ordering term states, or ``None`` when it sorts nulls where PostgreSQL does
    by default.

    PostgreSQL puts nulls last in an ascending sort and first in a descending one. A term that states
    the default placement sorts exactly like one that states none, so both read as ``None`` and compare
    equal. Only a term that moves nulls to the other end has a placement worth comparing.
    """
    if getattr(term, "nulls_first", None):
        placement = "first"
    elif getattr(term, "nulls_last", None):
        placement = "last"
    else:
        return None

    default_placement = "last" if ascending else "first"
    return None if placement == default_placement else placement


def _comparable_ordering(model, ordering):
    """
    An ordering rendered as ``(directional path, nulls placement)`` pairs that can be compared with
    another ordering's, or ``None`` when a term in it has no single path to compare.

    Two orderings sort the same way when they name the same paths, in the same sequence, each in the
    same direction and with nulls at the same end. So each term becomes its path with a ``-`` for
    descending, paired with the nulls placement that moves away from PostgreSQL's default (see
    ``_effective_nulls_placement``), and the sequence is compared as a whole. A path is resolved
    through ``formatted_name_lookup_expression`` first, since a ``formatted_name`` and the column
    behind it are one sort under two names, and a declaration is free to use either.

    ``None`` is the answer for an ordering this can say nothing about, so a caller stays quiet rather
    than guessing. A term reads no column at all (``"?"``, ``Now()``) or more than one
    (``Concat("first_name", "last_name")``), and neither has a path that stands for the sort it
    performs — the same terms ``model_ordering.default`` withholds, for the same reason.

    Direction is part of the comparison because reversing it is the one difference that shows up in
    every row of a response while looking like agreement in a diff: ``queued`` and ``-queued`` name
    the same field and sort the opposite way. Nulls placement is part of it for the same reason, on
    the rows whose value is null.
    """
    if not ordering:
        return []

    # Both a viewset's `ordering` and a model's `Meta.ordering` may be a bare string rather than a
    # list/tuple, which would otherwise be walked character by character.
    if isinstance(ordering, str):
        ordering = (ordering,)

    comparable = []
    for term in ordering:
        for expanded in expand_ordering_pk(model, term):
            field_names = ordering_term_field_names(expanded)
            if len(field_names) != 1:
                return None

            field_name = field_names[0]
            path = resolve_formatted_name_path(model, field_name) or field_name
            ascending = ordering_term_is_ascending(expanded)
            prefix = "" if ascending else "-"
            comparable.append((f"{prefix}{path}", _effective_nulls_placement(expanded, ascending)))

    return comparable


def _format_ordering_terms(terms):
    """The comparable terms of an ordering, quoted for a check message, each with any nulls placement."""
    return ", ".join(f"'{path}' (nulls {placement})" if placement else f"'{path}'" for path, placement in terms)


def _ordering_declaration(terms):
    """
    The viewset declaration that sorts the way the comparable ``terms`` do, as source to quote in a
    hint.

    A term with a nulls placement goes into ``nulls_ordering`` rather than into an expression in
    ``ordering``, since ``nulls_ordering`` keeps the placement on a client's ``?o=`` request too.
    """
    declaration = f"`ordering = [{', '.join(repr(path) for path, _placement in terms)}]`"
    placements = {path.removeprefix("-"): placement for path, placement in terms if placement}
    if placements:
        declaration += f" with `nulls_ordering = {placements!r}`"

    return declaration


def _list_queryset(viewset):
    """
    The queryset a list request on the viewset starts from, as far as a check can build it.

    That is what ``get_queryset()`` returns, called on a view built without a request, the same way
    ``_queryset_annotation_names`` builds it. A ``get_queryset()`` that needs the request raises here,
    and the class-level ``queryset`` is used instead. ``None`` when neither is available.
    """
    try:
        return viewset().get_queryset()
    except Exception:
        # Any failure here means only that the method needs a request, which is not the check's
        # business. The class attribute is still a declaration the check can read.
        return getattr(viewset, "queryset", None)


def _orders_by_own_annotation(queryset, ordering):
    """
    Whether an ordering names an annotation that the queryset itself adds.

    ``formatted_name`` doesn't count. ``FormattedNameManager`` adds it to every queryset of a model
    that reaches the name through a lookup expression, and ``Meta.ordering`` can name it, so an
    ordering by it is not one that only a manager can hold.
    """
    annotation_names = set(queryset.query.annotations) - {FORMATTED_NAME}
    return any(name in annotation_names for term in ordering for name in ordering_term_field_names(term))


def _default_manager_ordering(model):
    """
    The ordering terms that the model's default manager puts on every queryset it builds, and whether
    they name an annotation that the manager adds.

    The terms are empty when the manager applies no ordering, and also when it can't build a queryset
    at check time. ``vueda_info.E015`` reports a default manager's ordering itself, unless it names
    such an annotation.
    """
    try:
        queryset = model._default_manager.all()
    except Exception:
        # A manager that can't build a queryset without a request has no ordering to read here.
        return [], False

    ordering = queryset_explicit_ordering(queryset)
    return ordering, _orders_by_own_annotation(queryset, ordering)


def _validate_queryset_ordering(model, viewset):
    """
    Report a viewset whose list queryset orders by something its declarations don't.

    DRF's ``OrderingFilter`` reads a view's ``ordering`` and nothing else. When that isn't declared it
    applies no ordering at all, so an ``order_by()`` on the queryset a list request starts from
    survives the filter backends and orders the response. Meanwhile ``model_ordering.default``, which
    reports ``ordering`` falling back to the model's ``Meta.ordering``, describes an ordering that the
    request never applied. The rows and the metadata disagree, and nothing in a passing test suite has
    to notice.

    The queryset is what ``get_queryset()`` returns, built without a request (see ``_list_queryset``).
    This reads the ordering that queryset carries, not the call that put it there: an ``order_by()``,
    a custom QuerySet method that calls one, and the class-level ``queryset`` attribute all leave the
    same terms on the query. A ``get_queryset()`` that needs the request falls back to the class-level
    ``queryset``. An ordering that varies by request is out of reach of any startup check, and the
    documentation says so (see the "Queryset Ordering" section of
    ``docs/core-concepts/filtering-and-ordering-semantics.md``).

    An ordering that is exactly the model's default manager's is usually not reported here. When it
    names no annotation of the manager's, ``vueda_info.E015`` reports it once for the model, and
    reporting it here would repeat that for every viewset. When it names one, it is allowed, and a
    model that declares no ``Meta.ordering`` simply has no default to report. One case is still
    reported here: an annotation ordering on a model whose ``Meta.ordering`` disagrees, with no
    ``ordering`` on the viewset. ``model_ordering.default`` then describes ``Meta.ordering`` while the
    rows arrive in the manager's order, and the viewset can fix that by declaring its own ``ordering``,
    since the annotation is on its list queryset. ``Meta.ordering`` still applies wherever code goes
    around the default manager, such as a second manager or ``Model._base_manager``, so the model
    itself is not wrong.

    Three shapes get three messages, because the fix differs:

    - ``ordering`` is declared and disagrees. The declaration wins on every list request, so the
      metadata is accurate and the queryset's ordering is dead weight that reads as if it were in
      force.
    - ``ordering`` is absent and the model's ``Meta.ordering`` disagrees. The queryset's ordering is
      what arrives and the model's is what gets reported.
    - Neither is declared. The queryset's ordering is what arrives and the metadata reports no
      default ordering at all.

    The comparison includes nulls placement. A declared ``ordering`` has the viewset's
    ``nulls_ordering`` applied first, the same way ``VuedaOrderingFilter`` applies it on a list
    request. ``Meta.ordering`` does not, because the filter never sees it.

    An ordering either side of the comparison has no single path for — ``"?"``, a multi-column
    expression — is not judged, since there is nothing to compare it against with any confidence.
    """
    from vueda.core.filters import VuedaOrderingFilter

    if viewset is None:
        return []

    queryset = _list_queryset(viewset)
    if queryset is None:
        return []

    explicit_ordering = queryset_explicit_ordering(queryset)
    if not explicit_ordering:
        # Nothing on the queryset to compare.
        return []

    viewset_ordering = getattr(viewset, "ordering", None)

    manager_ordering, manager_orders_by_annotation = _default_manager_ordering(model)
    # An ordering that came from the default manager is this viewset's to fix only when it names an
    # annotation of the manager's, disagrees with a declared `Meta.ordering`, and the viewset declares
    # no `ordering`. Every other case is reported once by `vueda_info.E015` or describes nothing wrong.
    from_default_manager = bool(manager_ordering) and explicit_ordering == manager_ordering
    if from_default_manager and (not manager_orders_by_annotation or viewset_ordering or not model._meta.ordering):
        return []

    queryset_terms = _comparable_ordering(model, explicit_ordering)
    if not queryset_terms:
        # Nothing there that can be compared.
        return []

    if viewset_ordering:
        if isinstance(viewset_ordering, str):
            viewset_ordering = (viewset_ordering,)
        declared_ordering = VuedaOrderingFilter.apply_nulls_ordering(viewset_ordering, viewset, model)
    else:
        declared_ordering = model._meta.ordering

    declared_terms = _comparable_ordering(model, declared_ordering)
    if declared_terms is None or declared_terms == queryset_terms:
        return []

    # Name the place the ordering was written. The class attribute is the source unless
    # `get_queryset()` changed the ordering it started from.
    class_queryset = getattr(viewset, "queryset", None)
    from_get_queryset = class_queryset is None or explicit_ordering != queryset_explicit_ordering(class_queryset)
    if from_get_queryset:
        source = f"{viewset.__name__}.get_queryset()"
        location = "`get_queryset()`"
    else:
        source = f"{viewset.__name__}.queryset"
        location = "the queryset"

    formatted_queryset_terms = _format_ordering_terms(queryset_terms)
    formatted_declared_terms = _format_ordering_terms(declared_terms)
    move_it = (
        f"Declare it as {_ordering_declaration(queryset_terms)} on {viewset.__name__} instead, so the "
        "ordering DRF applies is the one `model_ordering.default` reports"
    )

    if viewset_ordering:
        message = (
            f"{source} orders by {formatted_queryset_terms}, which "
            f"{viewset.__name__}.ordering ({formatted_declared_terms}) replaces on every list request."
        )
        hint = (
            f"Remove the `order_by()` from {location}, or make the two agree. DRF's ordering "
            f"backend applies {viewset.__name__}.ordering, so the queryset's ordering reaches no "
            "response and no metadata; leaving it in place reads as if it were the default order."
        )
    elif model._meta.ordering:
        message = (
            f"{source} orders by {formatted_queryset_terms}, but the default ordering "
            f"reported for it comes from {model.__name__}.Meta.ordering ({formatted_declared_terms}), which "
            "no list request here applies."
        )
        hint = (
            f"{move_it}. DRF's ordering backend reads a view's `ordering` and nothing else, so with "
            "none declared it applies no ordering and the queryset's own survives to the response — "
            f"while `model_ordering.default` falls back to {model.__name__}.Meta.ordering and "
            "describes a different order to every client. Dropping the `order_by()` is the other "
            "answer, and reverses the list."
        )
    else:
        message = (
            f"{source} orders by {formatted_queryset_terms}, which neither "
            f"{viewset.__name__}.ordering nor {model.__name__}.Meta.ordering declares."
        )
        hint = (
            f"{move_it}. A list request arrives in the queryset's order, and DRF's ordering backend "
            "never sees that ordering, so `model_ordering.default` reports no default ordering at "
            "all and a client can't show which column the rows are sorted by."
        )

    return [Error(message, hint=hint, obj=viewset, id="vueda_info.E010")]


def _validate_default_manager_ordering(model):
    """
    Report a default manager that orders every query of its model by something ``Meta.ordering``
    could declare, or whose query names something it cannot resolve.

    A model's default manager sorts every query that names no other manager: the admin, related
    lookups, and the expanded children ``VuedaViewSet`` loads through ``_default_manager``. Django's
    declaration for that model-wide order is ``Meta.ordering``, which is what ``model_ordering.default``
    reads. An ``order_by()`` in the manager is the same default, declared where the metadata never
    looks.

    The manager is ``model._default_manager``, which Django resolves from ``Meta.default_manager_name``
    or else from the first manager declared on the model or its bases. Its attribute name doesn't
    matter, and any other manager is left alone: it orders only the code that names it, the same as
    a QuerySet method, and a viewset that starts from it is compared by ``vueda_info.E010``.

    An ordering that sorts by an annotation the manager adds is allowed, however simple or complex the
    annotation is. ``Meta.ordering`` cannot name an annotation, and an aggregate such as
    ``Count("items")`` there fails every query with a ``GROUP BY`` error, so the manager is the only
    place such an ordering can live. Plain-field tie-breakers alongside it are allowed too, because a
    manager's ``order_by()`` replaces ``Meta.ordering`` entirely and the tie-breakers can't move there
    on their own. ``formatted_name`` doesn't count as such an annotation: ``FormattedNameManager``
    adds it, and ``Meta.ordering`` can name it.

    A name the manager's query cannot resolve is reported too, because a manager builds its queryset
    only when code first uses it, so nothing fails when the model is imported. Django rejects a
    misspelled plain string name inside ``order_by()``, which raises as soon as the manager builds its
    queryset. It resolves an ``F()`` name or a transform only when a query runs, so the queryset is
    also compiled with ``sql_with_params()``, which resolves every name without touching the database.
    Either ``FieldError`` is reported, so a misspelling is a startup error rather than a failure on the
    first query.
    """
    manager = model._default_manager

    def unresolvable_name_error(error):
        return Error(
            f"{model.__name__}.{manager.name}, the default manager, builds a query that names something it "
            f"cannot resolve: {error}",
            hint=(
                "Fix the name in the manager's `get_queryset()`. A manager builds its queryset only when code "
                f"first uses it, so nothing fails when {model.__name__} is imported, and the first query of "
                f"{model.__name__} would raise this `FieldError`."
            ),
            obj=model,
            id="vueda_info.E015",
        )

    try:
        queryset = manager.all()
    except FieldError as error:
        return [unresolvable_name_error(error)]
    except Exception:
        # A manager that can't build a queryset without a request has nothing to read here.
        return []

    ordering = queryset_explicit_ordering(queryset)
    if not ordering:
        return []

    try:
        queryset.query.sql_with_params()
    except FieldError as error:
        return [unresolvable_name_error(error)]
    except Exception:
        # A query that can't be compiled for another reason, such as an empty `none()` queryset, says
        # nothing about whether the ordering names resolve.
        return []

    if _orders_by_own_annotation(queryset, ordering):
        return []

    terms = _comparable_ordering(model, ordering)
    described = f"by {_format_ordering_terms(terms)}" if terms else "with an `order_by()` of its own"

    return [
        Error(
            f"{model.__name__}.{manager.name}, the default manager, orders every query of {model.__name__} "
            f"{described}, which `model_ordering.default` never reports.",
            hint=(
                f"Declare the ordering as {model.__name__}.Meta.ordering and remove the `order_by()` from "
                "the manager. `Meta.ordering` is the model-wide default that Django, DRF, and "
                "`model_ordering.default` all read. A default manager may keep an ordering that sorts by "
                "an annotation it adds, since `Meta.ordering` cannot name one."
            ),
            obj=model,
            id="vueda_info.E015",
        )
    ]


def check_ordering_configuration(app_configs, **kwargs):
    """Report viewset and model ordering that model info cannot describe (``vueda_info.E006``, ``E007``, ``E010``, ``E015``)."""
    from vueda.info.registration import get_all_registrations

    errors = []
    models_with_manager_checked = set()

    # Per registration rather than per model: the declarations being checked live on the viewset, and
    # two viewsets on the same model can declare different orderings. Only the default manager belongs
    # to the model, so it is checked once however many viewsets the model has.
    for _key, registration in get_all_registrations().items():
        model = registration["serializer"].Meta.model
        if model not in models_with_manager_checked:
            models_with_manager_checked.add(model)
            errors.extend(_validate_default_manager_ordering(model))

        errors.extend(_validate_ordering_declarations(model, registration["viewset"]))
        errors.extend(_validate_queryset_ordering(model, registration["viewset"]))
        errors.extend(_validate_nulls_ordering(model, registration["viewset"]))

    return errors


def check_filter_query_param_configuration(app_configs, **kwargs):
    """Report filtersets whose filters bind the same public query parameter."""
    from django_filters.filterset import BaseFilterSet

    from vueda.core.viewsets import iter_filterset_query_param_names
    from vueda.info.registration import get_all_registrations

    errors = []
    for registration in get_all_registrations().values():
        viewset = registration["viewset"]
        filterset_class = getattr(viewset, "filterset_class", None)
        if filterset_class is None:
            continue

        # Only the declared filters are needed. Custom constructors can query tables that do not
        # exist before migrations, so build the instance copy through django-filter's base initializer.
        model = filterset_class._meta.model or registration["serializer"].Meta.model
        queryset = model._default_manager.none()
        filterset = filterset_class.__new__(filterset_class)
        BaseFilterSet.__init__(filterset, queryset=queryset)

        owners = {}
        for param_name, filter_name in iter_filterset_query_param_names(filterset):
            owners.setdefault(param_name, set()).add(filter_name)

        for param_name, filter_names in sorted(owners.items()):
            if len(filter_names) == 1:
                continue
            names = ", ".join(f"'{name}'" for name in sorted(filter_names))
            errors.append(
                Error(
                    f"{filterset_class.__name__} filters {names} all accept query parameter '{param_name}'.",
                    hint="Rename or remove a filter so each query parameter belongs to one filter.",
                    obj=viewset,
                    id="vueda_info.E012",
                )
            )

    return errors


def _filters_across_rows(queryset):
    """
    Whether a queryset filters on a value computed across rows: an aggregate, which Django compiles
    to ``HAVING``, or a window function, which it compiles to ``QUALIFY``. Such a filter depends on
    which rows the query holds, so it gives a different answer inside a search subquery that holds
    only the matching related rows.
    """
    where = queryset.query.where
    return where.contains_aggregate or where.contains_over_clause


def _names_nothing_on(search_queryset, path):
    """Whether a search path starts with a name that is neither a field of the model nor an annotation
    of the search queryset."""
    name = path.split(LOOKUP_SEP)[0]
    if name == PK_ALIAS or name in search_queryset.query.annotations:
        return False
    try:
        search_queryset.model._meta.get_field(name)
    except FieldDoesNotExist:
        return True
    return False


def _search_queryset_source(viewset, model, from_hook):
    return f"{viewset.__name__}.get_search_queryset()" if from_hook else f"{model.__name__}'s default manager"


def _unresolved_search_field_error(viewset, model, path, from_hook):
    name = viewset.__name__
    source = _search_queryset_source(viewset, model, from_hook)
    message = (
        f"{name}.search_fields names '{path}', which is neither a field of {model.__name__} nor an annotation "
        f"of {source}. {name}.search_fields reach through a multi-valued relation (a reverse foreign key or a "
        f"many-to-many), so the search matches inside a subquery built from {source}, and a search request "
        "fails with a FieldError."
    )
    if from_hook:
        hint = f"Add the '{path}' annotation to {name}.get_search_queryset()."
    else:
        hint = (
            f"If '{path}' names an annotation {name}.get_queryset() adds, define {name}.get_search_queryset() "
            f"returning a {model.__name__} queryset with the same annotation and no filters."
        )
    return Error(message, hint=hint, obj=viewset, id="vueda_info.E014")


def _search_queryset_filter_error(viewset):
    name = viewset.__name__
    message = (
        f"{name}.get_search_queryset() filters on an aggregate or a window function, and {name}.search_fields "
        "reach through a multi-valued relation (a reverse foreign key or a many-to-many). The search matches "
        "inside a subquery that holds only the matching related rows, where that filter gives a different "
        "answer, so the search drops objects that match."
    )
    hint = (
        "Remove that filter from get_search_queryset(). The viewset's queryset applies its filters outside the "
        "subquery, where they see every related row."
    )
    return Error(message, hint=hint, obj=viewset, id="vueda_info.E014")


def _validate_search_queryset(model, viewset):
    """
    Report a viewset whose search through a multi-valued relation can't match against its search
    queryset. See ``VuedaSearchFilterBackend.get_search_queryset``.

    The search queryset is what ``get_search_queryset()`` returns when the viewset defines one, and
    the model's default manager otherwise. The check reports two problems with it:

    - A ``search_fields`` entry that names neither a model field nor an annotation of the search
      queryset, typically an annotation only the viewset's ``get_queryset()`` adds. A search request
      fails with a ``FieldError`` on it.
    - A ``get_search_queryset()`` that filters on an aggregate or a window function, which drops
      objects that match.

    A ``get_search_queryset()`` that can't be built outside a request, such as one that reads
    ``self.request``, is skipped, and so is a relation path that names no field.
    """
    from vueda.core.filters import VuedaSearchFilterBackend

    search_fields = getattr(viewset, "search_fields", None)
    backend_class = next(
        (backend for backend in viewset.filter_backends if issubclass(backend, VuedaSearchFilterBackend)), None
    )
    if not search_fields or backend_class is None:
        return []

    try:
        view = viewset()
        get_search_queryset = getattr(view, "get_search_queryset", None)
        from_hook = get_search_queryset is not None
        search_queryset = get_search_queryset() if from_hook else model._default_manager.all()

        backend = backend_class()
        paths = [backend.search_field_path(field) for field in search_fields]
        unresolved = [path for path in paths if _names_nothing_on(search_queryset, path)]
        multi_valued = backend.must_call_distinct(search_queryset, [path for path in paths if path not in unresolved])
    except Exception:
        # A queryset or a field path that can't be resolved here is unknown to this check, not its business.
        return []

    # A search that follows only foreign keys matches against the viewset's queryset itself, where the
    # viewset's own annotations resolve, so only a multi-valued search reads the search queryset.
    if not multi_valued:
        return []

    errors = [_unresolved_search_field_error(viewset, model, path, from_hook) for path in unresolved]
    if from_hook and _filters_across_rows(search_queryset):
        errors.append(_search_queryset_filter_error(viewset))
    return errors


def check_search_queryset_configuration(app_configs, **kwargs):
    """Report viewsets whose multi-valued search cannot run against the search queryset (``vueda_info.E014``)."""
    from vueda.info.registration import get_all_registrations

    errors = []
    for registration in get_all_registrations().values():
        model = registration["serializer"].Meta.model
        errors.extend(_validate_search_queryset(model, registration["viewset"]))

    return errors


def _column_totals_error(viewset, message, hint):
    return Error(message, hint=hint, obj=viewset, id="vueda_info.E013")


def _django_alias_problem(name):
    """
    What Django makes of ``name`` as a column alias: ``(error, deprecation)``, either may be None.

    Asked of Django rather than restated here, so the two can never disagree and a project is held
    to the rule its own Django enforces. The blocklist has grown across releases, and a percent sign
    is currently a deprecation that becomes an error in Django 7.0 -- restating either would mean
    keeping a copy in step with a rule that is still moving.

    ``check_alias`` reports both outcomes the way the ORM does, by raising and by warning, so both
    are collected here rather than only the one that stops a request.
    """
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            Query(None).check_alias(name)
        except ValueError as err:
            return str(err), None
    deprecation = next(
        (
            str(entry.message)
            for entry in caught
            if issubclass(entry.category, DeprecationWarning | PendingDeprecationWarning)
        ),
        None,
    )
    return None, deprecation


def _validate_column_total_name(viewset, name):
    """
    Report a ``column_totals`` key a client could not ask for, or the database could not be handed.

    The key is the name a client sends in the column totals query parameter and the alias
    ``queryset.aggregate()`` is called with, so it has to survive both. Django answers for the
    alias; see ``COLUMN_TOTAL_SEPARATOR_PATTERN`` for what the query parameter adds.

    A name Django only deprecates is reported as ``vueda_info.W002`` rather than an error, so a
    project keeps the behaviour its Django gives it today and hears about the upgrade that ends it.
    """
    if not isinstance(name, str):
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals declares a total named {name!r}, which is not a string.",
                hint=(
                    "A total's name is sent by a client, handed to `aggregate()` as an alias, and returned as a "
                    'JSON key, so it has to be text, e.g. `{"product_price": "product_option__price"}`.'
                ),
            )
        ]

    if not name:
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals declares a total with an empty name.",
                hint=(
                    "The column totals query parameter drops empty values, so an empty name is a total no "
                    "client could ask for. Name the total after the column it belongs under, e.g. "
                    '`{"product_price": "product_option__price"}`.'
                ),
            )
        ]

    if name in WILDCARD_VALUES:
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals declares a total named '{name}', which is a wildcard value.",
                hint=(
                    f"{', '.join(sorted(WILDCARD_VALUES))} are reserved: a client sends one of them to request "
                    "every declared total, so a total of that name could never be asked for on its own. Name "
                    "the total after the column it belongs under."
                ),
            )
        ]

    if COLUMN_TOTAL_SEPARATOR_PATTERN.search(name):
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals declares a total named {name!r}, which contains a comma.",
                hint=(
                    "The column totals query parameter separates the names it carries with commas, so a name "
                    "containing one is split into pieces that match no declared total and can never be "
                    "requested. Name the total after the column it belongs under."
                ),
            )
        ]

    error, deprecation = _django_alias_problem(name)
    if error:
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals declares a total named {name!r}, which Django will not accept "
                "as a column alias.",
                hint=(
                    f"{error} The name is handed to `aggregate()` as the alias the total comes back under, so "
                    'anything `aggregate()` refuses fails the request, e.g. `{"product_price": '
                    '"product_option__price"}`.'
                ),
            )
        ]

    if deprecation:
        # RemovedInDjango70Warning: when Django folds the percent sign into its own blocklist this
        # becomes unreachable, because `check_alias` will raise instead of warn. Remove it then.
        return [
            CheckWarning(
                f"{viewset.__name__}.column_totals declares a total named {name!r}, which Django deprecates as a "
                "column alias.",
                hint=(
                    f"{deprecation} It still works, and VUEDA still accepts it, but the Django release that "
                    "removes it will turn every list request asking for this total into a server error. Rename "
                    "the total before then."
                ),
                obj=viewset,
                id="vueda_info.W002",
            )
        ]

    return []


def _validate_column_total_path(model, viewset, name, path, annotation_names):
    """
    Report a ``column_totals`` value that can't be summed as declared.

    ``annotation_names`` are the annotations the viewset's own queryset carries, from
    :func:`_queryset_annotation_names`. A path naming one is accepted and checked no further: there
    is no model field behind it to read a type from, and ``aggregate()`` resolves it perfectly well.
    This is the same allowance ordering makes for the same reason (see
    :func:`_validate_ordering_declarations`), so the two declarations accept the same paths.

    Three ways it can fail, each with its own answer:

    - It doesn't name a field on the model, walking ``__`` through relations the way the ORM does,
      and isn't one of those annotations either. ``queryset.aggregate()`` raises ``FieldError`` on
      the first list request that asks for it.
    - It reaches through a relation that can match more than one related row. This one is the
      reason a declaration is validated at all rather than left to fail at request time: such a
      join adds a row per related object, which inflates *every* total computed in the same
      ``aggregate()`` call. Ask for a good total alongside a bad one and the good one comes back
      wrong, with nothing to say so. Supporting totals across those relations needs a different
      aggregation design than one ``aggregate()`` call, so they are refused here.
    - It lands on something ``Sum`` means nothing for -- a relation itself, or a column that isn't
      numeric or a duration.
    """
    if not isinstance(path, str) or not path:
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals['{name}'] is {path!r}, not a field path.",
                hint=(
                    "Declare each total as a mapping entry of client-facing column name -> ORM field path, "
                    'e.g. `column_totals = {"product_price": "product_option__price"}`.'
                ),
            )
        ]

    if path in annotation_names:
        # An annotation the viewset's own `get_queryset` adds. `aggregate()` resolves it like any
        # other expression, and there is no model field behind it to check a type or a join against,
        # so the rest of this function has nothing to say about it. What it sums is the project's
        # own to get right, the same as for an annotation named in `ordering_fields`.
        return []

    try:
        fields = get_fields_from_path(model, path)
    except (FieldDoesNotExist, NotRelationField):
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals['{name}'] is '{path}', but {model.__name__} has no such "
                "field or related field.",
                hint=(
                    f"Point it at a column on {model.__name__}, at one reached through its relations with "
                    "`__`, or at an annotation the viewset's own `get_queryset` adds. Where the value needs "
                    "a join or an aggregate, model it as a database view (a `managed = False` model related "
                    "by `OneToOneField`) and total a real column on that view. A list request asking for "
                    "this total raises `FieldError` from `queryset.aggregate()`."
                ),
            )
        ]

    if path_multiplies_rows(fields):
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals['{name}'] is '{path}', which reaches through a relation "
                "that can match more than one row.",
                hint=(
                    "Totals over real columns are computed in one `aggregate()` call, so a reverse foreign key, "
                    "a many-to-many, or a GenericRelation joins a row per related object and inflates every "
                    "one of them, not only this one -- a correctly declared total requested alongside this one "
                    "comes back wrong. Point it at a column on this model, or at one reached through "
                    "single-valued relations (a forward foreign key or a one-to-one, nullable or not)."
                ),
            )
        ]

    field = fields[-1]
    if field.is_relation:
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals['{name}'] is '{path}', which names a relation rather than a column.",
                hint=(
                    "Add the column to sum to the end of the path, e.g. "
                    f"'{path}__<field>'. Every total is a `Sum`, and there is nothing to sum here."
                ),
            )
        ]

    internal_type = field.get_internal_type()
    if internal_type not in SUMMABLE_INTERNAL_TYPES:
        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals['{name}'] is '{path}', which is a {internal_type} and "
                "cannot be summed.",
                hint=(
                    "Every total is a `Sum`, so it needs a numeric column or a DurationField: "
                    f"{', '.join(sorted(SUMMABLE_INTERNAL_TYPES))}. A list request asking for this total "
                    "fails in the database."
                ),
            )
        ]

    return []


def _validate_column_totals(model, viewset):
    """
    Report a viewset's ``column_totals`` declaration that no ``list`` request could honor.

    Nothing else catches these. A bad path or an unsummable column raises in the database, but only
    for the request that asks for that total -- and since totals are opt-in, that may be no request
    at all for a long time. A path through a multi-valued relation raises nothing ever and silently
    returns wrong numbers, for every total computed alongside it.

    Note that ``manage.py check`` has to be run for any of this to be reported: Django does not run
    system checks when starting a WSGI application, so a deployment that never invokes the command
    still ships whatever it declared. See
    https://docs.djangoproject.com/en/5.2/topics/checks/ for when checks do and don't run.
    """
    if viewset is None:
        return []

    column_totals = getattr(viewset, "column_totals", None)
    if not column_totals:
        # Not declared, or declared empty -- in any shape. An empty declaration offers no totals,
        # which is exactly what it says.
        return []

    if not isinstance(column_totals, dict):
        if isinstance(column_totals, (list, tuple)) and all(isinstance(entry, str) for entry in column_totals):
            as_mapping = ", ".join(f"{entry!r}: {entry!r}" for entry in column_totals)
            hint = (
                "`column_totals` is a mapping of client-facing column name -> ORM field path. Rewrite the "
                "list as one, naming each total after the column it renders under: "
                f"`column_totals = {{{as_mapping}}}`. Under the list form the ORM path doubled as the "
                "response key, so a total only reached a column when the two happened to be spelled the same."
            )
        else:
            hint = (
                "Declare it as a mapping of client-facing column name -> ORM field path, e.g. "
                '`column_totals = {"product_price": "product_option__price"}`.'
            )

        return [
            _column_totals_error(
                viewset,
                f"{viewset.__name__}.column_totals is a {type(column_totals).__name__}, not a dict.",
                hint=hint,
            )
        ]

    # `None` means the queryset could not be built here -- a `get_queryset` that reaches for
    # `self.request`, most often -- so there is no telling an annotation from a stale path. Ordering
    # skips its whole check in that case; here only the path half depends on it, so the names are
    # still checked and the paths are left alone.
    annotation_names = _queryset_annotation_names(viewset)

    errors = []
    for name, path in column_totals.items():
        name_messages = _validate_column_total_name(viewset, name)
        errors.extend(name_messages)
        # An unusable name has no total to speak of, so its path is not reported on top of it; the
        # one fix brings both back into scope. A name Django only deprecates still works today, so
        # its path is checked as usual -- the warning is about an upgrade, not about this total
        # being broken now.
        if annotation_names is not None and not any(isinstance(message, Error) for message in name_messages):
            errors.extend(_validate_column_total_path(model, viewset, name, path, annotation_names))

    return errors


def check_column_totals_configuration(app_configs, **kwargs):
    """Report viewsets whose ``column_totals`` declaration or total names are invalid (``vueda_info.E013``, ``W002``)."""
    from vueda.info.registration import get_all_registrations

    errors = []

    # Registered viewsets, which is every viewset with a metadata surface: the registry holds one
    # per model and a second registration for the same model raises at startup, so there is no
    # "other" viewset for a model to miss here. A second surface over the same data is a proxy
    # model, which registers in its own right and comes back around through this loop.
    #
    # A viewset routed without being registered is the one thing outside this boundary, and nothing
    # can widen it -- an unregistered viewset is not discoverable from here. It matters more for
    # totals than for the ordering checks beside it, where a stale declaration raises at request
    # time: a `column_totals` path through a reverse foreign key or a many-to-many raises nothing,
    # ever, and silently inflates every total computed beside it. The guide says so.
    for _key, registration in get_all_registrations().items():
        model = registration["serializer"].Meta.model
        errors.extend(_validate_column_totals(model, registration["viewset"]))

    return errors


class _CheckContextView:
    """Minimal stand-in for a DRF view, so a canonical serializer that reads
    ``self.context["view"]`` while building its fields (for example ``ExcludeFieldsSerializerMixin``,
    which reads ``.action`` from it) can still be introspected outside of any request. This check
    runs through ``manage.py check``, not a request, so there is no real view to supply here;
    ``action = None`` matches none of the actions such a mixin special-cases, which is the least
    surprising default -- no field gets excluded that a plain "list"/"retrieve" response wouldn't
    also include.
    """

    action = None


def _get_field_model_info_corrected_fields(serializer_class, serializer_instance):
    """
    Build the model_fields metadata dict a real /info/ request would see for this serializer,
    including whatever get_field_model_info corrects -- so the check can tell a field the
    developer has already described (its real type_db/type_model filled in) from one that is
    still genuinely unresolved. Never raises: this feeds an advisory check, so a serializer this
    cannot safely introspect just yields no corrections rather than blocking manage.py check.
    """
    from vueda.info.serializers import ModelInfoSerializer

    try:
        fields = ModelInfoSerializer().get_model_fields_data(serializer_class, context={"view": _CheckContextView()})
        get_field_model_info = getattr(serializer_instance, "get_field_model_info", None)
        if get_field_model_info is not None:
            fields = get_field_model_info(fields)
        return fields
    except Exception:
        return {}


def _validate_field_source_resolution(serializer_class, model):
    from vueda.info.field_resolution import resolve_serializer_field_model_field

    warnings = []
    try:
        serializer_instance = serializer_class(context={"view": _CheckContextView()})
        fields = serializer_instance.get_fields()
    except Exception:
        # Advisory only: a canonical serializer this check cannot safely introspect outside a
        # request must not prevent manage.py check, or any other command, from completing.
        return warnings

    corrected_fields = None

    for field_name, field in fields.items():
        _model_field, unresolved_path = resolve_serializer_field_model_field(model, field_name, field)
        if unresolved_path is None:
            continue

        # A lookup_expression is fed straight to models.F() for queryset annotation and to Django
        # admin's lookup_field(); neither can reach a @property or method, so it has no legitimate
        # non-model-backed reading the way a field's source= does -- get_field_model_info only
        # corrects the metadata dict, it cannot fix what those runtime consumers will also break.
        is_lookup_expression = isinstance(getattr(model, f"{field_name}_lookup_expression", None), str)

        if not is_lookup_expression:
            if corrected_fields is None:
                corrected_fields = _get_field_model_info_corrected_fields(serializer_class, serializer_instance)
            corrected = corrected_fields.get(field_name) or {}
            if corrected.get("type_db") is not None or corrected.get("type_model") is not None:
                continue

        if is_lookup_expression:
            hint = (
                f"'{unresolved_path}' did not resolve to a model field. formatted_name_lookup_expression is "
                "used for queryset annotation and Django admin field lookups, both DB-level operations, so it "
                "must name a real field path. Fix the model's lookup expression."
            )
        else:
            hint = (
                f"'{unresolved_path}' did not resolve to a model field. If {field_name} is genuinely not "
                "model-backed, override get_field_model_info to correct its model_fields metadata. "
                "Otherwise, fix the field's source=."
            )

        warnings.append(
            CheckWarning(
                f"{serializer_class.__name__}.{field_name} does not resolve to a field on {model.__name__}.",
                hint=hint,
                obj=serializer_class,
                id="vueda_info.W001",
            )
        )
    return warnings


def check_field_source_resolution(app_configs, **kwargs):
    """Warn about serializer fields whose ``source`` model info cannot resolve to a model field (``vueda_info.W001``)."""
    from vueda.info.registration import get_all_registrations

    warnings = []
    checked = set()

    for _key, registration in get_all_registrations().items():
        serializer_class = registration["serializer"]
        model = serializer_class.Meta.model
        if serializer_class not in checked:
            checked.add(serializer_class)
            warnings.extend(_validate_field_source_resolution(serializer_class, model))

    return warnings
