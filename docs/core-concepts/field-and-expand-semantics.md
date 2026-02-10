---
title: Field and Expand Semantics
type: explanation
audience: implementor
status: briefing
---

# Field and Expand Semantics

## Intent and Scope

- Define the contract boundary between serializer fields, expandable fields, and sparse/expand query parameters (`f`, `e`).
- Define where field/expand semantics are enforced: serializer metadata generation, viewset validation, and client normalization/cache behavior.
- Treat this page as implementation-grounded contract description, including action-scoped expand authority and observable failure modes.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/serializers/__init__.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/info/serializers.py`, `client/lib/stores/storeModelInfo.js`.

## Non-goals

- Not an end-user walkthrough for composing `f` and `e` request values.
- Not a catalog of every model's available fields or expands.
- Not a guarantee that generated API pages are behavior-complete without source/test confirmation.

## Key Concepts

### Query parameter namespace (`f` and `e`)

- What it is: sparse field selection and expand selection are keyed by `REST_FLEX_FIELDS` server settings and mirrored as shared client constants.
- Why it exists: server and client both rely on the same parameter names for request/response compatibility.
- Where it lives: `server/vueda/core/default_settings.py`, `client/lib/utils/constants.js`, `server/vueda/core/viewsets/__init__.py`.

### Canonical serializer as metadata authority

- What it is: `model_fields` and `model_expands` are derived from the registered canonical serializer, not direct model-table reflection.
- Why it exists: one serializer shape defines both base field metadata and expandable subgraph metadata.
- Where it lives: `server/vueda/info/serializers.py`, `server/vueda/info/registration.py`, `server/tests/unit/info/test_model_info.py`.

### Expand descriptors carry nested field contracts

- What it is: each expand descriptor includes structural flags (`name`, `read_only`, `many`), related model identity when available, and nested `f` field metadata.
- Why it exists: expansion is an explicit embedded contract, not only a boolean include.
- Where it lives: `server/vueda/core/serializers/__init__.py`, `server/tests/store/serializers.py`, `server/tests/unit/info/test_model_info.py`.

### Action-scoped expand authority

- What it is: allowed expands are action-scoped via `permit_{action}_expands`, injected as `permitted_expands` serializer context.
- Why it exists: list/detail/write surfaces can expose different expansion boundaries.
- Where it lives: `server/vueda/core/viewsets/__init__.py`, `server/tests/viewsets.py`, `server/tests/unit/core/test_viewsets.py`.

### Client normalization and cache authority

- What it is: model-info responses are normalized client-side (`model_*` prefix removal, `expands` -> `expand`, nested field metadata camel-casing) and cached by `app.model`.
- Why it exists: runtime consumers use one normalized shape and avoid repeated model-info fetches.
- Where it lives: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.

## Relevant Implementation Surface

- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/}`
- `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_expands}`
- `{@api py:class:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin}`
- `{@api py:function:vueda.core.viewsets.FlexFieldsMixin.get_serializer_context}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_field_param}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_param}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.FIELDS_PARAM}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.EXPAND_PARAM}`

## Contracts and Invariants

- `f` and `e` are canonical query parameter keys across server defaults and client constants. Anchors: `server/vueda/core/default_settings.py`, `client/lib/utils/constants.js`.
- `model_fields` is serializer-derived metadata including `read_only`, `required`, `many`, type descriptors, and optional constraints/choices metadata. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`.
- Primary key membership in field metadata is explicit (`pk: true` on one field); client runtime requires it and throws if absent. Anchors: `server/vueda/info/serializers.py`, `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.
- Expand metadata is returned as descriptors, and nested `f` filtering preserves `pk` even when other child fields are removed. Anchors: `server/vueda/core/serializers/__init__.py`, `server/tests/unit/info/expected_results_model_info.py`.
- Expand allowance is action-sensitive when `permit_{action}_expands` is defined; invalid expand keys are rejected with HTTP 400. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/viewsets.py`, `server/tests/unit/core/test_viewsets.py`.
- Invalid sparse-field keys are rejected with HTTP 400 and field-keyed error payloads. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_serializers.py`.
- No VUEDA wrapper-level explicit depth cap is enforced for nested expands; expand depth is constrained only by serializer structure and viewset logic. Anchors: `server/vueda/core/serializers/__init__.py`, `server/vueda/core/viewsets/__init__.py`.

## Footguns

- Invalid expand token for a given action returns HTTP 400 with per-key `"Invalid expands..."` payload, and requested valid expands are not partially applied in the same response. Anchors: `server/tests/unit/core/test_viewsets.py`.
- Expand requested without a matching permit list can surface `"No expands are permitted."`, even when serializer `expandable_fields` exist for other actions. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`.
- Invalid sparse field keys in write/read flows return field-keyed validation errors (`code: invalid`), which can mask downstream expectations about partial payloads. Anchors: `server/tests/unit/core/test_serializers.py`, `server/vueda/core/viewsets/__init__.py`.
- Missing `pk` flag in returned metadata causes `storeModelInfo.fetchModelInfo` failure and error caching, blocking automatic retry for the same `app.model` key. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.
- Deep expansions can increase response payload size non-linearly, as no wrapper-level depth guard is enforced. Anchors: `server/vueda/core/serializers/__init__.py`.

## Suggested Outline

- `## Boundary and Ownership`
- `## Parameter Namespace and Wire Shape`
- `## Field Metadata Contract`
- `## Expand Descriptor Contract`
- `## Action-Scoped Expand Authority`
- `## Client Normalization and Cache Semantics`
- `## Observable Failure Modes`
