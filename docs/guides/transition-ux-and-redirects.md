---
title: Design Transition UX and Redirects
type: how-to
audience: integrator
status: draft
---

# Design Transition UX and Redirects

This guide covers the client-side UX flow for action execution and workflow transitions: how action forms handle submit, dry-run, and cancel; how redirect targets are resolved after successful actions; and how the workflow execute-transition endpoint integrates with client routing. The guide focuses on implemented behaviour and the redirect precedence chain, not on workflow state modelling or UI styling.

The guide assumes familiarity with VUEDA's action contract and workflow model. If you have not read [Action Contract and Availability](../core-concepts/action-contract-and-availability), start there. For the server-side workflow permission model, see [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay). For controlling which actions are visible in the UI, see [Control Action Availability in the UI](./control-action-availability).

## Goal and Preconditions

The objective is a transition UX where:

- Action routes are properly gated so users cannot navigate to actions they lack permission for.
- Action form submit, dry-run, and cancel produce consistent toast and redirect behaviour.
- Post-action redirects follow a defined precedence: return path, configured redirects, then computed defaults.
- Workflow transition execution respects server-side locking and validation semantics.
- Transition identification uses `code` consistently across route guards, action router, and form submission.

Before you begin:

Action routing is configured via {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} with the {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo} guard. See [Control Action Availability in the UI](./control-action-availability) for the route guard wiring.

The model's workflow (if applicable) is configured with states, transitions, and permissions. Transitions must have valid string `code` properties; the route guard and action router both use `code` as the routing identifier.

## Route Guard and Action Router Wiring

Action and transition routes pass through `requireModelInfo` before rendering. The guard fetches model-info, assembles the action set (model-info actions, optional `routeActions` filter, workflow permitted transitions), normalizes the route's action name (`read` -> `retrieve`), and checks membership.

For workflow-enabled models, the guard includes permitted transition codes in the action set. This means transition routes are admissible alongside standard {@term CRUDL} routes; the guard does not distinguish between them at the admission level.

{@api vue:component:ViewActionRouter} resolves the permitted action to a view component. Standard CRUDL actions resolve to their built-in views. Transition codes resolve to `ViewWorkflowTransition`. When the action cannot be resolved, it passes the guard but has no corresponding view component; `ViewActionNotFound` is rendered.

The guard requires transition objects to have a valid string `code`. The server enforces this as a required, non-blank field, so the guard's check should not trigger in normal operation. If this error surfaces, it indicates a data integrity issue rather than a workflow misconfiguration.

## Action Form Submit, Dry-Run, and Cancel Flow

{@api vue:component:ActionForm} standardizes the three execution paths for action views.

**Submit** executes the action against the server. On successful non-dry-run submit, `ActionForm` calls `redirectTo("success")` when no custom success handler is provided. The success path emits a toast and redirects to the resolved target. On failure, error handling displays validation errors or server error messages without redirecting.

**Dry-run** executes the action with the `Dry-Run: true` header. Use the `readyToDryRun` mechanism for validation and prefetch behaviour: when the form signals readiness, the action runs in dry-run mode to surface validation errors before the user commits. Dry-run responses should not trigger redirect or success toast behaviour. A dry run is a validation path, not a commit path.

**Cancel** calls `redirectTo("cancel")`, which resolves the cancel target through the same redirect precedence chain as success. The cancel path does not execute the action; it navigates away from the action view.

## Redirect Precedence and Route Targets

{@api vue:component:ModelActionForm} resolves redirect targets through a defined precedence chain. The same chain applies to both success and cancel redirects, evaluated in order:

1. **`route.query.returnPath`**: if the current route has a `returnPath` query parameter, it takes absolute precedence. This enables "return to where you came from" navigation for actions reached via deep links or cross-model navigation.

2. **`config.actionRedirects[action]`**: if the model config defines a redirect for the specific action name, that redirect is used. This enables per-action redirect customization.

3. **`config.actionRedirects.default`**: if the model config defines a default redirect, it applies to all actions without specific overrides.

4. **Computed default**: when no configured redirect applies, the form computes a target. Bulk actions (or explicit `"list"` redirect values) route to the model's `list` view. Non-bulk actions route to the `detail` view with the selected object's PK.

Configure action redirects through model config when the default behaviour does not match the product's navigation flow:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "order" },
    {
        actionRedirects: {
            approve: "list",
            default: "retrieve",
        },
    },
);
```

## Workflow Execute-Transition Contract (Detail and Bulk)

The server's workflow execute-transition endpoint ({@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}) supports both detail and bulk execution, with distinct contracts for each.

**Detail execution** targets a single object. The request includes the `transition_code` that identifies the transition to execute. The server acquires a row lock using `select_for_update(skip_locked=True)`; if the lock cannot be acquired (another process holds it), the response is a `400` with the message `"This object cannot be updated right now. Please try again."`. On successful lock acquisition, the transition runs through `apply_transition`, which validates source state, permissions, and transition-permission entries.

**Dry-run execution** skips locking and state persistence. Use dry-run mode when the UX needs to preview or validate a transition without committing to it. The server evaluates transition validity and returns the result without modifying the object's state.

**Bulk execution** sends `{ object_ids: [...] }` in the request body. Non-`list` payloads return `400`.

**Warning confirmation** gates the write behind the same `409`/`Acknowledge-Warnings` contract used by create, update, destroy, activate, and deactivate. When a model overrides `get_transition_warnings`, an unacknowledged warning set responds `409` with `{"confirmation_required": true, "digest": ..., "warnings": {...}}` before anything is written; resubmitting with the digest in the `Acknowledge-Warnings` header lets the transition proceed, and a changed warning set yields a new digest and re-prompts. `storeWorkflow.executeTransition` maps this `409` to `ConfirmationRequiredError` and takes an `acknowledgeWarnings` argument for the confirmed retry. This gate applies to both detail and bulk execution; a bulk request's `warnings` is `{object_id: {field: [messages]}}` rather than the detail request's plain `{field: [messages]}`, and the whole batch gates once with one digest before any instance transitions.

::: warning
The bulk key name is endpoint-specific by design: generic model action execution uses `{ pks: [...] }`, while workflow execute-transition uses `{ object_ids: [...] }`. There is no automatic key translation between these APIs; client code must use the correct key for each endpoint.
:::

**Transition identification** uses `code` throughout. `ViewWorkflowTransition` submits the selected transition's `code` as `transition_code` in the request payload. The transition's `name` is display-only; it appears in UI labels and confirmation text but is not used for execution or routing. This distinction is important: a transition's display name can change without affecting routing or execution, but a `code` change requires updating route guard expectations and any client-side transition references.

## Verification Checklist

After implementing transition UX, verify the following:

- Navigating to an action route for a permitted action renders the correct view.
- Navigating to an action route for an unpermitted action produces a toast and redirect.
- Submitting an action form (non-dry-run) redirects to the expected target per the precedence chain.
- Cancelling an action form redirects without executing the action.
- Dry-run execution surfaces validation errors without redirecting or toasting success.
- `returnPath` query parameter overrides configured redirects.
- Workflow transition submit sends the correct `transition_code` and redirects on success.
- Bulk transition submit sends `{ object_ids: [...] }`, not `{ pks: [...] }`.
- Locked-row transition attempt surfaces a user-friendly error message.
- A transition with unacknowledged warnings surfaces the confirmation dialog; confirming retries with the digest acknowledged and completes the transition, cancelling leaves it unapplied.

## Known Limitations

**`ViewWorkflowTransition` requires a valid transition code on submit.** If the selected transition is invalid or missing at submission time, the component throws rather than displaying a validation error. Ensure the transition selection UI only offers valid options.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.workflow.viewsets}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_transitions}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.available_transitions}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.apply_transition}
    - {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.get_transition_warnings}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeWorkflow}
    - {@api js:function:@arrai-innovations/vueda/use/useWorkflowTransitions#useWorkflowTransitions}
    - {@api js:function:@arrai-innovations/vueda/utils/actionMap#getActionName}
    - {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}
    - {@api js:function:@arrai-innovations/vueda/use/useConfirmationController#useConfirmationController}
- Vue.js Components:
    - {@api vue:component:ViewWorkflowTransition}
    - {@api vue:component:FormConfirmDialog}
