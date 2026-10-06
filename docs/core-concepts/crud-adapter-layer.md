---
title: CRUD Adapter Layer
type: explanation
audience: integrator
status: draft
---

# CRUD Adapter Layer

The list and object composables from reactive-helpers, {@api ext:reactive-helpers:useList} and {@api ext:reactive-helpers:useObject}, send no HTTP requests themselves. Each operation calls a {@term CRUD Adapter} from a registry. VUEDA's adapter modules, {@api js:module:@arrai-innovations/vueda/utils/listCrud} and {@api js:module:@arrai-innovations/vueda/utils/objectCrud}, provide adapters for VUEDA's REST API.

This page describes the registries, what each default adapter sends and accepts, and the contract that a replacement adapter meets. The defaults give an application a working data path from the start. A project can replace any adapter, for every instance or for one.

## Registries and Registration

reactive-helpers keeps two module-level registries. {@api ext:reactive-helpers:defaultListCrud} has the slots `list`, `bulkDelete`, `executeAction`, and `subscribe`. {@api ext:reactive-helpers:defaultObjectCrud} has `retrieve`, `create`, `update`, `patch`, `delete`, `executeAction`, and `subscribe`. Each registry also holds an `args` object that every adapter receives.

{@api ext:reactive-helpers:setListCrud} and {@api ext:reactive-helpers:setObjectCrud} write to the registries:

- An unknown key throws `Unknown key "<key>" passed to setListCrud` (or `setObjectCrud`).
- A function replaces the handler in its slot. A `null` or `undefined` value keeps the current handler.
- The registry deep-copies `args` and merges it with `Object.assign`, so keys from earlier calls stay unless overwritten.
- Repeated calls replace handlers without a warning.

Every slot starts with a handler that rejects with `Crud method "<name>" is not implemented.`. The list or object instance stores that rejection as its error. VUEDA ships no `subscribe` adapter, so that slot rejects until you register one.

{@api js:function:@arrai-innovations/vueda/utils/listCrud#setupDefaultListCrud} and {@api js:function:@arrai-innovations/vueda/utils/objectCrud#setupDefaultObjectCrud} register VUEDA's adapters. A generated project calls both in `client/src/main.js`, after the theme and icon setup and before `createApp`. [Client Plugin Prerequisites](../guides/client-plugin-prerequisites.md) describes the full setup sequence.

Each list or object instance deep-copies the registry when it is created. A later `setListCrud` or `setObjectCrud` call does not reach instances that already exist. The composables' `handlers` option replaces slots for one instance only. An unknown key or a value that is not a function throws when the instance is created. The instance's `props.target` merges into its copy of `args`, and the merged object reaches every adapter as `target`.

VUEDA's own views use per-instance handlers for listing. The list and history views pass a `list` handler that switches between the single-page and all-pages adapters. The delete and activate views, lookups, and the combobox search pass the all-pages adapter. The registry's `list` slot therefore serves lists that your own code creates.

## Adapter Arguments and Return Values

Each adapter receives one object. reactive-helpers documents these objects per slot, for example {@api ext:reactive-helpers:ListArgsRaw} for `list`. Every adapter gets these keys:

- `target`: the merged `args`, with `app` and `model`, and optionally `pk`, `action`, and `resultsKey`.
- `pkKey`: the name of the model's primary key field.
- `isCancelled`: a read-only ref that becomes `true` when the instance cancels the run.
- `setCancelled`: a function that the adapter calls to mark its own run cancelled.

The other keys depend on the slot:

| Slot                             | Added keys                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `list`                           | `params`, `pushObjects`, `clearObjects`, `setPaginateInfo`, `setColumnTotals` |
| `bulkDelete`                     | `pks`, `params`                                                               |
| list `executeAction`             | `pks`, `action`, `params`                                                     |
| `retrieve`                       | `pk`, `params`                                                                |
| `create`, `update`               | `object`, `params` (update reads the pk from `object[pkKey]`)                 |
| `patch`                          | `pk`, `partialObject`, `params`                                               |
| `delete`, object `executeAction` | `pk` (and `action` for `executeAction`)                                       |

The `list` callbacks write into the instance: `pushObjects` adds rows, `clearObjects` empties the list, and the other two store pagination and {@term Column Totals}.

Callers add their own keys to that object. VUEDA's action and delete flows pass `dryRun`, `acknowledgeWarnings`, `formData`, and `requestMethod`.

An adapter must return a promise. The instance stores a non-promise return as an `invalid-promise` error. The resolved value means:

- `list`: ignored. Rows reach the list only through `pushObjects`.
- `bulkDelete`: ignored. On success the instance removes the named rows.
- `executeAction`: the action's result, passed through to the caller.
- Object `retrieve`, `create`, `update`, and `patch`: the object's data.

A returned promise that carries a `cancel` method is a {@term Cancellable Promise}. The instance calls `cancel` to abandon a superseded run. A plain promise works, but the instance cannot abort its request. Every default adapter returns a cancellable promise. [Cancellable Network Operations](./cancellable-network-operations.md) describes why an `async` wrapper drops `cancel`, and how aborting a request differs from the `isCancelled` check.

## Default List Adapters

`setupDefaultListCrud` registers {@api js:function:@arrai-innovations/vueda/utils/listCrud#singlePagePaginatedListCrudAdaptor} for `list`, {@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultObjectsDelete} for `bulkDelete`, and {@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultListExecuteAction} for `executeAction`. It sets `args.resultsKey` to `"results"`.

### Single-Page List

`singlePagePaginatedListCrudAdaptor` fetches one page. It requests the model's list URL. When `target` has both `pk` and `action`, it requests the detail action URL. {@api js:function:@arrai-innovations/vueda/utils/listCrud#makeSearchParamsString} turns `params` into the query string. It joins arrays with commas and drops `undefined` values. The {@term Wire Query Parameters} entry lists the parameter names.

When the page parameter `p` is absent or `1`, the adapter calls `clearObjects()` before it sends the request. A failed or cancelled first-page load therefore leaves the list empty.

After a `200` response, the adapter checks `isCancelled`. If the run was cancelled, it returns without writing. Otherwise it calls `setPaginateInfo`, `setColumnTotals`, and then `pushObjects(response[resultsKey])`. When the response holds its rows under another key, `pushObjects` receives `undefined` and throws a `TypeError`. The list instance stores that error, so the list shows an error. You can set `resultsKey` in the registry `args` or in one instance's `props.target`.

The adapter never sets `isCancelled` itself. The list instance sets it when it cancels the run. reactive-helpers cancels a running list when its params change, when the component deactivates, and when the component's scope is disposed.

### All-Pages List

{@api js:function:@arrai-innovations/vueda/utils/listCrud#allPagePaginatedListCrudAdaptor} fetches every page. No setup function registers it in the `list` slot. It calls `clearObjects()` at once, then fetches page 1, which carries the column totals parameter `ct`. It then fetches the remaining pages without `ct`, at most four at a time. It checks `isCancelled` before each write.

The all-pages promise resolves when every page has arrived. The first failure on a later page rejects it, and rows from pages that already arrived stay in the list. Its `cancel` aborts all page requests through one shared {@api ext:mdn:AbortController} and waits for them to settle.

### Bulk Delete and List Actions

`defaultObjectsDelete` deletes several objects. It sends `DELETE` to the list URL with the JSON body `{ pks: [...], ...formData }`.

`defaultListExecuteAction` runs a named action on several objects. It sends `{ pks: [...], ...formData }` to the model's list action URL. The method is `PUT` unless the caller passes `requestMethod`.

Both send the CSRF token. When `dryRun` is set, they send the `Dry-Run: true` header, which asks the server for a {@term Dry Run}. When the caller passes an `acknowledgeWarnings` digest, they send it as the `Acknowledge-Warnings` header, which answers a {@term Warning Confirmation}. [Action Contract and Availability](./action-contract-and-availability.md#dry-run-and-mutation-semantics) describes which endpoints honor a dry run.

## Default Object Adapters

`setupDefaultObjectCrud` registers six adapters:

| Adapter                                                                                 | Request                                                                                 |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectRetrieve}      | `GET` to the detail URL                                                                 |
| {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectCreate}        | `POST` to the list URL; to the detail action URL when `target` has `pk` and `action`    |
| {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate}        | `PUT` to the detail URL for `object[pkKey]`                                             |
| {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectPatch}         | `PATCH` to the detail URL for `pk`, with `partialObject` as the body                    |
| {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectDelete}        | `DELETE` to the detail URL, with `formData` as a JSON body when passed                  |
| {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectExecuteAction} | The action name as the detail URL's action segment; `PUT` unless `requestMethod` is set |

Retrieve, create, update, and patch add `params` to the URL only when the fields parameter `f` or the expand parameter `e` has entries. Create, update, and patch send the CSRF token. They choose between a JSON body and a multipart body, as [Multipart Saves](#multipart-saves) describes. These three send the `Acknowledge-Warnings` header when the caller passes a digest. Delete and execute action send the CSRF token, the `Dry-Run` header, and the `Acknowledge-Warnings` header, as the list adapters do.

`defaultObjectCreate` builds its own cancellable promise from `fetch`, and its `cancel` aborts that request. The all-pages list adapter does the same for its page requests. Every other default adapter uses reactive-helpers' {@api ext:reactive-helpers:cancellableFetch}. Every default adapter sends credentials with the request.

## Identifiers in Requests

Detail URLs place the pk value in the pk path segment as the caller gives it. A {@term Composite Primary Key} travels as its JSON array string, such as `["1","42"]`. Bulk requests put the selected pks in a body key named `pks`, whatever the model's pk field is called. [Primary Key and Identifier Discipline](./pk-and-identifier-discipline.md) describes identifier transport across the client. [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys.md) covers composite keys on the server.

## Status Codes

Each default adapter maps response statuses to outcomes:

| Adapter                                     | Success                                 | `400`                                                       | `409`                       | Other status |
| ------------------------------------------- | --------------------------------------- | ----------------------------------------------------------- | --------------------------- | ------------ |
| `singlePagePaginatedListCrudAdaptor`        | `200`                                   | `ListFilterError` or `FetchError` (see below)               | as `400`                    | as `400`     |
| `allPagePaginatedListCrudAdaptor`           | `200`                                   | page 1 as the single-page adapter; later pages `FetchError` | as `400`                    | as `400`     |
| `defaultObjectsDelete`                      | `204`; also `200` while `dryRun` is set | `FormValidationError`                                       | `ConfirmationRequiredError` | `FetchError` |
| `defaultListExecuteAction`                  | any `2xx`                               | `FormValidationError`                                       | `ConfirmationRequiredError` | `FetchError` |
| `defaultObjectRetrieve`                     | `200`                                   | `FetchError`                                                | `FetchError`                | `FetchError` |
| `defaultObjectCreate`                       | `201`                                   | `FormValidationError`                                       | `ConfirmationRequiredError` | `FetchError` |
| `defaultObjectUpdate`, `defaultObjectPatch` | `200`                                   | `FormValidationError`                                       | `ConfirmationRequiredError` | `FetchError` |
| `defaultObjectDelete`                       | `204`; also `200` while `dryRun` is set | `FormValidationError`                                       | `ConfirmationRequiredError` | `FetchError` |
| `defaultObjectExecuteAction`                | any `2xx`                               | `FormValidationError`                                       | `ConfirmationRequiredError` | `FetchError` |

The error classes are {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}, {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}, {@api js:class:@arrai-innovations/vueda/utils/errors#FetchError}, and {@api js:class:@arrai-innovations/vueda/utils/errors#ListFilterError}. [Error and Validation Contract](./error-and-validation-contract.md) describes them, the `409` warnings payload, and how forms read the errors.

The server answers a valid dry-run delete with `200`. The delete adapters accept that status only while `dryRun` is set, because only `204` confirms a real delete. A `204` resolves to `undefined`. Any other success resolves to the decoded response body.

A network failure or an aborted request rejects with the browser's own error: a {@api ext:mdn:TypeError} or a {@api ext:mdn:DOMException}. VUEDA does not wrap it in `FetchError`.

The list adapters classify errors by the response body. For any non-`200` response, the adapter compares the body's keys with the request's `params`, leaving out `p`, `s`, and `ct`. If the body has a key named after any other request parameter, the error is a `ListFilterError`. Otherwise it is a `FetchError`. A `400` keyed by `o`, `ps`, `e`, `f`, or a filter name is therefore a `ListFilterError`. The list view keeps a `ListFilterError` out of its own error state.

## Multipart Saves

`defaultObjectCreate`, `defaultObjectUpdate`, and `defaultObjectPatch` search the outgoing object for a {@api ext:mdn:File} or {@api ext:mdn:Blob} instance. The search covers nested arrays and objects. When the object holds no file, the body is JSON. When it holds a file, the body is {@api ext:mdn:FormData} (`multipart/form-data`), and the browser sets the content type.

A multipart body keeps each value's JSON type:

- Each top-level field that is not a file becomes a text part that holds the field's value as JSON. Arrays, objects, numbers, booleans, `null`, and empty collections therefore arrive intact. A string value includes its JSON quotes.
- A top-level file becomes a file part named after its field.
- A nested file becomes a file part with a generated name, such as `__vueda_file_0`. The adapter skips names that the object already uses as fields. The file's position in the JSON value holds `null`.
- A text part named `__vueda_multipart` holds a manifest. The manifest is a JSON object with `version: 1` and a `files` object. `files` maps each file part name to its path, which is an array of object keys and array indexes. Dots and brackets inside a key are literal characters.

For example, the object `{ items: [{ name: "a", attachment: file }] }` produces three parts:

```text
items: [{"name":"a","attachment":null}]
__vueda_file_0: <file content>
__vueda_multipart: {"version":1,"files":{"__vueda_file_0":["items",0,"attachment"]}}
```

A `Blob` that is not a `File` gets the browser's default filename, `blob`.

A multipart body can hold plain objects, dense arrays, strings, finite numbers, booleans, `null`, and files. Any other value makes the adapter throw a {@api ext:mdn:TypeError} before it sends the request. The error message names the value's path, such as `$["items"][0]["attachment"]`. Values that throw include `undefined`, `NaN`, infinite numbers, functions, symbols, bigints, dates, class instances, circular references, and arrays with extra properties. Convert a date or other custom value to its JSON value before you save. An object that holds a file cannot have a field named `__vueda_multipart`.

The file search uses `instanceof Blob`, which also matches a `File`. A file object from another iframe and a custom wrapper both fail this check. When the object holds no other file, the body is JSON and such an object becomes `{}`. When the body is multipart, such an object makes the adapter throw a `TypeError`.

### Server Support

{@api py:class:vueda.core.viewsets.VuedaViewSet} and {@api py:class:vueda.core.viewsets.VuedaReadOnlyViewSet} include {@api py:class:vueda.core.parsers.NestedMultipartMixin}. The mixin replaces DRF's `MultiPartParser` with a parser that reads the manifest. The view's other parsers stay in place. The parser decodes each text part as JSON and puts each file at its path. Validation and permission checks then run as they do for a JSON body.

The server rejects a request with a `400` parse error in these cases:

- The manifest or a text part is not valid JSON, or the manifest has the wrong shape.
- A field appears twice.
- The file parts do not match the manifest.
- A file path does not lead to a `null` placeholder.

A multipart request without a manifest goes through DRF's standard multipart parsing, so older clients keep working.

A server must support this format before a client with these adapters saves files to it. A custom DRF view gets the support when it lists `NestedMultipartMixin` before its DRF base class and keeps DRF's `MultiPartParser` among its parsers. A view that uses another multipart parser class needs its own support for the format. So does a backend that is not VUEDA, unless the project replaces the adapters.

## Replacing Adapters

A project can register its own functions with `setListCrud` or `setObjectCrud`, or pass them to one instance through `handlers`. It can register VUEDA's defaults first and then replace single slots. A replacement receives the arguments and returns the values described in [Adapter Arguments and Return Values](#adapter-arguments-and-return-values).

Forms read errors by class. When a replacement adapter throws a {@api js:class:@arrai-innovations/vueda/utils/errors#ServerFeedbackError} subclass, the form stores its feedback as {@term Server Feedback}. A `ConfirmationRequiredError` with a digest starts the confirm-and-resubmit flow. [Error and Validation Contract](./error-and-validation-contract.md#client-classification-and-form-state-ingestion) describes both.

The stores for model info, workflows, choices, and the user do not use adapters. They fetch with {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#fetchHelper}. [Reactive Data Flow](./reactive-data-flow.md) describes their caches and when those clear.
