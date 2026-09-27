---
title: Row-Level Permission Filtering
type: explanation
audience: integrator
status: draft
---

# Row-Level Permission Filtering

{@term Row-Level Permissions} let a project decide, per row, which objects a user may see and act on. This page describes which requests apply those decisions. It covers how `list` pagination and totals follow the filter, and how bulk delete picks the rows it may remove. [Implement Row-Level Permissions](../guides/implement-row-level-permissions) gives the steps to write the hooks, and [Permissions](../reference/permissions) lists their signatures and the status codes each denial produces.

## Authority and Boundaries

Row-level filtering is opt-in per model. A model takes part when it declares an inner `RowLevelPermissions` class that subclasses {@api py:class:vueda.core.permissions.BaseRowLevelPermissions}. Every hook on the base class returns `None`, which means no opinion, so a subclass overrides only the hooks it needs.

The hooks work at two scopes:

- {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset} filters a queryset. It runs for `list`, for bulk delete, and for the {@term Model History} events a user sees about related rows.
- {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance} decides one object. It runs inside every object permission check.

A {@term Workflow-Enabled Model} has one more hook at each scope, described under {@term Row-Level Workflow Permissions}. Its lists also pass through {@term State Permission} filtering, which runs whether or not the model declares `RowLevelPermissions`.

The two scopes have different limits. `check_queryset` returns a {@api ext:django:django.db.models.Q} object or a boolean, so its rule must be expressible as a database filter. `check_instance` receives one loaded object and can run any Python, including lookups in other systems. A project can therefore apply different rules at each scope, on purpose or by accident. VUEDA does not compare them. A user can retrieve a row that `check_queryset` hides from `list` when the row passes its object check. A listed row can also fail that check.

The hooks also receive different action names in their `perm_type` argument. `check_queryset` receives the name its caller passes: `"list"`, `"delete"`, or `"read"` for history. `check_instance` receives the action part of the codename being checked, after {@term Permission Mapping} renamed it. The two agree under the default mapping and can differ when a project maps `list`, `read`, or `delete` to other names.

## Queryset Filtering

{@api py:function:vueda.core.permissions.filter_rows_for_user} applies the queryset rules. A viewset calls it through {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}, and history calls it directly, so both follow one rule.

It first builds the codename for the action, such as `inventory.list_product`, using the permission mapping. Then it calls `check_queryset` with the queryset, that codename, the user, and the action name. The result decides the rows:

- A `Q` object filters the queryset by that condition.
- `False` returns an empty queryset, and no later step runs.
- `True` or `None` keeps every row.

For a workflow-enabled model, a state-permission pass follows. It marks each row with whether a state rule in the row's current state denies or grants the codename to one of the user's groups. A user whose {@term Baseline Permission} includes the codename keeps every row without a matching deny. Any other user keeps only rows with a matching grant and no matching deny. [Workflow as a Permission Overlay](./workflow-permission-overlay) describes how state rules match and conflict.

When the model declares `RowLevelPermissions`, {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow} then receives the remaining rows. Its [`state_denied_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_denied_annotation} and [`state_granted_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_granted_annotation} arguments name the per-row deny and grant marks, so a `Q` object can refer to them. The hook can remove more rows or return `False` to remove all of them. It cannot restore a row the state pass removed.

## Instance Checks

When {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm} checks a permission against an object, it calls `check_instance`. On a workflow-enabled model it then calls {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}. They are the last two {@term Permission Layers}; [Permission Model](./permission-model) describes the order and when a state deny skips `check_instance`.

Requests for a single object (`retrieve`, `update`, `partial_update`, and a single-object `DELETE`) run only this object check. They do not call `check_queryset`. When the check denies a read, the response is `404`, so the user cannot tell a hidden row from a missing one.

## `list` Response Contract

{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list} applies row filtering after the viewset's filter backends and before pagination, totals, and serialization. Every part of the response follows the filtered set:

- `results` holds only rows that passed the filter backends and row filtering.
- `totalRecords` and `totalPages` count the filtered rows, as {@api py:class:vueda.core.pagination.VUEDAPageNumberPagination} reports them.
- {@term Column Totals} sum every filtered row across all pages, so each page reports the same totals. A viewset without pagination returns a bare list of rows and computes no totals.

When filtering removes every row, the response is `200` with an empty `results` array and `totalRecords` of `0`. Row filtering narrows what a permitted request returns. The {@term Model-Scope Check} runs earlier and decides whether the user may call `list` at all. A `403` comes from that check.

## Bulk Delete Eligibility

A bulk delete is a `DELETE` request on the list route with a `pks` array in the body. {@api py:function:vueda.core.viewsets.VuedaViewSet.destroy} decides which requested rows are eligible in two passes:

1. It applies queryset filtering to the requested rows with the action name `"delete"`. This runs `check_queryset`, the state-permission pass, and `check_queryset_workflow`, as for `list`.
2. {@api py:function:vueda.core.viewsets.VuedaViewSet.apply_object_permission_filter} runs the object permission check on each remaining row. It drops a row on any refusal from that check. That includes the `404` raised when the user can neither delete nor read the row, and a Django {@api ext:django:django.core.exceptions.PermissionDenied} raised by a viewset override.

If any requested primary key is not eligible, the request deletes nothing. The response is `400` with one error per ineligible key, keyed by that key: `"Object with pk=<pk> does not exist."`. A key with no row gets the same message, so the response does not reveal which rows exist.

The second pass loads and checks each row in Python. A bulk delete of many rows on a model with an expensive `check_instance` takes time in proportion to the number of rows.

## Code Paths Without Row Filtering

In a viewset, row filtering runs in `ListRowLevelViewSetMixin.list` and bulk delete. It does not run in `get_queryset`, because a filtered `get_queryset` also narrows other actions; `create`, for example, could fail to find the object it just saved.

A custom action that queries the model, or a `list` override that does not call the mixin's `list`, therefore returns unfiltered rows. Such code gets the same filter by calling `apply_row_level_filter` on its queryset. If that code paginates or aggregates, it must filter first; otherwise page counts and totals include rows the user cannot see.
