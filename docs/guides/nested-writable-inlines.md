---
title: Build Nested/Inlined Writes
type: how-to
audience: implementor
status: briefing
---

# Build Nested/Inlined Writes

## Intent and Scope

- Implement one-request parent+child write flows (create/update) using VUEDA serializers.
- Scope this page to the serializer/view/query-param contract for nested writable behavior with flex-fields compatibility.
- Treat this as technical scoping: tasks, invariants, and verification points, not tutorial prose.

## Non-goals

- Not a walkthrough of UI layout patterns for inline widgets/components.
- Not covering Django admin inline formsets.
- Not assuming generated API pages are behavior-complete; source code/tests remain authoritative.

## Key Tasks

### 1. Define nested serializers from VUEDA base serializers

- Use `VuedaSerializer` or `VuedaHistorySerializer` so nested writes run through `FlexFieldsWriteableNestedSerializerMixin`.
- Define related serializers in `Meta.expandable_fields`; use `"many": True` for reverse collections.
- Source anchors: `server/vueda/core/serializers/__init__.py`, `server/tests/serializers.py`, `server/tests/store/serializers.py`.

### 2. Make writable payloads match flex-field mode

- If a relation is sent as an object, include that relation in `e`/expand; otherwise serializer expects a PK and can fail with `incorrect_type`.
- Validate write flows with `f` + `e` query params on mutation requests, not only retrieve/list.
- Source anchors: `server/vueda/core/serializers/__init__.py`, `server/tests/unit/core/test_serializers.py`.

### 3. Preserve nested validation context

- Keep view/request context on root serializers so flex-field application is done once on write path.
- Nested serializers rely on propagated `initial_data` for validation paths that need raw submitted payload.
- Source anchors: `server/vueda/core/serializers/__init__.py`.

### 4. Lock down reverse-relation update semantics

- Update order is explicit: update parent, delete reverse relations as needed, then update/create reverse relations.
- Treat omission/deletion behavior for reverse collections as contract-critical and verify it per relation.
- Source anchors: `server/vueda/core/serializers/__init__.py`, `.venv/lib/python3.12/site-packages/drf_writable_nested/mixins.py`.

### 5. Use readonly nested serializers intentionally

- Reverse relations using `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer` are excluded from nested write extraction.
- Use these only when expanded inline data is display-only.
- Source anchors: `server/vueda/core/serializers/__init__.py`.

### 6. Verify client-side nested error path mapping

- Ensure backend nested keys (for example, `items[0].description`) resolve to focusable/displayable form fields.
- Include a failing nested-write test path so first-error selection is stable.
- Source anchors: `client/lib/use/useForm.js`, `client/tests/unit/lib/use/useForm.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:module:vueda.core.serializers}`
- `{@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}`
- `{@api py:class:vueda.core.serializers.VuedaSerializer}`
- `{@api py:class:vueda.core.serializers.VuedaHistorySerializer}`
- `{@api py:class:vueda.core.serializers.VuedaReadonlySerializer}`
- `{@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}`
- `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.use/useForm}`
- `{@api js:function:@arrai-innovations/vueda.use/useForm.useForm}`
- `{@api js:module:@arrai-innovations/vueda.use/useFormModel}`

## Contracts and Invariants

- `VuedaSerializer` composition includes `UniqueFieldsMixin` before nested create/update mixins; unique validation is deferred to save stage in nested flows.
- Flex-fields are applied to write-time serializer fields only for the root serializer/view context to avoid double-application.
- Nested serializer `initial_data` is explicitly propagated from parent serializer before nested validation.
- Reverse relation update flow deletes then (re)creates/updates reverse rows during update.
- Reverse relations declared with readonly serializer types are ignored for nested write extraction.
- Source anchors: `server/vueda/core/serializers/__init__.py`, `.venv/lib/python3.12/site-packages/drf_writable_nested/mixins.py`.

## Footguns

- Sending object payloads for relations without matching `e` expands causes type errors and can mask later validation issues.
- Using readonly nested serializers for fields that are expected to write results in non-updating reverse relations.
- Client form model handling currently does not support nested expand path parsing beyond one `__` split.
- Source anchors: `server/tests/unit/core/test_serializers.py`, `server/vueda/core/serializers/__init__.py`, `client/lib/use/useFormModel.js`.

## Suggested Outline

```md
## Goal and Preconditions
## Serializer Shape for Nested/Inlined Writes
## Query Param Contract for Writable Expands
## Reverse-Relation Update Semantics
## Readonly Inline Patterns
## Validation and Error Mapping Checks
## Regression Checklist
## Troubleshooting
```
