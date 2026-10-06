---
title: Routing and View Resolution Model
type: explanation
audience: integrator
status: draft
---

# Routing and View Resolution Model

VUEDA registers two parameterized routes that accept any app, model, and action. A route guard chain checks each navigation against the model's metadata, and {@api vue:component:ViewActionRouter} then picks the view component to render. A model that you register on the server gets working routes without per-model route definitions, and you add a custom view only where a model needs one.

This page describes the route records, {@term Route Admission} (the checks a navigation must pass), how action names map between routes and metadata, what happens when a check fails, and {@term Action View Resolution}. [Architecture Overview](./architecture-overview.md) places routing in the client, and [Contract-First Dynamic UI](./contract-first-dynamic-ui.md) describes how the resolved views build their fields from metadata.

## Route Records and Names

{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} returns the two {@term CRUD Routes}:

- `actionrouter.detailview` matches `/:app/:model/:action/:pk` and targets one object.
- `actionrouter.listview` matches `/:app/:model/:action/` and targets either a model or several objects listed in the `pk` query value.

Both records pass `app`, `model`, `action`, and `pk` to the route component as props. The list record reads one key from each `pk` query value, as in `?pk=4&pk=7`, and passes the keys as an array. It never splits a value, so a key that contains a comma arrives intact. [Primary Key and Identifier Discipline](./pk-and-identifier-discipline.md#identifier-transport) describes how keys travel. A [`pathPrefix`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.pathPrefix} is prepended to both paths.

The `:app` and `:model` segments are the model's `app_label` and lowercase model name, the pair by which {@term Model Info} is keyed. Nothing derives them for you: the guard fetches model info with the segments that it receives, so a pair that the server does not recognize fails the route. These segments form the client URL only. The client builds its API request paths separately, as the {@term Model API Path}, and [Create a CRUD Surface](../guides/create-crud-surface.md#router-and-url-wiring) describes that convention.

{@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo} builds a target for one of the two CRUD routes without any request. For a scalar `pk`, it names `actionrouter.detailview` with `pk` in `params`. For an array `pk`, it names `actionrouter.listview` with one `pk` query value for each key. With no `pk` or an empty array, the target is the list record with no selection. It throws when its `query` argument has a `pk` entry, so the keys come only from `pk`.

`makeCRUDRoutes` throws before it registers anything in two cases. [`actionRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.actionRedirect} is missing: it is the destination for every model and action failure. [`groups`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.groups} names a group and [`groupsRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.groupsRedirect} is missing: it is the destination for a group membership failure.

## Route Guard Chain

`makeCRUDRoutes` registers one `beforeEach` guard on the router you pass it. The guard acts only on navigations to the two generated route names, so routes that the application registers itself pass through untouched. It also skips a navigation that keeps the same record, app, model, and action, such as a change of `pk` or of the query string, because none of the checked metadata depends on them.

The guard runs up to three checks, in this order:

1. {@api js:function:@arrai-innovations/vueda/router/guards#requireAuth}, when you pass [`authRedirect`]{@api js:param:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes:params.authRedirect}.
2. {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}, always.
3. {@api js:function:@arrai-innovations/vueda/router/guards#requireGroups}, when you pass `groups`.

A check approves by returning `true` or nothing. The first check that returns anything else decides the navigation, and later checks do not run.

`requireAuth` waits for the current user to load. If nobody is signed in, it redirects to `authRedirect` and adds a `redirect` query value holding the full path of the route that was refused. After sign-in, the sign-in view returns to that path; [Build Auth Views](../guides/build-auth-views.md#redirect-chain) describes the order in which it picks a destination.

`requireModelInfo` loads the model info, the permitted transitions, and the {@term Model Config} for the route's app and model, in that order. It then checks the route's action against the action allowlist, which [Metadata and Allowlist Inputs](#metadata-and-allowlist-inputs) describes. A listed action passes. Every other outcome is in [Failure Modes](#failure-modes).

`requireGroups` passes for a user who belongs to at least one of the listed groups, and for a superuser. Anyone else sees a "Permission Denied" toast and is redirected to `groupsRedirect`.

These checks decide which views the client opens. The server authorizes every request on its own, so a route that the client admits still returns only what that user may see. [Authorization vs UI Semantics](./authorization-vs-ui-semantics.md) describes the boundary between the two.

## Rechecking After the Authenticated User Changes

A change of authenticated user is not a navigation, so the `beforeEach` guard never sees it. `makeCRUDRoutes` therefore watches [`identityGeneration`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.identityGeneration} on {@api js:function:@arrai-innovations/vueda/stores/storeUser#storeUser}. When it changes, the same checks run in the same order against the route on screen.

A route that the new user may still use keeps its URL, and the recheck adds no history entry. A route that they may not use is replaced by the destination of the check that denied it. The recheck calls `router.replace`, so the back button does not return to the denied route. The recheck ignores routes that the application registered itself.

Two races end the recheck without a redirect. If the user changes again while a check is pending, the recheck for that later change decides. If the application navigates while a check is pending, that navigation already ran the chain, and the older answer is discarded.

## Metadata and Allowlist Inputs

`requireModelInfo` builds the allowlist from three inputs:

1. The action names in the model info `actions` list. These are the user's {@term Model Actions}, already filtered by the server for that user's permissions.
2. [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.routeActions} from the model config, when it is an array. It keeps only the model actions that it names. A name the server did not report adds nothing.
3. The codes of the user's {@term Permitted Transitions}, appended after the `routeActions` filter. `routeActions` never removes a transition code.

The guard reads `routeActions` from the model-wide config. A `routeActions` value in a view-specific config has no effect on the guard. The default `routeActions` lists every action that model info reports, so the allowlist starts as the full set of model actions. [Configure CRUD Views](../guides/configure-crud-views.md#limit-which-routes-open) describes where to set it.

Transition codes come from the workflow store only for a {@term Workflow-Enabled Model}. For any other model, or when [`setUsingVuedaWorkflow(false)`]{@api js:function:@arrai-innovations/vueda/stores/storeWorkflow#setUsingVuedaWorkflow} is in effect, the store returns an empty list and sends no request. Each {@term Transition} contributes its `code`; its `name` is display text.

A model with a {@term Serializer-Only Registration} reports no actions. Its allowlist is empty, so every route to it fails. [Canonical Registration and Model Discovery](./canonical-registration-and-discovery.md) describes the difference that a viewset makes.

## Action Name Normalization

Route segments and model info name one action differently: the route segment `read` is the {@term Canonical Action Name} `retrieve`. {@api js:function:@arrai-innovations/vueda/utils/actionMap#getActionName} translates a route segment through [`viewToActionNameMap`]{@api js:property:@arrai-innovations/vueda/utils/actionMap#viewToActionNameMap}, which holds only that entry. Every other name maps to itself.

Both the guard and `ViewActionRouter` translate the route's action before they compare it with metadata. The built-in view registry is keyed by the untranslated route segment, so the read view is registered as `read`. A route with the segment `retrieve` passes the guard, but the registry has no `retrieve` entry. That route opens a view by the naming convention in [View Component Resolution Order](#view-component-resolution-order).

`routeActions` holds canonical names, because the guard compares it with model info names before it compares the translated route action. A `routeActions` list that names `read` removes `retrieve` from the allowlist, so every `read` route for that model fails with "Action Not Found".

## Failure Modes

`requireModelInfo` redirects to `actionRedirect` in three cases:

- **The action is not in the allowlist.** The user sees an "Action Not Found" toast.
- **Model info fails to load.** The store rejects with {@api js:class:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfoError}, and the user sees "Model Not Found".
- **The route is a transition, and the server answers the permitted transitions request with `403`.** The workflow store rejects with {@api js:class:@arrai-innovations/vueda/stores/storeWorkflow#WorkflowPermissionDeniedError}, and the user sees "Permission Denied". The denial affects transition routes only: a CRUD route of the same model opens when model info lists its action. A workflow with no workflow permission rows returns `403` to every user; [Workflow as a Permission Overlay](./workflow-permission-overlay.md#failure-surfaces-and-symptom-signatures) describes the causes.

The model info and workflow stores cache these failures per model, so later navigations to that model fail without a new request. {@term Auth-Scoped Stores} describes when those caches clear.

Other failures do not redirect:

- **The authenticated user changes while the metadata loads.** The store rejects with {@api js:class:@arrai-innovations/vueda/utils/errors#AuthScopeInvalidatedError}, and `requireModelInfo` returns `false`. Vue Router cancels the navigation, because the metadata described the previous user. The recheck in [Rechecking After the Authenticated User Changes](#rechecking-after-the-authenticated-user-changes) decides where the application goes.
- **A permitted transition has no string `code`.** The guard throws `requireModelInfo: workflow transition is missing a string code` while it builds the allowlist, so every route of that model fails, whatever its action.
- **Any other error.** A workflow error other than `403`, or any unexpected exception, propagates and aborts the navigation.

A redirect loops when `actionRedirect` itself passes through `requireModelInfo` and fails, for example when `actionRedirect` is another route in the CRUD pair for the same model. The user sees repeated "Action Not Found" or "Model Not Found" toasts and no stable view.

The guards report failures through `toast` from `@arrai-innovations/vue-sonner`. When no {@api vue:component:Sonner} toaster is mounted, the redirect still happens but the user sees no message. [Client Plugin Prerequisites](../guides/client-plugin-prerequisites.md#toast-notifications) describes mounting it.

## View Component Resolution Order

`makeCRUDRoutes` renders the component you pass as `component`, normally `ViewActionRouter`. It renders one resolved view and nothing of its own. On first entry it shows {@api vue:component:ViewLoading}. On later navigation it keeps the current view and its props while the model config, the permitted transitions, and the destination component load, then switches the component and its props together. A result from a superseded navigation is discarded. When the resolved component is the same, Vue keeps its instance.

`ViewActionRouter` translates the route's action with `getActionName`, then resolves the view in this order:

1. **Unknown action.** If the translated action matches no model info action `name` and no permitted transition `code`, it renders {@api vue:component:ViewActionNotFound}.
2. **Built-in registry.** If no transition matched and the untranslated route action is a key in [`crudComponents`]{@api js:property:@arrai-innovations/vueda/router/routerComponent#crudComponents}, it calls that entry's loader with `{app, model, action, pk}` and renders the component that the loader returns. The default keys are `list`, `create`, `update`, `read`, `destroy`, `activate`, `deactivate`, and `history-list`. A transition with the same code as a registry key skips the registry.
3. **Model-specific convention.** It imports `@/views/ViewAction<App><Model><Action>.vue`.
4. **Action convention.** If that import fails, it imports `@/views/ViewAction<Action>.vue`.
5. **Generic view.** If both imports fail, it renders {@api vue:component:ViewExecuteTransition} for a transition code, or {@api vue:component:ViewAction} for a model action.

Each name in a convention path is the route segment in title case with spaces removed, so a model with the segment `productoption` becomes `Productoption`. The model-specific view for an `approve` action on `/inventory/productoption/approve/` is `ViewActionInventoryProductoptionApprove.vue`. With an installed VUEDA package, Vite finds these files only when the `@` alias points at your application's source. You set it through [`extraAliases`]{@api js:param:@arrai-innovations/vueda/vite#vuedaViteConfig:options.extraAliases} in {@api js:function:@arrai-innovations/vueda/vite#vuedaViteConfig}, and [Client Plugin Prerequisites](../guides/client-plugin-prerequisites.md) describes the setup. Without it, the built-in registry and the generic views still work.

{@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents} merges entries into the registry, adding keys or replacing the default loader for a key. A registry entry wins over a convention file for the same action. The loader receives the route's app, model, action, and pk, so one replacement loader can return a custom view for one model and the default view for the others.

`ViewExecuteTransition` submits through [`executeTransition`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition} with the transition code. `ViewAction` submits to the model's action endpoint.

The resolver does not apply `routeActions`, and it reads the same stores as the guard at a later moment. A route that passed the guard can therefore render `ViewActionNotFound` when the metadata changes between the guard and the resolver, for example after a refresh removes the action.
