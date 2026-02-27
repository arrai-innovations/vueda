---
title: CRUD Adapter Layer
type: explanation
audience: implementor
status: draft
---

# CRUD Adapter Layer

VUEDA's client-side CRUD composables ({@api js:module:@arrai-innovations/vueda.utils/listCrud} and {@api js:module:@arrai-innovations/vueda.utils/objectCrud}) do not hardcode HTTP transport. Instead, they consume adapter functions from a module-level registry that the application populates once at startup. The registry pattern decouples data operations from transport: composables call named adapter slots without knowing whether the adapter uses `fetch`, a GraphQL client, or a mock. Each composable instance receives its own copy of the adapter set, so per-instance overrides do not affect other instances or the global registry.

This page describes the registry pattern, the default adapter implementations VUEDA provides, the call signatures and return contracts adapters must satisfy, and the failure modes that result from misconfiguration or custom replacement. For transport-level abort and state-gating concerns, see [Cancellable Network Operations](./cancellable-network-operations). For the composables that consume these adapters, see the generated API reference for {@api js:module:@arrai-innovations/vueda.utils/listCrud} and {@api js:module:@arrai-innovations/vueda.utils/objectCrud}.

## Why Adapters Exist

The alternative to an adapter layer is composables that call `fetch` directly, encoding URL construction, request serialization, response parsing, and error classification inline. That approach works for a single transport mechanism, but it couples every composable to a specific HTTP client, URL scheme, and response shape.

The adapter layer eliminates that coupling. The application registers a set of named functions (one per CRUD operation) in a global registry at startup. Composables read from the registry at initialization time, receiving a uniform interface regardless of what the adapter does internally. This design supports three scenarios without modifying composable code: using VUEDA's default HTTP adapters (the common case), replacing individual adapters (for example, swapping the list adapter to use a different pagination scheme), and replacing the entire transport layer (for GraphQL, offline-first, or test mocks).

The registry also establishes a clear ownership boundary. Adapters own request construction and response interpretation. Composables own state management, reactivity, and lifecycle. The fetch layer (`fetchHelper`, `cancellableFetch`) owns transport concerns like credentials, abort signals, and response parsing. Each layer has a defined contract with its neighbors but no knowledge of their internals.

## The Registry Pattern

**Two independent registries store the adapter functions: one for list operations and one for object operations.** `defaultListCrud` maps named slots (`list`, `bulkDelete`, and others) to adapter functions, plus an `args` object for shared configuration like `resultsKey`. `defaultObjectCrud` maps named slots (`retrieve`, `create`, `update`, `patch`, `delete`) to adapter functions with its own `args`. Both registries are module-level singletons in `@arrai-innovations/reactive-helpers`.

**`setListCrud(...)` and `setObjectCrud(...)` write to these registries; `getListCrud(...)` and `getObjectCrud(...)` read from them.** Registration validates keys at write time: passing an unknown key to `setListCrud` or `setObjectCrud` throws `Error('Unknown key "<key>" passed to set{List,Object}Crud')`. This catches typos and misnamed adapter slots at startup rather than at first use.

**Every slot starts with a sentinel function that rejects with a diagnostic message.** Before any adapter is registered, calling a composable method produces a rejected promise with the message `Crud method "<name>" is not implemented.` Slots that require cancellation support (`list`, `subscribe`) use a variant that also provides an empty `.cancel()` method. This ensures that missing registration produces an actionable error instead of a `TypeError` or silent failure.

**The registry is singleton and last-write-wins.** Calling `setListCrud(...)` or `setObjectCrud(...)` replaces handler functions completely for the specified slots; it does not merge them. The `args` object is merged via `Object.assign`. Calling the setup functions multiple times (for example, from both `main.js` and a test setup) silently overwrites the previous registration. There is no warning or error for double registration.

## Default Adapter Set (List)

{@api js:function:@arrai-innovations/vueda.utils/listCrud.setupDefaultListCrud} populates the list registry with VUEDA's HTTP adapters by calling `setListCrud(...)`. It registers {@api js:function:@arrai-innovations/vueda.utils/listCrud.singlePagePaginatedListCrudAdaptor} for the `list` slot, {@api js:function:@arrai-innovations/vueda.utils/listCrud.defaultObjectsDelete} for `bulkDelete`, and sets `args.resultsKey = "results"`.

**`singlePagePaginatedListCrudAdaptor` fetches one page at a time.** It builds a URL from the `target` object, adds query parameters for pagination, search, ordering, and filters, then delegates to `cancellableFetch`. On success, it calls `clearObjects()` when loading page 1 (or when `params.page` is undefined), then calls `pushObjects(responseData[target.resultsKey])` to write results into the composable's reactive state. It also updates pagination metadata (`setPaginateInfo`) and column totals (`setColumnTotals`) from the response.

**The adapter checks `isCancelled.value` after receiving a response but before writing state.** If the composable was cancelled between the request and the response (for example, because the user navigated away or changed filter parameters), the response is silently discarded. No callbacks are invoked, and no state is mutated. This is the composable-level cancellation gate; transport-level abort is handled separately by `cancellableFetch`.

**{@api js:function:@arrai-innovations/vueda.utils/listCrud.allPagePaginatedListCrudAdaptor} fetches all pages concurrently.** It shares a single `AbortController` across concurrent page fetches (up to four concurrent via `p-limit`). Cancelling the returned promise aborts all in-flight pages. It uses `Promise.allSettled()` to avoid unhandled rejections when some pages are aborted while others succeed. This adapter is not registered by default; projects that need it can register it explicitly via `setListCrud`.

**{@api js:function:@arrai-innovations/vueda.utils/listCrud.defaultObjectsDelete} handles bulk deletion.** It sends `{ pks: [...] }` as a JSON body with the `DELETE` method, adds a {@term Dry Run} header when `dryRun` is true, and classifies responses by status code: `204` is success (returns nothing), `400` throws {@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError}, and other statuses throw `FetchError`.

## Default Adapter Set (Object)

{@api js:function:@arrai-innovations/vueda.utils/objectCrud.setupDefaultObjectCrud} populates the object registry with VUEDA's HTTP adapters. It registers {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectRetrieve}, {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectCreate}, {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectUpdate}, {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectPatch}, and {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectDelete}.

**Object adapters resolve to the response data directly.** Unlike list adapters (which push results via callbacks and resolve to `void`), object adapters return a promise that resolves to the object's data on success. The caller receives the created, retrieved, updated, or patched object as the resolution value.

**Status code contracts are fixed per adapter.** `defaultObjectCreate` expects `201` on success. `defaultObjectUpdate` and `defaultObjectPatch` expect `200`. `defaultObjectDelete` expects `204`. All four mutation adapters throw {@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError} on `400` (server-side validation failure) and `FetchError` on other non-success statuses.

**Default adapters are explicitly non-`async` to preserve `.cancel()` on the returned promise.** Each adapter returns the promise produced by `fetchHelper` or `cancellableFetch` directly, with a `.cancel()` method attached. Wrapping an adapter in `async`/`await` or `.then()` produces a new `Promise` instance that does not carry the `.cancel()` method. This is a deliberate design constraint documented in inline comments, and it is the most common pitfall when writing custom adapters.

## Adapter Arguments and Return Contracts

**Each adapter function receives a single structured object.** The keys vary by adapter type, but common keys include `target` (an object with `app`, `model`, `pk`, and `action` properties used for URL construction), `params` (query parameters), and adapter-specific additions. List adapters receive callback functions (`pushObjects`, `clearObjects`, `setPaginateInfo`, `setColumnTotals`) and an `isCancelled` reactive flag. Object adapters receive the object data to send.

**Return values are promises, optionally cancellable.** List adapters resolve to `void` because they push results via callbacks. Object adapters resolve to the response data. Both may return a {@api js:type:@arrai-innovations/vueda.utils/fetchSupport.CancellablePromise} (a promise with a `.cancel()` method backed by an `AbortController`) or a plain `Promise` ({@api js:type:@arrai-innovations/vueda.utils/fetchSupport.MaybeCancellablePromise}). Composables call `promise?.cancel?.()` defensively, so plain promises are acceptable but will not abort in-flight requests.

**Per-instance overrides are validated at composable creation.** When a composable is created with `handlers` overrides, `assignCrud` validates the keys against a fixed set. Unknown keys throw. Override values must be callable; non-functions throw. Valid overrides replace the corresponding slot in the instance's copy of the adapter set, leaving the global registry and other instances unaffected.

## File Detection and FormData Encoding

**`defaultObjectCreate`, `defaultObjectUpdate`, and `defaultObjectPatch` auto-detect file content and switch serialization format.** Before sending, the adapter inspects the outgoing object's values with `Object.values(object).some((value) => value instanceof File || value instanceof Blob)`. When a `File` or `Blob` is detected, the request is serialized as `multipart/form-data` (via `FormData`) instead of `application/json`.

**FormData serialization uses specific naming conventions for nested structures.** Nested objects use dot notation (`parent.child`). Nested arrays use bracket notation (`items[0]fieldname`, with no dot before the field name in array items). These conventions match VUEDA's server-side parsers. Custom backends that expect different naming (for example, Django REST framework's default nested key format) may misinterpret the keys.

**The `instanceof` check does not cover cross-realm objects or custom wrappers.** Objects that behave like files but do not inherit from `File` or `Blob` (such as objects from a different iframe or custom file wrappers) will be JSON-serialized. The server receives a string like `[object Object]` instead of file data. There is no fallback detection mechanism; the check is strictly prototype-based.

## Error Classification

**Default adapters classify errors by HTTP status code and response shape.** The primary error types are {@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError} (for `400` responses, representing server-side validation failures) and `FetchError` (for all other non-success statuses). `FormValidationError` carries the response body, which typically contains per-field error messages that the form system can display inline.

**List adapters use a response-shape heuristic to distinguish filter errors from generic fetch errors.** `singlePagePaginatedListCrudAdaptor` checks whether any non-page, non-search query parameter key appears as a key in the response body. If the heuristic matches, the error is classified as a `ListFilterError` (indicating that a filter value was invalid). If the heuristic fails (for example, because the error response does not mirror parameter names), the error is classified as a generic `FetchError`. This heuristic-based classification means that unusual error response shapes can produce unexpected error types.

## Custom Adapters and Replacement

**Projects replace adapters by calling `setListCrud` or `setObjectCrud` with their own functions.** A project that needs GraphQL transport, offline-first caching, or mock data for testing can skip `setupDefaultListCrud()` and `setupDefaultObjectCrud()` entirely and register custom adapter functions. Alternatively, a project can call the setup functions for the defaults and then overwrite individual slots.

**Custom adapters must satisfy the same contracts as the defaults.** List adapters must call the provided callbacks (`pushObjects`, `clearObjects`, etc.) to write results and must resolve to `void`. Object adapters must resolve to the object data. Adapters that support cancellation must return a promise with a `.cancel()` method. The composables do not validate adapter return values at runtime; contract violations surface as downstream bugs (missing data, unresolved promises, or `TypeError` on undefined results).

**Per-instance overrides provide a narrower replacement scope.** Instead of replacing a global adapter, a single composable instance can override specific slots via the `handlers` parameter at creation time. This is useful for one-off behavior changes (for example, a list that needs a different pagination adapter) without affecting other instances.

## Observable Failure Modes

**Missing registration produces clear but late errors.** If `setupDefaultListCrud()` or `setupDefaultObjectCrud()` is not called before a composable attempts a CRUD operation, the sentinel function rejects with `Crud method "<name>" is not implemented.` The error is actionable, but it appears at first use rather than at startup.

**`resultsKey` mismatch silently pushes `undefined`.** `setupDefaultListCrud` sets `args.resultsKey = "results"`. If a custom API returns data under a different key (for example, `data`), `responseData[target.resultsKey]` evaluates to `undefined`, and `pushObjects(undefined)` writes nothing. The list composable shows an empty list despite the API returning data. There is no warning for this mismatch.

**Double registration overwrites silently.** Calling `setListCrud` or `setObjectCrud` multiple times replaces handler functions without warning. If both `main.js` and a test setup call `setupDefaultListCrud()`, the second call's registrations replace the first. For handler functions, replacement is complete (not merged). For `args`, the merge via `Object.assign` means that keys from the first call persist unless explicitly overwritten by the second.

**File-like objects that do not inherit from `File` or `Blob` are JSON-serialized.** The `instanceof` check is strict. Cross-realm `File` objects (from iframes or web workers) and custom file wrappers fail the check and are serialized as JSON, producing garbled data on the server.

**FormData nested property naming can conflict with server expectations.** The default serialization uses dot notation for nested objects and bracket notation for arrays. Custom backends that expect a different convention will receive unexpected keys. There is no configuration option for the naming strategy; projects with non-standard backends must provide custom adapters.

**Custom adapters that use `async` lose cancellation.** An `async` function returns a new `Promise` that does not carry the `.cancel()` method from the inner promise. Composables that call `promise?.cancel?.()` on the returned promise silently do nothing, and in-flight requests are not aborted on navigation or parameter changes. This is documented in inline source comments but remains a recurring pitfall.

**List filter errors depend on a response-shape heuristic.** A non-200 list response throws `FetchError` instead of `ListFilterError` (or vice versa) when the heuristic's assumption about response body keys does not hold. The classification affects how the error is displayed to the user (filter-specific messaging versus generic error), but does not affect the underlying failure.

## Relevant Implementation Surface

- {@api js:function:@arrai-innovations/vueda.utils/listCrud.setupDefaultListCrud}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.setupDefaultObjectCrud}
- {@api js:module:@arrai-innovations/vueda.utils/listCrud}
- {@api js:module:@arrai-innovations/vueda.utils/objectCrud}
- {@api js:function:@arrai-innovations/vueda.utils/listCrud.singlePagePaginatedListCrudAdaptor}
- {@api js:function:@arrai-innovations/vueda.utils/listCrud.allPagePaginatedListCrudAdaptor}
- {@api js:function:@arrai-innovations/vueda.utils/listCrud.defaultObjectsDelete}
- {@api js:function:@arrai-innovations/vueda.utils/listCrud.makeSearchParamsString}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectRetrieve}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectCreate}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectUpdate}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectPatch}
- {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectDelete}
- {@api js:function:@arrai-innovations/vueda.utils/fetchSupport.fetchHelper}
- {@api js:type:@arrai-innovations/vueda.utils/fetchSupport.CancellablePromise}
- {@api js:type:@arrai-innovations/vueda.utils/fetchSupport.MaybeCancellablePromise}
- {@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError}
- {@api js:module:@arrai-innovations/vueda.utils/errors}
