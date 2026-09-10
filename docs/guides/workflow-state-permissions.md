---
title: Add Workflow State and Transition Permissions
type: how-to
audience: integrator
status: draft
---

# Add Workflow State and Transition Permissions

This guide covers configuring workflow-aware {@term Workflow Overlay} rules so that allowed {@term Transition} actions and object actions depend on both baseline permissions and the object's current workflow state. It walks through workflow-level gate permissions, transition permissions, state grant/deny rules, and verification of the resulting behaviour matrix.

The guide assumes familiarity with VUEDA's workflow permission model. If you have not read [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay), start there; it explains the overlay boundary, state permission evaluation, model-scope bypass, and transition gate mechanics. For the broader permission model, see [Permission Model](../core-concepts/permission-model). For transition UX and redirect behaviour on the client, see [Design Transition UX and Redirects](../guides/transition-ux-and-redirects).

## Goal and Preconditions

The objective is a workflow-enabled model where:

- State permissions grant or deny specific {@term CRUDL} codenames based on the object's current workflow state and the user's groups.
- Transition execution is gated by workflow-level and transition-level permission entries.
- The combination of baseline permissions and workflow overlays produces a consistent, testable behaviour matrix.
- Client route admission and action rendering reflect the permission outcomes.

Before you begin:

The target model must use `HasWorkflowModelMixin` so that workflow state rows are auto-created on save. Verify that newly created objects receive the workflow's initial state before testing permission scenarios.

The model must have an active workflow with defined states and transitions. State permissions, transition permissions, and workflow permissions are stored as database rows; they must be created through migrations, fixtures, or programmatic setup.

The API stack must use `ObjectPermissions` (or `WorkflowObjectPermissions`) as the permission class. The user model must include `VUEDAPermissionsMixin`.

## Configure Workflow and Transition Permission Rows

### Workflow-level permissions

Create `WorkflowPermission` entries that associate the workflow's content type with specific groups. These entries gate access to the workflow's transition machinery as a whole:

```python
WorkflowPermission.objects.create(
    workflow=workflow,
    content_type=content_type,
    group=editors_group,
)
```

Without at least one `WorkflowPermission` entry for a user's groups, `available_transitions(user=...)` raises `PermissionDenied`. The user will see no transitions, and all workflow endpoints will return `403`.

### Transition-level permissions

Create `TransitionPermission` entries for each transition that should be executable:

```python
TransitionPermission.objects.create(
    transition=approve_transition,
    group=managers_group,
)
```

Transitions without any `TransitionPermission` rows are treated as not executable. They will not appear in `permitted_transitions`, and `check_transition_permission` will return `False`. This is not a misconfiguration; it is the expected behaviour for transitions that should not be user-executable (e.g., system-only transitions triggered by code).

## Configure State Grant/Deny Rows

Create `StatePermission` entries to override baseline model permissions for specific states:

```python
# Grant `update` permission to editors when the object is in the "review" state
StatePermission.objects.create(
    state=review_state,
    permission=update_permission,
    content_type=content_type,
    group=editors_group,
    grant_or_deny=True,
)

# Deny `update` permission to all editors when the object is in the "published" state
StatePermission.objects.create(
    state=published_state,
    permission=update_permission,
    content_type=content_type,
    group=editors_group,
    grant_or_deny=False,
)
```

The evaluation rules:

- **Grant (`grant_or_deny=True`)**: overrides a baseline `False` for this state/group/codename combination. The user gains object-level access that they would not otherwise have.
- **Deny (`grant_or_deny=False`)**: overrides a baseline `True`. The user loses the object-level access they would otherwise have. Deny wins over grant when a user's groups produce conflicting rules for the same state and codename.
- **No matching rows**: the baseline model permission decision stands.

State permissions are evaluated through `VUEDAPermissionsMixin.has_perm(..., obj=instance)`. They are object-scope checks; they have no effect without a concrete object and its current state.

## Verify Permission Matrix by State and Group

Build a test matrix that crosses user groups, workflow states, and CRUDL actions. For each combination, verify the expected outcome:

| User group | Object state | `update` baseline | State overlay  | Expected `has_perm` |
| ---------- | ------------ | ----------------- | -------------- | ------------------- |
| Editors    | draft        | `True`            | none (no rule) | `True`              |
| Editors    | review       | `False`           | grant          | `True`              |
| Editors    | published    | `True`            | deny           | `False`             |
| Viewers    | review       | `False`           | none (no rule) | `False`             |

Verify the matrix through `has_perm` calls with concrete objects:

```python
assert user.has_perm("myapp.update_widget", obj=draft_widget) is True
assert user.has_perm("myapp.update_widget", obj=review_widget) is True
assert user.has_perm("myapp.update_widget", obj=published_widget) is False
```

Pay attention to the model-scope bypass behaviour: when state-permission grant rows are present, model-scope checks may return `True` for users who lack the baseline model permission, deferring the final decision to object scope. This means the HTTP status code for denied requests may shift from `403` to `404`.

## Validate Transition Execution (Dry-Run and Commit)

### Permitted transitions

Verify `permitted_transitions` results for each user:

- Users with both workflow-level and transition-level permissions see the expected transitions.
- Users with workflow-level permission but no matching transition permissions see an empty list.
- Users without workflow-level permission see `403`.

### Object transitions

Verify `object-transitions` for specific objects:

- The transition list reflects the object's current state (only transitions valid from that state).
- Transitions the user lacks permission for are excluded.

### Execution

Verify transition execution for both dry-run and commit modes:

**Dry-run** (`Dry-Run: true` header): skips row lock and state persistence. Returns the projected `new_state` and `new_transitions` without modifying the object. Use dry-run for preview or validation flows.

**Commit** (no `Dry-Run` header): acquires a row lock via `select_for_update(skip_locked=True)`, executes the transition, and persists the state change. Returns `new_state` and `new_transitions` reflecting the committed change.

Verify failure cases:

- Executing a transition from an invalid source state returns `400` (not `403`). The error comes from `InvalidTransitionError` converted to a validation response.
- Executing a transition without proper permissions returns `400` with a permission error message.
- Lock acquisition failure returns `400` with `"This object cannot be updated right now. Please try again."`.

Verify the warning-confirmation gate: when a model overrides `get_transition_warnings`, executing a transition with unacknowledged warnings returns `409` with `{"confirmation_required": true, "digest": ..., "warnings": {...}}` before anything is written, and resubmitting with the `Acknowledge-Warnings` header set to that `digest` lets the transition proceed. The gate runs before the row lock, for both the single-object and bulk (`object_ids`) request forms; a bulk request gates once with one digest over all instances (`{object_id: {field: [messages]}}`), and none of them transition until the batch is acknowledged. The `object_id` keys are always the resolved instance's primary key cast to `str`, regardless of whether the request's `object_ids` were numbers or strings — `execute_transition` normalizes to that instance-derived value rather than echoing the request's own type back, so the same batch always gates on the same digest no matter how its ids were typed.

## Endpoint Checks and Expected Errors

**`object-state`** returns `403` when the user lacks object `read_*` permission for the target instance. The permission codename uses `PERMISSION_NAMES_MAPPING["read"]` when configured.

**`permitted_transitions`** returns an empty list when the workflow does not exist for the given `app_label/model` pair, without requiring `vueda_workflow.read_workflow`; it still requires the user to hold the target model's `read` permission. When a workflow exists for the pair, it returns `403` when the user lacks `vueda_workflow.read_workflow` or workflow-level permissions.

**`execute_transition`** returns `400` for all execution failures (permission denied, invalid transition, lock failure), in validation-style format rather than HTTP authorization-style. It returns `409` instead when `get_transition_warnings` reports unacknowledged warnings; that check runs after the `400` checks and before any write, so blocking failures still take precedence over the warning gate.

Workflow definitions, transition discovery, and transition execution require `vueda_workflow.read_workflow` at the viewset permission-check phase. This check runs before any transition-specific logic. Test that a user without this permission receives a `403` from those endpoints.

Current object state and workflow state history are the exception in the other direction: they report the target object's own data, so they require that object's `read` permission and not `read_workflow`. Test that a user who can read an object, and holds no workflow permission at all, still reads its state and state history.

`permitted_transitions` skips the gate in one further case: when the target model has no configured workflow, the viewset falls through to the target model's own `read` permission check, so the endpoint can report "no transitions" to any user who can read the model. That case does not apply once a workflow is configured for the model; `read_workflow` is required from that point on.

## Known Limitations and Gaps

**State-permission lookup uses `.first()` across matching groups.** When multiple groups produce overlapping rules for the same permission and state, the query returns the first match. The deny-wins rule operates across the matched set, but the evaluation order within the query is database-dependent for equal-priority rows.

**A matching state grant defers a model-scope denial.** A state rule defers `ObjectPermissions.has_permission` or `WorkflowObjectPermissions.has_permission` only when it grants, matches the caller's groups, the requested codename, the model content type, and the workflow, and only for an action that reaches a per-object decision. Deferring can change which status code a denied request receives (`403` becomes `404` on a model viewset). Adding an unrelated state rule changes no decision.

**Transitions without `TransitionPermission` rows are invisible.** They do not appear in `permitted_transitions` and cannot be executed through the API. If a transition should be system-only, this is correct behaviour. If it should be user-executable, add `TransitionPermission` entries.

**Some workflow permission behavior is more code-defined than test-covered.** Detailed state-permission combinations on `object_state` and `permitted_transitions` endpoints may have behavior paths that are not fully exercised in the current test suite. Verify complex scenarios in your project's tests.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.workflow.models.HasWorkflowModelMixin}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_workflow_permission}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_state_permission}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_transition_permission}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.available_transitions}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_transition}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_checked_transition}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.get_transition_warnings}
    - {@api py:function:vueda.core.exceptions.gate_warnings}
    - {@api py:class:vueda.workflow.models.StatePermission}
    - {@api py:class:vueda.workflow.models.TransitionPermission}
    - {@api py:class:vueda.workflow.models.WorkflowPermission}
    - {@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions}
    - {@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}
    - {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_transitions}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
- REST:
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}
    - {@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeWorkflow}
