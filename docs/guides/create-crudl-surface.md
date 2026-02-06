---
title: Create a CRUDL Surface for a New Model
type: how-to
audience: implementor
status: briefing
---

# Create a CRUDL Surface for a New Model

## Intent and Scope

- Build one model surface that supports list, retrieve/read, create, update/partial_update, and destroy, and is fully discoverable by model-info.
- Include enough server + client integration so route guards and action routing work out-of-the-box.
- Treat this as a briefing: implementation map, contracts, and verification points, not final tutorial prose.

## Non-goals

- Not covering workflow transition design in depth.
- Not covering advanced view/model customization patterns beyond CRUDL baseline.
- Not guaranteeing generated API docs are behavior-complete; source code remains authoritative.

## Key Tasks

### 1. Define model baseline for VUEDA conventions

- Prefer `VuedaBaseModel` (or another VUEDA base) and `BaseModelMeta` permission defaults.
- Ensure a stable formatted-name strategy if model will appear in choice endpoints.
- Source anchors: `server/vueda/core/models.py`, `server/vueda/info/viewsets.py`.

### 2. Define canonical serializer contract

- Extend `VuedaSerializer` (or `VuedaHistorySerializer`) and explicitly declare fields used by CRUD views.
- Keep serializer field names/types as the source for `model_fields` metadata.
- Source anchors: `server/vueda/core/serializers/__init__.py`, `server/tests/store/serializers.py`.

### 3. Define viewset behavior and exposure

- Extend `VuedaViewSet` (or `VuedaHistoryViewSet`), set queryset/serializer/filterset/ordering.
- Add extra actions with `@action` only when route/permission behavior is explicitly needed.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/decorators.py`, `server/tests/store/viewsets.py`.

### 4. Register routes

- Register the viewset under `VuedaRouter`.
- Include router URLs in project URLs.
- Source anchors: `server/vueda/core/routers.py`, `server/tests/store/routers.py`, `server/tests/root_urls.py`.

### 5. Register canonical serializer/viewset for model-info

- Register in app `ready()` so the model appears in `/vueda.info/model_info/*`.
- Source anchors: `server/vueda/info/registration.py`, `server/vueda/user/apps.py`, `server/vueda/release/apps.py`, `server/vueda/vdq/apps.py`.

### 6. Wire client route and action resolution

- Use `makeCRUDRoutes` and the `requireModelInfo` guard; in the provided templates, this wiring lives in `client/src/router/index.js`.
- Ensure action names used in routes/components align with metadata conventions (`read` vs `retrieve` mapping).
- Source anchors: `client/lib/router/makeCrud.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/router/routerComponent.js`, `client/lib/utils/actionMap.js`.

### 7. Verify end-to-end behavior

- Verify list/detail/create/update/delete and model-info fetch for the model.
- Verify bulk destroy path (`DELETE` list with `{"pks":[...]}`) and optional dry-run.
- Verify invalid fields/expands and invalid filters fail with expected errors.
- Source anchors: `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/core/test_serializers.py`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:class:vueda.core.models.VuedaBaseModel}`
- `{@api py:class:vueda.core.models.BaseModelMeta}`
- `{@api py:class:vueda.core.serializers.VuedaSerializer}`
- `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
- `{@api py:class:vueda.core.filters.VuedaFilterSet}`
- `{@api py:class:vueda.core.routers.VuedaRouter}`
- `{@api py:function:vueda.info.registration.register}`
- `{@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}`
- REST:
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- JavaScript:
- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.router/routerComponent.setCrudComponents}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.router/getCrud.getCRUDForTo}`
- Vue.js Components:
- `{@api vue:component:ViewActionRouter}`

## Contracts and Invariants

- CRUDL permissions map to `create/read/update/delete/list` codenames by default.
- Bulk destroy expects integer `pks` payload and validates missing objects before delete.
- Route/action availability is permission-filtered server-side and then re-filtered client-side by config/workflow.
- List results may be row-level filtered by model `RowLevelPermissions`.
- Model-info must include a PK-marked field for client consumption.
- Source anchors: `server/vueda/core/models.py`, `server/vueda/core/serializers/__init__.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/permissions.py`, `server/vueda/info/serializers.py`, `client/lib/stores/storeModelInfo.js`, `client/lib/router/guards.js`.

## Footguns

- Forgetting `info.register(...)` means model-info lookup fails and CRUD routes may be blocked by guard checks.
- `register_serializer(...)` without a viewset yields reduced metadata (not a full CRUDL surface).
- `VuedaViewSet` does not itself wrap CRUD handlers in `transaction.atomic`; add explicit transaction strategy where needed.
- Invalid query params on list can return server error (`500`) due strict query validation.
- Mismatch between route action `retrieve` and default component key `read` can break expected action view resolution.
- Source anchors: `server/vueda/info/registration.py`, `server/vueda/core/viewsets/__init__.py`, `client/lib/views/ViewActionRouter.vue`, `client/lib/router/routerComponent.js`, `client/lib/utils/actionMap.js`.

## Suggested Outline

```md
## Goal and Preconditions
## Model and Permission Baseline
## Serializer Contract
## ViewSet Contract
## Router and URL Wiring
## Model-Info Registration
## Client Route Wiring
## Verification Checklist
## Troubleshooting
```
