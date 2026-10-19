---
title: Cancellable Network Operations
type: explanation
audience: integrator
status: draft
---

# Cancellable Network Operations

The VUEDA client cancels a request when its result is no longer wanted: a list's params change, a form's target object changes, or a component deactivates or is disposed. Cancelling keeps a superseded request from writing stale state into a list, an object, or a form. Two mechanisms do this work. Aborting a request stops the HTTP request in the browser. The `isCancelled` check discards a response that has already arrived.

Cancellation happens only in the client. An aborted request may already have reached the server, and the server finishes that work. A cancelled save can still commit.

This page describes how a promise carries its `cancel` method and which functions abort requests. It also explains how aborting differs from the `isCancelled` check, and which parts of the client cancel requests.

## Cancellation Surface (Promise Identity)

A {@term Cancellable Promise} is a promise with a `cancel` method. VUEDA describes it with two types. {@api js:type:@arrai-innovations/vueda/utils/fetchSupport#CancellablePromise} always has `cancel`. {@api js:type:@arrai-innovations/vueda/utils/fetchSupport#MaybeCancellablePromise} may have it, for call sites that receive promises from more than one source.

The `cancel` method is a property of one promise object. Any step that returns a new promise leaves that property behind:

- An `async` function always returns a new promise, even when its body returns a cancellable one.
- `.then()`, `.catch()`, and `.finally()` each return a new promise.

A function that passes `cancel` to its caller therefore returns the cancellable promise itself. The default {@term CRUD Adapter} functions are plain functions for this reason, and most carry the comment "This function cannot be async". The list and object instances in reactive-helpers follow the same rule. A function can still run `async` code inside. {@api js:function:@arrai-innovations/vueda/utils/listCrud#allPagePaginatedListCrudAdaptor} runs its page fetches in an inner `async` function and attaches `cancel` to that function's promise before returning it. {@api js:function:@arrai-innovations/vueda/use/useModelAction#useModelAction} chains `.then()` onto the instance's promise, then copies a `cancel` method onto the chained promise.

A caller that may receive a plain promise calls `promise?.cancel?.()`. Plain promises are common: a cached result comes back as an already resolved promise with no `cancel`.

When a function drops `cancel`, its caller cannot abort the request. A direct `promise.cancel()` call throws a {@api ext:mdn:TypeError}, and `promise?.cancel?.()` does nothing. A list or object instance that receives a promise without `cancel` also cannot mark the run as cancelled, so the `isCancelled` check never discards its result. The superseded request runs to completion and writes its data.

## Functions That Abort Requests

Four functions create an {@api ext:mdn:AbortController} and abort its signal from `cancel`:

- {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#fetchHelper} passes its own signal to `fetch` and replaces any `signal` and `credentials` in the options you pass. You can abort its request only through `cancel`. Its `cancel` takes no reason and returns nothing.
- {@api ext:reactive-helpers:cancellableFetch} passes its own signal to `fetch` and links it to any `signal` you pass, so aborting your controller also aborts the request. Its `cancel(reason)` aborts the request, then waits for the promise to settle.
- {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectCreate} builds its promise from `fetch`. Its `cancel` aborts the request, then waits for the promise to settle.
- `allPagePaginatedListCrudAdaptor` shares one controller across all its page requests. Its `cancel` aborts every page request, then waits for all of them to settle.

Waiting for the promise to settle keeps the rejection that the abort causes from surfacing as an unhandled rejection. The other default adapters use `cancellableFetch`. [CRUD Adapter Layer](./crud-adapter-layer.md) describes what each adapter sends and how it reports errors.

## Aborting a Request and the `isCancelled` Check

Aborting is synchronous. If the response has not arrived, `fetch` rejects. If the adapter is still reading the response body, the read rejects. Once the body has been read, aborting does not stop the adapter code that runs next.

The `isCancelled` check covers that gap. A list instance passes each run an `isCancelled` ref ({@api ext:reactive-helpers:ListArgsRaw} lists the adapter arguments). When the instance cancels a run, it sets the ref to `true` first and then calls the adapter's `cancel`. {@api js:function:@arrai-innovations/vueda/utils/listCrud#singlePagePaginatedListCrudAdaptor} reads the body, checks the ref, and returns without writing pagination or rows if the run was cancelled. The all-pages adapter checks the ref before each write. An adapter can also call `setCancelled` to mark its own run cancelled.

Aborting saves network and server work when the abort arrives in time. The check stops the stale write in every case where the instance knows the run was cancelled.

A cancelled run rejects, and the instance does not treat that rejection as an error. It stores no error for a run it cancelled, and a cancelled list run resolves to `false`.

Code that calls the fetch functions directly sees these rejections:

- A `cancellableFetch` request aborted with a reason rejects with that reason. Without a reason, it rejects with a {@api ext:mdn:DOMException} named `AbortError`.
- `fetchHelper` wraps every fetch-level failure, an abort included, in its [`ErrorClass`]{@api js:param:@arrai-innovations/vueda/utils/fetchSupport#fetchHelper:ErrorClass} ({@api js:class:@arrai-innovations/vueda/utils/errors#FetchError} by default). It has no separate branch for aborts, so a caller cannot tell a cancelled request from a network failure by the error class.

## What Cancels Requests

reactive-helpers' {@api ext:reactive-helpers:useCancellableIntent} runs the list and retrieve requests behind {@api ext:reactive-helpers:useList} and {@api ext:reactive-helpers:useObject}. It cancels the running request when the watched params change, when the component deactivates, and when the component's scope is disposed. It treats its own cancellation as no error.

The form composables cancel their submissions. {@api js:function:@arrai-innovations/vueda/use/useObjectForm#useObjectForm} cancels when the app, model, or pk changes, and when its scope is disposed. {@api js:function:@arrai-innovations/vueda/use/useActionForm#useActionForm} cancels when its dry-run target changes, when the component deactivates, and when it unmounts. Both also number their submissions and ignore any result from an earlier one.

Store requests cannot be cancelled. Pinia wraps the promise of every store action in a new promise, so no store action returns a `cancel` method. {@api js:method:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo.fetchModelInfo} also keeps only a chained promise for its request, so nothing can abort a {@term Model Info} request once it starts. A cancellation therefore never becomes one of a store's cached errors. [Reactive Data Flow](./reactive-data-flow.md) describes which store failures stay cached and when the {@term Auth-Scoped Stores} clear.

When {@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} or a user change supersedes an in-flight {@term Model Config} build, the model-info request keeps running. The superseded build answers its caller but caches nothing. Issue [#178](https://github.com/arrai-innovations/vueda/issues/178) tracks cancelling that request. [Reactive Data Flow](./reactive-data-flow.md) describes the build lifecycle.

## Shared Lookup Requests

{@api js:function:@arrai-innovations/vueda/use/useLookupContext#useLookupContext} lets several components share one request for the same object. Its `requestObject` groups requests by app, model, fields, and expand. It waits 250 ms after the latest request (at most 1 s) and then fetches all requested pks for a group in one request. Each component receives its own cancellable promise.

Cancelling a component's promise removes that component from the shared request. The context aborts the shared request only when no component still waits on any pk in its group. One component's disposal therefore does not abort a request that another component needs.

A cancelled component promise never settles. It neither resolves nor rejects, so code awaiting it stops at the `await`.

The context keeps each resolved object for the context's lifetime. A later request for the same object gets a resolved promise with no `cancel`, and no request is sent.

The context logs a console warning in three cases: `cancel` runs after the context's records for that object are gone, `cancel` runs twice on one promise, or the last component cancels before the shared request has started. These warnings point to a component that cancels after its request has finished or been torn down.

{@api js:function:@arrai-innovations/vueda/use/useResolvedLookupObject#useResolvedLookupObject} resolves one object through the lookup context. It cancels its request when the app, model, or pk becomes empty, and when its scope is disposed. It logs a failed cancel as a console warning and does not throw. Issue [#385](https://github.com/arrai-innovations/vueda/issues/385) tracks two current behaviors:

- When the target changes from one object to another, the composable starts a new request and does not cancel the old one. If the old request settles last, its object replaces the current one.
- When the target is cleared during a request, the cancelled promise never settles. `loading` stays `true` until a later request finishes, and the cancellation does not set `errored`.
