---
title: Nested Write Compatibility
type: explanation
audience: integrator
status: draft
---

# Nested Write Compatibility

VUEDA serializers support nested writes, creating or updating related objects within a single request payload, by composing two third-party libraries into a single serializer mixin. The mixin defines the compatibility boundary: which flex-field behaviours apply during writes, how nested serializer fields receive data, how reverse relations are extracted and sequenced, and where the composition introduces constraints that differ from using either library alone.

This page explains the composition boundary and the observable failure surfaces it creates. For the practical steps to build nested write flows, see [Build Nested/Inlined Writes](../guides/nested-writable-inlines). For the broader serializer and metadata contract, see [Server-Client Metadata Contract](./server-client-metadata-contract). For the field and {@term Expand} query parameter semantics that interact with nested writes, see [Field and Expand Semantics](./field-and-expand-semantics).

## Boundary and Ownership

All nested write behaviour in VUEDA flows through {@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}. This mixin composes four concerns into a single inheritance chain: `UniqueFieldsMixin` (unique-together validation), `FlexFieldsSerializerMixin` (dynamic field inclusion/exclusion via `f`/`e` query parameters), `NestedCreateMixin`, and `NestedUpdateMixin` (nested relation create and update from `drf-writable-nested`). The standard VUEDA serializer bases (`VuedaSerializer` and `VuedaHistorySerializer`) both inherit from this mixin, so any serializer built on those bases participates in the nested write composition automatically.

The mixin is the single point where flex-field application, nested data propagation, reverse-relation extraction, and update sequencing are coordinated. Understanding its behaviour is necessary when debugging nested write failures, because the failure surface often involves the interaction between flex-field application and nested-write extraction rather than either concern in isolation.

## Flex + Nested Write Composition

Flex-fields and nested writes operate on the same serializer field set but with different goals, and the mixin keeps them on opposite sides of validation. {@term Expand} (`e`) is a write-path concern: when a relation is named in `e`, the mixin swaps it for its nested serializer before deserialization. Sparse-fieldset selection (`f`/`om`) is a response-only concern: a write always validates against the serializer's full field set, and `f`/`om` narrow only the representation returned after `save()`; a required field they exclude is still required. Nested writes extract relation data from the incoming payload and delegate it to the child serializer `create`/`update` logic.

The mixin enforces the expand swap's ordering by performing it in `to_internal_value`, which runs before the nested write mixins' `create` and `update` methods. This ordering is not configurable; it is baked into the mixin chain's method resolution order. Sparse-fieldset narrowing runs later, in `to_representation`, which for a write happens after `save()`.

## View-Bound Flex Application

Both the expand swap and sparse-fieldset narrowing are applied only when the serializer is the view's top-level serializer class -- never to a nested child, which already reflects whatever its parent decided for it. A nested child serializer will include whatever fields its class defines; it does not independently interpret `f`/`e`/`om` from the request's query parameters.

The expand swap, in `to_internal_value`, is naturally idempotent (it assigns dict entries rather than removing them), so it needs no double-application guard. Sparse-fieldset narrowing, in `to_representation`, does remove fields, so the mixin tracks it with a `_flex_fields_rep_applied` flag: the first `to_representation` call on an instance narrows the field set once and sets the flag, and a `ListSerializer` iterating many rows through the same child serializer instance skips reapplying it on every row.

## Nested Serializer Data Access

DRF does not automatically pass `initial_data` to nested serializer fields. VUEDA's mixin explicitly propagates it: during `to_internal_value`, for each field that is a serializer instance and whose field name appears in the incoming data, the mixin sets `initial_data` on the nested serializer to the corresponding value from the input payload.

This propagation is necessary because some validation paths on nested serializers need access to the raw submitted payload, not just the output of `to_internal_value`. Without it, nested serializers that inspect `initial_data` for validation decisions would see stale or missing data.

The propagation is conditional: only fields whose names are present in the incoming data receive `initial_data`. Fields the client omitted from the payload do not have `initial_data` set, and neither does a relation left as a flat PK field because `e` did not name it -- a plain PK field is not a serializer instance, so the propagation loop's `isinstance` check skips it.

## Reverse Relation Write Filtering

When the mixin extracts reverse relations for nested update processing, it filters out any relation whose serializer is a {@api py:class:vueda.core.serializers.VuedaReadonlySerializer} or {@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}. These serializer wrappers signal that the relation is display-only; it should be expanded for `read` responses, but should not participate in write operations.

The filtering happens in `_extract_relations`, before any nested update logic runs. Payloads that include data for a readonly-serializer relation will have that data silently dropped during write processing. No error is raised; the data is simply not extracted for nested write handling.

This means that if a relation is accidentally declared with a read-only serializer type but the client sends write data for it, the write data will be ignored without feedback. The mismatch between client expectation and server behaviour can be difficult to debug because the request succeeds (the parent object is created or updated), but the nested data has no effect.

## Update Sequencing

The mixin defines a fixed update sequence for nested writes:

1. **Direct relations are created or updated first.** Forward foreign key relations that appear in the payload are created or updated via `update_or_create_direct_relations` before the parent instance is saved. This ensures that foreign key values are available when the parent's `save()` runs.

2. **The parent instance is updated.** The parent model's fields are written to the database.

3. **Reverse relations are deleted.** Reverse relation items that are present in the database but absent from the incoming payload are deleted. The deletion semantics are provided by `drf-writable-nested`'s `NestedUpdateMixin` and depend on the relation's `many` configuration and the payload contents.

4. **Reverse relations are updated or created.** Remaining reverse relation items in the payload are matched to existing database rows (by PK when present) or created as new rows.

5. **The parent instance is refreshed from the database.** After all nested operations complete, the parent instance is refreshed to pick up any database-level changes (auto-generated fields, signals, etc.).

This sequence is not configurable. Custom save logic that depends on reverse relations being present before the parent save, or that expects parent save to happen before direct relation updates, will conflict with this ordering.

This sequence has diverged from the default, due to a bug discovered in drf-writable-nested. A test has been created (in TestCreateIssueExpectedFailure) that will fail if things are fixed in drf-writable-nested. We will review the need for the overriding code if this occurs. The original sequence had `#3` and `#4` reversed.

## Observable Failure Modes

**Readonly serializer payloads are silently dropped.** Reverse relation data targeting a `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer` field is excluded from nested write extraction. The request succeeds, but the nested data has no effect. Symptom: parent object saves correctly, child objects remain unchanged.

**Double application of sparse-fieldset narrowing is blocked.** If the `_flex_fields_rep_applied` flag is somehow set before the first legitimate `to_representation` call (through incorrect serializer reuse or manual flag manipulation), `f`/`om`/`e` will not narrow the representation at all. Symptom: responses include every field regardless of `f`/`om`, as though those parameters were not passed. This does not affect write validation or the `e` expand swap, which do not consult this flag.

**Unique validation timing in nested flows.** `UniqueFieldsMixin` is composed before the nested `create`/`update` mixins in the mixin chain. Unique-together validation runs at the serializer validation phase, before nested objects are persisted. For validation rules that depend on the final state of nested relations (e.g., uniqueness constraints that span parent and child), the validation may evaluate against stale database state.

## Relevant Implementation Surface

- {@api py:module:vueda.core.serializers}
- {@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}
- {@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.to_internal_value}
- {@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.\_extract_relations}
- {@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.update_or_create_direct_relations}
- {@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.update}
- {@api py:class:vueda.core.serializers.VuedaReadonlySerializer}
- {@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}
