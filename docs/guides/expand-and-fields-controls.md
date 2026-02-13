---
title: Use Expand and Sparse Field Controls
type: how-to
audience: implementor
status: draft
---

# Use Expand and Sparse Field Controls

This guide walks through configuring a model surface so that list, read, create, and update requests use explicit sparse field (`f`) and expand (`e`) controls. By the end, the server's expand allow-lists and the client's default field/expand configuration will be aligned so that fetch shapes are predictable per action.

The guide assumes familiarity with the field and expand contract. If you have not read [Field and Expand Semantics](../core-concepts/field-and-expand-semantics), start there — it explains the parameter namespace, expand descriptor structure, action-scoped expand authority, and the client normalization that this guide builds on. For the broader model registration and serializer setup, see [Create a CRUDL Surface](./create-crudl-surface).

## Goal and Preconditions

The objective is a single model surface where:

- The serializer declares which relationships are expandable and what their nested field schemas look like.
- The viewset restricts which expands are permitted per action, so list requests do not embed heavy object graphs.
- The client's default expand and field configuration matches the server's allow-lists, so requests succeed without manual parameter tuning.
- Invalid `f` and `e` values fail deterministically with HTTP 400, never silently dropping fields or partially applying expands.

Before you begin, ensure the following are in place:

The model has a canonical serializer extending `VuedaSerializer` and is registered via `register()` in the app's `ready()` method. The viewset extends `VuedaViewSet`. The model-info endpoint returns complete metadata including `model_fields` and `model_expands`. If the model is not yet registered, see [Create a CRUDL Surface](./create-crudl-surface) first.

## Server Expand and Field Allow-Lists

### Declare expandable fields on the serializer

Expandable relationships are declared in the serializer's `Meta.expandable_fields` using the `rest_flex_fields` tuple syntax. Each entry maps an expand key to a serializer class and optional configuration:

```python
from vueda.core.serializers import VuedaSerializer
from .models import Order

class OrderSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "customer",
            "line_items",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer": ("myapp.serializers.CustomerSerializer", {}),
            "line_items": (
                "myapp.serializers.LineItemSerializer",
                {"many": True},
            ),
        }
```

The expand keys (`customer`, `line_items`) become the values that the client sends in `e` query parameters. The nested serializer defines the field schema that model-info exposes as the expand descriptor's `f` metadata.

### Restrict expands per action on the viewset

When different actions should permit different expand sets, define `permit_{action}_expands` on the viewset:

```python
from vueda.core.viewsets import VuedaViewSet
from .models import Order
from .serializers import OrderSerializer

class OrderViewSet(VuedaViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    # List only permits lightweight expands
    permit_list_expands = ["customer"]
    # Retrieve permits all expands
    permit_retrieve_expands = ["customer", "line_items"]
```

Once any `permit_{action}_expands` attribute is defined, the fail-closed default applies: actions without an explicit permit list receive an empty permitted set. In the example above, if a create or update request includes `e=customer`, it will receive `"No expands are permitted."` because neither `permit_create_expands` nor `permit_update_expands` is defined. If no action needs expand restrictions, omit all `permit_{action}_expands` attributes and the serializer's full `expandable_fields` set is available on every action.

## Client Default Field/Expand Strategy

The client derives default field and expand configuration from model-info metadata. When the model-info response includes expand descriptors, the default model-config generation populates three things:

- **`expand`**: the list of expand names to request by default, derived from the expand descriptor `name` values.
- **`fetchFields`**: the fields to include in `f` parameters, derived from field metadata (excluding the PK, which list/read requests inject automatically).
- **`fieldDetails`**: a map of field-level metadata used by renderers and form components. For each expand in the `expand` config, the flattening step creates `expand__subfield` composite keys from the expand's nested `f` metadata.

To override the default expand set for a model, configure it in the project's model-config setup:

```javascript
const modelConfig = useModelConfig("myapp", "order");
modelConfig.expand = ["customer"]; // only expand customer by default
```

When `expand` is overridden to an empty array, the `expand__subfield` keys are not populated in `fieldDetails`. Components that rely on expanded field-detail keys (for example, a list column that renders `customer__name`) will find those keys missing. Ensure that any display-field or column configuration that references expanded sub-fields is consistent with the expand config.

## List and Detail Request Param Wiring

List and detail views construct their `f` and `e` query parameters from the model-config field and expand sets.

**List requests** send the configured `fetchFields` as `f` values, always prepending the PK field (even though `fetchFields` excludes it by default). The configured `expand` names are sent as `e` values. The resulting request includes only the fields the list view needs, plus any expanded relationships:

```
GET /routes/myapp/order/?f=id&f=order_number&f=status&f=customer&e=customer
```

**Detail read and update requests** follow the same pattern but include `available_actions` in the field set so the view can resolve which actions the current user can perform on the object:

```
GET /routes/myapp/order/1/?f=id&f=order_number&f=status&f=customer&f=available_actions&e=customer&e=line_items
```

The CRUD helpers (`objectCrud`, `listCrud`) serialize `f` and `e` arrays into query strings and handle the response parsing. HTTP 400 responses from invalid `f` or `e` values are parsed as `FormValidationError` and can be routed into form-context error state. See [Error and Validation Contract](../core-concepts/error-and-validation-contract) for the full error classification path.

## Validation and Error-Handling Checks

The server validates `f` and `e` parameters at two layers.

**At the viewset layer**, `NoExtraFieldsForViewSetMixin` validates query parameters on list and retrieve actions. `validate_flex_field_param` checks `f` values against the serializer's declared fields plus any flex-resolved fields. `validate_flex_expand_param` checks `e` values against the action's permitted expand set (or the full `expandable_fields` set when no action-level permit exists). Both produce HTTP 400 responses with field-keyed error payloads.

**At the serializer layer**, `NoExtraFieldsSerializerMixin` validates incoming request data keys against the serializer's `fields`. Unknown input fields on create/update produce field-keyed 400 responses. This is separate from `f`/`e` query parameter validation — it catches unknown keys in the request body, not in query parameters.

Invalid expand requests are all-or-nothing. If a request includes three expand keys and one is invalid, the entire request fails with a 400. The valid expands are not partially applied. This prevents the client from receiving a response with an unexpected shape (some expands embedded, others not).

## Verification Checklist

With expand and field controls configured, verify these behaviors:

- List and retrieve requests for the model include the expected `f` and `e` query parameters (inspect the network request).
- Expanded relationships return embedded objects in the response, not just foreign key values.
- The expand set on list requests matches `permit_list_expands` (if configured), and retrieve requests match `permit_retrieve_expands`.
- Requesting an expand that is not in the action's permit list returns HTTP 400 with `"Invalid expands..."` or `"No expands are permitted."`.
- Requesting an unknown `f` value returns HTTP 400 with a field-keyed error listing valid fields.
- Overriding the client's `expand` config to `[]` removes `expand__subfield` keys from `fieldDetails`, and no components break from missing keys.
- Overriding the client's `expand` config to a subset that exceeds the server's `permit_*_expands` produces an immediate 400 on the affected action.

## Troubleshooting

**List or detail requests return 400 immediately after configuring expands.** The most common cause is a mismatch between the client's default `expand` config and the server's `permit_{action}_expands`. The client derives its default expand set from all expand descriptors in model-info, but the viewset may only permit a subset per action. Either widen the server's permit list or narrow the client's `expand` config to match.

**Expanded sub-field columns show no data.** Verify that the expand is in the client's `expand` config and that the `fieldDetails` map includes the `expand__subfield` key. If `expand` was overridden to `[]` or a subset that excludes the relevant expand, the flattening step does not populate those keys.

**No expands are permitted even though the serializer declares them.** This happens when the viewset defines `permit_{action}_expands` for some actions but not the current one. The fail-closed default gives unmentioned actions an empty permit set. Either add a `permit_{action}_expands` for the action in question or remove all action-level permit attributes to allow the full serializer expand set everywhere.

**Invalid expand plus nested write produces a type error.** When a write request includes both an invalid expand and nested write data, the expand validation and serializer validation can interact in unexpected order. The expand error may surface as a type error before the full expand error payload is aggregated. Fix the expand value first; the type error is a symptom of the invalid expand, not a separate issue.

**Unknown list query parameters return 400.** This is `NoExtraFieldsForViewSetMixin` rejecting query parameters that do not match any declared filter, pagination, ordering, or flex-field parameter. If you are adding custom query parameters to a list endpoint, declare them in the filterset or add them to the viewset's recognized parameter set.

## Relevant Implementation Surface

- Python:
  - `{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}`
  - `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_field_param}`
  - `{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_param}`
  - `{@api py:class:vueda.core.viewsets.FlexFieldsMixin}`
  - `{@api py:function:vueda.core.viewsets.FlexFieldsMixin.get_serializer_context}`
  - `{@api py:class:vueda.core.serializers.VuedaSerializer}`
  - `{@api py:function:vueda.core.serializers.NoExtraFieldsSerializerMixin.validate}`
  - `{@api py:function:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin.get_expandable_fields}`
- REST:
  - `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
- JavaScript:
  - `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
  - `{@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}`
  - `{@api js:module:@arrai-innovations/vueda.use/useModelConfig}`
  - `{@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}`
  - `{@api js:module:@arrai-innovations/vueda.utils/objectCrud}`
  - `{@api js:function:@arrai-innovations/vueda.utils/objectCrud.defaultObjectRetrieve}`
  - `{@api js:property:@arrai-innovations/vueda.utils/constants.FIELDS_PARAM}`
  - `{@api js:property:@arrai-innovations/vueda.utils/constants.EXPAND_PARAM}`
- Vue.js Components:
  - `{@api vue:component:ViewList}`
  - `{@api vue:component:DetailedView}`
