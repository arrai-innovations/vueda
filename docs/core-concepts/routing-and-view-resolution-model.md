---
title: Routing and View Resolution Model
type: explanation
audience: integrator
status: draft
---

# Routing and View Resolution Model

VUEDA does not statically enumerate a route for every model-action combination. Instead, two parameterized route records accept any `{app, model, action}` tuple, a guard chain validates the tuple against metadata before any view renders, and a runtime multiplexer selects the correct view component. The result is a routing surface that adapts automatically as models are registered, actions are added, and workflow transitions change, all without per-model route definitions.

This page explains how route records are structured, how the guard chain gates navigation, how action names are normalized across boundaries, and how the view component is ultimately resolved. For where routing sits within the broader client architecture, see [Architecture Overview](./architecture-overview). For the full derivation pipeline that routing feeds into, see [Contract-First Dynamic UI](./contract-first-dynamic-ui).

## Route Records and Names

**{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} produces exactly two route records that cover the entire {@term CRUDL} and action surface.** The `detail` route, named `actionrouter.detailview`, matches the path `/:app/:model/:action/:pk` and carries object identity as `params.pk`. The non-`detail` route, named `actionrouter.listview`, matches `/:app/:model/:action/`. Multi-object selection is encoded as `query.pk`, a comma-delimited string that the route's `props` function splits into an array.

Both `:app` and `:model` segments are derived from the model-info response, which uses Django's `ContentType` fields: `app_label` (the app's label, typically the last segment of the dotted Python path) and `model` (the class name lowercased with no separators). For example, a model class `ProductOption` in an app labeled `inventory` produces client URLs like `/inventory/productoption/list/`. The naming follows Django's `model_name` convention, but the enforcement is VUEDA's: the client reads `app_label` and `model` from model-info and constructs route paths from them automatically. Server-side DRF router prefixes (e.g. `router.register("product-options", ...)`) are independent and do not need to match.

This two-route design means that one URL schema supports both single-object and multi-object action contexts without requiring additional route definitions. A `detail` action like `read` resolves to the `detail` route with a scalar PK in the path. A `list` action resolves to the non-`detail` route. A bulk action resolves to the non-`detail` route with multiple PKs encoded in the query string. The route name and PK shape are the only structural differences.

**{@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo} is the programmatic interface for constructing route targets into this family.** It is an async helper that fetches model-info for the given `{app, model}` pair and returns a `RouteLocationRaw` object targeting the correct route name. When `pk` is a scalar string, the returned target names `actionrouter.detailview` with `pk` in `params`. When `pk` is an array, the target name is `actionrouter.listview`, with the PKs joined into `query.pk`. Callers use `getCRUDForTo` to generate consistent route targets without duplicating the naming or path conventions that `makeCRUDRoutes` defines. For the practical steps of wiring these routes into an application, see [Create a CRUDL Surface](../guides/create-crudl-surface).

`makeCRUDRoutes` enforces one hard precondition at build time: the `actionRedirect` parameter must be provided. This is the route target that guards redirect to when a model or action cannot be found. If `actionRedirect` is falsy, `makeCRUDRoutes` throws immediately; the router cannot be constructed. This is intentional: without a fallback destination, the guard chain has nowhere to send blocked navigations, and the failure would surface as silent navigation drops rather than a clear bootstrap error.

## Route Guard Chain

**The guard chain runs before any view component mounts and determines whether navigation is allowed.** `makeCRUDRoutes` builds the `beforeEnter` array in a fixed order: `requireAuth` (if `authRedirect` is provided), then `requireModelInfo` (always), then `requireGroups` (if `groups` are specified). The guards execute sequentially. If any guard returns a redirect, navigation is diverted, and subsequent guards are not executed.

`requireAuth` checks whether the user is logged in. If the user is unauthenticated, it redirects to the auth route, preserving the original target path in the `redirect` query parameter.

**{@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo} is the central gating function.** It loads the model-info, model-config, and workflow transition stores for the target `{app, model}` via `waitForModelStoreLoad`, then computes an allowlist of permitted action names. If the route's action, after normalization, is present in that allowlist, navigation proceeds. If not, the guard displays an "Action Not Found" error toast and returns a redirect to `actionRedirect`. If the model-info fetch itself fails with a `ModelInfoError` (the typed error surface for missing or unregistered models), the guard emits a "Model Not Found" error toast and redirects. Any other exception type is rethrown, aborting navigation entirely.

If the authenticated user changes while the guard is fetching, it returns `false`. Vue Router cancels that navigation, because the metadata that arrived describes the user it replaced.

`requireGroups` checks group membership. If the logged-in user is a superuser or belongs to at least one of the required groups, navigation proceeds. Otherwise, a permission-denied toast is displayed, and navigation is redirected.

The guard chain is where the client applies metadata-driven access rules. Entry into either generated record runs it, and no view mounts until `requireModelInfo` finds the requested action in the computed allowlist. This is what the [Architecture Overview](./architecture-overview) describes as the "routing and gating" client responsibility layer; route entry is blocked until the contract is satisfied.

These checks decide what the client shows. They do not enforce authorization. The server checks every request on its own, so a route the client admits still returns only what that request may see.

## Rechecking After the Authenticated User Changes

**A change of authenticated user reruns the guard chain against the route on screen.** Vue Router calls `beforeEnter` when a navigation enters a route record. A change of user is not a navigation, so the chain would otherwise never see it. `makeCRUDRoutes` watches `identityGeneration` on {@api js:function:@arrai-innovations/vueda/stores/storeUser#storeUser} and runs the same checks, in the same order, against the current route.

A route the new user may still use keeps its URL, and the recheck adds no history entry. A route they may not use gives way to the destination configured for the check that denied it. The recheck uses `replace` rather than `push`, so the back button does not return to it. These checks describe only the two generated records, so a route the application registered itself never moves.

Two races end the recheck without a redirect. If the user changes again while a check is pending, the recheck that second change triggers decides instead. If the application navigates while a check is pending, that navigation ran the chain on entry, and an older answer does not override it.

## Metadata and Allowlist Inputs

**The action allowlist that `requireModelInfo` computes is the intersection of three metadata sources.** Understanding these sources is essential for diagnosing why a particular action is or is not navigable.

The first source is **model-info actions**. The `actions` array from model-info contains the action names the server advertises for the model, already filtered by the requesting user's permissions. This is the base set. For what model-info provides and how action visibility is permission-sensitive, see [Server-Client Metadata Contract](./server-client-metadata-contract).

The second source is **model-config route restrictions**. If `config.routeActions` is an array, the guard filters the model-info actions down to only those names that appear in `routeActions`. This can narrow the navigable set, but cannot widen it: an action name in `routeActions` that the server did not advertise is simply ignored. Route action filtering is one of the override surfaces described in [Configure CRUDL Views](../guides/configure-crud-views).

The third source is **workflow transition codes**. After the filtered action set is computed, workflow transition codes are unioned into the allowlist. The guard requests them only after model-info loads, and only for a model whose model-info reports `workflow_enabled: true`. Any other model contributes no transition codes and sends no workflow request. Each transition object must have a string `code` property; this is the machine identifier, not the display `name`. Transition codes extend the navigable set beyond what model-info actions alone would allow, because workflow transitions represent state-machine operations that are not standard CRUDL actions.

The final allowlist is: model-info action names, optionally filtered by `routeActions`, plus workflow transition codes. The route's action parameter, after normalization, must appear in this set for navigation to proceed.

A model must be [registered](./canonical-registration-and-discovery) with a viewset to have actions in its model-info response. Serializer-only registration produces field metadata but no action metadata, leaving the allowlist empty and blocking all navigations to that model.

## Action Name Normalization

**The client uses UI-friendly names in route paths that differ from the canonical names the server uses in model-info.** The most prominent example is `read` in route paths mapping to `retrieve` in model-info action names. The `getActionName` utility handles this translation through a static mapping table (`viewToActionNameMap`).

Normalization applies at two points in the routing pipeline. In the guard, `requireModelInfo` calls `getActionName(to.params.action)` before checking the allowlist, so the route action `read` correctly matches the server-advertised action `retrieve`. In the view resolver, `ViewActionRouter` calls `getActionName(props.action)` when searching for a matching action or transition in the metadata.

The normalization is asymmetric by design. It maps UI route names to canonical server names for metadata matching, but the raw route action string, not the normalized name, is used as the key into the `crudComponents` registry and for dynamic import naming conventions. This means the `crudComponents` registry is keyed by client-facing names (`read`, `list`, `create`, `update`) while the metadata matching uses server-canonical names (`retrieve`, `list`, `create`, `update`). The distinction matters because a custom component registered under the raw action string in `crudComponents` will be resolved correctly, while the guard's allowlist check uses the normalized name against metadata.

## Action and Transition Matching

**`requireModelInfo` and `ViewActionRouter` both match the current action against metadata, but they serve different purposes and operate at different levels of strictness.** The guard determines whether navigation is allowed. The view resolver determines which component to render.

In the guard, matching is a simple inclusion check: the normalized action name must appear in the computed allowlist. The allowlist is a flat array of strings: model-info action names (optionally filtered) and workflow transition codes. If the normalized action is present, the guard passes. If not, navigation is redirected. The guard does not distinguish between CRUDL actions and workflow transitions; both are just strings in the same list.

In `ViewActionRouter`, matching is more granular because the resolver must select the correct component type. After normalization, the resolver checks the `actions` array for an action whose `name` matches, and separately checks the `transitions` array for a transition whose `code` matches. This distinction matters because a matched CRUDL action can route through the `crudComponents` registry while a matched transition cannot; both still fall through the same naming-convention and terminal-fallback chain described below, ending at `ViewExecuteTransition` for a transition and `ViewAction` for everything else.

The guard and the resolver can theoretically disagree if the metadata changes between guard evaluation and component rendering (for example, if a reactive store update occurs mid-navigation). In practice, both consume the same underlying store data, so disagreement is rare. But it is architecturally possible for the guard to permit navigation to an action that the resolver then cannot match, in which case `ViewActionNotFound` renders.

## View Component Resolution Order

**`ViewActionRouter` is the runtime multiplexer that selects a concrete view component based on the current action, metadata state, and component registry.** It does not render UI itself, it delegates to exactly one resolved component. The resolution follows a fixed priority chain that always terminates.

**The current view stays mounted while the destination resolves.** On initial entry, the resolver renders `ViewLoading`. During later navigation, it retains the current component and its props while model configuration, workflow metadata, and the destination component load. Once ready, it switches the component and props together. A newer navigation discards an obsolete component result. If the resolved component stays the same, Vue reuses its instance; a different component replaces it and its children.

**Missing metadata produces a not-found view.** If the actions array and transitions array are both absent (null or undefined), the resolver renders `ViewActionNotFound`. This covers the case where metadata fetch succeeded, but the model has no actions or transitions, typically a serializer-only registration that should not have been navigated to.

**Unknown actions and transitions produce a not-found view.** If actions or transitions exist but the current action matches neither an action `name` nor a transition `code`, the resolver renders `ViewActionNotFound`.

**Built-in CRUDL components are checked next, for a CRUDL action match.** If the current action matched a CRUDL action `name` (not a transition `code`) and the raw action string (not the normalized name) is a key in the `crudComponents` registry, that component is loaded. The default registry maps `list`, `create`, `update`, `read`, `destroy`, `activate`, `deactivate`, and `history-list` to their corresponding built-in view components. Projects can extend or override the registry using `setCrudComponents`, which merges custom entries into the existing map.

**Project-specific action views are resolved by naming convention.** If the action is not in the `crudComponents` registry, the resolver attempts dynamic imports following a two-tier naming convention, for both CRUDL actions and transition codes alike. First, it tries a model-specific component: `@/views/ViewAction{App}{Model}{Action}.vue`. If that import fails, it falls back to an action-generic component: `@/views/ViewAction{Action}.vue`. App, model, and action names (or the transition code) are converted to PascalCase for the import path.

**The terminal fallback depends on whether the match was a transition.** If both dynamic imports fail, the resolver renders `ViewExecuteTransition` when the current action matched a transition `code`, or `ViewAction` when it matched a CRUDL action `name`. `ViewExecuteTransition` composes `ModelActionForm` with a `run-action` that submits through `storeWorkflow.executeTransition` (carrying `transition_code`) instead of the generic model-action endpoint `ViewAction` uses. This ensures the resolution chain always terminates with a rendered component; there is no path through the logic that produces no output.

The resolution order means that the `crudComponents` registry takes priority over project-specific naming-convention imports, and a project-specific naming-convention import takes priority over either terminal fallback. A project that registers a custom component in `crudComponents` for an action name that also has a `ViewAction{Action}.vue` file will see the registry entry win. This is by design: `setCrudComponents` is the explicit override mechanism, and naming-convention discovery is the implicit fallback ahead of the framework's own terminal views.

## Failure Modes

**Missing `actionRedirect` crashes router bootstrap.** `makeCRUDRoutes` throws if `actionRedirect` is falsy, which prevents the router from being constructed at all. This is a build-time failure; it occurs before any navigation. The error message identifies the problem directly, but the symptom in the application is that no routes are registered.

**Redirect loops from self-gated `actionRedirect` targets.** If the `actionRedirect` destination is itself a route that passes through `requireModelInfo` (including another route in the CRUDL family), a failing guard will redirect to a destination that also fails its guard, producing repeated redirects. The visible symptom is a cascade of "Action Not Found" or "Model Not Found" toasts with no stable landing view. The `actionRedirect` must point to a route that is not gated by `requireModelInfo`.

**Toasts require a mounted toaster surface.** `requireModelInfo` and `requireGroups` report denials and lookup failures by calling the `toast` function imported from `@arrai-innovations/vue-sonner`. This is a plain module import, so no service registration is needed and the guard never throws when the toaster is absent. If no `<Sonner />` toaster is mounted in the app, those `toast(...)` calls silently produce no notification: the guard still redirects, but the user sees no message explaining why.

**`routeActions` filtering does not normalize action names.** The `routeActions` array is compared against canonical model-info action names directly. Using UI route names (such as `read`) in `routeActions` will fail to match the corresponding canonical name (`retrieve`), causing the guard to emit an "Action Not Found" toast and redirect even though the action exists in model-info. The `routeActions` array must use server-canonical names.

**Strict workflow transition shape.** The guard requires every transition object to have a string `code` property. A transition entry with a missing or non-string `code` causes the guard to throw an error immediately rather than treating the entry as unavailable. The error message identifies the malformed transition, but the symptom is that navigation to any action on that model fails; the exception occurs during allowlist computation, before any individual action is checked.

**A denied workflow transition fetch redirects, and other workflow fetch errors abort navigation.** When the server answers the workflow transition fetch with a 403, the store rejects with {@api js:class:@arrai-innovations/vueda/stores/storeWorkflow#WorkflowPermissionDeniedError}. `requireModelInfo` then shows a "Permission Denied" toast and redirects to `actionRedirect`, the same as for an action missing from the allowlist. Any other workflow fetch error propagates uncaught and aborts navigation. The workflow store caches both kinds of failure, so later navigations to the same model fail from cache rather than retrying.

**Comma-delimited PK arrays are lossy for PKs containing commas.** The `list` route encodes multiple PKs as `query.pk` by joining them with commas, and reconstructs the array by splitting on commas. If a string PK itself contains a comma, the split produces incorrect values. This is a structural limitation of the encoding scheme rather than a bug; the system assumes PKs do not contain commas.

**`getCRUDForTo` error message mismatch.** When called with `throwOnUndefinedPk: true`, `getCRUDForTo` checks `modelInfo.actions[].detail` but its current logic throws when `pk` is missing for non-`detail` actions and does not throw for `detail` actions. The error message references "`detail` views" regardless, which can be misleading when diagnosing route construction failures.

## Relevant Implementation Surface

- {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}
- {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}
- {@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo}
- {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents}
- {@api js:function:@arrai-innovations/vueda/utils/actionMap#getActionName}
- {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}
- {@api js:function:@arrai-innovations/vueda/use/useWorkflowTransitions#useWorkflowTransitions}
- {@api vue:component:ViewActionRouter}
- {@api vue:component:ViewExecuteTransition}
- {@api vue:component:ViewAction}
- {@api vue:component:ViewActionNotFound}
- {@api vue:component:ViewLoading}
