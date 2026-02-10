---
title: Nested Write Compatibility
type: explanation
audience: implementor
status: briefing
---

# Nested Write Compatibility

## Intent and Scope

- Define the compatibility boundary for nested writes: how flex-fields and drf-writable-nested behavior is composed and constrained inside VUEDA serializers. Source anchors: `server/vueda/core/serializers/__init__.py#L74`, `server/vueda/core/serializers/__init__.py#L84`.
- Define where nested-write authority lives (serializer mixin, relation extraction, update sequencing). Source anchors: `server/vueda/core/serializers/__init__.py#L109`, `server/vueda/core/serializers/__init__.py#L120`.
- Describe observable failure surfaces when nested-write assumptions are violated. Source anchors: `server/vueda/core/serializers/__init__.py#L84`, `server/vueda/core/serializers/__init__.py#L109`.

## Non-goals

- Not a how-to for declaring nested serializers or configuring flex-fields.
- Not a client payload-shaping guide.

## Key Concepts

### Flex + nested-write composition boundary

- What it is: `FlexFieldsWriteableNestedSerializerMixin` composes flex-fields and drf-writable-nested mixins into a single serializer base. Source anchors: `server/vueda/core/serializers/__init__.py#L74`, `server/vueda/core/serializers/__init__.py#L80`.
- Why it exists: one serializer mixin defines the combined flex + nested-write behavior surface. Source anchors: `server/vueda/core/serializers/__init__.py#L80`.
- Where it lives: serializer mixin definition in `vueda.core.serializers`. Source anchors: `server/vueda/core/serializers/__init__.py#L74`.

### View-bound flex application

- What it is: flex fields are applied only when the serializer is the view’s serializer class, and only once. Source anchors: `server/vueda/core/serializers/__init__.py#L84`, `server/vueda/core/serializers/__init__.py#L92`.
- Why it exists: double-application of flex fields is treated as an error case, so nested serializers skip application. Source anchors: `server/vueda/core/serializers/__init__.py#L86`.
- Where it lives: `FlexFieldsWriteableNestedSerializerMixin.to_internal_value`. Source anchors: `server/vueda/core/serializers/__init__.py#L84`.

### Nested serializer `initial_data` propagation

- What it is: nested serializer fields receive `initial_data` when the field appears in the input payload. Source anchors: `server/vueda/core/serializers/__init__.py#L97`, `server/vueda/core/serializers/__init__.py#L101`.
- Why it exists: DRF does not automatically pass `initial_data` to nested serializers; VUEDA injects it to preserve validation access. Source anchors: `server/vueda/core/serializers/__init__.py#L97`.
- Where it lives: `FlexFieldsWriteableNestedSerializerMixin.to_internal_value`. Source anchors: `server/vueda/core/serializers/__init__.py#L84`.

### Reverse relation write filtering

- What it is: reverse relation writes exclude fields using `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer`. Source anchors: `server/vueda/core/serializers/__init__.py#L109`, `server/vueda/core/serializers/__init__.py#L115`.
- Why it exists: read-only serializer wrappers are not writable, so they are removed from reverse-relation processing. Source anchors: `server/vueda/core/serializers/__init__.py#L114`.
- Where it lives: `FlexFieldsWriteableNestedSerializerMixin._extract_relations`. Source anchors: `server/vueda/core/serializers/__init__.py#L109`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.serializers}`
- `{@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}`
- `{@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.to_internal_value}`
- `{@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin._extract_relations}`
- `{@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.update_or_create_direct_relations}`
- `{@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.update}`
- `{@api py:class:vueda.core.serializers.VuedaReadonlySerializer}`
- `{@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}`

## Contracts and Invariants

- `FlexFieldsWriteableNestedSerializerMixin` composes `UniqueFieldsMixin`, `FlexFieldsSerializerMixin`, `NestedCreateMixin`, and `NestedUpdateMixin`. Source anchors: `server/vueda/core/serializers/__init__.py#L74`.
- Flex fields are applied only when the serializer is the view’s serializer class and `_flex_fields_rep_applied` is false. Source anchors: `server/vueda/core/serializers/__init__.py#L92`.
- Nested serializer fields receive `initial_data` only when their field name is present in incoming data. Source anchors: `server/vueda/core/serializers/__init__.py#L100`, `server/vueda/core/serializers/__init__.py#L101`.
- Reverse relations for `VuedaReadonlySerializer` and `VuedaReadonlyListSerializer` are removed before nested updates. Source anchors: `server/vueda/core/serializers/__init__.py#L109`, `server/vueda/core/serializers/__init__.py#L115`.
- Update sequencing is: direct relation update, instance update, reverse relation deletion, reverse relation update/create, refresh from DB. Source anchors: `server/vueda/core/serializers/__init__.py#L120`, `server/vueda/core/serializers/__init__.py#L136`.

## Footguns

- Reverse relation payloads targeting `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer` are dropped from nested-write processing in this mixin. Source anchors: `server/vueda/core/serializers/__init__.py#L109`, `server/vueda/core/serializers/__init__.py#L115`.
- Flex fields are only applied when the serializer is bound to a view; nested serializers do not receive automatic flex-field application here. Source anchors: `server/vueda/core/serializers/__init__.py#L92`.

## Suggested Outline

- `## Boundary and Ownership`
- `## Flex + Nested Write Composition`
- `## View-Bound Flex Application`
- `## Nested Serializer Data Access`
- `## Reverse Relation Write Filtering`
- `## Update Sequencing`
- `## Observable Failure Modes`
