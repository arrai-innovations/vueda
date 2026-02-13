---
title: Implement Row-Level Permissions
type: how-to
audience: implementor
status: briefing
---

# Implement Row-Level Permissions

## Intent and Scope

- Implement per-row access for list and object-level operations by wiring model `RowLevelPermissions` hooks and verifying behavior for allowed and denied users.
- Keep this as a technical scoping brief: implementation touchpoints, runtime contracts, and verification points.
- Source anchors: `server/vueda/core/permissions.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/user/mixins.py`, `server/tests/unit/core/test_row_level_permissions.py`.

## Non-goals

- Not a full explanation of permission architecture or workflow overlays.
- Not a UI-focused action-availability guide.
- Not a guarantee that every non-list bulk write path currently applies row-level checks automatically.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/user/mixins.py`.

## Key Tasks

### 1. Implement model row-permission hooks

- Add model `RowLevelPermissions(BaseRowLevelPermissions)` with both `check_instance(...)` and `check_queryset(...)`.
- Keep return semantics explicit: `Q` filters list rows, `False` denies all rows, and `True` or `None` applies no additional list filter.
- For workflow models, optionally implement `check_instance_workflow(...)` and `check_queryset_workflow(...)` for logic that needs both state and row context. These run after `check_instance`/`check_queryset` and can override any prior decision.
- Note: `check_instance` is skipped when workflow state denies permission. Logic that must run even when state denies should go in `check_instance_workflow`.
- Source anchors: `server/vueda/core/permissions.py`, `server/tests/models.py`.

### 2. Ensure list action executes row-level filtering

- Use `VuedaViewSet`/`VuedaHistoryViewSet` so `ListRowLevelViewSetMixin` is in the inheritance chain.
- Keep row-level filtering in `list()` through `apply_row_level_filter(...)` (the mixin deliberately does not apply this in `get_queryset()`).
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/viewsets.py`.

### 3. Ensure object-level checks call `check_instance`

- Confirm the API stack uses `ObjectPermissions` and a user class with `VUEDAPermissionsMixin`.
- Object permission paths call `has_perm(..., obj=instance)`, which is where row-level `check_instance` is evaluated.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`.

### 4. Verify a mixed-authority behavior matrix

- Use users/groups that separate model-level permissions from row-level conditions.
- Verify retrieve allowed for rows matching the row rule.
- Verify retrieve denied for rows failing the row rule.
- Verify list returns filtered rows (or an empty result set) by user.
- Source anchors: `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/models.py`.

### 5. Verify pagination/totals behavior after filtering

- `apply_row_level_filter(...)` runs before both pagination and `get_column_info(...)`, so totals should reflect only visible rows.
- Coverage note: row-level and column-total behavior are tested separately; there is no dedicated combined test in current suite.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/unit/core/test_pagination.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:class:vueda.core.permissions.BaseRowLevelPermissions}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow}`
- `{@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}`
- `{@api py:class:vueda.core.permissions.ObjectPermissions}`
- `{@api py:function:vueda.core.permissions.ObjectPermissions.has_object_permission}`
- `{@api py:class:vueda.user.mixins.VUEDAPermissionsMixin}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
- `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy}`

## Contracts and Invariants

- Row-level list filtering is opt-in per model via `Model.RowLevelPermissions`; no row-level class means no row-level list filter is applied.
- `check_queryset` affects list visibility through `ListRowLevelViewSetMixin.list`.
- `check_instance` affects object permission decisions through `has_perm(..., obj=...)`; returning `None` falls back to model-level permission outcome. `check_instance` is skipped when workflow state denies.
- `check_instance_workflow` runs after `check_instance` for workflow models; it receives `grant_or_deny` and can override state deny.
- In current tests, row-level denied retrieve attempts return `404` for users with baseline read/list model permissions.
- The permission codename passed to `check_queryset` is constructed from app/model plus `PERMISSION_NAMES_MAPPING["list"]` when configured.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/default_settings.py`, `server/vueda/user/mixins.py`, `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/models.py`.

## Footguns

- Implementing only `check_queryset` leaves object-level access dependent on `check_instance` fallback behavior.
- `check_instance` is skipped when workflow state denies; any override logic that must survive state deny belongs in `check_instance_workflow`.
- Bulk delete (`DELETE` list with `pks`) in `VuedaViewSet.destroy` does not call `apply_row_level_filter(...)` and does not perform per-object row-level checks in that method.
- Retrieve denials may present as `404` (not `403`) under current permission flow; test client expectations explicitly.
- Combined guarantee "row-level filtering and column totals together" is code-backed but currently not covered by a single integration test.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/user/mixins.py`, `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/unit/core/test_pagination.py`.

## Suggested Outline

```md
## Goal and Preconditions

## Define RowLevelPermissions on the Model

## Wire ViewSet List Filtering

## Verify Object-Level Enforcement

## Test Matrix for Allowed and Denied Users

## Verify Pagination and Totals Behavior

## Troubleshooting and Known Gaps
```
