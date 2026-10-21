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
    "apply_prefetch_plan",
    "build_prefetch_plan",
    "resolve_relation_path",
)

import datetime
import warnings
import weakref
from collections.abc import Iterable

import pghistory
from django.conf import settings
from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import FieldError
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import CompositePrimaryKey
from django.db.models import F
from django.db.models import Prefetch
from django.db.models import Sum
from django.db.models.fields.reverse_related import ForeignObjectRel
from django.http import Http404
from django_filters.filters import AllValuesFilter
from django_filters.filters import AllValuesMultipleFilter
from rest_flex_fields2.config import WILDCARD_VALUES
from rest_flex_fields2.views import FlexFieldsMixin as DefaultFlexFieldsMixin
from rest_framework import status
from rest_framework import viewsets
from rest_framework import viewsets as drf_viewsets
from rest_framework.exceptions import NotAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.serializers import ListSerializer

from vueda.core.decorators import DRY_RUN_HEADER
from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.exceptions import gate_warnings
from vueda.core.formatted_name import FORMATTED_NAME_SELECT_RELATED
from vueda.core.formatted_name import annotate_formatted_name
from vueda.core.formatted_name import formatted_name_annotation_path
from vueda.core.models import ActivatableBaseModel
from vueda.core.parsers import NestedMultipartMixin
from vueda.core.paths import path_annotation_name
from vueda.core.paths import query_path_field
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


def _column_total_zero(model, path):
    """
    The zero to total ``path`` down to when nothing matched.

    Resolving the path builds an empty ``Query`` and walks ``_meta`` without running a query, so it
    is cheap enough to do on each request that asks for the total. It is not cached, because a path
    that ends in a transform depends on Django's lookup registry, which ``register_lookup`` can
    change after the first request.

    A path that doesn't resolve gets the numeric zero, which is never used: ``aggregate()`` raises
    ``FieldError`` for it on the same call, and ``vueda_info.E013`` reports it at check time. A path
    that starts with a queryset annotation resolves against the query rather than ``_meta``, so
    :func:`_column_total_annotation_zero` handles it instead.
    """
    try:
        # A path that ends in a transform resolves to the transform's output field, so `hours__ceil`
        # totals down to the zero of what the transform returns.
        field = query_path_field(model, path)
    except FieldDoesNotExist:
        return 0
    return COLUMN_TOTAL_ZEROES.get(field.get_internal_type(), 0)


def _column_total_annotation_zero(annotation):
    """
    The zero for a total over ``annotation``, read from the annotation's output field.

    A queryset annotation has no entry in ``_meta`` to walk to, so the lookup above would fall back
    to the numeric zero for it -- wrong for an annotation that computes a duration, where
    the database is handed a plain ``0`` as an interval. The annotation carries the type itself. A
    total that applies transforms to an annotation, such as ``launched__year``, is summed over a
    generated annotation of the transformed value, which carries the output field of its last
    transform.

    ``annotation`` is the expression the query already resolved, so reading its type builds nothing.
    An expression that can't name a single output field (mixed types, which Django refuses to guess
    at) falls back to the numeric zero, and the aggregate raises for it on the same call the way it
    always did.
    """
    try:
        internal_type = annotation.output_field.get_internal_type()
    except (FieldError, AttributeError):
        return 0
    return COLUMN_TOTAL_ZEROES.get(internal_type, 0)


def _column_total_aliases(names, taken):
    """
    Map each total in ``names`` to an ``aggregate()`` alias that no name in ``taken`` can shadow.

    ``aggregate()`` resolves each argument against the aliases already defined in the same call, so
    ``aggregate(quantity=Sum("quantity"), duplicate=Sum("quantity"))`` sums the first aggregate a
    second time and fails. A generated alias can collide the same way with an annotation the
    viewset added. The prefix grows until no taken name starts with it, so no generated alias can
    equal one.
    """
    prefix = "_column_total"
    while any(name.startswith(prefix) for name in taken):
        prefix = f"_{prefix}"
    return {name: f"{prefix}_{index}" for index, name in enumerate(names)}


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
    rather than aggregated on its own. The ``vueda_info.E013`` system check reports a declaration
    that breaks any of these rules; see ``vueda.info.checks``.

    Totals cover the rows that the list covers. ``list`` aggregates after the filter backends and
    :meth:`apply_row_level_filter` run. It aggregates over the whole filtered queryset, so a total
    is the same on every page. Only a paginated response has a ``columnTotals`` key to carry them:
    ``VUEDAPageNumberPagination.get_paginated_response`` reads what ``list`` sets on
    ``paginator.column_totals``, and a viewset with ``pagination_class = None`` computes none.

    ``list`` computes totals in the request that returns them and never caches them, so a total is
    exactly as fresh as the rows beside it. A response carries only the totals that request named. A
    client therefore names every total it wants on every request and replaces its totals with each
    response; merging responses would keep a total computed from rows that may since have changed.
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
        misconfigured declaration is the ``vueda_info.E013`` system check's to report, and a request
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
        silently, as a number that looks plausible. ``vueda_info.E013`` keeps the declared *path*
        single-valued, but the join can arrive from somewhere the check cannot see: a
        ``filterset_class`` filter spanning a reverse FK or M2M, or a ``RowLevelPermissions``
        ``Q`` doing the same. Re-selecting by pk means a row is summed once however it was matched,
        which is what "the same filtered, permission-limited set" has to mean for a total to be
        worth showing.

        A total over an annotation that the viewset's own ``get_queryset`` adds cannot follow that
        route, so the two kinds are summed in separate calls. The annotation belongs to the queryset
        being replaced, and it cannot be moved: the expressions in ``query.annotations`` are already
        resolved, and their ``Col`` leaves hold the aliases of the query they were resolved against.
        Re-applying one to another queryset adds no join -- ``Col`` has no ``resolve_expression`` of its
        own -- so an annotation reaching through a relation would compile to SQL naming a table the
        query never joined.

        An annotation total is summed over ``values("pk", <annotation>).distinct()`` on the filtered
        queryset instead. A join that matched a row more than once contributes one ``(pk, value)``
        pair, so each matched row still counts once, and two rows sharing a value stay two rows. What
        no route can total is an annotation that reads the multi-valued side of a join, such as
        ``F("special_care__id")``: it has a value per joined row rather than per row, so there is no
        per-row total to compute, and only exact duplicates collapse. ``vueda_info.E013`` cannot see
        this either, since an annotation has no model field behind it to check. Where the value
        could be a column, a ``GeneratedField`` or a database view reached through a one-to-one
        relation avoids both gaps: the check validates its path like any other.

        A queryset that picks one row per group with ``distinct(*fields)``, leaving out the primary key,
        gets totals over the rows it picks: the re-selection keeps the queryset's ordering and distinct
        fields, which decide the row that each group keeps. A ``DISTINCT ON`` that includes the primary
        key only removes duplicates, so it is dropped from the re-selection. When the per-group distinct
        fields refer to a queryset annotation, the re-selection cannot carry them, and a request that
        names any total raises ``NotImplementedError``.
        """
        if not requested_column_totals:
            return {}
        declared = self.get_declared_column_totals()
        model = queryset.model
        annotations = queryset.query.annotations
        # A path that starts with an annotation is an annotation total, whether it names the annotation
        # itself or applies transforms to it (`launched__year`). Django resolves the first segment
        # against the annotations, which exist only on this queryset, not on the re-selection below.
        starts_with_annotation = {
            name: path_annotation_name(annotations, declared[name]) is not None for name in requested_column_totals
        }
        annotation_names = [name for name in requested_column_totals if starts_with_annotation[name]]
        column_names = [name for name in requested_column_totals if not starts_with_annotation[name]]
        # Every total is aggregated under a generated alias and mapped back to its own name below.
        # A total is normally named after what it sums, so `{"line_total": "line_total"}` is the
        # ordinary spelling, and two totals may sum the same field. Either way a total's own name
        # used as the alias would be what a later argument resolves to, instead of the field.
        aliases = _column_total_aliases(
            requested_column_totals,
            {*annotations, *(declared[name].split("__")[0] for name in requested_column_totals)},
        )

        # A `DISTINCT ON` that leaves out the primary key picks one row per group, and the ordering
        # decides which: the list shows those rows, so the totals have to cover the same ones.
        # Selecting the pks through the list queryset unchanged keeps both, because Django leaves a
        # subquery's ordering in place when it has distinct fields. A `DISTINCT ON` that includes
        # the primary key, which is the only kind the search backend adds, keeps every matched row
        # and only removes duplicates. That one, like a query with no distinct fields, reduces to
        # "which rows matched", so its ordering and distinct fields are dropped from the subquery:
        # they can name a ranking annotation that `.values("pk")` masks out of the select, and a
        # `DISTINCT ON` naming a column no longer selected cannot be compiled.
        distinct_fields = queryset.query.distinct_fields
        pk_names = {"pk", model._meta.pk.name, model._meta.pk.attname}
        if distinct_fields and pk_names.isdisjoint(distinct_fields):
            masked = [field for field in distinct_fields if path_annotation_name(annotations, field) is not None]
            if masked:
                raise NotImplementedError(
                    f"{type(self).__name__} cannot compute column totals over a queryset that selects "
                    f"one row per group with distinct({', '.join(map(repr, distinct_fields))}): the "
                    f"row selection names the annotation(s) {', '.join(map(repr, masked))}, which a "
                    "primary key subquery cannot carry."
                )
            matched_pks = queryset.values("pk")
            selects_one_per_group = True
        else:
            matched_pks = queryset.order_by().distinct().values("pk")
            selects_one_per_group = False

        totals = {}
        if column_names:
            # `_base_manager`, not `_default_manager`: every visibility rule is already baked into
            # the pks being selected, and a default manager that filters would subtract rows from a
            # set the user was just shown.
            #
            # `db_manager`, so a queryset pinned to a replica with `.using()` keeps that connection.
            # Django refuses a subquery that spans two databases, and the router would otherwise be
            # free to answer with a different one than the pks are being selected from.
            rows = model._base_manager.db_manager(queryset.db).filter(pk__in=matched_pks)
            aggregated = rows.aggregate(
                **{
                    aliases[name]: Sum(declared[name], default=_column_total_zero(model, declared[name]))
                    for name in column_names
                }
            )
            totals.update({name: aggregated[aliases[name]] for name in column_names})
        if annotation_names:
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
            # `.order_by().distinct()` replaces the list's own ordering and distinct fields, because
            # `SELECT DISTINCT` requires its `ORDER BY` terms in the select list. A `DISTINCT ON`
            # selection moves into the pk filter instead, so the same rows are summed.
            rows = queryset.order_by().distinct()
            if selects_one_per_group:
                rows = rows.filter(pk__in=matched_pks)
            # A path that applies transforms to an annotation (`launched__year`) is annotated under a
            # generated name first, and that name is selected and summed. Summing the path itself
            # would make Django rebuild the annotation's expression in the outer query, which breaks
            # for an aggregate annotation such as a `Max` over related rows. A plain name that
            # `.alias()` added goes the same way, because `values()` refuses to select an alias. The
            # generated name extends the alias of the first total that names the path, whose prefix no
            # annotation starts with, so neither can shadow the other. Two totals over the same path
            # share one generated name.
            selected = queryset.query.annotation_select
            transformed = {}
            for name in annotation_names:
                path = declared[name]
                if path not in selected and path not in transformed:
                    transformed[path] = f"{aliases[name]}_value"
            if transformed:
                rows = rows.annotate(**{alias: F(path) for path, alias in transformed.items()})
            summed = {name: transformed.get(declared[name], declared[name]) for name in annotation_names}
            aggregated = (
                rows.values("pk", *dict.fromkeys(summed.values()))
                .distinct()
                .aggregate(
                    **{
                        aliases[name]: Sum(
                            summed[name],
                            default=_column_total_annotation_zero(rows.query.annotations[summed[name]]),
                        )
                        for name in annotation_names
                    }
                )
            )
            totals.update({name: aggregated[aliases[name]] for name in annotation_names})

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
    max_depth = min((max_depth, settings.REST_FLEX_FIELDS2["MAXIMUM_EXPANSION_DEPTH"]))

    valid_expands = set()
    valid_wildcard_expands = set()
    valid_fields = set()
    valid_wildcard_fields = set()

    if depth < max_depth:
        if hasattr(serializer, "fields"):
            valid_fields.update(serializer.fields.keys())
            if depth > 0:
                # An expanded object always omits available_actions (see
                # VuedaExpandableFieldsSerializerMixin.apply_flex_fields), so it is not a
                # field the request can ask for there.
                valid_fields.discard("available_actions")

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
                    if permitted_expands is not None and not any(
                        permitted == field_name or permitted.startswith(f"{field_name}.")
                        for permitted in permitted_expands
                    ):
                        continue

                    valid_fields.add(field_name)
                    valid_expands.add(field_name)

                    serializer_settings = {}
                    if isinstance(serializer_data, tuple):  # rest_flex_fields2 only tests for tuple.
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

                if permitted_expands is not None:
                    # drf-flex-fields2 keeps a requested expand only when the permit list contains it as
                    # written, or when the request holds a root wildcard, and drops the rest silently.
                    # Accept only what it would keep, so anything else is reported instead.
                    valid_expands &= permitted_expands
                    valid_wildcard_expands = {
                        value
                        for value in valid_wildcard_expands
                        if value in WILDCARD_VALUES or value in permitted_expands
                    }

    return valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields


def permitted_expand_depths(serializer):
    """
    Return the dot count of each path in the action's permit list, or an empty list without one.

    Validation walks the expand tree only as deep as it needs. Walking as deep as the permit list
    too lets an error message list a dotted permit, such as ``customer.user``, when the request
    names only ``customer``.

    :param serializer: The action's serializer, whose context may hold ``permitted_expands``.
    :returns: One dot count per permitted path.
    """
    return [path.count(".") for path in serializer.context.get("permitted_expands") or ()]


def invalid_expand_messages(submitted_expand_fields, valid_expands, valid_wildcard_expands):
    """
    Map each submitted expand that is neither a valid expand nor a valid wildcard to its message.

    :param submitted_expand_fields: The ``e`` values from the request.
    :param valid_expands: The expand paths the action permits.
    :param valid_wildcard_expands: The wildcard values the action permits.
    :returns: A dict of invalid expand to message; empty when every value is valid.
    """
    extra_keys = set(submitted_expand_fields) - (set(valid_expands) | set(valid_wildcard_expands))
    if not extra_keys:
        return {}
    if valid_expands:
        wildcards = ", ".join(sorted(valid_wildcard_expands, key=sort_by_dot_count_alphabetically))
        message = (
            f"Invalid expands. Permitted expands are {', '.join(sorted(valid_expands))}. "
            f"Or use a wildcard to expand all: {wildcards}"
        )
    else:
        message = "Invalid expands. No expands are permitted."
    return dict.fromkeys(extra_keys, message)


# Keyed weakly so a filterset class built at runtime (one composed per view, or per test) is
# collectable once its last other reference goes away. A class declared in a module is referenced by
# that module and lives as long as the process either way.
_FILTERSET_QUERY_PARAM_NAMES = weakref.WeakKeyDictionary()


def iter_filterset_query_param_names(filterset):
    """Yield each accepted parameter name with the filter that binds it."""
    for filter_name, filter_obj in filterset.filters.items():
        # AllValuesFilter.field reads the database to build choices. Its widget comes from the
        # field class or the explicit override, neither of which depends on those choices.
        if isinstance(filter_obj, (AllValuesFilter, AllValuesMultipleFilter)):
            widget = filter_obj.extra.get("widget", filter_obj.field_class.widget)
        else:
            widget = filter_obj.field.widget
        if hasattr(widget, "suffixes"):
            for suffix in widget.suffixes:
                yield f"{filter_name}_{suffix}", filter_name
        else:
            yield filter_name, filter_name


def get_filterset_query_param_names(filterset_class, get_queryset):
    """
    The query parameter names a filterset accepts, including the suffixed names of multi-widget
    filters.

    Each name is a filter's own key in ``self.filters`` — its declared name, or the dotted public
    alias ``PublicFilterAliasMixin`` renamed it to — which is also the name django-filter's own form
    binds request data under. Nothing wider than that is a recognized parameter: a filter's
    ``lookup_expr`` decides which ORM lookup its value queries, not a second query parameter name a
    client could send instead.

    Read the filters from an instance rather than from ``filterset_class.get_filters()``. That
    classmethod hands back the filter objects declared on the class itself, and ``Filter.field``
    caches the form field it builds on whichever filter it is read from. Reading it off the class
    would freeze the choices of value-derived filters (``AllValuesFilter`` and friends) at whatever
    the first request handled by this process saw, so values added later would be rejected as
    invalid choices for the rest of the process.

    The names depend only on the filterset class, so they are built once per class. Value-derived
    filters get their widgets without building their form fields, which would query the database for
    choices during a system check or on a list request's first cache miss.

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

    names = frozenset(
        name for name, _filter_name in iter_filterset_query_param_names(filterset_class(queryset=queryset))
    )
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
    kwargs and ``rest_flex_fields2`` applies those automatically the moment ``.fields`` is accessed.
    Either way, a nested serializer only appears in ``.fields`` when the response will actually
    traverse it. A field never named in ``?e=`` (or excluded by a ``permit_{action}_expands``
    restriction) never becomes one, so it is never planned.

    ``?f=`` (sparse fields) and ``?om=`` (omit) play no part in this either way, through two
    separate mechanisms that both happen to have the same effect:
    ``FlexFieldsWriteableNestedSerializerMixin.apply_flex_fields`` re-admits an already-requested
    expand's own name into the sparse-fields set, as a side effect of defaulting its sub-fields to a
    wildcard when none are requested; ``VuedaExpandableFieldsSerializerMixin.apply_flex_fields``
    does the same for omit, as a side effect of always hiding ``available_actions`` from an expanded
    object. Neither parameter can drop an expand this plan would otherwise cover, nor can either one
    add one the request never named in ``?e=``. The plan simply mirrors whatever survives in
    ``.fields``.

    Depth is bounded the same way: a serializer with nothing further expanded at some level has no
    further nested serializer fields, so the recursion here terminates exactly where
    ``rest_flex_fields2``'s own (already-validated) expansion depth does, with no second bound to
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

    A to-one relation loads through ``select_related``, together with the paths that the related
    model's ``formatted_name_select_related`` declares. The exception is a related model whose
    ``formatted_name`` is an annotation (``formatted_name_annotation_path`` returns a path), because a
    join loads the related model's columns but not its annotations. That relation loads through a
    ``Prefetch`` whose queryset annotates ``formatted_name``, which costs one query for the related
    rows. The queryset starts from the related model's ``_base_manager``, the manager that Django
    uses to load a related object, so a default manager that filters rows cannot hide the related
    object. When the relation's ``source`` crosses other to-one relations first, those relations load
    through a join.

    A to-many relation always loads through a ``Prefetch`` whose queryset starts from the related
    model's default manager and annotates ``formatted_name`` and ``object_revision``.

    The child serializer's own paths join the plan prefixed with the relation's path, for a to-one
    and a to-many relation alike. A nested ``Prefetch`` keeps its queryset under the prefixed path.
    The plan holds each path as its own entry, so the child's paths stay in the plan when a different
    ``Prefetch`` loads the relation itself. That ``Prefetch`` can be one that the viewset's queryset
    lists in ``prefetch_related`` or the one that a second expand of the same relation builds.
    :func:`apply_prefetch_plan` places each path on whichever ``Prefetch`` loads the relation:

    - A join under a ``Prefetch`` that the plan built goes onto that ``Prefetch`` queryset.
    - A join under a viewset's own ``Prefetch`` loads after it, at one query per relation for each
      request.
    - A nested prefetch runs after the ``Prefetch`` that loads the relation.

    A prefetch inside the queryset of a viewset's ``Prefetch``, such as ``"cart_items"`` in
    ``Prefetch("cart_set", queryset=Cart.objects.prefetch_related("cart_items"))``, loads its
    relation while that queryset runs. The child's paths under that relation then load one query per
    row.

    Returns ``(select_related, prefetch_related)``: the plan's join paths and its prefetch lookups.
    Pass them to :func:`apply_prefetch_plan`, which keeps a join from replacing the objects that a
    prefetch loads.
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

        if not is_to_one:
            # Pre-annotate the revision as well, so VuedaListSerializer.to_representation finds both
            # annotations and leaves the queryset alone: re-annotating a queryset serving a
            # prefetched relation clones it, discarding the cached prefetch result and forcing one
            # fresh query per row -- the exact regression this plan exists to prevent.
            related_queryset = annotate_object_revision(annotate_formatted_name(related_model._default_manager.all()))
            prefetch_related.append(Prefetch(orm_path, queryset=related_queryset))
        elif formatted_name_annotation_path(related_model) is None:
            # The related model's formatted_name_select_related joins the relations its
            # get_formatted_name() reads, as annotate_formatted_name does for its own querysets.
            name_select_related = getattr(related_model, FORMATTED_NAME_SELECT_RELATED, None) or ()
            select_related.append(orm_path)
            select_related.extend(f"{orm_path}__{nested}" for nested in name_select_related)
        else:
            # A join cannot carry an annotation for the joined model, so a to-one relation whose
            # formatted_name is an annotation loads through a Prefetch queryset that annotates it.
            # Django loads a related object through the base manager, which returns every row.
            related_queryset = annotate_formatted_name(related_model._base_manager.all())
            prefetch_related.append(Prefetch(orm_path, queryset=related_queryset))
            # The to-one relations before the prefetched one load through a join.
            parent_path, _, _ = orm_path.rpartition("__")
            if parent_path:
                select_related.append(parent_path)

        # The child's paths continue from the relation. apply_prefetch_plan moves each join that
        # passes through a prefetched relation onto that relation's prefetch, whichever Prefetch
        # loads it: the plan's own, a second expand's for the same relation, or the viewset's.
        select_related.extend(f"{orm_path}__{nested}" for nested in child_select_related)
        prefetch_related.extend(
            Prefetch(f"{orm_path}__{nested_prefetch.prefetch_through}", queryset=nested_prefetch.queryset)
            for nested_prefetch in child_prefetch_related
        )

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


def _filter_new_prefetch_lookups(queryset, prefetch_related):
    """
    Drop each entry in ``prefetch_related`` (as returned by :func:`build_prefetch_plan`) that
    ``queryset`` -- or an earlier-accepted entry in this same call -- already covers.

    The result is safe to apply only in the order that :func:`apply_prefetch_plan` sets, which is
    this function's only caller. A kept ``Prefetch`` can share its key with a lookup that
    ``queryset`` already carries without a queryset. Django raises ``ValueError`` unless the
    ``Prefetch`` runs before that lookup, and ``apply_prefetch_plan`` orders the lookups that way.

    Django keys each fetched level of a lookup by a cache key (see ``_prefetch_cache_keys``). While
    it evaluates the lookups in order, a lookup that reaches an already fetched key reuses that
    fetch. A lookup with its own ``Prefetch.queryset`` raises ``ValueError: '<lookup>' lookup was
    already seen with a different queryset`` at that point instead. An entry is dropped when it
    would meet one of these collisions:

    - A ``Prefetch`` with its own queryset is dropped when an earlier lookup with its own queryset
      claims the same key. The earlier lookup keeps whatever customization it carries, such as a
      viewset's hand-optimized ``Prefetch`` with an annotation of its own.
    - A lookup with no queryset is dropped when an earlier lookup registers the same key in any way,
      because the earlier lookup already fetches that level.

    A ``Prefetch`` with its own queryset is kept when the earlier lookups register its key only
    without a queryset, such as a bare string ``"customer"`` or the intermediate level of
    ``"customer__user"``. The plan's queryset carries the ``formatted_name`` annotation that such a
    lookup lacks. :func:`apply_prefetch_plan` orders the lookups so that this ``Prefetch`` runs before
    them, and they reuse its rows.

    Two plan entries can collide the same way -- a serializer that aliases one relation under two
    expandable-field names produces two ``Prefetch`` objects for the same path -- so an entry that
    this call already accepted counts as an earlier lookup for the entries that follow it. Django's
    cache key is the lookup's own ``prefetch_to``, not its full path, so a lookup that sets
    ``to_attr`` registers under that alias and never collides with a plan entry for the same path
    under its default attribute name.

    Dropping an entry drops only that entry's own queryset. :func:`build_prefetch_plan` lists the
    joins and prefetches nested under a relation as separate entries, so they stay in the plan.
    :func:`apply_prefetch_plan` places them on whichever ``Prefetch`` survives for the relation.

    Reads ``queryset._prefetch_related_lookups``, a private Django attribute with no public
    equivalent; it is a plain tuple of ``str``/``Prefetch`` entries across the Django versions this
    package supports (5.2, 6.0, 6.1).
    """
    registered_keys = set()
    queryset_keys = set()

    def register(lookup):
        prefetch = lookup if isinstance(lookup, Prefetch) else Prefetch(lookup)
        registered_keys.update(_prefetch_cache_keys(prefetch))
        if prefetch.queryset is not None:
            queryset_keys.add(prefetch.prefetch_to)

    for lookup in queryset._prefetch_related_lookups:
        register(lookup)

    new_lookups = []
    for lookup in prefetch_related:
        prefetch = lookup if isinstance(lookup, Prefetch) else Prefetch(lookup)
        covered_keys = registered_keys if prefetch.queryset is None else queryset_keys
        if prefetch.prefetch_to in covered_keys:
            continue

        new_lookups.append(lookup)
        register(lookup)

    return new_lookups


def _prefetch_order(lookup):
    """
    Sort key that runs a lookup before every lookup that reuses one of its fetched levels.

    A lookup reuses only levels at or above its own depth, so shallower lookups run first. At the
    same depth, a lookup with its own queryset runs before a lookup without one, because only the
    lookup with a queryset may fetch the level first.
    """
    prefetch = lookup if isinstance(lookup, Prefetch) else Prefetch(lookup)
    return prefetch.prefetch_to.count("__"), prefetch.queryset is None


def _select_related_paths(select_related_tree, prefix=""):
    """
    Flatten a ``query.select_related`` tree into the ``__``-joined paths that produce it. A path also
    joins every relation on the way to its end, so the paths to the tree's leaves are enough.
    """
    paths = []
    for name, subtree in select_related_tree.items():
        path = f"{prefix}{name}"
        if subtree:
            paths.extend(_select_related_paths(subtree, f"{path}__"))
        else:
            paths.append(path)
    return paths


def _split_join_at_prefetches(path, prefetched_paths):
    """
    Split a ``select_related`` path at each relation on it that ``prefetched_paths`` names.

    Returns ``(owner, join)`` pairs. ``owner`` is ``""`` for the part of the path that stays a join on
    the queryset itself. Otherwise ``owner`` is the prefetched path, and ``join`` is the part of the
    path that joins onto that prefetch's rows, up to the next prefetched relation.
    """
    segments = path.split("__")
    pieces = []
    owner = ""
    start = 0
    for end in range(1, len(segments) + 1):
        head = "__".join(segments[:end])
        if head not in prefetched_paths:
            continue
        if end - 1 > start:
            pieces.append((owner, "__".join(segments[start : end - 1])))
        owner = head
        start = end
    if len(segments) > start:
        pieces.append((owner, "__".join(segments[start:])))
    return pieces


def apply_prefetch_plan(queryset, select_related, prefetch_related):
    """
    Apply the ``select_related`` and ``prefetch_related`` paths of a plan from
    :func:`build_prefetch_plan` to ``queryset``, so that a prefetch alone loads each relation that it
    prefetches.

    Django skips a to-one prefetch for a row whose relation is already cached, and a
    ``select_related`` join caches every to-one relation on its path. A join through a prefetched
    relation would therefore replace the prefetched objects with plain joined ones and drop what the
    ``Prefetch`` queryset adds to them, such as the ``formatted_name`` annotation or an annotation of
    the viewset's own.

    The function collects the queryset's own joins and prefetches together with the plan's. It splits
    each join at every relation on its path that a prefetch with a queryset loads:

    - The part before the first prefetched relation stays a join on ``queryset``.
    - A part after a prefetched relation is loaded with that relation's prefetch. When the plan built
      that prefetch, the part becomes a join on the ``Prefetch`` queryset, which costs no query. When
      ``queryset`` already carried the prefetch, the part becomes a string lookup after it, so the
      viewset's own ``Prefetch`` queryset keeps its own joins only. Each relation that such a lookup
      reaches costs one query per request.

    Each surviving ``Prefetch`` queryset gets the same split, whether the plan built it or
    ``queryset`` already carried it, and whether its relation is to-one or to-many. Its joins are
    split at each relation that a lookup prefetches under its relation, such as ``customer`` for a
    ``cart_set`` queryset when the plan also prefetches ``cart_set__customer``. The split applies at
    every depth. A viewset's own ``Prefetch`` is rebuilt with the split queryset only when one of
    its joins passes through such a relation. Its filters, annotations, and ordering stay as
    declared.

    A prefetch without a queryset, such as the string ``"customer__user"``, loads the same plain
    objects that a join loads. A join through it stays, and Django skips that prefetch for each row
    whose relation the join already cached.

    The function first drops each plan prefetch that ``queryset`` already covers. A relation that
    ``queryset`` already prefetches with a ``Prefetch`` queryset of its own keeps that ``Prefetch``.
    A relation that ``queryset`` prefetches without a queryset, such as with the string
    ``"customer"``, loads through the plan's ``Prefetch``, so its ``formatted_name`` annotation
    reaches the response. The function then orders all the lookups so that each lookup runs before
    the lookups that reuse its rows. A prefetch with ``to_attr`` stores its rows under its own
    attribute, so a join on the same relation leaves it unaffected and stays.

    A bare ``select_related()`` with no paths follows every non-null foreign key and records no path
    to split. When the plan adds a join, Django replaces the bare ``select_related()`` with the
    plan's paths, so the queryset joins only those paths. Without a join in the plan, the bare
    ``select_related()`` stays, and its joins can replace a prefetched to-one relation.

    Reads ``queryset.query.select_related``, a private Django attribute: ``False``, ``True`` for a
    bare ``select_related()``, or a nested dict of relation names.

    :param queryset: The queryset to apply the plan to.
    :type queryset: django.db.models.QuerySet
    :param select_related: The plan's ``select_related`` paths.
    :type select_related: List[str]
    :param prefetch_related: The plan's ``prefetch_related`` lookups.
    :type prefetch_related: List[Union[str, django.db.models.Prefetch]]
    :return: ``queryset`` with the plan applied.
    :rtype: django.db.models.QuerySet
    """
    queryset, _ = _place_prefetch_plan(queryset, select_related, prefetch_related, frozenset())
    return queryset


def _loads_relation_through_queryset(lookup):
    """Whether ``lookup`` is a ``Prefetch`` that stores the rows of its own queryset under the relation's attribute."""
    return (
        isinstance(lookup, Prefetch) and lookup.queryset is not None and lookup.prefetch_to == lookup.prefetch_through
    )


def _place_prefetch_plan(queryset, select_related, prefetch_related, outer_prefetched_paths):
    """
    Apply a plan to ``queryset`` as :func:`apply_prefetch_plan` describes, and also split the
    queryset's joins at each path in ``outer_prefetched_paths``.

    ``outer_prefetched_paths`` names relations, relative to ``queryset``, that lookups outside
    ``queryset`` prefetch onto its rows. For a ``Prefetch`` queryset, these are the lookups that
    continue under the ``Prefetch`` relation. They run on the queryset's rows after it loads them.

    Returns ``(queryset, outer_joins)``. ``outer_joins`` maps each outer path that a join passes
    through to the parts of the joins after it. A relation that ``queryset`` prefetches itself keeps
    the parts under it, because its rows load while ``queryset`` is evaluated and the outer lookup
    reuses them. ``queryset`` is returned as it was when the plan changes nothing on it.
    """
    new_lookups = _filter_new_prefetch_lookups(queryset, prefetch_related)
    lookups = sorted(
        [(lookup, False) for lookup in queryset._prefetch_related_lookups] + [(lookup, True) for lookup in new_lookups],
        key=lambda entry: _prefetch_order(entry[0]),
    )

    prefetched_paths = {
        lookup.prefetch_through for lookup, _from_plan in lookups if _loads_relation_through_queryset(lookup)
    }
    split_paths = prefetched_paths | outer_prefetched_paths

    queryset_joins = {}
    prefetch_joins = {}
    outer_joins = {}

    def place(owner, join):
        if not owner:
            target = queryset_joins
        elif owner in prefetched_paths:
            target = prefetch_joins.setdefault(owner, {})
        else:
            target = outer_joins.setdefault(owner, {})
        target[join] = None

    existing_select_related = queryset.query.select_related
    joins = _select_related_paths(existing_select_related) if isinstance(existing_select_related, dict) else []
    joins.extend(select_related)
    for path in joins:
        for owner, join in _split_join_at_prefetches(path, split_paths):
            place(owner, join)

    changed = bool(select_related or new_lookups or prefetch_joins or outer_joins)

    # Shallower lookups come first, so a join that a Prefetch queryset hands to a relation under it
    # is placed before that relation's own Prefetch is processed.
    placed_lookups = []
    for lookup, from_plan in lookups:
        if _loads_relation_through_queryset(lookup):
            path = lookup.prefetch_through
            prefix = f"{path}__"
            # A join under the plan's Prefetch goes onto its queryset. A join under the viewset's own
            # Prefetch stays in prefetch_joins and becomes a string lookup after it.
            joins_under = list(prefetch_joins.pop(path, {})) if from_plan else []
            nested_paths = frozenset(p.removeprefix(prefix) for p in split_paths if p.startswith(prefix))
            nested_queryset, handed_out = _place_prefetch_plan(lookup.queryset, joins_under, [], nested_paths)
            for owner, joins_after in handed_out.items():
                for join in joins_after:
                    place(f"{prefix}{owner}", join)
            if nested_queryset is not lookup.queryset:
                lookup = Prefetch(path, queryset=nested_queryset)
                changed = True
        placed_lookups.append(lookup)

    if not changed:
        return queryset, outer_joins

    placed_lookups.extend(f"{owner}__{join}" for owner, joins_under in prefetch_joins.items() for join in joins_under)

    if isinstance(existing_select_related, dict):
        queryset = queryset.select_related(None)
    if queryset_joins:
        queryset = queryset.select_related(*queryset_joins)
    queryset = queryset.prefetch_related(None).prefetch_related(*sorted(placed_lookups, key=_prefetch_order))
    return queryset, outer_joins


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
            settings.REST_FLEX_FIELDS2["EXPAND_PARAM"],
            settings.REST_FLEX_FIELDS2["FIELDS_PARAM"],
            settings.REST_FLEX_FIELDS2["OMIT_PARAM"],
            settings.REST_FRAMEWORK["SEARCH_PARAM"],
            settings.REST_FRAMEWORK["ORDERING_PARAM"],
        ]
        if hasattr(self, "get_declared_column_totals"):
            extra_allowed_fields.insert(0, settings.COLUMN_TOTALS_PARAM)
        return tuple(extra_allowed_fields)

    @staticmethod
    def get_retrieve_allowed_fields():
        return (
            settings.REST_FLEX_FIELDS2["EXPAND_PARAM"],
            settings.REST_FLEX_FIELDS2["FIELDS_PARAM"],
            settings.REST_FLEX_FIELDS2["OMIT_PARAM"],
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
        """
        Reject each ``f`` and ``e`` value the serializer cannot render or expand.

        ``list``, ``retrieve``, ``create``, and ``update`` (which ``partial_update`` calls) run this
        check. A write runs it before the body is validated, so a rejected request saves nothing.

        Every invalid name in both parameters goes into one error, keyed by the name. A name invalid
        in both parameters carries both messages.

        :param request: The request whose ``f`` and ``e`` query values are checked.
        :param serializer: The action's serializer, built with the action's serializer context. It
            is the serializer that renders the response.
        :raises VuedaValidationError: When an ``f`` value is not a valid field or wildcard, or an ``e``
            value is not a permitted expand or wildcard.
        """
        submitted_fields = submitted_expand_fields = valid_expands = valid_fields = frozenset()
        errors = {}

        if (
            settings.REST_FLEX_FIELDS2["FIELDS_PARAM"] in request.query_params
            or settings.REST_FLEX_FIELDS2["EXPAND_PARAM"] in request.query_params
        ):
            submitted_fields = frozenset(serializer._get_query_param_value(settings.REST_FLEX_FIELDS2["FIELDS_PARAM"]))
            submitted_expand_fields = frozenset(
                serializer._get_query_param_value(settings.REST_FLEX_FIELDS2["EXPAND_PARAM"])
            )
            max_depth = (
                max(
                    [field.count(".") for field in submitted_fields]
                    + [field.count(".") for field in submitted_expand_fields]
                    + permitted_expand_depths(serializer)
                )
                + 1
            )
            valid_expands, valid_wildcard_expands, valid_fields, valid_wildcard_fields = (
                get_recursive_expands_and_fields(serializer, 0, max_depth)
            )

        if settings.REST_FLEX_FIELDS2["FIELDS_PARAM"] in request.query_params:
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

            for extra_key in extra_keys:
                errors.setdefault(extra_key, []).append(
                    f"Invalid field.  Valid fields are {', '.join(sorted(valid_fields))}. Or use a wildcard to specify all: {', '.join(sorted(valid_wildcard_fields, key=sort_by_dot_count_alphabetically))}"
                )

        if settings.REST_FLEX_FIELDS2["EXPAND_PARAM"] in request.query_params:
            messages = invalid_expand_messages(submitted_expand_fields, valid_expands, valid_wildcard_expands)
            for key, message in messages.items():
                errors.setdefault(key, []).append(message)

        if errors:
            raise VuedaValidationError(errors)

    def retrieve(self, request, *args, **kwargs):
        self.reject_unrecognized_query_params(request, self.get_retrieve_allowed_fields())

        serializer = self.get_serializer()

        self.validate_flex_expand_and_field_param(request, serializer)

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

        self.validate_flex_expand_and_field_param(request, serializer)

        return super().list(request, *args, **kwargs)


class FlexFieldsMixin(DefaultFlexFieldsMixin):
    """
    Mixin for DRF ViewSets to add ``permitted_expands`` in serializer context based on
    the current action. Set ``permit_<action>_expands`` on the viewset, such as
    ``permit_retrieve_expands``, to list the fields that action may expand. An action without one
    allows every expandable field, except ``list``: ``permit_list_expands`` defaults to an empty list,
    so a list request expands nothing until the viewset names fields.

    This replaces `rest_flex_fields2.views.FlexFieldsMixin` and `rest_flex_fields2.views.FlexFieldsModelViewSet` usage.
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
    A ViewSet mixin that picks the serializer class per action.

    Set ``<action>_serializer_class`` on the viewset, such as ``update_serializer_class`` or
    ``partial_update_serializer_class``, to serialize that action with its own class. An action
    without one uses ``serializer_class``.
    """

    def get_serializer_class(self):
        serializer_class_key = f"{self.action}_serializer_class"
        if hasattr(self, "action") and hasattr(self, serializer_class_key):
            return getattr(self, serializer_class_key)
        return super().get_serializer_class()


class DeactivateActionViewSetMixin:
    """
    A ViewSet mixin that allows you to deactivate a model inheriting from `ActivatableBaseModel`.

    A bulk request names its rows in a ``pks`` body. ``VuedaViewSet.get_bulk_queryset`` converts
    the keys and applies the row-level and object permission checks for ``update``, the checks that
    a single-object request makes. A key that names no row, or a row that the request may not
    change, answers 400 before anything changes.

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

        queryset, requested_pks = self.get_bulk_queryset(request, perm_type="update")

        already_deactivated = []
        for instance in queryset:
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Deactivate action is not supported for {instance.__class__.__name__}."},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED,
                )

            elif not instance.is_active:
                already_deactivated.append(requested_pks[instance.pk])

        if already_deactivated:
            errors = {}
            for pk in already_deactivated:
                errors[pk] = [f"This {instance.__class__.__name__} is already deactivated"]
            raise VuedaValidationError(errors)

        gate_warnings(request, self.get_warnings("deactivate", queryset))
        # Perform bulk deactivation in a single query
        updated = queryset.update(is_active=False)
        return Response({"detail": f"Successfully deactivated {updated} objects."}, status=status.HTTP_200_OK)

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

        queryset, requested_pks = self.get_bulk_queryset(request, perm_type="update")

        already_activated = []
        for instance in queryset:
            if not isinstance(instance, ActivatableBaseModel):
                return Response(
                    {"detail": f"Activate action is not supported for {instance.__class__.__name__}."},
                    status=status.HTTP_405_METHOD_NOT_ALLOWED,
                )

            elif instance.is_active:
                already_activated.append(requested_pks[instance.pk])
        if already_activated:
            errors = {}
            for pk in already_activated:
                errors[pk] = [f"This {instance.__class__.__name__} is already activated"]
            raise VuedaValidationError(errors)
        gate_warnings(request, self.get_warnings("activate", queryset))
        # Perform bulk deactivation in a single query
        updated = queryset.update(is_active=True)

        return Response({"detail": f"Successfully activated {updated} objects."}, status=status.HTTP_200_OK)


class VuedaViewSet(
    NestedMultipartMixin,
    WarningConfirmationMixin,
    FlexFieldsMixin,
    NoExtraFieldsForViewSetMixin,
    ListRowLevelViewSetMixin,
    viewsets.ModelViewSet,
):
    """
    Full CRUD ViewSet for VUEDA models. Extends DRF's ``ModelViewSet`` with:

    - Multipart saves that carry JSON values and nested files (``NestedMultipartMixin``)
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

    nulls_ordering: dict[str, str] | None = None
    """Nulls placement per field name, ``"first"`` or ``"last"``, applied wherever that field is sorted.

    ``VuedaOrderingFilter`` reads it. Keys are ``__``-joined field paths, as in ``ordering``.
    """

    nulls_ordering_flip: str | Iterable[str] | None = None
    """Field names in ``nulls_ordering`` whose placement flips when the field is sorted descending."""

    # `history_list` (below) fetches its object unconditionally, so it can defer a model-scope
    # denial to a matching workflow-state grant, the same way `retrieve` does -- see
    # `vueda.core.permissions.ObjectPermissions._has_later_permission_decision`. `__init_subclass__`
    # below adds this entry to every subclass's own resolved value, however that value was reached
    # (a local override, a mixin supplying it, or plain inheritance), without disturbing anything
    # else that value does or does not contain.
    workflow_object_permission_actions = frozenset({"history_list"})

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

        # `cls.workflow_object_permission_actions` here is already the fully-resolved value
        # ordinary Python attribute lookup gives this class: its own override if it declared one
        # (including an explicit, deliberate `frozenset()` that drops an action a parent declared,
        # because that parent's implementation of the action no longer guarantees an object
        # permission check), or a mixin's collection if one earlier in the MRO supplies it without
        # this class overriding it, or plain inheritance otherwise. Adding only `history_list` on
        # top preserves whatever that resolution already decided -- it never restores an action
        # this class chose to leave out, and never depends on a mixin having been written as a
        # `VuedaViewSet` subclass itself for its collection to be seen.
        cls.workflow_object_permission_actions = frozenset(cls.workflow_object_permission_actions) | {"history_list"}

        if issubclass(cls, drf_viewsets.ReadOnlyModelViewSet):
            warnings.warn(
                f"{cls.__module__}.{cls.__name__} inherits from both VuedaViewSet and ReadOnlyModelViewSet. "
                "Use VuedaReadOnlyViewSet for read-only endpoints.",
                RuntimeWarning,
                stacklevel=2,
            )

    def create(self, request, *args, **kwargs):
        self.validate_flex_expand_and_field_param(request, self.get_serializer())
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # `partial_update` calls this too.
        self.validate_flex_expand_and_field_param(request, self.get_serializer())
        return super().update(request, *args, **kwargs)

    def destroy_validation(self, objs) -> None:
        """
        Override to validate objects before deletion. Raise ``VuedaValidationError``
        to prevent deletion. Called for both single-object and bulk-delete requests.
        """
        return None

    def apply_object_permission_filter(self, queryset):
        """
        Keep only objects the current request can access at object-permission level.

        Every refusal ``check_object_permissions`` can raise drops the object, the same set
        ``vueda.core.permissions.check_action_permission`` treats as a refusal. That includes
        ``Http404``, which DRF's ``DjangoObjectPermissions`` raises for a write when the user also
        cannot read the object, and Django's ``PermissionDenied`` from a viewset override.
        """
        allowed_ids = []
        for instance in queryset:
            try:
                self.check_object_permissions(self.request, instance)
            except (NotAuthenticated, PermissionDenied, DjangoPermissionDenied, Http404):
                continue
            allowed_ids.append(instance.pk)
        return queryset.filter(pk__in=allowed_ids)

    def get_bulk_queryset(self, request, perm_type):
        """
        Return the rows that a bulk request's ``pks`` body names, after permission filtering.

        Each entry converts through the model's primary key field, as
        :class:`~vueda.core.serializers.PrimaryKeyListSerializer` describes. The rows then pass
        through :meth:`apply_row_level_filter` for ``perm_type`` and through
        :meth:`apply_object_permission_filter`, the checks that a single-object request makes.

        A key that names no row raises :class:`~vueda.core.exceptions.VuedaValidationError` with
        "Object with pk=... does not exist." for that key. A key that names a row that the request
        may not change raises the same error, so the response does not reveal that the row exists.

        Returns the queryset and a dict that maps each converted key to the value that the request
        sent. Key errors use the sent value, because a composite key converts to a tuple, which
        cannot be a JSON object key.
        """
        model = self.get_queryset().model
        serializer = PrimaryKeyListSerializer(data=request.data, model=model)
        serializer.is_valid(raise_exception=True)
        requested_pks = dict(zip(serializer.validated_data["pks"], serializer.initial_data["pks"], strict=True))

        queryset = self.get_queryset().filter(pk__in=list(requested_pks))
        queryset = self.apply_row_level_filter(queryset, perm_type=perm_type)
        queryset = self.apply_object_permission_filter(queryset)
        found_pks = set(queryset.values_list("pk", flat=True))
        missing_pks = [sent for key, sent in requested_pks.items() if key not in found_pks]
        if missing_pks:
            raise VuedaValidationError(
                {missing_pk: [f"Object with pk={missing_pk} does not exist."] for missing_pk in missing_pks}
            )
        return queryset, requested_pks

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

        queryset, _requested_pks = self.get_bulk_queryset(request, perm_type="delete")

        self.destroy_validation(queryset)
        gate_warnings(request, self.get_warnings("destroy", queryset))
        if dry_run:
            return Response(status=status.HTTP_200_OK)
        queryset.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_allowed_extra_actions(self, request, *, instance=None):
        """
        Override this function to change if a user is allowed to do a certain action.

        ``request`` is ``None`` when model metadata or ``available_actions`` is built from a
        serializer context without a request. An override must handle that case before reading
        ``request.user``. With no request, this method offers every extra action, the same answer
        :func:`vueda.core.permissions.check_action_permission` gives with no request.

        ``history_list`` is additionally gated on read authorization here, checked the same way an
        object's own ``retrieve`` already is (:meth:`_read_permitted`). ``history_list`` belongs to
        ``workflow_object_permission_actions`` by default (see that attribute above), so a
        requester whose read comes only from a matching workflow-state grant is offered
        ``history-list`` here the same way a requester whose read comes from a model-level
        permission already is, and both agree with what the history endpoint's own enforcement
        answers for the same row.
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
                # 'CompositePrimaryKey' must be named 'pk'. A key that does not convert names no
                # object, so answer 404 the way DRF's get_object_or_404 does for a malformed pk.
                try:
                    self.kwargs["pk"] = cpk_field.to_python(self.kwargs["pk"])
                except (TypeError, ValueError, ValidationError) as exc:
                    raise Http404 from exc

        return super().get_object()

    def get_queryset(self):
        """
        Annotate ``formatted_name`` and, for ``list``/``retrieve``, apply the ``select_related``/
        ``prefetch_related`` plan :func:`build_prefetch_plan` derives from what the request's ``?e=``
        actually expanded, so an expanded response's query count does not grow with the number of
        rows returned. See :func:`build_prefetch_plan` for why ``?f=``/``?om=`` play no part in this.

        :func:`apply_prefetch_plan` applies the plan. A relation that this queryset already
        prefetches with a ``Prefetch`` queryset of its own (typically one that the viewset's own
        ``queryset``/``get_queryset()`` hand-optimized) keeps the viewset's ``Prefetch`` when a
        request expands it. A relation that this queryset prefetches without a queryset loads through
        the plan's ``Prefetch``. No join replaces the objects that a ``Prefetch`` queryset loads.

        The expands nested under a relation keep their plan when this queryset lists the
        ``Prefetch`` that loads the relation, to-one or to-many. They load after the viewset's
        ``Prefetch`` at one query per relation for each request. The viewset's ``Prefetch`` queryset
        is rebuilt without the joins that pass through a relation that a nested expand prefetches,
        and keeps its filters, annotations, and ordering. A prefetch inside the queryset of the
        viewset's ``Prefetch`` loads its relation while that queryset runs, and the expands nested
        under that relation load one query per row.
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
            queryset = apply_prefetch_plan(queryset, select_related, prefetch_related)

        return queryset


class VuedaReadOnlyViewSet(
    NestedMultipartMixin,
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

    nulls_ordering: dict[str, str] | None = None
    """Nulls placement per field name, ``"first"`` or ``"last"``, applied wherever that field is sorted.

    ``VuedaOrderingFilter`` reads it. Keys are ``__``-joined field paths, as in ``ordering``.
    """

    nulls_ordering_flip: str | Iterable[str] | None = None
    """Field names in ``nulls_ordering`` whose placement flips when the field is sorted descending."""

    def get_allowed_extra_actions(self, request, *, instance=None):
        """
        Override this function to change if a user is allowed to do a certain action.

        ``request`` is ``None`` when model metadata or ``available_actions`` is built from a
        serializer context without a request. An override must handle that case before reading
        ``request.user``.

        Unlike :meth:`VuedaViewSet.get_allowed_extra_actions`, this offers every extra action
        unconditionally, including no read gate for ``history_list``: that action is defined only
        on ``VuedaViewSet``, so it never appears in ``get_extra_actions()`` here, and there is
        nothing for a read gate to filter.
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            allowed_actions.add(extra_action.url_name)

        return allowed_actions
