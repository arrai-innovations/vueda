---
title: Reactive Data Flow (Stores + Composables)
type: explanation
audience: implementor
status: briefing
---

# Reactive Data Flow (Stores + Composables)

## Intent and Scope

- Define the client-side authority boundary between:
  - Pinia stores as shared caches and normalization points.
  - Composables as component-scoped reactive adapters over those caches.
  - Router guards as non-component prefetch/gating code paths that must not create component-scoped reactive effects.
- Describe the contracts governing cache keys, in-flight de-duplication, error memoization, and reference stability.
- Focus on metadata/config/workflow/choices flows (not object CRUD payload shapes).
- Source anchors: `client/lib/stores/storeModelInfo.js`, `client/lib/stores/storeModelConfig.js`, `client/lib/stores/storeModelChoices.js`, `client/lib/stores/storeWorkflow.js`, `client/lib/use/useModelInfo.js`, `client/lib/use/useModelConfig.js`, `client/lib/use/useModelChoices.js`, `client/lib/use/useWorkflowTransitions.js`, `client/lib/router/guards.js`, `client/lib/utils/fetchSupport.js`, `client/lib/use/useIsActive.js`.

## Non-goals

- Not a how-to for building a view or wiring router guards.
- Not a tutorial on Vue reactivity, Pinia, or `watch` semantics.
- Not an exhaustive reference for every store/composable in `client/lib/`.

## Key Concepts

### Store is the cache + normalization authority

- What it is: store actions fetch remote data, normalize wire shapes, and persist results in keyed maps.
- Why it exists: shared caches de-duplicate reads across components/routes and provide a single normalization point.
- Where it lives: `client/lib/stores/storeModelInfo.js:253`, `client/lib/stores/storeModelConfig.js:403`, `client/lib/stores/storeModelChoices.js:42`, `client/lib/stores/storeWorkflow.js:215`.

### Cache keys define identity and reuse

- What it is: store entries are keyed by `app.model` (`getAppModelDotName`) and sometimes `app.model.view` (`getAppModelViewDotName`).
- Why it exists: key choice is the boundary for reuse versus recomputation across route/app/model/view changes.
- Where it lives: `client/lib/utils/case.js` (key helpers), `client/lib/stores/storeModelInfo.js:264`, `client/lib/stores/storeModelConfig.js:446-449`, `client/lib/stores/storeModelChoices.js:51-52`, `client/lib/stores/storeWorkflow.js:246-247`.

### In-flight de-duplication is explicit (promise memoization)

- What it is: stores retain the active request Promise per key and return it to concurrent callers.
- Why it exists: prevents duplicate network requests for the same identity during a single fetch window.
- Where it lives: `client/lib/stores/storeModelInfo.js:274-275`, `client/lib/stores/storeModelChoices.js:75-77`, `client/lib/stores/storeWorkflow.js:257-258`, `client/lib/stores/storeModelConfig.js:454-457`.

### Error memoization is store-specific (and changes retry semantics)

- What it is: some stores cache the first failure per key and reject future calls without refetching.
- Why it exists: prevents repeated failing fetches for the same identity from thrashing the server.
- Where it lives: `client/lib/stores/storeModelInfo.js:266-273`, `client/lib/stores/storeWorkflow.js:248-256`. (Contrast: `client/lib/stores/storeModelChoices.js` has no `errors` cache.)

### Composable is the component-scoped reactive adapter

- What it is: composables watch reactive inputs, call store actions, and expose `toRef(...)` pointers into store state.
- Why it exists: components consume stable references and a consistent loading/error surface without directly managing fetch lifecycles.
- Where it lives: `client/lib/use/useModelInfo.js:71-107`, `client/lib/use/useModelConfig.js:106-141`, `client/lib/use/useModelChoices.js:76-120`, `client/lib/use/useWorkflowTransitions.js:65-112`.

### Activity gating is a first-class lifecycle boundary

- What it is: fetch watches are gated behind an `isActive` ref driven by `onMounted` / `onActivated` / `onDeactivated`.
- Why it exists: prevents fetches and watchers from running while a component is inactive (not mounted / deactivated).
- Where it lives: `client/lib/use/useIsActive.js:9-21`, and its use in `client/lib/use/useModelInfo.js:71-76`, `client/lib/use/useModelConfig.js:106-111`, `client/lib/use/useWorkflowTransitions.js:65-70`, `client/lib/use/useModelChoices.js:88-93`.

### Router guards are store-only (composables are out of scope)

- What it is: guard prefetch/gating runs through store actions (and not composables), since composables bind Vue lifecycle hooks and component-scoped watches.
- Why it exists: guards run outside component setup; guard work is expressed as plain async functions returning booleans/redirects.
- Where it lives: `client/lib/router/guards.js:50-62`, `client/lib/router/guards.js:287-318`, `client/lib/use/useIsActive.js:9-20`, `client/lib/use/useModelConfig.js:59-63`.

### Derived configuration is downstream of model-info

- What it is: config defaults are derived from model-info, then merged with generic/view-specific overrides into a cached built config.
- Why it exists: model-info is the authoritative enumeration of fields/actions/expands/order/filter; config is an overlay and view projection.
- Where it lives: `client/lib/stores/storeModelConfig.js:106-165`, `client/lib/stores/storeModelConfig.js:461-499`, `client/lib/use/useModelConfig.js:121-130`, `client/lib/utils/actionMap.js:1-7`.

### Choices fetching is “fresh-by-default” with in-flight de-duplication only

- What it is: choices endpoints are fetched whenever requested; only concurrent requests share a Promise.
- Why it exists: avoids long-lived choice caches in store state while still preventing duplicate concurrent requests.
- Where it lives: `client/lib/stores/storeModelChoices.js:91-119`, `client/lib/stores/storeModelChoices.js:64-90`, `client/lib/use/useModelChoices.js:94-110`.

## Relevant Implementation Surface

- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelInfo.storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelChoices}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelChoices.storeModelChoices}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeWorkflow.storeWorkflow}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelInfo.useModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelChoices}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelChoices.useModelChoices}`
- `{@api js:module:@arrai-innovations/vueda.use/useWorkflowTransitions}`
- `{@api js:function:@arrai-innovations/vueda.use/useWorkflowTransitions.useWorkflowTransitions}`
- `{@api js:module:@arrai-innovations/vueda.use/useIsActive}`
- `{@api js:module:@arrai-innovations/vueda.router/guards}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.waitForModelStoreLoad}`
- `{@api js:module:@arrai-innovations/vueda.utils/fetchSupport}`
- `{@api js:function:@arrai-innovations/vueda.utils/fetchSupport.fetchHelper}`

## Contracts and Invariants

- `storeModelInfo.fetchModelInfo` caches successful responses by `key = getAppModelDotName({app, model})`; subsequent calls for the same key resolve synchronously from `infos[key]`. Anchors: `client/lib/stores/storeModelInfo.js:264-269`, `client/lib/stores/storeModelInfo.js:354-357`.
- `storeModelInfo.fetchModelInfo` memoizes in-flight work in `promises[key]` and clears it in `.finally`, so concurrent callers share one request window. Anchors: `client/lib/stores/storeModelInfo.js:274-275`, `client/lib/stores/storeModelInfo.js:297-365`, `client/lib/stores/storeModelInfo.js:367-368`.
- `storeModelInfo.fetchModelInfo` memoizes the first error in `errors[key]` and rejects future calls for that key while the cached error remains. Anchors: `client/lib/stores/storeModelInfo.js:266-273`, `client/lib/stores/storeModelInfo.js:358-361`.
- Model-info normalization in `storeModelInfo` includes: stripping `model_` prefixes, rewriting `expands` → `expand`, camelCasing nested objects for `fields`, `filtering`, and nested payloads, and setting `data.pk` by scanning `data.fields` for `{pk: true}`; missing PK throws. Anchors: `client/lib/stores/storeModelInfo.js:307-353`.
- `storeModelConfig.getConfig` is downstream of model-info: it awaits `storeModelInfo.fetchModelInfo`, derives defaults from the returned model-info object, merges generic + view-specific overrides, caches the built config under `builtConfigs[builtKey]`, and reuses it on subsequent calls. Anchors: `client/lib/stores/storeModelConfig.js:106-165`, `client/lib/stores/storeModelConfig.js:461-502`, `client/lib/stores/storeModelConfig.js:449-452`.
- `storeModelConfig.getConfig` memoizes in-flight builds in `initialized[builtKey]`; callers share a Promise while initialization is in progress. Anchors: `client/lib/stores/storeModelConfig.js:454-457`, `client/lib/stores/storeModelConfig.js:462-509`.
- Cancellation surface exists at the fetch layer (`fetchHelper` attaches `promise.cancel()` via `AbortController`) and is forwarded by `storeModelConfig.getConfig` for in-flight model-info fetches. Anchors: `client/lib/utils/fetchSupport.js:49-99`, `client/lib/stores/storeModelConfig.js:468-471`, `client/lib/stores/storeModelConfig.js:503-506`.
- `storeModelChoices.fetchChoices` and `.fetchFilterChoices` de-duplicate concurrent work via per-field Promise memoization, but do not short-circuit based on existing stored choices. Anchors: `client/lib/stores/storeModelChoices.js:64-90`, `client/lib/stores/storeModelChoices.js:91-119`.
- `useModelInfo` sets its `info` reference to `toRef(modelInfoStore.infos, key)` only after `fetchModelInfo` resolves; prior to that it exposes a placeholder object to satisfy expected shape. Anchors: `client/lib/use/useModelInfo.js:47-68`, `client/lib/use/useModelInfo.js:91-103`.
- `useModelConfig` maps `view` to an action name via `getActionName(view)`, fetches a built config for that `{app, model, view}`, and sets `config` to a `toRef` into `storeModelConfig.builtConfigs[key]` after the async boundary. Anchors: `client/lib/use/useModelConfig.js:121-130`, `client/lib/utils/actionMap.js:1-7`.
- `storeWorkflow.fetchWorkflowTransition` caches successful results and memoizes the first error per `app.model` key (same retry behavior as `storeModelInfo`). Anchors: `client/lib/stores/storeWorkflow.js:246-256`, `client/lib/stores/storeWorkflow.js:268-284`.
- `useWorkflowTransitions` fetches transitions once per `app.model` key, then sets `transitions` to `toRef(workflowStore.workflowTransitions, key)` when the store entry exists. Anchors: `client/lib/use/useWorkflowTransitions.js:65-92`, `client/lib/use/useWorkflowTransitions.js:94-112`.
- Router guard prefetch uses stores directly (not composables) and loads workflow transitions, model-info, and config in one async path. Anchors: `client/lib/router/guards.js:50-62`.

## Footguns

- Cached failure prevents retry (model-info). Symptoms: repeated calls to `storeModelInfo.fetchModelInfo` reject immediately without issuing a new fetch for the same `app.model`. Anchors: `client/lib/stores/storeModelInfo.js:266-273`, `client/lib/stores/storeModelInfo.js:358-361`.
- Missing PK marker becomes a sticky failure. Symptoms: `storeModelInfo.fetchModelInfo: no pk field found for <app.model>` is thrown during normalization and then cached under `errors[key]`. Anchors: `client/lib/stores/storeModelInfo.js:346-361`.
- Root-key casing drift is observable. Symptoms: accessing root keys such as `info.verboseName` yields `undefined` while `storeModelConfig` defaults read `modelInfo.verbose_name` / `verbose_name_plural`. Anchors: `client/lib/stores/storeModelInfo.js:309-343`, `client/lib/stores/storeModelConfig.js:133-136`.
- Guard/composable boundary confusion. Symptoms: calling `useModelConfig` / `useModelInfo` from guard code will create component-scoped watches gated by `isActive`, but guards never run in an instance where `useIsActive`’s lifecycle hooks can transition `isActive` to `true`; guard code therefore uses stores directly. Anchors: `client/lib/router/guards.js:51-62`, `client/lib/use/useModelConfig.js:59-66`, `client/lib/use/useModelInfo.js:71-78`, `client/lib/use/useIsActive.js:9-20`.
- Guard/composable boundary confusion. Symptoms: guards execute outside component setup (no active component instance); calling `useModelConfig` / `useModelInfo` from guard code therefore registers component-lifecycle hooks via `useIsActive` and creates watches that are gated by `isActive`, but `isActive` never transitions to `true` because the lifecycle hooks never run; `useModelConfig` also allocates an `effectScope` with no component lifecycle owner for teardown. Anchors: `client/lib/router/guards.js:51-62`, `client/lib/use/useModelConfig.js:59-66`, `client/lib/use/useModelInfo.js:71-78`, `client/lib/use/useIsActive.js:9-20`.
- Workflow object transition fetch has inconsistent promise cleanup. Symptoms: after a failed `fetchObjectTransitions`, subsequent calls can keep returning the same cached/rejected Promise because `.finally` deletes from `promises.objectStates` instead of `promises.objectTransitions`. Anchors: `client/lib/stores/storeWorkflow.js:398-424`.
- Workflow object state/history fetch require pre-initialized nested maps. Symptoms: `fetchObjectState` and `fetchObjectHistory` index into `objectStates[key]` / `objectHistories[key]` and their `promises`/`errors` siblings without creating the per-`app.model` objects; cold calls can throw `TypeError`. Anchors: `client/lib/stores/storeWorkflow.js:333-345`, `client/lib/stores/storeWorkflow.js:426-438`, `client/tests/unit/lib/stores/storeWorkflow.spec.js:115-131`, `client/tests/unit/lib/stores/storeWorkflow.spec.js:152-168`.

## Suggested Outline

- `## Boundary and Authority`
- `## Identity Keys and Cache Partitions`
- `## Store Fetch Lifecycles and Normalization`
- `## Composable Reactive Adapters`
- `## Loading/Error Surfaces`
- `## Route Guard Prefetch Boundary`
- `## Observable Failure Signatures`
