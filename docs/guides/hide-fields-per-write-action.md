---
title: Lock Fields to Specific Write Actions
type: how-to
audience: integrator
status: draft
---

# Lock Fields to Specific Write Actions

This guide covers {@api py:class:vueda.core.serializers.ExcludeFieldsSerializerMixin}, which makes specific fields read-only for `create` or for `update`/`partial_update`, without maintaining separate serializer classes per action. It also covers the mixin's one hard requirement (a routed ViewSet's `serializer_class`, directly) and the three ways it is commonly misused, all of which are caught by a Django system check.

If the fields you need to differ between read and write are extensive enough that you would rather maintain two whole serializer classes, see [Split Read/Write Serializers Safely](split-read-write-serializers) instead; that guide covers `PerActionSerializerMixin` and per-action serializer classes. Reach for `ExcludeFieldsSerializerMixin` when the field set is otherwise identical and only a handful of fields need to be locked down for one action -- for example, a `supervisor` field that can only be set at creation, or an `employee` field that is immutable after creation.

## What the Mixin Does

Add `ExcludeFieldsSerializerMixin` before the base VUEDA serializer in the MRO, then declare `exclude_create_fields` and/or `exclude_update_fields` on `Meta` as lists of field names:

```python
from vueda.core.serializers import ExcludeFieldsSerializerMixin
from vueda.core.serializers import VuedaSerializer


class TimesheetSerializer(ExcludeFieldsSerializerMixin, VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Timesheet
        fields = ["id", "period_start", "period_end", "employee", "supervisor"] + VuedaSerializer.Meta.fields
        exclude_create_fields = ["supervisor"]
        exclude_update_fields = ["employee"]
```

`exclude_create_fields` forces those fields to `read_only=True` when `self.context["view"].action == "create"`. `exclude_update_fields` does the same for both `update` and `partial_update`, so a single declaration covers PUT and PATCH. Both are additive to any `read_only`/`extra_kwargs` you already declare; the mixin never makes a field writable, only more restrictive.

Fields are not removed from `Meta.fields`. They stay present in `serializer.fields` and continue to appear in the response representation; the mixin only prevents that action from accepting new values for them.

::: warning
Avoid extra action names that are substrings of `"create"`, `"update"`, or `"partial_update"` (for example, an action literally named `date` or `up`) on a viewset that uses this mixin. The action match is a plain string containment check (`action in exclude_action`), not an equality check against the fixed set of `{"create", "update", "partial_update"}` -- it happens to work for `update`/`partial_update` because one is a substring of the other, but it means an unrelated action whose name is a substring of one of those three words would spuriously get the same fields excluded.
:::

## The Silent-Drop Behavior

Because excluded fields become `read_only` rather than rejected, submitting a value for one does not raise a validation error -- the value is silently ignored and the field keeps its previous (or default) value:

- On `create`, submitting a value for a field in `exclude_create_fields` saves the object with that field unset (its model default, e.g. `None` for a nullable foreign key), not the submitted value.
- On `update`/`partial_update`, submitting a value for a field in `exclude_update_fields` leaves the instance's existing value untouched.

Neither case surfaces as a `400` response. If clients need an explicit rejection instead of a silent no-op (for example, to catch a client bug where a field is submitted that should never be sent for that action), use `Meta.exclude_create_fields`/`exclude_update_fields` together with an explicit check in `validate()` that raises `VuedaValidationError` when the field is present in `self.initial_data`, rather than relying on this mixin alone.

## The One Valid Usage Pattern

`get_extra_kwargs()` reads `self.context["view"].action`. That key is only ever populated when the serializer is instantiated as a routed ViewSet's `serializer_class` directly, servicing a real request -- DRF's `ViewSetMixin.initialize_request` is what sets `.action`, and it only runs for the view actually handling the request:

```python
from vueda.core.viewsets import VuedaViewSet


class TimesheetViewSet(VuedaViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer  # the only valid placement
```

This is also satisfied when `TimesheetSerializer` is registered as the {@term Canonical Serializer} via {@api py:function:vueda.info.registration.register} paired with this viewset -- registration and direct `serializer_class` assignment are the same placement from the mixin's perspective.

## Misuse: Reached Without a View in Context

`ExcludeFieldsSerializerMixin` crashes with a bare `KeyError: 'view'` the moment its `.fields` are built without a view in context. This happens whenever the serializer is only reachable indirectly, rather than being a routed ViewSet's own `serializer_class`:

**Nested as a declared field on another serializer**, the way `InvoiceSerializer` might nest `InvoiceLineSerializer`:

```python
class ParentSerializer(VuedaSerializer):
    leaf = TimesheetSerializer()  # misuse: TimesheetSerializer has no view in context here
```

`drf_writable_nested`'s field-building inspects the nested instance's validators while it is still unbound (no parent, so no context), which is when the `KeyError` fires.

**Reachable only through `expandable_fields`**, the way `CustomerSerializer` might expand `UserSerializer`:

```python
class ParentSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        expandable_fields = {"leaf": (TimesheetSerializer, {})}  # misuse
```

Both the `/info/` meta-API's expand-metadata generation and drf-spectacular's schema generation instantiate the expand target bare (no context) to describe it, which raises the same `KeyError`.

**Registered with `register_serializer()` (no viewset)**:

```python
from vueda.info.registration import register_serializer

register_serializer(TimesheetSerializer)  # misuse: no viewset means no view, ever
```

A {@term Serializer-Only Registration} never has a view in context, by definition, so any access to this serializer's fields fails immediately.

All three misuse cases surface at the same two points: `manage.py spectacular` (or any request to a spectacular-served schema) and the `/info/` meta-API's field/expand metadata generation -- both build field metadata without a view for these code paths, regardless of the surrounding endpoint working fine for ordinary CRUD traffic.

## System Check Coverage

{@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage} runs as a Django system check (registered in `CoreConfig.ready()`) and catches all three misuse patterns at `manage.py check` time, before either crash point is hit at runtime:

| Check ID          | Misuse                                                          |
| ----------------- | --------------------------------------------------------------- |
| `vueda_core.E007` | Used as a nested field on another serializer                    |
| `vueda_core.E008` | Reachable only through another serializer's `expandable_fields` |
| `vueda_core.E009` | Registered with `register_serializer()` (no viewset)            |

The check walks every ViewSet reachable from the resolved URL conf, plus every `register_serializer()` registration, so it covers serializers that use `ExcludeFieldsSerializerMixin` anywhere in the app, not just ones you remember to test manually. Run `manage.py check` (CI should already do this) after adding or moving a serializer that uses this mixin.

## Fields Stay Visible in Model Info and Schema Metadata

`exclude_create_fields`/`exclude_update_fields` only affect the live `create`/`update`/`partial_update` request lifecycle of the serializer's own ViewSet. They do not remove the field from:

- The `/info/` meta-API's `model_fields`, generated using the info endpoint's own view in context (not the model's registered ViewSet's action) -- the excluded field is reported the same as any other field.
- The OpenAPI schema `drf-spectacular` generates for `get_schema_fields()` / `get_schema_expandable_fields()`.

If a client-rendered form needs to actually omit the field (rather than just have the server ignore submitted values for it), exclude it from that action's serializer's `Meta.fields` entirely -- which means moving to the full [read/write serializer split](split-read-write-serializers) instead of this mixin.

## Test Checklist

After adding `exclude_create_fields`/`exclude_update_fields`:

- A `create` request that submits a value for a field in `exclude_create_fields` saves successfully, with that field at its default/unset value, not the submitted one.
- An `update` and a `partial_update` request that each submit a value for a field in `exclude_update_fields` save successfully, with the existing value unchanged.
- `manage.py check` passes with no `vueda_core.E007`/`E008`/`E009` errors.
- `manage.py spectacular` (or your CI's schema-generation step) succeeds for any viewset using this serializer.

## Troubleshooting

**`KeyError: 'view'` from `manage.py spectacular` or the `/info/` endpoint.** The serializer using `ExcludeFieldsSerializerMixin` is reachable as a nested field, an `expandable_fields` target, or a `register_serializer()`-only registration. Run `manage.py check` to get the specific `E007`/`E008`/`E009` error naming the offending serializer and field, then move the exclusion logic to the serializer that is actually the routed ViewSet's `serializer_class`, or drop the mixin from the nested/expanded copy.

**Submitted field value is silently ignored instead of erroring.** This is the mixin's designed behavior, not a bug -- the field is `read_only` for that action, so DRF drops it from `to_internal_value` rather than rejecting it. Add an explicit `validate()` check if the client-facing contract should be a `400` instead.

**Field still appears in `/info/` `model_fields` or the OpenAPI schema after excluding it.** Expected -- see [Fields Stay Visible in Model Info and Schema Metadata](#fields-stay-visible-in-model-info-and-schema-metadata) above. This mixin changes what a write request accepts, not what metadata describes.

**An unrelated custom action also gets fields excluded.** Check whether that action's name is a substring of `"create"`, `"update"`, or `"partial_update"` -- see the warning under [What the Mixin Does](#what-the-mixin-does).

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.serializers.ExcludeFieldsSerializerMixin}
    - {@api py:function:vueda.core.serializers.ExcludeFieldsSerializerMixin.get_extra_kwargs}
    - {@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.info.registration.register}
    - {@api py:function:vueda.info.registration.register_serializer}
