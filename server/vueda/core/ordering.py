"""Inspection and rewriting of the ordering terms Django's ``order_by()`` accepts."""

__all__ = (
    "NULLS_PLACEMENTS",
    "PK_ALIAS",
    "RANDOM_ORDERING",
    "expand_ordering_pk",
    "ordering_fields_entry_name",
    "ordering_fields_from_path",
    "ordering_pk_field_names",
    "ordering_term_column_path",
    "ordering_term_distinct_column",
    "ordering_term_field_names",
    "ordering_term_is_ascending",
    "queryset_explicit_ordering",
    "rewrite_ordering_term_field_names",
)

from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_fields_from_path
from django.contrib.admin.utils import get_model_from_relation
from django.core.exceptions import FieldDoesNotExist
from django.db.models import CompositePrimaryKey
from django.db.models import F
from django.db.models.expressions import OrderBy

from vueda.core.formatted_name import resolve_formatted_name_path
from vueda.core.formatted_name import split_alias_path


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
    subclass an application writes and any function a future Django version adds.

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


def ordering_term_column_path(term):
    """
    The field path an ordering term compiles to as a bare column reference, or ``None`` when it
    compiles to anything else.

    This is a narrower question than :func:`ordering_term_field_names`, which reports every column a
    term reads. A term can read exactly one column and still not *be* that column: ``Lower("name")``
    reads ``name`` and compiles to ``LOWER("name")``. Anywhere the column reference itself has to be
    reproduced, rather than the value the term sorts by, the distinction decides whether the term can
    be used at all.

    Three shapes compile to a bare column, and they are the three ways to name one:

    - a field-name string, with or without a ``-`` prefix (``"name"``, ``"-name"``);
    - an ``F``, which is what a string becomes;
    - an ``OrderBy`` wrapping either, which is what ``F("name").asc(nulls_first=True)`` builds.

    A direction and a nulls placement are read off the term and discarded here, because neither
    changes the column being referenced. Everything else compiles to an expression over a column
    rather than to the column: every scalar function, whether or not it reads a single column, and
    Django's random ordering ``"?"``, which references none.

    :param term: The ordering term to inspect.
    :type term: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    :return: The field path the term references, or None.
    :rtype: Optional[str]
    """
    if isinstance(term, str):
        return None if term == RANDOM_ORDERING else term.removeprefix("-")

    expression = term.expression if isinstance(term, OrderBy) else term

    return expression.name if isinstance(expression, F) else None


def ordering_term_distinct_column(queryset, term):
    """
    The column ``distinct()`` needs in order to keep a ``DISTINCT ON`` matching this ordering term, or
    ``None`` when the term has no column to pair with.

    PostgreSQL requires the ``DISTINCT ON`` expressions to match the leftmost ``ORDER BY``
    expressions, and ``distinct()`` accepts only field paths while ``order_by()`` accepts any
    expression. So a term pairs only when it compiles to a bare column reference *and* Django
    compiles that reference the same way on both sides of the query. A caller that gets ``None`` has
    to drop the whole ordering rather than the one term: the match is positional, so a gap in the
    middle would misalign every term after it.

    Four things a term can be, and what each pairs with:

    - **An expression over a column**, such as ``Lower("name")``. Pairs with nothing.
      ``distinct("name")`` compiles to the column and the ordering compiles to ``LOWER("name")``, so
      the two never match however the pair is written.
    - **A queryset annotation**, such as the ``formatted_name`` that
      ``formatted_name_lookup_expression`` puts on every queryset. Pairs with its own name. Both
      sides resolve an annotation to the same expression.
    - **A relation whose related model declares a** ``Meta.ordering``, such as ``"customer"`` on a
      model whose ``Customer`` orders by ``["user__name"]``. Pairs with nothing.
      ``Query.find_ordering_name`` replaces such a term with the related model's own ordering, over
      the joined table, while ``SQLCompiler.get_distinct`` trims the join back to the local foreign
      key column. A relation whose related model declares no ordering pairs with itself, because both
      sides then reach the same local column.
    - **Any other resolvable field path**, including one reaching through relations
      (``"customer__data__formatted_name"``) and the ``"pk"`` alias. Pairs with the path itself, or
      with the field behind the alias. A composite primary key pairs with nothing, since one term
      would need several columns and the match is one term to one column.

    A path that resolves to no field at all pairs with nothing. Such a term fails the query on its
    own account, and returning ``None`` leaves that failure to the ordering rather than turning it
    into a mismatched ``DISTINCT ON``.

    :param queryset: The queryset the term will be applied to, read for its model and annotations.
    :type queryset: django.db.models.QuerySet
    :param term: The ordering term to pair.
    :type term: Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]
    :return: The field path to pass to ``distinct()``, or None.
    :rtype: Optional[str]
    """
    path = ordering_term_column_path(term)
    if path is None:
        return None

    if path in queryset.query.annotations:
        return path

    model = queryset.model
    try:
        # `distinct()` resolves the alias as readily as `order_by()` does, but the alias stands for
        # more than one column on a composite primary key, and one term can only be paired with one.
        pk_field_names = ordering_pk_field_names(model, path)
        if len(pk_field_names) != 1:
            return None

        path = pk_field_names[0]
        fields = get_fields_from_path(model, path)
    except (FieldDoesNotExist, NotRelationField):
        return None

    final_field = fields[-1]
    if final_field.is_relation and get_model_from_relation(final_field)._meta.ordering:
        return None

    return path


def queryset_explicit_ordering(queryset):
    """
    The ordering terms a queryset carries in its own right, as ``order_by()`` received them.

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
    what this reads off a viewset's class-level ``queryset`` against what that viewset declares as its
    default ordering; neither it nor this claims to know a request's final order.

    An ordering set by ``extra(order_by=...)`` reports nothing. That is raw SQL rather than ordering
    terms, so it has no field paths to read, and reporting the terms it overrides would describe an
    ordering the query doesn't use.

    An ordering *removed* by a bare ``order_by()`` reports nothing either, which is a gap rather than
    a judgement: that call clears the model's default ordering along with any explicit one, so the
    rows arrive unordered while the metadata still reports the model's declaration. Nothing here
    distinguishes a queryset that never ordered from one that deliberately stopped ordering.

    :param queryset: The queryset to inspect.
    :type queryset: django.db.models.QuerySet
    :return: The explicit ordering terms, or an empty list when the queryset carries none.
    :rtype: List[Union[str, django.db.models.F, django.db.models.expressions.BaseExpression]]
    """
    query = getattr(queryset, "query", None)
    if query is None:
        return []

    if getattr(query, "extra_order_by", ()):
        return []

    return list(getattr(query, "order_by", ()) or ())


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
    split = split_alias_path(model, field_name, PK_ALIAS)
    if split is None:
        return [field_name]

    prefix, pk_model, _prefix_fields = split
    pk = pk_model._meta.pk
    pk_fields = pk.fields if isinstance(pk, CompositePrimaryKey) else (pk,)

    # A field's `name`, not its `attname`: the name is what DRF validates an explicit `?o=` request
    # against, and it's what `model_ordering.fields` already advertises for a relation ("order" rather
    # than "order_id").
    return [f"{prefix}{pk_field.name}" for pk_field in pk_fields]


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


def ordering_fields_from_path(model, field_name):
    """
    The model fields an ordering path resolves to, following ``formatted_name_lookup_expression`` for
    a ``formatted_name`` that has no column of its own.

    ``formatted_name`` is a display name every VUEDA model exposes, but it reaches the database three
    different ways: as its own ``GeneratedField`` column; as the path named by
    ``formatted_name_lookup_expression``; or as a ``get_formatted_name()`` method, which computes it
    in Python. The first two are orderable and both resolve here, so a client can order by
    ``formatted_name`` either way without knowing which. A method-backed one has no path to resolve,
    so it raises ``FieldDoesNotExist`` like any other unorderable path — sorting by it would mean
    loading every row into Python — and the ``vueda_info.E005`` system check reports an ordering
    declared on one.

    ``resolve_formatted_name_path`` is what the ordering and filtering backends put into the query, so
    metadata describing a field and the query sorting by it agree by construction: a path this types
    is a path those can run, and one it can't type is one they leave alone.

    :param model: The model the path starts from.
    :type model: Type[django.db.models.Model]
    :param field_name: The ordering path to resolve.
    :type field_name: str
    :return: The fields the path traverses, the last of which is the column ordered by.
    :rtype: List[django.db.models.Field]
    """
    lookup_path = resolve_formatted_name_path(model, field_name)

    # A lookup expression takes precedence over a `formatted_name` column, on the rare model that
    # declares both, because the lookup expression is what the query sorts by. Such a model gets no
    # `formatted_name` annotation — `formatted_name_annotation_path` declines it, since annotating
    # over an existing field name raises — and with no annotation to recognize, `VuedaOrderingFilter`
    # rewrites the name to the lookup expression rather than leaving it on the column. Typing the
    # field from that path is what keeps this description in step with the query.
    return get_fields_from_path(model, lookup_path or field_name)
