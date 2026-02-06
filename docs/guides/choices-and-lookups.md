---
title: Model Choices, Lookup Fields, and Dynamic Options
type: how-to
audience: implementor
status: briefing
---

# Model Choices, Lookup Fields, and Dynamic Options

## Intent and Scope

- Implement dynamic option loading for choice-backed fields and filter lookups using VUEDA info endpoints and client helpers.
- Keep option fetching permission-aware for both direct choices and related-model lookup choices.
- Treat this as a briefing: implementation map, contracts, and validation points only.

## Non-goals

- Not a full architecture explanation of server-client metadata.
- Not a visual/UX pattern guide for dropdown and picker components.
- Not a replacement for source code and tests as behavior authority.

## Key Concepts/Tasks

### 1. Register models before wiring choice lookups

- Register canonical serializer + viewset so info choice endpoints can resolve the content type.
- Do this in app `ready()` to avoid missing registry data during request handling.
- Source anchors: `server/vueda/info/registration.py`, `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_err.py`.

### 2. Use field choices endpoint for serializer/model choice fields

- Fetch model field options from `GET /vueda.info/model_info_choices/{app_label}/{model}/{field}/`.
- Expect permission checks for source model `read`, and additionally related model `list` when choices come from relations.
- Expect `404` on invalid/non-choice fields, with valid-choice field hints when available.
- Source anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_err.py`.

### 3. Use filter choices endpoint for filterset-based lookup options

- Fetch filter lookup options from `GET /vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/`.
- Expect the empty option to be prepended when `empty_label` is set; `empty_value` comes from filter config or default settings.
- Expect `404` for invalid filter names and `403` for missing permissions.
- Source anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`, `server/tests/unit/info/test_model_info_err.py`.

### 4. Wire client fetching with explicit intent controls

- Use `useModelChoices` with per-field `{ app, model, intendToFetch, isFilter }`.
- Keep filter choice loading lazy where needed; current filter UI fetches when open or when a query already contains that filter.
- Source anchors: `client/lib/use/useModelChoices.js`, `client/lib/stores/storeModelChoices.js`, `client/lib/components/FilterComponent.vue`, `client/tests/unit/lib/use/useModelChoices.spec.js`.

### 5. Verify response normalization and label strategy

- Expect choice payloads as `{label, value}` entries; several server paths normalize values to strings.
- For related/queryset-backed labels, ensure model naming supports `get_formatted_name` or a valid `formatted_name_lookup_expression`.
- Source anchors: `server/vueda/info/viewsets.py`, `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`, `server/tests/unit/info/test_model_info_err.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:module:vueda.info.registration}`
- `{@api py:module:vueda.info.viewsets}`
- `{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet}`
- `{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}`
- `{@api py:class:vueda.info.serializers.ModelInfoChoicesSerializer}`
- `{@api py:class:vueda.info.serializers.ModelInfoFilterSetChoicesSerializer}`
- REST:
- `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelChoices}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelChoices.storeModelChoices}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelChoices}`
- `{@api js:function:@arrai-innovations/vueda.use/useModelChoices.useModelChoices}`
- Vue.js Components:
- `{@api vue:component:FilterComponent}`

## Contracts and Invariants

- Choice endpoints only resolve registered content types.
- Field/filter choice permission checks differ by source type: direct choices require model `read`; related choices require model `read` plus related model `list`.
- Filter choices can prepend an empty option after queryset filtering/pagination setup.
- `useModelChoices` does not fetch when inactive or when `intendToFetch` is false.
- `storeModelChoices` deduplicates in-flight fetches per `app.model.field`.
- Source anchors: `server/vueda/info/registration.py`, `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`, `client/lib/use/useModelChoices.js`, `client/lib/stores/storeModelChoices.js`, `client/tests/unit/lib/stores/storeModelChoices.spec.js`, `client/tests/unit/lib/use/useModelChoices.spec.js`.

## Footguns

- Missing registration leads to endpoint `404` ("Unable to find the content type ...") even when model code exists.
- Invalid field/filter names return `404` detail messages; this can look like route issues if not checked closely.
- Related lookup models missing formatted-name support can fail at runtime when resolving labels.
- Filter choices are often lazily fetched in UI; expecting eager availability can produce empty option lists until interaction.
- Source anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_err.py`, `client/lib/components/FilterComponent.vue`.

## Suggested Outline

```md
## Goal and Preconditions
## Registry and Route Preconditions
## Field Choice Endpoint Wiring
## Filter Choice Endpoint Wiring
## Client Fetch Strategy
## Verification Checklist
## Troubleshooting
```
