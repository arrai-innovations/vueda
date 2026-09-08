---
title: Customize Model Info Field and Expand Metadata
type: how-to
audience: integrator
status: draft
---

# Customize Model Info Field and Expand Metadata

This guide covers overriding the `model_fields` and `model_expands` metadata that {@term Model Info} generates for a serializer, most commonly to describe a `SerializerMethodField` accurately. VUEDA derives this metadata automatically from your serializer's field declarations, but a `SerializerMethodField` has no model column and no fixed DRF field class to inspect, so the generated metadata for it is only a best-effort guess.

For the full metadata contract this guide customizes, see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract).

## When You Need This

A `SerializerMethodField` you declare directly on a serializer, or list in `Meta.expandable_fields`, has no model column and no fixed field type backing it. VUEDA cannot infer whether `get_<field>()` returns a string, a number, a date, or a nested object, so the generated `model_fields`/`model_expands` entry for it may report a generic or misleading type.

The same hook also applies to a field that isn't a `SerializerMethodField` but still isn't backed by a concrete model field — for example, a field whose `source` names a `@property` or an annotated value rather than a real column. `type_db`/`type_model` are `null` for that field too, and the `vueda_info.W001` system check may flag it if its `source` makes partial progress toward a model field before breaking (see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract#failure-modes-and-recovery)). `get_field_model_info` is the sanctioned way to describe such a field's real shape, the same as for a `SerializerMethodField`.

This only ever applies to a field's `source=`, never to a model's `<field>_lookup_expression`. A `lookup_expression` is fed directly to `models.F()` for queryset annotation and to Django admin's `lookup_field()`, so it must always name a real database path; `vueda_info.W001` flags any `lookup_expression` that fails to resolve, and the fix is to correct the expression itself, not to describe it away with `get_field_model_info`.

Override the hooks below when the generated metadata for one of your method fields (or another non-model-backed field) does not match what the field actually returns.

## Correcting a Method Field's Type (`model_fields`)

Override `get_field_model_info` on your serializer to adjust the metadata for one or more of your fields. It receives the generated field metadata dict, keyed by field name, and must return a dict in the same shape:

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
        fields["number_of_ordered_products"] = {
            "label": "Number Of Ordered Products",
            "type_db": None,
            "type_model": None,
            "type_serializer": "IntegerField",
            "many": False,
            "read_only": True,
            "required": False,
            "choices": False,
            "hidden": False,
        }
        return fields
```

You only need to correct the keys that are wrong. The generated entry already carries reasonable defaults for `label`, `read_only`, `required`, and `hidden`, so a targeted update (for example, just `type_serializer`) is usually enough; replacing the whole entry, as shown above, is also fine when you want to be explicit.

`type_serializer` is a DRF field class name, such as `CharField` or `IntegerField` above. See the [DRF serializer fields reference](https://www.django-rest-framework.org/api-guide/fields/) for the full list of field classes and which one best matches what your method field returns.

There is no requirement to override this hook. If you don't, the field still appears in `model_fields` with its best-effort generated metadata.

Call `super().get_field_model_info(fields)` when overriding this hook unless you intentionally want to skip base metadata additions such as `field_display_choices`.

## Display-Only Value Labels

Use `field_display_choices` when a stored value needs a read-only label but should not become an editable choice field. This is useful for booleans that should still edit as toggles but display as domain labels in read-only views:

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

The generated `model_fields.submitted.display_choices` value is a list of `{"label": ..., "value": ...}` objects. These labels are display metadata only. They do not change serializer validation, model choices, or the editable widget selected by the client.

## Adding or Correcting an Expand Descriptor (`model_expands`)

Override `get_expand_model_info` when a `Meta.expandable_fields` entry is backed by a `SerializerMethodField` rather than a real related serializer, so it has no model to derive field metadata from automatically. It receives the generated list of expand descriptors (one per `Meta.expandable_fields` entry) and must return a list in the same shape:

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

As with `get_field_model_info`, this is optional. An expand backed by a real related serializer class (the common case) already gets full field metadata without any override.

## These Hooks Also Drive the OpenAPI Schema

`get_expand_model_info` and `get_field_model_info` are not only for the `/info/` meta-API. `get_schema_expandable_fields()` (which documents the `expand` query parameter's valid values) and `get_schema_fields()` (which documents the `fields` query parameter's valid values) build on the same generation and both hooks, then reduce the result to what an OpenAPI schema needs: dropping the `many`/`read_only`/`hidden` flags, display choices, help text, and constraint details, keeping only `label`, `type`, `required`, and `choices`. If you already override these hooks to describe a `SerializerMethodField` for `/info/`, that correction shows up in the generated OpenAPI schema too, with no separate override required.

## Non-`VuedaSerializer` Serializers

{@term Canonical Registration} only requires a `Meta.model` on the canonical serializer; it does not have to inherit `VuedaSerializer`. Both hooks above, along with the expand-descriptor generation they customize, are defined on `VuedaExpandableFieldsSerializerMixin`. `VuedaSerializer` already includes this mixin, so its subclasses get all of it for free. If you register a plain `rest_framework.serializers.ModelSerializer` instead, its `model_fields` are still generated normally, but `model_expands` is an empty list even when `Meta.expandable_fields` is declared, and neither hook is available to override, because none of that comes from the base DRF class.

To get `model_expands`, `get_expand_model_info`, and `get_field_model_info` on a serializer that otherwise doesn't inherit `VuedaSerializer`, inherit `VuedaExpandableFieldsSerializerMixin` directly:

```python
class PlainSerializer(VuedaExpandableFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = SomeModel
        expandable_fields = {
            "related": (RelatedSerializer, {}),
        }

    def get_field_model_info(self, fields):
        ...

    def get_expand_model_info(self, expands):
        ...
```

## Relevant Implementation Surface

- Python:
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_field_model_info}
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_expand_model_info}
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_schema_expandable_fields}
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_schema_fields}
    - {@api py:class:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
