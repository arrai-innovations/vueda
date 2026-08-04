---
title: Split Read/Write Serializers Safely
type: how-to
audience: integrator
status: draft
---

# Split Read/Write Serializers Safely

This guide covers using different serializers for `read` actions (`list`/`retrieve`) versus write actions (`create`/`update`/`partial_update`) on the same viewset, while keeping client metadata ({@term Model Info}), form behaviour, and post-submit redirects coherent. The split is useful when `read` responses need rich, expanded data that should not appear in write payloads, or when write validation rules differ substantially from read field sets.

The guide assumes familiarity with VUEDA's canonical registration and metadata contract. If you have not read [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery), start there; it explains how model-info metadata is derived from the registered serializer/viewset pair. For the field and `expand` query parameter semantics that interact with per-action serializers, see [Field and Expand Semantics](../core-concepts/field-and-expand-semantics).

## Problem and Preconditions

The objective is a viewset where:

- `list` and `retrieve` actions use a read-optimized serializer (potentially with more expands, computed fields, or nested data).
- `create`, `update`, and `partial_update` actions use a write-optimized serializer (potentially with fewer fields, different validation, or different expand behaviour).
- Model-info metadata remains consistent with what the client needs for rendering and route guards.
- Post-submit redirects work correctly (the write response includes the PK).
- Query parameter validation (`f`/`e`) works against the correct serializer for each action.

Before you begin:

The model must have a {@term Canonical Registration} via {@api py:function:vueda.info.registration.register} with a viewset. The canonical serializer used in registration determines model-info field metadata; this is independent of per-action serializer selection at runtime.

## {@term Canonical Serializer} and Registration Choice

Model-info field metadata (`model_fields`) is derived from the {@term Canonical Serializer} registered with `info.register(...)`, not from per-action runtime serializer selection. This means the metadata the client uses for form rendering, field types, and validation hints comes from a single serializer, regardless of how many serializers the viewset uses at runtime.

Choose which serializer to register as canonical based on what the client needs for form rendering. Typically, this is the write serializer, since form fields need to match the fields the server accepts on `create`/`update`. If you register the read serializer as canonical and it includes fields that the write serializer does not accept, the client may render form fields that produce validation errors on submit.

{@term Serializer-Only Registration} with `register_serializer(...)` (no viewset) is possible but produces limited metadata: `model_actions` will be empty, and filter/ordering metadata will be absent. Use this only when the model does not require client-side action routing or `list` filtering.

```python
from vueda.info.registration import register

class MyAppConfig(AppConfig):
    def ready(self):
        from .serializers import MyWriteSerializer
        from .viewsets import MyViewSet
        register(MyWriteSerializer, MyViewSet)
```

## ViewSet Action-to-Serializer Mapping

Use {@api py:class:vueda.core.viewsets.PerActionSerializerMixin} to map specific actions to specific serializer classes. Set action-specific attributes on the viewset:

```python
from vueda.core.viewsets import PerActionSerializerMixin, VuedaViewSet

class MyViewSet(PerActionSerializerMixin, VuedaViewSet):
    serializer_class = MyWriteSerializer  # default fallback
    list_serializer_class = MyReadSerializer
    retrieve_serializer_class = MyReadSerializer
    create_serializer_class = MyWriteSerializer
    update_serializer_class = MyWriteSerializer
    partial_update_serializer_class = MyWriteSerializer
```

`PerActionSerializerMixin.get_serializer_class` checks for a `{action}_serializer_class` attribute matching the current viewset action. When present, it returns that class; otherwise, it falls back to the default serializer resolution.

**Inheritance order matters.** `PerActionSerializerMixin` must appear before `VuedaViewSet` in the class hierarchy. If it appears after, `VuedaViewSet`'s `get_serializer_class` may resolve first, bypassing the per-action mapping entirely.

**`VuedaViewSet` does not include `PerActionSerializerMixin` by default.** You must add it explicitly to the viewset's inheritance chain.

**Do not forget `partial_update_serializer_class`.** PATCH requests use the `partial_update` action. If you set `update_serializer_class` but not `partial_update_serializer_class`, PATCH requests will fall back to the default `serializer_class`, which may not be the intended write serializer.

## Client Compatibility Checks

### PK in write responses

After a successful submission, the client create and `update` forms redirect to the `detail` view using the PK from the response payload. If the write serializer omits the PK field from its output, the post-submit redirect will fail; the client cannot construct the detail URL without a PK.

Ensure the write serializer includes the PK field in its `fields`. This is a common oversight when stripping fields from write serializers.

### Query parameter validation per action

The `f` and `e` query parameters are validated against the action's serializer and its permitted expands. Splitting serializers can surface `400` errors if the client sends fields or expands that exist on the read serializer but not on the write serializer (or vice versa).

If the client uses the same `f`/`e` parameters for both read and write requests (common in form flows that fetch then submit), ensure the write serializer accepts at least the field/expand subset the client sends. Alternatively, the client can use different parameters for read and write requests, but this requires deliberate configuration.

## Metadata Consistency Checks

After setting up the split, verify that model-info metadata matches client expectations:

**`model_fields` reflects the canonical serializer.** Check the model-info endpoint response. The field names, types, and metadata should match what the client's form rendering expects. If the canonical serializer is the write serializer, the fields will match write payloads. If it is the read serializer, fields may include read-only computed fields that the write serializer does not accept.

**`model_actions` requires a registered viewset.** If the canonical registration was done with `register_serializer(...)` instead of `register(...)`, `model_actions` will be empty and route guards will deny all action routes.

**Per-action serializers do not automatically `update` metadata.** Adding a new field to the read serializer does not add it to model-info metadata unless the canonical serializer also includes it. The metadata is static relative to the canonical registration; per-action variation is invisible to the metadata layer.

## Test Checklist

After implementing the serializer split, verify:

- `list` and `retrieve` responses using the read serializer's field set and expands.
- `create`, `update`, and `partial_update` requests use the write serializer's validation and field set.
- Model-info `model_fields` reflects the canonical serializer, not the per-action serializers.
- Model-info `model_actions` is populated (requires viewset registration).
- Post-submit redirects work for both create and update (PK is present in write responses).
- `f`/`e` parameters accepted on write actions match what the client sends.
- PATCH specifically uses `partial_update_serializer_class`, not the default.

## Troubleshooting

**`PerActionSerializerMixin` has no effect.** Check the viewset's MRO. If `PerActionSerializerMixin` appears after `VuedaViewSet` in the class definition, the mixin's `get_serializer_class` may be shadowed. Move it before `VuedaViewSet`.

**PATCH uses the wrong serializer.** `partial_update_serializer_class` was not set. PATCH maps to the `partial_update` action, which needs its own attribute. Set it explicitly.

**Post-submit redirect fails after create.** The write serializer does not include the PK field in its output. Add the PK field to the write serializer's `Meta.fields`.

**Model-info metadata does not match write serializer fields.** The canonical registration uses the read serializer. Re-register with the write serializer if form rendering should match write payloads.

**`400` on write with `f`/`e` parameters.** The query parameters reference fields or expands that exist on the read serializer but not the write serializer. Adjust the client's write-request parameters to match the write serializer's field set, or add the missing fields/expands to the write serializer.

**`model_actions` is empty.** The model was registered with `register_serializer(...)` instead of `register(...)`. Use `register(serializer, viewset)` to include action and filter metadata.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.viewsets.PerActionSerializerMixin}
    - {@api py:function:vueda.core.viewsets.PerActionSerializerMixin.get_serializer_class}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.info.registration.register}
    - {@api py:function:vueda.info.registration.register_serializer}
    - {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda/use/useObjectForm}
- Vue.js Components:
    - {@api vue:component:ViewCreate}
    - {@api vue:component:ViewUpdate}
