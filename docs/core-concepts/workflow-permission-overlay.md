---
title: Workflow as a Permission Overlay
type: explanation
audience: integrator
status: draft
---

# Workflow as a Permission Overlay

Workflow permissions in VUEDA are not a separate authorization system; they are an overlay on the same {@term CRUDL} permission codenames used by baseline model permissions. State permissions can grant or deny specific codenames for specific workflow states and user groups, modifying the outcome of standard permission checks without changing the underlying permission assignments. Transition permissions are a separate gate that controls who can execute specific workflow transitions, operating alongside but independently from CRUDL authorization.

This page explains how state permissions, transition permissions, and DRF model-scope deferral compose with baseline CRUDL permissions, and how the client treats transition codes as part of the route {@term Action Namespace}. For the full permission evaluation chain (layers 1-4), see [Permission Model](./permission-model). For the practical steps to configure workflow permissions, see [Add Workflow State and Transition Permissions](../guides/workflow-state-permissions). For row-level filtering mechanics that interact with workflow state, see [Row-Level Permission Filtering](./row-level-permission-filtering). For transition UX and redirect behaviour, see [Design Transition UX and Redirects](../guides/transition-ux-and-redirects).

## Overlay Boundary and Authority

Workflow permissions target the same `app_label.codename` permission strings that baseline Django permission checks use. A `StatePermission` entry says "for objects in state X, grant (or deny) permission Y for members of group Z." The result modifies the outcome of `has_perm` for that specific codename, user, and object; the same `has_perm` that baseline model permissions flow through. There is no parallel authorization namespace.

This design means that adding workflow state permissions does not require changing group assignments, model-level permission grants, or permission codename definitions. The overlay operates on the existing codename space. It also means that the overlay can produce surprising results: a user who has baseline model permission for a codename can be denied at object scope because a state-permission deny rule exists for their group and the object's current state. Conversely, a user who lacks baseline model permission can be granted access to specific objects because a state-permission grant rule exists.

The authority boundary is: state permissions are server-authoritative for enforcement, while the client uses the advertised transition and action sets for route admission and UI visibility. The client does not evaluate state permissions directly; it receives the results of the server-side evaluation via model-info, available-actions, and transition endpoints.

## State Permission Data Model

`StatePermission` entries are stored in workflow tables and scoped to a content type, workflow state, permission (codename), and group. Each entry carries a `grant_or_deny` flag: `True` grants the permission for that state/group/codename combination, `False` denies it.

When {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm} evaluates an object with a workflow, `check_state_permission` queries matching `StatePermission` rows for the object's current state, the user's groups, and the required permission codename. The evaluation produces a tri-state result:

- **`True`** (grant): at least one matching grant rule exists and no matching deny rule exists. This overrides a baseline `False`; the user gains access to this object even though they lack the model-level permission.
- **`False`** (deny): at least one matching deny rule exists. Deny wins over Grant when both match. This overrides a baseline `True`; the user loses access to this object even though they have the model-level permission.
- **`None`** (no opinion): no matching state-permission rules exist for this combination. The baseline model permission decision stands.

The deny-wins precedence is deterministic: for a given object state, permission codename, and group set, if any matching row has `grant_or_deny=False`, the result is `False` regardless of how many grant rows also match. This applies when a user belongs to multiple groups with conflicting rules for the same state and codename.

## Model-Scope Deferral and Later Decisions

DRF evaluates permissions in two phases: a model-scope check (`has_permission`) before the object is fetched, and an object-scope check (`has_object_permission`) after the object is available. State permissions depend on a concrete object's current state, which is not available at model scope. This creates a problem: a user who lacks baseline model permissions would be denied access at the model scope before the object is fetched, even though a state-permission grant would have allowed access to specific objects.

{@api py:class:vueda.core.permissions.ObjectPermissions} first resolves the view action and runs the baseline model permission check. When that check denies access, `ObjectPermissions` considers deferral only if a later framework path is guaranteed to make a state-aware decision. A state grant can defer the model-scope denial only when it matches the workflow, model content type, required permission codename, and one of the user's groups. Unrelated grants, state denies, and grants for another model do not change model-scope admission.

Standard retrieve, update, partial-update, and destroy actions defer to DRF's object permission check. A custom action may declare itself in the viewset's `workflow_object_permission_actions` collection only when the action always performs an object permission check. A detail route alone is not sufficient because DRF does not require every detail action to fetch its object through `get_object()`.

List actions use a separate later decision. `ListRowLevelViewSetMixin` applies the workflow overlay to the queryset even when the model does not define `RowLevelPermissions`. A user with baseline `list_*` permission receives rows with no matching state rule or a matching grant, while matching state denies are removed. A user admitted by a state `list_*` grant receives only rows with a matching grant. Deny wins when the user's groups supply conflicting rules. Filtering runs before pagination, serialization, and column totals.

Create requests do not defer. A new object has no current workflow state, so state `create_*` rules do not override the baseline model permission. Collection or custom actions without a guaranteed later state-aware decision also retain the baseline model-scope result.

This deferral belongs to `ObjectPermissions` alone. `HasWorkflowViewMixin` does not suppress permission failures from authentication, composite permission expressions, or other application permission classes. A matching state grant can make `ObjectPermissions` pass while another permission class still denies the complete request.

`WorkflowObjectPermissions`, used by the separate workflow endpoint surface, retains its broader model-scope bypass when any state-permission row exists for the target workflow. Workflow endpoints add their own workflow, object, and transition checks; this behavior is separate from model viewsets using `ObjectPermissions`.

Deferral can change the failure shape. Without a matching state grant, a user missing a model permission sees `403` at model scope. When a matching grant defers an object action, denial for the eventual object's state commonly becomes `404`, hiding the object's existence. A state-granted list returns `200` with only effectively authorized rows and may be empty when no current rows match the grant.

## Transition Permission Gates

Transition execution requires passing three distinct gates, each checked independently:

**Workflow-level permission.** At least one `WorkflowPermission` entry must exist for the user's groups and the workflow's content type. This is a coarse gate: it controls access to the workflow's transition machinery as a whole, not to individual transitions. When no `WorkflowPermission` rows exist for the workflow, `available_transitions(user=...)` raises `PermissionDenied`; transitions are inaccessible, not just empty.

**Transition-level permission.** At least one `TransitionPermission` entry must exist for the user's groups and the specific transition. Transitions without any `TransitionPermission` rows are treated as not permitted; there is no default-allow path. This means a transition that exists in the workflow graph but has no permission rows will never appear in `permitted_transitions` and will be denied by `check_transition_permission`.

**Source-state validity.** The object's current workflow state must be a valid source for the transition. This is enforced by the workflow engine's `TransitionSource` rules. Even if permission gates pass, a transition that is not valid from the current state will fail.

Permission check failures at the transition level surface differently depending on the endpoint. {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions} returns `403` when the user lacks workflow-level permission. `execute_transition` converts `PermissionDenied` and `InvalidTransitionError` into `400` validation-style responses rather than HTTP-level authorization rejections. Lock acquisition failures (when `select_for_update(skip_locked=True)` cannot acquire the row lock) also surface as `400`.

The viewset-level gate for all workflow endpoints is `vueda_workflow.read_workflow`. This check runs during `check_permissions`, before any object-specific or transition-specific logic. A user who lacks this permission sees `403` on all workflow endpoints, object state, permitted transitions, and execute transition, regardless of their other permissions.

`permitted_transitions` skips this gate for an `app_label/model` pair with no configured workflow: it falls through to the target model's own `read` permission check instead, and returns `200` with an empty transition list once that check passes. The gate applies as described above as soon as a workflow is configured for the model.

## Client {@term Action Namespace} Overlay

On the client, workflow transitions extend the action namespace that drives route admission and view resolution. The {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo} route guard assembles the admissible action set from the model-info `model_actions` and workflow permitted transition codes. Transition codes are treated as action identifiers alongside standard CRUDL action names.

This means a transition with code `approve` is admissible in the same way that `update` or `destroy` is admissible; the route guard checks membership in the combined set without distinguishing between CRUDL actions and transition codes. `ViewActionRouter` resolves transition codes to `ViewWorkflowTransition`, while standard CRUDL codes resolve to their built-in view components.

The guard requires that every transition object have a valid `code` property. The server enforces `code` as a required, non-blank field, so this invariant holds in normal operation. The guard throws (`requireModelInfo: workflow transition is missing a string code`) as a defensive check against data integrity violations rather than silently treating the transition as unavailable. If this error surfaces, the cause is a data integrity violation or a server-side bug, not an expected runtime condition. The error bypasses the guard's normal redirect/toast path and surfaces as an unhandled exception in the navigation flow.

Transition discovery is model-scoped: `permitted_transitions` returns all transitions the user can execute anywhere in the workflow, regardless of individual objects' current states. This means a route may be permitted for a transition code, but the target object may not be able to execute that transition from its current state. The mismatch surfaces at execution time as a `400` validation error, not at route admission time.

The workflow store caches both successful transition lists and fetch errors per `app.model`. While an error is cached for a given model key, subsequent calls to the store reject with the cached error without attempting a new fetch. Transient network failures can make transition unavailability sticky until the store is reset or the page is reloaded.

## Failure Surfaces and Symptom Signatures

**State permissions change `has_perm` outcomes without changing group assignments.** Symptom: `user.has_perm("myapp.update_widget", obj=instance)` returns a different result than `user.has_perm("myapp.update_widget")` for the same user and codename. This is by design; state overlay is object-scoped.

**A matching state grant defers, then object scope denies.** Symptom: an object request that would return `403` at model scope instead returns `404`. A grant matching the caller, codename, content type, and workflow deferred the request, but the eventual object's state did not grant access.

**Transition is absent from `permitted_transitions` despite existing in the workflow.** Symptom: expected transition never appears for any user. Cause: the transition has no `TransitionPermission` rows. Transitions without permission rows are excluded, not default-allowed.

**`permitted_transitions` returns `403`.** Symptom: no transitions are available for the model. Cause: for a model with a configured workflow, the user lacks `vueda_workflow.read_workflow`, or no `WorkflowPermission` rows exist for the workflow's content type and the user's groups. For a model with no configured workflow, the cause is instead the user lacking `read` permission for that model; a readable model with no workflow returns `200` with an empty list, not `403`.

**Transition execution returns `400` validation error.** Multiple possible causes: the transition is not valid from the object's current state (`InvalidTransitionError`), the user lacks transition-level permission (`PermissionDenied`), or the row lock cannot be acquired. Check the error message to distinguish between these cases.

**Route permits a transition but execution fails.** Symptom: user navigates to a transition view, submits, and gets a validation error. Cause: transition route admission is model-scoped (based on `permitted_transitions`), but execution is object-scoped (based on current state). The object may not be in a valid source state for the transition.

**Transition fetch errors are sticky.** Symptom: workflow actions are unavailable and repeated navigation attempts fail with the same error. Cause: the workflow store caches fetch errors. Reset the store or reload the page to retry.

## Relevant Implementation Surface

- {@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}
- {@api py:class:vueda.workflow.models.HasWorkflowModelMixin}
- {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_state_permission}
- {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_workflow_permission}
- {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.check_transition_permission}
- {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_transitions}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
- {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}
- {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}
- {@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}
- {@api js:module:@arrai-innovations/vueda/stores/storeWorkflow}
