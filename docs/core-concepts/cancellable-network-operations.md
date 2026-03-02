---
title: Cancellable Network Operations
type: explanation
audience: implementor
status: draft
---

# Cancellable Network Operations

VUEDA's client runtime attaches cancellation semantics to network-bound operations so that navigations, parameter changes, and scope disposals can abort in-flight work rather than letting stale requests complete and write obsolete state. Cancellation operates through two distinct mechanisms: transport abort, which terminates the underlying fetch, and post-response state gating, which discards results after they arrive. The contract surface for both is a `.cancel()` method on the returned Promise.

This page explains the cancellation contract, the enforcement mechanisms, and the failure surfaces that emerge when cancellation interacts with caching, batching, and promise identity. Cancellation is a client-side concern only; aborting a request does not guarantee that the server stops processing the associated work. For the store and composable fetch lifecycles that produce these cancellable promises, see [Reactive Data Flow](./reactive-data-flow). For the configuration layer that can trigger fetch cancellation during config rebuilds, see [Configuration Surface and Defaults](./configuration-surface-and-defaults).

## Boundary and Authority

Cancellation authority is distributed across layers in the client stack, and each layer expresses cancellation differently.

The fetch layer is the lowest cancellation boundary. `fetchHelper` creates an `AbortController`, passes its signal to the underlying `fetch(...)` call, and attaches a `.cancel()` method to the returned Promise. Calling `.cancel()` invokes `AbortController.abort()`, which causes the fetch to reject. Similarly, `cancellableFetch` (from `reactive-helpers`) creates its own internal `AbortController` and exposes `.cancel(reason)` on the returned Promise. These are the two primary transport-abort surfaces. Callers do not share ownership of the `AbortController`; they interact only with the `.cancel()` method on the Promise they received.

{@term CRUDL} adapters forward or compose cancellation from the fetch layer. `defaultObjectCreate` and `defaultObjectDelete` attach `.cancel()` methods that abort the underlying fetch and then await settlement to avoid unhandled rejections. `allPagePaginatedListCrudAdaptor` shares a single `AbortController` across concurrent page fetches, so cancelling the `list` operation aborts all in-flight pages. `singlePagePaginatedListCrudAdaptor` uses an `isCancelled` ref as a state gate rather than relying solely on transport abort.

Composables and view-level code perform best-effort cancellation on scope disposal and parameter invalidation. `useResolvedLookupObject` cancels outstanding lookup promises via `?.cancel(...)` when parameters change or when the scope is disposed, logging failures rather than throwing. View components like `ViewActivate` and `ViewDeactivate` use abort controllers tied to the component lifecycle.

Stores occupy an intermediate position. Store actions like `storeModelInfo.fetchModelInfo` chain `.then/.catch/.finally` onto the original `fetchHelper` promise, which produces a new Promise instance that lacks the `.cancel()` method. This means store-level fetch promises are not cancellable by callers; cancellation is a fetch-layer concern, not a store-layer concern. `storeModelConfig.getConfig` is an exception: it forwards cancellation for in-flight model-info fetches during {@term Model Config} builds.

## Cancellation Surface (Promise Identity)

The cancellation contract is expressed through two TypeScript-style typedefs. A `CancellablePromise` is a Promise with a guaranteed `.cancel(...)` method. A `MaybeCancellablePromise` is a Promise with an optional `.cancel(...)`, used at call sites where cancellation may or may not be available depending on the code path.

The critical design constraint is that `.cancel()` is attached to a specific Promise instance. JavaScript's `async`/`await` and `.then()` chaining produce new Promise instances that do not inherit properties from the original. This means that any function that wraps a cancellable promise in an `async` function body, or chains `.then()` onto it and returns the chain, produces a new Promise that has lost the `.cancel()` method.

This constraint is why several VUEDA network adapters are explicitly non-`async`. Functions like `defaultObjectCreate`, `defaultObjectDelete`, the list CRUDL adaptors, and `useWarnings` include inline comments explaining that they cannot be `async` because doing so would drop `.cancel()` from the returned Promise. The functions instead return the original Promise directly, attaching additional `.cancel()` behaviour where needed without re-wrapping.

Consumers that may or may not receive a cancellable promise use optional chaining: `promise?.cancel?.()` or `promise?.cancel(reason)`. This pattern appears in composables and view-level cleanup code where the promise source may vary.

## Transport Abort and State-Gating

Transport abort and state-gating are complementary but independent cancellation mechanisms. They address different failure windows and have different observable effects.

**Transport abort** terminates the fetch at the network level. When `.cancel()` invokes `AbortController.abort(reason)`, the browser aborts the HTTP request and the `fetch(...)` Promise rejects. If response processing has not yet started, the rejection prevents any response-handling code from running. If the response has already been received but not yet processed, the rejection interrupts processing.

Transport abort has a key limitation: `fetchHelper` does not distinguish abort rejections from other fetch-level errors. Both aborts and genuine network failures are wrapped into the configured `ErrorClass` (default `FetchError`). There is no `AbortError`-specific branch in the rejection path. This means that code that catches errors from `fetchHelper` cannot easily distinguish between "this request was intentionally cancelled" and "this request failed due to a network problem."

**State-gating** prevents post-response state writes when a request becomes obsolete, even if the transport was not aborted. `singlePagePaginatedListCrudAdaptor` checks an `isCancelled.value` ref before applying list results and pagination metadata to reactive state. If the ref is set to `true` (because a newer request has superseded this one), the response data is silently discarded rather than written to the store or component state.

State-gating exists because transport abort is not always reliable or complete. A response may arrive between the moment cancellation is requested and the moment the abort signal propagates. State-gating is the last line of defence against stale writes in that window.

## Store and Cache Interactions

Cancellation interacts with store caching in ways that can produce surprising failure surfaces.

`storeModelInfo.fetchModelInfo` does not expose `.cancel()` on its returned promise. The store chains `.then`, `.catch`, and `.finally` onto the original `fetchHelper` promise to implement caching, error memoization, and promise cleanup. This chaining produces a derived Promise that lacks the `.cancel()` method. Callers who receive a promise from `fetchModelInfo` cannot cancel the underlying fetch through that promise.

More importantly, if the underlying fetch is cancelled by some other path (for example, an `AbortController` shared with the original `fetchHelper` call), the resulting rejection is cached in `errors[key]` by the store's error memoization logic. Subsequent calls to `fetchModelInfo` for the same key will be rejected immediately from the error cache without issuing a new fetch. The cancellation, which was intended as a transient navigation-driven event, becomes a sticky failure that persists until the store is reset.

`storeModelConfig.getConfig` has a more nuanced cancellation surface. When a config build is in progress, and a new `setConfig` call invalidates the build, the in-flight model-info fetch can be cancelled if it has not yet resolved. This cancellation is forwarded from the config store to the underlying fetch promise, and it is the primary mechanism for preventing stale config builds from completing after a config override is applied.

## Lookup Batching and Multi-Consumer Semantics

`useLookupContext` introduces multi-consumer cancellation, where multiple independent scopes depend on the same underlying network request, and each scope can be disposed of independently.

The lookup context batches and deduplicates lookups by a composite key: `(app.model, fields, expand)` plus per-PK identity. When multiple consumers request the same lookup, they share a single in-flight network request. Each consumer receives its own cancellable wrapper, a per-consumer Promise returned by `requestObject(...)`, whose `.cancel()` method manages that consumer's participation in the shared request.

When a consumer cancels, the lookup context removes that consumer from `consumerPromises`. If other consumers still depend on the shared request, the underlying in-flight promise continues. Only when the last consumer cancels does the lookup context cancel the shared in-flight promise (if it still exists). This reference-counting approach prevents one component's disposal from aborting a fetch that another component still needs.

`useResolvedLookupObject` sits on top of `useLookupContext` and performs best-effort cancellation on scope disposal and parameter invalidation. It calls `?.cancel(...)` on outstanding lookup promises and logs failures rather than throwing an exception. This means that cancellation errors in the lookup pipeline surface as console warnings, not as component-level exceptions.

## Observable Failure Signatures

The cancellation architecture produces several characteristic failure patterns.

**Loss of `.cancel()` through async wrapping.** If a network adapter is refactored to use `async`/`await`, the returned Promise loses the `.cancel()` method. The symptom is that callers' `promise.cancel()` calls either throw `TypeError` or do nothing silently (when guarded by `?.cancel`). The existing codebase guards against this with explicit non-`async` function declarations and inline comments, but it is a recurring risk during refactoring.

**Abort treated as generic fetch failure.** `fetchHelper` wraps all fetch-level errors, including aborts, into the configured `ErrorClass`. Cancellation rejections are indistinguishable from network failures in catch handlers. Code that needs to differentiate cancellation from failure must check the abort reason or error shape explicitly, which `fetchHelper` does not facilitate.

**Cancellation does not clear sticky store failures.** When `storeModelInfo.fetchModelInfo` catches a rejection (including one caused by cancellation), the error is cached in `errors[key]`. Subsequent calls are rejected immediately from the cache. Because the store-level promise does not expose `.cancel()`, there is no caller-driven mechanism to prevent this caching. A cancelled fetch and a genuinely failed fetch produce the same sticky error state.

**Ignored caller-provided abort signals in `cancellableFetch`.** `cancellableFetch` overwrites any `init.signal` passed by the caller with its own internal `AbortController`'s signal. A caller who provides their own `AbortController` and expects to abort the fetch through it will observe that aborting their controller has no effect on the underlying request. The only way to cancel is through the `.cancel()` method on the returned Promise.

**Late or repeated cancellation in lookup batching.** `useLookupContext` logs console warnings when `.cancel()` is called after cleanup has already run, when it is called twice on the same consumer promise, or when it is called before an `inflightPromise` has been assigned. These warnings indicate lifecycle ordering issues; typically, a component is disposing after the lookup context has already torn down its tracking state.

**Cancellation surfaced as error state in resolved lookups.** `useResolvedLookupObject` sets its `errored` ref for any awaited rejection, including cancellation-driven rejections. During rapid parameter changes (for example, navigating quickly between objects), the `errored` ref can toggle between `true` and `false` as cancelled requests are rejected and new requests resolve. This produces transient error flicker in components that render based on the `errored` state.

## Relevant Implementation Surface

- {@api js:function:@arrai-innovations/vueda.utils/fetchSupport.fetchHelper}
- {@api js:type:@arrai-innovations/vueda.utils/fetchSupport.CancellablePromise}
- {@api js:type:@arrai-innovations/vueda.utils/fetchSupport.MaybeCancellablePromise}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectCreate}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectDelete}
- {@api js:function:@arrai-innovations/vueda.utils/listCrud.singlePagePaginatedListCrudAdaptor}
- {@api js:function:@arrai-innovations/vueda.utils/listCrud.allPagePaginatedListCrudAdaptor}
- {@api js:function:@arrai-innovations/vueda.use/useLookupContext.useLookupContext}
- {@api js:function:@arrai-innovations/vueda.use/useResolvedLookupObject.useResolvedLookupObject}
- {@api js:function:@arrai-innovations/vueda.use/useWarnings.useWarnings}
