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

The markings go through DRF's `extra_kwargs`, which reach only the fields the serializer builds from the model. A field declared on the serializer class ignores both lists and stays writable. List only generated fields.

Exclude only fields the database can leave empty: nullable columns, or columns with a default. A `create` that leaves a required column unset raises {@api ext:django:django.db.IntegrityError} on insert, and the client gets a `500`.

## Attach the Serializer to Its Viewset

The mixin reads the action from the view in the serializer context. That view is present only when the serializer is the {@api ext:drf:rest_framework.generics.GenericAPIView.serializer_class} of the routed viewset handling the request:

```python
from vueda.core.viewsets import VuedaViewSet


class TimesheetViewSet(VuedaViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
```

Registering the pair with {@api py:function:vueda.info.registration.register} works the same way. That is the {@term Canonical Registration} most models use.

Do not reach this serializer any other way. As a declared nested field on another serializer, or as an entry in another serializer's `Meta.expandable_fields`, it is built without a view in context. Schema generation (`manage.py spectacular`) and model info then fail with `KeyError: 'view'`. Put the exclusions on the routed serializer, and nest or expand a serializer without the mixin.

## Run the System Check

Run `manage.py check` after you add the mixin or move a serializer that uses it. {@api py:function:vueda.core.checks.check_exclude_fields_serializer_usage} starts from every routed viewset and every registered serializer. From each, it follows nested fields and `Meta.expandable_fields`. It reports:

- `vueda_core.E007` for a serializer with the mixin used as a nested field.
- `vueda_core.E008` for a serializer with the mixin named in any `Meta.expandable_fields` entry, even when it is also routed.
- `vueda_core.E009` for a serializer with the mixin registered with {@api py:function:vueda.info.registration.register_serializer}, which is a {@term Serializer-Only Registration}. [#162](https://github.com/arrai-innovations/vueda/issues/162) tracks support for that registration.

Each error names the serializer and, for `E007` and `E008`, the parent serializer and field.

## Reject Submitted Values Explicitly (Optional)

A request that sends a value for an excluded field still succeeds. DRF skips read-only fields when it reads the body, so no `400` is returned:

- On `create`, the field saves as its model default, for example `None` for a nullable foreign key.
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

The exclusions do not change {@term Model Info}. Model info describes the {@term Canonical Serializer} through its own endpoint's view, whose action matches neither list, so it reports excluded fields as writable. [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery.md#how-model-info-uses-the-registry) describes how model info reads the registered serializer.

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
- `manage.py check` reports no `vueda_core.E007`, `E008`, or `E009` errors.
- `manage.py spectacular`, or your schema generation step, succeeds.

## Troubleshooting

**`KeyError: 'view'` from `manage.py spectacular` or model info.** The serializer is nested or expanded somewhere. Run `manage.py check`: the `E007` or `E008` error names the parent serializer and field.

**`IntegrityError` on create.** A field in `exclude_create_fields` has a required database column. Give the column a default, make it nullable, or remove the field from the list.

**The OpenAPI schema marks the wrong fields read-only.** drf-spectacular describes the `create`, `update`, and `partial_update` request bodies with one shared component named after the serializer. Its read-only markings match only one of those actions.
