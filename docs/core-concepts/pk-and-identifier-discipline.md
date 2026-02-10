---
title: Primary Key and Identifier Discipline
type: explanation
audience: implementor
status: briefing
---

# Primary Key and Identifier Discipline

## Intent and Scope

- Define identifier authority boundaries across model-info metadata, client normalization, routing, and object/list CRUD transport.
- Define the wire-shape contracts for single-object identifiers vs multi-object identifier sets.
- Define stable invariants relied on by model config and lookup caches when PK field names are not `id`.
- Source anchors: `server/vueda/info/serializers.py`, `server/vueda/info/viewsets.py`, `client/lib/stores/storeModelInfo.js`, `client/lib/stores/storeModelConfig.js`, `client/lib/router/getCrud.js`, `client/lib/router/makeCrud.js`, `client/lib/use/useLookupContext.js`, `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`.

## Non-goals

- Not a walkthrough for implementing custom PK models.
- Not a complete reference for workflow/history identifier behavior.
- Not a guarantee that all generated API schema examples match runtime coercion paths.

## Key Concepts

### PK designation is serializer-derived metadata

- What it is: model-info marks the canonical identifier field with `pk: true` when serializer field name equals `model._meta.pk.name`.
- Why it exists: identifier authority is serializer contract output, not a hard-coded client assumption about `id`.
- Where it lives: `server/vueda/info/serializers.py` (`ModelInfoSerializer.get_model_fields_data`), `server/tests/unit/info/test_model_info.py`.

### Client PK key is discovered, validated, and cached

- What it is: client normalizes `model_fields`, derives `data.pk` from the field carrying `pk: true`, and rejects payloads with no PK marker.
- Why it exists: downstream config, form, and routing surfaces require a stable field-name identifier key.
- Where it lives: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`, `client/lib/stores/storeModelConfig.js`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.

### Identifier transport uses separate single vs multi-object channels

- What it is: detail routes carry one `pk` in route params; list/bulk-style routes encode many IDs in query `pk` as comma-separated text.
- Why it exists: one route family carries object identity in path, while multi-object context stays list-oriented.
- Where it lives: `client/lib/router/makeCrud.js`, `client/lib/router/getCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`, `client/tests/unit/lib/router/getCrud.spec.js`.

### Choice identifier values are string-oriented at model-info boundaries

- What it is: metadata/choices generation casts many identifier-like values to strings (`str(value)`/`Cast(..., CharField())`), including related-model PK choice values.
- Why it exists: client-side comparison and query construction avoid Python numeric/UUID type variance.
- Where it lives: `server/vueda/info/serializers.py` (`get_model_field_choices`, `get_model_filtering_choices`), `server/vueda/info/viewsets.py` (`ModelInfoChoicesViewSet.get_queryset`), `server/tests/unit/info/test_model_info_filterset_choices.py`.

### Lookup cache keying coerces identifiers to string

- What it is: lookup-context manager acquisition and object requests coerce `pkKey` and object `pk` with `+ ""` before manager reuse and map keying.
- Why it exists: cache keys remain stable when callers provide numeric-like vs string-like identifiers.
- Where it lives: `client/lib/use/useLookupContext.js`, `client/tests/unit/lib/use/useLookupContext.spec.js`.

## Relevant Implementation Surface

- `{@api rest:endpoint:GET:/vueda.info/model_info/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields_data}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_field_choices}`
- `{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_filtering_choices}`
- `{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet}`
- `{@api py:function:vueda.info.viewsets.ModelInfoChoicesViewSet.get_queryset}`
- `{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}`
- `{@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
- `{@api js:function:@arrai-innovations/vueda.stores/storeModelInfo.storeModelInfo}`
- `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
- `{@api js:module:@arrai-innovations/vueda.router/getCrud}`
- `{@api js:function:@arrai-innovations/vueda.router/getCrud.getCRUDForTo}`
- `{@api js:module:@arrai-innovations/vueda.router/makeCrud}`
- `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
- `{@api js:module:@arrai-innovations/vueda.use/useLookupContext}`
- `{@api js:function:@arrai-innovations/vueda.use/useLookupContext.useLookupContext}`
- `{@api js:module:@arrai-innovations/vueda.utils/urls}`
- `{@api js:function:@arrai-innovations/vueda.utils/urls.getDetailUrl}`
- `{@api js:module:@arrai-innovations/vueda.utils/objectCrud}`
- `{@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectUpdate}`
- `{@api js:module:@arrai-innovations/vueda.utils/listCrud}`
- `{@api js:function:@arrai-innovations/vueda.utils/listCrud.defaultObjectsDelete}`

## Contracts and Invariants

- `model_fields` carries PK membership as field metadata (`pk: true`) from serializer/model alignment. Anchors: `server/vueda/info/serializers.py`, `server/tests/unit/info/test_model_info.py`.
- Client model-info normalization must find one PK marker; missing marker is a hard error (`no pk field found`) and the error is cached per `app.model`. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.
- Default model config excludes the PK field from default `displayFields`, `fetchFields`, and `submitFields`. Anchors: `client/lib/stores/storeModelConfig.js`, `client/tests/unit/lib/stores/storeModelConfig.spec.js`.
- Detail route identity is `params.pk`; list route multi-selection identity is `query.pk` split/joined on commas. Anchors: `client/lib/router/makeCrud.js`, `client/lib/router/getCrud.js`, `client/tests/unit/lib/router/makeCrud.spec.js`, `client/tests/unit/lib/router/getCrud.spec.js`.
- Bulk delete payload identifier key is always `{ pks: [...] }`, independent of model-specific PK field name. Anchors: `client/lib/utils/listCrud.js`.
- Lookup-context manager requests coerce `pkKey` and object PK to strings before key comparison/reuse. Anchors: `client/lib/use/useLookupContext.js`, `client/tests/unit/lib/use/useLookupContext.spec.js`.
- Choice endpoints primarily expose string identifier values for model-backed choices. Anchors: `server/vueda/info/serializers.py`, `server/vueda/info/viewsets.py`.
- Filter-choice responses serialize `value` as string across tested filterset branches (including paths sourcing from raw widget choices and queryset-backed choices). Anchors: `server/vueda/info/serializers.py`, `server/vueda/info/viewsets.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.

## Footguns

- Missing PK marker in model-info causes persistent client-side failure for that `app.model` until store state is reset/recreated; repeated fetches short-circuit to cached error. Anchors: `client/lib/stores/storeModelInfo.js`, `client/tests/unit/lib/stores/storeModelInfo.spec.js`.
- Comma-delimited array PK encoding (`join(",")`/`split(",")`) is lossy if a string PK itself contains commas; route/query reconstruction is ambiguous. Anchors: `client/lib/router/getCrud.js`, `client/lib/router/makeCrud.js`.
- `defaultObjectUpdate` extracts identifier from `object.id` rather than metadata-derived PK field name, which can drift from non-`id` PK models. Anchors: `client/lib/utils/objectCrud.js`, `client/lib/stores/storeModelInfo.js`.
- `throwOnUndefinedPk` guard in `getCRUDForTo` throws on non-detail action metadata while the error text says detail views; this mismatch can obscure diagnosis. Anchors: `client/lib/router/getCrud.js`, `client/tests/unit/lib/router/getCrud.spec.js`.

## Suggested Outline

- `## Boundary and Ownership`
- `## PK Authority and Metadata Source`
- `## Identifier Transport Shapes`
- `## Client PK-Key Normalization and Caching`
- `## Choice Identifier Value Semantics`
- `## Observable Failure Modes`
