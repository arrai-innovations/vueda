"""Translation between the dotted paths VUEDA's public API accepts and the ``__``-joined paths Django's ORM accepts.

Sparse fields (``f``) and expands (``e``) have always been dotted, because DRF-flex-fields is dotted
natively. Ordering (``o``) and declared filters instead put a raw ``__``-joined ORM path on the wire,
which is the inconsistency this module exists to close: every public parameter takes a dotted path,
and every ``__``-joined path stays a server-internal detail of the Django declaration or query behind
it.

Each parameter grammar gets its own functions rather than one path converted generically, because the
grammars are not actually the same:

- Ordering needs both directions — a request's dotted term translated to the ORM path `order_by()`
  takes, and that path translated back for `model_ordering` — and carries an optional leading ``-``
  that a path conversion must not touch, and never carries a wildcard.
- A declared filter's public alias is derived once, from the filter's own declared identity, rather
  than parsed out of a per-request string the way an ordering term is — :mod:`vueda.core.filters`
  reaches for :func:`orm_filter_path_to_public` from ``FilterSet.__init__``, not from request
  handling, and there is no reverse direction: nothing here ever translates a client's request back
  to a filter's ORM path, because a filter's public name *is* the key django-filter binds the
  request to once ``PublicFilterAliasMixin`` has renamed it.
- Sparse fields and expands accept a trailing ``*`` wildcard segment; ordering and filters do not, and
  :func:`reject_wildcard` is what the two of them share to say so.

A function here converts one path at a time and raises nothing on its own: a path with no matching
name on the far side is for the caller's own validation (``VuedaOrderingFilter.get_ordering``, a
declared filter's alias lookup) to reject, not for a generic converter to guess about.

The module also resolves an ``__``-joined path to what it names on a model or a queryset annotation.
:func:`query_path_field`, :func:`query_path_multiplies_rows`, and :func:`annotation_path_output_field`
ask Django's own ``Query`` to resolve the path, so they accept exactly what ``order_by()`` and
``aggregate()`` accept, including a path that ends in transforms such as ``created__year``. Ordering
and column totals both resolve paths through them, so the two cannot disagree about which paths
resolve.
"""

__all__ = (
    "annotation_path_field",
    "annotation_path_output_field",
    "has_public_ordering_name",
    "join_ordering_direction",
    "orm_filter_path_to_public",
    "orm_ordering_path_to_public",
    "path_annotation_name",
    "public_ordering_path_to_orm",
    "query_path_field",
    "query_path_multiplies_rows",
    "reject_wildcard",
    "split_ordering_direction",
)

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_fields_from_path
from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import FieldError
from django.db.models.constants import LOOKUP_SEP
from django.db.models.sql import Query


#: The separator a public path joins its segments with, everywhere the ORM would join them with
#: ``LOOKUP_SEP``.
PUBLIC_PATH_SEP = "."

#: The leading character marking descending order in an ordering term, ahead of the path itself.
ORDERING_DIRECTION_PREFIX = "-"

#: The character that separates the terms of one ``?o=`` value. DRF's ``OrderingFilter`` splits the
#: value on it, so no single term can contain one.
ORDERING_TERM_SEP = ","

#: The segment marking "every field/expand at this level" in the sparse-fields and expand grammars.
WILDCARD_SEGMENT = "*"


def split_ordering_direction(term):
    """
    An ordering term's direction and the path behind it, split apart.

    The ``-`` marking descending order sits ahead of the path, not inside it, so it has to come off
    before the path is translated and go back on after — a path conversion that ran across the whole
    term unchanged would leave the marker exactly where it was, but only by accident, and a filter
    grammar that changes the marker's position (there is none today) would need this to still hold.

    :param term: An ordering term as it arrives on ``?o=``, e.g. ``"-employee.name"``.
    :type term: str
    :return: Whether the term is descending, and the path with any ``-`` removed.
    :rtype: Tuple[bool, str]
    """
    descending = term.startswith(ORDERING_DIRECTION_PREFIX)
    return descending, term.removeprefix(ORDERING_DIRECTION_PREFIX)


def join_ordering_direction(descending, path):
    """
    An ordering term built from a path and the direction it sorts in.

    The inverse of :func:`split_ordering_direction`, so a path translated in between the two calls
    carries the same direction out that it carried in, regardless of what the translation did to the
    path itself.

    :param descending: Whether the term should sort descending.
    :type descending: bool
    :param path: The path to sort by.
    :type path: str
    :return: The ordering term, ``-`` prefixed when descending.
    :rtype: str
    """
    return f"{ORDERING_DIRECTION_PREFIX}{path}" if descending else path


def public_ordering_path_to_orm(path):
    """
    A dotted ``?o=`` path translated to the ``__``-joined path ``order_by()`` accepts.

    :param path: A dotted ordering path, with any leading ``-`` already removed by
        :func:`split_ordering_direction`.
    :type path: str
    :return: The path with ``.`` replaced by ``__``.
    :rtype: str
    """
    return path.replace(PUBLIC_PATH_SEP, LOOKUP_SEP)


def orm_ordering_path_to_public(path):
    """
    A ``__``-joined ordering path translated to the dotted form ``model_ordering`` publishes.

    :param path: An ORM ordering path, e.g. as reported by :func:`vueda.core.ordering.ordering_term_field_names`.
    :type path: str
    :return: The path with ``__`` replaced by ``.``.
    :rtype: str
    """
    return path.replace(LOOKUP_SEP, PUBLIC_PATH_SEP)


def has_public_ordering_name(path):
    """
    Whether a ``__``-joined ordering path has a ``?o=`` name that reads back as the same path.

    Most paths do. Two kinds of name can contain any character, though: a key on a ``JSONField``, and
    an annotation name passed to ``annotate()`` through ``**kwargs``. A name that contains ``.``, such
    as ``specs__v1.2``, has the dotted name ``specs.v1.2``, which reads back as ``specs__v1__2``, a
    different path. A name that contains ``,`` can't be sent at all, because DRF splits ``?o=`` on
    commas into separate terms. The client sends dotted names, so no client can request such a path.

    :param path: An ORM ordering path, without a direction prefix.
    :type path: str
    :return: True when the path's public name reads back as the same path.
    :rtype: bool
    """
    return PUBLIC_PATH_SEP not in path and ORDERING_TERM_SEP not in path


def orm_filter_path_to_public(path):
    """
    A ``__``-joined filter path, translated to the dotted form the public wire uses for it.

    The one caller is ``PublicFilterAliasMixin.__init__``, translating a filter's *declared* name (a
    class attribute, or the name django-filter itself builds for a ``Meta.fields`` entry,
    ``LOOKUP_SEP.join([field_name, lookup_expr])``) to rename it. Nothing downstream of the rename --
    ``model_filtering`` included -- calls this again; it reads whatever name the mixin already
    settled on.

    Unlike an ordering term, there is no leading direction marker to preserve and no lookup
    expression to split off first: a filter's lookup expression is a separate, fixed attribute
    (``lookup_expr``), not a segment threaded through the name being translated here.

    :param path: A ``__``-joined filter name or path.
    :type path: str
    :return: The path with ``__`` replaced by ``.``.
    :rtype: str
    """
    return path.replace(LOOKUP_SEP, PUBLIC_PATH_SEP)


def reject_wildcard(path):
    """
    Raise when a path carries the ``*`` wildcard segment sparse fields and expands accept.

    Ordering and filters have no "every field at this level" meaning the way ``f``/``e`` do, so a
    wildcard reaching either one names nothing rather than naming everything, and is rejected here
    rather than silently resolving to no field.

    :param path: The path to check.
    :type path: str
    :raises ValueError: If ``path`` contains the wildcard segment.
    """
    if WILDCARD_SEGMENT in path:
        raise ValueError(f"{path!r} is not a valid path: wildcards are only permitted in `f` and `e`.")


def path_annotation_name(annotations, path):
    """
    The name of the queryset annotation that a query path starts with.

    Django resolves the first segment of a query path against the queryset's annotations before the
    model's fields. So ``launched`` and ``launched__year`` both start with the annotation
    ``launched`` when the queryset carries one. The ordering backend, the system checks, and column
    totals all decide this the same way through this function.

    ``None`` when the first segment of the path names no annotation.

    :param annotations: The annotation names to look in, such as ``queryset.query.annotations``.
    :type annotations: Container[str]
    :param path: The ``__``-joined path to read.
    :type path: str
    :return: The annotation name. None when the path doesn't start with one.
    :rtype: Optional[str]
    """
    name = path.partition(LOOKUP_SEP)[0]
    return name if name in annotations else None


def query_path_field(model, path):
    """
    The field that describes the value that a query path names on ``model``.

    Django resolves the path itself, so this accepts every path that ``order_by()`` and
    ``aggregate()`` accept on the model. That includes a path through relations, the ``pk`` alias,
    and a path that ends in one or more transforms, such as ``created__year``,
    ``created__date__year``, a key on a ``JSONField``, or a transform that a project registers.

    ``Query.names_to_path`` walks the fields and relations that the path names. When transforms follow
    them, ``Query.resolve_ref`` applies them, and the result is the output field of the last one.
    ``created__year`` is an ``IntegerField``, because the database works with the year's number.

    When nothing follows them, the result is the last field that the path names, as Django admin's
    ``get_fields_from_path`` reports it. ``customer`` is the ``customer`` foreign key, ``customer__id``
    is the ``id`` field on Customer, and a many-to-many path is the ``ManyToManyField`` itself.
    ``names_to_path`` would report the through table's foreign key for that last one, which carries
    neither the field's choices nor its type. Only the ``pk`` alias, which ``get_fields_from_path``
    doesn't know, takes the field that ``names_to_path`` reached.

    A path that Django can't resolve raises ``FieldDoesNotExist`` with the message of the
    ``FieldError`` that Django raised, such as ``Cannot resolve keyword 'yaer' into field. Join on
    'released' not permitted.`` That is the error a query on the same path fails with. Any other error,
    such as the ``TypeError`` of a transform class that can't be built from the one value a path
    gives it, is Django's to raise and passes through unchanged.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param path: The ``__``-joined path to resolve.
    :type path: str
    :return: The field that describes the value that the path names.
    :rtype: django.db.models.Field
    :raises django.core.exceptions.FieldDoesNotExist: If Django can't resolve the path on ``model``.
    """
    query = Query(model)
    try:
        _path_infos, final_field, _targets, rest = query.names_to_path(
            path.split(LOOKUP_SEP), model._meta, fail_on_missing=False
        )
        if rest:
            return query.resolve_ref(path, allow_joins=True).output_field
    except FieldError as error:
        raise FieldDoesNotExist(str(error)) from error

    try:
        return get_fields_from_path(model, path)[-1]
    except (FieldDoesNotExist, NotRelationField):
        return final_field


def query_path_multiplies_rows(model, path):
    """
    Whether a query path joins through a relation that can match more than one row.

    Joining through a reverse foreign key, a many-to-many, or a ``GenericRelation`` produces a row
    per related object. ``Query.names_to_path`` marks each such join, and this reads that mark, so a
    path that ends in transforms is judged by the relations before them.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param path: A ``__``-joined path that :func:`query_path_field` resolves.
    :type path: str
    :return: True when any relation the path joins through can match more than one row.
    :rtype: bool
    """
    path_infos = Query(model).names_to_path(path.split(LOOKUP_SEP), model._meta, fail_on_missing=False)[0]
    return any(path_info.m2m for path_info in path_infos)


def annotation_path_field(query, path):
    """
    The output field of a path that starts with a queryset annotation: the annotation's own output
    field for a plain name such as ``launched``, or the output field of the last transform for a
    path such as ``launched__year``.

    ``Query.resolve_ref`` resolves the path, the same way an ``F()`` expression or ``aggregate()``
    resolves it. That includes an annotation that ``.alias()`` added. A plain string in
    ``order_by()`` can't apply a transform to an ``.alias()`` name, so ``VuedaOrderingFilter`` orders
    by such a path through ``F()``.

    A path that Django can't resolve raises ``FieldDoesNotExist`` with the message of the
    ``FieldError`` that Django raised. That covers a name after the annotation that is no transform,
    and an annotation whose output type Django can't determine, such as a ``Coalesce`` over mixed
    types.

    :param query: The query whose annotations the path starts with, such as ``queryset.query``.
    :type query: django.db.models.sql.Query
    :param path: The ``__``-joined path to resolve.
    :type path: str
    :return: The output field of the annotation or of its last transform.
    :rtype: django.db.models.Field
    :raises django.core.exceptions.FieldDoesNotExist: If Django can't resolve the path on ``query``.
    """
    try:
        # A plain annotation name is already resolved on the query, so it needs no clone.
        if path in query.annotations:
            return query.annotations[path].output_field

        # A clone, because `resolve_ref` adds any joins that it needs to the query that it runs on.
        return query.clone().resolve_ref(path, allow_joins=True).output_field
    except FieldError as error:
        raise FieldDoesNotExist(str(error)) from error


def annotation_path_output_field(query, path):
    """
    The output field of a path that starts with a queryset annotation, as
    :func:`annotation_path_field` resolves it.

    ``None`` when the path doesn't start with an annotation. ``None`` too when Django can't resolve
    the rest of the path as transforms, or can't determine the output field. A caller that needs
    Django's reason calls :func:`annotation_path_field` instead.

    :param query: The query whose annotations the path may start with, such as ``queryset.query``.
    :type query: django.db.models.sql.Query
    :param path: The ``__``-joined path to resolve.
    :type path: str
    :return: The output field of the annotation or of its last transform. None when the path doesn't
        resolve this way.
    :rtype: Optional[django.db.models.Field]
    """
    if path_annotation_name(query.annotations, path) is None:
        return None

    try:
        return annotation_path_field(query, path)
    except FieldDoesNotExist:
        return None
