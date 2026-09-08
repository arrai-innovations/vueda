from collections.abc import Iterable

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_fields_from_path
from django.core.checks import Error
from django.core.exceptions import FieldDoesNotExist

from vueda.core.formatted_name import FORMATTED_NAME
from vueda.core.formatted_name import formatted_name_annotation_path
from vueda.core.formatted_name import path_multiplies_rows
from vueda.core.ordering import NULLS_PLACEMENTS
from vueda.core.ordering import expand_ordering_pk
from vueda.core.ordering import ordering_fields_entry_name
from vueda.core.ordering import ordering_fields_from_path
from vueda.core.ordering import ordering_term_field_names


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

                # Resolving a term follows the same rules the metadata does, so that a path the
                # metadata resolves (a "pk" alias, or a formatted_name reached through a lookup
                # expression) is never reported here as if it were broken.
                try:
                    for expanded in expand_ordering_pk(model, path):
                        ordering_fields_from_path(model, expanded)
                except (FieldDoesNotExist, NotRelationField):
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


def _validate_nulls_ordering(viewset):
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

    for field_name in nulls_ordering_flip:
        if field_name in nulls_ordering:
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

    return errors


def check_ordering_configuration(app_configs, **kwargs):
    from vueda.info.registration import get_all_registrations

    errors = []

    # Per registration rather than per model: the declarations being checked live on the viewset, and
    # two viewsets on the same model can declare different orderings.
    for _key, registration in get_all_registrations().items():
        model = registration["serializer"].Meta.model
        errors.extend(_validate_ordering_declarations(model, registration["viewset"]))
        errors.extend(_validate_nulls_ordering(registration["viewset"]))

    return errors
