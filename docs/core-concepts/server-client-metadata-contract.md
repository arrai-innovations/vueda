---
title: Server-Client Metadata Contract
type: explanation
audience: implementor
status: briefing
---

# Server-Client Metadata Contract

## Intent and Scope

- Define the authoritative metadata contract exposed by model-info and related choices endpoints: fields, actions, expands, ordering, filtering, and permissions.
- Define server authority and client responsibilities for metadata lifecycle: registration, derivation, normalization, caching, and route/action gating.
- Establish contract-level invariants and failure surfaces for permission-sensitive visibility and metadata integrity (including PK and choice semantics).
- Treat generated API docs as index pointers, not as the final source of truth for behavior details.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/info/viewsets.py`, `client/lib/stores/storeModelInfo.js`, `client/lib/router/guards.js`, `client/lib/views/ViewActionRouter.vue`.

## Non-goals

- Not a walkthrough for adding a new model end-to-end (that belongs in a how-to).
- Not a complete reference for every field type or filter type.
- Not a promise that generated API pages contain exhaustive behavior notes.

## Key Concepts

### Registration is the discoverability boundary

- Model info endpoints only expose content types in the registration registry.
- Registration pairs a canonical serializer and (optionally) canonical viewset; this controls what metadata can be derived.
- Source anchors: `server/vueda/info/registration.py`, `server/vueda/info/viewsets.py`, `server/vueda/user/apps.py`, `server/vueda/release/apps.py`, `server/vueda/vdq/apps.py`.

### Metadata shape is serializer/viewset derived, not model-table derived

- `model_fields` come from serializer fields, including read/write/choices/constraints metadata.
- `model_actions`, `model_ordering`, and `model_filtering` depend on having a canonical viewset.
- `model_permissions` come from content type permissions.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/core/serializers/__init__.py`, `server/vueda/core/viewsets/__init__.py`.

### Action availability is request/user sensitive

- Model-info actions are filtered by permission checks against a request/user context.
- Extra actions are additionally filtered by `get_allowed_extra_actions`.
- Object payloads also expose `available_actions` via serializer field logic.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/core/serializers/fields.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/permissions.py`.

### Choices are split across dedicated endpoints

- Field choices and filter-choice values are served by dedicated info endpoints.
- Choice permission checks differ for local choices vs related-model choices (`read` + sometimes related `list`).
- Source anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.

### Client consumption is normalized and cached

- Client fetches model-info with explicit `f` and `e` query params and caches by `app.model`.
- Client normalizes `model_*` keys and requires a detectable PK in returned fields.
- Route guards rely on metadata action names plus config/workflow overlays before route entry.
- Source anchors: `client/lib/stores/storeModelInfo.js`, `client/lib/use/useModelInfo.js`, `client/lib/router/guards.js`, `client/lib/stores/storeModelConfig.js`.

## Relevant Implementation Surface

- Python:
- {@api py:module:vueda.info.registration}
- {@api py:module:vueda.info.viewsets}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:class:vueda.core.serializers.fields.AvailableActionsField}
- REST:
- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}

- JavaScript:
- {@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}
- {@api js:module:@arrai-innovations/vueda.use/useModelInfo}
- {@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}

- Vue.js Components:
- {@api vue:component:ViewActionRouter}

## Contracts and Invariants

- Only registered models appear in model-info `list`/`retrieve` responses.
- `model_fields` are derived from canonical serializer definitions; this is the client-facing field contract.
- If only a serializer is registered (no viewset), action/filter/ordering metadata is limited.
- Model-info action visibility is permission-sensitive; model permission lists themselves are not user-filtered.
- Choice values are normalized to string values in many response paths.
- Client requires a PK marker in metadata fields; missing PK is a client error.
- Source anchors: `server/vueda/info/viewsets.py`, `server/vueda/info/registration.py`, `server/vueda/info/serializers.py`, `client/lib/stores/storeModelInfo.js`, `server/tests/unit/info/test_registration.py`, `server/tests/unit/info/test_model_info.py`.

## Footguns

- Registering with `register_serializer` alone can leave model-info without action/filter/order metadata.
- Action naming can drift between server (`retrieve`) and client route/view naming (`read`) if not normalized consistently.
- Model-info fetch failures are cached client-side and block retry until cache reset/reload.
- Choice metadata can fail if expected formatted-name lookup conventions are missing on related models.
- Assuming generated API detail pages are exhaustive can lead to incorrect docs; validate with source/tests first.
- Source anchors: `server/vueda/info/registration.py`, `client/lib/utils/actionMap.js`, `client/lib/views/ViewActionRouter.vue`, `client/lib/stores/storeModelInfo.js`, `server/tests/unit/info/test_model_info_err.py`.

## Suggested Outline

```md
## Why This Contract Exists
## Authoritative Data Sources
## Metadata Sections and Semantics
## Permission-Sensitive Behavior
## Choices and Filter-Choices Contract
## Client Normalization and Caching Rules
## Compatibility Expectations
## Failure Modes and Recovery
```
