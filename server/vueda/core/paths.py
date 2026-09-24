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
"""

__all__ = (
    "join_ordering_direction",
    "orm_filter_path_to_public",
    "orm_ordering_path_to_public",
    "public_ordering_path_to_orm",
    "reject_wildcard",
    "split_ordering_direction",
)

from django.db.models.constants import LOOKUP_SEP


#: The separator a public path joins its segments with, everywhere the ORM would join them with
#: ``LOOKUP_SEP``.
PUBLIC_PATH_SEP = "."

#: The leading character marking descending order in an ordering term, ahead of the path itself.
ORDERING_DIRECTION_PREFIX = "-"

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
