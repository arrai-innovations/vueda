---
title: Workflow as a Permission Overlay
type: explanation
audience: implementor
status: briefing
---

# Workflow as a Permission Overlay

## Intent and Scope

- Define how workflow state permissions and transition permissions compose with baseline CRUDL permissions.
- Define which concerns are server-authoritative (enforcement) vs client-semantic (route/action admission and UI visibility).
- Define the observable failure surfaces when workflow overlays are configured, missing, or inconsistent.
- Source anchors: `server/vueda/user/mixins.py`, `server/vueda/core/permissions.py`, `server/vueda/workflow/models.py`, `server/vueda/workflow/permissions.py`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`, `client/lib/stores/storeWorkflow.js`, `client/lib/router/guards.js`, `client/tests/unit/lib/stores/storeWorkflow.spec.js`, `client/tests/unit/lib/router/guards.spec.js`.

## Non-goals

- Not a how-to for creating workflows, states, transitions, or permission/group data.
- Not a UI composition description for workflow buttons, forms, or view routing.
- Not a complete permission model reference for non-workflow concerns (CRUDL mapping, row filters, and action metadata are covered elsewhere).

## Key Concepts

### Baseline permissions are still the primary authorization namespace

- What it is: workflow permissions operate on the same permission codename strings (`app_label.codename`) used by baseline Django/DRF permission checks.
- Why it exists: workflow overlay rules target the same CRUDL permission decisions without creating a parallel authorization namespace.
- Where it lives: `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`, `server/vueda/workflow/models.py`.

### State permissions are row-level grant/deny overlays

- What it is: `StatePermission` entries can grant additional permissions or deny baseline permissions based on the object’s current workflow state and the user’s groups; deny wins over grant when multiple rules match.
- Why it exists: state-dependent access cannot be decided purely at model scope.
- Where it lives: `server/vueda/workflow/models.py`, `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`.

### DRF model-scope permission checks may bypass to preserve object-scope truth

- What it is: DRF permission classes can return `True` at model scope when workflow state permissions exist, deferring the effective decision to later object-scope checks.
- Why it exists: state permissions are evaluated against a concrete object (and its state), but DRF runs a model-scope check before an object exists in some endpoints.
- Where it lives: `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`.

### Transition permissions are separate from state permissions and CRUDL permissions

- What it is: transition execution is gated by workflow-level permission(s) and transition-level permission(s), and transitions without explicit transition-permission rows are treated as not permitted.
- Why it exists: “update the object” and “perform transition X” are distinct authorization concerns with different failure shapes.
- Where it lives: `server/vueda/workflow/models.py`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`.

### Client treats permitted transition codes as route action identifiers

- What it is: client route admission expands the action set with workflow transition `code` values fetched per model; missing or non-string codes are treated as hard errors.
- Why it exists: workflow transition views participate in the same route/action namespace as CRUDL and extra actions.
- Where it lives: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`, `client/lib/stores/storeWorkflow.js`.

## Relevant Implementation Surface

- `{@api py:class:vueda.core.permissions.ObjectPermissions}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
- `{@api py:class:vueda.workflow.models.HasWorkflowModelMixin}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_state_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_workflow_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_transition_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`

## Contracts and Invariants

- `VUEDAPermissionsMixin.has_perm` computes a baseline Django permission decision without passing `obj`, then overlays workflow state grant/deny when `obj` has workflow, then applies row-level `check_instance` when present; later layers override earlier layers. Anchors: `server/vueda/user/mixins.py`.
- State overlay precedence is deterministic: for a given object state + permission codename + content type + group set, matching `grant_or_deny=False` denies even if a grant rule also matches. Anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- State overlay can grant object-scope permission even when baseline model permission is false, and can deny object-scope permission even when baseline is true. Anchors: `server/tests/unit/workflow/test_model_mixin.py`, `server/vueda/user/mixins.py`.
- `ObjectPermissions.has_permission` may return `True` at model scope for workflow models when a matching _grant_ `StatePermission` exists for one of the user’s groups and the required CRUDL codename, deferring the effective decision to object-scope checks. Anchors: `server/vueda/core/permissions.py`.
- `WorkflowObjectPermissions.has_permission` may return `True` at model scope for workflow models when any `StatePermission` rows exist for the workflow, deferring effective decisions to later checks. Anchors: `server/vueda/workflow/permissions.py`.
- Workflow endpoints require `vueda_workflow.read_workflow` at viewset permission-check time, before per-object checks run. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- `object_state` returns `403` when the user lacks object `read_*` permission for the target instance; permission codename uses `PERMISSION_NAMES_MAPPING["read"]` when present. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- `permitted_transitions` returns an empty list when the workflow does not exist for the given `app_label/model`. Anchors: `server/vueda/workflow/viewsets.py`.
- `permitted_transitions` filters by workflow-level permission rows (if present) and transition-level permission rows; transitions without transition-permission rows are excluded. Anchors: `server/vueda/workflow/viewsets.py`, `server/vueda/workflow/models.py`.
- `available_transitions(user=...)` raises `PermissionDenied` when called with a non-`None` user and there are no `WorkflowPermission` rows for the workflow content type. Anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- `apply_transition` enforces workflow-level permission, transition-level permission, and source-state availability; failures surface as `PermissionDenied` or `InvalidTransitionError`. Anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- `execute_transition` converts `PermissionDenied` / `InvalidTransitionError` into a validation-style `400` response, and returns `new_state` plus `new_transitions` on success. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- `execute_transition` acquires a row lock via `select_for_update(skip_locked=True)` unless `Dry-Run` is set; lock acquisition failure surfaces as `400` with `This object cannot be updated right now. Please try again.` Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`.
- Client caches both successful transition lists and transition-fetch errors per `app.model`; while an error is cached for a key, subsequent calls reject without attempting a new fetch. Anchors: `client/lib/stores/storeWorkflow.js`, `client/tests/unit/lib/stores/storeWorkflow.spec.js`.
- Client route admission treats workflow transition objects as `{code,name}` and throws when `code` is missing or not a string; this error bypasses the guard’s redirect/toast path. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.

## Footguns

- State permissions can change API authorization outcomes without changing baseline group/model permission codenames. Symptoms: `user.has_perm(..., obj=instance)` differs from `user.has_perm(...)` for the same permission string. Anchors: `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`.
- Model-scope bypass depends on configured state permission data and does not incorporate the object’s current state. Symptoms: model-scope admission succeeds, but object access is later denied (or vice versa) once object state is evaluated. Anchors: `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`, `server/vueda/user/mixins.py`.
- Transition discovery and transition execution have distinct permission gates. Symptoms: `permitted_transitions` returns `403` for missing workflow permissions, while `execute_transition` returns `400` validation errors for permission/availability failures surfaced from `apply_transition`. Anchors: `server/vueda/workflow/viewsets.py`, `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_viewsets.py`.
- Transitions without transition-permission rows are silently absent from `permitted_transitions` and are denied by `check_transition_permission`. Symptoms: expected transition code never appears in client-admitted actions; direct execution fails as validation error. Anchors: `server/vueda/workflow/viewsets.py`, `server/vueda/workflow/models.py`.
- Workflow transition admission is model-scoped. Symptoms: route is admitted for a transition code but the target object cannot execute it from its current state; execution fails with a `400` validation error derived from `InvalidTransitionError`. Anchors: `server/vueda/workflow/viewsets.py`, `server/vueda/workflow/models.py`, `client/lib/router/guards.js`.
- `requireModelInfo` throws (rather than redirecting) when any returned transition object lacks a string `code`. Symptoms: navigation rejects with a thrown error and no `Action Not Found` toast. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Transition fetch error caching can make failures sticky. Symptoms: repeated store calls reject the same cached error without additional fetch attempts. Anchors: `client/lib/stores/storeWorkflow.js`, `client/tests/unit/lib/stores/storeWorkflow.spec.js`.

## Suggested Outline

- `## Overlay Boundary and Authority`
- `## State Permission Data Model`
- `## Model-Scope Bypass and Object-Scope Truth`
- `## Transition Permission Gates`
- `## Client Action Namespace Overlay`
- `## Failure Surfaces and Symptom Signatures`
