---
title: Routing and View Resolution Model
type: explanation
audience: implementor
status: briefing
---

# Routing and View Resolution Model

## Intent and Scope

- Define the client-side route record shapes, guard gating, and runtime view-component resolution used for CRUD and action routes.
- Define the authority boundaries between URL params, model-info/config/workflow metadata, and the view selection layer.
- Define observable failure modes for missing metadata, missing actions, workflow transition shape errors, and redirect/guard miswiring.
- Source anchors: `client/lib/router/makeCrud.js`, `client/lib/router/getCrud.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/router/routerComponent.js`, `client/lib/utils/actionMap.js`, `client/tests/unit/lib/router/makeCrud.spec.js`, `client/tests/unit/lib/router/getCrud.spec.js`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/views/ViewActionRouter.spec.js`.

## Non-goals

- Not a how-to for building a router file or application shell.
- Not a complete reference for model-info, model-config, or workflow store contracts beyond what routing depends on.
- Not a guarantee that generated API pages capture all edge cases; code/tests are authoritative.

## Key Concepts

### CRUD route family (`actionrouter.*`)

- What it is: two route records (detail + non-detail) sharing a single component and guard chain; identity is carried as `params.pk` (detail) or `query.pk` (list, comma-delimited).
- Why it exists: one URL schema supports both single-object and multi-object action contexts without per-action route definitions.
- Where it lives: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.

### Route gating via `requireModelInfo`

- What it is: a route guard that blocks navigation unless the target `{app, model, action}` is present in the computed allowlist derived from model-info, model-config, and workflow transitions.
- Why it exists: action availability is metadata-driven (and permission-sensitive) and must be enforced before rendering action views.
- Where it lives: `client/lib/router/guards.js` (`requireModelInfo`, `waitForModelStoreLoad`), `client/tests/unit/lib/router/guards.spec.js`.

### Action-name normalization (`read` → `retrieve`)

- What it is: a normalization layer used by both guard and view-resolution paths to compare route action strings against canonical action identifiers.
- Why it exists: UI-facing route/view names can differ from server/model-info action names while still targeting the same underlying capability.
- Where it lives: `client/lib/utils/actionMap.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`.

### Runtime action view resolution (`ViewActionRouter`)

- What it is: a view-component multiplexer that selects a concrete component based on (a) loading state, (b) action/transition existence, and (c) whether the action maps to built-in CRUD components or project-provided action views.
- Why it exists: routing is metadata-driven; the component matrix is resolved at runtime instead of statically enumerating routes.
- Where it lives: `client/lib/views/ViewActionRouter.vue`, `client/tests/unit/lib/views/ViewActionRouter.spec.js`.

### Built-in CRUD component registry (`crudComponents`)

- What it is: a mapping from route action strings (e.g. `list`, `create`, `read`) to lazy component loaders, with an override merge mechanism.
- Why it exists: built-in CRUD actions are handled via a stable component registry while allowing consumers to override/extend entries.
- Where it lives: `client/lib/router/routerComponent.js`, `client/tests/unit/lib/router/routerComponent.spec.js`, `client/lib/views/ViewActionRouter.vue`.

### RouteLocation builder (`getCRUDForTo`)

- What it is: an async helper that constructs a `to`-object targeting the CRUD route family, choosing detail vs list route name based on the PK shape.
- Why it exists: callers can generate consistent route targets without duplicating route naming/path conventions.
- Where it lives: `client/lib/router/getCrud.js`, `client/tests/unit/lib/router/getCrud.spec.js`.

## Relevant Implementation Surface

- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.router/getCrud.getCRUDForTo}`
- `{@api js:function:@arrai-innovations/vueda.router/routerComponent.setCrudComponents}`
- `{@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.use/useWorkflowTransitions.useWorkflowTransitions}`
- `{@api vue:component:ViewActionRouter}`
- `{@api vue:component:ViewWorkflowTransition}`
- `{@api vue:component:ViewAction}`
- `{@api vue:component:ViewActionNotFound}`
- `{@api vue:component:ViewLoading}`

## Contracts and Invariants

- `makeCRUDRoutes` returns exactly two routes named `actionrouter.detailview` (`/:app/:model/:action/:pk`) and `actionrouter.listview` (`/:app/:model/:action/`), and both routes share the same `beforeEnter` guard array instance. Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.
- `makeCRUDRoutes` requires a non-null `actionRedirect` so `requireModelInfo` failure paths (missing model/action) can return a redirect route. Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`, `client/lib/router/guards.js`.
- List-route PK multi-selection is encoded as `query.pk` (comma-delimited text) and is passed to the route component as `props.pk = query.pk.split(",")`. Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.
- Detail-route object identity is `params.pk` and is passed to the route component as `props.pk = params.pk` (string). Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.
- `makeCRUDRoutes` always applies `requireModelInfo` and conditionally applies `requireAuth` and `requireGroups` based on provided redirect/group parameters; guard ordering is `requireAuth?` → `requireModelInfo` → `requireGroups?`. Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.
- `requireModelInfo` computes the allowlist from `modelInfo.actions[].name`, optionally filters it by `config.routeActions` when `routeActions` is an array, then unions workflow transition codes (`transition.code`) into the allowlist. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- `requireModelInfo` matches the route action using `getActionName(to.params.action)` against the computed allowlist; normalization is part of the guard’s contract. Anchors: `client/lib/router/guards.js`, `client/lib/utils/actionMap.js`.
- `requireModelInfo` failure signaling is toast-first: missing/forbidden action emits an `"Action Not Found"` error toast and returns a resolved redirect; missing model emits a `"Model Not Found"` error toast and returns a resolved redirect. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- `requireModelInfo` only catches `ModelInfoError` as a typed missing-model surface; other exceptions are re-thrown and abort navigation. Anchors: `client/lib/router/guards.js`.
- `ViewActionRouter` resolution order is: model-config loading → reserved `"transition"` action → missing metadata (no actions and no transitions) → unknown action/transition → built-in CRUD component resolution (`crudComponents[actionStr]`) → project action component resolution (dynamic `@/views/...` imports) → `ViewAction` fallback. Anchors: `client/lib/views/ViewActionRouter.vue`, `client/tests/unit/lib/views/ViewActionRouter.spec.js`, `client/lib/router/routerComponent.js`.
- `ViewActionRouter` uses normalized `actionName = getActionName(props.action)` for matching (`actions[].name`, `transition.code`) but uses the raw `props.action` string for the `crudComponents` registry key and for dynamic import naming. Anchors: `client/lib/views/ViewActionRouter.vue`, `client/lib/utils/actionMap.js`, `client/lib/router/routerComponent.js`.
- `getCRUDForTo` always fetches model-info for `{app, model}` and returns a route target to `actionrouter.detailview` when `pk` is a scalar, or to `actionrouter.listview` when `pk` is an array (encoded into `query.pk`). Anchors: `client/lib/router/getCrud.js`, `client/tests/unit/lib/router/getCrud.spec.js`.

## Footguns

- Missing `actionRedirect` is a route-build hard error: `makeCRUDRoutes` throws if `actionRedirect` is falsy. Symptom: router bootstrap fails before any navigation occurs. Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.
- `actionRedirect` destination can loop if it points at a route gated by `requireModelInfo` (including another route in the CRUD route family). Symptom: repeated redirects with `"Action Not Found"` / `"Model Not Found"` toasts and no stable landing view. Anchors: `client/lib/router/makeCrud.js`, `client/lib/router/guards.js`.
- Toast service is assumed present: `requireModelInfo` and `requireGroups` call `instance.config.globalProperties.$toast.add(...)` without guarding null/undefined. Symptom: `TypeError` during guard evaluation when `$toast` is not registered. Anchors: `client/lib/router/guards.js`.
- Legacy `config.routerActions` is ignored (with a one-time warning) and does not filter action gating. Symptom: console warning and unexpected route access for actions thought to be disabled via `routerActions`. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- `config.routeActions` filtering is applied against canonical model-info action names and does not normalize via `getActionName`. Symptom: using UI route names (e.g. `read`) in `routeActions` can yield `"Action Not Found"` toast + redirect even when the equivalent canonical action (e.g. `retrieve`) exists. Anchors: `client/lib/router/guards.js`, `client/lib/utils/actionMap.js`, `server/vueda/info/serializers.py` (`ModelInfoSerializer.get_model_actions`).
- Workflow transition shape is strict at the guard boundary: transition entries missing a string `code` cause the guard to throw rather than silently treating them as unavailable. Symptom: rejected navigation with `requireModelInfo: workflow transition is missing a string code` error. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Workflow transition fetch errors are not converted into user-facing redirects by `requireModelInfo` (only `ModelInfoError` is handled). Symptom: navigation aborts with a thrown error; subsequent attempts may short-circuit to the cached workflow-store error for the same `app.model`. Anchors: `client/lib/router/guards.js`, `client/lib/stores/storeWorkflow.js`.
- Comma-delimited PK arrays are lossy if a string PK itself contains commas. Symptom: list-route PK reconstruction mis-splits values, causing wrong selection context. Anchors: `client/lib/router/makeCrud.js`, `client/lib/router/getCrud.js`.
- `getCRUDForTo({ throwOnUndefinedPk: true })` checks `modelInfo.actions[].detail` but currently throws when `pk` is missing for non-detail actions and does not throw for detail actions (error message still references detail views). Symptom: unexpected thrown error when constructing a route target, with misleading message. Anchors: `client/lib/router/getCrud.js`, `client/tests/unit/lib/router/getCrud.spec.js`.

## Suggested Outline

- `## Route Records and Names`
- `## Route Guard Chain`
- `## Metadata and Allowlist Inputs`
- `## Action Name Normalization`
- `## Action and Transition Matching`
- `## View Component Resolution Order`
- `## Observable Failure Modes`
