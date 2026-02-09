---
title: Control Action Availability in the UI
type: how-to
audience: implementor
status: briefing
---

# Control Action Availability in the UI

## Intent and Scope

- Implement action availability so routing and rendered controls stay aligned with server metadata, client config, group rules, and workflow transitions.
- Keep server authorization as final authority; client checks are pre-routing and UX filtering layers.
- Treat this as a briefing: contracts, implementation touchpoints, and verification points only.

## Non-goals

- Not a full workflow architecture explanation.
- Not a full UI component customization guide.
- Not a guarantee that generated API docs capture all runtime behavior; code/tests are authoritative.

## Key Tasks

### 1. Make server action metadata permission-sensitive

- Ensure canonical viewsets are registered so `model_actions` can be derived; serializer-only registration yields no actions.
- For base CRUD actions, rely on `check_object_permissions` filtering in model-info generation.
- Use `get_allowed_extra_actions` to include/exclude extra actions intentionally.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/expected_results_model_info.py`, `server/tests/store/viewsets.py`.

### 2. Emit object-level availability for detail UI controls

- Include `available_actions` in object serializer responses where detail views need per-object filtering.
- Expect per-object action checks to skip `create` for instance payloads and to include allowed extra actions.
- Source anchors: `server/vueda/core/serializers/fields.py`, `server/vueda/core/permissions.py`, `server/tests/unit/core/test_viewsets.py`.

### 3. Gate routes with model-info actions plus optional config/workflow overlays

- Use `makeCRUDRoutes` so both detail and list action routes pass through `requireModelInfo`.
- In `requireModelInfo`, start from model-info actions, optionally filter by `config.routeActions`, then append workflow permitted transitions.
- Normalize route action names (`read` -> `retrieve`) before availability checks.
- Source anchors: `client/lib/router/makeCrud.js`, `client/lib/router/guards.js`, `client/lib/utils/actionMap.js`, `client/tests/unit/lib/router/makeCrud.spec.js`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/utils/actionMap.spec.js`.

### 4. Filter rendered actions in components by config groups and object availability

- Use `useFilteredActions` for group-based action filtering from `modelConfig.config.actions`.
- In detail-style views, intersect filtered actions with object `available_actions` before rendering.
- Keep workflow transition controls sourced from workflow transition stores, not inferred from CRUD action metadata.
- Source anchors: `client/lib/use/useFilteredActions.js`, `client/lib/components/DetailedView.vue`, `client/lib/views/ViewList.vue`, `client/lib/views/ViewCreate.vue`, `client/tests/unit/lib/use/useFilteredActions.spec.js`, `client/tests/unit/lib/components/DetailedView.spec.js`.

### 5. Handle unavailable actions and unknown actions consistently

- Guard-level denial should toast and redirect for unknown model/action combinations.
- View router should render `ViewActionNotFound` when the action/transition cannot be resolved after model config/workflow load.
- Source anchors: `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/views/ViewActionRouter.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}`
- `{@api py:class:vueda.core.serializers.fields.AvailableActionsField}`
- `{@api py:function:vueda.core.serializers.fields.AvailableActionsField.get_value}`
- `{@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}`
- `{@api py:class:vueda.core.permissions.ObjectPermissions}`
- REST:
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}`
- JavaScript:
- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}`
- `{@api js:function:@arrai-innovations/vueda.use/useFilteredActions.useFilteredActions}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}`
- Vue.js Components:
- `{@api vue:component:ViewActionRouter}`

## Contracts and Invariants

- Model-info `model_actions` is empty when canonical viewset is missing.
- Model-info action visibility is user/request sensitive and filtered through viewset permission checks.
- Object `available_actions` is instance-sensitive, excludes `create` on instance payloads, and may include allowed extra actions.
- Client route access is approved only when normalized action name is found in merged action set (model-info actions + optional `routeActions` filter + permitted transitions).
- Detail UI action buttons are a strict intersection of `useFilteredActions` output and object `available_actions`.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/core/serializers/fields.py`, `server/vueda/core/viewsets/__init__.py`, `client/lib/router/guards.js`, `client/lib/components/DetailedView.vue`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/expected_results_model_info.py`, `server/tests/unit/core/test_viewsets.py`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/components/DetailedView.spec.js`.

## Footguns

- `routeActions` is the supported route-filtering key; legacy `routerActions` is ignored with a warning.
- Guard transition matching now requires transition `code`; malformed transition entries (missing code) throw explicitly during route checks.
- `storeModelInfo` caches fetch errors; retries for the same model key do not refetch until cache reset/reload.
- `storeWorkflow.fetchObjectTransitions` currently clears a promise slot in `objectStates` instead of `objectTransitions` (tracked by unit test setup comments), so promise lifecycle behavior needs caution.
- Source anchors: `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/utils/actionMap.js`, `client/lib/stores/storeModelInfo.js`, `client/lib/stores/storeWorkflow.js`, `client/tests/unit/lib/router/guards.spec.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`, `client/tests/unit/lib/stores/storeWorkflow.spec.js`.

## Suggested Outline

```md
## Goal and Preconditions
## Server Action Metadata Contract
## Object-Level Availability Contract
## Route Guard Wiring
## Component-Level Action Filtering
## Workflow Transition Handling
## Verification Checklist
## Troubleshooting
```
