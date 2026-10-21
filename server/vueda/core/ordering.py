"""Inspection and rewriting of the ordering terms Django's ``order_by()`` accepts."""

__all__ = (
    "NULLS_PLACEMENTS",
    "PK_ALIAS",
    "RANDOM_ORDERING",
    "expand_ordering_pk",
    "ordering_field_key",
    "ordering_fields_entry_name",
    "ordering_path_field",
    "ordering_pk_field_names",
    "ordering_term_field_names",
    "ordering_term_is_ascending",
    "queryset_explicit_ordering",
    "rewrite_ordering_term_field_names",
)

from django.contrib.admin.utils import NotRelationField
from django.core.exceptions import FieldDoesNotExist
from django.db.models import CompositePrimaryKey
from django.db.models import F
from django.db.models.expressions import OrderBy

from vueda.core.formatted_name import resolve_formatted_name_transform_path
from vueda.core.formatted_name import split_alias_path
from vueda.core.paths import query_path_field


#: Django's random ordering, which names no field.
RANDOM_ORDERING = "?"

#: Django's alias for a model's primary key, which names no field of its own.
PK_ALIAS = "pk"

#: The nulls placements a view's ``nulls_ordering`` may name, each mapped to the placement it flips
#: to for a field listed in ``nulls_ordering_flip``. Django spells these as the ``nulls_first`` and
#: ``nulls_last`` keyword arguments of ``F().asc()``/``F().desc()``, so a name outside this mapping
#: has no keyword to become; ``VuedaOrderingFilter`` ignores such a value and the
#: ``vueda_info.E007`` system check reports it.
NULLS_PLACEMENTS = {"first": "last", "last": "first"}


def ordering_fields_entry_name(entry):
    """
    The field name an ``ordering_fields`` entry offers to ``?o=``, or ``None`` when it has none.

    DRF's ``OrderingFilter`` lets an ``ordering_fields`` entry be either a plain field name or a
    ``(field_name, label)`` pair, and normalizes the two the same way — a string becomes
    ``(item, item)`` and anything else is passed through as it stands (``get_valid_fields``), after
    which only the first element is compared against ``?o=`` (``remove_invalid_fields``). So the two
    forms offer exactly the same field; the label is used only to caption DRF's own browsable-API
    ordering control, and never reaches a VUEDA client.

    An entry is read positionally rather than unpacked, the way DRF reads it, so an entry carrying
    more than a name and a label is tolerated here as it is there. One that holds no first element at
    all — an empty pair, a number — resolves to ``None`` rather than raising: this reports what a
    declaration offers, and a declaration DRF itself can't read a name from offers nothing.

    :param entry: The ``ordering_fields`` entry to read.
    :type entry: Union[str, Sequence]
    :return: The field name the entry offers, or None.
    :rtype: Optional[str]
    """
    if isinstance(entry, str):
        return entry

    try:
        name = entry[0]
    except (TypeError, KeyError, IndexError):
        return None

    return name if isinstance(name, str) else None


def ordering_term_field_names(term):
    """
    The model field paths an ordering term references, in the order they appear in it.

    ``order_by()`` takes a field name string (optionally ``-`` prefixed, or ``"?"`` for random
    ordering) or any query expression, so an ordering term — a viewset's ``ordering``, a model's
    ``Meta.ordering``, a client's ``?o=`` — can reference any number of fields:

    - one, for a plain name, an ``F("name").asc()``, or a scalar function over a single column such
      as ``Lower("name")`` or ``Coalesce("nickname", Value(""))``;
    - several, for a scalar function over more than one column, such as
      ``Concat("first_name", "last_name")`` or ``Greatest("updated", "created")``;
    - none, for ``"?"`` or an expression built on no column at all, such as ``Now()``.

    Field names are taken from the ``F`` references in the expression tree. Django builds those for
    itself: ``Func`` turns every string argument into an ``F``, so ``Lower("name")`` holds
    ``F("name")`` whether or not it was written that way. Duplicates are dropped, so a term naming
    the same field twice reports it once.

    Nothing here recognizes a particular function. ``flatten`` is ``BaseExpression``'s own tree walk,
    which every ``Func`` subclass inherits, and ``F`` is the only node that carries a field path — so
    every scalar function in ``django.db.models.functions`` is handled, along with any ``Func``
    subclass that an application writes and any function that a future Django version adds. Window
    functions (``Rank``, ``RowNumber``, and the rest) are the exception: Django accepts them in
    ``order_by()`` only inside a ``Window(...)``.

    A field named only inside a boolean condition — the ``Q`` in ``Case(When(active=True, ...))`` —
    is not reported. The condition decides which value is sorted, not which column the sort reads, and
    Django's own expression walk doesn't surface the left-hand side of a ``Q`` as an ``F``.

    :param term: The ordering term to inspect.
    :type term: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    :return: The field paths the term references, without direction prefixes.
    :rtype: List[str]
    """
    if isinstance(term, str):
        return [] if term == RANDOM_ORDERING else [term.removeprefix("-")]

    if isinstance(term, F):
        return [term.name]

    # `flatten` walks the whole expression tree depth-first, yielding children that can't walk
    # themselves — an `F` among them — as they are.
    flatten = getattr(term, "flatten", None)
    if flatten is None:
        return []

    names = []
    for expression in flatten():
        if isinstance(expression, F) and expression.name not in names:
            names.append(expression.name)

    return names


def queryset_explicit_ordering(queryset):
    """
    The ordering terms that a queryset applies in its own right, with any ``.reverse()`` applied.

    Each term is the one that ``order_by()`` received, unless ``.reverse()`` flipped it. A
    ``.reverse()`` with no ``order_by()`` gives the model's ``Meta.ordering``, flipped. On a grouped
    query, such as one that annotates an aggregate, a bare ``.reverse()`` gives nothing, because Django
    leaves ``Meta.ordering`` out of a query with ``GROUP BY``. The details are below.

    Django keeps an explicit ordering on the query itself. ``QuerySet.order_by`` clears whatever
    ordering was there and appends its terms to ``Query.order_by`` (``Query.add_ordering``), and the
    SQL compiler prefers those terms over the model's ``Meta.ordering``, which it reaches only for a
    query that carries none of its own (``SQLCompiler._order_by_pairs``). So a non-empty result here
    is an ordering that overrides the model's default, and an empty one leaves that default to apply.

    Those two attributes are Django internals, which is the reason this lives in one function: the
    compiler's precedence and the attributes behind it are verified against the Django versions VUEDA
    supports in ``tests/unit/filtering/test_queryset_explicit_ordering.py``, rather than assumed at
    each call site.

    This reads a queryset, so it describes a declaration and not the ordering any particular list
    request ends up with. A filter backend replaces the ordering it finds — DRF's ``OrderingFilter``
    does exactly that whenever a view declares ``ordering`` or a client sends ``?o=`` — and a
    ``get_queryset`` can order differently per request. The ``vueda_info.E010`` system check compares
    what this reads off a viewset's list queryset against what that viewset declares as its default
    ordering, and ``vueda_info.E015`` reads it off a model's default manager. Neither they nor this
    claims to know a request's final order.

    The terms are the same however the ordering was applied: by ``order_by()`` directly, by a custom
    QuerySet method that calls it, or by a manager's ``get_queryset()``.

    An ordering set by ``extra(order_by=...)`` reports nothing. That is raw SQL rather than ordering
    terms, so it has no field paths to read, and reporting the terms it overrides would describe an
    ordering the query doesn't use.

    An ordering *removed* by a bare ``order_by()`` reports nothing either, which is a gap rather than
    a judgement: that call clears the model's default ordering along with any explicit one, so the
    rows arrive unordered while the metadata still reports the model's declaration. Nothing here
    distinguishes a queryset that never ordered from one that deliberately stopped ordering.

    A ``.reverse()`` is applied to the terms. Django records it as a flag on the query
    (``Query.standard_ordering``) and flips every term when it compiles the query, so each term here
    comes back flipped the same way. A ``.reverse()`` with no ``order_by()`` flips the model's
    ``Meta.ordering``, so that reversed ordering is reported. It is an ordering that the queryset
    applies in its own right, and it differs from the model's default.

    :param queryset: The queryset to inspect.
    :type queryset: django.db.models.QuerySet
    :return: The ordering terms that the queryset applies, with any ``.reverse()`` applied. The list is
        empty when the queryset applies none.
    :rtype: List[Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]]
    """
    query = getattr(queryset, "query", None)
    if query is None:
        return []

    if getattr(query, "extra_order_by", ()):
        return []

    ordering = list(getattr(query, "order_by", ()) or ())
    if getattr(query, "standard_ordering", True):
        return ordering

    # Django leaves `Meta.ordering` out of a grouped query, so a bare `.reverse()` there flips nothing.
    if not ordering and query.default_ordering and query.group_by is None:
        ordering = list(query.get_meta().ordering)

    return [_reversed_ordering_term(term) for term in ordering]


def _reversed_ordering_term(term):
    """
    The ordering term that sorts the other way, the way Django's SQL compiler flips a term for a
    ``.reverse()`` (``SQLCompiler._order_by_pairs``).

    A string swaps its ``-`` prefix, and ``"?"`` stays random. An expression is wrapped in ``.asc()``
    when it isn't already an ``OrderBy``, then copied and reversed, which also swaps a nulls placement
    to the other end.
    """
    if isinstance(term, str):
        if term == RANDOM_ORDERING:
            return term

        return term.removeprefix("-") if term.startswith("-") else f"-{term}"

    term = term.copy() if isinstance(term, OrderBy) else term.asc()
    term.reverse_ordering()
    return term


def ordering_term_is_ascending(term):
    """
    Whether an ordering term sorts ascending.

    A bare expression carries no direction of its own: ``order_by(Lower("name"))`` is ascending,
    because the SQL compiler wraps anything that isn't already an ``OrderBy`` in ``.asc()``.

    :param term: The ordering term to inspect.
    :type term: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    :return: True when the term sorts ascending.
    :rtype: bool
    """
    if isinstance(term, str):
        return not term.startswith("-")

    return not getattr(term, "descending", False)


def rewrite_ordering_term_field_names(term, rewrite):
    """
    The ordering term with every field path it references passed through ``rewrite``.

    ``rewrite`` is called once per field path the term references and returns the path to use in its
    place, or ``None`` to leave that one alone. The term is returned unchanged when nothing is
    rewritten, and otherwise copied: a term keeps its direction and its nulls placement, and the
    caller's own declaration — a viewset's ``ordering``, a model's ``Meta.ordering`` — is never
    mutated.

    Rewriting reaches every ``F`` in the expression tree, so the path behind a name is substituted
    wherever it appears: ``Lower("customer__formatted_name")`` becomes
    ``Lower("customer__data__formatted_name")``, and the ``Lower`` still applies.

    :param term: The ordering term to rewrite.
    :type term: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    :param rewrite: Called with a field path, returning its replacement or ``None``.
    :type rewrite: Callable[[str], Optional[str]]
    :return: The rewritten term, or ``term`` itself when nothing changed.
    :rtype: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    """
    if isinstance(term, str):
        if term == RANDOM_ORDERING:
            return term

        descending = term.startswith("-")
        field_name = term.removeprefix("-")
        replacement = rewrite(field_name)
        if replacement is None or replacement == field_name:
            return term

        return f"-{replacement}" if descending else replacement

    replacements = {}
    for field_name in ordering_term_field_names(term):
        replacement = rewrite(field_name)
        if replacement is not None and replacement != field_name:
            replacements[F(field_name)] = F(replacement)

    if not replacements:
        return term

    # Django's own substitution, which clones each expression on the way down rather than editing it
    # in place. `F` compares and hashes by name, so the dict keys match the references in the tree.
    replace_expressions = getattr(term, "replace_expressions", None)
    if replace_expressions is None:
        return term

    return replace_expressions(replacements)


def ordering_pk_field_names(model, field_name):
    """
    The concrete field name(s) an ordering path resolves to, with a trailing ``"pk"`` replaced by the
    primary key field(s) it stands for. Any other path is returned unchanged.

    A ``CompositePrimaryKey`` expands to every field it is built from, matching how Django expands
    ordering by such a key into one term per column (``OrderBy.as_sql``), so a single name in can be
    several names out.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param field_name: The ordering path to resolve, e.g. ``"pk"`` or ``"order__pk"``.
    :type field_name: str
    :return: The concrete field paths, or ``[field_name]`` when there is no alias to expand.
    :rtype: List[str]
    """
    try:
        split = split_alias_path(model, field_name, PK_ALIAS)
    except NotRelationField:
        # The prefix ends at a field that isn't a relation, so a trailing "pk" can't be the alias.
        # It may be a transform on that field instead, such as a key named "pk" on a `JSONField`
        # (`specs__pk`), so the path is left as it is for resolution to judge.
        return [field_name]

    if split is None:
        return [field_name]

    prefix, pk_model, _prefix_fields = split
    pk = pk_model._meta.pk
    pk_fields = pk.fields if isinstance(pk, CompositePrimaryKey) else (pk,)

    # A field's `name`, not its `attname`: the name is what DRF validates an explicit `?o=` request
    # against, and it's what `model_ordering.fields` already advertises for a relation ("order" rather
    # than "order_id").
    return [f"{prefix}{pk_field.name}" for pk_field in pk_fields]


def ordering_field_key(model, field_name):
    """
    A key that two ordering paths share when they sort by the same field.

    A ``"pk"`` alias and the field behind it are two spellings of one field: ``"customer__pk"`` and
    ``"customer__id"`` share a key, and so do ``"pk"`` and every column of a ``CompositePrimaryKey``
    taken together. Any other path is its own key. ``VuedaOrderingFilter`` matches a ``nulls_ordering``
    key to a request term by this key, and the ``vueda_info.E007`` system check compares names the
    same way, so the two cannot disagree about which spellings match.

    A path that resolves to nothing is its own key too, rather than raising. Comparing names is not
    where a broken path gets reported.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param field_name: The ordering path, without a direction prefix.
    :type field_name: str
    :return: The concrete field path(s) behind the path, as a tuple so that the key is hashable.
    :rtype: Tuple[str, ...]
    """
    try:
        return tuple(ordering_pk_field_names(model, field_name))
    except (FieldDoesNotExist, NotRelationField):
        return (field_name,)


def expand_ordering_pk(model, term):
    """
    Expand an ordering term of ``"pk"`` into the concrete field name(s) it stands for.

    ``"pk"`` is an alias Django's own query machinery resolves (``Query.names_to_path`` swaps it for
    the primary key), so it is a legitimate thing to find in a model's ``Meta.ordering``, a viewset's
    ``ordering``, or a viewset's ``ordering_fields``. It isn't a real field name though, so it
    resolves to no field, and a client has no way to tell which column it refers to. Reporting the
    field name(s) behind it keeps the alias a server-side detail: the client orders by "id" (or by
    each field of a composite primary key) without having to know what ``"pk"`` means for this model.

    One term in can be several terms out, so this always returns a list, holding terms of the same
    kind that came in.

    :param model: The model the term is declared against.
    :type model: Type[django.db.models.Model]
    :param term: The ordering term to expand.
    :type term: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    :return: The expanded terms, or ``[term]`` when there is no alias to expand.
    :rtype: List[Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]]
    """
    field_names = ordering_term_field_names(term)
    if len(field_names) != 1:
        # A term naming no field has no alias in it to expand, and one naming several is already more
        # than a single name can describe, so neither is expanded here.
        return [term]

    field_name = field_names[0]
    pk_field_names = ordering_pk_field_names(model, field_name)
    if pk_field_names == [field_name]:
        return [term]

    # The same copy-and-replace Django uses to split an ordering expression across a composite key's
    # columns, so each term keeps its direction, its nulls placement, and any expression wrapped
    # around the alias.
    return [
        rewrite_ordering_term_field_names(term, lambda _name, replacement=pk_field_name: replacement)
        for pk_field_name in pk_field_names
    ]


def ordering_path_field(model, field_name):
    """
    The field that describes the value that an ordering path sorts by, following
    ``formatted_name_lookup_expression`` for a ``formatted_name`` that has no column of its own.

    Django resolves the path itself (see ``vueda.core.paths.query_path_field``), so every path that
    ``order_by()`` accepts on the model resolves here. That includes a path that ends in one or more
    transforms, such as ``created__year``, ``created__date__year``, or a key on a ``JSONField``. Such a
    path is typed by the output of its last transform, which is the value the database sorts:
    ``created__year`` is typed as a number, not as a date.

    A transform may also follow ``formatted_name``, as in ``customer__formatted_name__unaccent``. The
    part up to ``formatted_name`` is rewritten to the lookup expression behind it, and the transforms
    are applied to that path. See ``resolve_formatted_name_transform_path``.

    ``formatted_name`` is a display name every VUEDA model exposes, but it reaches the database three
    different ways: as its own ``GeneratedField`` column; as the path named by
    ``formatted_name_lookup_expression``; or as a ``get_formatted_name()`` method, which computes it
    in Python. The first two are orderable and both resolve here, so a client can order by
    ``formatted_name`` either way without knowing which. A method-backed one has no path to resolve,
    so it raises ``FieldDoesNotExist`` like any other unorderable path — sorting by it would mean
    loading every row into Python — and the ``vueda_info.E005`` system check reports an ordering
    declared on one.

    ``resolve_formatted_name_transform_path`` is what the ordering backend puts into the query, so
    metadata describing a field and the query sorting by it agree by construction. A path that this
    function types is a path that the backend can run. A path that it can't type is one that the
    backend leaves alone.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param field_name: The ordering path to resolve.
    :type field_name: str
    :return: The field that describes the value ordered by: the last field that the path names, or the
        output field of the transform that the path ends in.
    :rtype: django.db.models.Field
    :raises django.core.exceptions.FieldDoesNotExist: If Django can't resolve the path on ``model``.
    """
    lookup_path = resolve_formatted_name_transform_path(model, field_name)

    # A lookup expression takes precedence over a `formatted_name` column, on the rare model that
    # declares both, because the lookup expression is what the query sorts by. Such a model gets no
    # `formatted_name` annotation — `formatted_name_annotation_path` declines it, since annotating
    # over an existing field name raises — and with no annotation to recognize, `VuedaOrderingFilter`
    # rewrites the name to the lookup expression rather than leaving it on the column. Typing the
    # field from that path is what keeps this description in step with the query.
    return query_path_field(model, lookup_path or field_name)
