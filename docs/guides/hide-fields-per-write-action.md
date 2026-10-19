---
title: Lock Fields to Specific Write Actions
type: how-to
audience: integrator
status: draft
---

# Lock Fields to Specific Write Actions

{@api py:class:vueda.core.serializers.ExcludeFieldsSerializerMixin} makes named fields read-only for `create`, or for `update` and `partial_update`, on one serializer. Use it when the read and write field sets differ by only a few fields. For example, a timesheet's `supervisor` is set only after creation, and its `employee` cannot change once the timesheet exists.

When the write field set differs enough that you want separate serializer classes, follow [Split Read/Write Serializers Safely](split-read-write-serializers) instead.

## Declare the Exclusions

Put the mixin before {@api py:class:vueda.core.serializers.VuedaSerializer} in the class bases. List field names in `Meta.exclude_create_fields` and `Meta.exclude_update_fields`:

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

The mixin marks each `exclude_create_fields` entry read-only when the view's action is `create`. It marks each `exclude_update_fields` entry read-only when the action is `update` or `partial_update`, so one list covers `PUT` and `PATCH`. Any other action, including an {@term Extra Action}, gets no exclusions.

The mixin only adds read-only markings. A field that is read-only through `read_only_fields` or `extra_kwargs` stays read-only for every action. Excluded fields stay in `Meta.fields` and in every response.

The markings go through DRF's `extra_kwargs`, which reach only the fields that the serializer builds from the model. A field declared on the serializer class ignores both lists and stays writable. List only generated fields.

Exclude only fields that the database can leave empty: nullable columns, or columns with a default. A `create` that leaves a required column unset raises {@api ext:django:django.db.IntegrityError} on insert, and the client gets a `500`.

Use a serializer with this mixin only on a ViewSet, because only a ViewSet has an action. Any other DRF view is rejected by a system check and at request time. [Attach the Serializer to Its Viewset](#attach-the-serializer-to-its-viewset) explains why.

## Attach the Serializer to Its Viewset

The mixin reads the action from the view in the serializer context. Make the serializer the {@api ext:drf:rest_framework.generics.GenericAPIView.serializer_class} of the routed viewset that handles the request:

```python
from vueda.core.viewsets import VuedaViewSet


class TimesheetViewSet(VuedaViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
```

Registering the pair with {@api py:function:vueda.info.registration.register} works the same way. That is the {@term Canonical Registration} that most models use.

When the context has no view, the mixin excludes no fields. Every field keeps its declared writability. This covers code that builds the serializer without a context.

A {@term Serializer-Only Registration} made with {@api py:function:vueda.info.registration.register_serializer} is also allowed. The serializer has no ViewSet of its own, so it receives no `create` or `update` request for the exclusions to restrict. Model info builds it either without a view or with the model info endpoint's own ViewSet in context. That ViewSet's `retrieve` action matches neither exclusion list, so neither way locks a field.

### Views That Are Not ViewSets

Only a ViewSet has an action. A DRF generic view, such as `CreateAPIView` or `UpdateAPIView`, handles `create` and `update` requests without one, so the mixin cannot tell which exclusions apply. A write through such a view could set every field that the exclusions lock. So VUEDA does not allow the mixin on any view that is not a ViewSet:

- The mixin raises `ImproperlyConfigured` when it builds its fields with such a view in context. That happens on every request that builds the serializer, reads included. A request that never builds it, such as a `DELETE`, does not raise.
- The `vueda_core.E021` system check reports a routed view whose serializer uses the mixin, before any request reaches it. The error names each route of that view. [Run the System Check](#run-the-system-check) lists the uses that the check cannot see.

The rule also covers read-only views such as `RetrieveAPIView`. They cannot write, but one rule for every view that is not a ViewSet is simpler to follow than a rule that depends on which methods a view handles. For a generic view, use a serializer without the mixin. To lock a field there, pass `read_only=True` to the field, or give that view its own serializer class that lists the field in `Meta.read_only_fields`.

VUEDA's own `WhoIsView` is a `RetrieveAPIView`. It uses the serializer named by `REST_AUTH["USER_DETAILS_SERIALIZER"]`. If `E021` names `WhoIsView`, point that setting at a serializer without the mixin.

### Nested and Expanded Serializers

Do not nest this serializer as a declared field on another serializer, and do not name it in another serializer's `Meta.expandable_fields`. A nested or expanded serializer shares its parent's context, so its exclusions would follow the parent view's action rather than an action of its own. VUEDA does not support that behavior, and the system check rejects both placements. Put the exclusions on the routed serializer, and nest or expand a serializer without the mixin.

The parent's own exclusions cannot lock fields inside a nested serializer either. A nested serializer is a declared field, and declared fields ignore both lists. To lock a nested serializer's fields for one action, give that action its own serializer classes. Subclass the nested serializer and mark the fields read-only in its `Meta`. Then subclass the parent to nest that version, and select the parent subclass for the action with {@api py:class:vueda.core.viewsets.PerActionSerializerMixin}:

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

A `create` request can set each line's `product`. An `update` or `partial_update` request can change a line's `quantity` but not its `product`.

The read-only `product` also applies to a line that an update request adds. That line is saved without a `product`, which fails when the foreign key is required. If an update request can add lines, keep `product` writable and reject a changed `product` on an existing line in `validate()` instead. [Split Read/Write Serializers Safely](split-read-write-serializers) covers per-action serializer classes in more detail.

## Run the System Check

Run `manage.py check` after you add the mixin or move a serializer that uses it. {@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage} starts from every routed DRF view and every registered serializer. From each serializer, it follows nested fields and `Meta.expandable_fields`. It reports:

- `vueda_core.E007` for a serializer with the mixin used as a nested field.
- `vueda_core.E008` for a serializer with the mixin named in any `Meta.expandable_fields` entry, even when it is also routed.
- `vueda_core.E021` for a routed DRF view that is not a ViewSet and whose serializer uses the mixin.

Each error names the serializer. `E007` and `E008` also name the parent serializer and field, and `E021` names the view and each of its routes.

`E021` reads the `serializer_class` passed to `as_view()`. When none was passed, it reads the view's `serializer_class` attribute. It cannot see a serializer that a view picks in `get_serializer_class()`.

It also cannot see a serializer that another serializer builds while it renders a response. A {@api py:class:vueda.core.serializers.GenericForeignKeySerializer} field builds the {@term Canonical Serializer} of the object that it points to, with the parent's context. When that canonical serializer uses the mixin and the parent's view is not a ViewSet, the response fails with `ImproperlyConfigured`.

In both cases, the mixin's `ImproperlyConfigured` error is the only report, and it comes when a request builds that serializer.

## Reject Submitted Values Explicitly (Optional)

A request that sends a value for an excluded field still succeeds. DRF skips read-only fields when it reads the body, so no `400` is returned:

- On `create`, the new row stores the field's model default, for example `None` for a nullable foreign key.
- On `update` and `partial_update`, the field keeps its stored value.

To answer with a `400` instead, check the raw body in `validate()` and raise {@api py:class:vueda.core.exceptions.VuedaValidationError}:

```python
from vueda.core.exceptions import VuedaValidationError


class TimesheetSerializer(ExcludeFieldsSerializerMixin, VuedaSerializer):
    # Meta as above

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.context["view"].action == "create" and "supervisor" in self.initial_data:
            raise VuedaValidationError({"supervisor": ["Set the supervisor after the timesheet exists."]})
        return attrs
```

`validate()` runs only after every field passes field validation, so a request with other field errors reports those first.

## Hide the Field in Client Forms (Optional)

The exclusions do not change {@term Model Info}. Model info describes the {@term Canonical Serializer} through its own endpoint's view, whose action matches neither list, so model info reports excluded fields as writable. [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md#how-model-info-uses-the-registry) describes how model info reads the registered serializer.

The default create and update forms therefore render and submit excluded fields, and the server drops the values. To leave a field out of one form, set that view's `displayFields` and `submitFields` with {@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}:

```js
storeModelConfig().setConfig({ app: "timesheet", model: "timesheet" }, null, {
    create: {
        displayFields: ["period_start", "period_end", "employee"],
        submitFields: ["period_start", "period_end", "employee"],
    },
    update: {
        displayFields: ["period_start", "period_end", "supervisor"],
        submitFields: ["period_start", "period_end", "supervisor"],
    },
});
```

[Configure `list`/`read`/`create`/`update` Views](configure-crud-views.md#choose-each-views-field-lists) describes the {@term View Field Lists} and how each view uses them.

## Test Checklist

- A `create` that sends a value for each `exclude_create_fields` entry succeeds and saves the model default.
- An `update` and a `partial_update` that send a value for each `exclude_update_fields` entry succeed and keep the stored value.
- `manage.py check` reports no `vueda_core.E007`, `E008`, or `E021` errors.
- `manage.py spectacular`, or your schema generation step, succeeds.

## Troubleshooting

**`manage.py check` reports `vueda_core.E007` or `vueda_core.E008`.** The serializer is nested or expanded somewhere. The error names the parent serializer and field. Remove the mixin from the nested serializer. To lock its fields for one action, follow the example in [Nested and Expanded Serializers](#nested-and-expanded-serializers).

**`manage.py check` reports `vueda_core.E021`, or a request raises `ImproperlyConfigured`.** A DRF view that is not a ViewSet uses a serializer with the mixin. The view has no action, so the mixin cannot tell a `create` from an `update`, and a write could set the fields that the exclusions lock. Route the serializer through a ViewSet, or follow [Views That Are Not ViewSets](#views-that-are-not-viewsets) for other ways to lock the fields.

**An excluded field is writable outside a request.** This is expected. Without a view in context, the mixin excludes no fields. The exclusions apply only to `create`, `update`, and `partial_update` requests handled by a ViewSet.

**`IntegrityError` on create.** A field in `exclude_create_fields` has a required database column. Give the column a default, make it nullable, or remove the field from the list.

**The OpenAPI schema marks the wrong fields read-only.** drf-spectacular describes the `create`, `update`, and `partial_update` request bodies with one shared component named after the serializer. Its read-only markings match only one of those actions.
