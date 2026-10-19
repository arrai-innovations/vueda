---
title: Control Action Availability in the UI
type: how-to
audience: integrator
status: draft
---

# Control Action Availability in the UI

The client offers each user the actions that the server reports for them. {@term Model Actions} drive routes and model-level buttons, and each object's {@term Available Actions} drive that object's buttons. This guide shows how to shape those lists on the server and narrow them in the client. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md) describes the two scopes and where transition buttons come from.

Every step here changes what the client offers. The server still authorizes each request on its own, as [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics.md) describes.

## Before You Start

- The model has a viewset in its canonical registration. A model with a {@term Serializer-Only Registration} reports no actions, so none of its routes open. [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md) describes the difference.
- The model's routes come from {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} and render {@api vue:component:ViewActionRouter}. `makeCRUDRoutes` runs {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo} on each navigation. `requireModelInfo` is the {@term Route Admission} check. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md) describes the guard and how a route picks its view.

## Grant the Built-in Actions

The built-in actions follow the viewset's permission class, {@api py:class:vueda.core.permissions.ObjectPermissions} by default. You grant them through permissions and rules, with no extra code:

1. Give the user the codename that each action's HTTP method maps to, such as `myapp.update_widget` for `update` under the default mapping. [Permissions](../reference/permissions.md#required-codename-per-request) lists the mapping. An action appears in model info's `model_actions` when its {@term Model-Scope Check} passes.
2. Add row-level rules or state permission rules to narrow individual objects. An action that model info lists drops out of an object's `available_actions` when that object's {@term Object-Scope Check} denies it. [Implement Row-Level Permissions](implement-row-level-permissions.md) and [Add Workflow State and Transition Permissions](workflow-state-permissions.md) give the steps.

`create` acts on the model, so it never appears in an object's `available_actions`. [Permission Model](../core-concepts/permission-model.md) describes the order in which these layers apply.

## Offer Extra Actions per User or Object

Each {@term Extra Action} appears in the lists when {@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions} returns it. VUEDA calls the method with no `instance` to build `model_actions`, and once per object with `instance` set to build that object's `available_actions`. The default offers every extra action and shows `history-list` only to users who can read the object.

Override the method and start from the default set, so `history-list` keeps its read check:

```python
from vueda.core.viewsets import VuedaViewSet


class WidgetViewSet(VuedaViewSet):
    def get_allowed_extra_actions(self, request, *, instance=None):
        allowed = super().get_allowed_extra_actions(request, instance=instance)
        if request is not None and not request.user.has_perm("myapp.approve_widget"):
            allowed.discard("approve")
        if instance is not None and instance.status == "locked":
            allowed.discard("approve")
        return allowed
```

`request` is `None` when a serializer builds the lists without a request, so check it before you read `request.user`. Name each action by its URL name, as model info reports it.

This method changes only what the client offers. The `approve` endpoint still accepts any request that passes the viewset's permission class, so apply the same checks inside the action.

## Request `available_actions` on Objects

The server includes `available_actions` only when the request names it in {@term Sparse Fields} (`f`). The built-in views request it for you:

- {@api vue:component:DetailView} always requests it.
- {@api vue:component:ViewList} requests it when the model config sets `detailLinkField`, to choose each row link's destination. [Link List Rows to Read and Update Views](link-list-rows-to-detail-views.md) describes that choice.

A custom view that fetches objects itself must add `available_actions` to its `f` list. Only the top-level object carries the field. Naming it on an expanded object, such as `f=distributor.available_actions`, returns `400`.

## Narrow What the Client Offers

Two model config keys narrow the server's lists in the client. Neither can add an action that the server does not report.

- [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.routeActions} closes the routes of model actions that it leaves out. Transition routes still open.
- [`actions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actions} hides action buttons, per view and optionally per group. An action it hides still opens by URL, so close its route with `routeActions` as well.

[Choose Actions and Routes](configure-crud-views.md#choose-actions-and-routes) gives the steps and the forms that each key takes.

## Let Users Reach Workflow Transitions

For a {@term Workflow-Enabled Model}, the user's {@term Permitted Transitions} add their transition codes to the actions that a route can name. A permitted code opens {@api vue:component:ViewExecuteTransition} unless you add a view for it by the naming convention in [View Component Resolution Order](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order).

1. Give the user the workflow's workflow permissions and the transition's permission. [Add Workflow State and Transition Permissions](workflow-state-permissions.md) gives the steps.
2. Leave transition buttons to the views. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md) describes which list each view reads them from.

When the server answers the permitted transitions request with `403`, transition routes for that model show "Permission Denied" and redirect. CRUD routes for the model still open when model info lists their action.

## Verify the Result

Sign in as a user with each set of permissions that you configured, then check:

1. On a model without state rules, [model info]{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} omits `create` for a user without `myapp.create_widget`.
2. Request an object for which a state or row-level rule denies `update`, with `available_actions` in `f`. Its `available_actions` omits `update`, and model info still lists it.
3. The detail views of two such objects show different action buttons.
4. A route for an action outside `routeActions` shows "Action Not Found" and redirects to the `actionRedirect` passed to `makeCRUDRoutes`.
5. A permitted transition code in the URL opens the transition view, and an unpermitted code shows "Action Not Found".

## Troubleshooting

**Model info lists an action, but the detail view shows no button for it.** Check the object's `available_actions` in the API response. When the action is absent, the object-scope check denies it for that object. When it is present, check the `actions` key in the model config for that view.

**"Action Not Found" for an action the server reports.** The model-wide `routeActions` leaves it out. A `routeActions` list that names `read` instead of `retrieve` closes every read route.

**A transition route shows "Action Not Found".** The code is not in the user's permitted transitions. Check the user's workflow and transition permissions for that model.

**A transition route shows "Permission Denied".** The server answered the permitted transitions request with `403`. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md#failure-surfaces-and-symptom-signatures) lists the causes, including a workflow with no workflow permission rows. The client keeps that denial until a different user signs in, the store resets, or the page reloads ({@term Auth-Scoped Stores}). Fix the permissions, then reload.

**Every route for the model fails with `requireModelInfo: workflow transition is missing a string code`.** A transition record has an empty `code`. Forms and `full_clean` reject an empty code, but the database accepts one from code that skips validation. Give the transition a code.

**A route passes the guard but shows {@api vue:component:ViewActionNotFound}.** The metadata changed between the guard and the view, for example after a refresh removed the action. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) describes the timing.
