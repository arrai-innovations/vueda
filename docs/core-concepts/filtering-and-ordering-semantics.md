---
title: Filtering and Ordering Semantics
type: explanation
audience: implementor
status: briefing
---

# Filtering and Ordering Semantics

## Intent and Scope

- Define the contract boundary for filtering and ordering: canonical server declaration, metadata projection, query acceptance, and client consumption.
- Define search backend semantics as part of the list-query contract (ranked search and lookup prefix behavior).
- Define authority for each layer: registered canonical viewset/filterset, metadata endpoints, list endpoint validation, and client normalization/rendering.
- Capture implementation-level invariants and observable failure surfaces for filter/order semantics.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/filters.py`, `server/vueda/core/default_settings.py`, `server/vueda/info/viewsets.py`, `client/lib/stores/storeModelInfo.js`, `client/lib/stores/storeModelConfig.js`, `client/lib/views/ViewList.vue`.

## Non-goals

- Not a procedure for creating filtersets or ordering rules.
- Not a how-to for defining `search_fields` or tuning search thresholds.
- Not an exhaustive catalog of all model-specific filters/order fields.
- Not UI usage guidance for filter/sort controls.

## Key Concepts

### Canonical viewset is the authority for filter/order metadata

- What it is: `model_filtering` and `model_ordering` are derived from the canonical registered viewset, not from serializer fields alone.
- Why it exists: filter and ordering contracts depend on `filterset_class` and `ordering_fields`.
- Where it lives: `server/vueda/info/serializers.py`, `server/vueda/info/registration.py`, `server/tests/unit/info/test_registration.py`, `server/tests/unit/info/expected_results_model_info.py`.

### Metadata projection normalizes backend filter/order definitions

- What it is: `ModelInfoSerializer` projects filter and ordering definitions into model-info payloads (`lookup_exprs`, suffixes, choice metadata, type classification).
- Why it exists: clients consume one metadata contract instead of introspecting django-filter/DRF classes at runtime.
- Where it lives: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/expected_results_model_info.py`.

### Query parameter namespace is shared across server and client

- What it is: search/order/flex params are canonicalized as `s`, `o`, `e`, `f`, `om`.
- Why it exists: list/query behavior and model-info fetch behavior rely on the same stable wire keys.
- Where it lives: `server/vueda/core/default_settings.py`, `client/lib/utils/constants.js`, `client/lib/views/ViewList.vue`, `client/lib/stores/storeModelInfo.js`.

### Ranked search backend and prefixes

- What it is: `VuedaSearchFilterBackend` extends DRF `SearchFilter` with custom lookup prefixes (`#`, `~`, `V:`) and ranked search combining full-text, trigram, and word-boundary matches. Source anchors: `server/vueda/core/filters.py#L85`, `server/vueda/core/filters.py#L90`, `server/vueda/core/filters.py#L160`, `server/vueda/core/filters.py#L172`.
- Why it exists: ranked search and deterministic lookups share a single list-query search surface. Source anchors: `server/vueda/core/filters.py#L125`.
- Where it lives: `vueda.core.filters.VuedaSearchFilterBackend` and default filter backend settings. Source anchors: `server/vueda/core/filters.py#L90`, `server/vueda/core/default_settings.py#L265`.

### Query validation boundary is strict on list endpoints

- What it is: list endpoints reject query keys outside the derived filter namespace and known framework params.
- Why it exists: unknown query keys are treated as invalid contract usage instead of being ignored.
- Where it lives: `server/vueda/core/viewsets/__init__.py`.

### Filter-choice endpoints are permission-aware contract extensions

- What it is: filter-choice lookup validates filter keys and applies permission checks based on static choices vs related-model queryset choices.
- Why it exists: dynamic choice discovery must preserve authorization boundaries and avoid leaking relation values.
- Where it lives: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`, `server/tests/unit/info/test_model_info_err.py`.

### Client runtime treats model-info as cached contract state

- What it is: client fetches and normalizes `model_*` metadata once per `app.model`, then derives filter/sort config from that cache.
- Why it exists: UI configuration is metadata-driven and should avoid repeated model-info network calls.
- Where it lives: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`, `client/lib/stores/storeModelConfig.js`, `client/lib/use/useFilter.js`.

## Relevant Implementation Surface

- `{@api rest:endpoint:GET:/vueda.info/model_info/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_filtering}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_ordering}`
- `{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}`
- `{@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}`
- `{@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.validate_queryset}`
- `{@api py:module:vueda.core.filters}`
- `{@api py:class:vueda.core.filters.VuedaSearchFilterBackend}`
- `{@api py:function:vueda.info.viewsets.ModelInfoChoicesBaseViewSet.check_permissions}`
- `{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.list}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelChoices}`
- `{@api js:module:@arrai-innovations/vueda.use/useFilter}`
- `{@api js:module:@arrai-innovations/vueda.use/useFilterForm}`
- `{@api js:module:@arrai-innovations/vueda.use/useModelChoices}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.ORDERING_PARAM}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.SEARCH_PARAM}`
- `{@api vue:component:ViewList}`
- `{@api vue:component:FilterComponent}`

## Contracts and Invariants

- `model_ordering` is derived from canonical `viewset.ordering_fields`; each entry is `{name, type}`, and missing canonical viewset yields `[]`. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/expected_results_model_info.py`.
- `model_filtering` is derived from `filterset.get_filters()`, and excluded/disabled filters are omitted from metadata. Anchors: `server/vueda/info/serializers.py`.
- Filter metadata always exposes lookup expressions as a list (`lookup_exprs`), even for single expressions. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`.
- `VuedaSearchFilterBackend` is configured as a default list-query search backend. Anchors: `server/vueda/core/default_settings.py`.
- Search lookups split into VUEDA-prefixed fields (`V:`) and deterministic fields; if no VUEDA-prefixed fields are present, search falls back to DRF `SearchFilter` behavior. Anchors: `server/vueda/core/filters.py#L148`, `server/vueda/core/filters.py#L154`.
- Ranked search computes `combined_rank`, filters by `search_threshold`, and orders by `-combined_rank` when no ordering param is provided. Anchors: `server/vueda/core/filters.py#L108`, `server/vueda/core/filters.py#L205`, `server/vueda/core/filters.py#L209`.
- Queryset-based filter choices are encoded as `choices: true` plus `app_label`/`model`/`filterset_name`; literal choices are returned as `{label, value}` entries with values normalized to string in many paths. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/expected_results_model_info.py`.
- List query validation allows filter keys, suffix-derived keys, lookup-derived keys, and framework extras (`p`, `ps`, `e`, `f`, `om`, `s`, `o`); any other query key is rejected. Anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/default_settings.py`.
- Filter-choice endpoint field contract is strict: unknown filter key returns HTTP 404 with the valid filter set listed. Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`, `server/tests/unit/info/test_model_info_err.py`.
- Filter-choice permission contract is bifurcated: static choices require current-model `read`; relation-backed choices require current-model `read` plus related-model `list`. Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.
- Client model-info cache is keyed by `app.model`; failed fetches are cached as errors and reused; missing PK in metadata is a hard client error. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.
- Client list sorting derives sortable names from `modelInfo.ordering` and sends them via query param `o`. Anchors: `client/lib/stores/storeModelConfig.js`, `client/lib/views/ViewList.vue`.

## Footguns

- Unknown list query key returns HTTP 400 with a field-keyed validation error (`Invalid query parameter.  Valid filters are ...`), consistent with flex-field validation. Anchors: `server/vueda/core/viewsets/__init__.py`, `client/lib/utils/listCrud.js`.
- If no search fields use the `V:` prefix, ranked search is bypassed and DRF `SearchFilter` behavior applies. Anchors: `server/vueda/core/filters.py#L154`, `server/vueda/core/filters.py#L156`.
- Invalid filter-choice field returns HTTP 404 with contract text naming valid filters, which can present as missing-choice UI state rather than validation feedback on the originating list view. Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.
- Missing related-model formatted-name lookup path can produce HTTP 500 during filter-choice resolution (`Cannot resolve keyword 'formatted_name'...`). Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_err.py`.
- Missing related-model `list` permission can produce HTTP 403 for filter-choice endpoints even when the model itself is readable. Anchors: `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.
- Model-info fetch errors are sticky per `app.model` in client state; repeated fetch attempts fail without a new network attempt until store reset/reload. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.
- Default filter UI path uses only the first lookup expression (`lookupExprs[0]`) and does not emit multi-lookup expression selectors by default. Anchors: `client/lib/components/FilterComponent.vue`, `client/lib/components/FilterGroup.vue`.

## Suggested Outline

- `## Contract Boundary and Authority`
- `## Metadata Projection for Ordering and Filtering`
- `## Query Namespace and Validation Boundary`
- `## Search Contract Surface`
- `## Filter Choices and Permission Surfaces`
- `## Client Normalization and Cache Semantics`
- `## Observable Failure Modes`
