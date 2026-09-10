"""Shared resolution of a serializer field's backing Django model field.

Used by both ``ModelInfoSerializer.get_model_fields_data`` (to derive ``type_db``/``type_model``
metadata) and the ``vueda_info`` system check (to warn about a path that fails to resolve), so the
two cannot disagree about whether a given field's path resolves.

``field.source`` and a model's ``<field>_lookup_expression`` are resolved through two different
mechanisms, because they have different runtime semantics:

- ``field.source`` is DRF's own attribute lookup (``rest_framework.fields.get_attribute``), which
  chains plain ``getattr()`` across ``source.split('.')``. It is walked here the same way, so this
  module never claims a source resolves when DRF's own runtime traversal would not reach it.
- A ``<field>_lookup_expression`` is fed directly to ``models.F()`` for queryset annotation (see
  ``annotate_formatted_name`` in ``vueda.core.models``) and to Django admin's ``lookup_field()``.
  It is resolved here through Django's own query-expression machinery (``F(...).resolve_expression``),
  the same mechanism ``annotate_formatted_name`` uses, so this module never claims an expression is
  broken when the ORM would actually accept it (a relation, or a transform such as ``"__year"``).
"""

__all__ = ("resolve_serializer_field_model_field",)

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_model_from_relation
from django.core.exceptions import FieldDoesNotExist
from django.db.models import F
from django.db.models.sql import Query


def _walk_source(model, source):
    """
    Walk ``source`` exactly as DRF resolves it at runtime: plain ``getattr()`` chained across
    ``source.split('.')`` (never treating ``__`` specially -- unlike an ORM lookup path, a literal
    double underscore in a single path segment is just part of an attribute name DRF's runtime
    ``getattr()`` will look up as-is, and will almost always fail).

    Each segment is resolved as a Django model field here, for metadata purposes, but an
    intermediate segment matching a foreign key's ``attname`` (its scalar ``*_id`` column, e.g.
    ``"customer_id"``) cannot be treated as a relation to continue into: DRF's ``getattr()`` there
    returns the raw column value, not the related object, so a further segment after it is not
    reachable at runtime even though ``_meta.get_field()`` would resolve the attname to the same
    field as its relation name. A terminal attname still maps to its model field correctly, since
    nothing needs to be read off of it afterward.

    Returns the terminal model field the whole path resolves to, or ``None`` if any segment fails.
    """
    pieces = source.split(".")
    parent = model
    field = None
    for index, piece in enumerate(pieces):
        try:
            field = parent._meta.get_field(piece)
        except FieldDoesNotExist:
            return None
        if index == len(pieces) - 1:
            return field
        if piece != field.name and piece == getattr(field, "attname", None):
            # `piece` only matched the field's scalar attname; DRF's getattr() here returns the
            # raw column value at runtime, not a traversable related object.
            return None
        try:
            parent = get_model_from_relation(field)
        except NotRelationField:
            return None
    return field


def _resolve_lookup_expression(model, lookup_expression):
    """
    Resolve a ``<field>_lookup_expression`` through Django's own query-expression semantics: the
    exact mechanism ``annotate_formatted_name`` (``vueda.core.models``) uses to feed it to
    ``models.F()`` for queryset annotation. This also matches Django admin's ``lookup_field()``,
    whose fallback path (used when no queryset annotation populated the value) walks the same
    dunder-separated segments through plain attribute access -- which succeeds for a relation and
    for many transforms Django registers as attributes on the runtime value (for example,
    ``"when__year"`` resolves via ``datetime.year``), the same set of expressions ``F()`` accepts.

    Returns the resolved output field (the real model field for a direct column reference -- for
    example a ``GeneratedField`` -- or a transform's output field, such as the ``IntegerField``
    behind an ``ExtractYear``), or ``None`` if ``lookup_expression`` does not name anything Django's
    query expressions can resolve. Any exception the resolution raises is treated as a failure to
    resolve rather than allowed to propagate, since this must never prevent `/info/` or a
    management command from completing.
    """
    try:
        resolved = F(lookup_expression).resolve_expression(Query(model))
    except Exception:
        return None
    return getattr(resolved, "target", None) or resolved.output_field


def resolve_serializer_field_model_field(model, field_name, field):
    """
    Resolve the concrete, terminal Django model field a serializer field's value is drawn from.

    Returns a ``(model_field, unresolved_path)`` pair:

    - A field bound to the whole object (``field.source == "*"``) is never model-backed by design.
      ``SerializerMethodField`` forces this; a plain ``Field`` subclass that computes its own value
      from the instance can set it explicitly the same way (``ObjectRevisionField`` in
      ``vueda.history.revision`` does). Returns ``(None, None)`` -- callers must not treat this as
      an unresolved path worth a warning.
    - A model declaring ``<field_name>_lookup_expression`` (the ``formatted_name`` mechanism)
      takes priority over ``field.source`` and is resolved via Django's own query-expression
      semantics (see ``_resolve_lookup_expression``).
    - Otherwise, ``field.source`` (a dotted path for a nested/traversing source, or a plain field
      name for the common case) is walked via DRF's own attribute-lookup semantics (see
      ``_walk_source``).

    ``unresolved_path`` carries the path that failed to resolve, for the system check to name in
    its warning. A field is only exempt from reporting when it opts out of model-backing by one of
    two explicit conventions -- never merely because ``field.source`` happened to default to
    ``field_name`` rather than being set explicitly:

    - ``field.source == "*"`` (``SerializerMethodField`` forces this; a plain ``Field`` subclass
      that computes its own value can set it the same way -- ``ObjectRevisionField``,
      ``AvailableActionsField``, and ``AvailableTransitionField`` all do, since each overrides
      ``get_attribute()`` outright and never reads ``source`` at runtime).
    - A model defining a callable ``get_<field_name>()``, mirroring the ``get_formatted_name()``
      convention ``FormattedNameBaseModel._get_formatted_name`` already reads this way: a model may
      opt out of a generated column (for example ``formatted_name = None``) in favor of a plain
      method, and that method is exactly as legitimate a source of the value as a real column.

    Absent either opt-out, an unresolved path is reported regardless of whether ``field.source``
    was set explicitly or left to DRF's default -- a field name that fails to resolve is exactly as
    likely to be a typo or a stale rename as an explicit ``source=`` that fails partway through a
    relation, and DRF's default gives no way to tell the difference from the outside.

    ``<field>_lookup_expression`` is resolved through Django's own query-expression semantics (see
    ``_resolve_lookup_expression``) rather than ``_walk_source``, since it is fed directly to
    ``models.F()`` for queryset annotation and to Django admin's ``lookup_field()``, both of which
    resolve purely at the database level and cannot reach a ``@property`` or method.

    ``field`` may be unbound (as returned by a bare ``serializer_instance.get_fields()`` call,
    which does not run DRF's binding step) so ``field.source`` may still be ``None`` rather than
    already defaulted to ``field_name`` -- this mirrors DRF's own ``Field.bind()`` default.
    """
    if field.source == "*":
        return None, None

    lookup_expression = getattr(model, f"{field_name}_lookup_expression", None)
    if isinstance(lookup_expression, str):
        model_field = _resolve_lookup_expression(model, lookup_expression)
        return model_field, (None if model_field is not None else lookup_expression)

    source = field.source if field.source is not None else field_name
    model_field = _walk_source(model, source)
    if model_field is not None:
        return model_field, None

    if callable(getattr(model, f"get_{field_name}", None)):
        return None, None

    return None, source
