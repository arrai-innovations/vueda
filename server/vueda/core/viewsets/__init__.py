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

import warnings

from django.conf import settings
from django.db import transaction
from django.db.models import CompositePrimaryKey
from django.db.models import Prefetch
from django.db.models import Q
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
from vueda.core.models import ActivatableBaseModel
from vueda.core.models import annotate_formatted_name
from vueda.core.serializers import GenericForeignKeySerializer
from vueda.core.serializers import PrimaryKeyListSerializer
from vueda.core.serializers import ensure_flex_fields_applied
from vueda.core.utils import sort_by_dot_count_alphabetically


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
    """Filter out rows the user cannot access and expose column aggregates."""

    column_totals: list[str] = []
    applies_workflow_state_list_filter = True

    def apply_row_level_filter(self, queryset, perm_type="list"):
        """
        Apply row-level and workflow-aware queryset filters for the given ``perm_type``.
        Calls ``RowLevelPermissions.check_queryset`` and, when the model has a workflow,
        also annotates state permission info and calls ``check_queryset_workflow``.
        """
        model = queryset.model
        row_level_permissions = getattr(model, "RowLevelPermissions", None)

        permission_name = perm_type
        if perm_type in settings.PERMISSION_NAMES_MAPPING:
            permission_name = settings.PERMISSION_NAMES_MAPPING[perm_type]

        perm = f"{model._meta.app_label}.{permission_name}_{model._meta.model_name}"

        if row_level_permissions is not None:
            optional_q = row_level_permissions.check_queryset(
                queryset,
                perm,
                self.request.user,
                perm_type,
            )
            if isinstance(optional_q, Q):
                queryset = queryset.filter(optional_q)
            elif optional_q is False:
                return queryset.none()
            # else, optional_q is None or True, so we don't filter

        # Workflow state permissions are an authorization overlay, not an opt-in row-level hook.
        # Apply them even when the model does not define RowLevelPermissions.
        if "vueda.workflow" in settings.INSTALLED_APPS:
            from vueda.workflow.models import HasWorkflowModelMixin
            from vueda.workflow.models import StatePermission
            from vueda.workflow.models import Workflow

            if issubclass(model, HasWorkflowModelMixin):
                workflow = Workflow.objects.filter(content_type=model.get_content_type()).first()
                if workflow:
                    from django.contrib.contenttypes.models import ContentType
                    from django.db.models import Exists
                    from django.db.models import OuterRef

                    codename = perm.rsplit(".", maxsplit=1)[-1]
                    content_type = ContentType.objects.get_for_model(model)
                    user = self.request.user

                    state_denied = Exists(
                        StatePermission.objects.filter(
                            state=OuterRef("object_states_proxy__state"),
                            state__workflow=workflow,
                            permission__codename=codename,
                            permission__content_type=content_type,
                            group__in=user.groups.all(),
                            grant_or_deny=False,
                        )
                    )
                    state_granted = Exists(
                        StatePermission.objects.filter(
                            state=OuterRef("object_states_proxy__state"),
                            state__workflow=workflow,
                            permission__codename=codename,
                            permission__content_type=content_type,
                            group__in=user.groups.all(),
                            grant_or_deny=True,
                        )
                    )
                    queryset = queryset.annotate(
                        _state_denied=state_denied,
                        _state_granted=state_granted,
                    )

                    if user.has_perm(perm):
                        queryset = queryset.filter(_state_denied=False)
                    else:
                        queryset = queryset.filter(_state_denied=False, _state_granted=True)

                    if row_level_permissions is not None:
                        workflow_q = row_level_permissions.check_queryset_workflow(
                            queryset,
                            perm,
                            user,
                            perm_type,
                            "_state_denied",
                            "_state_granted",
                        )
                        if isinstance(workflow_q, Q):
                            queryset = queryset.filter(workflow_q)
                        elif workflow_q is False:
                            return queryset.none()

        return queryset

    def get_column_info(self, queryset):
        """Return aggregated totals for any fields listed in ``column_totals``."""
        if not self.column_totals:
            return {}
        aggregations = {column: Sum(column) for column in self.column_totals}
        return queryset.aggregate(**aggregations)

    def list(self, request, *args, **kwargs):
        """
        applying row level filter in get_queryset() causes problems
         with other drf actions, specifically encountered with create
         not finding it's created object
        """
        # future: when updating drf, check that the copied code is still the same
        # code from drf
        queryset = self.filter_queryset(self.get_queryset())
        # our addition

        queryset = self.apply_row_level_filter(queryset)
        column_totals = self.get_column_info(queryset)
        # end addition

        page = self.paginate_queryset(queryset)
        if page is not None:
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
            related_queryset = annotate_formatted_name(related_model._default_manager.all())
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
    ordering, search, and REST Flex Fields params (`get_extra_allowed_fields()`). A viewset with no
    `filterset_class` recognizes only the latter set. `retrieve` recognizes only the expand, fields and omit params.
    """

    @staticmethod
    def get_extra_allowed_fields():
        return (
            settings.PAGE_QUERY_PARAM,
            settings.PAGE_SIZE_QUERY_PARAM,
            settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"],
            settings.REST_FLEX_FIELDS["OMIT_PARAM"],
            settings.REST_FRAMEWORK["SEARCH_PARAM"],
            settings.REST_FRAMEWORK["ORDERING_PARAM"],
        )

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
            # get_fields() only gets fields from the meta, not declared fields on the filterset.
            for filter_name, filter_obj in self.filterset_class.get_filters().items():
                widget = filter_obj.field.widget
                # If the filter has suffixes, then we need to use those with the filter name.
                if hasattr(widget, "suffixes"):
                    for suffix in widget.suffixes:
                        filterset_fields.add(f"{filter_name}_{suffix}")
                else:
                    filterset_fields.add(filter_name)
                if hasattr(filter_obj, "lookup_expr"):
                    filterset_fields.add(f"{filter_name}__{filter_obj.lookup_expr}")

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
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            allowed_actions.add(extra_action.url_name)

        return allowed_actions

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
        queryset = annotate_formatted_name(queryset)

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
        """
        allowed_actions = set()
        for extra_action in self.get_extra_actions():
            allowed_actions.add(extra_action.url_name)

        return allowed_actions
