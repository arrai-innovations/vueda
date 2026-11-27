---
title: Design Transition UX and Redirects
type: how-to
audience: integrator
status: draft
---

# Design Transition UX and Redirects

This guide shows how an action form runs a workflow {@term Transition}, and how to choose the view that an action form opens after a submit or cancel. The redirect rules apply to every view built on {@api vue:component:ModelActionForm}, including destroy, extra actions, and transitions.

## How a Transition Route Reaches Its Form

A transition route carries the transition's `code` as its action segment. {@term Route Admission} accepts it when the code is one of the user's {@term Permitted Transitions}. {@api vue:component:ViewActionRouter} then renders a project view named for the code. When no such view exists, it renders the project's `src/views/ViewExecuteTransition.vue`. When that file does not exist either, it renders VUEDA's {@api vue:component:ViewExecuteTransition}. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) gives the full resolution order.

`ViewExecuteTransition` wraps `ModelActionForm` and passes its [`run-action`]{@api vue:component:ModelActionForm:prop:runAction} as a call to {@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition}. A transition therefore gets the same pre-flight, submit, cancel, and redirect behavior as any other action form. [Action & Workflow Views](../reference/components/action-workflow.md#viewexecutetransition) describes what its confirmation shows.

The view uses the transition's `name` for the page title and the confirmation prompt. Routing and execution use only the `code`, which the view passes to `executeTransition` unchanged. When you change a transition's `code`, also rename any project view named for it (`ViewAction<Code>.vue` or `ViewAction<App><Model><Code>.vue`) and update any route links that your application builds with it.

## What an Action Form Does on Pre-Flight, Submit, and Cancel

{@api vue:component:ActionForm} runs all three paths. `ModelActionForm` connects it to the model through {@api js:function:@arrai-innovations/vueda/use/useModelAction#useModelAction}.

- **Pre-flight.** Once the form has at least one primary key, it runs the action as a {@term Dry Run}, with the `Dry-Run: true` header. Validation errors from the pre-flight appear on the form before the user confirms. The pre-flight shows no toast, does not redirect, and does not open the confirmation dialog for a `409` warnings response. It runs again when the app, model, action, or primary keys change. Set [`enableDryRun`]{@api vue:component:ModelActionForm:prop:enableDryRun} to `false` to turn it off.
- **Submit.** The form runs the action. On success it shows a toast and calls `redirectTo("success")`. With [`onSubmissionSuccessHandler`]{@api vue:component:ActionForm:prop:onSubmissionSuccessHandler} set, it calls that handler instead of both. On a `400`, the errors appear on the form. A `409` opens {@api vue:component:FormConfirmDialog}, and confirming retries with the warnings acknowledged ({@term Warning Confirmation}). Other failures show an error toast.
- **Cancel.** The form calls `redirectTo("cancel")` without running the action.

After a success redirect navigates away, the form disables its buttons and ignores submits until the view unmounts. The action cannot run twice while the next view loads. A [`redirectTo`]{@api vue:component:ActionForm:prop:redirectTo} that finishes without navigating must resolve `false`, and the form then accepts input again. In a [slot override]{@api vue:component:ActionForm:slots}, bind `disabled` from the `confirm-button` and `cancel-button` slots, or `confirmDisabled` and `cancelDisabled` from `action-bar`. These flags control the buttons only. The server still decides whether the action runs.

`ModelActionForm` passes `ActionForm` a [`dryRunTarget`]{@api vue:component:ActionForm:prop:dryRunTarget} that changes with the target. If you build a view on `ActionForm` directly and its target can change after mount, pass `dryRunTarget` along with [`readyToDryRun`]{@api vue:component:ActionForm:prop:readyToDryRun}. Without it, the pre-flight runs once for the life of the form.

For a transition, `ViewExecuteTransition` forwards the dry-run flag and the acknowledged warnings digest to `executeTransition`. The store rejects a `400` with {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError} and a `409` with {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}, so both reach the form the same way as for other actions. A dry run keeps the store's cached state history. A completed transition drops the cached history of each object that it ran on, so the next history request goes to the server.

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

The response holds `new_state` and `new_transitions`, the transitions the user can take from the new state. [Permissions](../reference/permissions.md#status-codes) lists the status code for each refusal.

### Read a Bulk Response

A bulk request checks every object and gates warnings once for the whole batch before it writes any. Its `200`, its `409`, and the `400` for a refused object all hold the same two keys:

- `target_state` holds the `code` and `name` of the state that the transition moves each object to.
- `objects` holds one entry for each object, keyed by object id. Each entry holds `state`, the object's state when the request arrived. The state is `null` for an object that has no state.

The objects sit under `objects` rather than at the top level, so no primary key can collide with another key of the body.

Each status adds its own detail:

| Status | Detail beside `target_state` and `objects`                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | Each entry also holds `new_state` and `new_transitions`.                                                                                                                    |
| `400`  | Each refused object's entry also holds `errors`, the messages that explain why it cannot take the transition. No object reports a new state, because the batch rolled back. |
| `409`  | `warnings` holds each warned object's warnings, keyed by object id, and `digest` holds the value to acknowledge.                                                            |

```json
{
    "target_state": { "code": "packed", "name": "Packed" },
    "objects": {
        "1": { "state": { "code": "new", "name": "New" } },
        "2": {
            "state": { "code": "shipped", "name": "Shipped" },
            "errors": ["Pack Order is not available from the Shipped state."]
        },
        "3": {
            "state": { "code": "packed", "name": "Packed" },
            "errors": ["Already in the Packed state."],
            "already_in_target_state": true
        }
    }
}
```

A refused object that is already in the target state also holds `already_in_target_state: true`. The server sets it only when it refuses the object, so a client can skip that object instead of reporting it as blocked. Do not compare each object's `state` with `target_state` instead. A transition that lists its own target as a source accepts an object in that state.

Another request can hold an object's row lock while the server writes. The server then refuses that object, and its entry holds `locked: true`. Its message asks the user to try again. The same request can succeed once the lock is released, so a client should keep that object in the next attempt.

A dry run returns the same bodies, so a confirmation page that runs one when it opens can name the target state, each object's current state, and each refused object's reason. A missing or unknown `transition_code`, or an `object_ids` value that is not a list, returns `400` with that field's errors instead.

`executeTransition` rejects a bulk `400` with a `FormValidationError` whose errors are keyed by primary key. Its `responseData` keeps the whole body.

A dry run skips the row lock. The server writes the transition, and the request's rollback discards it. `on_transition` receives `dry_run=True`, so skip external side effects there during a dry run.

Any failure later in the same write rolls the whole write back, such as another object's refusal or a database deadlock. The rollback undoes database writes, but not an email or a call to an outside service that [`on_transition`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.on_transition} already made. Defer such a call with {@api ext:django:django.db.transaction.on_commit}, so it runs only when the write commits. A deferred call also never runs during a dry run, because the dry run rolls back.

Mail that a hook sends through `get_adapter().send_mail` is already deferred when `vueda.vdq` is installed. VDQ saves the message as a queue item and publishes it with `on_commit`, so a rollback discards it. Without VDQ, `send_mail` sends the message at once, so wrap that call in `on_commit` as well.

```python
from functools import partial

from django.db import transaction


class PurchaseOrder(VuedaModel):
    class Vueda:
        class Workflow:
            enabled = True

    def on_transition(self, transition, user=None, dry_run=False):
        if transition.code == "submit":
            transaction.on_commit(partial(send_submitted_email, self.pk))
```

## Verification Checklist

- Opening a permitted transition route renders `ViewExecuteTransition` or your project view.
- Opening the view shows pre-flight validation errors before you confirm, and nothing changes on the server.
- Submitting sends the transition `code` as `transition_code` and redirects according to `actionRedirects`.
- A `returnPath` query value overrides the configured redirect.
- Cancelling redirects without running the transition.
- A multi-record transition sends `object_ids` and lands on the list view.
- A transition with unacknowledged warnings opens the confirmation dialog. Confirming completes the transition, and cancelling leaves it unapplied.
- A transition attempted while another request holds the row lock shows the lock message.
