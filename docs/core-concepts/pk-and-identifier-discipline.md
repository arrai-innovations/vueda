---
title: Primary Key and Identifier Discipline
type: explanation
audience: implementor
status: draft
---

# Primary Key and Identifier Discipline

VUEDA does not assume that every model's primary key is named `id`. Instead, identifier authority flows from the server's serializer metadata through client normalization and into routing, {@term CRUDL} transport, and lookup caching. Each layer discovers the PK field name from metadata rather than hardcoding it, with a small number of documented exceptions where the system uses fixed conventions.

This page explains where identifier authority lives at each boundary, how single-object and multi-object identifiers are transported, and how the client normalizes and caches PK information. For the {@term Model Info} metadata contract that generates field and PK metadata, see [Field and Expand Semantics](./field-and-expand-semantics). For practical steps on wiring choice and {@term Lookup} fields that depend on identifier resolution, see [Model Choices, Lookup Fields, and Dynamic Options](../guides/choices-and-lookups).

## Boundary and Ownership

The server is the authority over which field is the primary key. This authority is expressed through model-info metadata: the `model_fields` response marks one field with `pk: true`, derived from the alignment between the serializer field name and `model._meta.pk.name`. The client discovers and caches this field name at model-info fetch time and uses it for all downstream identifier operations.

The boundary is strict in one direction: the client never tells the server which field is the PK. The server's metadata is the single source of truth. If the server's serializer does not include the model's PK field in `Meta.fields`, or if the field name does not match `model._meta.pk.name`, the `pk: true` marker will be absent and the client will fail at normalization time.

## PK Authority and Metadata Source

The PK marker is set during model-info serialization. `ModelInfoSerializer.get_model_fields_data` iterates the canonical serializer's fields and compares each field name against the model's `_meta.pk.name`. The matching field receives `pk: true` in its metadata entry. All other fields receive no `pk` key (the absence is semantically equivalent to `pk: false`).

This comparison is name-based, not type-based. A serializer field named `slug` on a model whose `_meta.pk.name` is `slug` will receive `pk: true`. A serializer field named `id` on the same model will not, even if it is an `IntegerField`. The name must match exactly.

The metadata does not carry the PK field's type separately from its regular field type metadata. The client treats the PK as an opaque value; it stores, transmits, and compares PK values without type-specific logic. This works because the server's metadata already includes the field's type descriptor (`integer`, `string`, `uuid`, etc.), and the client's rendering and validation layers use that type information generically.

## Client PK-Key Normalization and Caching

When `storeModelInfo` receives a model-info response, the normalization step scans the `fields` map for the entry carrying `pk: true` and extracts its key as `data.pk`. This is a hard requirement: if no field carries the marker, `storeModelInfo` throws `"no pk field found for {key}"` and caches the error. Subsequent requests for the same `app.model` key short-circuit to the cached error without retrying the network fetch. The only recovery is to recreate the store instance (typically by reloading the application).

Once `data.pk` is set, downstream consumers use it to resolve identifiers without assuming a field name:

- **Model config** excludes the PK field from default `displayFields`, `fetchFields`, and `submitFields`. The exclusion uses `data.pk` as the key to filter, not a hardcoded `"id"`.
- **Routing** uses `params.pk` as the route parameter name for `detail` views, independent of the model's actual PK field name. The route parameter is always named `pk`; its value is the PK field's value for the specific object.
- **CRUDL operations** accept `pk` as a parameter on retrieve, patch, and delete functions. `defaultObjectUpdate` accepts a `pkKey` parameter (defaulting to `"id"`) to resolve the identifier from the submitted object.
- **Lookup context** coerces PK values to strings before cache-key comparison, ensuring that numeric and string representations of the same identifier map to the same cache entry.

## Identifier Transport Shapes

VUEDA uses two distinct transport shapes for object identifiers, depending on whether the context is single-object or multi-object.

**Single-object transport** uses a route parameter. `detail` routes carry the PK value in the URL path: `/:app/:model/:action/:pk`. The route parameter is always named `pk` regardless of the model's actual PK field name. `getDetailUrl` constructs the URL by interpolating the PK value into the `:pk` position. The PK value is unwrapped through `unwrapNested` before interpolation, handling cases where the value arrives as a nested reactive reference.

**Multi-object transport** uses a query parameter. List-context operations that reference multiple objects (such as multi-select navigation) encode the PK values as a comma-separated string in `query.pk`. `getCRUDForTo` splits this string to recover the individual values, and `makeCRUDRoutes` joins selected PKs with commas when constructing navigation targets.

**Bulk delete transport** uses a request body. The `defaultObjectsDelete` function sends `{ pks: [...] }` as the JSON body of a `DELETE` request to the `list` endpoint. The key is always `pks`, independent of the model's PK field name; this is a fixed protocol convention between the client and the server's bulk destroy handler.

The comma-delimited encoding for multi-object query parameters is lossy if a string PK value itself contains commas. Route and query reconstruction become ambiguous because `split(",")` cannot distinguish between a delimiter and a literal comma within a PK value. This is a known limitation that does not affect integer or UUID primary keys but can cause issues with free-text string PKs.

## Choice Identifier Value Semantics

Model-info choice endpoints and filter-choice endpoints normalize identifier values to strings at several points in the pipeline.

**Field choices** (`ModelInfoChoicesViewSet`) resolve choice values from the serializer's field definition. For related-model choices (where the choices come from a queryset), the PK values are cast to strings via `Cast(..., CharField())` in the queryset annotation or via `str(value)` when iterating static choices. This ensures that the client receives string values regardless of the database column's native type (integer, UUID, etc.).

**Filter choices** (`ModelInfoFilterSetChoicesViewSet`) follow the same pattern. Filter choice responses serialize `value` as a string across all tested filterset branches, including paths sourcing from raw widget choices and queryset-backed choices. The `empty_label` option, when set, prepends an empty-value entry to the choices list, with the empty value coming from filter config or default settings.

This string normalization is deliberate. The client compares choice values using string equality, and query parameter values are inherently strings on the wire. By normalizing at the server boundary, the system avoids type-coercion mismatches where a numeric PK `42` and a string `"42"` would fail equality checks in JavaScript.

## Observable Failure Modes

**Missing PK marker causes persistent client-side failure.** If the server's model-info response does not include a field with `pk: true`, the error is thrown and cached per `app.model`. All subsequent operations for that model fail immediately. The typical cause is a serializer that does not include the model's PK field in `Meta.fields`, or a PK field name mismatch between the serializer and the model's `_meta.pk.name`.

**Comma-delimited PK encoding is lossy for string PKs with commas.** The `join(",")` / `split(",")` encoding used for multi-object query parameters cannot round-trip PK values that contain literal commas. This affects route construction and navigation state recovery for models with free-text string primary keys.

**`defaultObjectUpdate` requires correct `pkKey` for non-`id` PKs.** The function accepts a `pkKey` parameter that defaults to `"id"`. Callers using models with a non-`id` PK field must pass the correct `pkKey`; omitting it causes `object[pkKey]` to resolve to `undefined`, and the resulting detail URL will contain `undefined` as the PK segment.

**`throwOnUndefinedPk` error text references `detail` views for non-detail contexts.** The `getCRUDForTo` guard throws when it encounters an undefined PK on action metadata, but the error message says "`detail` views" regardless of the actual action context. This mismatch can obscure diagnosis when the error is triggered during list-context navigation that happens to carry PK metadata.

## Relevant Implementation Surface

- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields_data}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_field_choices}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_filtering_choices}
- {@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet}
- {@api py:function:vueda.info.viewsets.ModelInfoChoicesViewSet.get_queryset}
- {@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}
- {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
- {@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
- {@api js:module:@arrai-innovations/vueda/router/getCrud}
- {@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo}
- {@api js:module:@arrai-innovations/vueda/router/makeCrud}
- {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}
- {@api js:module:@arrai-innovations/vueda/use/useLookupContext}
- {@api js:function:@arrai-innovations/vueda/use/useLookupContext#useLookupContext}
- {@api js:module:@arrai-innovations/vueda/utils/urls}
- {@api js:function:@arrai-innovations/vueda/utils/urls#getDetailUrl}
- {@api js:module:@arrai-innovations/vueda/utils/objectCrud}
- {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate}
- {@api js:module:@arrai-innovations/vueda/utils/listCrud}
- {@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultObjectsDelete}
