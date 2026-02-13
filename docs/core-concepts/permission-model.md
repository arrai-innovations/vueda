---
title: Permission Model (CRUDL + Object + State)
type: explanation
audience: implementor
status: briefing
---

# Permission Model (CRUDL + Object + State)

## Intent and Scope

- Define the enforced permission boundary for CRUDL actions, object checks, row filters, and workflow-state overlays.
- Capture authority and evaluation order across server layers: DRF permission class, user permission mixin, row-level hooks, and workflow transition gates.
- Describe invariant behavior and observable failure surfaces for permission decisions.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/models.py`, `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/workflow/models.py`, `server/vueda/workflow/permissions.py`, `server/vueda/workflow/views.py`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/core/test_permissions.py`, `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Non-goals

- Not a walkthrough for assigning permissions or creating groups.
- Not a catalog of every app/model-specific permission codename.
- Not a client-side UI permission strategy.

## Key Concepts

### CRUDL codenames are the base contract

- What it is: VUEDA model defaults expose `create/read/update/delete/list`, and DRF defaults enforce `ObjectPermissions`.
- Why it exists: permission codenames stay aligned with CRUDL semantics instead of Django `add/change/view`.
- Where it lives: `server/vueda/core/models.py`, `server/vueda/core/default_settings.py`, `server/vueda/core/patch_django.py`, `server/vueda/core/permissions.py`, `server/tests/unit/core/test_permissions.py`.

### HTTP/action mapping is action-sensitive for `GET`

- What it is: `ObjectPermissions` maps `GET` to `list_*` for list actions and `read_*` otherwise; write methods map to `create/update/delete`.
- Why it exists: list access and detail-read access are separate contracts.
- Where it lives: `server/vueda/core/permissions.py`, `server/tests/unit/core/test_permissions.py`.

### Object decisions are layered, with strict precedence rules

- What it is: `VUEDAPermissionsMixin.has_perm` evaluates four layers in order: (1) baseline model permission, (2) workflow state grant/deny, (3) row-level `check_instance` (skipped when state denies), (4) workflow+row `check_instance_workflow` (runs last, can override anything including state deny).
- Why it exists: state and row policy can narrow or widen access per object without changing global model permissions. The workflow+row layer allows logic that needs both state and row context (e.g. "assigned reviewer can approve in Pending Review, except their own submission").
- Where it lives: `server/vueda/user/mixins.py`, `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.

### Queryset filtering is the list/bulk-delete row-level boundary

- What it is: `check_queryset` may return `Q`, `False`, `True`, or `None`; list and bulk-delete paths apply that result before serialization or deletion. When the model is under workflow, `check_queryset_workflow` runs after `check_queryset` with the queryset pre-annotated with `_state_denied` / `_state_granted`.
- Why it exists: row-level visibility and bulk mutation eligibility are enforced at queryset scope.
- Where it lives: `server/vueda/core/permissions.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/models.py`, `server/tests/unit/core/test_row_level_permissions.py`.

### Workflow is an overlay, not a replacement

- What it is: workflow-aware permission paths can bypass model-level denial when state-permission rows exist, then defer final decision to object/state/transition checks.
- Why it exists: state permissions are row-level by design and cannot be fully decided at model scope.
- Where it lives: `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`, `server/vueda/workflow/views.py`, `server/vueda/workflow/models.py`.

### Transition execution has independent workflow and transition gates

- What it is: transition execution requires workflow-level permission, transition-level permission(s), and source-state validity.
- Why it exists: transition authorization is distinct from CRUDL update/read permission.
- Where it lives: `server/vueda/workflow/models.py`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.permissions}`
- `{@api py:class:vueda.core.permissions.ObjectPermissions}`
- `{@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}`
- `{@api py:class:vueda.core.permissions.BaseRowLevelPermissions}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow}`
- `{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow}`
- `{@api py:module:vueda.user.mixins}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
- `{@api py:module:vueda.core.viewsets}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.apply_object_permission_filter}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy}`
- `{@api py:module:vueda.workflow.permissions}`
- `{@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions}`
- `{@api py:function:vueda.workflow.permissions.WorkflowObjectPermissions.has_permission}`
- `{@api py:module:vueda.workflow.views}`
- `{@api py:function:vueda.workflow.views.HasWorkflowViewMixin.check_permissions}`
- `{@api py:module:vueda.workflow.models}`
- `{@api py:class:vueda.workflow.models.HasWorkflowModelMixin}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_state_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.available_transitions}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_workflow_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_transition_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}`
- `{@api py:module:vueda.workflow.viewsets}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.check_permissions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- `{@api py:module:vueda.core.patch_django}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`

## Contracts and Invariants

- Base model permissions include `create/read/update/delete/list`, and DRF default permission class is `ObjectPermissions`. Anchors: `server/vueda/core/models.py`, `server/vueda/core/default_settings.py`.
- `ObjectPermissions` maps `GET` to `list_*` for `view.action == "list"` and `read_*` otherwise; write methods map to CRUDL codenames. Anchors: `server/vueda/core/permissions.py`, `server/tests/unit/core/test_permissions.py`.
- Workflow-aware model-level checks can short-circuit to allow when state permissions are present, deferring final decision to object-level checks. Anchors: `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`, `server/vueda/workflow/views.py`.
- Object-level decision order is: (1) baseline model permission, (2) workflow state grant/deny, (3) row-level `check_instance` (skipped when state denies), (4) workflow+row `check_instance_workflow` (only for workflow models, can override any prior decision). Anchors: `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- State-rule conflict resolution is deterministic: deny wins over grant when multiple matching group rules exist. Anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- Row-level queryset hook semantics are fixed: `Q` filters rows, `False` returns empty queryset, `True`/`None` do not filter. Anchors: `server/vueda/core/permissions.py`, `server/vueda/core/viewsets/__init__.py`.
- List and bulk-delete paths enforce queryset-level row filtering; bulk-delete also enforces object-level checks per instance before deletion. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/unit/core/test_viewsets.py`.
- Bulk-delete treats filtered-out IDs as missing and returns validation errors keyed by PK (`Object with pk=... does not exist.`). Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_row_level_permissions.py`, `server/tests/unit/core/test_viewsets.py`.
- Workflow transition surface requires `vueda_workflow.read_workflow` at viewset level before workflow/object transition endpoints execute. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- `available_transitions` / `available_transitions_for` raise `PermissionDenied` when workflow permissions are absent for a non-`None` user; transition-level permissions are then checked per transition. Anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- `check_transition_permission` denies transitions that have no transition-permission rows (`False` path), so transition metadata must include explicit transition permission entries. Anchors: `server/vueda/workflow/models.py`.
- `apply_transition` returns `(target_state, history_id|None)` and raises `PermissionDenied` or `InvalidTransitionError` for unauthorized/unavailable transitions. Anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.

## Footguns

- Row-level denial on object reads can manifest as `404` rather than `403` on retrieve, while list still returns `200` with filtered/empty results. Anchors: `server/tests/unit/core/test_row_level_permissions.py`.
- Bulk delete with mixed row-level eligibility fails as `400` with missing-PK errors and performs no deletion for requested rows. Anchors: `server/tests/unit/core/test_row_level_permissions.py`, `server/vueda/core/viewsets/__init__.py`.
- Removing workflow-permission rows can break transition discovery (`available_transitions*`) with `PermissionDenied` even when transition definitions exist. Anchors: `server/tests/unit/workflow/test_model_mixin.py`, `server/vueda/workflow/models.py`.
- Workflow endpoints can return `403` before object-specific checks if `vueda_workflow.read_workflow` is missing. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- Transition execution can fail with `400` and `This object cannot be updated right now. Please try again.` when row locks cannot be acquired. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- State-permission presence changes model-level gate behavior (defer-to-object path), which can alter failure shape between model-scope checks and object-scope checks across endpoints. Anchors: `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`, `server/vueda/workflow/views.py`.

## Suggested Outline

- `## Permission Authority Layers`
- `## CRUDL Codename and Action Mapping`
- `## Object-Level Decision Precedence`
- `## Queryset-Level Row Filtering Boundary`
- `## Workflow Overlay and Transition Gates`
- `## Failure Surface Taxonomy`
