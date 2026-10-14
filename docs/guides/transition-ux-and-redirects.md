---
title: Design Transition UX and Redirects
type: how-to
audience: integrator
status: draft
---

# Design Transition UX and Redirects

This guide shows how an action form runs a workflow {@term Transition}, and how to choose the view that an action form opens after a submit or cancel. The redirect rules apply to every view built on {@api vue:component:ModelActionForm}, including destroy, extra actions, and transitions.

## How a Transition Route Reaches Its Form

A transition route carries the transition's `code` as its action segment. {@term Route Admission} accepts it when the code is one of the user's {@term Permitted Transitions}. {@api vue:component:ViewActionRouter} then renders a project view named for the code. When no such view exists, it renders {@api vue:component:ViewExecuteTransition}. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) gives the full resolution order.

`ViewExecuteTransition` wraps `ModelActionForm` and replaces its [`run-action`]{@api vue:component:ActionForm:prop:runAction} with a call to {@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition}. A transition therefore gets the same pre-flight, submit, cancel, and redirect behavior as any other action form. [Action & Workflow Views](../reference/components/action-workflow.md#viewexecutetransition) describes what its confirmation shows.

The view uses the transition's `name` for the page title and the confirmation prompt. Routing and execution use only the `code`, which the view passes to `executeTransition` unchanged. When you change a transition's `code`, also rename any project view named for it (`ViewAction<Code>.vue` or `ViewAction<App><Model><Code>.vue`) and update any route links that your application builds with it.

## What an Action Form Does on Pre-Flight, Submit, and Cancel

{@api vue:component:ActionForm} runs all three paths. `ModelActionForm` connects it to the model through {@api js:function:@arrai-innovations/vueda/use/useModelAction#useModelAction}.

- **Pre-flight.** Once the form has at least one primary key, it runs the action as a {@term Dry Run}, with the `Dry-Run: true` header. Validation errors from the pre-flight appear on the form before the user confirms. The pre-flight shows no toast, does not redirect, and does not open the confirmation dialog for a `409` warnings response. It runs again when the app, model, action, or primary keys change. Set [`enableDryRun`]{@api vue:component:ModelActionForm:prop:enableDryRun} to `false` to turn it off.
- **Submit.** The form runs the action. On success it shows a toast and calls `redirectTo("success")`. With [`onSubmissionSuccessHandler`]{@api vue:component:ActionForm:prop:onSubmissionSuccessHandler} set, it calls that handler instead of both. On a `400`, the errors appear on the form. A `409` opens {@api vue:component:FormConfirmDialog}, and confirming retries with the warnings acknowledged ({@term Warning Confirmation}). Other failures show an error toast.
- **Cancel.** The form calls `redirectTo("cancel")` without running the action.

After a success redirect navigates away, the form disables its buttons and ignores submits until the view unmounts. The action cannot run twice while the next view loads. A [`redirectTo`]{@api vue:component:ActionForm:prop:redirectTo} that finishes without navigating must resolve `false`, and the form then accepts input again. In a [slot override]{@api vue:component:ActionForm:slots}, bind `disabled` from the `confirm-button` and `cancel-button` slots, or `confirmDisabled` and `cancelDisabled` from `action-bar`. These flags control the buttons only. The server still decides whether the action runs.

`ModelActionForm` passes `ActionForm` a [`dryRunTarget`]{@api vue:component:ActionForm:prop:dryRunTarget} that changes with the target. If you build a view on `ActionForm` directly and its target can change after mount, pass `dryRunTarget` along with [`readyToDryRun`]{@api vue:component:ActionForm:prop:readyToDryRun}. Without it, the pre-flight runs once for the life of the form.

For a transition, `ViewExecuteTransition` forwards the dry-run flag and the acknowledged warnings digest to `executeTransition`. The store rejects a `400` with {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError} and a `409` with {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}, so both reach the form the same way as for other actions. A dry-run result stays out of the store's cached object state and transitions.

## Redirect Precedence and Route Targets

The form's [`redirectTo`]{@api js:property:@arrai-innovations/vueda/use/useModelAction#ModelActionContext.redirectTo} picks the destination in this order, for both success and cancel:

1. **`returnPath` query value.** When the current route has a `returnPath` query value, the form navigates to it. Add `returnPath` to a link into an action view to bring the user back to where they started.
2. **`actionRedirects` entry.** Otherwise the form reads [`actionRedirects`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actionRedirects} from the model's {@term Model Config}: the entry for the route action, else `default`. A successful `destroy` with no `destroy` entry goes to the list view, because the deleted record has no detail view. Cancelling a destroy uses `default`.
3. **Function entries.** An entry can be a function. The form calls it with `{ bulk, result }` and uses its return value. `result` is `"success"` or `"cancel"`, and `bulk` is `true` when the action targeted more than one record.
4. **Route.** When the action targeted more than one record, or the value is `"list"`, the form opens the model's list view. Otherwise it opens the detail route for the first targeted record, with the value as the route action.

The built `default` is `"update"` when {@term Model Info} lists `update`, else `"read"` when it lists `retrieve`, else `"list"` when it lists `list`. A model whose model info lists none of the three has no built default, so set `default` yourself.

To change the redirects for a model:

1. Call [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} with `actionRedirects` in the generic config, the second argument. Action forms read the generic layer only.
2. Key each entry by the route action: an extra action's name, a transition code, or `destroy`. Add `default` for the actions that you do not list. Your entries merge with the built ones key by key.
3. Use route segments as values, such as `"list"`, `"read"`, `"update"`, or another action's name. The detail view's segment is `read`. The {@term Canonical Action Name} `retrieve` opens the generic action view.

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

const modelConfigStore = storeModelConfig();

modelConfigStore.setConfig(
    { app: "myapp", model: "order" },
    {
        actionRedirects: {
            approve: "list",
            reopen: ({ result }) => (result === "success" ? "update" : "read"),
            default: "read",
        },
    },
);
```

### Navigate by the New State in a Project View

A project view that calls `executeTransition` itself can route by the object's new state. Pass the [`router`]{@api js:param:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition:router} and a [`stateToRoute`]{@api js:param:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition:stateToRoute} map from state code to route. After a single-object run that is not a dry run, the store navigates to the route for the new state's code, when the map has one. `ViewExecuteTransition` passes no map, so it uses `actionRedirects`. In a view built on `ActionForm`, the success redirect also navigates, so use one or the other.

## Send the Transition Request

`executeTransition` sends `PATCH` to the workflow execute-transition endpoint:

- For one object, it calls [`execute-transition/{object_id}/`]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/} with `{ "transition_code": "approve" }`.
- For an array of primary keys, it calls [`execute-transition/`]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/} with `{ "transition_code": "approve", "object_ids": [...] }`. `object_ids` must be a list.

Generic bulk model actions send their keys as `pks`. Client code that calls the endpoint without the store must send `object_ids`.

{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition} answers a missing `transition_code` with `400`. For a single object, it then runs these checks in order:

1. It checks that the user can read the object.
2. It checks the workflow and transition permissions, and that the transition leaves the object's current state. An unknown `transition_code` also fails here, with `400`.
3. It gates the write on the model's [`get_transition_warnings`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.get_transition_warnings}, returning `409` until the user acknowledges the warnings. [Require Confirmation Before a Write](./require-write-confirmation.md#warn-on-a-workflow-transition) shows how to add warnings.
4. Outside a dry run, it locks the row with {@api ext:django:django.db.models.query.QuerySet.select_for_update} and `skip_locked=True`. When another request holds the lock, it returns `400` with "This object cannot be updated right now. Please try again."
5. It repeats the object and transition checks on the locked row, writes the new state, and calls [`on_transition`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.on_transition}.

The response holds `new_state` and `new_transitions`, the transitions the user can take from the new state. A bulk request checks every object and gates warnings once for the whole batch before it writes any. Its warnings and its response are keyed by object id. [Permissions](../reference/permissions.md#status-codes) lists the status code for each refusal.

A dry run skips the row lock. The server writes the transition, and the request's rollback discards it. `on_transition` receives `dry_run=True`, so skip external side effects there during a dry run.

## Verification Checklist

- Opening a permitted transition route renders `ViewExecuteTransition` or your project view.
- Opening the view shows pre-flight validation errors before you confirm, and nothing changes on the server.
- Submitting sends the transition `code` as `transition_code` and redirects according to `actionRedirects`.
- A `returnPath` query value overrides the configured redirect.
- Cancelling redirects without running the transition.
- A multi-record transition sends `object_ids` and lands on the list view.
- A transition with unacknowledged warnings opens the confirmation dialog. Confirming completes the transition, and cancelling leaves it unapplied.
- A transition attempted while another request holds the row lock shows the lock message.
