---
title: Workflow as a Permission Overlay
type: explanation
audience: integrator
status: draft
---

# Workflow as a Permission Overlay

On a {@term Workflow-Enabled Model}, an object's current workflow state can change a permission decision. {@term State Permission} rules grant or deny the model's ordinary {@term CRUD} codenames per state. {@term Workflow Permission} and {@term Transition Permission} rows gate who may execute a {@term Transition}. This page describes how VUEDA evaluates state rules, which requests defer to them, the transition gates, and the gates each workflow endpoint applies. [Add Workflow State and Transition Permissions](../guides/workflow-state-permissions) gives the configuration steps.

## Overlay Boundary and Authority

A state rule names a permission from the same `auth_permission` rows that group permissions use, such as `myapp.update_widget`. [`VUEDAPermissionsMixin.has_perm`]{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm} applies the rule when a check passes an object. The {@term Workflow Overlay} therefore adds no separate permission namespace. State rules form layer 2 of the {@term Permission Layers}, and [Permission Model](./permission-model#permission-authority-layers) describes the layer order.

Adding a rule changes object decisions without changing group assignments, model grants, or codenames. It works in both directions. A user whose {@term Baseline Permission} includes a codename can lose it on objects in one state. A user without that baseline permission can gain it on objects in another state.

State rules are server enforcement. The client receives their results in action lists and transition lists, and [Authorization vs UI Semantics](./authorization-vs-ui-semantics) describes how it uses them.

## State Permission Data Model

A [`StatePermission`]{@api py:class:vueda.workflow.models.StatePermission} row names one workflow state, one permission, one group, and a `grant_or_deny` flag: `True` grants, `False` denies. Each combination of state, permission, and group has at most one row.

For an object check, [`check_state_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_state_permission} collects the rows that match all of these:

- the object's current state;
- a permission of the object's model with the requested codename;
- one of the user's groups.

The result has three values:

- **`True` (grant):** at least one matching row grants, and none denies. It replaces a baseline denial for this object.
- **`False` (deny):** at least one matching row denies. It replaces a baseline grant for this object.
- **`None` (no rule):** no row matches. The baseline decision stands.

Deny wins. When a user's groups carry both a grant and a deny for the same state and codename, the result is `False`, however many grants match. An object with no {@term Object State} has no current state, so no rule matches it.

## Model-Scope Deferral and Later Decisions

State rules need an object, and DRF's {@term Model-Scope Check} runs before any object is fetched. A user whom only a state rule admits would fail that check. {@term Model-Scope Deferral} holds the denial open until a later check can read the object's state.

{@api py:class:vueda.core.permissions.ObjectPermissions} runs the baseline model check first. When that check denies, [`has_permission`]{@api py:function:vueda.core.permissions.ObjectPermissions.has_permission} defers only when both of these hold:

- The action is guaranteed to reach a later state-aware decision.
- {@api py:function:vueda.core.permissions.has_matching_state_grant} finds a grant row in the model's workflow for the requested codename, the model's content type, and one of the user's groups.

A state deny, a grant for another codename or model, or a grant to another group admits nothing.

These actions reach a later decision:

- **Object actions.** Retrieve, update, partial update, and destroy ([`object_permission_actions`]{@api py:property:vueda.core.permissions.ObjectPermissions.object_permission_actions}) reach DRF's object check, where state rules apply.
- **Custom actions that declare it.** A custom action belongs in the viewset's [`workflow_object_permission_actions`]{@api py:property:vueda.core.viewsets.VuedaViewSet.workflow_object_permission_actions} only when it always fetches its object through `get_object()`. A detail route alone does not guarantee that. [`history_list`]{@api py:function:vueda.core.viewsets.VuedaViewSet.history_list} is in the set by default, and `VuedaViewSet` adds it to any set a subclass declares.
- **List.** [`ListRowLevelViewSetMixin`]{@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin} filters rows by state, even when the model defines no `RowLevelPermissions`.

[`filter_rows_for_user`]{@api py:function:vueda.core.permissions.filter_rows_for_user} evaluates the same rules for each row. A user with baseline `list` permission keeps every row without a matching deny. A user admitted by a state grant keeps only rows with a matching grant and no matching deny. [Row-Level Permission Filtering](./row-level-permission-filtering) describes where this pass runs among the other row filters.

Create never defers, because a new object has no state yet. A collection action outside these sets also keeps the model-scope result.

Deferral changes only the decision of `ObjectPermissions`. Authentication and every other permission class on the viewset still decide, so a matching state grant cannot admit a request that another class refuses.

The workflow endpoints defer by the same rule. {@api py:class:vueda.core.permissions.DynamicObjectPermissions} and its subclass {@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions} defer only for a request that resolves one object and checks it. Both call `has_matching_state_grant`, so model viewsets and workflow endpoints reach the same answer.

After deferral, the object check or the row filter decides. A model viewset answers an unreadable object as if it were missing. A workflow endpoint already names the object in its URL, so it reports the denial as a refusal. The [Permissions reference](../reference/permissions#status-codes) lists the status code for each case.

## Transition Permission Gates

Executing a transition passes three gates, in this order.

**Workflow gate.** The workflow has at least one [`WorkflowPermission`]{@api py:class:vueda.workflow.models.WorkflowPermission} row, and the user holds every permission those rows name. A row names a permission, not a group. Groups receive the permission through ordinary Django group permissions. [`check_workflow_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_workflow_permission} makes this check.

**Transition gate.** The transition has at least one [`TransitionPermission`]{@api py:class:vueda.workflow.models.TransitionPermission} row, and the user holds every permission those rows name. [`check_transition_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_transition_permission} makes this check.

**Source state.** [`allow_transition`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.allow_transition} passes when the object's current state is one of the transition's source states. A model can override it to add conditions. A string it returns becomes the error message.

A workflow or transition with no permission rows denies every user. Server code can still apply such a transition as a {@term Fast Transition}, which skips the permission gates.

On object endpoints and during execution, both permission gates pass the object to [`has_perms`]{@api ext:django:django.contrib.auth.models.PermissionsMixin.has_perms}. State rules and row-level hooks therefore apply to them. When the transition permission belongs to the workflow's model, a state rule on its codename allows or blocks the transition per state.

Execution checks the object's read permission and all three gates again after taking the object's row lock. A state change between the two checks therefore cannot bypass them. A bulk request that fails for any object applies no transition.

## Which Gate Each Workflow Endpoint Applies

`vueda_workflow.read_workflow` admits a caller to workflow definitions and transition operations. It grants no access to object data. The target model's own `read_*` permission controls an object's current state and workflow state history. Every object-specific transition operation also requires it.

| Endpoint                                                                                                                                                                                                                                   | Target-model gate                      | Global workflow gate           | Workflow and transition gates                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| [Workflow list]{@api rest:endpoint:GET:/vueda.workflow/workflows/} and [detail]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/}                                                                                     | None                                   | `vueda_workflow.read_workflow` | None                                                                        |
| [Object state]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}                                                                                                                             | Object-level `read_*`                  | None                           | None                                                                        |
| [Workflow state history]{@api rest:endpoint:GET:/workflow-state-history/{app_label}/{model}/{object_id}/}                                                                                                                                  | Object-level `read_*`                  | None                           | None                                                                        |
| [Permitted transitions]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}, model without `class Vueda.Workflow`                                                                                 | Model-level `read_*`                   | None                           | None; returns `[]`                                                          |
| Permitted transitions, workflow-enabled model                                                                                                                                                                                              | Model-level `read_*`                   | `vueda_workflow.read_workflow` | Both permission gates at model scope                                        |
| [Object transitions]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}                                                                                                                 | Object-level `read_*`                  | `vueda_workflow.read_workflow` | Both permission gates against the object, and the current state as a source |
| Execute transition, [single]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/} or [bulk]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/} | Object-level `read_*` for every object | `vueda_workflow.read_workflow` | All three gates against every object                                        |

Every object-level `read_*` check applies state rules, and a matching state grant can defer a model-level `read_*` denial. `PATCH` on these endpoints requires `read_*`. Executing a transition therefore needs no `update_*` permission. The workflow and transition gates authorize the state change, and `update_*` authorizes edits to ordinary fields.

[`permitted_transitions`]{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions} runs its checks in this order:

1. The user needs model-level `read_*` on the target model. A state grant cannot defer this denial, because the request has no object.
2. A model that does not enable `class Vueda.Workflow` returns `200` with `[]`. An enabled model without a workflow definition raises {@api py:class:vueda.workflow.exceptions.WorkflowNotConfiguredError}.
3. The user needs `vueda_workflow.read_workflow`.
4. The workflow gate runs at model scope.
5. The response lists each transition that has permission rows whose permissions the user holds at model scope. Each entry carries `code` and `name`, sorted by name.

These checks pass no object, so state rules never count, and the list ignores every object's current state. {@term Route Admission} adds these codes to the client's route allowlist, which [Routing and View Resolution Model](./routing-and-view-resolution-model#metadata-and-allowlist-inputs) describes. A route can therefore open for a transition that the target object cannot take from its current state. Execution then refuses it.

An object's {@term Valid Transitions} and the `new_transitions` in an execute response check both permission gates against the object and filter by source state. They are empty when the user fails the workflow gate for that object; object transitions answers `403` in that case. None of these lists runs an `allow_transition` override, and execution does.

## Failure Surfaces and Symptom Signatures

**`has_perm` with an object disagrees with `has_perm` without one.** `user.has_perm("myapp.update_widget", obj=widget)` and `user.has_perm("myapp.update_widget")` return different results for one user. A state rule matched the object's current state. Only a check with an object applies state rules.

**A transition never appears for any user.** The transition has no `TransitionPermission` rows.

**`permitted_transitions` returns `403`.** The user lacks `read_*` on the target model or `vueda_workflow.read_workflow`. Otherwise the workflow gate failed: the workflow has no `WorkflowPermission` rows, or the user lacks a permission they name. The client keeps this `403` until its caches clear, which [Reactive Data Flow](./reactive-data-flow#when-caches-clear) describes.

**The workflow list returns `200`, and an object's state or history returns `403`.** `vueda_workflow.read_workflow` admits the caller to definitions only. Object state and workflow state history follow the object's own `read_*` permission.

**A transition route opens, and execution returns `400`.** [`execute_transition`]{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition} reports a failed gate as a validation error. The message names the cause: a missing workflow or transition permission for this object, a current state that is not a source, or an `allow_transition` refusal. A missing or unknown `transition_code`, and a row that another request has locked, also return `400`. The [Permissions reference](../reference/permissions#status-codes) lists every status code that execution returns.
