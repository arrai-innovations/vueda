---
title: Authorization vs UI Semantics
type: explanation
audience: implementor
status: briefing
---

# Authorization vs UI Semantics

## Intent and Scope

- Define the boundary between server authorization authority and client action/view affordance semantics.
- Define where action availability is computed at model scope vs object scope, and where route admission is decided.
- Define why the client does not evaluate Django permission codenames as an authorization engine.
- Define failure shapes when UI-semantic admission diverges from server object-level authorization.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`, `server/vueda/info/serializers.py`, `server/vueda/core/serializers/fields.py`, `client/lib/router/guards.js`, `client/lib/router/makeCrud.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/use/useFilteredActions.js`, `client/lib/components/DetailedView.vue`, `client/lib/stores/storeModelInfo.js`, `client/lib/stores/storeWorkflow.js`.

## Non-goals

- Not a how-to for configuring route guards, model config, or permissions.
- Not a complete permission taxonomy for CRUDL/workflow/row-level internals.
- Not a UI design guide for button placement or interaction patterns.

## Key Concepts

### Server authorization is the authority boundary

- What it is: API authorization is enforced server-side through default DRF permissions and view/action permission checks, with object-level decisions composed in `VUEDAPermissionsMixin.has_perm`.
- Why it exists: client visibility and routing logic cannot enforce data access or mutation rights.
- Where it lives: `server/vueda/core/default_settings.py`, `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`, `server/tests/unit/core/test_permissions.py`.

### Model-scope action metadata and object-scope action metadata are distinct

- What it is: `model_actions` are computed from canonical viewset permissions at model scope, while `available_actions` are computed against concrete objects; `model_permissions` is a model permission catalog and not an executable, user-filtered action list.
- Why it exists: route-level and config-level affordances need model metadata, but object pages need per-instance action truth.
- Where it lives: `server/vueda/info/serializers.py`, `server/vueda/core/serializers/fields.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/core/test_viewsets.py`.

### Client route admission is a semantic gate, not an authorization gate

- What it is: route entry checks action presence in model-info actions, optional config `routeActions`, and workflow transition codes.
- Why it exists: avoid navigating to views without declared action semantics and avoid duplicating server permission codename logic client-side.
- Where it lives: `client/lib/router/makeCrud.js`, `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.

### UI action visibility is a layered affordance filter

- What it is: UI-visible actions are filtered by model config/group mapping and, for detail views, intersected with server-returned `available_actions`.
- Why it exists: support product-specific affordances while retaining object-level action truth.
- Where it lives: `client/lib/use/useFilteredActions.js`, `client/lib/components/DetailedView.vue`, `client/lib/views/ViewList.vue`, `client/tests/unit/lib/use/useFilteredActions.spec.js`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.permissions}`
- `{@api py:class:vueda.core.permissions.ObjectPermissions}`
- `{@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}`
- `{@api py:module:vueda.user.mixins}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
- `{@api py:module:vueda.info.serializers}`
- `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_permissions}`
- `{@api py:module:vueda.core.serializers.fields}`
- `{@api py:class:vueda.core.serializers.fields.AvailableActionsField}`
- `{@api py:function:vueda.core.serializers.fields.AvailableActionsField.get_value}`
- `{@api py:module:vueda.core.viewsets}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}`
- `{@api py:module:vueda.workflow.viewsets}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.check_permissions}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}`
- `{@api js:module:@arrai-innovations/vueda.router/guards}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireGroups}`
- `{@api js:module:@arrai-innovations/vueda.router/makeCrud}`
- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:module:@arrai-innovations/vueda.utils/actionMap}`
- `{@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}`
- `{@api js:module:@arrai-innovations/vueda.use/useFilteredActions}`
- `{@api js:function:@arrai-innovations/vueda.use/useFilteredActions.useFilteredActions}`
- `{@api vue:component:ViewActionRouter}`

## Contracts and Invariants

- REST default permission enforcement is `ObjectPermissions`, so authorization checks are server-owned even for model-info endpoints. Anchors: `server/vueda/core/default_settings.py`, `server/vueda/info/viewsets.py`.
- CRUDL codename mapping is action-sensitive for `GET`: list routes require `list_*`; non-list `GET` requires `read_*`. Anchors: `server/vueda/core/permissions.py`, `server/tests/unit/core/test_permissions.py`.
- `VUEDAPermissionsMixin.has_perm` composes baseline Django permission checks with workflow state and row-level overrides when object context exists. Anchors: `server/vueda/user/mixins.py`.
- `model_actions` are permission-filtered per request/user by running canonical viewset object-permission checks with a synthetic request and `obj=None`; extra actions are further filtered by `get_allowed_extra_actions`. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/store/viewsets.py`.
- `model_permissions` returns content-type permission metadata and is not filtered to currently executable actions for the requesting user. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`.
- `available_actions` is per-object metadata derived from object-permission checks across standard actions, then extended with allowed extra actions; create is excluded on concrete instances. Anchors: `server/vueda/core/serializers/fields.py`, `server/tests/unit/core/test_viewsets.py`.
- CRUD route generation always inserts `requireModelInfo` as a route guard for list and detail CRUD routes. Anchors: `client/lib/router/makeCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`.
- `requireModelInfo` permits navigation only when the normalized route action exists in the computed action set (model-info actions, optional `routeActions` filter, and workflow transition codes). Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Legacy `config.routerActions` is ignored; only `config.routeActions` constrains route-admitted actions. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Route/view action normalization maps `read` to `retrieve` before matching. Anchors: `client/lib/utils/actionMap.js`, `client/tests/unit/lib/utils/actionMap.spec.js`, `client/lib/views/ViewActionRouter.vue`.
- Client group-based action filtering (`useFilteredActions`) is an affordance filter over `config.actions`, not an API permission decision path. Anchors: `client/lib/use/useFilteredActions.js`, `client/tests/unit/lib/use/useFilteredActions.spec.js`.
- Detail-view action affordances are the intersection of filtered UI actions and server object `available_actions`. Anchors: `client/lib/components/DetailedView.vue`, `server/vueda/core/serializers/fields.py`.
- Workflow transition affordance ingestion depends on permitted-transition endpoint results; server enforces `vueda_workflow.read_workflow` and transition/workflow permission checks. Anchors: `server/vueda/workflow/viewsets.py`, `server/tests/unit/workflow/test_viewsets.py`, `client/lib/stores/storeWorkflow.js`, `client/lib/router/guards.js`.

## Footguns

- UI-hiding an action (`config.actions` / `routeActions`) does not revoke API permission; direct API calls can still be authorized or denied solely by server rules. Symptoms: hidden button or blocked route, but API returns success/403 based on server permissions. Anchors: `client/lib/use/useFilteredActions.js`, `client/lib/router/guards.js`, `server/vueda/core/permissions.py`.
- Treating `model_permissions` as executable action truth can over-advertise capabilities. Symptoms: UI suggests operations that are absent from `model_actions` or denied by object-level checks. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`.
- Route-admitted actions can still fail at object scope. Symptoms: route resolves, then object fetch/action returns `404` (row-level filtered) or `403`. Anchors: `client/lib/router/guards.js`, `server/tests/unit/core/test_row_level_permissions.py`, `server/vueda/core/viewsets/__init__.py`.
- Action-name drift (`read` vs `retrieve`) causes affordance mismatches. Symptoms: `Action Not Found` toast or `ViewActionNotFound` render for routes/actions that are semantically equivalent but not normalized. Anchors: `client/lib/utils/actionMap.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`.
- Transition entries without string `code` break route guard evaluation. Symptoms: thrown error (`requireModelInfo: workflow transition is missing a string code`) and aborted navigation without guard-generated toast. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.
- Model-info and workflow transition fetch failures are cached in stores. Symptoms: repeated navigation attempts short-circuit to the same cached error until store lifecycle reset. Anchors: `client/lib/stores/storeModelInfo.js`, `client/lib/stores/storeWorkflow.js`, `client/tests/unit/lib/stores/storeWorkflow.spec.js`.
- `routerActions` appears configurable but is ignored. Symptoms: unexpected route access remains allowed except where `routeActions` is explicitly set. Anchors: `client/lib/router/guards.js`, `client/tests/unit/lib/router/guards.spec.js`.

## Suggested Outline

```md
## Authorization Authority Boundary
## Model-Scope vs Object-Scope Action Semantics
## Route Admission Semantics
## UI Affordance Filtering Layers
## Workflow Transition Action Namespace
## Divergence and Failure Signatures
```
