---
title: Action Contract and Availability
type: explanation
audience: implementor
status: briefing
---

# Action Contract and Availability

## Intent and Scope

- Define the action contract boundary across server action declaration, model-scope advertisement (`model_actions`), object-scope availability (`available_actions`), and client route/adaptor gating.
- Define the authoritative semantics of action metadata fields (`name`, `detail`, `bulk`, `method_names`/`methodNames`, `parameters`) and where they are enforced.
- Describe failure surfaces when model-scope action visibility, object-scope permission checks, and client affordance filters diverge.
- Source anchors: `server/vueda/core/decorators.py`, `server/vueda/core/routers.py`, `server/vueda/info/serializers.py`, `server/vueda/core/serializers/fields.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/history/viewsets.py`, `server/vueda/core/utils.py`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/use/useFilteredActions.js`, `client/lib/components/DetailedView.vue`, `client/lib/stores/storeModelInfo.js`, `server/tests/unit/core/test_decorators.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/expected_results_model_info.py`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/use/useFilteredActions.spec.js`, `client/tests/unit/lib/components/DetailedView.spec.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.

## Non-goals

- Not a walkthrough for adding a new action end-to-end.
- Not a UI composition guide for action forms/buttons.
- Not a workflow transition permission model deep-dive.

## Key Concepts

### Declaration and Route Family

- What it is: action declaration extends DRF action metadata with a VUEDA `bulk` marker; router route generation partitions extra actions by `detail`/`bulk`.
- Why it exists: route shape and client affordance classification depend on stable detail-vs-list and bulk-vs-targetless semantics.
- Where it lives: `server/vueda/core/decorators.py`, `server/vueda/core/routers.py`, `server/tests/unit/core/test_decorators.py`.

### Model-Scope Action Metadata

- What it is: model-info emits built-in CRUD action metadata plus extra-action metadata (`name`, `detail`, `bulk`, methods, optional parameters), filtered by permission checks and `get_allowed_extra_actions(request)`.
- Why it exists: model-scope action discovery is the route admission and config default source.
- Where it lives: `server/vueda/info/serializers.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/expected_results_model_info.py`.

### Object-Scope Action Availability

- What it is: `available_actions` is computed per serialized object from object-permission checks, then augmented with `get_allowed_extra_actions(request, instance=instance)`.
- Why it exists: model-level action visibility is insufficient for concrete object state and row-level constraints.
- Where it lives: `server/vueda/core/serializers/fields.py`, `server/vueda/core/utils.py`, `server/tests/unit/core/test_viewsets.py`.

### Client Action Gating and Fallback

- What it is: client normalizes route action names (`read` -> `retrieve`), gates routes through model-info actions and optional `routeActions`, and resolves view components with not-found fallback.
- Why it exists: route admission and rendering stay synchronized with server-advertised action namespace.
- Where it lives: `client/lib/utils/actionMap.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/views/ViewActionRouter.spec.js`, `client/tests/unit/lib/utils/actionMap.spec.js`.

### UI Affordance Filtering Layers

- What it is: group-config filtering (`config.actions`) and object-availability intersection (`available_actions`) are separate client-side affordance layers.
- Why it exists: product-specific UX constraints can narrow action visibility without redefining server authorization.
- Where it lives: `client/lib/use/useFilteredActions.js`, `client/lib/components/DetailedView.vue`, `client/tests/unit/lib/use/useFilteredActions.spec.js`, `client/tests/unit/lib/components/DetailedView.spec.js`.

### Dry-Run Execution Contract

- What it is: mutation actions using `Dry-Run: true` run with `request.dry_run=True` and rollback semantics; destroy explicitly supports dry-run no-commit responses.
- Why it exists: action validation/simulation can run without persistence side effects.
- Where it lives: `server/vueda/core/decorators.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_decorators.py`, `server/tests/unit/core/test_viewsets.py`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.decorators}`
- `{@api py:function:vueda.core.decorators.action}`
- `{@api py:property:vueda.core.decorators.DRY_RUN_HEADER}`
- `{@api py:module:vueda.core.routers}`
- `{@api py:class:vueda.core.routers.VuedaRouter}`
- `{@api py:function:vueda.core.routers.VuedaRouter.get_routes}`
- `{@api py:module:vueda.info.serializers}`
- `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}`
- `{@api py:module:vueda.core.viewsets}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}`
- `{@api py:module:vueda.core.serializers.fields}`
- `{@api py:class:vueda.core.serializers.fields.AvailableActionsField}`
- `{@api py:function:vueda.core.serializers.fields.AvailableActionsField.get_value}`
- `{@api py:class:vueda.core.utils.AvailableActionsRequest}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.utils/actionMap}`
- `{@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}`
- `{@api js:module:@arrai-innovations/vueda.router/guards}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.use/useFilteredActions}`
- `{@api js:function:@arrai-innovations/vueda.use/useFilteredActions.useFilteredActions}`
- `{@api vue:component:ViewActionRouter}`

## Contracts and Invariants

- `model_actions` is empty when the canonical registration has no viewset. Anchors: `server/vueda/info/serializers.py`.
- Built-in action candidates are `list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`; `destroy` is flagged `bulk: true`; non-list/non-create built-ins are flagged `detail: true` and include `detail_args` (default `["pk"]`). Anchors: `server/vueda/info/serializers.py`, `server/vueda/core/viewsets/__init__.py`.
- Built-in action inclusion is permission-sensitive and evaluated with synthetic request context (`AvailableActionsRequest`) plus `obj=None`; denied actions are omitted from `model_actions`. Anchors: `server/vueda/info/serializers.py`, `server/vueda/core/utils.py`, `server/tests/unit/info/test_model_info.py`.
- Extra action metadata uses `url_name` as the action name, carries `detail`/`bulk` and method mapping, and includes signature-derived parameters for detail actions (excluding `self` and `request`). Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/expected_results_model_info.py`, `server/vueda/history/viewsets.py`.
- Extra action visibility at model scope is filtered by `get_allowed_extra_actions(request)` when implemented. Anchors: `server/vueda/info/serializers.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/store/viewsets.py`.
- `available_actions` on object payloads is object-scope: standard actions run through object-permission checks; `create` is excluded for concrete instances; allowed extra actions are appended from `get_allowed_extra_actions(request, instance=instance)`. Anchors: `server/vueda/core/serializers/fields.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`.
- Router route generation treats detail extra actions as detail routes and both non-detail and `bulk` extra actions as list-route actions. Anchors: `server/vueda/core/routers.py`.
- `Dry-Run` for decorated mutation actions enforces rollback semantics at the outermost dry-run wrapper; nested dry-run action calls do not stack extra rollback calls. Anchors: `server/vueda/core/decorators.py`, `server/tests/unit/core/test_decorators.py`.
- `DELETE` dry-run returns `200` and preserves data; non-dry-run delete returns `204` when committed; validation failures surface as `400` without deletion. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`.
- Client route admission normalizes action aliases (`read` -> `retrieve`) and requires membership in the computed action set (`model_actions`, optional `routeActions`, workflow transition codes). Anchors: `client/lib/utils/actionMap.js`, `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Client affordance visibility is layered: group-filtered config actions first, then detail-view intersection with object `available_actions`. Anchors: `client/lib/use/useFilteredActions.js`, `client/lib/components/DetailedView.vue`, `client/tests/unit/lib/use/useFilteredActions.spec.js`, `client/tests/unit/lib/components/DetailedView.spec.js`.
- Model-info fetch errors are cached and reused for that `app.model` key until store lifecycle reset. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.

## Footguns

- Model-scope action visibility can exceed object-scope availability. Symptoms: route passes guard, but detail action buttons are absent or subsequent action/object requests fail (commonly row-filtered `404` on retrieve or permission denial on mutation). Anchors: `server/vueda/info/serializers.py`, `server/vueda/core/serializers/fields.py`, `server/tests/unit/core/test_row_level_permissions.py`, `client/lib/router/guards.js`, `client/lib/components/DetailedView.vue`.
- Empty or over-restrictive `config.routeActions` removes otherwise valid server actions. Symptoms: `Action Not Found` toast and redirect despite server advertising the action in `model_actions`. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Workflow transitions without a string `code` break route admission evaluation. Symptoms: thrown error (`requireModelInfo: workflow transition is missing a string code`) instead of guard-managed redirect/toast flow. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Legacy `config.routerActions` is ignored. Symptoms: expected route filtering does not happen; warning logged once. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Detail extra actions defined with variadic signatures can leak non-semantic parameter names into metadata. Symptoms: `model_actions.parameters` contains `["args", "kwargs"]` entries. Anchors: `server/vueda/history/viewsets.py`, `server/tests/unit/info/expected_results_model_info.py`.
- `bulk` is a declaration/routing signal, not automatic payload semantics. Symptoms: action is advertised as bulk and routed at list scope, but request body semantics depend entirely on action implementation. Anchors: `server/vueda/core/decorators.py`, `server/vueda/core/routers.py`, `server/tests/store/viewsets.py`.
- Cached model-info errors can make repeated route attempts fail identically without refetch. Symptoms: repeated redirects/errors for the same `app.model` until store reset/reload. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.

## Suggested Outline

- `## Contract Boundary`
- `## Server Action Declaration and Route Partitioning`
- `## Model-Scope Action Metadata`
- `## Object-Scope Availability Metadata`
- `## Client Action Namespace and Route Admission`
- `## UI Affordance Filtering Layers`
- `## Dry-Run and Mutation Semantics`
- `## Failure Surface and Drift Patterns`
