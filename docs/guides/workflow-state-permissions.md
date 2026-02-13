---
title: Add Workflow State and Transition Permissions
type: how-to
audience: implementor
status: briefing
---

# Add Workflow State and Transition Permissions

## Intent and Scope

- Configure workflow-aware permission overlays so allowed transitions and object actions depend on both baseline permissions and current workflow state.
- Scope includes workflow-level gate permissions, transition permissions, and state grant/deny rules for group membership.
- Keep this as implementation briefing (contracts + verification targets), not final tutorial prose.
- Source anchors: `server/vueda/workflow/models.py`, `server/vueda/workflow/viewsets.py`, `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Non-goals

- Not a full workflow modeling guide (states/sources/migration lifecycle design).
- Not a replacement for baseline CRUDL or row-level permission design.
- Not a guarantee that generated API pages fully describe runtime edge cases; source code/tests are authoritative.

## Key Tasks

### 1. Confirm workflow attachment and initial state behavior for the model

- Ensure target model uses `HasWorkflowModelMixin` so object-state rows are auto-created on save.
- Verify created objects receive workflow initial state before permission scenarios are tested.
- Source anchors: `server/vueda/workflow/models.py`, `server/tests/unit/workflow/test_model_mixin.py`.

### 2. Configure workflow-level and transition-level permission gates

- Configure `WorkflowPermission` entries for workflow access checks and `TransitionPermission` entries per transition.
- Validate transition execution only succeeds when transition permission requirements pass.
- Validate transitions with no `TransitionPermission` are treated as not executable.
- Source anchors: `server/vueda/workflow/models.py`, `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_model_mixin.py`.

### 3. Configure state grant/deny rules per group

- Use `StatePermission` (`grant_or_deny`) for per-state group overrides.
- Validate overlay through `VUEDAPermissionsMixin.has_perm(..., obj=instance)` paths, since state checks are object-context checks.
- Note: state deny blocks `check_instance` from running. For row-level logic that must override state deny (e.g. "assigned reviewer can still access denied-state items"), implement `check_instance_workflow` on the model's `RowLevelPermissions`.
- Source anchors: `server/vueda/workflow/models.py`, `server/vueda/user/mixins.py`, `server/vueda/core/permissions.py`.

### 4. Verify transition and state endpoints against permission matrix

- Validate `permitted_transitions` (model-level) and `object-transitions` (object-level) results for allowed vs denied users.
- Validate `object-state` returns 403 when object read permission is missing.
- Source anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_model_mixin.py`.

### 5. Verify transition execution behavior at state boundaries

- Validate disallowed transitions raise validation errors and preserve current state.
- Validate dry-run transition execution returns predicted next state/transitions without persisting.
- Validate non-dry-run execution acquires row lock (`select_for_update`) and commits state change.
- Source anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:class:vueda.workflow.models.HasWorkflowModelMixin}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_workflow_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_state_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_transition_permission}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.available_transitions}`
- `{@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}`
- `{@api py:class:vueda.workflow.models.StatePermission}`
- `{@api py:class:vueda.workflow.models.TransitionPermission}`
- `{@api py:class:vueda.workflow.models.WorkflowPermission}`
- `{@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions}`
- `{@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_transitions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- REST:
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`
- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}`

## Contracts and Invariants

- `StatePermission.grant_or_deny` is tri-state at evaluation time: `None` means no matching override; `True` grants; `False` explicitly denies.
- Object-level checks can still deny when baseline permission passes, because `grant_or_deny=False` is enforced in `VUEDAPermissionsMixin.has_perm`.
- Transition execution requires both workflow gate checks and transition-specific permission checks; failed checks return validation errors in API endpoints.
- `execute-transition` dry-run mode skips lock/write and still returns projected `new_state`/`new_transitions`.
- Current observed behavior: if workflow has no `WorkflowPermission` rows, `available_transitions(user=...)` raises permission denied.
- `available_transitions_for(..., user=...)` requires workflow permissions: authorized users receive transitions for object states in scope; unauthorized users receive permission denied.
- Source anchors: `server/vueda/workflow/models.py`, `server/vueda/workflow/viewsets.py`, `server/vueda/user/mixins.py`, `server/tests/unit/workflow/test_model_mixin.py`, `server/tests/unit/workflow/test_viewsets.py`.

## Footguns

- State-permission lookup uses `.first()` across matching groups; overlapping group rules for the same permission can produce order-sensitive outcomes.
- Any presence of state-permission rows causes workflow-level permission short-circuit paths (`check_workflow_permission`/`has_permission`) that can bypass model-level workflow gate checks.
- Transition definitions without `TransitionPermission` are effectively non-executable (`check_transition_permission` returns `False` when permission list is empty).
- Endpoint-level permission behavior for some workflow actions is more code-defined than test-covered (especially detailed state-permission combinations on `object_state`/`permitted_transitions`).
- Source anchors: `server/vueda/workflow/models.py`, `server/vueda/workflow/permissions.py`, `server/vueda/workflow/viewsets.py`, `server/vueda/core/permissions.py`, `server/tests/unit/workflow/test_model_mixin.py`.

## Suggested Outline

```md
## Goal and Preconditions

## Configure Workflow and Transition Permission Rows

## Configure State Grant/Deny Rows

## Verify Permission Matrix by State and Group

## Validate Transition Execution (Dry-Run and Commit)

## Endpoint Checks and Expected Errors

## Known Limitations and Gaps
```
