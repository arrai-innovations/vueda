---
title: Row-Level Permission Filtering
type: explanation
audience: implementor
status: briefing
---

# Row-Level Permission Filtering

## Intent and Scope

- Define the server-enforced boundary for row visibility in list responses and for row eligibility in bulk-delete.
  Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/permissions.py`, `server/tests/unit/core/test_row_level_permissions.py`.
- Define how queryset-level row filtering composes with object-level permission checks (instance gates) in VUEDA.
  Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- Define the observable list pagination and aggregate contract under row filtering (`totalRecords`, `totalPages`, `columnTotals`).
  Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`.
- Define failure surfaces where row-level decisions manifest as `404`/empty list results/validation errors.
  Anchors: `server/tests/unit/core/test_row_level_permissions.py`, `server/vueda/core/viewsets/__init__.py`.

## Non-goals

- Not a how-to for implementing `RowLevelPermissions` or assigning permissions/groups (belongs in guides).
- Not a complete permission model explanation (workflow overlay, CRUDL mapping, action availability).
- Not a guarantee that every non-list endpoint or custom action applies queryset-level row filtering automatically.
  Anchors: `server/vueda/core/viewsets/__init__.py`.

## Key Concepts

### Model-scoped row-level hook (`RowLevelPermissions`)

- What it is: An optional model attribute `RowLevelPermissions` implementing `BaseRowLevelPermissions.check_queryset(...)`
  and `BaseRowLevelPermissions.check_instance(...)`. The two hooks are independent interfaces that may intentionally
  implement different rules. Anchors: `server/vueda/core/permissions.py`, `server/tests/models.py`.
- Why it exists: Separate row visibility (queryset) from row permission decisions (instance) because they operate at
  different scopes with different constraints. Queryset filtering must express logic as `Q`/boolean at database scope;
  instance checks operate on materialized objects and can implement arbitrarily complex logic (remote API calls,
  cross-system policy). Projects may intentionally grant list visibility to rows denied at instance scope, or vice versa.
  Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/user/mixins.py`.
- Where it lives: `server/vueda/core/permissions.py` (base hook), per-model `RowLevelPermissions` (e.g. tests).
  Anchors: `server/vueda/core/permissions.py`, `server/tests/models.py`.

### Queryset-level filtering boundary (list + bulk-delete)

- What it is: `ListRowLevelViewSetMixin.apply_row_level_filter(...)` calls `RowLevelPermissions.check_queryset(...)` and
  applies its return value (`Q` / `False` / `True` / `None`) to the queryset. Anchors: `server/vueda/core/viewsets/__init__.py`.
- Why it exists: Row-level filtering is applied in `list()` (not `get_queryset()`) to avoid side effects in other DRF
  actions (documented in the mixin docstring). Anchors: `server/vueda/core/viewsets/__init__.py`.
- Where it lives: `server/vueda/core/viewsets/__init__.py` (`ListRowLevelViewSetMixin.list`, `apply_row_level_filter`).

### Instance-level decision boundary (object permissions)

- What it is: When `obj` is present, `VUEDAPermissionsMixin.has_perm(...)` calls `RowLevelPermissions.check_instance(...)`
  and treats `None` as “no row-level opinion” (keep earlier decision layers). Anchors: `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- Why it exists: Allow per-object overrides without changing baseline model permission and (optionally) workflow-state
  overlay outcomes. Anchors: `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- Where it lives: `server/vueda/user/mixins.py`, model-specific `RowLevelPermissions`. Anchors: `server/vueda/user/mixins.py`, `server/vueda/core/permissions.py`.

### Pagination and aggregates are computed after row filtering

- What it is: `ListRowLevelViewSetMixin.list(...)` computes `columnTotals` and paginates after applying the row-level
  filter; the paginator exposes `totalRecords`/`totalPages` derived from the filtered queryset. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`.
- Why it exists: List metadata and aggregates are required to match the visible row set rather than the unfiltered base
  queryset. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`.
- Where it lives: `server/vueda/core/viewsets/__init__.py` (`get_column_info`, `list`), `server/vueda/core/pagination.py`.

### Bulk delete treats row-level filtering as an eligibility gate

- What it is: Bulk delete (`DELETE` on the list route) filters the requested PKs through `apply_row_level_filter(..., perm_type="delete")`
  and then through `apply_object_permission_filter(...)`; filtered-out PKs are treated as missing and returned as a
  validation error map keyed by PK. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`.
- Why it exists: Bulk mutation eligibility requires both queryset-level and instance-level gating at request time.
  Anchors: `server/vueda/core/viewsets/__init__.py`.
- Where it lives: `server/vueda/core/viewsets/__init__.py` (`VuedaViewSet.destroy`, `apply_object_permission_filter`).

## Relevant Implementation Surface

- `{@api py:class:vueda.core.permissions.BaseRowLevelPermissions}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}`
- `{@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}`
- `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.apply_object_permission_filter}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy}`
- `{@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}`
- `{@api py:function:vueda.core.pagination.VUEDAPageNumberPagination.get_paginated_response}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`

## Contracts and Invariants

- Row filtering is conditional on a model-defined `RowLevelPermissions` attribute; absence means no row-level filtering at
  list/bulk-delete scope. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/permissions.py`.
- `check_queryset(...)` return semantics are fixed:
  - `Q`: rows are filtered by `queryset.filter(Q)`.
  - `False`: rows are filtered to `queryset.none()`.
  - `True` / `None`: no queryset filtering occurs.
    Anchors: `server/vueda/core/permissions.py`, `server/vueda/core/viewsets/__init__.py`.
- List row filtering occurs after DRF filter backends (`filter_queryset(self.get_queryset())`) and before pagination and
  serialization. Anchors: `server/vueda/core/viewsets/__init__.py`.
- `columnTotals` are computed from the filtered queryset (pre-pagination) and are exposed on paginated list responses as
  `columnTotals`. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`.
- Paginated list metadata `totalRecords` / `totalPages` reflect the filtered queryset size, not the unfiltered base
  queryset. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`.
- When `check_queryset(...)` denies list visibility (e.g. returns `False`), list returns `200` with empty `results` and
  `totalRecords == 0`. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`.
- Row-level denial on object reads can manifest as `404` on retrieve (existence-hidden behavior), not `403`. Anchors: `server/tests/unit/core/test_row_level_permissions.py`.
- Bulk delete applies row-level filtering at `perm_type="delete"` and then applies object-level permission checks; a mixed
  eligibility set returns `400` with missing-PK errors and performs no deletion. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`.

## Footguns

- Unintentional queryset/instance divergence:
  - Symptom: an object appears in list but retrieve returns `404`, or list hides an object that retrieve would allow.
  - Cause: `check_queryset(...)` and `check_instance(...)` are independent hooks with no internal consistency checks.
    Intentional divergence (different business rules or performance trade-offs at each scope) is a valid design choice,
    but accidental divergence produces confusing behavior. No framework-level validation warns when the two hooks disagree.
  - Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/user/mixins.py`, `server/tests/unit/core/test_row_level_permissions.py`.
- Non-list endpoints and custom actions:
  - Symptom: unauthorized rows included in a response produced by a custom action or overridden `list()` implementation.
  - Cause: queryset-level filtering is performed in `ListRowLevelViewSetMixin.list(...)` (not in `get_queryset()`), so
    bypassing that method bypasses the row filter. Anchors: `server/vueda/core/viewsets/__init__.py`.
- Aggregation leakage:
  - Symptom: aggregates/metadata computed from an unfiltered queryset (counts or totals that exceed visible rows).
  - Cause: row filtering performed after aggregation/pagination in a customized list path.
  - Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`.
- Bulk delete “missing PK” ambiguity:
  - Symptom: `400` errors of the shape `Object with pk=... does not exist.` for rows that exist but are filtered out by
    row-level/object-level eligibility. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`.
- Per-instance object permission filtering cost:
  - Symptom: bulk-delete latency grows with the number of requested PKs.
  - Cause: `apply_object_permission_filter(...)` iterates instances and calls `check_object_permissions(...)` per row.
  - Anchors: `server/vueda/core/viewsets/__init__.py`.

## Suggested Outline

- `## Authority and Boundaries`
- `## Row-Level Hook Surface (Queryset vs Instance)`
- `## List Response Contract (Rows, Pagination, Aggregates)`
- `## Bulk Delete Eligibility Contract`
- `## Failure Modes (404, Empty List, 400 Validation Map)`
