---
title: Field and Expand Semantics
type: explanation
audience: integrator
status: draft
---

# Field and Expand Semantics

VUEDA uses two query-parameter-driven mechanisms to control the shape of API responses: sparse field selection (`f`) and {@term Expand} selection (`e`). Together, these parameters let the client request only the fields it needs and embed related-object data inline rather than following separate requests. The contract spans three layers: the server's serializer metadata that defines what is available, the viewset validation that enforces what is allowed per action, and the client's normalization and caching of that metadata for runtime use.

This page explains the contract itself; what the parameters mean, how sparse-field and {@term Expand} metadata is generated, how {@term Action-Scoped Expand} permissions are scoped per action, and what happens when requests violate the contract. For practical steps on configuring `f` and `e` controls for a model surface, see [Use Expand and Sparse Field Controls](../guides/expand-and-fields-controls).

## Boundary and Ownership

The server owns the definition of which fields exist and which fields are expandable. This definition lives in the canonical registered serializer, not in the Django model or database schema. The client owns the runtime decision of which fields and expands to request on a given fetch, within the boundaries the server advertises.

The boundary between them is the {@term Model Info} metadata response. Registration stores the canonical serializer and viewset class references; the server derives `model_fields` and `model_expands` from those classes on each model-info request by instantiating the serializer and inspecting its fields and expandable-field declarations. The client fetches this metadata, normalizes it, and uses it to construct default field subsets and {@term Expand} sets for each view. From that point forward, the client's requests are constrained by what the metadata advertises and what the viewset's action-level allow-lists permit.

## Parameter Namespace and Wire Shape

Sparse field selection and {@term Expand} selection use the query parameter names `f` and `e`, respectively. These names are configured in the server's `REST_FLEX_FIELDS` settings and mirrored as shared constants on the client (`FIELDS_PARAM`, `EXPAND_PARAM`). Both sides reference the same parameter keys, so request construction and server-side parsing are always aligned.

On the wire, a request that selects specific fields and expands looks like:

```text
GET /routes/myapp/widget/1/?f=id&f=name&f=status&e=owner
```

The server reads the `f` values as the sparse field set and the `e` values as the `expand` set. Fields not listed in `f` are omitted from the response. Expands listed in `e` cause the related serializer to be embedded inline in the response rather than returning only the foreign key value.

## Field Metadata Contract

The `model_fields` section of a model-info response is derived from the canonical registered serializer's field definitions. Each field entry carries structural metadata: `read_only`, `required`, `many`, type descriptors, and optional constraints like `max_length` or `min_value`. When a field has static choices defined on the serializer, those choices are included in the metadata as well.

Primary key membership is explicit in field metadata. The server marks one field with `pk: true` when the serializer field name matches `model._meta.pk.name`. The client requires this marker; `storeModelInfo` throws `"no pk field found"` if no field carries `pk: true`, and the error is cached per `app.model`, blocking all subsequent operations for that model until store state is recreated. See [Primary Key and Identifier Discipline](./pk-and-identifier-discipline) for the full identifier contract.

Field metadata is serializer-derived, not model-table-derived. A field that exists on the Django model but is not declared in the canonical serializer's `Meta.fields` will not appear in `model_fields` and will be invisible to the client. Conversely, computed or method-based serializer fields that have no database column will appear in metadata and be available for sparse field selection.

## Expand Descriptor Contract

The `model_expands` section of a model-info response describes each expandable relationship on the canonical serializer. Unlike field metadata, which is a flat key-value map, {@term Expand} metadata is a list of descriptors. Each descriptor carries:

- **`name`**: the `expand` key used in `e` query parameters.
- **`app_label`**: the related app_label identity of `app_label.model_name`.
- **`model`**: the related model identity of `app_label.model_name`.
- **`many`**: whether the relationship is a to-many relation (producing an array of embedded objects).
- **`read_only`**: whether the expanded relationship is read-only on the serializer.
- **`f`**: nested field metadata for the expanded serializer's fields, following the same structure as top-level `model_fields`.

The nested `f` metadata is what makes expansion an explicit embedded contract rather than a boolean toggle. When the client expands a relationship, it knows the exact field schema of the embedded objects; their types, read-only status, required status, and constraints. This enables the client to build field-detail maps for expanded sub-fields (using `expand__subfield` composite keys) without fetching a separate model-info request for the related model.

Generating `model_expands` requires the canonical serializer to inherit `VuedaExpandableFieldsSerializerMixin`, which is where `Meta.expandable_fields` is walked into descriptors. `VuedaSerializer` already includes this mixin, so any of its subclasses get `model_expands` for free. {@term Canonical Registration} does not require the canonical serializer to inherit `VuedaSerializer` at all; a plain `rest_framework.serializers.ModelSerializer` can be registered. If you register one of those and want it to report `model_expands`, inherit `VuedaExpandableFieldsSerializerMixin` directly. Without it, `model_expands` is an empty list regardless of any `Meta.expandable_fields` declaration, since there is no generation step to read that declaration.

When sparse field selection (`f`) is applied to an expanded serializer's fields, the primary key of the nested serializer is always preserved even if not explicitly requested. This ensures that expanded objects are always identifiable regardless of which subset of their fields the client selects.

## Generic Foreign Key Expands

When a model has a Django `GenericForeignKey` field, the related model is not known at serializer definition time. `GenericForeignKeySerializer` handles this case: it declares no fields at class definition time and resolves the related model's canonical registered serializer in `to_representation()` by calling `get_serializer_for_model`. This means the expand only produces output when the concrete type of the related object is registered in the VUEDA registry.

Generic foreign key expands are always read-only. There is no write path through `GenericForeignKeySerializer`, so `read_only: true` is unconditionally reported for these expands in model-info metadata.

The model-info `model_expands` entry for a generic foreign key expand carries distinct type identifiers:

- `type_db`: `null` — no single database column type applies, because a generic foreign key is a compound relationship backed by two separate columns: a `content_type` column that stores the related model type and an `object_id` column that stores the related object's primary key.
- `type_model`: `"GenericForeignKey"` — identifies this expand as a polymorphic relationship.
- `type_serializer`: `"GenericForeignKeySerializer"` — the serializer class name that handles the expand.

Because the related type is not known until representation time, no nested `f` field metadata is available for generic foreign key expands in model-info. The client cannot pre-resolve a fixed field schema for these expands the way it can for concrete foreign key expands.

All possible related models that could appear through the generic foreign key must be registered via `register` or `register_serializer` for the expand to return non-null output. If the concrete type of the related object is not registered, `GenericForeignKeySerializer` returns `null` for that expand.

### Model-targeted field filtering

The `FIELDS_PARAM` and `OMIT_PARAM` options passed through `expandable_fields` support model-targeted specifiers that apply only when the related object is an instance of a specific model. This is useful when different related model types expose different fields and you want to omit or select fields selectively per type.

A model-targeted specifier has the form `_<app_label>__<model_name>__<field_name>`. The leading `_` distinguishes it from plain field names. At representation time, `GenericForeignKeySerializer` resolves each specifier against the concrete type of the related object: matching specifiers are replaced with the bare field name and passed to the concrete serializer; non-matching specifiers are dropped. Plain field names and wildcards are passed through unchanged and apply to every related model.

This resolution happens entirely server-side, before the concrete serializer is instantiated. Client-submitted `f` and `e` query parameters continue to use plain field names and wildcards; model-targeted specifiers are not valid in query parameters.

The field selection passed to the concrete serializer is still bounded by what that serializer declares. A field that exists on the Django model but is not listed in the registered serializer's `Meta.fields` will not appear in the output even if it is requested by name via a model-targeted specifier. The registered serializer's field declarations are the authoritative source of what each model type can return.

## {@term Action-Scoped Expand} Authority

Expandable fields declared on a serializer are not automatically available on every viewset action. The viewset can restrict which expands are permitted per action using {@term Action-Scoped Expand} controls (`permit_{action}_expands` attributes); for example, `permit_list_expands` and `permit_retrieve_expands`. When these attributes are defined, the viewset injects the permitted set as `permitted_expands` in the serializer context, and the serializer's flex-field machinery respects it.

This scoping exists because different actions have different performance and data-shape requirements. A `list` action might permit only lightweight expands (such as a user's display name) while a `retrieve` action permits heavier expands (such as a full nested object graph). Without action-level scoping, a `list` request could embed deep object trees across every row in a paginated response, producing non-linear payload growth. To enforce a maximum expansion depth, you can use the `MAXIMUM_EXPANSION_DEPTH` setting for `REST_FLEX_FIELDS`, which we default to 4. Any requests beyond this maximum will generate an `Expansion depth exceeded` error.

The expand validation path works as follows. On each request, `FlexFieldsMixin.get_serializer_context` resolves the permitted `expand` set for the current action. If a `permit_{action}_expands` attribute exists, it becomes the serializer's `permitted_expands` context. The viewset's `validate_flex_expand_and_field_param` generates a set of possible expandable fields, including wildcards, but limited to the permitted expands. This data is generated up to the maximum depth of the requested `expand` and `field` values, but not exceeding the `MAXIMUM_EXPANSION_DEPTH`. If any requested `expand` names are not found among the possibilities, an HTTP 400 response will be returned containing a list of the possible `expand` names.

Trying to expand on a model that does not have any expandable fields, will generate the error "No expands are permitted.".

## Query Cost of List and Retrieve Expansion

An expanded relation's query cost does not grow with the number of rows in the response. `VuedaViewSet.get_queryset()` derives `select_related` and `prefetch_related` directly from what a request's `e` value actually expands, and applies that plan before the queryset is paginated or evaluated. Expanding `category` on a `list` of 100 objects costs one additional join, not 100 additional queries; expanding a to-many relation like `tags` costs one additional prefetch query, not one per row.

Only `e` decides what the plan covers, together with whatever narrows `e` itself: {@term Action-Scoped Expand} restrictions and `MAXIMUM_EXPANSION_DEPTH`. `f` (sparse fields) and `om` (omit) play no part in it either way, and this is not a limitation of the plan; it reflects what the response actually does. An expand named in `e` renders regardless of what `f` or `om` say, through two separate mechanisms that happen to produce the same result: the field-defaulting behavior described in [Multi-level Field and Expand Data](#multi-level-field-and-expand-data) below re-admits an expand's own name into the effective `f` set as a side effect of defaulting its sub-fields to "all" when none are requested, and a similar side effect of always hiding `available_actions` from an expanded object re-admits it into the effective `om` set. Either way, an `f` that omits an expand's name, or an `om` that names it, drops neither the field from the response nor its relation from the plan. `f` and `om` still work normally for ordinary, non-expanded fields, and for narrowing which sub-fields of an already-expanded relation come back — neither of which changes what the plan needs to prefetch, since the plan only cares about which relations get traversed, not which of their columns are returned.

The plan follows a field's `source` (a `source=` in an `expandable_fields` declaration that names a different attribute than the field's own key resolves against that attribute, not the key), and it only ever covers what `e` actually resolved: a field never named in `e`, or one restricted away by {@term Action-Scoped Expand} controls, contributes nothing to the plan.

This does not apply to a `GenericForeignKeySerializer` expand: the related model is not known until representation time (see [Generic Foreign Key Expands](#generic-foreign-key-expands) above), so it continues to resolve per-instance the same way it always has, outside of any queryset plan.

This removes the per-row query cost of expansion, but not its other costs. Response payload size still grows with both row count and expansion depth, and each distinct expanded relation still costs one join or prefetch query per request, which is why {@term Action-Scoped Expand} restrictions above remain worth setting for `list` endpoints with many expandable relations or large row counts.

## Client Normalization and Cache Semantics

Model-info responses undergo normalization when the client stores them. The normalization performs three transformations:

**Prefix stripping.** Server-side field names use a `model_` prefix to avoid namespace collisions in the serializer, where `fields` would collide, because of the function derived from it called `get_fields`. The client strips this prefix, so `model_fields` becomes `fields` and `model_expands` becomes `expand` (singular, matching the client convention where `expand` parallels `omit`, not `expands`).

**Nested camelCasing.** Field metadata objects within `fields` and `filtering` maps are recursively camel-cased. Expand descriptors have their nested `f` field metadata camel-cased as well. Root-level keys remain unchanged.

**PK key extraction.** The client scans the normalized `fields` map for the entry with `pk: true` and stores its key as `data.pk`. This derived key is used by model-config, routing, and {@term CRUDL} operations to identify objects without assuming a fixed field name. Django composite primary keys are currently not supported.

The normalized result is cached by `app.model` key in `storeModelInfo`. Subsequent requests for the same model resolve from cache without a network fetch. If the initial fetch fails (including the `"no pk field found"` error), the error is cached instead, and subsequent requests for the same key short-circuit to the cached error. This prevents the client from repeatedly fetching metadata that the server returned but the client could not process.

Default model-config generation uses the normalized metadata to derive field sets. `displayFields`, `fetchFields`, and `submitFields` are computed from the field metadata, excluding the PK field by default. The `expand` configuration is derived from the expand descriptor names, and expanded field details are flattened into `expand__subfield` composite keys in the `fieldDetails` map. When `expand` is overridden to an empty array, the flattening step is skipped and no `expand__subfield` keys are populated.

## Multi-level Field and Expand Data

When requesting multiple levels of field and expand data, there are a number of things you need to be aware of.

The client requests the "id" and "available_actions" fields for the main model for all detail requests. Due to the way DRF Flex Fields works, this would mean that no fields would be returned for the expanded model, since none are being requested. Internally we use a wildcard to do this, as explained below. To be more helpful in regards to this situation, we automatically request all of the fields for an expanded model that did not request any fields. If you don't want all the fields for an expanded model, then you should specify which fields you want; like `[expandable field name].id,[expandable field name].name`.

Wildcards ("\*" or "~all") can be used by both fields and expands, but only work at the specified level. Adding a wildcard to the expands will return all expands at the specified level. Adding a wildcard to the fields will return all the fields specified on the serializer for the model at the current level.

Specifying both fields and wildcards is allowed, like `id,available_actions,*` is valid, but wildcards cannot be chained like `*.*`. You need to specify the expandable field, like ``[expandable field name].*` to get all expands or all fields from the expandable field specified.

"available_actions" is omitted from an expanded objects fields. Requesting `[expandable field name].available_actions` will generate an invalid field error.

## Observable Failure Modes

**Invalid expand for a given action returns HTTP 400 with no partial application.** When a request includes both valid and invalid `expand` keys, the entire request fails. The valid expands are not partially applied in the response; the client receives only the error payload. The error message identifies the invalid keys and, when available, lists the permitted set.

**Invalid sparse field keys produce field-keyed validation errors.** Unknown `f` values return HTTP 400 with a payload keyed by the invalid field name and a `code: invalid` error. In write flows, this validation error can be mistaken for a data validation failure because it follows the same response shape. The distinguishing signal is the error message text, which references valid field names.

**Missing PK marker blocks the entire model on the client.** If the server's metadata response does not include a field with `pk: true`, `storeModelInfo` throws and caches the error. All subsequent operations for that `app.model`; config generation, route guards, form loading; fail immediately with the cached error. The only recovery is to recreate the store instance.

**Not requested the PK field, usually `id`, for an expandable model.** This will cause errors in the client, as the PK field is required internally.

**Requesting `pk` causes an invalid field error.** If you request the `pk` of an object, bypassing the vueda validation, then the `pk` field will be ignored. This does not return the `id` field, which is why it is treated as an invalid field.

## Relevant Implementation Surface

- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_expands}
- {@api py:class:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin}
- {@api py:class:vueda.core.serializers.GenericForeignKeySerializer}
- {@api py:function:vueda.info.registration.get_serializer_for_model}
- {@api py:function:vueda.core.viewsets.FlexFieldsMixin.get_serializer_context}
- {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param}
- {@api py:function:vueda.core.viewsets.VuedaViewSet.get_queryset}
- {@api py:function:vueda.core.viewsets.build_prefetch_plan}
- {@api py:function:vueda.core.viewsets.resolve_relation_path}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
- {@api js:property:@arrai-innovations/vueda/utils/constants#FIELDS_PARAM}
- {@api js:property:@arrai-innovations/vueda/utils/constants#EXPAND_PARAM}
