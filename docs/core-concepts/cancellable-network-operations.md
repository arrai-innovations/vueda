---
title: Cancellable Network Operations
type: explanation
audience: implementor
status: briefing
---

# Cancellable Network Operations

## Intent and Scope

- Define the client-side cancellation contract for network-bound operations that return cancellable (or maybe-cancellable) Promises.
- Define the enforcement surfaces for cancellation: transport abort, consumer-level deduplication, and post-response state gating.
- Define lifecycle authority boundaries for cancellation across stores, composables, and view-level handlers.
- Define observable failure surfaces when cancellation interacts with caching, batching, and reactive scopes.
- Source anchors: `client/lib/utils/fetchSupport.js`, `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/use/useLookupContext.js`, `client/lib/use/useResolvedLookupObject.js`, `client/lib/use/useWarnings.js`, `client/lib/views/ViewActivate.vue`, `client/lib/views/ViewDeactivate.vue`, `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/utils/fetchSupport.spec.js`, `client/tests/unit/lib/utils/objectCrud.spec.js`, `client/tests/unit/lib/use/useLookupContext.spec.js`, `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellablePromise.js`, `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellableFetch.js`.

## Non-goals

- Not a how-to for wiring cancellation into components or handlers.
- Not a UX policy for loading spinners, retry buttons, or error presentation.
- Not a guarantee about server-side work termination after client aborts.
- Not a complete inventory of every call site that may invoke `.cancel()`.

## Key Concepts

### Promise-level cancellation is the contract surface

- What it is: cancellation is expressed as a `.cancel(...)` method attached to a returned Promise; some APIs explicitly return `MaybeCancellablePromise` (optional `.cancel`). Anchors: `client/lib/utils/fetchSupport.js`, `client/lib/stores/storeModelInfo.js`, `client/lib/use/useResolvedLookupObject.js`.
- Why it exists: cancellation is propagated across module boundaries as Promise identity, not as shared ownership of an `AbortController`. Anchors: `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellablePromise.js`, `client/lib/utils/fetchSupport.js`.
- Where it lives: typedefs for `CancellablePromise` / `MaybeCancellablePromise` and consumers checking `?.cancel`. Anchors: `client/lib/utils/fetchSupport.js`, `client/lib/use/useResolvedLookupObject.js`.

### Transport abort and state-gating are distinct mechanisms

- What it is: transport abort cancels fetch via `AbortController.abort(reason)` (e.g., `fetchHelper`, reactive-helpers `cancellableFetch`, and some direct-fetch call sites); state-gating prevents post-response writes when a request becomes obsolete (`isCancelled.value`). Anchors: `client/lib/utils/fetchSupport.js`, `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/views/ViewActivate.vue`, `client/lib/views/ViewDeactivate.vue`, `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellableFetch.js`.
- Why it exists: transport abort can cause the underlying fetch to reject before transform/state application; state-gating prevents stale writes even when transport cancellation is not available or is not the only failure mode. Anchors: `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellableFetch.js`, `client/lib/utils/listCrud.js`.
- Where it lives: abort controllers in `client/lib/utils/fetchSupport.js`, `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/views/ViewActivate.vue`, `client/lib/views/ViewDeactivate.vue`, `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellableFetch.js`; `isCancelled` guards in `client/lib/utils/listCrud.js`.

### Async wrapping is cancellation-destructive

- What it is: several network adapters are explicitly non-`async` to avoid returning a different Promise instance that omits `.cancel`. Anchors: `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/use/useWarnings.js`.
- Why it exists: `.cancel` is attached to the specific Promise instance returned by the adapter; re-wrapping changes identity and can drop the method. Anchors: `client/lib/utils/objectCrud.js`.
- Where it lives: inline comments `This function cannot be async...`. Anchors: `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/use/useWarnings.js`.

### Lookup batching introduces multi-consumer cancellation semantics

- What it is: `useLookupContext` batches and deduplicates lookups by `(app.model, fields, expand)` key and per-PK; each consumer receives a cancellable wrapper whose cancellation may or may not abort the shared underlying request. Anchors: `client/lib/use/useLookupContext.js`, `client/tests/unit/lib/use/useLookupContext.spec.js`.
- Why it exists: multiple scopes can depend on the same lookup without fan-out network requests, while still allowing per-consumer scope disposal. Anchors: `client/lib/use/useLookupContext.js`.
- Where it lives: `consumerPromises`/`inflightPromises` tracking and `newPromiseUnwrapper(...)` cancellation logic. Anchors: `client/lib/use/useLookupContext.js`.

## Relevant Implementation Surface

- `{@api js:function:@arrai-innovations/vueda.utils/fetchSupport.fetchHelper}`
- `{@api js:type:@arrai-innovations/vueda.utils/fetchSupport.CancellablePromise}`
- `{@api js:type:@arrai-innovations/vueda.utils/fetchSupport.MaybeCancellablePromise}`
- `{@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectCreate}`
- `{@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectDelete}`
- `{@api js:function:@arrai-innovations/vueda.utils/listCrud.singlePagePaginatedListCrudAdaptor}`
- `{@api js:function:@arrai-innovations/vueda.utils/listCrud.allPagePaginatedListCrudAdaptor}`
- `{@api js:function:@arrai-innovations/vueda.use/useLookupContext.useLookupContext}`
- `{@api js:function:@arrai-innovations/vueda.use/useResolvedLookupObject.useResolvedLookupObject}`
- `{@api js:function:@arrai-innovations/vueda.use/useWarnings.useWarnings}`

## Contracts and Invariants

- `fetchHelper(...)` always supplies `credentials: "include"` and an `AbortSignal`; `.cancel()` calls `AbortController.abort()`. Anchors: `client/lib/utils/fetchSupport.js`, `client/tests/unit/lib/utils/fetchSupport.spec.js`.
- `fetchHelper(...)` rejects both non-`ok` HTTP responses and fetch-level errors by constructing the provided `ErrorClass` (default `FetchError`); fetch-level errors (including aborts) are not special-cased. Anchors: `client/lib/utils/fetchSupport.js`.
- `cancellableFetch(...)` always uses its own `AbortController` for the `fetch(...)` call; if `init.signal` is provided, it is bridged into the internal controller (including propagating `reason`), and an event listener is cleaned up after completion. `.cancel(reason)` calls `AbortController.abort(reason)` and awaits base promise settlement. Anchors: `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellableFetch.js`.
- `defaultObjectCreate(...)` and `defaultObjectDelete(...)` attach `.cancel()` that aborts and then awaits the returned promise’s settlement to avoid unhandled rejections. Anchors: `client/lib/utils/objectCrud.js`, `client/tests/unit/lib/utils/objectCrud.spec.js`.
- `allPagePaginatedListCrudAdaptor(...)` cancellation aborts a shared `AbortController` and awaits settlement of concurrent page fetches. Anchors: `client/lib/utils/listCrud.js`.
- `singlePagePaginatedListCrudAdaptor(...)` checks `isCancelled.value` before applying list results and pagination metadata. Anchors: `client/lib/utils/listCrud.js`.
- `storeModelInfo.fetchModelInfo(...)` caches the first in-flight promise per `app.model` key and caches the first rejection in `errors[key]`, short-circuiting subsequent calls. Anchors: `client/lib/stores/storeModelInfo.js`.
- `storeModelInfo.fetchModelInfo(...)` does not preserve `.cancel()` on the returned promise because it stores a derived promise from `.then/.catch/.finally` chaining, not the original `fetchHelper(...)` promise. Anchors: `client/lib/stores/storeModelInfo.js`, `client/lib/utils/fetchSupport.js`.
- `useLookupContext.requestObject(...)` returns a per-consumer cancellable wrapper; cancellation removes the consumer from `consumerPromises`, and only the last consumer triggers cancellation of the shared in-flight promise (if present). Anchors: `client/lib/use/useLookupContext.js`, `client/tests/unit/lib/use/useLookupContext.spec.js`.
- `useResolvedLookupObject(...)` performs best-effort cancellation on scope disposal and parameter invalidation via `?.cancel(...)`; cancellation failures are logged and do not throw. Anchors: `client/lib/use/useResolvedLookupObject.js`.

## Footguns

- Loss of `.cancel`: async re-wrapping can drop the cancellation method (symptom: the returned Promise has no `.cancel`). Anchors: `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/use/useWarnings.js`.
- Abort treated as generic fetch failure: `fetchHelper(...)` wraps fetch-level errors (including aborts) into the configured `ErrorClass` rather than preserving an `AbortError` branch (symptom: cancellation surfaces as `FetchError`-like errors). Anchors: `client/lib/utils/fetchSupport.js`.
- Cancellation does not clear sticky store failures: `storeModelInfo.fetchModelInfo(...)` caches the first rejection in `errors[key]` and subsequent calls reject immediately; the returned promise does not expose `.cancel()` due to chaining, so caller-driven abort is not part of this store’s contract surface. Anchors: `client/lib/stores/storeModelInfo.js`, `client/lib/utils/fetchSupport.js`.
- Ignored abort signals with `cancellableFetch`: passing `signal` to `cancellableFetch` has no effect because it is overwritten by an internal `AbortController` (symptom: caller-provided controller is never observed to abort the underlying fetch). Anchors: `client/node_modules/@arrai-innovations/reactive-helpers/utils/cancellableFetch.js`.
- Late or repeated cancellation in lookup batching: `useLookupContext` cancellation logs warnings when called after cleanup, called twice, or before an `inflightPromise` exists (symptom: console warnings with `[useLookupContext.PerConsumerPromise.cancel] ...`). Anchors: `client/lib/use/useLookupContext.js`.
- Cancellation may be surfaced as an error state in resolved-lookups: `useResolvedLookupObject` sets error state for any awaited rejection; if a cancelled operation rejects, `errored` can toggle during parameter churn. Anchors: `client/lib/use/useResolvedLookupObject.js`.

## Suggested Outline

- `## Boundary and Authority`
- `## Cancellation Surface (Promise Identity)`
- `## Transport Abort and State-Gating`
- `## Store and Cache Interactions`
- `## Lookup Batching and Multi-Consumer Semantics`
- `## Observable Failure Signatures`
