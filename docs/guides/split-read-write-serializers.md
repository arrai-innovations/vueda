---
title: Split Read/Write Serializers Safely
type: how-to
audience: implementor
status: briefing
---

# Split Read/Write Serializers Safely

## Intent and Scope

- Define a stable pattern for using different serializers for read actions (`list`/`retrieve`) versus write actions (`create`/`update`/`partial_update`).
- Keep client metadata and form behavior coherent while splitting serializers.
- Treat this as a technical briefing: contracts and implementation map, not final tutorial prose.

## Non-goals

- Not a general serializer design guide.
- Not a replacement for generated API docs; source code and tests remain authoritative for behavior details.
- Not covering unrelated patterns such as nested writable inlines in depth.

## Key Tasks

### 1. Define canonical metadata serializer explicitly

- Model-info field metadata is derived from the registered canonical serializer, not from per-action runtime selection.
- Register canonical serializer/viewset pair in app `ready()` via `info.register(...)`; use `register_serializer(...)` only when you accept limited metadata.
- Source anchors: `server/vueda/info/registration.py`, `server/vueda/info/serializers.py`, `server/tests/unit/info/test_registration.py`.

### 2. Add per-action serializer mapping on the viewset

- Use `PerActionSerializerMixin` and set action-specific attributes like `list_serializer_class`, `retrieve_serializer_class`, `create_serializer_class`, `update_serializer_class`, and `partial_update_serializer_class`.
- Keep inheritance order so the mixin method is used (for example, `class MyViewSet(PerActionSerializerMixin, VuedaViewSet): ...`).
- Source anchors: `server/vueda/core/viewsets/__init__.py`.

### 3. Keep write responses compatible with client redirect flow

- Create/update forms include PK in requested fields and redirect based on the returned object PK.
- Ensure write serializers return the PK field, or post-submit redirects to read/update can fail.
- Source anchors: `client/lib/views/ViewCreate.vue`, `client/lib/views/ViewUpdate.vue`, `client/lib/use/useObjectForm.js`.

### 4. Validate query param behavior for each action serializer

- `f`/`e` query params are validated against the action serializer and permitted expands.
- Splitting serializers can surface `400` errors if fields/expands expected by the client are missing from the selected serializer.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`.

### 5. Verify metadata and action behavior in tests

- Verify list/retrieve/create/update/partial_update payloads and validation behavior with the new serializer split.
- Verify model-info still reflects the intended contract for client rendering and route guards.
- Source anchors: `server/tests/unit/info/test_model_info.py`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:class:vueda.core.viewsets.PerActionSerializerMixin}`
- `{@api py:function:vueda.core.viewsets.PerActionSerializerMixin.get_serializer_class}`
- `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
- `{@api py:function:vueda.info.registration.register}`
- `{@api py:function:vueda.info.registration.register_serializer}`
- `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.use/useObjectForm}`
- Vue.js Components:
- `{@api vue:component:ViewCreate}`
- `{@api vue:component:ViewUpdate}`

## Contracts and Invariants

- `PerActionSerializerMixin.get_serializer_class` selects `{action}_serializer_class` when present; otherwise it falls back to default serializer resolution.
- `VuedaViewSet` does not include `PerActionSerializerMixin` by default.
- Model-info `model_fields` come from the canonical registered serializer; they do not automatically follow per-action serializer splits.
- Model-info `model_actions` requires a registered canonical viewset.
- Client create/update flows expect a usable PK in write responses for route redirects.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/info/serializers.py`, `server/vueda/info/registration.py`, `client/lib/use/useObjectForm.js`.

## Footguns

- Putting `PerActionSerializerMixin` after `VuedaViewSet` in the inheritance list can bypass your action-specific serializer mapping.
- Splitting serializers without aligning canonical registration can produce metadata that does not match runtime action payloads.
- Forgetting `partial_update_serializer_class` commonly leaves PATCH using an unintended serializer.
- Omitting PK from write serializer output can break default post-submit redirects.
- Using `register_serializer(...)` alone removes action/filter/order metadata that many client flows expect.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/info/registration.py`, `client/lib/views/ViewCreate.vue`, `client/lib/views/ViewUpdate.vue`, `client/lib/use/useObjectForm.js`.

## Suggested Outline

```md
## Problem and Preconditions
## Canonical Serializer and Registration Choice
## ViewSet Action-to-Serializer Mapping
## Client Compatibility Checks
## Metadata Consistency Checks
## Test Checklist
## Troubleshooting
```
