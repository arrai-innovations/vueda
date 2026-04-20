---
title: DRF Ecosystem Compatibility Boundaries
type: explanation
audience: implementor
status: draft
---

# DRF Ecosystem Compatibility Boundaries

VUEDA intentionally constrains and extends DRF-ecosystem defaults in three areas to preserve a contract-first, metadata-driven system: it overrides upstream query parameter conventions with a canonical namespace, it gates metadata authority behind an explicit registration surface, and it rejects unknown inputs at both view and serializer boundaries. These are deliberate departures, not accidental divergences, and each is enforced by a specific authority point in the server stack.

This page is an orientation hub. It describes the deviation families at a high level and links to the focused explainers that cover each in depth. For the full list-query contract including filter metadata, search backends, and validation semantics, see [Filtering and Ordering Semantics](./filtering-and-ordering-semantics). For the field and expand wire contract, see [Field and Expand Semantics](./field-and-expand-semantics). For validation payload shapes, see [Error and Validation Contract](./error-and-validation-contract). For nested-writable composition constraints, see [Nested Write Compatibility](./nested-write-compatibility). For the metadata contract that drives client UI, see [Server-Client Metadata Contract](./server-client-metadata-contract). For the registration surface that governs metadata authority, see [Canonical Registration and Model Discovery](./canonical-registration-and-discovery).

## Default Namespace and Backends

Upstream DRF uses longer query parameter names (`search`, `ordering`) and does not specify a specific filter backend in its default configuration. VUEDA replaces these with a canonical keyset: `s` for search, `o` for ordering, `p` and `ps` for pagination, and `e`, `f`, `om` for flex-field control (expand, fields, omit). These names are set in `REST_FRAMEWORK` and `REST_FLEX_FIELDS` server defaults, and the client hard-codes the same literals as constants.

VUEDA also configures a default filter backend stack: `VuedaSearchFilterBackend` (which extends DRF's `SearchFilter` with ranked search), `OrderingFilter`, and `DjangoFilterBackend`. This stack runs on every `list` endpoint unless explicitly overridden per viewset. The result is that `list` queries have consistent search, ordering, and filtering behaviour across all registered models without per-viewset configuration.

The upstream departure is deliberate: a single canonical keyset, enforced at the server defaults layer, eliminates per-project negotiation of query parameter names and ensures that the client's constant declarations match the server's expectations. See [Configuration Surface and Defaults](./configuration-surface-and-defaults) for the full settings assembly surface.

## Registration-Gated Metadata Authority

Upstream DRF does not define a first-class registry for model metadata projection. Metadata surfaces, such as `OPTIONS` responses, are generated dynamically by the viewset and serializer at the point of the request.

VUEDA introduces an explicit registration surface ({@api py:module:vueda.info.registration}) that maps `app_label.model` to a canonical serializer and optional viewset. Model-info endpoints, which drive the client's entire metadata-driven UI, are gated to registered content types and consult the registration mapping for serializer and viewset authority. An unregistered model has no model-info endpoint, no metadata projection, and no client-side UI surface.

This gating means that simply adding a DRF viewset and router entry does not make a model visible to the VUEDA client. The model must also be registered, and the registration determines which serializer-viewset pair is authoritative for metadata derivation. This is the boundary between "this model has a REST API" and "this model participates in the VUEDA metadata contract." See [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) for the registration mechanics.

## Validation Surfaces

Upstream DRF request parsing tolerates unknown query parameters on `list` endpoints and commonly ignores extra keys in serializer input. VUEDA enforces explicit rejection at both boundaries.

{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin} validates `list` query parameters against the declared filter namespace. Any query key outside the union of filter fields, lookup-derived keys, and framework parameters is rejected with an HTTP 400 and a field-keyed validation error naming the valid filter set. This enforcement applies when the viewset declares a `filterset_class`; without a filterset, the check is skipped.

{@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin} validates top-level serializer input against the declared field set. Extra payload keys trigger field-keyed validation errors. This applies only at the top-level serializer boundary; nested serializer payload keys are not validated by this mixin.

Both validation surfaces enforce the same principle: contract surfaces are explicit, and unknown inputs are treated as errors rather than being silently discarded. The benefit is immediate, diagnosable errors for typos and stale clients. The cost is that integrations that append unexpected query parameters or payload keys will fail rather than degrade gracefully. See [Filtering and Ordering Semantics](./filtering-and-ordering-semantics) for the list-query validation details.

## Composite Primary Key Support

Django's `CompositePrimaryKey` field requires coordinated deviations at the serializer, viewset, and URL routing layers.

**Automatic field mapping.** `VuedaSerializer` extends DRF's `serializer_field_mapping` with an entry that maps `CompositePrimaryKey` to `CompositePrimaryKeyField`. Serializers that inherit from `VuedaSerializer` receive correct composite key serialization automatically, without declaring the field explicitly.

**Django model delegation in `CompositePrimaryKeyField`.** The field delegates serialization and deserialization to the `CompositePrimaryKey` model field's own methods: `value_to_string` for outbound conversion and `to_python` for inbound parsing. Delegating to these model-level functions reduces VUEDA-specific logic and means that if Django changes the data format returned by those methods, the serializer field adjusts without modifications to VUEDA.

**`get_object` URL conversion.** DRF's default `get_object` passes URL keyword arguments directly to the ORM lookup. Composite primary key models carry the key as a comma-separated string in the URL (for example, `["1","2"]/`). `VuedaViewSet.get_object` detects whether the model has a `CompositePrimaryKey` and splits the `pk` URL segment into a list before calling `super().get_object()`, because the ORM requires the key as a sequence.

**`reverse()` incompatibility.** Django's `reverse()` function does not accept a list or tuple as an URL argument. A composite primary key's `.pk` attribute is a list, so passing it directly to `reverse()` raises an error. The value must be converted to a comma-separated string before being passed to `reverse()`.

## Observable Failure Modes

**Query parameter typo returns 400.** A misspelled filter key or an unsupported query parameter produces an HTTP 400 with `"Invalid query parameter.  Valid filters are ..."`. The error includes the valid filter set for diagnosis.

**Extra payload key returns 400.** An unrecognized top-level key in a create or `update` request body produces a field-keyed validation error. Nested serializer payload drift is not caught by this check; only top-level keys are validated.

## Relevant Implementation Surface

- {@api py:module:vueda.core.default_settings}
- {@api py:module:vueda.info.registration}
- {@api py:module:vueda.core.viewsets}
- {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}
- {@api py:class:vueda.core.viewsets.VuedaViewSet}
- {@api py:function:vueda.core.viewsets.VuedaViewSet.get_object}
- {@api py:module:vueda.core.serializers}
- {@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin}
- {@api py:class:vueda.core.serializers.fields.CompositePrimaryKeyField}
