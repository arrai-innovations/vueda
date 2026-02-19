---
title: Field and Expand Semantics
type: explanation
audience: implementor
status: draft
---

# Field and Expand Semantics

VUEDA uses two query-parameter-driven mechanisms to control the shape of API responses: sparse field selection (`f`) and expand selection (`e`). Together, these parameters let the client request only the fields it needs and embed related-object data inline rather than following separate requests. The contract spans three layers: the server's serializer metadata that defines what is available, the viewset validation that enforces what is allowed per action, and the client's normalization and caching of that metadata for runtime use.

This page explains the contract itself; what the parameters mean, how field and `expand` metadata is generated, how `expand` permissions are scoped per action, and what happens when requests violate the contract. For practical steps on configuring expand and field controls for a model surface, see [Use Expand and Sparse Field Controls](../guides/expand-and-fields-controls).

## Boundary and Ownership

The server owns the definition of which fields exist and which fields are expandable. This definition lives in the canonical registered serializer, not in the Django model or database schema. The client owns the runtime decision of which fields and expands to request on a given fetch, within the boundaries the server advertises.

The boundary between them is the model-info metadata response. Registration stores the canonical serializer and viewset class references; the server derives `model_fields` and `model_expands` from those classes on each model-info request by instantiating the serializer and inspecting its fields and expandable-field declarations. The client fetches this metadata, normalizes it, and uses it to construct default field and `expand` sets for each view. From that point forward, the client's requests are constrained by what the metadata advertises and what the viewset's action-level allow-lists permit.

## Parameter Namespace and Wire Shape

Sparse field selection and expand selection use the query parameter names `f` and `e`, respectively. These names are configured in the server's `REST_FLEX_FIELDS` settings and mirrored as shared constants on the client (`FIELDS_PARAM`, `EXPAND_PARAM`). Both sides reference the same parameter keys, so request construction and server-side parsing are always aligned.

On the wire, a request that selects specific fields and expands looks like:

```
GET /routes/myapp/widget/1/?f=id&f=name&f=status&e=owner
```

The server reads the `f` values as the sparse field set and the `e` values as the `expand` set. Fields not listed in `f` are omitted from the response (with the exception of the primary key, which is always preserved in expand contexts). Expands listed in `e` cause the related serializer to be embedded inline in the response rather than returning only the foreign key value.

## Field Metadata Contract

The `model_fields` section of a model-info response is derived from the canonical registered serializer's field definitions. Each field entry carries structural metadata: `read_only`, `required`, `many`, type descriptors, and optional constraints like `max_length` or `min_value`. When a field has static choices defined on the serializer, those choices are included in the metadata as well.

Primary key membership is explicit in field metadata. The server marks one field with `pk: true` when the serializer field name matches `model._meta.pk.name`. The client requires this marker; `storeModelInfo` throws `"no pk field found"` if no field carries `pk: true`, and the error is cached per `app.model`, blocking all subsequent operations for that model until store state is recreated. See [Primary Key and Identifier Discipline](./pk-and-identifier-discipline) for the full identifier contract.

Field metadata is serializer-derived, not model-table-derived. A field that exists on the Django model but is not declared in the canonical serializer's `Meta.fields` will not appear in `model_fields` and will be invisible to the client. Conversely, computed or method-based serializer fields that have no database column will appear in metadata and be available for sparse field selection.

## Expand Descriptor Contract

The `model_expands` section of a model-info response describes each expandable relationship on the canonical serializer. Unlike field metadata, which is a flat key-value map, `expand` metadata is a list of descriptors. Each descriptor carries:

- **`name`**: the `expand` key used in `e` query parameters.
- **`read_only`**: whether the expanded relationship is read-only on the serializer.
- **`many`**: whether the relationship is a to-many relation (producing an array of embedded objects).
- **`model`**: the related model identity (`app_label.model_name`) when available, enabling the client to cross-reference the expanded model's own metadata.
- **`f`**: nested field metadata for the expanded serializer's fields, following the same structure as top-level `model_fields`.

The nested `f` metadata is what makes expansion an explicit embedded contract rather than a boolean toggle. When the client expands a relationship, it knows the exact field schema of the embedded objects; their types, read-only status, required status, and constraints. This enables the client to build field-detail maps for expanded sub-fields (using `expand__subfield` composite keys) without fetching a separate model-info request for the related model.

When sparse field selection (`f`) is applied to an expanded serializer's fields, the primary key of the nested serializer is always preserved even if not explicitly requested. This ensures that expanded objects are always identifiable regardless of which subset of their fields the client selects.

## Action-Scoped Expand Authority

Expandable fields declared on a serializer are not automatically available on every viewset action. The viewset can restrict which expands are permitted per action using `permit_{action}_expands` attributes; for example, `permit_list_expands` and `permit_retrieve_expands`. When these attributes are defined, the viewset injects the permitted set as `permitted_expands` in the serializer context, and the serializer's flex-field machinery respects it.

This scoping exists because different actions have different performance and data-shape requirements. A `list` action might permit only lightweight expands (such as a user's display name) while a `retrieve` action permits heavier expands (such as a full nested object graph). Without action-level scoping, a `list` request could embed deep object trees across every row in a paginated response, producing non-linear payload growth.

The expand validation path works as follows. On each request, `FlexFieldsMixin.get_serializer_context` resolves the permitted `expand` set for the current action. If a `permit_{action}_expands` attribute exists, it becomes the serializer's `permitted_expands` context. The viewset's `validate_flex_expand_param` then checks each requested expand against this set. Invalid `expand` keys produce an HTTP 400 response with per-key error details.

When no `permit_{action}_expands` is defined for the current action, the viewset checks whether any action-level permit list exists on the viewset at all. If the viewset defines expand permits for some actions but not the current one, the current action receives an empty permitted set; meaning no expands are allowed. This is a deliberate fail-closed default: if you define `permit_list_expands` but not `permit_retrieve_expands`, `retrieve` requests that include `e` parameters will receive `"No expands are permitted."` even though the serializer declares expandable fields.

## Client Normalization and Cache Semantics

Model-info responses undergo normalization when the client stores them. The normalization performs three transformations:

**Prefix stripping.** Server-side field names use a `model_` prefix to avoid namespace collisions in the serializer (`model_fields`, `model_expands`, `model_ordering`, etc.). The client strips this prefix, so `model_fields` becomes `fields` and `model_expands` becomes `expand` (singular, matching the client convention where `expand` parallels `omit`, not `expands`).

**Nested camelCasing.** Field metadata objects within `fields` and `filtering` maps are recursively camel-cased. Expand descriptors have their nested `f` field metadata camel-cased as well. Root-level keys remain unchanged.

**PK key extraction.** The client scans the normalized `fields` map for the entry with `pk: true` and stores its key as `data.pk`. This derived key is used by model-config, routing, and CRUD operations to identify objects without assuming a fixed field name.

The normalized result is cached by `app.model` key in `storeModelInfo`. Subsequent requests for the same model resolve from cache without a network fetch. If the initial fetch fails (including the `"no pk field found"` error), the error is cached instead, and subsequent requests for the same key short-circuit to the cached error. This prevents the client from repeatedly fetching metadata that the server returned but the client could not process.

Default model-config generation uses the normalized metadata to derive field sets. `displayFields`, `fetchFields`, and `submitFields` are computed from the field metadata, excluding the PK field by default. The `expand` configuration is derived from the expand descriptor names, and expanded field details are flattened into `expand__subfield` composite keys in the `fieldDetails` map. When `expand` is overridden to an empty array, the flattening step is skipped and no `expand__subfield` keys are populated.

## Observable Failure Modes

**Invalid expand for a given action returns HTTP 400 with no partial application.** When a request includes both valid and invalid `expand` keys, the entire request fails. The valid expands are not partially applied in the response; the client receives only the error payload. The error message identifies the invalid keys and, when available, lists the permitted set.

**No-expands-permitted on an action with serializer-level expands.** If the viewset defines `permit_list_expands` for the `list` action but has no `permit_retrieve_expands`, `retrieve` requests with `e` parameters receive `"No expands are permitted."` This can be confusing because the serializer's `expandable_fields` are visible in model-info metadata, but the viewset's action-level scoping blocks them at request time.

**Invalid sparse field keys produce field-keyed validation errors.** Unknown `f` values return HTTP 400 with a payload keyed by the invalid field name and a `code: invalid` error. In write flows, this validation error can be mistaken for a data validation failure because it follows the same response shape. The distinguishing signal is the error message text, which references valid field names.

**Missing PK marker blocks the entire model on the client.** If the server's metadata response does not include a field with `pk: true`, `storeModelInfo` throws and caches the error. All subsequent operations for that `app.model`; config generation, route guards, form loading; fail immediately with the cached error. The only recovery is to recreate the store instance.

**Deep expansions produce non-linear payload growth.** No VUEDA wrapper-level depth cap is enforced for nested expands. Expansion depth is constrained only by the serializer structure (which serializers declare expandable fields that themselves have expandable fields) and viewset-level permit lists. A deeply nested expand chain on a `list` endpoint can produce very large response payloads.

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
