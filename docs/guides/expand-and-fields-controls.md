---
title: Use Expand and Sparse Field Controls
type: how-to
audience: integrator
status: draft
---

# Use Expand and Sparse Field Controls

This guide covers how to configure {@term Expand} and sparse field controls so that `list`, `read`, `create`, and `update` payloads request only the fields and relations they need. The controls work across two boundaries: the server declares which fields and expansions are available and validates requests against those declarations, while the client configures which fields and expansions to request per view.

The guide assumes a working {@term CRUDL} surface is already in place. If the model is not yet registered and routable, start with [Create a CRUDL Surface](./create-crudl-surface). For the metadata contract that drives field and expand defaults, see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract). For broader view configuration (actions, filtering, sorting), see [Configure CRUDL Views](./configure-crud-views). If a `SerializerMethodField`'s generated metadata needs correcting, see [Customize Model Info Field and Expand Metadata](./customize-model-info-metadata).

## Goal and Preconditions

The objective is a model whose API responses include only the fields and expanded relations that each view actually needs, with server-side validation rejecting any request that asks for fields or expansions outside the declared surface exposed by {@term Model Info}.

Before you begin, ensure the following are in place:

The model has a registered serializer and viewset, and model-info returns complete metadata including `model_fields` and `model_expands`. The serializer has relations (ForeignKey, ManyToMany, or computed fields) that could benefit from inline expansion rather than separate lookups. You understand the performance tradeoff: the server derives `select_related`/`prefetch_related` automatically from what a request's `e` value expands, so an expanded relation costs a fixed number of additional joins or prefetch queries per request, not one per row (see [Query Cost of List and Retrieve Expansion](../core-concepts/field-and-expand-semantics#query-cost-of-list-and-retrieve-expansion)). Expanding still grows the response payload per row, so action-level restrictions may still be worth setting to bound payload size and expansion depth on `list` endpoints.

## Server Expand and Field Allow-Lists

Expand and field controls start at the serializer and viewset. The serializer declares what can be expanded. The viewset optionally restricts which expansions are permitted per action.

### Declaring expandable fields on the serializer

Define `expandable_fields` in the serializer's `Meta` class. Each entry maps a field name to a tuple of `(SerializerClass, options_dict)`. The options dict can specify sparse fields for the nested serializer, `many: True` for reverse relations, and other `rest_flex_fields` options:

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

Always merge the parent's `expandable_fields` at the end of the declaration, so any framework-level expansion `VuedaSerializer.Meta.expandable_fields` declares is preserved.

The `expandable_fields` declaration is the canonical source for `model_expands` in the metadata response. The client reads this metadata to determine its default expand configuration.

### Value formats for expandable_fields entries

Each entry in `expandable_fields` takes one of three forms.

A tuple of `(SerializerClass, options_dict)` — the most common form, already shown above:

```python
expandable_fields = {
    "category": (CategorySerializer, {}),
}
```

A bare class, when the expansion needs no `rest_flex_fields` options:

```python
expandable_fields = {
    "category": CategorySerializer,
}
```

A **lazy string** — a dotted import path to the class, resolved the first time the field is expanded. Use this to avoid circular imports when two serializer modules need to expand into each other. It can stand alone or be the first element of a tuple:

```python
expandable_fields = {
    "category": "myapp.serializers.CategorySerializer",
    "tags": ("myapp.serializers.TagSerializer", {"many": True}),
}
```

It must be a tuple, not a list:

```python
expandable_fields = {
    "category": (CategorySerializer, {}),  # correct
    "tags": [TagSerializer, {}],  # wrong -- rest_flex_fields does not accept lists here
}
```

A Django system check validates `expandable_fields` against these rules and reports a specific error when a declaration doesn't match. It runs whenever `manage.py check` runs, including during OpenAPI schema generation — but not under `manage.py shell` or the test suite, so a mistake there can still reach a serializer that is never registered or checked directly.

### Declaring generic foreign key expands

When a model has a `GenericForeignKey` field, use `GenericForeignKeySerializer` as the nested serializer. The key in `expandable_fields` must match the `GenericForeignKey` field name on the model:

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

Passing `"*"` via `FIELDS_PARAM` returns all fields from whatever serializer is registered for the concrete related model at representation time.

If you do not need any static field filtering, you can declare `GenericForeignKeySerializer` as a bare class without options:

```python
        expandable_fields = {
            "content_object": GenericForeignKeySerializer,
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
```

Generic foreign key expands are always read-only. `GenericForeignKeySerializer` resolves the canonical registered serializer for the concrete type of the related object at representation time. Every model that can appear through the `GenericForeignKey` must be registered via `register` or `register_serializer`; if a related object's type is not registered, the expand returns `null` for that object.

### Model-targeted field filtering for generic foreign key expands

When a `GenericForeignKey` can point to several model types that have different fields, you may want to apply different field filters to each type. Use model-targeted specifiers in `FIELDS_PARAM` or `OMIT_PARAM` to do this.

**Syntax:** `_<app_label>__<model_name>__<field_name>`

The leading `_` is the trigger. The three components — app label, lowercase model name, and field name — are separated by double underscores (`__`). Single underscores within any component are fine; double underscores within a component are not (Django prohibits them in field names and they are uncommon in app labels).

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
                {
                    settings.REST_FLEX_FIELDS["FIELDS_PARAM"]: ["*"],
                    settings.REST_FLEX_FIELDS["OMIT_PARAM"]: [
                        # Omit description only when the related object is a Distributor.
                        "_store__distributor__description",
                        # Omit these fields only when the related object is a PackingBox.
                        "_store__packingbox__carrying_weight",
                        "_store__packingbox__depth",
                        "_store__packingbox__height",
                        "_store__packingbox__width",
                    ],
                },
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
```

Model-targeted specifiers and plain field names can be mixed in the same list. Plain names and wildcards apply to every related model; model-targeted specifiers apply only to the model they name:

```python
settings.REST_FLEX_FIELDS["OMIT_PARAM"]: [
    "available_actions",                    # removed from every related model
    "_store__distributor__description",     # removed only from Distributor
]
```

At representation time, `GenericForeignKeySerializer` inspects the concrete type of the related object, resolves all model-targeted specifiers that match it, and passes only the resulting plain field names to the concrete serializer. Specifiers targeting a different model are silently dropped, so they have no effect on objects of other types.

::: tip
The app label and model name must match `instance._meta.app_label` and `instance._meta.model_name` exactly. `model_name` is the lowercase version of the Python class name (for example, `PackingBox` → `packingbox`).
:::

::: warning Registered serializer fields are the authoritative boundary
Field selection still operates within the fields declared on the model's registered serializer. If a field exists on the Django model but is not listed in the registered serializer's `Meta.fields`, requesting it via a model-targeted `FIELDS_PARAM` specifier (or a plain field name) will not return it — the registered serializer simply does not expose that field. This applies equally to the default syntax and to model-targeted specifiers.
:::

### Restricting expansions per action

By default, all declared expandable fields are permitted on both `list` and `retrieve` actions. To restrict which expansions are allowed per action, set `permit_list_expands` and `permit_retrieve_expands` on the viewset:

```python
from vueda.core.viewsets import VuedaViewSet
from .models import Widget
from .serializers import WidgetSerializer

class WidgetViewSet(VuedaViewSet):
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer
    permit_list_expands = ["category"]
    permit_retrieve_expands = ["category", "tags"]
```

In this example, `list` responses can expand `category` but not `tags` (keeping the `list` response payload smaller), while `retrieve` responses can expand both. A request that asks to expand `tags` on a `list` endpoint returns a 400 with a message identifying which expansions are permitted.

If `permit_list_expands` is not set, all declared expansions are allowed on `list`. The same applies to `permit_retrieve_expands` for `retrieve`. Setting either property to an empty list disables expansion entirely for that action.

## Client Default Field/Expand Strategy

The client configures which fields and expansions to request through `storeModelConfig`. Understanding how defaults are derived helps you override only what needs to change.

**Default `fetchFields` and `displayFields`** are all non-PK fields from the serializer's field list. These control what the client requests (via the `f` query parameter) and what it renders. The PK is omitted from the default list but is always injected into fetch requests by the view components, so it is always present in the response.

**Default `submitFields`** are all non-PK, writable fields from the serializer's field list. They select the values that create and update send in the request body. `displayFields` selects the fields those forms render.

**Default `expand`** is all expandable field names from model-info. This means that, by default, the client requests all declared expansions. If the server restricts expansions per action (via `permit_list_expands`), the default client `expand` may be broader than what the server allows on `list`, causing immediate 400 errors. In this case, override `expand` in the client config to match the server's per-action restrictions, or use view-specific overrides:

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

storeModelConfig().setConfig(
    { app: "myapp", model: "widget" },
    // Generic: expand both on detail views
    { expand: ["category", "tags"] },
    // View-specific: only expand category on list
    { list: { expand: ["category"] } },
);
```

When expansion is configured, `storeModelConfig` flattens expanded sub-fields into `fieldDetails` using `expand.subfield` keys. For example, if `category` is expanded and has `name` and `description` fields, the config will contain entries at `fieldDetails["category.name"]` and `fieldDetails["category.description"]`. This allows display and field configuration to target expanded sub-fields directly. If `expand` is overridden to `[]`, no expansion flattening occurs and `expand.subfield` keys will not be present in `fieldDetails`.

## List and Detail Request Param Wiring

The client's view components translate config into query parameters on each request. Understanding this translation helps diagnose unexpected request shapes.

**`ViewList`** sends `f` (fields) and `e` (expand) query parameters on every list request. The `f` parameter contains the resolved `fetchFields` with the PK prepended if not already present. The `e` parameter contains the resolved `expand` list. Filter values, sort order, and pagination parameters are sent alongside these.

**`DetailView`** (used by `ViewRead` and `ViewUpdate`) sends `f` and `e` on retrieve requests. The `f` parameter includes `fetchFields` plus `available_actions` (so the view can render action buttons based on object-level permissions). The `e` parameter contains the resolved `expand` list.

**`ViewCreate`** and **`ViewUpdate`** send only the `submitFields` values in the request body. On the save request, `f` contains the resolved `fetchFields` plus the PK, so the save response carries the fields a retrieval would. `e` contains the configured expansions whose form value is set.

The CRUDL helper utilities (`objectCrud`) serialize `f` and `e` arrays into query strings and handle 400 responses by wrapping them as `FormValidationError` instances for form-context ingestion. This means that a 400 from an invalid expand or field request will surface as a form-level validation error rather than a generic fetch error.

## Validation and Error-Handling Checks

The server validates `f` and `e` query parameters on both `list` and `retrieve` actions. Invalid parameters are rejected before the query executes, so no partial results are returned.

**Invalid `f` values** produce a 400 response with field-keyed errors. Each invalid field name maps to an error message listing the valid field names. The valid set includes serializer fields plus any flex-resolved fields.

**Invalid `e` values** produce a 400 response. The error message identifies the invalid expand names and lists which expansions are permitted. The permitted set is action-sensitive when `permit_list_expands` or `permit_retrieve_expands` is configured: if no expansions are permitted for the action, the error message says so explicitly.

**Unknown query parameters** produce a 400 response with field-keyed validation errors listing the valid filters. On `list`, this covers any parameter that is not a filter, pagination, ordering, search, expand, or field selector. On `retrieve`, only expand and field selectors (`e`, `f`, `om`) are valid; filter, pagination, ordering, and search parameters are rejected there too, since a detail route already identifies its object by primary key. This is consistent with the flex-field and serializer validation behavior.

**Expanded nested serializers** omit `available_actions` by default in their response payloads. This means an expanded relation will include its field data but not its per-object action availability. If the client needs action information for an expanded object, a separate retrieve request is required.

## Verification Checklist

With expand and field controls configured, verify the surface end-to-end:

- `list` requests include only the configured `fetchFields` (plus PK) in the `f` parameter and the configured `expand` list in the `e` parameter. Verify by inspecting the network request.
- `list` responses include expanded relation data for permitted expansions. For expansions not in `permit_list_expands`, the response returns the FK value (not the expanded object).
- `retrieve` requests include `fetchFields`, `available_actions`, and the configured `expand` list. Expanded data is present for permitted expansions.
- Requesting an expansion that is not in `permit_list_expands` on a `list` endpoint returns a 400 with a message identifying permitted expansions.
- Requesting an unknown field name in `f` returns a 400 with a message listing valid field names.
- Overriding `expand` to `[]` in client config disables expansion. No `expand.subfield` keys appear in `fieldDetails`, and expanded relation columns or detail fields are absent from the rendered UI.
- View-specific expand overrides (for example, `list` with fewer expansions than `read`) produce different request parameters per view.
- Expanded sub-fields are targetable in `displayFields` and `fieldDetails` using `expand.subfield` naming (e.g., `category.name`).

## Troubleshooting

**`list` endpoint returns 400 on every request.** The most common cause is a mismatch between the client's default `expand` (all declared expansions) and the server's `permit_list_expands` (a subset). The client is requesting expansions that the server does not allow on `list`. Override the `expand` config for the `list` view to match the server's permitted list.

**Expanded field columns show missing values.** `displayFields` includes an `expand.subfield` key, but the corresponding expansion is not in the `expand` config (or was removed by a view-specific override). Without the expansion, the `expand.subfield` keys are not populated in `fieldDetails`, and the values are never fetched.

**Expanded sub-field is not configurable in `fieldDetails`.** Expansion flattening only occurs when the `expand` config is non-empty. If `expand` is overridden to `[]`, `storeModelConfig` does not merge expansion field details, and `expand.subfield` keys will not exist. Set `expand` to include the relevant relation name to enable flattening.

**400 error surfaces as a form validation error.** This is expected behavior. The CRUDL helpers (`objectCrud`) wrap 400 responses as `FormValidationError` instances so they can be ingested by the form context. A 400 from invalid `f` or `e` parameters will appear in the form's error state rather than as a toast or console error.

**Invalid expand on a nested write produces a type error.** When a request includes both invalid expand parameters and nested write payloads, the type error from payload parsing can surface before the expand validation has a chance to aggregate all errors. The root cause is the invalid expand; fix that first, and the type error will resolve.

**`retrieve` response missing `available_actions`.** If `fetchFields` is overridden and does not include `available_actions`, the detail view will not have action availability information for the object. The built-in `DetailView` component adds `available_actions` to its fetch field list automatically, but custom components that bypass `DetailView` must include it explicitly.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}
    - {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param}
    - {@api py:class:vueda.core.viewsets.FlexFieldsMixin}
    - {@api py:function:vueda.core.viewsets.FlexFieldsMixin.get_serializer_context}
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:class:vueda.core.serializers.GenericForeignKeySerializer}
    - {@api py:function:vueda.core.serializers.NoExtraFieldsSerializerMixin.validate}
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_expand_model_info}
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_field_model_info}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda/use/useModelConfig}
    - {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}
    - {@api js:module:@arrai-innovations/vueda/utils/objectCrud}
    - {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectRetrieve}
    - {@api js:property:@arrai-innovations/vueda/utils/constants#FIELDS_PARAM}
    - {@api js:property:@arrai-innovations/vueda/utils/constants#EXPAND_PARAM}
- Vue.js Components:
    - {@api vue:component:ViewList}
    - {@api vue:component:DetailView}
