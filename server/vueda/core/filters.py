"""Filter backends for array parameters, trigram search, and full-text ranking."""

__all__ = (
    "SEARCH_LOOKUP_PREFIX",
    "TRIGRAM_SIMILAR_PREFIX",
    "TRIGRAM_WORD_SIMILAR_PREFIX",
    "BaseArrayFilter",
    "BaseArrayInFilter",
    "FormattedNamePathFilterSetMixin",
    "IdInFilterSet",
    "ModelChoiceArrayFilter",
    "NumberArrayFilter",
    "PublicFilterAliasMixin",
    "VuedaCompositePrimaryKeyFilterSet",
    "VuedaFilterSet",
    "VuedaOrderingFilter",
    "VuedaSearchFilterBackend",
)

import operator
import re
from collections.abc import Iterable
from functools import reduce

from django import forms
from django.contrib.admin.utils import NotRelationField
from django.contrib.postgres.search import SearchQuery
from django.contrib.postgres.search import SearchRank
from django.contrib.postgres.search import SearchVector
from django.contrib.postgres.search import TrigramSimilarity
from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.db.models import F
from django.db.models.constants import LOOKUP_SEP
from django.db.models.functions import Greatest
from django.utils.translation import gettext_lazy as _
from django_filters import ModelChoiceFilter
from django_filters import rest_framework
from ordered_set import OrderedSet
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter
from rest_framework.settings import api_settings

from vueda.core.fields.form import BaseArrayField
from vueda.core.formatted_name import resolve_formatted_name_path
from vueda.core.ordering import NULLS_PLACEMENTS
from vueda.core.ordering import ordering_pk_field_names
from vueda.core.ordering import ordering_term_distinct_column
from vueda.core.ordering import ordering_term_field_names
from vueda.core.ordering import rewrite_ordering_term_field_names
from vueda.core.paths import join_ordering_direction
from vueda.core.paths import orm_filter_path_to_public
from vueda.core.paths import orm_ordering_path_to_public
from vueda.core.paths import public_ordering_path_to_orm
from vueda.core.paths import reject_wildcard
from vueda.core.paths import split_ordering_direction


class BaseArrayFilter(rest_framework.Filter):
    """
    Base class for array type filters, such as IN and RANGE.
    """

    base_field_class = BaseArrayField

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("help_text", _("Multiple values may be separated by commas."))
        super().__init__(*args, **kwargs)

        class ConcreteArrayField(self.base_field_class, self.field_class):  # type: ignore
            pass

        ConcreteArrayField.__name__ = self._field_class_name(self.field_class, self.lookup_expr)

        self.field_class = ConcreteArrayField

    @classmethod
    def _field_class_name(cls, field_class, lookup_expr):
        """
        Generate a suitable class name for the concrete field class. This is not
        completely reliable, as not all field class names are of the format
        <Type>Field.

        ex::

            BaseArrayFilter._field_class_name(DateTimeField, 'year__in')

            returns 'DateTimeYearInField'

        """
        # DateTimeField => DateTime
        type_name = field_class.__name__
        type_name = type_name.removesuffix("Field")

        # year__in => YearIn
        parts = lookup_expr.split(LOOKUP_SEP)
        expression_name = "".join(p.capitalize() for p in parts)

        # DateTimeYearInField
        return f"{type_name}{expression_name}Field"


class BaseArrayInFilter(BaseArrayFilter):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("lookup_expr", "in")
        super().__init__(*args, **kwargs)


class NumberArrayFilter(BaseArrayInFilter, rest_framework.NumberFilter):
    pass


class FormattedNamePathFilterSetMixin:
    """
    Points a filter declared against a related model's ``formatted_name`` at the column behind it.

    A filter declares the path it queries as ``field_name``, and django-filter builds its lookup
    straight from that (``field_name`` + ``lookup_expr``). ``customer__formatted_name`` names nothing
    the database knows on a model that reaches its formatted name through
    ``formatted_name_lookup_expression``: the annotation ``VuedaViewSet.get_queryset`` adds belongs to
    the queryset being filtered, not to the tables it joins. So the declared path is rewritten to the
    one behind it — ``customer__data__formatted_name`` — on this filterset's own copy of the filters.

    The class-level declaration is untouched, and so is everything client-facing. The query parameter
    a client sends is the filter's name on the filterset, not its ``field_name``, and the label a
    filter generates for itself is taken from the declared path before the rewrite, so
    ``model_filtering`` metadata describes the filter the way it was written.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for filter_ in self.filters.values():
            declared_field_name = filter_.field_name

            # A path the queryset already carries an annotation for needs no rewriting: that is how a
            # model's own `formatted_name` is filtered, and the annotation is what metadata describes.
            if declared_field_name in self.queryset.query.annotations:
                continue

            resolved = resolve_formatted_name_path(self.queryset.model, declared_field_name)
            if resolved is None or resolved == declared_field_name:
                continue

            # `Filter.label` generates itself from `field_name` on first read and caches the result,
            # so it has to be read here, while `field_name` is still the declared path. A filter that
            # declared its own label just reports that, and reading it changes nothing.
            declared_label = filter_.label

            filter_.field_name = resolved
            filter_.label = declared_label
            filter_.vueda_declared_field_name = declared_field_name


class PublicFilterAliasMixin:
    """
    Gives every declared filter a dotted public name, distinct from the name django-filter binds it
    under internally.

    A filter's own name can't be dotted to begin with: it is either a Python identifier (a class
    attribute) or a ``__``-joined ``Meta.fields`` entry, and neither grammar can hold a literal
    ``.``. The public name is derived from it by default — every ``__`` becomes a ``.``, the same
    translation ``VuedaOrderingFilter`` applies to a path, so a filter reached through a relation
    (``customer__formatted_name``, or the ``customer__formatted_name__icontains`` django-filter
    itself builds for a ``Meta.fields`` lookup) is reachable under the same dotted name that path
    would take in ``?o=`` or an expand — ``customer.formatted_name`` — with no configuration at all.
    A declared name with no ``__`` in it (``distributor``, or an ordinary ``Meta.fields`` entry
    without a lookup suffix) has nothing to translate and keeps its own name as its public one.

    The declared name is remembered as ``vueda_declared_filter_name``, the way
    ``FormattedNamePathFilterSetMixin`` remembers a rewritten ``field_name``, so metadata and error
    messages can still refer to how the filter was written. It stops being a recognized query
    parameter once renamed: nothing here keeps accepting it alongside the dotted one.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for declared_name in list(self.filters):
            public_name = orm_filter_path_to_public(declared_name)
            if public_name == declared_name:
                continue

            filter_ = self.filters.pop(declared_name)
            filter_.vueda_declared_filter_name = declared_name
            self.filters[public_name] = filter_


class IdInFilterSet(rest_framework.FilterSet):
    id = NumberArrayFilter(field_name="id", lookup_expr="in", widget=forms.HiddenInput)


class VuedaFilterSet(PublicFilterAliasMixin, FormattedNamePathFilterSetMixin, IdInFilterSet):
    pass


class VuedaCompositePrimaryKeyFilterSet(
    PublicFilterAliasMixin, FormattedNamePathFilterSetMixin, rest_framework.FilterSet
):
    """
    We can't have a default 'pk' filter.
    We would want filters for each field that combines to make the pk.
    """


TRIGRAM_SIMILAR_PREFIX = "#"
TRIGRAM_WORD_SIMILAR_PREFIX = "~"
SEARCH_LOOKUP_PREFIX = "V:"


class VuedaOrderingFilter(OrderingFilter):
    """
    Extends DRF's `OrderingFilter` in three ways:

    1. Ordering by a field name can carry a nulls-first/nulls-last placement. `OrderingFilter` only
       applies nulls placement through an expression in a view's default `ordering` (e.g.
       `ordering = [F("due_date").asc(nulls_first=True)]`), and loses it the moment a client
       explicitly requests that same field via `?o=` — DRF passes the request through as a plain
       field name string, which falls back to the database's default nulls placement.

       Declare `nulls_ordering` on the view as a dict of field name -> `"first"`/`"last"` to attach a
       placement to the field itself, regardless of sort direction. To have the placement flip
       (first <-> last) when the field is sorted descending instead, list the field name in
       `nulls_ordering_flip` as well.

       The placement applies wherever that field is sorted by name — an explicit `?o=` request, and
       equally a default `ordering` written as plain strings (`ordering = ["due_date"]`), since DRF
       hands those to the backend as strings too. A default ordering term written as an expression is
       left alone, because it already states its own placement or deliberately states none. So
       `nulls_ordering` is the way to say "this field sorts nulls here" once, rather than repeating an
       expression in `ordering` and still losing it on `?o=`.

       A placement outside `"first"`/`"last"` is ignored at request time rather than raising, and the
       `vueda_info.E007` system check reports it.

    2. Every field named in the view's default ordering (`ordering`, or the model's `Meta.ordering`
       when the view doesn't declare one) is always a valid explicit `?o=` target, even when it isn't
       also listed in `ordering_fields`. Without this, DRF would silently ignore an explicit request
       for a default-only field and fall back to the default ordering, which is surprising: a field a
       client can already see sorted by (in the default) should always be requestable directly.

       A default ordering term may be a plain field name, an `F(...).asc()`/`.desc()` expression, or
       any other expression `order_by()` takes — including a scalar function such as `Lower("name")`
       or `Concat("first_name", "last_name")`. Each field the term references becomes requestable on
       its own, so a two-column function offers both. What such a request sorts by is the column
       itself, not the function over it.

       A `"pk"` term contributes both spellings: the alias, which Django's query machinery resolves,
       and the field name(s) behind it — "id", or every column of a `CompositePrimaryKey`. The
       expansion is what `model_ordering` advertises (metadata never hands a client the literal
       `"pk"`, since it names no field the client can otherwise see), so both the name a
       metadata-driven client sends and the one a reader of the viewset's source might send are
       accepted. This applies wherever the alias is declared, `ordering_fields` included: DRF passes
       an `ordering_fields` entry through verbatim, so `ordering_fields = ["pk"]` would otherwise
       advertise "id" and then ignore `?o=id` for exactly the same reason `ordering = ["pk"]` did.

    3. An ordering term that reaches a related model's `formatted_name` (`customer__formatted_name`)
       is rewritten to the database path behind it before it reaches `order_by()`. Ordering by a
       model's own `formatted_name` works because `VuedaViewSet.get_queryset` annotates the lookup
       expression under that name, but the annotation belongs to the queryset being ordered, not to
       the tables it joins, so the related form would raise `FieldError` without this. The rewrite
       reaches inside an expression, so `Lower("customer__formatted_name")` still sorts case-
       insensitively on the column behind the name.

    4. `?o=` is dotted (`employee.name`), matching every other public path on the wire, while
       `order_by()` and everything above stays `__`-joined. `remove_invalid_fields` is where the two
       meet: it is the one place DRF hands this class a raw, unvalidated list of request terms rather
       than an already-resolved queryset ordering, so it is also the one place a dotted term can be
       told apart from an invalid one before translation, and the one place a request naming even one
       invalid term can be rejected outright rather than quietly ordered by whatever named terms
       happened to validate. Everything below this point — `nulls_ordering`, a view's declared
       `ordering`, the annotation and pk-alias handling above — stays `__`-joined, because none of it
       is written from a request.
    """

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return queryset

        # A declaration that isn't a mapping has no field-to-placement pairs to read, so it is dropped
        # rather than allowed to raise `AttributeError` from `.get()` and fail the request.
        # `vueda_info.E007` reports it, which is where it can be fixed. An empty declaration of any
        # type means the same thing as none at all.
        nulls_ordering = getattr(view, "nulls_ordering", None)
        if not isinstance(nulls_ordering, dict):
            nulls_ordering = {}

        nulls_ordering_flip = getattr(view, "nulls_ordering_flip", None) or ()
        if isinstance(nulls_ordering_flip, str):
            nulls_ordering_flip = (nulls_ordering_flip,)
        elif not isinstance(nulls_ordering_flip, Iterable):
            # Dropped for the same reason a non-mapping `nulls_ordering` is: a declaration with
            # nothing to iterate has no field names to read, and letting it raise `TypeError` from
            # the membership test below would fail the request. `vueda_info.E007` reports it.
            nulls_ordering_flip = ()

        # Nulls placement is declared against the client-facing name, so it has to be applied before
        # any term is rewritten to the path behind that name.
        ordering = [self._apply_nulls_ordering(term, nulls_ordering, nulls_ordering_flip) for term in ordering]
        ordering = [self._resolve_formatted_name(term, queryset) for term in ordering]
        return queryset.order_by(*ordering)

    def remove_invalid_fields(self, queryset, fields, view, request):
        """
        The `?o=` terms translated to `__`-joined `order_by()` terms, or a raised 400 naming every
        term that isn't one of the dotted names `get_valid_fields` accepts.

        DRF's own `remove_invalid_fields` drops whatever doesn't validate and returns what's left,
        which is what lets a request naming one bad field alongside good ones quietly order by the
        good ones, and a request naming nothing valid quietly fall back to the default ordering. Ordering
        is validated atomically instead: every term is checked before any of them is translated, and a
        request naming even one invalid term is rejected in full, with none of it applied.

        :param queryset: The queryset the ordering will apply to.
        :type queryset: django.db.models.QuerySet
        :param fields: The raw, comma-split `?o=` terms, e.g. `["-employee.name", "created"]`.
        :type fields: List[str]
        :param view: The view being ordered.
        :type view: rest_framework.generics.GenericAPIView
        :param request: The current request.
        :type request: rest_framework.request.Request
        :return: The terms translated to `__`-joined `order_by()` terms.
        :rtype: List[str]
        :raises rest_framework.exceptions.ValidationError: If any term is invalid.
        """
        valid_orm_fields = {
            field_name
            for field_name, _label in self.get_valid_fields(queryset, view, {"request": request})
            if isinstance(field_name, str)
        }
        valid_public_fields = {orm_ordering_path_to_public(field_name) for field_name in valid_orm_fields}

        translated = []
        invalid_terms = []
        for term in fields:
            descending, path = split_ordering_direction(term)

            try:
                reject_wildcard(path)
            except ValueError:
                invalid_terms.append(term)
                continue

            if path not in valid_public_fields:
                invalid_terms.append(term)
                continue

            translated.append(join_ordering_direction(descending, public_ordering_path_to_orm(path)))

        if invalid_terms:
            raise ValidationError(
                {
                    api_settings.ORDERING_PARAM: [
                        _("Invalid ordering term(s): {terms}. Valid ordering fields are: {valid}.").format(
                            terms=", ".join(sorted(invalid_terms)),
                            valid=", ".join(sorted(valid_public_fields)),
                        )
                    ]
                }
            )

        return translated

    def get_valid_fields(self, queryset, view, context=None):
        # `context` is passed straight to a serializer by the super call, so a caller that omits it
        # has to get a mapping rather than `None`. Normalized here instead of relying on whatever
        # default DRF's own signature happens to declare, which has changed between versions.
        valid_fields = super().get_valid_fields(queryset, view, {} if context is None else context)

        model = queryset.model
        # Read positionally rather than unpacked, the way DRF's own `remove_invalid_fields` reads
        # these. An `ordering_fields` entry is passed through as-is when it isn't a plain string, so
        # an entry carrying more than a (name, label) pair is DRF's to tolerate and not ours to
        # reject with a `ValueError` from this line.
        valid_field_names = {item[0] for item in valid_fields}
        added_fields = []

        def add(field_name):
            if field_name not in valid_field_names:
                valid_field_names.add(field_name)
                added_fields.append((field_name, field_name))

        def add_pk_expansion(field_name):
            """
            Make the field name(s) behind a ``"pk"`` alias valid alongside the alias itself.

            ``model_ordering`` reports the field(s) a ``"pk"`` alias stands for rather than the alias,
            so the name a metadata-driven client actually sends has to be valid too. Without this,
            declaring ``"pk"`` advertises "id" (or each column of a composite primary key) and then
            silently ignores ``?o=id``, falling back to the default ordering.

            Any name that isn't a ``"pk"`` path expands to itself and is already valid, so nothing is
            added for it.
            """
            # An `ordering_fields` entry is passed through as-is when it isn't a plain string, so the
            # name read off one isn't guaranteed to be a string either. Nothing but a string can hold
            # the alias, and this method's job is to widen the valid set rather than to raise over an
            # entry DRF itself tolerates.
            if not isinstance(field_name, str):
                return

            try:
                pk_field_names = ordering_pk_field_names(model, field_name)
            except (FieldDoesNotExist, NotRelationField):
                # Neither declaration is guaranteed to resolve; `vueda_info.E006` reports that.
                # Leaving the name in place keeps this method's job to widening the valid set, not
                # validating the declaration.
                return

            for pk_field_name in pk_field_names:
                add(pk_field_name)

        # `ordering_fields` may name the alias as readily as `ordering` does, and the metadata expands
        # it in both places, so `?o=` has to accept the expansion in both places too. DRF passes an
        # `ordering_fields` entry through verbatim, which is why the expansion has to happen here
        # rather than being inherited from the super call. Iterated over a snapshot, since `add`
        # writes to the same set.
        for field_name in list(valid_field_names):
            add_pk_expansion(field_name)

        default_ordering = getattr(view, "ordering", None) or model._meta.ordering
        if default_ordering:
            if isinstance(default_ordering, str):
                default_ordering = (default_ordering,)

            for term in default_ordering:
                # One term can name more than one field (`Concat("first_name", "last_name")`) or none
                # at all (`"?"`, `Now()`), so each term contributes however many fields it references.
                for field_name in ordering_term_field_names(term):
                    # The alias itself stays valid, because Django's query machinery resolves it and a
                    # client that reads a viewset's source may well send it.
                    add(field_name)
                    add_pk_expansion(field_name)

        return [*valid_fields, *added_fields]

    @staticmethod
    def _resolve_formatted_name(term, queryset):
        """
        The ordering term with every ``formatted_name`` path in it rewritten to the path behind it.

        A path the queryset already carries an annotation for is left alone: that is how a model's own
        `formatted_name` is ordered, and the annotation is what `model_ordering` describes. Anything
        else with no lookup expression behind it is left alone too, and fails or sorts on its own
        merits the way it always has.
        """

        def rewrite(field_name):
            if field_name in queryset.query.annotations:
                return None

            return resolve_formatted_name_path(queryset.model, field_name)

        return rewrite_ordering_term_field_names(term, rewrite)

    @staticmethod
    def _apply_nulls_ordering(term, nulls_ordering, nulls_ordering_flip):
        """
        The ordering term with the field's declared nulls placement applied, if it has one.

        Only a term that arrives as a bare field-name string is rewritten. A term that is already an
        expression states its own nulls placement — or deliberately states none — so it is left
        alone, and a view that wants a placement it can express directly should write it that way
        rather than through ``nulls_ordering``.

        Both a `?o=` request and a default `ordering` written as plain strings reach this, so a
        placement declared for a field applies wherever that field is sorted by name. That is the
        point: the placement belongs to the field, not to one route to sorting on it.
        """
        if not isinstance(term, str):
            return term

        descending = term.startswith("-")
        field_name = term.removeprefix("-")
        placement = nulls_ordering.get(field_name)

        # An unknown placement is ignored rather than allowed to fail the request: there is no
        # `nulls_<placement>` keyword to pass, and a list endpoint returning rows in the database's
        # default nulls order is a far better outcome than a 500. `vueda_info.E007` reports the
        # declaration, which is where it can actually be fixed.
        if placement not in NULLS_PLACEMENTS:
            return term

        if descending and field_name in nulls_ordering_flip:
            placement = NULLS_PLACEMENTS[placement]

        expression = F(field_name).desc if descending else F(field_name).asc
        return expression(**{f"nulls_{placement}": True})


class VuedaSearchFilterBackend(SearchFilter):
    """
    Custom search filter that supports trigram and word similarity. Use the prefix `#`
    to indicate that the search term in `search_fields` should use trigram
    similarity comparison, and `~` for word similarity. The similarity threshold can be set on the ViewSet
    as `similarity_threshold`.
    """

    customized_lookup_prefixes = {
        TRIGRAM_SIMILAR_PREFIX: "trigram_similar",
        TRIGRAM_WORD_SIMILAR_PREFIX: "trigram_word_similar",
        SEARCH_LOOKUP_PREFIX: "vueda_search",
    }
    lookup_prefixes = {
        **SearchFilter.lookup_prefixes,
        **customized_lookup_prefixes,
    }

    search_threshold = 0.2

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "similarity_threshold" in kwargs:
            self.similarity_threshold = kwargs["similarity_threshold"]

    @staticmethod
    def _ordering_for_distinct(queryset):
        """
        The ordering already on the queryset, paired with the column names ``distinct()`` needs in
        order to keep a ``DISTINCT ON`` matching it.

        ``VuedaOrderingFilter`` runs before this backend and has already turned the client's ``?o=``
        request into the terms the database will actually sort by: a related model's
        ``formatted_name`` rewritten to the column behind it, and a field with a declared
        ``nulls_ordering`` placement turned into an ``F(...).asc(nulls_first=True)`` expression.
        Re-reading the raw query parameter here would throw both away, ordering by a path the
        database doesn't know and dropping the placement, so the terms are taken from the queryset
        instead.

        ``ordering_term_distinct_column`` decides one term at a time, and describes what pairs with
        what. The pairing is all or nothing: ``DISTINCT ON`` matches ``ORDER BY`` from the left, so a
        single unpairable term takes the whole ordering with it rather than leaving a gap that
        misaligns the terms after it.

        ``None`` when the ordering can't be paired, which leaves the caller to order by search rank as
        it does for a request that asked for no ordering at all. Two ways to get there:

        - The queryset carries no explicit ordering. A ``?o=`` naming nothing valid resolves to no
          ordering at all on a view that declares no default, and there is nothing to re-apply.
        - Some term has no column to pair with. A term reading no column (``"?"``) or several
          (``Concat("first_name", "last_name")``) is one case; so is a term that reads one column
          without being that column (``Lower("name")``), and a relation Django expands into the
          related model's own ordering (``"customer"``).

        :param queryset: The queryset as the ordering backend left it.
        :type queryset: django.db.models.QuerySet
        :return: ``(ordering_terms, distinct_columns)``, or ``None``.
        :rtype: Optional[Tuple[List, List[str]]]
        """
        ordering = list(queryset.query.order_by)
        if not ordering:
            return None

        distinct_columns = []
        for term in ordering:
            distinct_column = ordering_term_distinct_column(queryset, term)
            if distinct_column is None:
                return None

            distinct_columns.append(distinct_column)

        return ordering, distinct_columns

    def construct_search(self, field_name, queryset):
        """
        Add our custom prefixes as 'aliases' to its related lookup.
        """
        for prefix, lookup in self.customized_lookup_prefixes.items():
            if field_name.startswith(prefix):
                field_name = field_name[len(prefix) :]
                return f"{field_name}__{lookup}"
        return super().construct_search(field_name, queryset)

    def filter_queryset(self, request, queryset, view):
        """
        Combines VUEDA-style ranked search (`V:`-prefixed fields), trigram similar (`#`-prefixed
        fields), and deterministic lookups (e.g., `^`, `=`). Ranked results are ordered by a
        unified 'combined_rank' annotation.

        1. Parse search fields and terms using DRF's SearchFilter behavior.
        2. Separate VUEDA-prefixed fields (ranked fields (`V:`) and trigram similar fields (`#`)) from standard deterministic lookups.
        3. For ranked fields: annotate rank components (full-text, trigram, word-boundary matches).
        4. For trigram similar fields: combine all terms into one and filter DRF-style (OR across fields).
        5. For deterministic lookups: filter (OR across fields, AND across terms) and boost rank.
        6. Filter on a minimum combined rank and optionally order by it.
        7. Remove duplicates if needed (e.g. for M2M).
        """
        # gather search fields & terms (DRF semantics)
        search_fields = self.get_search_fields(view, request)
        search_terms = self.get_search_terms(request)

        if not search_fields or not search_terms:
            return queryset

        # convert prefix shortcuts into long-form, including ours
        orm_lookups = [self.construct_search(str(field), queryset) for field in search_fields]

        # split out our VUEDA-prefixed lookups
        v_prefix = f"__{self.customized_lookup_prefixes[SEARCH_LOOKUP_PREFIX]}"
        trig_prefix = f"__{self.customized_lookup_prefixes[TRIGRAM_SIMILAR_PREFIX]}"
        trig_word_prefix = f"__{self.customized_lookup_prefixes[TRIGRAM_WORD_SIMILAR_PREFIX]}"

        v_lookups = [lookup for lookup in orm_lookups if lookup.endswith(v_prefix)]
        trig_lookups = [lookup for lookup in orm_lookups if lookup.endswith(trig_prefix)]
        trig_word_lookups = [lookup for lookup in orm_lookups if lookup.endswith(trig_word_prefix)]

        ranked_fields = [lookup[: -len(v_prefix)] for lookup in v_lookups]
        trigram_fields = [lookup[: -len(trig_prefix)] for lookup in trig_lookups]
        trigram_word_fields = [lookup[: -len(trig_word_prefix)] for lookup in trig_word_lookups]

        det_lookups = [
            lookup
            for lookup in orm_lookups
            if lookup not in v_lookups and lookup not in trig_lookups and lookup not in trig_word_lookups
        ]

        if not ranked_fields and not trigram_fields and not trigram_word_fields:
            # no custom lookups, defer to base class behavior for deterministic lookups
            return super().filter_queryset(request, queryset, view)

        annotations = {}

        # ranked search: full-text, trigram and iregex
        if ranked_fields:
            search_vector = SearchVector(*ranked_fields)
            search_query = SearchQuery(" ".join(search_terms))
            annotations["search_rank"] = SearchRank(search_vector, search_query)

            # trigram similarity on every <field, term> pair
            for i, term in enumerate(search_terms):
                for fld in ranked_fields:
                    annotations[f"{fld}_{i}_trg"] = TrigramSimilarity(fld, term)

            # whole-word iregex boost
            regex = r"(?:^|\y)(?:" + "|".join(map(re.escape, search_terms)) + r")(?:$|\y)"
            word_scores = [
                models.Case(
                    models.When(**{f"{fld}__iregex": regex}, then=models.Value(1)),
                    default=models.Value(0),
                    output_field=models.IntegerField(),
                )
                for fld in ranked_fields
            ]
            if len(word_scores) > 1:
                annotations["iregex_score"] = Greatest(*word_scores)
            else:
                annotations["iregex_score"] = word_scores[0]

        # trigram similar: combine all search terms into one and filter DRF-style (OR across fields)
        if trig_lookups or trig_word_lookups:
            combined_term = " ".join(search_terms)
            conditions = [models.Q(**{lookup: combined_term}) for lookup in trig_lookups + trig_word_lookups]
            queryset = queryset.filter(reduce(operator.or_, conditions))

        # deterministic filtering and artificial rank boost
        if det_lookups:
            per_term_groups = [
                reduce(operator.or_, [models.Q(**{lookup: term}) for lookup in det_lookups]) for term in search_terms
            ]
            queryset = queryset.filter(reduce(operator.and_, per_term_groups))

            det_scores = [
                models.Case(
                    models.When(**{lookup: term}, then=models.Value(10)),
                    default=models.Value(0),
                    output_field=models.IntegerField(),
                )
                for lookup in det_lookups
                for term in search_terms
            ]
            annotations["deterministic_score"] = reduce(operator.add, det_scores, models.Value(0))

        # strip custom prefixes so model opts.get_field doesn't choke
        search_fields = list(
            OrderedSet(search_fields)
            - OrderedSet(f"{SEARCH_LOOKUP_PREFIX}{f}" for f in ranked_fields)
            - OrderedSet(f"{TRIGRAM_SIMILAR_PREFIX}{f}" for f in trigram_fields)
            - OrderedSet(f"{TRIGRAM_WORD_SIMILAR_PREFIX}{f}" for f in trigram_word_fields)
            | OrderedSet(ranked_fields)
            | OrderedSet(trigram_fields)
            | OrderedSet(trigram_word_fields)
        )
        # De-dupe if necessary (for M2M or joins)
        # A combination of what is in drf and django.contrib.admin.
        # We can't use a base_queryset as drf does, because we would lose the ordering by ranking.
        mcd = self.must_call_distinct(queryset, search_fields)

        # Whether the client asked for an ordering, which is what decides between sorting by rank and
        # sorting by the request. Read from the query parameter rather than from the queryset, because
        # a view's own default `ordering` reaches the queryset the same way an explicit request does
        # and must not outrank the search ranking -- that is why this backend runs after
        # `VuedaOrderingFilter` (see DEFAULT_FILTER_BACKENDS).
        ordering_requested = bool(request.query_params.get(api_settings.ORDERING_PARAM))

        # What that request became, which is what has to be re-applied alongside `DISTINCT ON` below.
        # `None` when there is nothing usable to re-apply, in which case the rank ordering is used.
        applied_ordering = self._ordering_for_distinct(queryset) if ordering_requested else None

        # final combined rank and ordering
        if annotations:
            # sum every numeric annotation into combined_rank
            annotations["combined_rank"] = reduce(operator.add, [models.F(k) for k in annotations])
            if mcd:
                if applied_ordering is None:
                    queryset = (
                        queryset.annotate(**annotations)
                        .order_by("-combined_rank", "pk")
                        .distinct("combined_rank", "pk")
                        .filter(combined_rank__gte=self.search_threshold)
                    )
                else:
                    ordering_items, distinct_items = applied_ordering
                    queryset = (
                        queryset.annotate(**annotations)
                        .order_by(*ordering_items, "pk")
                        .distinct(*distinct_items, "pk")
                        .filter(combined_rank__gte=self.search_threshold)
                    )
            else:
                queryset = queryset.annotate(**annotations).filter(combined_rank__gte=self.search_threshold)
            if not ordering_requested and not mcd:
                queryset = queryset.order_by("-combined_rank")

        if mcd and not annotations:
            queryset = queryset.distinct()

        return queryset


class ModelChoiceArrayFilter(BaseArrayInFilter, ModelChoiceFilter):
    pass
