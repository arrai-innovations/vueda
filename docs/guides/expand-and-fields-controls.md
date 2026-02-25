---
title: Use Expand and Sparse Field Controls
type: how-to
audience: implementor
status: draft
---

# Use Expand and Sparse Field Controls

This guide covers how to configure expand and sparse field controls so that `list`, `read`, `create`, and `update` payloads request only the fields and relations they need. The controls work across two boundaries: the server declares which fields and expansions are available and validates requests against those declarations, while the client configures which fields and expansions to request per view.

The guide assumes a working CRUDL surface is already in place. If the model is not yet registered and routable, start with [Create a CRUDL Surface](./create-crudl-surface). For the metadata contract that drives field and expand defaults, see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract). For broader view configuration (actions, filtering, sorting), see [Configure CRUD Views](./configure-crud-views).

## Goal and Preconditions

The objective is a model whose API responses include only the fields and expanded relations that each view actually needs, with server-side validation rejecting any request that asks for fields or expansions outside the declared surface.

Before you begin, ensure the following are in place:

The model has a registered serializer and viewset, and model-info returns complete metadata including `model_fields` and `model_expands`. The serializer has relations (ForeignKey, ManyToMany, or computed fields) that could benefit from inline expansion rather than separate lookups. You understand the performance tradeoff: expanding relations on `list` endpoints can multiply query cost, so action-level restrictions may be needed.

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

Always merge the parent's `expandable_fields` at the end of the declaration. `VuedaSerializer.Meta.expandable_fields` (and `VuedaHistorySerializer.Meta.expandable_fields`) may include framework-level expansions (such as history entries) that should be preserved.

The `expandable_fields` declaration is the canonical source for `model_expands` in the metadata response. The client reads this metadata to determine its default expand configuration.

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

In this example, `list` responses can expand `category` but not `tags` (avoiding expensive many-to-many joins on list queries), while `retrieve` responses can expand both. A request that asks to expand `tags` on a `list` endpoint returns a 400 with a message identifying which expansions are permitted.

If `permit_list_expands` is not set, all declared expansions are allowed on `list`. The same applies to `permit_retrieve_expands` for `retrieve`. Setting either property to an empty list disables expansion entirely for that action.

## Client Default Field/Expand Strategy

The client configures which fields and expansions to request through `storeModelConfig`. Understanding how defaults are derived helps you override only what needs to change.

**Default `fetchFields` and `displayFields`** are all non-PK fields from the serializer's field list. These control what the client requests (via the `f` query parameter) and what it renders. The PK is omitted from the default list but is always injected into fetch requests by the view components, so it is always present in the response.

**Default `submitFields`** are all non-PK fields from the serializer's field list. These control which fields appear in create and update forms and are submitted to the server.

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

When expansion is configured, `storeModelConfig` flattens expanded sub-fields into `fieldDetails` using `expand__subfield` keys. For example, if `category` is expanded and has `name` and `description` fields, the config will contain entries at `fieldDetails["category__name"]` and `fieldDetails["category__description"]`. This allows display and field configuration to target expanded sub-fields directly. If `expand` is overridden to `[]`, no expansion flattening occurs and `expand__subfield` keys will not be present in `fieldDetails`.

## List and Detail Request Param Wiring

The client's view components translate config into query parameters on each request. Understanding this translation helps diagnose unexpected request shapes.

**`ViewList`** sends `f` (fields) and `e` (expand) query parameters on every list request. The `f` parameter contains the resolved `fetchFields` with the PK prepended if not already present. The `e` parameter contains the resolved `expand` list. Filter values, sort order, and pagination parameters are sent alongside these.

**`DetailView`** (used by `ViewRead` and `ViewUpdate`) sends `f` and `e` on retrieve requests. The `f` parameter includes `fetchFields` plus `available_actions` (so the view can render action buttons based on object-level permissions). The `e` parameter contains the resolved `expand` list.

**`ViewCreate`** and **`ViewUpdate`** use `submitFields` for the request payload. They do not send `f` or `e` on submission, because create and update are write operations that do not control response field selection through query parameters.

The CRUD helper utilities (`objectCrud`) serialize `f` and `e` arrays into query strings and handle 400 responses by wrapping them as `FormValidationError` instances for form-context ingestion. This means that a 400 from an invalid expand or field request will surface as a form-level validation error rather than a generic fetch error.

## Validation and Error-Handling Checks

The server validates `f` and `e` query parameters on both `list` and `retrieve` actions. Invalid parameters are rejected before the query executes, so no partial results are returned.

**Invalid `f` values** produce a 400 response with field-keyed errors. Each invalid field name maps to an error message listing the valid field names. The valid set includes serializer fields plus any flex-resolved fields.

**Invalid `e` values** produce a 400 response. The error message identifies the invalid expand names and lists which expansions are permitted. The permitted set is action-sensitive when `permit_list_expands` or `permit_retrieve_expands` is configured: if no expansions are permitted for the action, the error message says so explicitly.

**Unknown `list` query parameters** (parameters that are not filters, pagination, ordering, expand, or field selectors) produce a 400 response with field-keyed validation errors listing the valid filters. This is consistent with the flex-field and serializer validation behavior.

**Expanded nested serializers** omit `available_actions` by default in their response payloads. This means an expanded relation will include its field data but not its per-object action availability. If the client needs action information for an expanded object, a separate retrieve request is required.

## Verification Checklist

With expand and field controls configured, verify the surface end-to-end:

- `list` requests include only the configured `fetchFields` (plus PK) in the `f` parameter and the configured `expand` list in the `e` parameter. Verify by inspecting the network request.
- `list` responses include expanded relation data for permitted expansions. For expansions not in `permit_list_expands`, the response returns the FK value (not the expanded object).
- `retrieve` requests include `fetchFields`, `available_actions`, and the configured `expand` list. Expanded data is present for permitted expansions.
- Requesting an expansion that is not in `permit_list_expands` on a `list` endpoint returns a 400 with a message identifying permitted expansions.
- Requesting an unknown field name in `f` returns a 400 with a message listing valid field names.
- Overriding `expand` to `[]` in client config disables expansion. No `expand__subfield` keys appear in `fieldDetails`, and expanded relation columns or detail fields are absent from the rendered UI.
- View-specific expand overrides (for example, `list` with fewer expansions than `read`) produce different request parameters per view.
- Expanded sub-fields are targetable in `displayFields` and `fieldDetails` using `expand__subfield` naming (e.g., `category__name`).

## Troubleshooting

**`list` endpoint returns 400 on every request.** The most common cause is a mismatch between the client's default `expand` (all declared expansions) and the server's `permit_list_expands` (a subset). The client is requesting expansions that the server does not allow on `list`. Override the `expand` config for the `list` view to match the server's permitted list.

**Expanded field columns show missing values.** `displayFields` includes an `expand__subfield` key, but the corresponding expansion is not in the `expand` config (or was removed by a view-specific override). Without the expansion, the `expand__subfield` keys are not populated in `fieldDetails`, and the values are never fetched.

**Expanded sub-field is not configurable in `fieldDetails`.** Expansion flattening only occurs when the `expand` config is non-empty. If `expand` is overridden to `[]`, `storeModelConfig` does not merge expansion field details, and `expand__subfield` keys will not exist. Set `expand` to include the relevant relation name to enable flattening.

**400 error surfaces as a form validation error.** This is expected behavior. The CRUD helpers (`objectCrud`) wrap 400 responses as `FormValidationError` instances so they can be ingested by the form context. A 400 from invalid `f` or `e` parameters will appear in the form's error state rather than as a toast or console error.

**Invalid expand on a nested write produces a type error.** When a request includes both invalid expand parameters and nested write payloads, the type error from payload parsing can surface before the expand validation has a chance to aggregate all errors. The root cause is the invalid expand; fix that first, and the type error will resolve.

**`retrieve` response missing `available_actions`.** If `fetchFields` is overridden and does not include `available_actions`, the detail view will not have action availability information for the object. The built-in `DetailView` component adds `available_actions` to its fetch field list automatically, but custom components that bypass `DetailView` must include it explicitly.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}
    - {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param}
    - {@api py:class:vueda.core.viewsets.FlexFieldsMixin}
    - {@api py:function:vueda.core.viewsets.FlexFieldsMixin.get_serializer_context}
    - {@api py:class:vueda.core.serializers.VuedaSerializer}
    - {@api py:function:vueda.core.serializers.NoExtraFieldsSerializerMixin.validate}
    - {@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_expandable_fields}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda.use/useModelConfig}
    - {@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}
    - {@api js:module:@arrai-innovations/vueda.utils/objectCrud}
    - {@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectRetrieve}
    - {@api js:property:@arrai-innovations/vueda.utils/constants.FIELDS_PARAM}
    - {@api js:property:@arrai-innovations/vueda.utils/constants.EXPAND_PARAM}
- Vue.js Components:
    - {@api vue:component:ViewList}
    - {@api vue:component:DetailView}
