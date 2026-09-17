"""ViewSet base classes with atomic transactions, row-level filtering, and flex-fields."""

__all__ = (
    "AtomicCreateModelViewSetMixin",
    "AtomicDestroyModelViewSetMixin",
    "AtomicModelViewSet",
    "AtomicModelViewSetMixin",
    "AtomicUpdateModelViewSetMixin",
    "DeactivateActionViewSetMixin",
    "FlexFieldsMixin",
    "ListRowLevelViewSetMixin",
    "NoExtraFieldsForViewSetMixin",
    "PerActionSerializerMixin",
    "VuedaReadOnlyViewSet",
    "VuedaViewSet",
    "WarningConfirmationMixin",
    "build_prefetch_plan",
    "filter_new_prefetch_lookups",
    "resolve_relation_path",
)

import datetime
import warnings
import weakref
from functools import cache

import pghistory
from django.conf import settings
from django.contrib.admin.utils import NotRelationField
from django.contrib.admin.utils import get_fields_from_path
from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import FieldError
from django.db import transaction
from django.db.models import CompositePrimaryKey
from django.db.models import Prefetch
from django.db.models import Sum
from django.db.models.fields.reverse_related import ForeignObjectRel
from rest_flex_fields import WILDCARD_VALUES
from rest_flex_fields.views import FlexFieldsMixin as DefaultFlexFieldsMixin
from rest_framework import status
from rest_framework import viewsets
from rest_framework import viewsets as drf_viewsets
from rest_framework.exceptions import ErrorDetail
from rest_framework.exceptions import NotAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.serializers import ListSerializer

from vueda.core.decorators import DRY_RUN_HEADER
from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.exceptions import gate_warnings
from vueda.core.formatted_name import annotate_formatted_name
from vueda.core.models import ActivatableBaseModel
from vueda.core.permissions import check_action_permission
from vueda.core.permissions import filter_rows_for_user
from vueda.core.serializers import GenericForeignKeySerializer
from vueda.core.serializers import PrimaryKeyListSerializer
from vueda.core.serializers import ensure_flex_fields_applied
from vueda.core.utils import sort_by_dot_count_alphabetically
from vueda.history.actions import build_action_groups
from vueda.history.queries import action_groups_for
from vueda.history.queries import events_in_groups
from vueda.history.revision import annotate_object_revision
from vueda.history.revision import is_tracked
from vueda.history.serializers.actions import HistoryActionGroupSerializer


# The zero a column total falls back to when its filtered set is empty, by column type. Django hands
# an aggregate's `default` to `Value(default, <the aggregate's own output field>)`, so the zero has
# to be the type being summed: a plain `0` adapted as an interval is not something a database will
# accept. `DurationField` is the only summable column that isn't a number, so it is the only entry.
COLUMN_TOTAL_ZEROES = {"DurationField": datetime.timedelta(0)}


@cache
def _column_total_zero(model, path):
    """
    The zero to total ``path`` down to when nothing matched, cached per model and path.

    Resolving the leaf field is `_meta` walking rather than a query, and `column_totals` is declared
    on the class, so the answer never changes for a given pair and is worked out once per process.

    A path that doesn't resolve gets the numeric zero, which is never used: ``aggregate()`` raises
    ``FieldError`` for it on the same call, and ``vueda_info.E011`` reports it at check time. A path
    naming a queryset annotation is the exception -- it resolves against the query rather than
    ``_meta``, so :func:`_column_total_zero_for` handles that one before this is reached.
    """
    try:
        field = get_fields_from_path(model, path)[-1]
    except (FieldDoesNotExist, NotRelationField):
        return 0
    return COLUMN_TOTAL_ZEROES.get(field.get_internal_type(), 0)


def _column_total_zero_for(model, path, annotation):
    """
    The zero for ``path``, reading ``annotation``'s own output field when the path names one.

    A queryset annotation has no entry in ``_meta`` to walk to, so the cached lookup above would
    fall back to the numeric zero for it -- wrong for an annotation that computes a duration, where
    the database is handed a plain ``0`` as an interval. The annotation carries the type itself.

    Not cached, because the annotation belongs to a queryset rather than to the class. An expression
    that can't name a single output field (mixed types, which Django refuses to guess at) falls back
    to the numeric zero, and the aggregate raises for it on the same call the way it always did.
    """
    if annotation is None:
        return _column_total_zero(model, path)
    try:
        internal_type = annotation.output_field.get_internal_type()
    except (FieldError, AttributeError):
        return 0
    return COLUMN_TOTAL_ZEROES.get(internal_type, 0)


class WarningConfirmationMixin:
    """
    Gate writes behind an explicit confirmation when they report advisory warnings.

    After validation succeeds (so blocking errors have already produced a 400) and before the
    instance is written, the warnings source is consulted. If it returns warnings and the request
    has not acknowledged them, a :class:`~vueda.core.exceptions.ConfirmationRequired` (HTTP 409) is
    raised, withholding the save. The client surfaces the warnings, the user confirms, and the
    resubmission carries the warnings digest in the ``Acknowledge-Warnings`` header, which matches
    and lets the write proceed. A changed warning set yields a different digest and re-prompts.
    The shared gate logic lives in :func:`~vueda.core.exceptions.gate_warnings`.

    Raising before the write means nothing is committed, so this does not depend on the request
    being wrapped in a transaction.

    Warnings sources:

    - Single-object ``create``/``update``: the serializer's ``get_warnings()``, consulted in
      ``perform_create``/``perform_update``. A serializer without ``get_warnings`` (including a
      ``ListSerializer`` wrapping a Vueda serializer, i.e. bulk writes) is skipped, so warnings on
      bulk/list saves are not surfaced.
    - ``destroy``, ``activate``, and ``deactivate`` (single and bulk): ``get_warnings_for_object``
      for a single object, and ``get_warnings`` for a bulk request; called by
      ``VuedaViewSet.destroy`` and ``DeactivateActionViewSetMixin``. See their docstrings.
    """

    def get_warnings_for_object(self, action, obj):
        """
        Single-object warnings hook for actions that write without a per-object serializer.

        ``action`` is the action name string (``"destroy"``, ``"activate"``, or ``"deactivate"``)
        and ``obj`` is the single affected instance. Return the aggregate ``{field: [messages]}``
        shape (the same shape the serializer-level ``get_warnings()`` returns; use
        ``"non_field_errors"`` for a warning not tied to a field).

        Called directly for a single-object request. The default ``get_warnings`` below also calls
        this once per instance for a bulk request, keying each result by object id, so overriding
        this hook alone gates both the single-object and bulk forms of ``action`` with the same
        rule -- override ``get_warnings`` instead only if bulk needs different or bulk-optimized
        logic.

        The default returns ``{}``, meaning no confirmation is required.
        """
        return {}

    def get_warnings(self, action, objs):
        """
        Bulk warnings hook for actions that write without a per-object serializer.

        ``action`` is the action name string (``"destroy"``, ``"activate"``, or ``"deactivate"``)
        and ``objs`` is a queryset of the affected instances for a bulk request. Return the
        per-object ``{object_id: {field: [messages]}}`` shape, one entry per warned object keyed
        by ``str(pk)``, so the client can attribute each warning back to its object.

        The default calls ``get_warnings_for_object(action, obj)`` once per instance in ``objs``
        and keys each non-empty result by ``str(obj.pk)``. Override ``get_warnings_for_object``
        instead unless bulk needs its own logic (for example a single bulk-optimized query rather
        than one check per instance).
        """
        return {str(obj.pk): warnings for obj in objs if (warnings := self.get_warnings_for_object(action, obj))}

    def _gate_warnings(self, serializer):
        get_warnings = getattr(serializer, "get_warnings", None)
        if get_warnings is None:
            return
        gate_warnings(self.request, get_warnings())

    def perform_create(self, serializer):
        self._gate_warnings(serializer)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self._gate_warnings(serializer)
        super().perform_update(serializer)


class AtomicCreateModelViewSetMixin(drf_viewsets.mixins.CreateModelMixin):
    """Wraps the DRF ``create`` action in a database transaction."""

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().create(request, *args, **kwargs)


class AtomicUpdateModelViewSetMixin(drf_viewsets.mixins.UpdateModelMixin):
    """Wraps the DRF ``update`` and ``partial_update`` actions in a database transaction."""

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().update(request, *args, **kwargs)


class AtomicDestroyModelViewSetMixin(drf_viewsets.mixins.DestroyModelMixin):
    """Wraps the DRF ``destroy`` action in a database transaction."""

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            return super().destroy(request, *args, **kwargs)


class AtomicModelViewSetMixin(
    AtomicCreateModelViewSetMixin, AtomicUpdateModelViewSetMixin, AtomicDestroyModelViewSetMixin
):
    """Combines all three atomic write mixins: create, update, and destroy."""


class AtomicModelViewSet(
    AtomicCreateModelViewSetMixin,
    drf_viewsets.mixins.RetrieveModelMixin,
    AtomicUpdateModelViewSetMixin,
    AtomicDestroyModelViewSetMixin,
    drf_viewsets.mixins.ListModelMixin,
    drf_viewsets.GenericViewSet,
):
    """
    A Base ViewSet that wraps atomic transactions around create, update, and destroy.
    """


class ListRowLevelViewSetMixin(drf_viewsets.mixins.ListModelMixin, drf_viewsets.GenericViewSet):
    """Filter out rows the user cannot access and expose column aggregates.

    ``column_totals`` maps a client-facing column name to the ORM field path aggregated for it::

        column_totals = {"hours": "hours", "product_price": "product_option__price"}

    The key is what a client asks for in the column totals query parameter
    (``settings.COLUMN_TOTALS_PARAM``, ``ct`` by default) and the key it gets back under in the
    response's ``columnTotals``; the value is a server-side detail no client ever sees. Keeping the
    two apart is what lets a total sit under the column name that renders it, whatever the ORM path
    behind it is spelled like.

    Totals are opt-in. A ``list`` request that names none gets ``columnTotals: {}`` and runs no
    aggregation query at all; one that names some aggregates exactly those, one ``SUM`` each. A
    wildcard value (``*`` or ``~all``, the same spellings ``?e=`` and ``?f=`` take) asks for every
    declared total.

    Every value is summed, so every value has to name a summable column, reached (if at all) through
    relations that match at most one related row. A relation that can match several -- a reverse
    foreign key, a many-to-many -- joins a row per related object and would inflate *every* total in
    the same ``aggregate()`` call, not just its own, which is why such a path is rejected outright
    rather than aggregated on its own. The ``vueda_info.E011`` system check reports a declaration
    that breaks any of these rules; see ``vueda.info.checks``.
    """

    column_totals: dict[str, str] = {}
    applies_workflow_state_list_filter = True

    def apply_row_level_filter(self, queryset, perm_type="list"):
        """
        Apply row-level and workflow-aware queryset filters for the given ``perm_type``.
        Calls ``RowLevelPermissions.check_queryset`` and, when the model has a workflow,
        also annotates state permission info and calls ``check_queryset_workflow``.
        """
        return filter_rows_for_user(queryset, self.request.user, perm_type=perm_type)

    def get_declared_column_totals(self):
        """
        This viewset's ``column_totals`` mapping, or ``{}`` when it declares none.

        Anything that isn't a mapping reads as "none declared" rather than raising here: a
        misconfigured declaration is the ``vueda_info.E011`` system check's to report, and a request
        is not the place to find out about it. The effect is that such a viewset offers no totals at
        all, which is also what its metadata advertises.

        An override may narrow the mapping per request, and ``list`` and the OpenAPI schema both
        honor it. Metadata cannot: ``model_column_totals`` is built from the registered viewset
        *class*, so it advertises the ``column_totals`` attribute. Keep every total an override
        might return in that attribute -- one that isn't there is never advertised, so no client
        learns to ask for it.
        """
        column_totals = getattr(self, "column_totals", None)
        return column_totals if isinstance(column_totals, dict) else {}

    def get_requested_column_totals(self, request):
        """
        The declared total names this ``list`` request asked for, in declaration order.

        The names arrive in ``settings.COLUMN_TOTALS_PARAM``. Repeating the parameter and
        comma-separating within one value mean the same thing, matching how ``?e=`` and ``?f=`` are
        read; empty values and duplicates are dropped, so ``?ct=`` on its own asks for nothing.

        A wildcard (``*`` or ``~all``) asks for every declared total. It does not excuse an unknown
        name sent alongside it: a name that isn't declared is a mistake in the request whatever else
        it carries, so it is still reported.

        Raises :class:`~vueda.core.exceptions.VuedaValidationError` (HTTP 400) naming the valid
        totals for any name this viewset doesn't declare.
        """
        param = settings.COLUMN_TOTALS_PARAM
        declared = self.get_declared_column_totals()

        requested = set()
        unknown = []
        wildcard = False
        for raw_value in request.query_params.getlist(param):
            for name in raw_value.split(","):
                name = name.strip()
                if not name:
                    continue
                if name in WILDCARD_VALUES:
                    wildcard = True
                elif name in declared:
                    requested.add(name)
                elif name not in unknown:
                    unknown.append(name)

        if unknown:
            if declared:
                valid = (
                    f"Valid column totals are {', '.join(sorted(declared))}. "
                    f"Or use a wildcard to request all: {', '.join(sorted(WILDCARD_VALUES))}."
                )
            else:
                valid = "This endpoint declares no column totals."
            raise VuedaValidationError({param: [f"Invalid column total '{name}'.  {valid}" for name in unknown]})

        if wildcard:
            return tuple(declared)

        # Declaration order rather than request order, so the same set of names always comes back
        # keyed the same way regardless of how the client spelled the request.
        return tuple(name for name in declared if name in requested)

    def get_column_info(self, queryset, requested_column_totals=()):
        """
        Aggregate the requested column totals over ``queryset``, keyed by their declared names.

        ``requested_column_totals`` comes from :meth:`get_requested_column_totals`. An empty one
        returns ``{}`` without touching the database -- a declared total costs nothing until a
        client asks for it.

        Each total carries a zero as its ``default``, so a filter matching no rows totals ``0``
        rather than ``null``. ``SUM`` over no rows is ``NULL`` in SQL, but the sum of nothing is
        zero everywhere a reader would think about it, and a footer cell is the wrong place to
        explain the difference. It also means a client never has to tell "no rows" apart from "no
        total": the response says a total is a number, and it always is one.

        The sum runs over the matched rows re-selected by primary key rather than over ``queryset``
        itself. ``SUM`` counts a row once per joined match, so a query that reached through a
        multi-valued relation would total a row's value as many times as it has related rows --
        silently, as a number that looks plausible. ``vueda_info.E011`` keeps the declared *path*
        single-valued, but the join can arrive from somewhere the check cannot see: a
        ``filterset_class`` filter spanning a reverse FK or M2M, or a ``RowLevelPermissions``
        ``Q`` doing the same. Re-selecting by pk means a row is summed once however it was matched,
        which is what "the same filtered, permission-limited set" has to mean for a total to be
        worth showing.

        A total over an annotation the viewset's own ``get_queryset`` adds cannot follow that route,
        so it is aggregated over ``queryset`` itself and the two kinds are summed in separate calls.
        The annotation belongs to the queryset being replaced, and it cannot be moved: the
        expressions in ``query.annotations`` are already resolved, and their ``Col`` leaves hold the
        aliases of the query they were resolved against. Re-applying one to another queryset adds no
        join -- ``Col`` has no ``resolve_expression`` of its own -- so an annotation reaching through
        a relation would compile to SQL naming a table the query never joined.

        The consequence is that an annotation total is not protected from the row multiplication
        described above: it is summed over the filtered queryset with whatever joins matched it. A
        total over a real column is the one that carries the guarantee, which is the other reason to
        prefer a ``GeneratedField`` or a database view where the value could be a column.
        """
        if not requested_column_totals:
            return {}
        declared = self.get_declared_column_totals()
        model = queryset.model
        # `_base_manager`, not `_default_manager`: every visibility rule is already baked into the
        # pks being selected, and a default manager that filters would subtract rows from a set the
        # user was just shown.
        #
        # `.order_by().distinct()` reduces the subquery to "which rows matched". Both calls are
        # load-bearing. A search across a many-to-many leaves the queryset ordered by a ranking
        # annotation and deduplicated with `DISTINCT ON (combined_rank, pk)`; `.values("pk")` masks
        # that annotation out of the select, and a `DISTINCT ON` naming a column no longer selected
        # cannot be compiled -- so the distinct fields are reset to a plain `DISTINCT` before that
        # can happen. The ordering goes with them: Postgres requires `DISTINCT ON` terms to lead the
        # `ORDER BY`, and a subquery asked only for a set of ids has no use for either. Deduplicating
        # by pk is what this subquery is for, so nothing is lost -- the annotation is still resolved
        # where the search actually uses it, in the `WHERE` clause.
        annotations = queryset.query.annotations
        column_names = [name for name in requested_column_totals if declared[name] not in annotations]
        annotation_names = [name for name in requested_column_totals if declared[name] in annotations]

        totals = {}
        if column_names:
            matched_pks = queryset.order_by().distinct().values("pk")
            # `db_manager`, so a queryset pinned to a replica with `.using()` keeps that connection.
            # Django refuses a subquery that spans two databases, and the router would otherwise be
            # free to answer with a different one than the pks are being selected from.
            rows = model._base_manager.db_manager(queryset.db).filter(pk__in=matched_pks)
            totals.update(
                rows.aggregate(
                    **{
                        name: Sum(declared[name], default=_column_total_zero(model, declared[name]))
                        for name in column_names
                    }
                )
            )
        if annotation_names:
            # Aggregated under a generated alias rather than the total's own name. A total is
            # normally named after what it sums, so `{"line_total": "line_total"}` is the ordinary
            # spelling -- and `aggregate(line_total=Sum("line_total"))` would resolve the argument
            # to the alias being defined instead of to the annotation, emitting a bare
            # `SUM("line_total")` that names no column the query selects. The alias is dropped again
            # below, so nothing outside this call sees it.
            aliases = {name: f"_column_total_{index}" for index, name in enumerate(annotation_names)}
            # Summed over `values(pk, ...).distinct()`, which Django compiles to the sum of a
            # subquery selecting each matched row's id beside the values being summed. A join that
            # matched a row more than once contributes one `(id, value)` pair, so the annotation
            # gets the same "each matched row counts once" guarantee the re-selection above gives a
            # real column -- by deduplicating in the subquery rather than by moving the annotation,
            # which cannot be moved. The id is what makes it work: two different rows sharing a
            # value stay two rows.
            #
            # An annotation reading the multi-valued side of the join is the case this does not
            # answer, and nothing could: it has a value per joined row rather than per row, so there
            # is no per-row total to compute. Exact duplicates still collapse.
            #
            # Ordering is dropped for the same reason as above: `SELECT DISTINCT` requires its
            # `ORDER BY` terms in the select list, and a search leaves the queryset ordered by a
            # ranking annotation that is not among the values being summed.
            paths = list(dict.fromkeys(declared[name] for name in annotation_names))
            aggregated = (
                queryset.order_by()
                .values("pk", *paths)
                .distinct()
                .aggregate(
                    **{
                        aliases[name]: Sum(
                            declared[name],
                            default=_column_total_zero_for(model, declared[name], annotations[declared[name]]),
                        )
                        for name in annotation_names
                    }
                )
            )
            totals.update({name: aggregated[alias] for name, alias in aliases.items()})

        # Declaration order, whichever call each total came back from, so the response keys read the
        # same way `model_column_totals` advertises them however the two kinds were mixed.
        return {name: totals[name] for name in requested_column_totals}

    def list(self, request, *args, **kwargs):
        """
        applying row level filter in get_queryset() causes problems
         with other drf actions, specifically encountered with create
         not finding it's created object
        """
        # Validated before any query runs, so an unknown total name is a 400 rather than a page of
        # rows with a total quietly missing from it.
        requested_column_totals = self.get_requested_column_totals(request)

        # future: when updating drf, check that the copied code is still the same
        # code from drf
        queryset = self.filter_queryset(self.get_queryset())
        # our addition

        queryset = self.apply_row_level_filter(queryset)
        # end addition

        page = self.paginate_queryset(queryset)
        if page is not None:
            # Aggregated here rather than before paginating, because only a paginated response has
            # somewhere to carry totals: an unpaginated one is a bare list of rows. Computing them
            # for such a viewset would run a `SUM` per requested total and then drop every one of
            # them. Still aggregated over `queryset` rather than `page`, so a total covers the whole
            # filtered set and not just the rows on this page.
            column_totals = self.get_column_info(queryset, requested_column_totals)
            serializer = self.get_serializer(page, many=True)
            if hasattr(self, "paginator"):
                self.paginator.column_totals = column_totals
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        # end code from drf


def add_valid_child_names(valid_set, field_name, child_names_list):
    for child_name in child_names_list:
        if child_name:
            valid_set.add(f"{field_name}.{child_name}")


def get_recursive_expands_and_fields(serializer, depth, max_depth):
    max_depth = min((max_depth, settings.REST_FLEX_FIELDS["MAXIMUM_EXPANSION_DEPTH"]))

    valid_expands = set()
    valid_wildcard_expands = set()
    valid_fields = set()
    valid_wildcard_fields = set()

    if depth < max_depth:
        if hasattr(serializer, "fields"):
            valid_fields.update(serializer.fields.keys())

        permitted_expands = None
        if "permitted_expands" in serializer.context and hasattr(serializer, "_flex_options_rep_only"):
            permitted_expands = frozenset(serializer.context["permitted_expands"])

        if hasattr(serializer, "Meta"):
            for value in WILDCARD_VALUES:
                valid_wildcard_fields.add(value)

            if (
                "formatted_name" not in valid_fields
                and hasattr(serializer.Meta, "model")
                and serializer.Meta.model._has_formatted_name_field()
            ):
                valid_fields.add("formatted_name")

            if hasattr(serializer.Meta, "expandable_fields"):
                if permitted_expands is not None and not permitted_expands:
                    return (
                        valid_expands,
                        valid_wildcard_expands,
                        valid_fields,
                        valid_wildcard_fields,
                    )  # No permitted expands

                for value in WILDCARD_VALUES:
                    valid_wildcard_expands.add(value)

                for field_name, serializer_data in serializer.Meta.expandable_fields.items():
                    if permitted_expands is not None and field_name not in permitted_expands:
                        continue

                    valid_fields.add(field_name)
                    valid_expands.add(field_name)

                    serializer_settings = {}
                    if isinstance(serializer_data, tuple):  # rest_flex_fields only tests for tuple.
                        child_serializer, serializer_settings = serializer_data
                    else:
                        child_serializer = serializer_data

                    if isinstance(child_serializer, str):
                        child_serializer = serializer._get_serializer_class_from_lazy_string(child_serializer)

                    child_serializer = child_serializer(**serializer_settings)

                    if isinstance(child_serializer, ListSerializer):
                        child_serializer = child_serializer.child

                    (
                        child_valid_expands,
                        child_valid_wildcard_expands,
                        child_valid_fields,
                        child_valid_wildcard_fields,
                    ) = get_recursive_expands_and_fields(child_serializer, depth + 1, max_depth)

                    if isinstance(child_serializer, GenericForeignKeySerializer):
                        for value in WILDCARD_VALUES:
                            child_valid_wildcard_fields.add(value)

                    add_valid_child_names(valid_expands, field_name, child_valid_expands)
                    add_valid_child_names(valid_wildcard_expands, field_name, child_valid_wildcard_expands)
                    add_valid_child_names(valid_fields, field_name, child_valid_fields)
                    add_valid_child_names(valid_wildcard_fields, field_name, child_valid_wildcard_fields)

    return valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields


# Keyed weakly so a filterset class built at runtime (one composed per view, or per test) is
# collectable once its last other reference goes away. A class declared in a module is referenced by
# that module and lives as long as the process either way.
_FILTERSET_QUERY_PARAM_NAMES = weakref.WeakKeyDictionary()


def get_filterset_query_param_names(filterset_class, get_queryset):
    """
    The query parameter names a filterset accepts, including the suffixed names of multi-widget
    filters and each filter's lookup expression form.

    Read the filters from an instance rather than from ``filterset_class.get_filters()``. That
    classmethod hands back the filter objects declared on the class itself, and ``Filter.field``
    caches the form field it builds on whichever filter it is read from. Reading it off the class
    would freeze the choices of value-derived filters (``AllValuesFilter`` and friends) at whatever
    the first request handled by this process saw, so values added later would be rejected as
    invalid choices for the rest of the process.

    The names depend only on the filterset class, so they are built once per class. Instantiating a
    filterset reads every filter's field, which is a query per value-derived filter, and this runs on
    every list request.

    A filterset that names its model in ``Meta`` is instantiated without a queryset, which leaves it
    to build the default one for that model. Passing the view's queryset instead would make this
    depend on what ``get_queryset`` does, and ``VuedaViewSet.get_queryset`` builds a serializer that
    rejects an over-deep ``?e=``. Discovery would then report that error on a cache miss and the
    unrecognized parameter on a cache hit, so the same request would fail two different ways
    depending on what an earlier request left behind. Only the filter names are read here, so the
    queryset the filterset ends up filtering does not matter.

    A filterset whose ``Meta`` names no model takes its model from the queryset it is given, so that
    one still gets the view's. ``get_queryset`` is a callable rather than a queryset because the
    cached path and the model-backed path never call it.
    """
    names = _FILTERSET_QUERY_PARAM_NAMES.get(filterset_class)
    if names is not None:
        return names

    # `BaseFilterSet.__init__` defaults a missing queryset to `Meta.model`'s, and every filter reads
    # its model from the queryset the filterset holds.
    queryset = None if filterset_class._meta.model is not None else get_queryset()

    names = set()
    for filter_name, filter_obj in filterset_class(queryset=queryset).filters.items():
        widget = filter_obj.field.widget
        # If the filter has suffixes, then we need to use those with the filter name.
        if hasattr(widget, "suffixes"):
            for suffix in widget.suffixes:
                names.add(f"{filter_name}_{suffix}")
        else:
            names.add(filter_name)
        if hasattr(filter_obj, "lookup_expr"):
            names.add(f"{filter_name}__{filter_obj.lookup_expr}")

    names = frozenset(names)
    _FILTERSET_QUERY_PARAM_NAMES[filterset_class] = names
    return names


def _resolve_relation_segment(model, segment):
    """
    Match ``segment`` against one of ``model``'s relations by the same accessor name Django uses
    for instance attribute access, ``select_related``, and ``prefetch_related`` alike: a forward
    relation's field name, or a reverse relation's accessor name (``get_accessor_name()``), which
    is not the same string as the reverse field's own ``name`` (that is the query lookup name --
    ``related_query_name()`` territory -- and can differ from the attribute/prefetch accessor
    whenever ``related_name`` and ``related_query_name`` diverge).

    Returns ``(related_model, is_to_one)`` for a matching relation, or ``None`` when ``segment``
    names a plain column, a Python property or method, or a ``GenericForeignKey`` (a relation with
    no fixed ``related_model`` to plan against).
    """
    for field in model._meta.get_fields():
        if not field.is_relation:
            continue

        name = field.get_accessor_name() if isinstance(field, ForeignObjectRel) else field.name
        if name != segment:
            continue

        related_model = getattr(field, "related_model", None)
        if related_model is None:
            return None

        is_to_one = bool(getattr(field, "one_to_one", False) or getattr(field, "many_to_one", False))
        return related_model, is_to_one

    return None


def resolve_relation_path(model, source):
    """
    Walk a serializer field's dotted ``source`` against ``model``'s relations, one segment per dot,
    the same traversal DRF's own attribute resolution performs. Returns ``(orm_path, leaf_model,
    is_to_one)``: ``orm_path`` is ``source`` with dots replaced by the ``__`` lookup separator,
    ``leaf_model`` is the model the last segment relates to, and ``is_to_one`` says whether every
    segment in the chain is single-valued (forward foreign key or one-to-one, either direction) --
    the condition under which the whole chain can live in ``select_related`` rather than needing
    ``prefetch_related``.

    Returns ``None`` when ``source`` does not resolve to a chain of relations -- a plain column, a
    dotted path through a Python property or method, or a path through a ``GenericForeignKey``.
    Such a source cannot be turned into a queryset plan and is left for the ORM to resolve lazily
    at representation time, same as it does today.
    """
    current_model = model
    is_to_one = True

    for segment in source.split("."):
        resolved = _resolve_relation_segment(current_model, segment)
        if resolved is None:
            return None

        current_model, segment_is_to_one = resolved
        is_to_one = is_to_one and segment_is_to_one

    return source.replace(".", "__"), current_model, is_to_one


def build_prefetch_plan(serializer, model):
    """
    Derive the ``select_related``/``prefetch_related`` paths needed for ``serializer``'s resolved
    fields against ``model``, so a list or retrieve response's query count no longer grows with the
    row count for whatever a request's ``?e=`` actually expanded.

    Walks ``serializer.fields`` rather than re-deriving expansion rules, so it depends on that
    resolution already having happened: for the root ``serializer``, the caller must have already
    applied the request's query-param resolution (``vueda.core.serializers.ensure_flex_fields_applied``
    -- ``VuedaViewSet.get_queryset`` does this before calling here); a recursive call on a nested
    child gets this for free, because a child's expand/fields/omit values were passed as constructor
    kwargs and ``rest_flex_fields`` applies those automatically the moment ``.fields`` is accessed.
    Either way, a nested serializer only appears in ``.fields`` when the response will actually
    traverse it. A field never named in ``?e=`` (or excluded by a ``permit_{action}_expands``
    restriction) never becomes one, so it is never planned.

    ``?f=`` (sparse fields) and ``?om=`` (omit) play no part in this either way, through two
    separate mechanisms that both happen to have the same effect:
    ``FlexFieldsWriteableNestedSerializerMixin.apply_flex_fields`` re-admits an already-requested
    expand's own name into the sparse-fields set, as a side effect of defaulting its sub-fields to a
    wildcard when none are requested; ``VuedaExpandableFieldsSerializerMixin._get_expanded_field_names``
    does the same for omit, as a side effect of always hiding ``available_actions`` from an expanded
    object. Neither parameter can drop an expand this plan would otherwise cover, nor can either one
    add one the request never named in ``?e=``. The plan simply mirrors whatever survives in
    ``.fields``.

    Depth is bounded the same way: a serializer with nothing further expanded at some level has no
    further nested serializer fields, so the recursion here terminates exactly where
    ``rest_flex_fields``'s own (already-validated) expansion depth does, with no second bound to
    maintain.

    A field's ``source`` (defaulting to its name, honoring an explicit ``source=`` in its
    ``expandable_fields`` declaration) is resolved against ``model``'s actual relations via
    :func:`resolve_relation_path`, not against the nested serializer's own declared ``Meta.model``,
    so a plan is only produced for a source that genuinely names a relation chain.

    A ``GenericForeignKey`` expand (``GenericForeignKeySerializer``) resolves its concrete
    serializer per-instance at representation time, after any queryset planning could run, so it is
    intentionally not planned here -- it keeps resolving lazily, same as it does today. A
    ``GenericRelation`` (a reverse collection onto a fixed, known model) is a normal to-many
    relation and is planned like any other.

    Returns ``(select_related, prefetch_related)``: lists ready to splat into
    ``queryset.select_related(*select_related)`` and ``queryset.prefetch_related(*prefetch_related)``.
    """
    select_related = []
    prefetch_related = []

    for field in serializer.fields.values():
        child = field.child if isinstance(field, ListSerializer) else field
        if not isinstance(child, BaseSerializer) or isinstance(child, GenericForeignKeySerializer):
            continue

        resolved = resolve_relation_path(model, field.source)
        if resolved is None:
            continue

        orm_path, related_model, is_to_one = resolved
        child_select_related, child_prefetch_related = build_prefetch_plan(child, related_model)

        if is_to_one:
            select_related.append(orm_path)
            select_related.extend(f"{orm_path}__{nested}" for nested in child_select_related)
            for nested_prefetch in child_prefetch_related:
                if isinstance(nested_prefetch, Prefetch):
                    prefetch_related.append(
                        Prefetch(f"{orm_path}__{nested_prefetch.prefetch_through}", queryset=nested_prefetch.queryset)
                    )
                else:
                    prefetch_related.append(f"{orm_path}__{nested_prefetch}")
        else:
            # Pre-annotate formatted_name so VuedaListSerializer.to_representation's own
            # "not already annotated" check finds it and skips re-annotating: re-annotating a
            # queryset serving a prefetched relation clones it, discarding the cached prefetch
            # result and forcing one fresh query per row -- the exact regression this plan exists
            # to prevent.
            related_queryset = annotate_object_revision(annotate_formatted_name(related_model._default_manager.all()))
            if child_select_related:
                related_queryset = related_queryset.select_related(*child_select_related)
            if child_prefetch_related:
                related_queryset = related_queryset.prefetch_related(*child_prefetch_related)
            prefetch_related.append(Prefetch(orm_path, queryset=related_queryset))

    return select_related, prefetch_related


def _prefetch_cache_keys(lookup):
    """
    Return the set of cache keys Django's ``prefetch_related_objects`` registers as already fetched
    while resolving ``lookup``: one for every intermediate level of its path -- always the literal
    ``__``-joined path up to that level, since ``to_attr`` can only rename a lookup's own final level
    -- plus the lookup's own ``prefetch_to`` (its ``to_attr`` when set, otherwise its full
    ``prefetch_through`` path). Django keys its ``done_queries`` cache by exactly these values, one
    entry per level as it walks a lookup's path, not by the lookup's path as a whole.
    """
    prefetch = lookup if isinstance(lookup, Prefetch) else Prefetch(lookup)
    segments = prefetch.prefetch_through.split("__")
    intermediate_levels = {"__".join(segments[:level]) for level in range(1, len(segments))}
    return intermediate_levels | {prefetch.prefetch_to}


def filter_new_prefetch_lookups(queryset, prefetch_related):
    """
    Drop any entry in ``prefetch_related`` (as returned by :func:`build_prefetch_plan`) whose cache
    key ``queryset`` -- or an earlier-accepted entry in this same call -- already registers, so
    ``VuedaViewSet.get_queryset()`` never hands Django two different querysets for the same lookup.

    ``prefetch_related`` raises ``ValueError: '<lookup>' lookup was already seen with a different
    queryset`` the moment two lookups register the same cache key with two different
    ``Prefetch.queryset`` values, and this happens even when one side is a bare string (an implicit
    default-manager queryset) and the other an explicit ``Prefetch``. A viewset whose own
    ``queryset``/``get_queryset()`` already prefetches a relation this plan also covers -- most
    plausibly a relation the application hand-optimized before this plan existed -- would otherwise
    crash the first time a request actually resolves that relation. Deferring to the existing lookup
    keeps whatever customization it carries (including its own ``formatted_name`` annotation, if it
    needs one) rather than overriding it with the plan's default. Two plan entries can collide the
    same way -- a serializer that aliases one relation under two expandable-field names produces two
    ``Prefetch`` objects for the same path -- so an entry this call already accepted also counts as
    "already registered" for the entries that follow it. Django's cache key is the lookup's own
    ``prefetch_to``, not its full path, so a lookup that sets ``to_attr`` registers under that alias
    and never collides with a plan entry for the same path under its default attribute name.

    Reads ``queryset._prefetch_related_lookups``, a private Django attribute with no public
    equivalent; it is a plain tuple of ``str``/``Prefetch`` entries across the Django versions this
    package supports (5.2, 6.0, 6.1).
    """
    seen_cache_keys = set()
    for lookup in queryset._prefetch_related_lookups:
        seen_cache_keys |= _prefetch_cache_keys(lookup)

    new_lookups = []
    for lookup in prefetch_related:
        prefetch = lookup if isinstance(lookup, Prefetch) else Prefetch(lookup)
        if prefetch.prefetch_to in seen_cache_keys:
            continue

        new_lookups.append(lookup)
        seen_cache_keys |= _prefetch_cache_keys(lookup)

    return new_lookups


class NoExtraFieldsForViewSetMixin:
    """
    Mixin for DRF ViewSets that raises a VuedaValidationError (400) for any query parameter `list` or
    `retrieve` does not recognize.

    `list` recognizes filterset fields (from `filterset_class`, when declared) plus pagination,
    ordering, search, column totals, and REST Flex Fields params (`get_extra_allowed_fields()`). A
    viewset with no `filterset_class` recognizes only the latter set. `retrieve` recognizes only the
    expand, fields and omit params -- column totals are a `list` concept, so the totals param is
    rejected there.
    """

    def get_extra_allowed_fields(self):
        """
        The query parameters ``list`` recognizes beyond this viewset's filterset fields.

        The totals parameter is among them only when something on this viewset reads it. It is
        ``ListRowLevelViewSetMixin.list`` that validates the names it carries and answers 400 for an
        undeclared one, so on a viewset without that mixin recognizing the parameter would mean
        accepting any value for it and doing nothing, which is the one thing this mixin exists to
        prevent.

        The test is whether the mixin is present, not whether ``list`` actually reaches it. A
        subclass that overrides ``list`` and never delegates still recognizes the parameter and then
        ignores it. That case is left alone deliberately: an override calling ``super().list()`` is
        ordinary and does read the parameter, and nothing here can tell the two apart.
        """
        extra_allowed_fields = [
            settings.PAGE_QUERY_PARAM,
            settings.PAGE_SIZE_QUERY_PARAM,
            settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"],
            settings.REST_FLEX_FIELDS["OMIT_PARAM"],
            settings.REST_FRAMEWORK["SEARCH_PARAM"],
            settings.REST_FRAMEWORK["ORDERING_PARAM"],
        ]
        if hasattr(self, "get_declared_column_totals"):
            extra_allowed_fields.insert(0, settings.COLUMN_TOTALS_PARAM)
        return tuple(extra_allowed_fields)

    @staticmethod
    def get_retrieve_allowed_fields():
        return (
            settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"],
            settings.REST_FLEX_FIELDS["OMIT_PARAM"],
        )

    @staticmethod
    def reject_unrecognized_query_params(request, valid_fields, message_fields=None):
        valid_fields = set(valid_fields)
        message_fields = valid_fields if message_fields is None else set(message_fields)
        extra_keys = set(request.query_params) - valid_fields
        if extra_keys:
            raise VuedaValidationError(
                {
                    key: [f"Invalid query parameter.  Valid filters are {', '.join(sorted(message_fields))}."]
                    for key in extra_keys
                }
            )

    @staticmethod
    def validate_flex_expand_and_field_param(request, serializer):
        submitted_fields = submitted_expand_fields = valid_expands = valid_fields = frozenset()

        if (
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in request.query_params
            or settings.REST_FLEX_FIELDS["EXPAND_PARAM"] in request.query_params
        ):
            submitted_fields = frozenset(serializer._get_query_param_value(settings.REST_FLEX_FIELDS["FIELDS_PARAM"]))
            submitted_expand_fields = frozenset(
                serializer._get_query_param_value(settings.REST_FLEX_FIELDS["EXPAND_PARAM"])
            )
            max_depth = (
                max(
                    [field.count(".") for field in submitted_fields]
                    + [field.count(".") for field in submitted_expand_fields]
                )
                + 1
            )
            valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields = (
                get_recursive_expands_and_fields(serializer, 0, max_depth)
            )

        if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in request.query_params:
            extra_keys = submitted_fields - (valid_fields | valid_wildcard_fields)

            # GFK expandable fields can resolve to any model, so sub-field specifiers like
            # "content_object.id" cannot be pre-validated without knowing the concrete instance type.
            # Filter them out here; the GFK serializer enforces field-level filtering at representation time.
            if extra_keys and hasattr(serializer, "Meta"):
                gfk_fields = {
                    name
                    for name, data in getattr(serializer.Meta, "expandable_fields", {}).items()
                    if (data[0] if isinstance(data, tuple) else data) is GenericForeignKeySerializer
                }
                if gfk_fields:
                    extra_keys = frozenset(k for k in extra_keys if k.split(".")[0] not in gfk_fields)

            if extra_keys:
                errors = {}
                for extra_key in extra_keys:
                    errors[extra_key] = [
                        {
                            "message": ErrorDetail(
                                string=f"Invalid field.  Valid fields are {', '.join(sorted(valid_fields))}. Or use a wildcard to specify all: {', '.join(sorted(valid_wildcard_fields, key=sort_by_dot_count_alphabetically))}",
                                code="invalid",
                            ),
                            "code": "invalid",
                        }
                    ]

                return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        if settings.REST_FLEX_FIELDS["EXPAND_PARAM"] in request.query_params:
            extra_keys = submitted_expand_fields - (valid_expands | valid_wildcard_expands)
            if extra_keys:
                errors = {}
                for extra_key in extra_keys:
                    errors[extra_key] = [
                        {
                            "message": ErrorDetail(
                                string="Invalid expands. "
                                + (
                                    f"Permitted expands are {', '.join(sorted(valid_expands))}. Or use a wildcard to expand all: {', '.join(sorted(valid_wildcard_expands, key=sort_by_dot_count_alphabetically))}"
                                    if valid_expands
                                    else "No expands are permitted."
                                ),
                                code="invalid",
                            ),
                            "code": "invalid",
                        }
                    ]

                return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, *args, **kwargs):
        self.reject_unrecognized_query_params(request, self.get_retrieve_allowed_fields())

        serializer = self.get_serializer()

        results = self.validate_flex_expand_and_field_param(request, serializer)
        if results is not None:
            return results

        return super().retrieve(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        extra_allowed_fields = set(self.get_extra_allowed_fields())
        filterset_fields = set()
        if hasattr(self, "filterset_class"):
            # Read the names from an instantiated filterset rather than from `get_filters()`, whose
            # class-level filter objects cache `Filter.field` -- and with it the choices of a
            # value-derived filter -- on a singleton shared by every request. See
            # `get_filterset_query_param_names`.
            filterset_fields = set(get_filterset_query_param_names(self.filterset_class, self.get_queryset))

        # A filterset's "valid filters" message names only its filter fields; pagination, ordering,
        # search, and flex-fields params are accepted but not filters, so they stay out of the message.
        message_fields = filterset_fields if hasattr(self, "filterset_class") else extra_allowed_fields
        self.reject_unrecognized_query_params(
            request, extra_allowed_fields | filterset_fields, message_fields=message_fields
        )

        serializer = self.get_serializer()

        results = self.validate_flex_expand_and_field_param(request, serializer)
        if results is not None:
            return results

        return super().list(request, *args, **kwargs)


class FlexFieldsMixin(DefaultFlexFieldsMixin):
    """
    Mixin for DRF ViewSets to add 'permitted_expands' in serializer context based on
    the current action. It utilizes 'permit_{action}_expands' attributes of the ViewSet
    to determine expandable fields for each action (e.g., list, retrieve).

    This replaces `rest_flex_fields.FlexFieldsMixin` and `rest_flex_fields.FlexFieldsModelViewSet` usage.
    """

    def get_serializer_context(self):
        default_context = super().get_serializer_context()
        if hasattr(self, "action") and self.action != "list":
            # super deals with permitted list action expands
            permit_expands_key = f"permit_{self.action}_expands"
            if hasattr(self, permit_expands_key):
                default_context["permitted_expands"] = getattr(self, permit_expands_key)
        return default_context


class PerActionSerializerMixin:
    """
    A ViewSet mixin that allows you to specify different serializers for different actions.
    """

    def get_serializer_class(self):
        serializer_class_key = f"{self.action}_serializer_class"
        if hasattr(self, "action") and hasattr(self, serializer_class_key):
            return getattr(self, serializer_class_key)
        return super().get_serializer_class()


class DeactivateActionViewSetMixin:
    """
    A ViewSet mixin that allows you to deactivate a model inheriting from `ActivatableBaseModel`.

    Both actions consult ``get_warnings_for_object``/``get_warnings`` (provided by
    ``WarningConfirmationMixin``, so any ``VuedaViewSet``) after validation and before the write,
    gating the write behind a 409 confirmation when warnings are reported.
    """

    @action(detail=True, bulk=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        if pk:
            instance = self.get_object()
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED,
                )
            if not instance.is_active:
                raise VuedaValidationError({pk: [f"This {instance.__class__.__name__} is already deactivated"]})
            gate_warnings(request, self.get_warnings_for_object("deactivate", instance))
            instance.is_active = False
            instance.save()
            return Response(
                {"detail": f"{instance.__class__.__name__} with id {instance.pk} has been deactivated."},
                status=status.HTTP_200_OK,
            )

        serializer = PrimaryKeyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]

        queryset = self.get_queryset()
        queryset = queryset.filter(pk__in=pks)

        already_deactivated = []
        for instance in queryset:
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED,
                )

            elif not instance.is_active:
                already_deactivated.append(instance.pk)

        if already_deactivated:
            errors = {}
            for pk in already_deactivated:
                errors[pk] = [f"This {instance.__class__.__name__} is already deactivated"]
            raise VuedaValidationError(errors)

        gate_warnings(request, self.get_warnings("deactivate", queryset))
        # Perform bulk deactivation in a single query
        queryset.update(is_active=False)
        return Response({"detail": f"Successfully deactivated {len(pks)} objects."}, status=status.HTTP_200_OK)

    @action(detail=True, bulk=True, methods=["patch"])
    def activate(self, request, pk=None):
        if pk:
            instance = self.get_object()
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED,
                )

            if instance.is_active:
                raise VuedaValidationError({pk: [f"This {instance.__class__.__name__} is already activated"]})

            gate_warnings(request, self.get_warnings_for_object("activate", instance))
            instance.is_active = True
            instance.save()
            return Response(
                {"detail": f"{instance.__class__.__name__} with id {instance.pk} has been activated."},
                status=status.HTTP_200_OK,
            )

        serializer = PrimaryKeyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]

        queryset = self.get_queryset()
        queryset = queryset.filter(pk__in=pks)

        already_activated = []
        for instance in queryset:
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Activate action is not supported for {instance.__class__.__name__}."},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED,
                )

            elif instance.is_active:
                already_activated.append(instance.pk)
        if already_activated:
            errors = {}
            for pk in already_activated:
                errors[pk] = [f"This {instance.__class__.__name__} is already activated"]
            raise VuedaValidationError(errors)
        gate_warnings(request, self.get_warnings("activate", queryset))
        # Perform bulk deactivation in a single query
        queryset.update(is_active=True)

        return Response({"detail": f"Successfully activated {len(pks)} objects."}, status=status.HTTP_200_OK)


class VuedaViewSet(
    WarningConfirmationMixin,
    FlexFieldsMixin,
    NoExtraFieldsForViewSetMixin,
    ListRowLevelViewSetMixin,
    viewsets.ModelViewSet,
):
    """
    Full CRUD ViewSet for VUEDA models. Extends DRF's ``ModelViewSet`` with:

    - Flex-fields expansion (``FlexFieldsMixin``)
    - Query-parameter validation against filter and serializer fields (``NoExtraFieldsForViewSetMixin``)
    - Row-level and workflow-aware list filtering (``ListRowLevelViewSetMixin``)
    - Bulk delete with dry-run support
    - Override ``destroy_validation`` to add pre-delete business rules.
    - Override ``get_warnings_for_object`` (from ``WarningConfirmationMixin``) to gate
      single and bulk ``destroy`` (and ``activate``/``deactivate`` when
      ``DeactivateActionViewSetMixin`` is mixed in) behind a 409 confirmation with the same rule
      for both; override ``get_warnings`` instead if bulk needs its own logic.
    """

    detail_args = ["pk"]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Name what the request is doing inside the action the history middleware opened, so an
        # event records "update" or "execute_transition" rather than only that a request happened.
        # Called as a function rather than entered, this adds to an open action and does nothing
        # outside one.
        if self.action:
            pghistory.context(action=self.action)

    @classmethod
    def get_extra_actions(cls):
        """Drop the history endpoint for a model that records no history.

        Every consumer of the extra actions reads this: the router that builds the routes, the
        permitted-action list the client renders, and the model-info metadata. Gating here means an
        opted-out model has no history route, no control, and no schema entry, rather than a route
        that answers with an error.
        """
        extra_actions = super().get_extra_actions()
        model = getattr(getattr(cls, "queryset", None), "model", None)
        if model is None:
            model = getattr(getattr(getattr(cls, "serializer_class", None), "Meta", None), "model", None)
        if model is not None and not is_tracked(model):
            extra_actions = [action for action in extra_actions if action.__name__ != "history_list"]
        return extra_actions

    @action(detail=True, methods=["get"])
    def history_list(self, request, pk=None):
        """Return this object's history as the user actions behind it.

        A page is a page of actions. One action that wrote several rows stays whole, because the
        grouping and the visibility filter both run in the database before the paginator sees
        anything.
        """
        # get_object() authorizes the requested object, which is what makes its own events visible.
        instance = self.get_object()
        groups = action_groups_for(instance, request.user)
        page = self.paginate_queryset(groups)
        events = events_in_groups(instance, request.user, [group["group_key"] for group in page])
        serializer = HistoryActionGroupSerializer(build_action_groups(instance, page, events), many=True)
        return self.get_paginated_response(serializer.data)

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if issubclass(cls, drf_viewsets.ReadOnlyModelViewSet):
            warnings.warn(
                f"{cls.__module__}.{cls.__name__} inherits from both VuedaViewSet and ReadOnlyModelViewSet. "
                "Use VuedaReadOnlyViewSet for read-only endpoints.",
                RuntimeWarning,
                stacklevel=2,
            )

    def destroy_validation(self, objs) -> None:
        """
        Override to validate objects before deletion. Raise ``VuedaValidationError``
        to prevent deletion. Called for both single-object and bulk-delete requests.
        """
        return None

    def apply_object_permission_filter(self, queryset):
        """
        Keep only objects the current request can access at object-permission level.
        """
        allowed_ids = []
        for instance in queryset:
            try:
                self.check_object_permissions(self.request, instance)
            except (NotAuthenticated, PermissionDenied):
                continue
            allowed_ids.append(instance.pk)
        return queryset.filter(pk__in=allowed_ids)

    def destroy(self, request, **kwargs):
        """Delete one or more objects."""
        pk = kwargs.get("pk")
        dry_run = request.headers.get(DRY_RUN_HEADER, "false").lower() == "true"
        if pk:
            instance = self.get_object()
            self.destroy_validation((instance,))
            gate_warnings(request, self.get_warnings_for_object("destroy", instance))
            if dry_run:
                return Response(status=status.HTTP_200_OK)
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = PrimaryKeyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]

        queryset = self.get_queryset()
        queryset = queryset.filter(pk__in=pks)
        queryset = self.apply_row_level_filter(queryset, perm_type="delete")
        queryset = self.apply_object_permission_filter(queryset)
        if len(pks) != queryset.count():
            found_pks = set(queryset.values_list("pk", flat=True))
            missing_pks = set(pks) - found_pks
            errors = {}
            for missing_pk in missing_pks:
                errors[missing_pk] = [f"Object with pk={missing_pk} does not exist."]
            raise VuedaValidationError(errors)

        self.destroy_validation(queryset)
        gate_warnings(request, self.get_warnings("destroy", queryset))
        if dry_run:
            return Response(status=status.HTTP_200_OK)
        queryset.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_allowed_extra_actions(self, request, *, instance=None):
        """
        Override this function to change if a user is allowed to do a certain action.

        ``history_list`` is additionally gated on read authorization here, checked the same way an
        object's own ``retrieve`` already is (:meth:`_read_permitted`). For a requester whose read
        comes from a model-level permission, this agrees with the history endpoint's own
        enforcement, so neither model metadata nor an object's own action list advertises a
        history endpoint the direct request would refuse with a 403.

        A requester whose read comes only from a workflow-state grant is the one exception:
        :meth:`_read_permitted` defers a model-level read denial to that grant, but the history
        endpoint enforces read as its own ``history_list`` action, which no viewset yet lists in
        ``workflow_object_permission_actions`` and so does not defer the same way. Discovery
        offers ``history-list`` to that requester, and the direct request still returns 403.
        Tracked in #291.
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            if extra_action.url_name == "history-list" and not self._read_permitted(request, instance):
                continue
            allowed_actions.add(extra_action.url_name)

        return allowed_actions

    def _read_permitted(self, request, instance):
        """
        Whether ``request.user`` may read ``instance`` -- or the model at large, when ``instance``
        is ``None`` -- through this viewset's own configured permission classes.

        Checked as an ordinary "retrieve" read, through :func:`vueda.core.permissions.check_action_permission`,
        the same function an object's own ``available_actions`` (:class:`vueda.core.serializers.fields.AvailableActionsField`)
        and model metadata's own action list (:meth:`vueda.info.serializers.ModelInfoSerializer.get_model_actions`)
        already call to check ``retrieve`` for the same row or model, on this same viewset
        instance, within the same request. ``check_action_permission`` caches its answer per
        ``(action, instance)`` on that viewset instance, so whichever of those two callers reaches
        ``retrieve`` first pays for the permission pass, and this call reuses that answer instead
        of paying for a second one. See ``check_action_permission`` for what "checked as an
        action" means and why ``instance=None`` takes a different path than a specific object.
        """
        return check_action_permission(self, request, instance, "retrieve")

    def get_object(self):
        """
        Override this function to convert the pk kwarg to a list if the model has a composite primary key.
        """
        if hasattr(self, "kwargs") and "pk" in self.kwargs:
            has_composite_primary_key = False
            cpk_field = None
            model = getattr(self.queryset, "model", None) or self.get_queryset().model
            for field in model._meta.fields:
                if isinstance(field, CompositePrimaryKey):
                    has_composite_primary_key = True
                    cpk_field = field

            if has_composite_primary_key:
                # 'CompositePrimaryKey' must be named 'pk'.
                self.kwargs["pk"] = cpk_field.to_python(self.kwargs["pk"])

        return super().get_object()

    def get_queryset(self):
        """
        Annotate ``formatted_name`` and, for ``list``/``retrieve``, apply the ``select_related``/
        ``prefetch_related`` plan :func:`build_prefetch_plan` derives from what the request's ``?e=``
        actually expanded, so an expanded response's query count does not grow with the number of
        rows returned. See :func:`build_prefetch_plan` for why ``?f=``/``?om=`` play no part in this.

        A plan entry whose lookup this queryset already prefetches (typically a relation the
        viewset's own ``queryset``/``get_queryset()`` hand-optimized before this plan existed) is
        dropped rather than applied a second time; see :func:`filter_new_prefetch_lookups` for why
        that matters for ``prefetch_related`` specifically.
        """
        queryset = super().get_queryset()

        # `FormattedNameManager` already annotates this for a model whose own querysets go through it,
        # so this is usually a no-op that re-adds the same expression under the same alias. It stays
        # because a viewset's `queryset`/`get_queryset` may come from a manager that doesn't inherit
        # `FormattedNameManager`, and because a viewset may point at a model that isn't a
        # `FormattedNameBaseModel` at all. Both go through `annotate_formatted_name`, so they can't
        # disagree about what `formatted_name` means.
        queryset = annotate_formatted_name(queryset)
        queryset = annotate_object_revision(queryset)

        if getattr(self, "action", None) in ("list", "retrieve"):
            serializer = self.get_serializer()
            ensure_flex_fields_applied(serializer)

            select_related, prefetch_related = build_prefetch_plan(serializer, queryset.model)
            if select_related:
                queryset = queryset.select_related(*select_related)
            if prefetch_related:
                prefetch_related = filter_new_prefetch_lookups(queryset, prefetch_related)
                if prefetch_related:
                    queryset = queryset.prefetch_related(*prefetch_related)

        return queryset


class VuedaReadOnlyViewSet(
    FlexFieldsMixin,
    NoExtraFieldsForViewSetMixin,
    ListRowLevelViewSetMixin,
    viewsets.ReadOnlyModelViewSet,
):
    """
    Read-only ViewSet for VUEDA models. Provides ``list`` and ``retrieve`` only,
    with the same flex-fields, query-parameter validation, and row-level filtering
    as ``VuedaViewSet``.
    """

    detail_args = ["pk"]

    def get_allowed_extra_actions(self, request, *, instance=None):
        """
        Override this function to change if a user is allowed to do a certain action.

        Unlike :meth:`VuedaViewSet.get_allowed_extra_actions`, this offers every extra action
        unconditionally, including no read gate for ``history_list``: that action is defined only
        on ``VuedaViewSet``, so it never appears in ``get_extra_actions()`` here, and there is
        nothing for a read gate to filter.
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            allowed_actions.add(extra_action.url_name)

        return allowed_actions
