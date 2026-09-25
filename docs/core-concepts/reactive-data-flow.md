---
title: Reactive Data Flow (Stores + Composables)
type: explanation
audience: integrator
status: draft
---

# Reactive Data Flow (Stores + Composables)

VUEDA's client runtime divides reactive data flow across three layers with distinct authority boundaries: Pinia stores its own caching and normalization, composables provide component-scoped reactive adapters over those caches, and router guards prefetch data through stores without creating component-scoped reactive effects. Each layer has a specific role in the fetch lifecycle, and using the wrong layer in the wrong context can result in failures ranging from duplicate network requests to permanently stuck watchers.

This page explains the authority each layer holds, the identity keys that partition cache state, and the fetch lifecycle contracts that govern de-duplication, error caching, and reference stability. The focus is on metadata, config, workflow, and choice flows, not on object {@term CRUDL} payload shapes, which follow different caching and invalidation rules. For the configuration overlay that consumes model-info metadata, see [Configuration Surface and Defaults](./configuration-surface-and-defaults). For how cancellation propagates through the fetch layer, see [Cancellable Network Operations](./cancellable-network-operations). For how the server produces the metadata that stores consume, see [Server-Client Metadata Contract](./server-client-metadata-contract).

## Boundary and Authority

The three layers (stores, composables, and guards) are not interchangeable paths to the same data. Each occupies a distinct position in the application lifecycle and carries authority over a specific concern.

Stores are the cache and normalization authority. Store actions fetch remote data, normalize the wire shape into the client's internal representation, and persist results in keyed reactive maps. All downstream consumers (composables, guards, view components) read from these maps. Stores do not bind to component lifecycle events; they exist for the lifetime of the Pinia instance and are shared across all components and routes. When two components need the same model-info object, both read from the same store entry rather than issuing independent fetches.

Composables are component-scoped reactive adapters. They watch reactive inputs (typically route parameters like `app`, `model`, and `view`), invoke store actions when inputs change, and expose `toRef(...)` pointers into store state. Composables bind to component lifecycle hooks through {@api js:module:@arrai-innovations/vueda/use/useIsActive}, which gates fetch watches behind `onMounted` / `onActivated` / `onDeactivated`. This gating prevents fetches from running when a component is inactive, either because it has not yet mounted or because it has been deactivated by `<KeepAlive>`. Composables also provide a consistent loading/error surface so that components do not need to manage fetch state directly.

Router guards are store-only consumers. Guards run outside component setup; there is no active component instance, no lifecycle hook registration, and no reactive scope owned by a component. Guard code calls store actions directly (for example, `storeModelInfo().fetchModelInfo(...)`) and awaits the result as a plain async operation. Composables must not be called from guards, because composables register lifecycle hooks via `useIsActive` and create watches gated by `isActive`, but `isActive` never transitions to `true` outside a component context. Guard work is expressed as plain async functions that return booleans or redirect objects.

## Identity Keys and Cache Partitions

Store entries are keyed by identity strings that determine when data is reused versus refetched. The key choice is the boundary between shared cache hits and independent fetch cycles.

Most stores partition by `app.model`, computed by `getAppModelDotName({app, model})`. Model-info, workflow transitions, and choices all use this key granularity. A single model-info fetch for `myapp.widget` serves every component, guard, and composable that references the same model, regardless of which view or route triggered the fetch.

Model configuration adds a second dimension. `storeModelConfig` keys its built configs by `app.model.view`, computed by `getAppModelViewDotName`. This finer-grained key exists because configuration is view-specific: the list, detail, and `create` views for the same model may have different field sets, `expand` defaults, and action routing. A config built for `myapp.widget.list` is not reused for `myapp.widget.read`.

Choices stores partition at a finer granularity than other metadata stores. Choice fetches are keyed by model and field identity, so `storeModelChoices` maintains per-field entries within the `app.model` namespace. Filter choices follow the same pattern but use a separate code path from object-field choices.

## Store Fetch Lifecycles and Normalization

Each store follows a common fetch lifecycle pattern, but the specifics of caching, de-duplication, and error handling vary by store.

**Fetch, cache, and short-circuit.** When a store action is called, it first checks whether the result already exists in the cache map for the given key. If so, it resolves immediately from cache without issuing a network request. {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo} checks `infos[key]`, `storeModelConfig.getConfig` checks `builtConfigs[builtKey]`, and `storeWorkflow.fetchWorkflowTransition` checks `workflowTransitions[key]`. This short-circuit makes repeated calls for the same identity essentially free after the initial fetch.

**In-flight de-duplication (promise memoization).** When a fetch is in progress, the store retains the active Promise in a `promises` map keyed by the same identity string. Concurrent callers receive the same Promise rather than triggering a second network request. The memoized Promise is cleared in a `.finally` handler after resolution or rejection, so the next call after completion will either hit the cache (on success) or the error cache (on failure). All four metadata stores (model-info, model-config, workflow, and choices) implement this pattern.

**Normalization.** Model-info normalization is the most involved. `storeModelInfo` strips `model_` prefixes from top-level keys, rewrites `expands` to `expand`, and camelCases every top-level key, so `verbose_name` becomes `verboseName` and `column_totals` becomes `columnTotals`. It camelCases the descriptors inside `fields`, `filtering`, and `expand` and keeps their field-name keys, because those names are server lookup keys. It then identifies the primary key field by scanning `data.fields` for an entry with `{pk: true}`. If no PK field is found, the normalization throws an error, which is cached (see below).

**Error memoization.** Some stores cache the first failure per key and reject all future calls for that key without refetching. `storeModelInfo` and `storeWorkflow` both implement this pattern. Once an error is cached in `errors[key]`, subsequent calls check the errors map before the promises map and reject immediately. This prevents repeated failing fetches from thrashing the server, but it also means that a transient failure (network blip, server restart) becomes sticky until the store is reset or the page is reloaded. Not all stores do this: `storeModelChoices` has no `errors` cache and will retry on every call.

**Derived configuration.** `storeModelConfig.getConfig` is not a direct fetch; it is downstream of model-info. It first awaits `storeModelInfo.fetchModelInfo` to obtain the model-info object, then derives default config values from it (field lists, `expand` defaults, action routing), merges generic and view-specific overrides from any project-supplied config, and caches the merged result under `builtConfigs[builtKey]`. The build itself is memoized in `initialized[builtKey]`, so concurrent callers share the build Promise in the same way that concurrent fetchers share a network Promise.

**Choices: fresh-by-default.** Unlike model-info and workflow, choices stores do not short-circuit based on existing stored values. `storeModelChoices.fetchChoices` and `fetchFilterChoices` de-duplicate concurrent work via per-field Promise memoization, but every non-concurrent call triggers a fresh network request. This design avoids long-lived choice caches that could go stale if the backing data changes, while still preventing duplicate requests during a single render cycle.

## Composable Reactive Adapters

Composables bridge the gap between store state and component rendering. They provide three things that stores do not: reactive input watching, activity gating, and a consistent loading/error interface.

**Reactive input watching.** Each composable watches its reactive inputs, typically `app`; `model`; and optionally `view` and re-invokes the corresponding store action when those inputs change. When a user navigates from one model to another, the composable's watcher fires, fetches new data from the store, and updates its exposed references. Components do not need to manage this lifecycle; they consume the composable's refs and react to changes.

**Activity gating.** Composable fetch watches are gated behind an `isActive` ref provided by `useIsActive`. This ref starts as `false` and transitions to `true` on `onMounted` or `onActivated`, and back to `false` on `onDeactivated`. The gate prevents fetches from running during component setup (before mount) or while a component is deactivated inside a `<KeepAlive>` wrapper. Without this gate, a deactivated component's watchers could trigger fetches for stale route parameters.

**Reference stability.** After a successful fetch, composables set their exposed ref to a `toRef(...)` pointer into the store's reactive map. `useModelInfo` sets `info` to `toRef(modelInfoStore.infos, key)`, `useModelConfig` sets `config` to `toRef(storeModelConfig.builtConfigs, key)`, and `useWorkflowTransitions` sets `transitions` to `toRef(workflowStore.workflowTransitions, key)`. This pointer-based approach means that if the store entry is updated later (for example, after a config override is applied), the composable's ref automatically reflects the change without re-fetching.

Prior to the first successful fetch, composables expose a placeholder object that satisfies the expected shape. `useModelInfo` provides a placeholder with empty defaults so that template code can safely access properties without null-checking during the loading window.

## Loading and Error Surfaces

Composables expose loading and error state as reactive refs. The loading ref is `true` while a fetch is in progress and `false` once it resolves or rejects. The error ref captures the rejection value when a fetch fails.

For stores with error memoization (model-info, workflow), the error surface is sticky: once an error is cached, the composable's error ref reflects that cached error on every subsequent navigation to the same model key, without re-attempting the fetch. Components that render error states should be aware that the error may represent a historical failure, not a current one.

For choices with no error memoization, each fetch attempt can succeed or fail independently. The composable's error state resets on each new fetch cycle.

`useModelConfig` has a compounding loading surface because its fetch is downstream of model-info. If model-info fails, the config fetch never starts, and the config composable's error state reflects the upstream failure rather than a config-specific issue.

## Route Guard Prefetch Boundary

Router guards prefetch data that views will need, but they do so exclusively through stores. The {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo} guard loads workflow transitions, model-info, and config in a single async path by calling store actions directly. This prefetch populates the store's caches so that when the destination component mounts and its composables initialize, the data is already available, and the composables' first fetch resolves immediately from cache.

Guards must not call composables. Composables depend on `useIsActive` to gate their watches, and `useIsActive` registers `onMounted` / `onActivated` / `onDeactivated` hooks. In the guard context, there is no component instance, so these hooks never fire, `isActive` never becomes `true`, and the composable's watches never execute. Additionally, `useModelConfig` allocates an `effectScope` that expects a component lifecycle owner for teardown. Creating this scope in the guard context leaks memory because nothing will dispose of it.

The guard/store boundary also means that guard errors follow store error semantics. If a guard's `fetchModelInfo` call fails, the error is cached in the model-info store. Subsequent navigation attempts to the same model, including retries, will hit the cached error and reject without a network request until the store is explicitly reset.

## Observable Failure Signatures

The layered architecture produces several characteristic failure patterns.

**Cached failure prevents retry.** Repeated calls to `storeModelInfo.fetchModelInfo` or `storeWorkflow.fetchWorkflowTransition` for a key that previously failed reject immediately without issuing a new fetch. The only recovery path is to reset the store or reload the page. This affects both composable-driven and guard-driven fetch paths.

**Missing PK marker becomes a sticky failure.** If the server's model-info response does not include a field with `{pk: true}`, the normalization step in `storeModelInfo` throws `"no pk field found for <app.model>"`. This error is cached in `errors[key]`, so the model becomes permanently inaccessible until the store is reset. The root cause is always a server-side serializer that omits the PK field from the model-info payload.

**Guard/composable boundary confusion.** Calling composables from guard code is a silent failure. The composable initializes, registers lifecycle hooks that never fire, creates watchers gated by `isActive` that never become `true`, and potentially leaks `effectScope` allocations. No error is thrown; the composable simply never produces data.

**Workflow transition promise cleanup mismatch.** After a failed `fetchObjectTransitions`, subsequent calls can return the same cached rejected Promise because the `.finally` handler deletes from `promises.objectStates` instead of `promises.objectTransitions`. This means the de-duplication key is never cleared, and the rejected Promise persists.

**Workflow object state/history cold-call failure.** `fetchObjectState` and `fetchObjectHistory` index into nested maps (`objectStates[key]`, `objectHistories[key]`) without initializing the per-`app.model` container objects. A cold call, one where no prior fetch has initialized the nested map for that key, can throw `TypeError` when trying to index into an undefined object.

## Relevant Implementation Surface

- {@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
- {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelChoices}
- {@api js:function:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices}
- {@api js:module:@arrai-innovations/vueda/stores/storeWorkflow}
- {@api js:function:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow}
- {@api js:module:@arrai-innovations/vueda/use/useModelInfo}
- {@api js:function:@arrai-innovations/vueda/use/useModelInfo#useModelInfo}
- {@api js:module:@arrai-innovations/vueda/use/useModelConfig}
- {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}
- {@api js:module:@arrai-innovations/vueda/use/useModelChoices}
- {@api js:function:@arrai-innovations/vueda/use/useModelChoices#useModelChoices}
- {@api js:module:@arrai-innovations/vueda/use/useWorkflowTransitions}
- {@api js:function:@arrai-innovations/vueda/use/useWorkflowTransitions#useWorkflowTransitions}
- {@api js:module:@arrai-innovations/vueda/router/guards}
- {@api js:function:@arrai-innovations/vueda/router/guards#waitForModelStoreLoad}
- {@api js:module:@arrai-innovations/vueda/utils/fetchSupport}
- {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#fetchHelper}
