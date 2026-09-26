---
title: Customize Model Info Field and Expand Metadata
type: how-to
audience: integrator
status: draft
---

# Customize Model Info Field and Expand Metadata

This guide changes the `model_fields` and `model_expands` entries that {@term Model Info} reports for a serializer. VUEDA generates both from the serializer's declarations. The hooks below let you correct an entry that does not match what the field returns.

The hooks work on the server's wire keys, such as `type_serializer` and `read_only`. For each section's keys and how the client renames them, see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract.md).

## When to Override

A `SerializerMethodField` has no model column and no fixed field class to inspect. Its generated entry always has `type_serializer: "SerializerMethodField"`, `type_db` and `type_model` set to `null`, `read_only: true`, and `required: false`. Override the hook when you want the entry to name the type that `get_<field>()` returns.

The same applies to a field whose `source` names a `@property` or an annotated value instead of a model field. Its `type_db` and `type_model` are `null`, and the `vueda_info.W001` system check warns about it (see the metadata contract page for the full rule). Filling in `type_db` or `type_model` through the hook also clears that warning. The hook never clears a warning about a model's `<field>_lookup_expression`; fix the expression instead.

## Correct a Field Entry

Override `get_field_model_info` on the serializer. It receives the generated metadata dict, keyed by field name, and must return a dict in the same shape.

1. Call `super().get_field_model_info(fields)` first. The base implementation applies `field_display_choices`, and `VuedaSerializer` also fills in its workflow state fields.
2. Change only the keys that are wrong. The generated entry already has `label`, `read_only`, `required`, and `hidden`.
3. Return the dict.

```python
class CustomerSerializer(VuedaSerializer):
    number_of_ordered_products = serializers.SerializerMethodField()

    class Meta(VuedaSerializer.Meta):
        model = Customer
        fields = ["id", "user", "number_of_ordered_products"] + VuedaSerializer.Meta.fields

    def get_number_of_ordered_products(self, obj):
        return obj.orders.count()

    def get_field_model_info(self, fields):
        fields = super().get_field_model_info(fields)
        fields["number_of_ordered_products"]["type_serializer"] = "IntegerField"
        return fields
```

`type_serializer` takes a DRF field class name, such as `CharField` or `IntegerField`. The [DRF serializer fields reference](https://www.django-rest-framework.org/api-guide/fields/) lists them. The client picks a widget from `type_serializer`, then `type_model`; [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui.md) explains that lookup.

For a real example, `VuedaSerializer.get_field_model_info` sets `type_db` and `type_model` to `CharField` for `workflow_state_code` and `workflow_state_name`. Both fields read through a `@property` on workflow models.

Write the override so it uses only the `fields` argument. `/info/` calls the hook on a serializer instance created with no context, so `self.context` is empty. On a serializer that uses `ExcludeFieldsSerializerMixin`, reading `self.fields` there raises `KeyError: 'view'` ([#162](https://github.com/arrai-innovations/vueda/issues/162)).

To correct a field inside an expand, override `get_field_model_info` on the expanded serializer. VUEDA applies that serializer's own hook when it builds the expand's child fields.

## Add Display-Only Value Labels

Set `field_display_choices` when a stored value needs a read-only label but should stay an ordinary editable field. For example, a boolean can keep its toggle widget and still show domain labels in read-only views:

```python
class SubmissionSerializer(VuedaSerializer):
    field_display_choices = {
        "submitted": {
            True: "Submitted",
            False: "-",
            None: "Unknown",
        },
    }

    class Meta(VuedaSerializer.Meta):
        model = Submission
        fields = ["id", "submitted"] + VuedaSerializer.Meta.fields
```

The field's entry gains `display_choices`, a list of `{"label": ..., "value": ...}` objects. The client uses these labels only when it shows the field read-only. They do not change serializer validation, model choices, or the editable widget.

If you also override `get_field_model_info`, call `super()` in it, or the labels are not applied.

## Correct an Expand Descriptor

Override `get_expand_model_info` when a `Meta.expandable_fields` entry is a `SerializerMethodField`. It receives the generated list of descriptors, one per entry, and must return a list in the same shape. The default returns the list unchanged, so `super()` is not needed.

A method-field entry has no related serializer, so its generated descriptor has only `name`, `read_only: false`, and `many: false`:

```python
class CustomerSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Customer
        expandable_fields = {
            "recent_orders": serializers.SerializerMethodField,
        }

    def get_recent_orders(self, obj):
        return OrderSerializer(obj.orders.recent(), many=True, context=self.context).data

    def get_expand_model_info(self, expands):
        for expand in expands:
            if expand["name"] == "recent_orders":
                expand["many"] = True
                expand["read_only"] = True
        return expands
```

The client builds an expand's child form fields from the descriptor's `f` key, and relation choices from its `app_label` and `model`. A method-field descriptor has none of these, so the client renders no child fields for it.

An entry backed by a serializer class with a `Meta.model` already gets `app_label`, `model`, and child field metadata under `f`, with no override.

## Check the Result

1. Request the corrected sections as a signed-in user: `GET /routes/vueda.info/model_info/<app_label>/<model>/?e=model_fields,model_expands`. The endpoint is {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}.
2. Run `python manage.py check` and confirm no `vueda_info.W001` warning remains for the field.

The same hooks feed the OpenAPI schema. The schema lists only field and expand names, as the allowed values of the `f` and `e` query parameters. A type correction does not appear there; an entry that a hook adds or removes does.

## Serializers That Do Not Inherit VuedaSerializer

Registration requires only a `Meta.model` on the canonical serializer; see [Canonical Registration and Discovery](../core-concepts/canonical-registration-and-discovery.md). {@api py:class:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin} defines both hooks and the expand descriptor generation, and `VuedaSerializer` includes it.

A plain `ModelSerializer` without that mixin still gets generated `model_fields`. Its `model_expands` is an empty list, even when it declares `Meta.expandable_fields`.

To add the hooks and `model_expands`, inherit the mixin together with `FlexFieldsSerializerMixin` from `rest_flex_fields`:

```python
from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers
from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin


class PlainSerializer(VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = SomeModel
        expandable_fields = {
            "related": (RelatedSerializer, {}),
        }

    def get_field_model_info(self, fields):
        fields = super().get_field_model_info(fields)
        ...
        return fields
```

Keep the mixin first. `FlexFieldsSerializerMixin` serves the `e` query parameter and resolves serializers named by a dotted string in `expandable_fields`. Without it, `model_expands` lists expands the endpoint cannot return. VUEDA's workflow `StateSerializer` uses the same three bases.
