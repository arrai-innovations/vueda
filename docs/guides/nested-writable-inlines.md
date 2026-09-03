---
title: Build Nested/Inlined Writes
type: how-to
audience: integrator
status: draft
---

# Build Nested/Inlined Writes

This guide covers implementing one-request parent+child write flows using VUEDA serializers; creating or updating a parent object and its related objects in a single API call. It walks through serializer shape, query parameter contracts, reverse-relation update semantics, read-only inline patterns, and client-side error mapping. The serializer behavior is defined by {@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin} and {@api py:class:vueda.core.serializers.VuedaSerializer}, and relies on explicit {@term Expand} contracts during writes.

The guide assumes familiarity with VUEDA's serializer composition. If you have not read [Nested Write Compatibility](../core-concepts/nested-write-compatibility), start there; it explains the flex-field and nested-write mixin boundary within which this guide operates. For `expand` and field query parameter mechanics, see [Field and Expand Semantics](../core-concepts/field-and-expand-semantics). For form validation and error mapping, see [Handle Form Validation and Server Errors](./form-validation-and-errors).

## Goal and Preconditions

The objective is a write flow where:

- A single POST or PUT/PATCH request creates or updates a parent object and its related children.
- The query parameter contract (`f`/`e`) matches the payload shape, so the serializer interprets relations correctly.
- Reverse-relation update semantics (creation, update, deletion of child rows) are explicit and verified.
- Readonly inline relations are expanded for display but excluded from write processing.
- Nested validation errors map to focusable form fields on the client.

Before you begin:

The parent serializer must inherit from `VuedaSerializer` or `VuedaHistorySerializer`, both of which include `FlexFieldsWriteableNestedSerializerMixin`. Serializers that do not use these bases will not participate in nested write handling.

The model registration must include a viewset. Nested writes flow through standard `create`/`update` viewset actions.

## Serializer Shape for Nested/Inlined Writes

Define related serializers in the parent serializer's `Meta.expandable_fields`. Each entry maps a field name to a serializer class and configuration:

```python
class OrderSerializer(VuedaSerializer):
    class Meta:
        model = Order
        fields = ["id", "customer", "status", "items"]
        expandable_fields = {
            "customer": (CustomerSerializer, {}),
            "items": (OrderItemSerializer, {"many": True}),
        }
```

Use `"many": True` for reverse collections (one-to-many or many-to-many relations). Forward foreign keys use the default (single-object) mode.

The nested serializer classes must also inherit from the VUEDA serializer bases if they need to participate in flex-field handling for their own fields. For simple nested objects, plain DRF serializers work, but they do not support flex-field application or `initial_data` propagation.

## Query Param Contract for Writable Expands

The `e` (expand) query parameter controls whether a relation field is deserialized as an expanded object or as a flat PK reference. This distinction is critical for write operations.

When a relation is **included** in the `e` parameter, the serializer expects the payload to contain an object (or list of objects) for that field. The nested serializer handles deserialization.

When a relation is **not included** in `e`, the serializer expects a PK value for that field. Sending an object payload for a non-expanded field results in an `incorrect_type` validation error; the serializer attempts to interpret the object as a PK and fails.

This means write requests must include matching `e` parameters:

```text
POST /api/orders/?e=items&e=customer
Content-Type: application/json

{
  "customer": {"name": "Acme Corp", "email": "acme@example.com"},
  "status": "draft",
  "items": [
    {"product": 42, "quantity": 3},
    {"product": 17, "quantity": 1}
  ]
}
```

Omitting `e=customer` while sending `customer` as an object would cause a type error. Validate `e` against the payload shape on write requests, not just on `read` requests. `e` has to be explicit because expand membership is what `permit_{action}_expands` checks to authorize a nested write on that relation in the first place.

The `f` (fields) and `om` (omit) sparse-fieldset parameters shape the response only. They never change what a write validates: a write always validates against the serializer's full field set, so a field the body supplies is validated fully even when `f`/`om` would exclude it from the response. On `create` and full `update`, this means the request body must supply every required field regardless of `f`/`om`. On a partial update, whether a field is required at all still follows the normal partial-update rule -- a field the body omits stays optional, `f`/`om`-excluded or not.

## Reverse-Relation Update Semantics

When updating an existing parent object, reverse-relation handling follows a fixed sequence defined by the mixin. Understanding this sequence is critical because it determines the behaviour of deletions.

**Matching by PK.** Child objects in the payload are matched to existing database rows by their PK field. Children with a PK that matches an existing row are updated. Children without a PK (or with a PK not present in the database) are created as new rows.

**Omission means deletion.** Existing child rows whose PKs are absent from the incoming payload are deleted. This is the `drf-writable-nested` default: the payload is treated as the complete set of children. If the intent is to leave existing children unchanged, include them in the payload with their PKs.

**Deletion runs before creation/update.** The update sequence is: delete missing children, then `update`/`create` the children present in the payload. This ordering prevents PK conflicts when replacing children.

Treat this omission/deletion behaviour as contract-critical. Verify it per relation in your test suite, because the behaviour applies uniformly to all reverse collections; there is no per-field opt-out for deletion on omission.

## Readonly Inline Patterns

Use `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer` for relations that should be expanded in `read` responses but must not participate in write operations. The mixin's `_extract_relations` method filters out these serializer types before nested write processing, so any data the client sends for these fields is silently dropped.

```python
class OrderSerializer(VuedaSerializer):
    class Meta:
        model = Order
        fields = ["id", "customer", "status", "items", "audit_log"]
        expandable_fields = {
            "items": (OrderItemSerializer, {"many": True}),
            "audit_log": (AuditLogReadonlySerializer, {"many": True}),
        }
```

In this example, `items` is writable (nested write data will be processed), while `audit_log` is display-only (data for it in write payloads will be ignored).

Use readonly serializers intentionally. If a relation that is expected to be writable is accidentally declared with a read-only serializer type, write data for it will be silently ignored; the request succeeds, but the nested data has no effect. This mismatch is a common source of confusion.

## Validation and Error Mapping Checks

Nested validation errors surface in the response with key paths that identify the nested field and index. For example, a validation error on the second item's `description` field appears as:

```json
{
    "items": [{}, { "description": ["This field may not be blank."] }]
}
```

On the client, `useForm` maps these nested error paths to form fields. The mapping currently supports one level of `__` split for nested expand paths. Ensure that:

- Backend nested keys (e.g., `items[1].description`) resolve to focusable form fields in the client.
- The first error in a nested validation response is scrolled/focused correctly.
- Nested error paths beyond one `__` split may not map correctly; test deep nesting explicitly if your form model uses it.

Include a failing nested-write test path in your verification so that first-error selection behaviour is stable.

## Regression Checklist

After implementing nested writes, verify the following:

- Creating a parent with nested children in a single POST succeeds with matching `e` parameters.
- Updating a parent with modified, added, and removed children applies all three changes correctly.
- Omitting a child from an `update` payload deletes that child.
- Sending object payloads without matching `e` parameters produces `incorrect_type` errors, not silent failures.
- Readonly inline relations ignore write data without errors.
- Nested validation errors appear as focusable form field errors on the client.
- A POST/PUT with `f`/`om` still requires every required field; a PATCH with `f`/`om` still validates every field the body supplies. Only the response is narrowed.

## Troubleshooting

**`incorrect_type` error on a relation field.** The payload contains an object (or list) for a relation, but the `e` parameter does not include that relation. Add the relation to `e` so the serializer deserializes it as an expanded object rather than a PK.

**Nested children not created or updated.** Check whether the relation's serializer is a `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer`. If so, write data for that relation is silently dropped. Switch to a writable serializer base.

**Children unexpectedly deleted on update.** The omission-means-deletion contract is in effect. Existing children whose PKs are absent from the `update` payload are deleted. Include all children you want to keep, with their PKs.

**Nested validation errors not appearing in the form.** Check that the client form model's field mapping supports the nested key path depth. `useForm` currently supports one level of `__` split for nested expand paths; deeper nesting may require custom error mapping.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.core.serializers}
    - {@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:class:vueda.history.serializers.VuedaHistorySerializer}
    - {@api py:class:vueda.core.serializers.VuedaReadonlySerializer}
    - {@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/use/useForm}
    - {@api js:function:@arrai-innovations/vueda/use/useForm#useForm}
    - {@api js:module:@arrai-innovations/vueda/use/useFormModel}
