---
title: Use Expand and Sparse Field Controls
type: how-to
audience: integrator
status: draft
---

# Use Expand and Sparse Field Controls

This guide declares which relations a model's API can {@term Expand}, permits them per action, and matches the client's requests to those permits. It also covers {@term Sparse Fields} on expanded objects.

It assumes a working {@term CRUD} surface. If the model is not registered and routed yet, start with [Create a CRUD Surface](./create-crud-surface). [Field and Expand Semantics](../core-concepts/field-and-expand-semantics) describes the rules behind these steps, including how the client derives its default field lists and what each view sends in `f` and `e`.

## Declare expandable fields

List each relation the client may expand in the serializer's `Meta.expandable_fields`. Merge the parent's entries at the end, so expands that {@api py:class:vueda.core.serializers.VuedaSerializer} declares are kept:

```python
from vueda.core.serializers import VuedaSerializer
from .models import Widget
from .serializers import CategorySerializer, TagSerializer

class WidgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Widget
        fields = [
            "id", "name", "status", "category", "tags",
        ] + VuedaSerializer.Meta.fields

        expandable_fields = {
            "category": (CategorySerializer, {}),
            "tags": (TagSerializer, {"many": True}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
```

The {@term Canonical Serializer}'s `expandable_fields` become the expands section of {@term Model Info}. The client expands every name listed there by default.

Each entry takes one of three forms:

- A tuple of `(SerializerClass, options)`. The options dict holds [`rest_flex_fields`]{@api ext:drf-flex-fields:rest_flex_fields.FlexFieldsSerializerMixin} options, such as `"many": True` for a to-many relation.
- A bare serializer class, when the expand needs no options.
- A dotted import path string, alone or as the tuple's first element. It is resolved the first time the field expands, which avoids circular imports between serializer modules.

```python
expandable_fields = {
    "category": CategorySerializer,
    "tags": ("myapp.serializers.TagSerializer", {"many": True}),
}
```

The value must be a tuple. A list such as `[TagSerializer, {}]` fails the system check `vueda_core.E001`. The check [`check_expandable_fields_configuration`]{@api py:function:vueda.core.checks.check_expandable_fields_configuration} runs with Django's system checks, for example on `manage.py check`. It covers each routed viewset's `serializer_class`, each registered serializer, and every serializer they reach through nested fields and `expandable_fields`.

Each expanded relation adds one join or prefetch query per request and adds its data to every row. [Field and Expand Semantics](../core-concepts/field-and-expand-semantics) describes the query plan.

## Expand a generic foreign key

For a {@api ext:django:django.contrib.contenttypes.fields.GenericForeignKey}, declare {@api py:class:vueda.core.serializers.GenericForeignKeySerializer} as the expand. The key must be the `GenericForeignKey` field's name on the model:

```python
from django.conf import settings
from vueda.core.serializers import GenericForeignKeySerializer, VuedaSerializer

class NoteSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Note
        fields = ["id", "content_type", "object_id", "text"] + VuedaSerializer.Meta.fields

        expandable_fields = {
            "content_object": (
                GenericForeignKeySerializer,
                {settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["*"]},
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
```

`"*"` in the fields option returns every field of the related object's serializer. Without static field options, declare the bare class: `"content_object": GenericForeignKeySerializer`.

At representation time, `GenericForeignKeySerializer` serializes the related object with the serializer registered for its model. Register every model the relation can point to, with [`register`]{@api py:function:vueda.info.registration.register} or [`register_serializer`]{@api py:function:vueda.info.registration.register_serializer}. An object whose model is not registered expands to `null`. The output always carries `app_label`, `model`, and `formatted_name`.

A generic foreign key expand is read-only. The server does not check `f` entries under it, such as `content_object.name`, because the related model is known only per object.

### Filter fields per related model

To apply a field filter to one related model only, write a model-targeted specifier in the fields or omit option:

```text
_<app_label>__<model_name>__<field_name>
```

The leading `_` marks the specifier, and double underscores separate its three parts. Single underscores inside a part are allowed. `<model_name>` is the lowercase class name, as in `instance._meta.model_name` (`PackingBox` becomes `packingbox`).

```python
expandable_fields = {
    "content_object": (
        GenericForeignKeySerializer,
        {
            settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["*"],
            settings.REST_FLEX_FIELDS["OMIT_PARAM"]: [
                # Removed from every related model.
                "available_actions",
                # Removed only when the related object is a Distributor.
                "_store__distributor__description",
                # Removed only when the related object is a PackingBox.
                "_store__packingbox__carrying_weight",
                "_store__packingbox__depth",
            ],
        },
    ),
}
```

Plain names and wildcards apply to every related model. For each object, the serializer keeps the specifiers that name the object's model as plain field names and drops the others.

Field selection stays within the registered serializer's `Meta.fields`. A model field that serializer does not list is never returned, whether a plain name or a specifier requests it.

## Permit expands on `list`

A `list` request may expand only the names in the viewset's `permit_list_expands`, which is empty until you set it. The client sends every declared expand on list requests by default. So a model with declared expands fails every list request with a `400` until the two sides match. Each rejected name gets the message `Invalid expands. No expands are permitted.`

1. Set `permit_list_expands` on the viewset to the expands the list may use:

    ```python
    from vueda.core.viewsets import VuedaViewSet
    from .models import Widget
    from .serializers import WidgetSerializer

    class WidgetViewSet(VuedaViewSet):
        queryset = Widget.objects.all()
        serializer_class = WidgetSerializer
        permit_list_expands = ["category"]
    ```

2. If the permit list is narrower than the declared expands, set the client's `list` view to request only those. Pass the override as the per-view layer of [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}:

    ```js
    import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

    storeModelConfig().setConfig(
        { app: "myapp", model: "widget" },
        // Every view expands both.
        { expand: ["category", "tags"] },
        // The list view expands only category.
        { list: { expand: ["category"] } },
    );
    ```

    {@api vue:component:ViewList} sends the resolved [`expand`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.expand} as `e`. An empty `expand` sends no `e`, so the list expands nothing and needs no permit.

With a permit list set, a request for an expand it does not name gets a `400` whose message lists the permitted expands. The `*` wildcard expands every permitted name.

## Narrow expands on other actions

Every other action allows every declared expand until the viewset sets `permit_<action>_expands` for it. [`FlexFieldsMixin`]{@api py:class:vueda.core.viewsets.FlexFieldsMixin} reads the attribute for the current action, so `permit_retrieve_expands` narrows detail requests:

```python
class WidgetViewSet(VuedaViewSet):
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer
    permit_list_expands = ["category"]
    permit_retrieve_expands = ["category", "tags"]
```

An empty list permits no expands on that action. The `read` and `update` views fetch their object with `retrieve`, so match their `expand` to `permit_retrieve_expands` the same way as the `list` view. {@term Action-Scoped Expand} names this per-action restriction.

## Permit nested expands

A dotted path in `e`, such as `customer.user`, expands `customer` and then its `user`. When the action has a permit list, list each dotted path exactly as the client sends it:

```python
class CartViewSet(VuedaViewSet):
    ...
    permit_list_expands = ["cart_items", "customer", "customer.user"]
```

A dotted path the permit list does not name gets a `400`, even when its first part is permitted. A dotted entry does not permit its first part alone: `e=customer` still needs `"customer"` in the list. An action with no permit list accepts any dotted path that follows declared expands, up to the depth that `MAXIMUM_EXPANSION_DEPTH` sets (4 by default).

## Select fields of an expanded object

To narrow an expanded object, name its fields in `f` as `<expand>.<field>`, as in `f=id,category.id,category.name`. Include the related primary key if you need it, because VUEDA adds no field you did not name.

In the client, put the same dotted names in the view's [`fetchFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fetchFields}. When `expand` names a relation, [`storeModelConfig`]{@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig} adds a [`fieldDetails`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fieldDetails} entry for each of its sub-fields, keyed like `category.name`. Name those keys in `displayFields` to show sub-field columns.

An expanded object never carries {@term Available Actions}, and `f=category.available_actions` gets a `400`. Retrieve the related object to read its actions.

## Check the requests

`list` and `retrieve` requests reject an `f` or `e` name the endpoint does not offer. Each invalid name is a key in the `400` body, and its message lists the valid names. Each entry in these `f` and `e` errors is an object with `message` and `code`. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics#query-namespace-and-validation-boundary) describes how unknown query keys are rejected, and [Error and Validation Contract](../core-concepts/error-and-validation-contract) describes error bodies.

Create and update requests do not check `f`. An unknown name there is ignored, and the response carries only the known fields.

Confirm the setup in the browser's network panel:

- The `list` request's `e` holds only names in `permit_list_expands`, and the response holds expanded objects for them.
- The detail request's `e` holds only names its action permits.
- Adding an undeclared name to `e` or `f` returns a `400` that names it.
- A per-view `expand` override changes `e` for that view only.

## Troubleshooting

**Every `list` request returns `400` with "Invalid expands".** The client's list `expand` names something `permit_list_expands` does not. By default the client sends every declared expand, and the permit list starts empty. Set `permit_list_expands`, narrow the list view's `expand`, or both.

**A `400` from `f` or `e` does not reach a form.** A list or detail view that fails its request raises a {@api js:class:@arrai-innovations/vueda/utils/errors#FetchError}. Only a create, update, or patch `400` becomes a {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}. Fix the view's `expand` or `fetchFields`, or the viewset's permit list.

**Expanded field columns show no values.** `displayFields` names an `expand.subfield` key, but the view's `expand` does not name that relation. Without the expand, the client builds no `fieldDetails` entry for the key, and the server returns the related primary key. Add the relation to `expand`.

**A write with a nested object returns a type error on the relation.** The request's `e` omits the relation, so the server reads the relation as a primary key. Add the relation to `e`, and the nested object is accepted. A misspelled or unpermitted `e` name answers a `400` that names it before the body is validated.

**A custom detail component has no action availability.** {@api js:function:@arrai-innovations/vueda/use/useDetailView#useDetailView} always adds `available_actions` to `f`, and {@api vue:component:DetailView}, `ViewRead`, and `ViewUpdate` fetch through it. Code that fetches with {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectRetrieve} directly must add it to `f`.
