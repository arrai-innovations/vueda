---
title: Reactive Data Flow (Stores + Composables)
type: explanation
audience: integrator
status: draft
---

# Reactive Data Flow (Stores + Composables)

VUEDA's client loads {@term Model Info}, {@term Model Config}, workflow data, and choice lists through three layers. Pinia stores fetch and cache the data. Composables give components reactive access to those caches. Router guards call the stores directly before a view mounts.

This page describes how each store keys its cache, what it caches (failures included), when caches clear, and how composables and guards read them. Object and list rows follow separate rules: they load through {@term CRUD Adapter} functions, which [CRUD Adapter Layer](./crud-adapter-layer.md) describes.

## Stores, Composables, and Guards

**Stores** hold one cache per Pinia instance, shared by every component and route. Store actions fetch from the server, reshape the response, and write the result into keyed reactive maps. When two components need the same model info, both read one store entry, and the server sees one request. [`storeModelInfo`]{@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo} renames the model info keys before it stores them. [Server-Client Metadata Contract](./server-client-metadata-contract.md#client-normalization) describes the client key casing.

**Composables** connect one component to the stores. Each composable watches its inputs (usually `app`, `model`, and sometimes `view`) and calls the store action when they change. It exposes `loading`, `error`, and a handle into the store's data. Its watches run only while {@api js:function:@arrai-innovations/vueda/use/useIsActive#useIsActive} reports the component as active. That ref starts `false`, turns `true` on {@api ext:vue:onMounted} and {@api ext:vue:onActivated}, and turns `false` on {@api ext:vue:onDeactivated}. So a component that [`<KeepAlive>`]{@api ext:vue:KeepAlive} has deactivated fetches nothing for route parameters that it no longer shows.

**Router guards** run outside any component. {@api js:function:@arrai-innovations/vueda/router/guards#waitForModelStoreLoad} calls the store actions and awaits them as plain promises. A composable called outside component setup registers lifecycle hooks with no component to attach to. A development build logs a Vue warning for each hook, and nothing throws. The composable's `isActive` never turns `true`, so it never fetches. [`useModelConfig`]{@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig} also creates an effect scope, and outside a component nothing stops it. [Routing and View Resolution Model](./routing-and-view-resolution-model.md) describes the guard chain.

## Cache Keys

A cache key decides which callers share an entry. The stores build keys from the lowercased app label and model name.

- **`app.model`.** Model info, a model's permitted workflow transitions, and a model's workflow states use one entry per model, such as `myapp.widget`. One model info fetch serves every component, guard, and composable that asks for that model.
- **Per object.** The workflow store keeps each object's state, transitions, and history under its primary key, inside the model's entry.
- **Per field.** [`storeModelChoices`]{@api js:function:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices} keeps one choice list per field inside the model's entry. Filter choices use a separate map and separate requests.
- **`app.model-<view>`.** [`storeModelConfig`]{@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig} keeps one built config per view, keyed by the view's action name. Examples are `myapp.widget-list`, `myapp.widget-update`, and `myapp.widget-retrieve` for the `read` view. A config built with no view uses `myapp.widget`.

The route guard builds only the no-view config. The destination view builds its own config when it mounts. It uses the model info that the guard already cached, so that build sends no request.

## What Each Store Caches

| Store                                                                                           | Caches results                  | Shares an in-flight request | Caches failures          |
| ----------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------- | ------------------------ |
| `storeModelInfo`                                                                                | Yes, per model                  | Yes                         | Yes, per model           |
| [`storeWorkflow`]{@api js:function:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow} | Yes, per model or object        | Yes                         | Yes, per model or object |
| `storeModelConfig`                                                                              | Yes, per built key              | Yes, the build              | Yes, per built key       |
| `storeModelChoices`                                                                             | Stored; each new call refetches | Yes, per field              | No                       |

### Cached Results

[`fetchModelInfo`]{@api js:method:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo.fetchModelInfo} and the workflow fetch actions check three things in order. A cached result resolves at once. A cached failure rejects at once. A request already in flight for the same key goes to the new caller too, so concurrent callers share one request. The store sends a request only when all three are absent. A settled request removes its in-flight entry.

[`getConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.getConfig} checks two things. A built config resolves at once. Otherwise the caller gets the build already running for that key. [Model Config Lifecycle](#model-config-lifecycle) describes the build.

The choice actions, [`fetchChoices`]{@api js:method:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices.fetchChoices} and [`fetchFilterChoices`]{@api js:method:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices.fetchFilterChoices}, share a request already in flight for the same field. Every other call sends a new request, even when the store holds a list. Choice lists therefore follow changes to the rows behind them.

Each workflow fetch, such as [`fetchWorkflowTransition`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.fetchWorkflowTransition}, first reads `workflowEnabled` from the model's cached model info. It fetches the model info when it is missing. A model without workflow resolves to an empty list with no workflow request. After a successful transition, [`executeTransition`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition} writes the object's new state and transitions into the cache.

### Cached Failures

`storeModelInfo` keeps the first failure for each model in [`errors`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo.errors}. Every later call for that model rejects with the same error and sends no request. A failing model therefore costs the server one request, however often the client asks. A transient failure, such as a timeout during a deploy, also blocks that model until the cache clears.

A missing {@term Pk Marker} is one of these cached failures. After renaming the keys, the store sets `pk` to the name of the field that carries `pk: true`. When no field carries it, the store throws `storeModelInfo.fetchModelInfo: no pk field found for <app>.<model>`. It caches that error like any other. [Primary Key and Identifier Discipline](./pk-and-identifier-discipline.md) describes how the server sets the marker.

The workflow store caches failures the same way. It keeps them per model for permitted transitions and states, and per object for object state, transitions, and history. A `403` from the permitted transitions request is cached as a [`WorkflowPermissionDeniedError`]{@api js:class:@arrai-innovations/vueda/stores/storeWorkflow#WorkflowPermissionDeniedError}. [Routing and View Resolution Model](./routing-and-view-resolution-model.md#failure-modes) describes what the user sees then.

`storeModelConfig` keeps a failed build as the running build for its key. Every later `getConfig` for that key returns the same rejection. A build fails when model info fails, which leaves one cached failure in each store. It also fails when the merged `submitFields` includes a field flattened from an expand.

`storeModelChoices` caches no failures. The next fetch for that field sends a new request.

A composable shows a cached failure in its `error` ref each time the component asks for that key, and sends no request. The error may come from a failure that happened earlier.

## When Caches Clear

Three events empty the caches of all four stores: a change of signed-in user, a store reset, and a page reload. These are the {@term Auth-Scoped Stores}: the server filters their data by the signed-in user's permissions.

### When the Signed-In User Changes

Every path that can change who is signed in ends in [`fetchCurrentUser`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.fetchCurrentUser} on {@api js:function:@arrai-innovations/vueda/stores/storeUser#storeUser}. These paths are sign-in, sign-out, reauthentication, two-factor authentication, and the first load. The action compares the user id in the response with the previous one. The first response after a page load sets the id and counts as no change. Any later change counts, including a change to signed out. Reauthentication and two-factor device changes keep the same id, so they clear nothing.

On a change, the user store increments [`identityGeneration`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.identityGeneration} and calls {@api js:function:@arrai-innovations/vueda/stores/authScope#clearAuthScopedStores}. That function calls `clearAuthScoped()` on each of the four stores that the application has used. It skips stores that the application never created. Each store then:

- deletes its cached results, cached failures, and in-flight entries;
- deletes keys in place, keeping the containers, so the handles that composables hold still point at the live container;
- increments its own generation counter.

`storeModelConfig` keeps the overrides that [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} stored, because they come from your code. It cancels each running build before it drops the built configs. `storeModelChoices` also drops lists that [`setChoices`]{@api js:method:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices.setChoices} or [`setFilterChoices`]{@api js:method:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices.setFilterChoices} seeded.

Each fetch records its store's generation counter when it starts. A response that arrives after the counter changed was filtered for the previous user. The store neither caches nor returns it, and caches no failure. The fetch rejects with {@api js:class:@arrai-innovations/vueda/utils/errors#AuthScopeInvalidatedError}. A config build in flight at that moment rejects with the same error.

Consumers react to `identityGeneration`:

- [`useModelInfo`]{@api js:function:@arrai-innovations/vueda/use/useModelInfo#useModelInfo}, `useModelConfig`, [`useWorkflowTransitions`]{@api js:function:@arrai-innovations/vueda/use/useWorkflowTransitions#useWorkflowTransitions}, and [`useModelChoices`]{@api js:function:@arrai-innovations/vueda/use/useModelChoices#useModelChoices} watch it and fetch again. They ignore `AuthScopeInvalidatedError`. A fetch that was running when the user changed is followed by a new one.
- [`requireModelInfo`]{@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo} returns `false` on `AuthScopeInvalidatedError`, which cancels the navigation.
- The routes that {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} generates recheck the route on screen. [Routing and View Resolution Model](./routing-and-view-resolution-model.md#rechecking-after-the-authenticated-user-changes) describes that recheck.

Between the clear and the new result, a model info or config handle reads `undefined`, because its key is gone. Framework code that reads `config.formProps`, `config.actions`, or `config.actionRedirects` then throws a `TypeError`. Issue [#286](https://github.com/arrai-innovations/vueda/issues/286) tracks keeping the default shape in place.

The refetch also runs when the change is a sign-out. With no session, the server answers `403`. `storeModelInfo` and `storeWorkflow` cache those failures until the next user change. Issue [#284](https://github.com/arrai-innovations/vueda/issues/284) tracks skipping these requests while nobody is signed in.

### Store Reset

Pinia's [`$reset()`]{@api ext:pinia:$reset} on one of these stores replaces each cache container with a new empty one. It drops cached results, cached failures, and in-flight entries. On `storeModelConfig` it also drops the `setConfig` overrides. Composables that already hold a handle keep reading the old container. None of them fetches again, because none of their watched inputs changed. VUEDA never calls `$reset()` itself.

### Page Reload

A reload starts a new Pinia instance, so every store starts empty.

### Narrower Clears

Two actions clear part of one store:

- `setConfig` clears one model's built configs, running builds, and failed builds. [Model Config Lifecycle](#model-config-lifecycle) describes it.
- [`initializeObjectTransitions`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.initializeObjectTransitions} empties one model's cached object transitions, with their failures and in-flight entries.

## Model Config Lifecycle

`getConfig({app, model, view})` returns the built config for its key. If there is none, it returns the build already running for that key. Otherwise it starts a build:

1. It copies the stored overrides for the model and the view.
2. It awaits `fetchModelInfo` for the model.
3. It derives the default config from the model info and merges the overrides on top. [Contract-First Dynamic UI](./contract-first-dynamic-ui.md#configuration-precedence) describes the merge order.
4. It checks `submitFields` and caches the result under the built key.

`setConfig({app, model}, genericConfig, specificConfigs)` stores the overrides and files a `read` override under `retrieve`. It then clears this model's entries: keys equal to `app.model` or starting with `app.model-`. It cancels and removes each unfinished build, and removes each failed build, so the next `getConfig` builds again. It deletes every built config for the model. `setConfig` builds nothing; the next `getConfig` for each key starts a new build.

Cancelling a build removes it from the running builds. The model info request that it awaits keeps running, and model info caches its result as usual. Issue [#178](https://github.com/arrai-innovations/vueda/issues/178) tracks aborting that request.

A build that `setConfig` replaced still resolves for its own caller, with the overrides that it copied when it started. It caches nothing and leaves the replacement build's entry alone. A build replaced by a change of user rejects with `AuthScopeInvalidatedError`.

`useModelConfig` starts its [`config`]{@api js:property:@arrai-innovations/vueda/use/useModelConfig#ModelConfigRawState.config} with a default shape of empty field lists and detail maps. After a build succeeds, `config` becomes a {@api ext:vue:toRef} handle into [`builtConfigs`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.builtConfigs}. `setConfig` deletes that key, and the composable does not watch overrides. So `config` reads `undefined` until `app`, `model`, `view`, or the signed-in user changes. The composable's `error` shows its own build failure or the model info failure from its `useModelInfo`.

## Composable Handles

After a successful fetch, each composable exposes a `toRef` handle into the store:

- `useModelInfo` sets [`info`]{@api js:property:@arrai-innovations/vueda/use/useModelInfo#UseModelInfoRaw.info} to the model's entry in [`infos`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo.infos}.
- `useModelConfig` sets `config` to the view's entry in `builtConfigs`.
- `useWorkflowTransitions` sets [`transitions`]{@api js:property:@arrai-innovations/vueda/use/useWorkflowTransitions#WorkflowTransitionsRawState.transitions} to the model's entry in [`workflowTransitions`]{@api js:property:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.workflowTransitions}, through a second watch on the store.
- `useModelChoices` sets each field in [`choices`]{@api js:property:@arrai-innovations/vueda/use/useModelChoices#UseModelChoicesRaw.choices} to that field's stored list.

A store write to an existing key shows up through the handle without a new fetch. Before the first fetch succeeds, `useModelInfo` exposes a placeholder with empty values for the common model info keys. `useWorkflowTransitions` exposes an empty list. Templates can then read nested values during loading.

Each composable sets `loading` while its fetch runs and clears `error` when a new fetch starts. When the inputs change during a fetch, the composable ignores the older result. It fetches for the current inputs once the older request settles. `useModelChoices` runs at most four field requests at once per instance.
