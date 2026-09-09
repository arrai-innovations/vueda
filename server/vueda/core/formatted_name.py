"""Resolution of ``formatted_name`` query paths to the database paths behind them."""

__all__ = (
    "FORMATTED_NAME",
    "FORMATTED_NAME_LOOKUP_EXPRESSION",
    "annotate_formatted_name",
    "formatted_name_annotation_path",
    "path_multiplies_rows",
    "resolve_formatted_name_path",
    "split_alias_path",
)

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_fields_from_path
from django.contrib.admin.utils import get_model_from_relation
from django.core.exceptions import FieldDoesNotExist
from django.db.models import F
from django.db.models.constants import LOOKUP_SEP


FORMATTED_NAME = "formatted_name"

#: The model attribute naming the database path a model's ``formatted_name`` comes from.
FORMATTED_NAME_LOOKUP_EXPRESSION = "formatted_name_lookup_expression"


def formatted_name_annotation_path(model):
    """
    The path to annotate as ``formatted_name`` on ``model``'s querysets, or ``None`` when there is
    nothing to annotate.

    This is the single rule behind every ``formatted_name`` annotation VUEDA adds —
    ``FormattedNameManager.get_queryset`` for the model's own querysets, and
    ``VuedaViewSet.get_queryset`` for the ones DRF builds — so a model's ``formatted_name`` means the
    same thing to the database wherever the queryset came from.

    ``None`` covers both cases that need no annotation, and both would raise if annotated anyway:

    - the model reaches its formatted name some way other than a lookup expression (its own
      ``GeneratedField`` column, a ``get_formatted_name()`` method, or neither), so there is no path
      to annotate;
    - the model declares a lookup expression *and* keeps a ``formatted_name`` column. Annotating over
      an existing field name raises ``ValueError``, so nothing is annotated and the column is what a
      response serializes. No system check reports that pairing: ``_validate_model_formatted_name``
      only inspects a model that sets ``formatted_name = None`` on its own class, which this one by
      definition does not.

    Declining the annotation is not the same as the column winning. With no annotation for them to
    recognize, ``VuedaOrderingFilter`` and ``FormattedNamePathFilterSetMixin`` rewrite
    ``formatted_name`` to the lookup expression rather than leaving it on the column — so on such a
    model a query orders and filters by the expression while the serialized value comes from the
    column. Declare one or the other.

    :param model: The model whose querysets are being built.
    :type model: Type[django.db.models.Model]
    :return: The path to annotate as ``formatted_name``, or ``None``.
    :rtype: Optional[str]
    """
    lookup_expression = getattr(model, FORMATTED_NAME_LOOKUP_EXPRESSION, None)
    if not isinstance(lookup_expression, str):
        return None

    try:
        model._meta.get_field(FORMATTED_NAME)
    except FieldDoesNotExist:
        return lookup_expression

    return None


def annotate_formatted_name(queryset):
    """
    Annotate ``formatted_name`` on ``queryset`` when its model has a path to annotate, and return it
    unchanged when it does not.

    Shared by ``FormattedNameManager.get_queryset`` (every queryset the model itself builds),
    ``VuedaViewSet.get_queryset`` (the root queryset DRF builds),
    ``VuedaListSerializer.to_representation`` (a "many" expand fetched through a related manager), and
    the prefetch-plan builder in ``vueda.core.viewsets`` (a "many" expand's ``Prefetch`` queryset), so
    all four agree on when ``formatted_name`` needs the annotation rather than each re-deriving it.

    ``formatted_name_annotation_path`` is the rule, so a model this declines to annotate is the same
    model ``VuedaOrderingFilter`` and ``FormattedNamePathFilterSetMixin`` rewrite instead of leaving
    on a column — see that function for the two shapes that need no annotation and would raise if
    annotated anyway.

    :param queryset: The queryset to annotate.
    :type queryset: django.db.models.QuerySet
    :return: The annotated queryset, or ``queryset`` itself when there is nothing to annotate.
    :rtype: django.db.models.QuerySet
    """
    annotation_path = formatted_name_annotation_path(queryset.model)
    if annotation_path is None:
        return queryset

    return queryset.annotate(**{FORMATTED_NAME: F(annotation_path)})


def path_multiplies_rows(fields):
    """
    Whether a query path traverses a relation that can reach more than one row.

    Joining through a reverse foreign key, a many-to-many, or a ``GenericRelation`` produces a row
    per related object, so a queryset that annotates, orders, or filters across one silently returns
    more rows than the table holds. A single-valued relation is fine however it is declared: a
    nullable foreign key produces a ``LEFT OUTER JOIN`` and still matches at most one row.

    This is the one rule behind every place VUEDA refuses a ``formatted_name`` path — the
    ``vueda_info.E008`` system check that validates a ``formatted_name_lookup_expression``, and
    ``resolve_formatted_name_path``, which declines to rewrite a related path reached this way. Both
    read it from here so a path one refuses is a path the other refuses.

    Takes the resolved fields rather than a path, because both callers have already resolved one and
    resolving is what raises for a path that names nothing.

    :param fields: The fields the path traverses, as returned by ``get_fields_from_path``.
    :type fields: Iterable[django.db.models.Field]
    :return: True when any field in the path can reach more than one row.
    :rtype: bool
    """
    return any(field.many_to_many or field.one_to_many for field in fields)


def split_alias_path(model, field_name, alias):
    """
    Split a query path whose last segment is ``alias`` into the prefix to put back on whatever the
    alias expands to, the model that segment belongs to, and the fields the prefix traverses.

    ``None`` when the path doesn't end in ``alias``. Raises ``FieldDoesNotExist`` or
    ``NotRelationField`` when the prefix names no path on ``model``, the same way resolving any other
    path would.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param field_name: The query path to split, e.g. ``"customer__formatted_name"``.
    :type field_name: str
    :param alias: The trailing segment to split on, e.g. ``"pk"`` or ``"formatted_name"``.
    :type alias: str
    :return: ``(prefix, alias_model, prefix_fields)``, or ``None`` when the path doesn't end in ``alias``.
    :rtype: Optional[Tuple[str, Type[django.db.models.Model], List[django.db.models.Field]]]
    """
    path, _, last_name = field_name.rpartition(LOOKUP_SEP)
    if last_name != alias:
        return None

    if not path:
        return "", model, []

    # For a path like "order__pk", the alias belongs to the related model at the end of the path,
    # not to this model.
    fields = get_fields_from_path(model, path)

    return f"{path}{LOOKUP_SEP}", get_model_from_relation(fields[-1]), fields


def resolve_formatted_name_path(model, field_name):
    """
    The database path behind a query path ending in ``formatted_name``, taken from the
    ``formatted_name_lookup_expression`` of the model that segment belongs to.

    ``formatted_name`` is a display name every VUEDA model exposes, but it reaches the database three
    different ways: as its own ``GeneratedField`` column; as the path named by
    ``formatted_name_lookup_expression``; or as a ``get_formatted_name()`` method, which computes it
    in Python and so has no database path at all. Only the second one needs translating, and this is
    what translates it — for the metadata that types the field, for the system checks that validate a
    declaration, and for the ordering and filtering backends that put the path into a query.

    ``None`` when there is nothing to translate: the path doesn't end in ``formatted_name``, the model
    it belongs to has no lookup expression (a column of its own, or a method, or neither), or the
    prefix names no path on ``model``. Callers fall back to resolving ``field_name`` as-is, which
    either works or raises the error it deserves.

    Two restrictions keep the translated path something a query can actually use:

    A lookup expression is followed once and never chained through the next model's own lookup
    expression, because the annotation ``VuedaViewSet.get_queryset`` builds from it is a plain
    ``F(lookup_expression)``: every segment of that path has to be a real column for Django to resolve
    it either.

    A prefix has to reach the model through single-valued relations. Following a multi-valued one
    (a reverse foreign key, a many-to-many) would join a row per related object and silently multiply
    the rows a list request returns, so such a path is left unresolved and reported as unorderable
    and unfilterable instead.

    Only the prefix is checked here, because only the prefix is this call's to inspect: the lookup
    expression spliced onto it belongs to the related model, and a multi-valued one there would
    multiply rows just the same. That half is validated once at startup, against the model that
    declares it, by the ``vueda_info.E008`` system check.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param field_name: The query path to resolve, e.g. ``"customer__formatted_name"``.
    :type field_name: str
    :return: The database path to use in place of ``field_name``, or ``None`` when there is none.
    :rtype: Optional[str]
    """
    try:
        split = split_alias_path(model, field_name, FORMATTED_NAME)
    except (FieldDoesNotExist, NotRelationField):
        # A prefix that resolves to nothing has no formatted_name behind it to find. Returning None
        # leaves the caller to resolve `field_name` itself and raise, rather than raising from here
        # for a path that may not have been a formatted_name path at all.
        return None

    if split is None:
        return None

    prefix, name_model, prefix_fields = split

    # Checked for a string rather than mere presence: a non-string value (which the `vueda_info.E004`
    # system check reports) has no path in it to follow.
    lookup_expression = getattr(name_model, FORMATTED_NAME_LOOKUP_EXPRESSION, None)
    if not isinstance(lookup_expression, str):
        return None

    if path_multiplies_rows(prefix_fields):
        return None

    return f"{prefix}{lookup_expression}"
