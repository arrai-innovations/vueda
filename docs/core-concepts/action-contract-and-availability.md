---
title: Action Contract and Availability
type: explanation
audience: integrator
status: draft
---

# Action Contract and Availability

The server reports which [actions]{@term Action} the current user may take in two lists: {@term Model Actions} in {@term Model Info}, computed with no object, and each object's {@term Available Actions}. The client reads these lists, plus the workflow's transition lists, to decide which routes open and which buttons render. The server checks every request again when it runs, as [Authorization vs UI Semantics](./authorization-vs-ui-semantics.md) describes.

[Control Action Availability in the UI](../guides/control-action-availability.md) gives the steps for narrowing what a user sees.

## Server Action Declaration and Route Partitioning

A viewset offers the built-in actions it implements (`list`, `retrieve`, `create`, `update`, `partial_update`, and `destroy`) and any {@term Extra Action} it declares. VUEDA's {@api py:function:vueda.core.decorators.action} decorator declares an extra action. It accepts the arguments of [DRF's `action`]{@api ext:drf:rest_framework.decorators.action} and adds [`bulk`]{@api py:param:vueda.core.decorators.action.bulk} and [`confirm`]{@api py:param:vueda.core.decorators.action.confirm}. An extra action's name is its `url_name`.

{@api py:class:vueda.core.routers.VuedaRouter} mounts each extra action by its [`detail`]{@api py:param:vueda.core.decorators.action.detail} and `bulk` flags:

- `detail=True` mounts the action at the object URL.
- `detail=False` mounts it at the list URL.
- `bulk=True` also mounts it at the list URL, so a {@term Bulk Action} declared with `detail=True` answers at both URLs.

The `bulk` flag sets routing and metadata only. The action body decides what the request body contains and which objects it acts on.

Model info reads the same `detail` and `bulk` attributes from each action, so its metadata matches the router's URLs. It also flags `destroy` as bulk; the list URL accepts `DELETE` with a list of keys.

## Model-Scope Action Metadata

{@term Model Actions} answer whether the user might perform an action on some object of the model. The {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} endpoint builds the list in {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}. The list differs between users.

Each built-in action that the viewset implements appears when a {@term Model-Scope Check} passes. {@api py:function:vueda.core.permissions.check_action_permission} runs that check through the viewset's own permission classes, with no object and the HTTP method of the action under test.

Extra actions appear as {@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions} returns them. On `VuedaViewSet`, the default returns every extra action and offers `history-list` only to users who may read. {@api py:function:vueda.core.viewsets.VuedaReadOnlyViewSet.get_allowed_extra_actions} returns every extra action. Extra actions get no other check in this list.

`get_allowed_extra_actions` shapes metadata only. Leaving an action out hides its routes and buttons in the client, and the endpoint still answers requests. To refuse a request, enforce the permission in the viewset's permission classes or in the action body.

A {@term Serializer-Only Registration} has no viewset, so its model actions are empty.

Each entry carries the action's name, HTTP methods, `detail` and `bulk` flags, and URL parameters. The {@api rest:schema:ModelInfoAction} schema and the client's {@api js:interface:@arrai-innovations/vueda/stores/storeModelInfo#ActionInfo} list the fields.

## Object-Scope Availability Metadata

{@term Available Actions} answer whether the user can perform an action on one object in its current state. The {@api py:class:vueda.core.serializers.fields.AvailableActionsField} computes the [`available_actions`]{@api py:property:vueda.core.serializers.VuedaSerializer.available_actions} field for each serialized object.

Each built-in action that the viewset implements, except `create`, appears when an {@term Object-Scope Check} passes for that object. The check includes `list`. It runs the viewset's object permission check, so {@term Row-Level Permissions}, {@term State Permission} rules, and any override of that check apply. Extra actions appear as `get_allowed_extra_actions(request, instance=instance)` returns them, so an override can decide per object.

The server includes the field only when the request names it through {@term Sparse Fields} (`f`). An expanded object never carries it, and the server rejects a request that names it on an expanded object with `400`. The client asks for it on detail fetches, and on list fetches when the model config sets [`detailLinkField`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.detailLinkField}.

The two scopes can differ for the same user. A user may hold the model-level permission for `update`, so `update` is in the model actions. One object may sit in a workflow state that denies `update`, so that object's `available_actions` leaves it out.

## UI Affordance Filtering Layers

{@term Route Admission} opens a route when its action is in the model actions after [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.routeActions} narrows them. It also opens a route whose action is one of the user's {@term Permitted Transitions}. [Routing and View Resolution Model](./routing-and-view-resolution-model.md#failure-modes) describes the guard, what a refused route shows, and which view component renders.

Buttons pass through the model config's [`actions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actions} first. It defaults to the model actions' names. When `actions` is an array, {@api js:function:@arrai-innovations/vueda/use/useFilteredActions#useFilteredActions} keeps every name in it. When `actions` is an object, it keeps the names whose value is `true` or lists one of the user's groups. A button also needs the action's entry in model info. This filter runs in the client and changes only what the client shows.

Each view then picks its buttons from these sources:

- **List view.** Action buttons come from the filtered actions alone. Transition buttons come from the model's {@term Permitted Transitions}, computed with no object.
- **Detail view.** Buttons for detail actions come from the filtered actions that the object's `available_actions` also lists. Buttons for other actions, such as `create`, come from the filtered actions alone, because `available_actions` never lists `create`. Transition buttons come from the object's {@term Valid Transitions}.

`valid_transitions` is empty when the user lacks the workflow's configured permissions for the object, including when the workflow configures none. List and detail responses still succeed. The detail view requests the field only when model info lists it.

An update view whose object's `available_actions` leaves out `update` shows an "Editing unavailable" notice in place of the form. {@api vue:component:ViewUpdate} renders it through its [`update-unavailable`]{@api vue:component:ViewUpdate:slot:update-unavailable} slot.

When the permitted transitions request answers `403`, the list view shows no transition buttons, and transition routes for that model redirect with a "Permission Denied" toast. The client keeps that failure until its caches clear. [Reactive Data Flow](./reactive-data-flow.md#when-caches-clear) describes when that happens.

## Dry-Run and Mutation Semantics

A request asks for a {@term Dry Run} with the `Dry-Run: true` header. Two kinds of request honor the header:

- Extra actions declared with VUEDA's `action` decorator, for methods other than `GET`, `HEAD`, and `OPTIONS`.
- `destroy`, on the object URL and on the list URL.

The built-in `create`, `update`, and `partial_update` ignore the header and commit their changes.

For an extra action, the decorator sets `request.dry_run` to `True` and runs the body. After the body returns, it marks the request's database transaction for rollback with {@api ext:django:django.db.transaction.set_rollback}. The rollback depends on the request transaction that [Request Transactions](./configuration-surface-and-defaults.md#request-transactions) describes. When a dry-run action calls another decorated action, the outer call marks the rollback. Work outside the database, such as an email or a call to another service, still runs unless the body checks `request.dry_run`.

A dry-run `destroy` runs `destroy_validation` and the warning gate, then answers `200` with an empty body and deletes nothing. A committed `destroy` answers `204`. A validation failure answers `400` in either mode.

{@api vue:component:ModelActionForm} sends a dry run as a pre-flight once it has target objects, unless its [`enableDryRun`]{@api vue:component:ModelActionForm:prop:enableDryRun} prop is `false`. A `400` from the pre-flight shows as field errors on the form. The form drops any other failure, including a `409`, without a prompt. A successful pre-flight shows no toast, fires no redirect, and leaves the workflow store's cached object state unchanged.

## Warning Confirmation Gating

Actions take part in {@term Warning Confirmation}. [Error and Validation Contract](./error-and-validation-contract.md#warning-confirmation-semantics) describes the `409` body and the client error classes.

`@action(confirm=True)` gates every request whose method is not `GET`, `HEAD`, or `OPTIONS`. The gate runs before the body, so an unacknowledged request returns `409` and the body does not run. The message comes from a `confirm_message` attribute that is set on the action function. When that attribute is unset, the message is {@api py:property:vueda.core.decorators.DEFAULT_CONFIRM_MESSAGE}.

The gate also runs before the dry-run check, so a dry run of a `confirm=True` action returns `409` too. The pre-flight that `ModelActionForm` sends for such an action therefore never reaches the body and reports no validation errors. This suits actions without input, which have nothing to validate.

An action that takes input calls {@api py:function:vueda.core.exceptions.gate_warnings} inside the body. The action calls it after `serializer.is_valid(raise_exception=True)` and before the write, so a `400` comes before the `409`. `destroy` follows the same order: `destroy_validation`, then the gate, then the dry-run return. [Require Confirmation Before a Write](../guides/require-write-confirmation.md) gives the steps for each kind of write.

## Failure Surface and Drift Patterns

**Model scope is broader than object scope.** A user with the model-level permission passes route admission for any object. When one object denies the action, its detail view shows no button for it. A user who opens the update route by URL sees the "Editing unavailable" notice. The server refuses a request sent anyway, and [Permission Model](./permission-model.md#why-refused-requests-fail-differently) describes which status it returns.

**`routeActions` is narrower than the server's list.** The guard refuses a route for an action the server offers, with an "Action Not Found" toast. The toast does not say that the model config removed the action.

**`get_allowed_extra_actions` leaves out an action the endpoint accepts.** The client hides the action's routes and buttons, and a direct request to the endpoint still runs.

**A workflow `403` is cached.** Transition routes and list transition buttons stay unavailable after the server-side cause is fixed, until the client's caches clear.
