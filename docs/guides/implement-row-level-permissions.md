---
title: Implement Row-Level Permissions
type: how-to
audience: integrator
status: draft
---

# Implement Row-Level Permissions

This guide covers implementing per-row access control for list and object-level operations by wiring model {@term Row-Level Permissions} hooks ({@api py:class:vueda.core.permissions.BaseRowLevelPermissions}) and verifying behaviour for allowed and denied users. It walks through defining the hooks, ensuring viewset integration, verifying object-level enforcement, and testing the behaviour matrix.

The guide assumes familiarity with VUEDA's permission evaluation chain. If you have not read [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering), start there; it explains the queryset vs instance hook surface and the contracts that govern list, retrieve, and bulk-delete behaviour. For the broader permission model, see [Permission Model](../core-concepts/permission-model). For workflow state permission overlays that compose with row-level checks, see [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay).

## Goal and Preconditions

The objective is a model where:

- `list` responses show only the rows the requesting user is authorized to see.
- Retrieve, update, and `delete` operations on individual objects respect per-row authorization.
- Bulk-`delete` operations filter PKs through row-level and object-level checks before processing.
- Pagination and column totals reflect the filtered row set, not the unfiltered base queryset.

Before you begin:

The model's viewset must inherit from `VuedaViewSet`, which includes `ListRowLevelViewSetMixin` in the inheritance chain. Custom viewsets that do not include this mixin will not apply queryset-level row filtering.

The API stack must use {@api py:class:vueda.core.permissions.ObjectPermissions} as the permission class, and the user model must include {@api py:class:vueda.user.mixins.VUEDAPermissionsMixin}. These are the default VUEDA settings; verify they are in place if using a custom configuration.

## Define RowLevelPermissions on the Model

Add a `RowLevelPermissions` inner class to the model, inheriting from `BaseRowLevelPermissions`. Implement both `check_queryset` and `check_instance`:

```python
from django.db.models import Q
from vueda.core.permissions import BaseRowLevelPermissions

class Project(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=False)

    class RowLevelPermissions(BaseRowLevelPermissions):
        @classmethod
        def check_queryset(cls, model, queryset, user, perm_type):
            # Public projects are visible to all; private projects only to owners
            return Q(is_public=True) | Q(owner=user)

        @classmethod
        def check_instance(cls, model, obj, perm, user, perm_type):
            if obj.is_public or obj.owner == user:
                return True
            return False
```

The return value semantics for `check_queryset` are: `Q` object filters the queryset, `False` returns an empty queryset, `True` or `None` applies no filtering. For `check_instance`: `True` grants, `False` denies, `None` defers to the earlier permission layers.

If the model participates in a workflow and row-level rules need to account for state overlay outcomes, also implement the workflow-aware hooks:

```python
class RowLevelPermissions(BaseRowLevelPermissions):
    @classmethod
    def check_queryset(cls, model, queryset, user, perm_type):
        return Q(is_public=True) | Q(owner=user)

    @classmethod
    def check_queryset_workflow(cls, model, queryset, user, perm_type):
        # queryset is annotated with _state_denied, _state_granted
        # Apply additional filtering based on state permission annotations
        return queryset.exclude(_state_denied=True)

    @classmethod
    def check_instance(cls, model, obj, perm, user, perm_type):
        if obj.is_public or obj.owner == user:
            return True
        return False

    @classmethod
    def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny):
        # grant_or_deny is the state overlay result
        # Can override state deny when business logic requires it
        if obj.owner == user:
            return True  # Owner always has access regardless of state
        return None  # Defer to state overlay result
```

`check_queryset_workflow` receives a queryset annotated with `_state_denied` and `_state_granted` flags inside `apply_row_level_filter`. `check_instance_workflow` receives the `grant_or_deny` outcome from the state overlay and can override prior decisions; including state denial; when it returns non-`None`.

Keep the hook implementations focused. Queryset hooks must express logic as `Q` objects or booleans because they run at database scope. Instance hooks can be arbitrarily complex but should avoid expensive operations in hot paths (e.g., retrieving actions that run per-request).

## Wire ViewSet `list` Filtering

If the viewset inherits from `VuedaViewSet`, queryset-level row filtering is already wired. The `list` method on `ListRowLevelViewSetMixin` calls `apply_row_level_filter` after DRF filter backends and before pagination.

The mixin deliberately does **not** apply row filtering in `get_queryset`. This is intentional: applying the filter in `get_queryset` would affect all viewset actions (retrieve, update, delete, custom actions), which may not be appropriate for every action. Row filtering in `list` targets list-specific visibility. Object-level access for other actions is handled by `check_instance` through the permission chain.

If you override `list` on the viewset, ensure your implementation calls `apply_row_level_filter` at the correct point: after filter backends, and before both pagination and aggregation read the queryset.

## Verify Object-Level Enforcement

Object-level row checks run through the `has_perm` call chain. When `has_perm` is called with an object, and the model defines `RowLevelPermissions`, `check_instance` is evaluated as part of the permission layers. For workflow models, `check_instance_workflow` is also evaluated and can override prior decisions, including state denial.

Verify this path is active by confirming:

- The API stack uses `ObjectPermissions` (or `WorkflowObjectPermissions` for workflow models) as the permission class. This is set in `DEFAULT_PERMISSION_CLASSES` or on the viewset directly.
- The user model includes `VUEDAPermissionsMixin`, which provides the `has_perm` implementation that calls row-level hooks.
- For `detail` actions (retrieve, update, delete), `check_object_permissions` is called, which triggers `has_perm(..., obj=instance)`.

No additional wiring is needed for standard viewset actions. Custom actions that bypass `check_object_permissions` will not trigger row-level instance checks.

## Test Matrix for Allowed and Denied Users

Build a test matrix with users/groups that separate model-level permissions from row-level conditions. The matrix should cover:

**`list` filtering:**

- User with model-level `list` permission + row-level conditions met: list returns matching rows.
- User with model-level `list` permission + row-level conditions unmet for all rows: list returns `200` with empty results.
- User with model-level `list` permission + row-level conditions met for some rows: list returns only matching rows with accurate `totalRecords`.

**Retrieve:**

- User with model-level `read` permission + row-level conditions met: retrieve returns `200`.
- User with model-level `read` permission + row-level conditions unmet: retrieve returns `404` (not `403`). The object's existence is hidden.

**Bulk delete:**

- All requested PKs pass both queryset and object checks: delete succeeds.
- Some PKs fail: entire operation fails with `400` and per-PK error messages.
- PKs fail row-level checks: error message is `"Object with pk=... does not exist."` (same as genuinely missing PKs).

Test row-level denied retrieve attempts explicitly. The `404` response (not `403`) is the expected behaviour under the current permission flow, but it differs from what you might expect if you are accustomed to explicit permission denials.

## Verify Pagination and Totals Behaviour

`apply_row_level_filter` runs before both pagination and `get_column_info`, so `totalRecords`, `totalPages`, and `columnTotals` all reflect only the visible row set. Verify:

- A user with row-level restrictions sees `totalRecords` matching their visible row count, not the table total.
- Column totals (declared in `column_totals` on the viewset and requested through the totals query parameter, `ct` by default) aggregate only the filtered rows.
- Paginated navigation stays consistent; the user does not see "page 3 of 5" when their visible set has only 2 pages.

::: warning

row-level filtering and column totals are tested separately in the current test suite. There is no dedicated combined integration test, so verify the combined behaviour explicitly in your project if both features are active.

:::

## Troubleshooting and Known Gaps

**List returns all rows despite `RowLevelPermissions` being defined.** Verify the viewset inherits from `VuedaViewSet`. Custom viewsets that do not include `ListRowLevelViewSetMixin` will not call `apply_row_level_filter`.

**Retrieve returns `200` for objects that should be denied.** `check_instance` may be returning `None` (no opinion) instead of `False` (deny). Returning `None` defers to the baseline model permission, which may be `True`.

**Implementing only `check_queryset` without `check_instance`.** Object-level access for retrieve, update, and delete is not affected by `check_queryset`. Without `check_instance`, a user who cannot see an object in `list` responses may still be able to access it directly by PK.

**Workflow models without workflow-aware hooks.** For models participating in a workflow, implementing only the non-workflow hooks (`check_queryset`, `check_instance`) can produce unexpected outcomes when state overlays and row-level rules need to compose. Add `check_queryset_workflow` and `check_instance_workflow` where state-aware row filtering matters.

**Bulk delete with large PK sets is slow.** `apply_object_permission_filter` iterates instances and calls `check_object_permissions` per row. For large bulk-`delete` requests against models with expensive permission checks, latency scales linearly with PK count.

**Custom actions bypass row filtering.** Queryset-level filtering runs in `ListRowLevelViewSetMixin.list`, not in `get_queryset`. Custom viewset actions that query the model directly do not receive row-level filtering unless they explicitly call `apply_row_level_filter`.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.permissions.BaseRowLevelPermissions}
    - {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}
    - {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}
    - {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}
    - {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow}
    - {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}
    - {@api py:class:vueda.core.permissions.ObjectPermissions}
    - {@api py:function:vueda.core.permissions.ObjectPermissions.has_object_permission}
    - {@api py:class:vueda.user.mixins.VUEDAPermissionsMixin}
    - {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.core.viewsets.VuedaViewSet.destroy}
