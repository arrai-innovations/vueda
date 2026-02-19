---
title: Row-Level Permission Filtering
type: explanation
audience: implementor
status: draft
---

# Row-Level Permission Filtering

VUEDA supports per-row access control through an optional model-level hook that operates at two independent scopes: queryset filtering (which rows appear in list responses and are eligible for bulk deletion) and instance checking (which objects pass object-level permission evaluation). These two scopes are independent by design; they serve different purposes, may implement different rules, and can produce different outcomes for the same object.

This page explains the hook surface, the filtering boundaries for list and bulk-delete operations, how pagination and aggregates interact with row filtering, and the failure modes that result from row-level decisions. For the broader permission model (baseline CRUDL, workflow overlay, evaluation order), see [Permission Model](./permission-model). For the practical steps to implement row-level hooks, see [Implement Row-Level Permissions](../guides/implement-row-level-permissions). For workflow state permission overlays, see [Workflow as a Permission Overlay](./workflow-permission-overlay).

## Authority and Boundaries

Row-level permission filtering is opt-in per model. A model that defines a `RowLevelPermissions` inner class (inheriting from `BaseRowLevelPermissions`) participates in row-level filtering; a model without this class has no row-level filtering applied at list or bulk-delete scope, and no row-level instance checks in the permission evaluation chain.

The `RowLevelPermissions` class provides up to four hooks. Two are non-workflow hooks that apply to all models: `check_queryset` controls list-level row visibility, and `check_instance` controls object-level permission decisions. Two are workflow-aware hooks that apply only to models participating in a workflow: `check_queryset_workflow` operates on a queryset annotated with state-permission flags, and `check_instance_workflow` receives the state overlay's grant-or-deny outcome and can override earlier permission layers, including state denial. The non-workflow and workflow hooks are evaluated in sequence during their respective filtering paths.

The authority split is intentional. Queryset filtering must express its logic as a `Q` object or a boolean because it operates at database scope; it cannot make per-row decisions that require object materialization, external lookups, or expensive computation. Instance checks operate on a materialized Python object and can implement arbitrarily complex logic, including remote API calls, cross-system policy evaluation, or state-dependent business rules. A project may intentionally grant list visibility to rows that would be denied at instance scope, or hide rows from lists that instance-level checks would allow. The framework does not validate consistency between the two scopes.

## Row-Level Hook Surface (Queryset vs Instance)

### Queryset-level filtering

`ListRowLevelViewSetMixin.apply_row_level_filter` is the entry point for queryset-level row filtering. When a model defines `RowLevelPermissions`, the method calls `check_queryset` with the model class, the current queryset, the authenticated user, and a permission type string (typically `"list"` or `"delete"`).

The return value semantics are fixed:

- **`Q` object**: the queryset is filtered by `queryset.filter(Q)`. This is the common case, where the hook returns a condition that limits rows to those the user should see.
- **`False`**: the queryset is replaced with `queryset.none()`. The user sees no rows.
- **`True` or `None`**: no filtering is applied. All rows pass through.

For workflow models, `apply_row_level_filter` then runs a second pass. The queryset is annotated with state-permission flags (`_state_denied`, `_state_granted`) that reflect the user's group-level state permission outcomes for each row. `check_queryset_workflow` receives this annotated queryset and can apply additional filtering based on workflow state. Either hook can return `False` to deny all rows.

The permission codename passed to the hook is constructed from the model's `app_label` and `model_name`, plus the action-appropriate permission name (e.g., `PERMISSION_NAMES_MAPPING["list"]` for list operations).

### Instance-level checking

When `VUEDAPermissionsMixin.has_perm` is called with an object, and that object's model defines `RowLevelPermissions`, the permission evaluation chain includes row-level instance checks after baseline model permissions and (for workflow models) state permission overlays.

`check_instance` is called with the model class, the object, the permission string, the user, and the permission type. Its return value is `True`, `False`, or `None`. A non-`None` result overrides the decision from earlier permission layers (the baseline model permission and, when applicable, the workflow state overlay). `None` means "no row-level opinion"; the earlier decision stands.

For workflow models, `check_instance_workflow` runs after `check_instance`. This hook receives the state overlay's `grant_or_deny` outcome as an additional argument, allowing it to override even a state denial. A non-`None` return from `check_instance_workflow` is the final decision. This hook runs regardless of whether the state overlay denied permission; it is the last evaluation layer in the permission chain.

Note that `check_instance` is skipped when the workflow state overlay has already denied permission (layer 2 returned `False`), because the state denial is considered authoritative for non-workflow-aware row logic. The workflow-aware `check_instance_workflow` is not skipped; it always runs when the model has a workflow.

## List Response Contract (Rows, Pagination, Aggregates)

Row-level filtering runs at a specific point in the list response pipeline: after DRF filter backends (`filter_queryset(self.get_queryset())`) and before pagination and serialization. This positioning has three consequences.

**Rows reflect the filtered set.** The `results` array in the list response contains only rows that passed both DRF filter backends and row-level filtering. No unfiltered rows leak into the response.

**Pagination metadata reflects the filtered count.** `totalRecords` and `totalPages` in the paginated response are computed from the filtered queryset, not the unfiltered base queryset. A user with row-level restrictions sees accurate pagination for their visible row set.

**Column totals reflect the filtered set.** When the viewset declares `column_totals`, aggregates are computed from the filtered queryset (before pagination). This means totals match the visible rows, not the full table. See [Expose Aggregates in List Responses](../guides/list-column-totals) for the column totals implementation.

When row filtering produces an empty result (e.g., `check_queryset` returns `False`), the list response is `200` with an empty `results` array and `totalRecords == 0`. The endpoint does not return `403`; row-level filtering is a visibility constraint, not an endpoint-level authorization rejection.

## Bulk Delete Eligibility Contract

Bulk delete (`DELETE` on the list route with `pks` in the request body) applies row-level filtering as an eligibility gate. The implementation filters the requested PKs through two passes:

1. **Queryset-level filtering.** `apply_row_level_filter(queryset, perm_type="delete")` runs with the delete permission type. Rows that fail the queryset filter are removed from the candidate set.

2. **Object-level permission filtering.** `apply_object_permission_filter(queryset)` iterates the remaining instances and calls `check_object_permissions` per row. Instances that fail object-level checks are removed.

If the resulting set is smaller than the requested PK set, meaning some PKs were filtered out by either pass, the entire operation fails. No rows are deleted. The response is `400` with validation errors keyed by PK, using the message `"Object with pk=... does not exist."`. This message is deliberately ambiguous: it does not distinguish between PKs that genuinely do not exist and PKs that exist but were filtered out by row-level or object-level eligibility. The ambiguity hides the existence of filtered-out rows from the requesting user.

The per-instance iteration in `apply_object_permission_filter` means that bulk-delete latency scales with the number of requested PKs. Large bulk-delete requests against models with expensive `check_object_permissions` implementations will be slow.

## Failure Modes (404, Empty List, 400 Validation Map)

Row-level permission decisions manifest as different HTTP responses depending on the endpoint and the scope of the denial.

**List returns `200` with filtered or empty results.** Row-level list filtering never produces `403`. A fully denied user sees `200` with `totalRecords == 0`. A partially filtered user sees only their visible rows with accurate pagination.

**Retrieve returns `404` for filtered-out objects.** When an object exists in the database but is filtered out by row-level or object-level checks, a retrieve request returns `404`, not `403`. The object's existence is hidden from the user. This is a consequence of DRF's default behaviour when object-scope permission checks fail in certain configurations.

**Bulk delete returns `400` with missing-PK errors.** When any requested PK is ineligible (filtered by queryset-level or object-level checks), the response is `400` with per-PK error messages. The error text is the same for genuinely missing PKs and permission-filtered PKs.

**Queryset/instance divergence produces visible inconsistencies.** Because `check_queryset` and `check_instance` are independent hooks, they can produce different outcomes for the same object. An object might appear in a list response (passes `check_queryset`) but return `404` on retrieve (fails `check_instance`), or vice versa. This divergence may be intentional (different business rules or performance trade-offs at each scope), but accidental divergence can lead to confusing behaviour. No framework-level validation warns when the two hooks disagree.

**Custom actions and overridden list bypass row filtering.** Queryset-level filtering runs in `ListRowLevelViewSetMixin.list`, not in `get_queryset`. Custom viewset actions that query the model directly, or overridden `list` implementations that skip the mixin's `list` method, bypass the row filter entirely. Any custom code that requires row-level filtering must explicitly call `apply_row_level_filter`.

**Aggregation leakage on custom list paths.** If row filtering is performed after aggregation or pagination in a customized list implementation, aggregates and metadata may reflect the unfiltered queryset. The default implementation avoids this by computing aggregates after filtering, but custom implementations must maintain this ordering.

## Relevant Implementation Surface

- `{@api py:class:vueda.core.permissions.BaseRowLevelPermissions}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}`
- `{@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}`
- `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.apply_object_permission_filter}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy}`
- `{@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}`
- `{@api py:function:vueda.core.pagination.VUEDAPageNumberPagination.get_paginated_response}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
