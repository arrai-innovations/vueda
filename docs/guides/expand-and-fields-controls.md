---
title: Use Expand and Sparse Field Controls
type: how-to
audience: implementor
status: briefing
---

# Use Expand and Sparse Field Controls

## Intent and Scope

- Scope one model surface so list/read/create/update payloads use explicit `f` (fields) and `e` (expand) controls.
- Keep server allow-lists and client defaults aligned so fetch shape is predictable per action.
- Treat this as briefing-level scoping: implementation map + contracts, not polished tutorial prose.

## Non-goals

- Not a deep explanation of model-info architecture.
- Not a generic serializer design guide.
- Not a claim that generated API docs are behavior-complete; source and tests are authoritative.

## Key Tasks

### 1. Define server expand surface first, then action-level allow-lists

- Define serializer `Meta.expandable_fields` for relations that can be embedded.
- Restrict by action with `permit_list_expands` / `permit_retrieve_expands` on the viewset where needed.
- Source anchors: `server/vueda/core/serializers/__init__.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/viewsets.py`, `server/tests/store/viewsets.py`.

### 2. Enforce and verify `f`/`e` validation behavior at the server boundary

- `list`/`retrieve` reject unknown sparse fields and expands with `400` and field-keyed error payloads.
- When no expands are permitted for the action, invalid expand responses explicitly say so.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/core/test_serializers.py`.

### 3. Align model-info expand metadata with client defaults

- `model_expands` is derived from the canonical registered serializer’s `get_expandable_fields()`.
- Default client config sets `expand` from model-info expand names, then merges/flat-maps expand field details into `expand__subfield` keys.
- Source anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`, `client/lib/stores/storeModelConfig.js`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

### 4. Keep view request params explicit and minimal

- List requests send configured `f` + `e`, always including the PK in list fetch fields.
- Detailed read/update flows request PK + `fetchFields` + `available_actions`, plus configured expands.
- CRUD helpers serialize `f`/`e` arrays into query strings and preserve 400s as form validation errors.
- Source anchors: `client/lib/views/ViewList.vue`, `client/lib/components/DetailedView.vue`, `client/lib/utils/objectCrud.js`, `client/tests/unit/lib/utils/objectCrud.spec.js`.

### 5. Verify contract with focused checks before rollout

- Confirm valid expands return embedded data on list/retrieve for allowed actions.
- Confirm invalid `f`/`e` values fail deterministically (400) and no partial success is returned.
- Confirm overridden `expand` config still matches server-permitted expands.
- Source anchors: `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/core/test_serializers.py`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_field_param}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_param}`
- `{@api py:class:vueda.core.viewsets.FlexFieldsMixin}`
- `{@api py:function:vueda.core.viewsets.FlexFieldsMixin.get_serializer_context}`
- `{@api py:class:vueda.core.serializers.VuedaSerializer}`
- `{@api py:function:vueda.core.serializers.NoExtraFieldsSerializerMixin.validate}`
- `{@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_expandable_fields}`
- REST:
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelConfig}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.utils/objectCrud}`
- `{@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectRetrieve}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.FIELDS_PARAM}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.EXPAND_PARAM}`
- Vue.js Components:
- `{@api vue:component:ViewList}`
- `{@api vue:component:DetailedView}`

## Contracts and Invariants

- Sparse fields are requested via query param `f` (and expands via `e`) in client request construction.
- Invalid `e` values return `400` with explicit permitted expand messaging; permitted set is action-sensitive when `permit_{action}_expands` is set.
- Invalid `f` values return `400` and are validated against serializer fields plus flex-resolved fields.
- Expanded nested serializers omit `available_actions` by default in expanded payloads.
- Client default `displayFields`/`fetchFields`/`submitFields` omit PK, but list/read requests inject PK for fetch correctness.
- Empty `expand` config disables expansion flattening (`expand__subfield` keys are not populated in `fieldDetails`).
- List query params outside filter + allowed extras currently return `500`, not `400`.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/serializers/__init__.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/core/test_serializers.py`, `client/lib/utils/constants.js`, `client/lib/utils/objectCrud.js`, `client/tests/unit/lib/utils/objectCrud.spec.js`, `client/lib/stores/storeModelConfig.js`, `client/lib/views/ViewList.vue`, `client/lib/components/DetailedView.vue`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

## Footguns

- Setting client `expand` defaults broader than server `permit_*_expands` causes immediate `400` on list/read.
- Assuming expanded field-detail keys exist when `expand` is overridden to `[]` causes missing renderer/config keys.
- Treating unknown list query keys as normal validation errors is misleading; current behavior is server `500`.
- Invalid expand + nested write payloads can surface type errors before full expand error aggregation.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/core/test_serializers.py`, `client/lib/stores/storeModelConfig.js`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

## Suggested Outline

```md
## Goal and Preconditions
## Server Expand and Field Allow-Lists
## Client Default Field/Expand Strategy
## List and Detail Request Param Wiring
## Validation and Error-Handling Checks
## Verification Checklist
## Troubleshooting
```
