---
title: Lock Fields to Specific Write Actions
type: how-to
audience: integrator
status: draft
---

# Lock Fields to Specific Write Actions

This guide covers {@api py:class:vueda.core.serializers.ExcludeFieldsSerializerMixin}, which makes specific fields read-only for `create` or for `update`/`partial_update`, without maintaining separate serializer classes per action. It also covers where the mixin reads the action from, and the two placements that a Django system check rejects.

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

The mixin can only exclude fields that DRF builds from the model. It works through DRF's `extra_kwargs`, and DRF does not apply `extra_kwargs` to a field declared on the serializer class, such as `employee = EmployeeField()`. Listing a declared field in `exclude_create_fields` or `exclude_update_fields` has no effect, and nothing reports it. To lock a declared field, pass `read_only=True` to it, or use separate serializer classes per action.

The mixin matches the action name exactly. An extra action named `partial` or `date` gets no exclusions.

## The Silent-Drop Behavior

Because excluded fields become `read_only` rather than rejected, submitting a value for one does not raise a validation error -- the value is silently ignored and the field keeps its previous (or default) value:

- On `create`, submitting a value for a field in `exclude_create_fields` saves the object with that field unset (its model default, e.g. `None` for a nullable foreign key), not the submitted value.
- On `update`/`partial_update`, submitting a value for a field in `exclude_update_fields` leaves the instance's existing value untouched.

Neither case surfaces as a `400` response. If clients need an explicit rejection instead of a silent no-op (for example, to catch a client bug where a field is submitted that should never be sent for that action), use `Meta.exclude_create_fields`/`exclude_update_fields` together with an explicit check in `validate()` that raises `VuedaValidationError` when the field is present in `self.initial_data`, rather than relying on this mixin alone.

## Where the Action Comes From

`get_extra_kwargs()` reads the action from the view in the serializer's context. DRF sets `.action` on a ViewSet while it handles a request. So the exclusions apply when the serializer is a routed ViewSet's `serializer_class`:

```python
from vueda.core.viewsets import VuedaViewSet


class TimesheetViewSet(VuedaViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
```

Registering `TimesheetSerializer` as the {@term Canonical Serializer} with {@api py:function:vueda.info.registration.register} and this viewset is the same placement.

When the context has no view, or the view has no `action`, the mixin excludes no fields. Every field keeps its declared writability. This covers a {@term Serializer-Only Registration} made with {@api py:function:vueda.info.registration.register_serializer}, and code that builds the serializer without a context. Such a serializer has no ViewSet of its own, so it receives no `create` or `update` request for the exclusions to restrict.

## Placements the System Check Rejects

A nested serializer shares its root serializer's context. So a nested copy of the mixin would apply its exclusions for the parent view's action, not for an action of its own. VUEDA does not support that behavior, so the system check rejects two placements.

**Nested as a declared field on another serializer**, the way `InvoiceSerializer` might nest `InvoiceLineSerializer`:

```python
class ParentSerializer(VuedaSerializer):
    leaf = TimesheetSerializer()  # rejected by vueda_core.E007
```

**Reachable through `expandable_fields`**, the way `CustomerSerializer` might expand `UserSerializer`:

```python
class ParentSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        expandable_fields = {"leaf": (TimesheetSerializer, {})}  # rejected by vueda_core.E008
```

In both cases, remove the mixin from the nested or expanded serializer.

Exclusions declared on the parent serializer cannot take over this job. A nested serializer is a declared field, such as `leaf` above, and [the mixin cannot exclude declared fields](#what-the-mixin-does). So the parent's exclusions can lock the parent's own model fields, but not a nested serializer or the fields inside it.

To lock fields inside a nested serializer for one action, give that action its own serializer classes. Subclass the nested serializer and mark the fields read-only in its `Meta`. Then subclass the parent to nest that version, and select the parent subclass for the action with {@api py:class:vueda.core.viewsets.PerActionSerializerMixin}:

```python
from vueda.core.serializers import VuedaSerializer
from vueda.core.viewsets import PerActionSerializerMixin
from vueda.core.viewsets import VuedaViewSet


class InvoiceLineSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = InvoiceLine
        fields = ["id", "product", "quantity"] + VuedaSerializer.Meta.fields


class InvoiceLineUpdateSerializer(InvoiceLineSerializer):
    class Meta(InvoiceLineSerializer.Meta):
        read_only_fields = ["product"]


class InvoiceSerializer(VuedaSerializer):
    lines = InvoiceLineSerializer(many=True)

    class Meta(VuedaSerializer.Meta):
        model = Invoice
        fields = ["id", "customer", "lines"] + VuedaSerializer.Meta.fields


class InvoiceUpdateSerializer(InvoiceSerializer):
    lines = InvoiceLineUpdateSerializer(many=True)


class InvoiceViewSet(PerActionSerializerMixin, VuedaViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    update_serializer_class = InvoiceUpdateSerializer
    partial_update_serializer_class = InvoiceUpdateSerializer
```

A `create` request can set each line's `product`. An `update` or `partial_update` request can change a line's `quantity` but not its `product`. [Split Read/Write Serializers Safely](split-read-write-serializers) covers per-action serializer classes in more detail.

## System Check Coverage

{@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage} runs as a Django system check (registered in `CoreConfig.ready()`). It reports both rejected placements at `manage.py check` time:

| Check ID          | Level | Placement                                                  |
| ----------------- | ----- | ---------------------------------------------------------- |
| `vueda_core.E007` | Error | Used as a nested field on another serializer               |
| `vueda_core.E008` | Error | Reachable through another serializer's `expandable_fields` |

The check starts from every ViewSet reachable through the resolved URL conf and every serializer in the `vueda.info` registry, whether it was added with `register()` or `register_serializer()`. From each of those it follows declared nested serializer fields and `Meta.expandable_fields`. So it covers serializers that use `ExcludeFieldsSerializerMixin` anywhere in the app, not just ones you remember to test manually. Run `manage.py check` (CI should already do this) after adding or moving a serializer that uses this mixin.

## Fields Stay Visible in Model Info and Schema Metadata

`exclude_create_fields`/`exclude_update_fields` only affect the live `create`/`update`/`partial_update` request lifecycle of the serializer's own ViewSet. They do not remove the field from:

- The `/info/` meta-API's `model_fields`, generated using the info endpoint's own view in context (not the model's registered ViewSet's action) -- the excluded field is reported the same as any other field.
- The OpenAPI schema `drf-spectacular` generates for `get_schema_fields()` / `get_schema_expandable_fields()`.

If a client-rendered form needs to actually omit the field (rather than just have the server ignore submitted values for it), exclude it from that action's serializer's `Meta.fields` entirely -- which means moving to the full [read/write serializer split](split-read-write-serializers) instead of this mixin.

## Test Checklist

After adding `exclude_create_fields`/`exclude_update_fields`:

- A `create` request that submits a value for a field in `exclude_create_fields` saves successfully, with that field at its default/unset value, not the submitted one.
- An `update` and a `partial_update` request that each submit a value for a field in `exclude_update_fields` save successfully, with the existing value unchanged.
- `manage.py check` passes with no `vueda_core.E007` or `vueda_core.E008` errors.
- `manage.py spectacular` (or your CI's schema-generation step) succeeds for any viewset using this serializer.

## Troubleshooting

**`manage.py check` reports `vueda_core.E007` or `vueda_core.E008`.** A serializer that uses `ExcludeFieldsSerializerMixin` is nested as a field or listed in `expandable_fields`. The error names the serializer and the field. Remove the mixin from that serializer. To lock its fields for one action, see the per-action example under [Placements the System Check Rejects](#placements-the-system-check-rejects).

**An excluded field is writable outside a ViewSet request.** This is expected. Without a view in context, or with a view that has no `action`, the mixin excludes no fields. The exclusions apply only to `create`, `update`, and `partial_update` requests handled by a ViewSet.

**Submitted field value is silently ignored instead of erroring.** This is the mixin's designed behavior, not a bug -- the field is `read_only` for that action, so DRF drops it from `to_internal_value` rather than rejecting it. Add an explicit `validate()` check if the client-facing contract should be a `400` instead.

**Field still appears in `/info/` `model_fields` or the OpenAPI schema after excluding it.** Expected -- see [Fields Stay Visible in Model Info and Schema Metadata](#fields-stay-visible-in-model-info-and-schema-metadata) above. This mixin changes what a write request accepts, not what metadata describes.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.serializers.ExcludeFieldsSerializerMixin}
    - {@api py:function:vueda.core.serializers.ExcludeFieldsSerializerMixin.get_extra_kwargs}
    - {@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:function:vueda.info.registration.register}
    - {@api py:function:vueda.info.registration.register_serializer}
