---
title: Control Action Availability in the UI
type: how-to
audience: implementor
status: draft
---

# Control Action Availability in the UI

This guide covers the end-to-end implementation of {@term Available Actions}; ensuring that {@term Route Admission}, rendered controls, and server authorization stay aligned across model-info metadata, object-level availability, client config, and workflow transition layers. The goal is to make the client show exactly the actions a user can perform, without either hiding valid actions or exposing actions that will fail.

The guide assumes familiarity with the action contract. If you have not read [Action Contract and Availability](../core-concepts/action-contract-and-availability), start there; it explains the three-layer contract boundary that this guide operates within. For the underlying permission model, see [Permission Model](../core-concepts/permission-model). For the boundary between server authorization and client UI semantics, see [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics).

## Goal and Preconditions

The objective is an implementation where:

- `model_actions` in {@term Model Info} accurately reflects the requesting user's permitted actions, including both built-in {@term CRUDL} and extra actions.
- Object-level `available_actions` reflects per-object permission outcomes, including workflow state and row-level constraints.
- Client route guards admit only actions that appear in the server-advertised action set (with optional config and workflow overlays).
- Rendered UI controls are the intersection of config-filtered actions and object-level availability.
- Unavailable or unknown actions produce consistent user-facing feedback (toasts, redirects, fallback views) rather than silent failures.

Before you begin, ensure the following are in place:

The model has a canonical registration with a viewset. Models registered with only a serializer (no viewset) will have empty `model_actions`, and no action-related routing or UI controls will function. See [Canonical Registration and Discovery](../core-concepts/canonical-registration-and-discovery) for registration requirements.

The viewset uses `ObjectPermissions` (or `WorkflowObjectPermissions` for workflow-enabled models) as its permission class. The permission class drives both model-scope action filtering in model-info and object-scope availability computation.

## Server Action Metadata Contract

Model-info action metadata is the foundation of client-side action visibility. The `model_actions` list emitted by the model-info endpoint determines which {@term Action} entries the client's route guards and UI controls recognize.

For built-in CRUDL actions, no explicit wiring is required beyond the viewset permission class. Model-info generation evaluates each built-in action candidate (`list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`) against the requesting user's permissions using `check_object_permissions` with no object. Actions the user lacks permission for are omitted.

For extra actions declared on the viewset, visibility is controlled through `get_allowed_extra_actions`. Override this method on the viewset to include or exclude extra actions based on request context:

```python
class MyViewSet(VuedaViewSet):
    def get_allowed_extra_actions(self, request, instance=None):
        allowed = ["approve", "export"]
        if instance and instance.status == "locked":
            allowed.remove("approve")
        return allowed
```

When called without `instance` (model-scope), the return value filters which extra actions appear in `model_actions`. When called with `instance` (object-scope), the return value determines which extra actions appear in that object's `available_actions`. Implement both code paths in the same method; the `instance` argument distinguishes the scope.

If `get_allowed_extra_actions` is not implemented, all extra actions declared on the viewset are included in model-info metadata, subject to standard permission checks.

## Object-Level Availability Contract

Object-level `available_actions` is computed during serialization and reflects what the requesting user can do with a specific instance. Include the `AvailableActionsField` in your serializer when `detail` views need per-object action filtering.

The field evaluates standard actions (retrieve, update, partial_update, destroy) through object-permission checks. `create` is excluded for concrete instances; it is a model-scope action. Allowed extra actions from `get_allowed_extra_actions(request, instance=instance)` are appended to the result.

The object-level result can be narrower than model-scope metadata. This {@term Model-Scope vs Object-Scope Availability} divergence is by design. A user may have model-level `update` permission (so `update` appears in `model_actions`), but a specific object may deny `update` due to workflow state or row-level constraints (so `update` is absent from that object's `available_actions`). The model-scope metadata is a superset that enables route admission, while the object-scope metadata drives per-object UI controls.

## Route Guard Wiring

Client route guards use model-info metadata to decide whether a route is admissible through {@term Route Admission}. The standard wiring is through `makeCRUDRoutes`, which registers both detail and `list` action routes with the `requireModelInfo` navigation guard.

The guard performs three steps:

1. **Fetch model-info** for the target route's model. If the fetch fails, the error is cached and reused for subsequent navigations to the same model key until the store is reset or the page is reloaded.

2. **Assemble the action set** from model-info `model_actions` names, optionally filtered by `config.routeActions`, then extended with workflow permitted transition codes.

3. **Normalize and check** the route's action name. The alias `read` is normalized to `retrieve` before the membership check. If the normalized name is not in the assembled set, the guard denies the route with a toast and redirect.

The `routeActions` config key restricts the action set to only the named actions. If set, actions not listed in `routeActions` are excluded from route admission, even if the server advertises them. Use this when a product surface should expose only a subset of the model's available actions.

## Component-Level Action Filtering

Rendered action controls in views use two additional filtering layers beyond route admission.

**Group-based filtering** uses `useFilteredActions` to read the model config's `config.actions` setting. When defined, only actions listed in `config.actions` are included in the rendered set. This filtering applies across all views for the model and is typically used for role-based or product-based UX customization.

**Object-level intersection** applies in detail-style views. `DetailedView` intersects the config-filtered action set with the object's `available_actions` before rendering action buttons. An action must pass both filters to appear as a rendered control. This means the same model can show different action buttons for different objects; reflecting per-object permission outcomes without any client-side permission logic.

`list` views use config-filtered actions for toolbar controls (like bulk delete) but do not intersect with per-object availability, since `list` views do not have a single target object.

Workflow transition controls are sourced from the workflow transition store and rendered independently from CRUDL action buttons. Do not attempt to infer transition availability from `model_actions` or `available_actions`; transitions have their own data flow and are fetched through dedicated workflow endpoints.

## Workflow Transition Handling

Workflow transitions extend the action namespace with transition-specific routes. The route guard includes permitted transition codes in the action set, enabling navigation to transition-specific views alongside standard CRUDL routes.

The guard evaluates transitions by their `code` property. Every transition object must have a valid string `code`; objects without one cause the guard to throw an explicit error rather than silently skipping the transition. If you see `requireModelInfo: workflow transition is missing a string code`, check the workflow configuration for transitions with missing or non-string codes.

`ViewActionRouter` resolves transition routes by matching the route's action parameter against transition codes. When a match is found, the route renders `ViewWorkflowTransition`. When no match is found (and the action is also not a standard CRUDL action), the route renders `ViewActionNotFound`.

## Verification Checklist

After wiring action availability, verify the following behaviors:

- A user without `create` permission does not see `create` in model-info `model_actions`.
- A user with `update` model permission but facing a workflow state denial does not see `update` in a specific object's `available_actions`, even though `update` appears in `model_actions`.
- Navigating to an action route that is not in `model_actions` produces a toast and redirect.
- Setting `config.routeActions` to `["retrieve", "list"]` excludes `update` and `destroy` routes from admission.
- `detail` view action buttons for different objects of the same model reflect the respective objects' `available_actions`.
- Workflow transition routes resolve to the transition view when the transition code is in the permitted set.

## Troubleshooting

**Action appears in model-info but not in `detail` view controls.** The action is filtered at object scope. Check the object's `available_actions` in the API response. If the action is absent, the object's permission state (workflow, row-level) is denying it. This is expected behavior, not a bug.

**"Action Not Found" toast for a valid server action.** Check `config.routeActions`. If set, the action must be listed there to pass the route guard.

**Route guard fails repeatedly for a model after a transient error.** The model-info store caches fetch errors. The cached error will be reused for all navigation attempts to that model until the store is reset or the page is reloaded.

**Workflow transition route renders "Action Not Found."** Verify the transition has a valid string `code`. Check that the transition is in the permitted transitions set for the requesting user. Check that `ViewActionRouter` can resolve the transition code to `ViewWorkflowTransition`.

## Relevant Implementation Surface

- Python:
    - {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}
    - {@api py:class:vueda.core.serializers.fields.AvailableActionsField}
    - {@api py:function:vueda.core.serializers.fields.AvailableActionsField.get_value}
    - {@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}
    - {@api py:class:vueda.core.permissions.ObjectPermissions}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}
- JavaScript:
    - {@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}
    - {@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}
    - {@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}
    - {@api js:function:@arrai-innovations/vueda.use/useFilteredActions.useFilteredActions}
    - {@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}
- Vue.js Components:
    - {@api vue:component:ViewActionRouter}
