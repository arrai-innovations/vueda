"""Shared resolution of a serializer field's backing Django model field.

Used by both ``ModelInfoSerializer.get_model_fields_data`` (to derive ``type_db``/``type_model``
metadata) and the ``vueda_info`` system check (to warn about a path that fails to resolve), so the
two cannot disagree about whether a given field's path resolves.
"""

__all__ = ("resolve_serializer_field_model_field",)

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_model_from_relation
from django.core.exceptions import FieldDoesNotExist
from django.db.models.constants import LOOKUP_SEP
from rest_framework import serializers


def _walk(model, dunder_path):
    """
    Walk a dunder-separated path from ``model``, relation by relation.

    Returns a ``(terminal_field, made_partial_progress)`` pair. ``terminal_field`` is the model
    field the whole path resolves to, or ``None`` if any segment fails. ``made_partial_progress``
    is ``True`` only when at least the first segment resolved before a later one broke the walk --
    a much stronger signal of a genuinely broken path than a first segment that never resolved at
    all, which is just as likely to be a deliberately non-model-backed computed value (a Python
    ``@property``, an annotation) that a serializer field's ``source`` names on purpose.
    """
    pieces = dunder_path.split(LOOKUP_SEP)
    parent = model
    field = None
    resolved = 0
    for piece in pieces:
        try:
            field = parent._meta.get_field(piece)
        except FieldDoesNotExist:
            field = None
            break
        resolved += 1
        if resolved == len(pieces):
            return field, False
        try:
            parent = get_model_from_relation(field)
        except NotRelationField:
            field = None
            break
    return None, resolved > 0


def resolve_serializer_field_model_field(model, field_name, field):
    """
    Resolve the concrete, terminal Django model field a serializer field's value is drawn from.

    Returns a ``(model_field, unresolved_path)`` pair:

    - A ``SerializerMethodField`` is never model-backed by design (its ``source`` is forced to
      ``"*"``, the whole object). Returns ``(None, None)`` -- callers must not treat this as an
      unresolved path worth a warning.
    - A model declaring ``<field_name>_lookup_expression`` (the ``formatted_name`` mechanism)
      takes priority over ``field.source`` and is resolved by walking that dunder-separated
      expression relation by relation to its terminal field, rather than stopping at the first
      segment.
    - Otherwise, ``field.source`` (a dotted path for a nested/traversing source, or a plain field
      name for the common case) is walked the same way.

    ``unresolved_path`` carries the path that failed to resolve, for the system check to name in
    its warning. Whether a miss is worth reporting differs between the two mechanisms, because
    they differ in whether a first-segment miss can be legitimate:

    - ``field.source`` is DRF's general attribute lookup: it is routinely, correctly pointed at a
      ``@property`` or another computed value with no database column at all (a workflow's
      computed current state, for example). A ``source`` whose very first segment fails to
      resolve is at least as likely to be one of those as a mistake, so it is not reported. A
      ``source`` that resolves partway -- some segment named a real relation -- before a later
      segment breaks is a much stronger signal of a genuine typo or rename, so only that case is
      reported.
    - ``<field>_lookup_expression`` has no such legitimate non-model-backed use: it is fed
      directly to ``models.F()`` for queryset annotation (see ``annotate_formatted_name`` in
      ``vueda.core.models``) and to Django admin's ``lookup_field()``, both of which resolve
      purely at the database level and cannot reach a ``@property`` or method. Any
      ``lookup_expression`` that fails to resolve -- including at its first segment -- is reported,
      since it will also break whatever annotates or looks up the value it names.

    ``field`` may be unbound (as returned by a bare ``serializer_instance.get_fields()`` call,
    which does not run DRF's binding step) so ``field.source`` may still be ``None`` rather than
    already defaulted to ``field_name`` -- this mirrors DRF's own ``Field.bind()`` default.
    """
    if isinstance(field, serializers.SerializerMethodField):
        return None, None

    lookup_expression = getattr(model, f"{field_name}_lookup_expression", None)
    if isinstance(lookup_expression, str):
        model_field, _made_partial_progress = _walk(model, lookup_expression)
        return model_field, (lookup_expression if model_field is None else None)

    source = field.source if field.source is not None else field_name
    model_field, made_partial_progress = _walk(model, source.replace(".", LOOKUP_SEP))
    return model_field, (source if made_partial_progress else None)
