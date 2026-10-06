---
title: Build Nested/Inlined Writes
type: how-to
audience: integrator
status: draft
---

# Build Nested/Inlined Writes

A {@term Nested Write} saves a parent object and its related objects in one create or update request. This guide sets up the serializers and the request, then customizes the {@term Inline} rows that edit the related objects on the client. [Nested Write Compatibility](../core-concepts/nested-write-compatibility.md) describes how the serializer processes the nested body.

## Before You Begin

- The parent serializer and each child serializer inherit {@api py:class:vueda.core.serializers.VuedaSerializer}, which includes {@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}.
- A {@api py:class:vueda.core.viewsets.VuedaViewSet} serves the parent model. Nested writes go through its `create`, `update`, and `partial_update` actions.

## Declare the Nested Serializer

List each relation in the parent's `Meta.expandable_fields`, with the child serializer and its options:

```python
from vueda.core.serializers import VuedaSerializer


class OrderItemSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = OrderItem
        # No `order` field: the parent sets it when it saves each item.
        fields = ["id", "product", "quantity"] + VuedaSerializer.Meta.fields


class OrderSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Order
        fields = ["id", "customer", "status", "items"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer": (CustomerSerializer, {}),
            "items": (OrderItemSerializer, {"many": True}),
        }
```

1. Subclass `VuedaSerializer.Meta` and append `VuedaSerializer.Meta.fields`. The subclass keeps [`VuedaListSerializer`]{@api py:class:vueda.core.serializers.VuedaListSerializer} as the list serializer. The appended list keeps `formatted_name`, `available_actions`, and `object_revision`.
2. Set `"many": True` for a collection, such as a reverse foreign key or a many-to-many relation. Leave it out for a single object.
3. Leave the parent's foreign key out of the child's `fields`, or make it optional. The parent supplies it when it saves each child.

A relation in `expandable_fields` reads as a primary key until a request names it in `e`. To accept nested objects on every request, declare the child serializer as a field instead:

```python
class OrderSerializer(VuedaSerializer):
    items = OrderItemSerializer(many=True, required=False)
```

The rest of this guide uses `expandable_fields`.

## Name Each Nested Relation in `e`

Add every relation that the body sends as an object to the `e` query parameter. A relation named in {@term Expand} accepts an object. With `"many": True`, it accepts a list of objects. A relation left out of `e` accepts a primary key:

```text
POST /routes/shop/order/?e=items
Content-Type: application/json

{
  "customer": 7,
  "status": "draft",
  "items": [
    {"product": 42, "quantity": 3},
    {"product": 17, "quantity": 1}
  ]
}
```

Repeat the parameter (`?e=items&e=customer`) or separate names with commas (`?e=items,customer`).

The viewset may set an {@term Action-Scoped Expand} list for the write action: `permit_create_expands`, `permit_update_expands`, or `permit_partial_update_expands`. If it does, include the relation in that list. The server checks `e` before it validates the body. [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md#sparse-fields-and-expand-on-writes) describes that check and how `f` and `om` affect a write.

The default create and update views send each name in the model config's [`expand`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.expand} as `e` when the form holds a value for it.

## Set Up Permissions for Related Rows {#permissions-for-related-rows}

A nested write can create or update a row through a direct relation, such as `customer`, or through a many-to-many relation. For each such row, the server checks the related model's viewset permissions. Rows of a reverse relation, such as `items`, need no check of their own. [Related-Row Authorization](../core-concepts/nested-write-compatibility.md#related-row-authorization) describes the check, its errors, and the rollback.

1. Register each related model that nested writes create or update with its serializer and its viewset, as [Model-Info Registration](./create-crud-surface.md#model-info-registration) shows. A registration with only a serializer fails the check.
2. Give the user the create or update permission that the related viewset requires, such as `shop.update_customer`. [Grant Permissions](./create-crud-surface.md#grant-permissions) describes the grants.

To link an existing row without changing it, send only its primary key in the nested object:

```text
POST /routes/shop/order/?e=customer,items
Content-Type: application/json

{
  "customer": {"id": 7},
  "status": "draft",
  "items": [{"product": 42, "quantity": 3}]
}
```

The server links customer 7 without a permission check. It does not validate the customer's other fields or run the customer serializer's save. A primary key that matches no row returns a `400`.

## Send the Full Set of Children on Update

On an update, the server matches each child object to one of the parent's existing rows by its `pk` or primary key field, such as `id`:

- A child whose primary key matches one of the parent's rows updates that row.
- A child with no primary key, or one whose primary key matches none of the parent's rows, creates a row.
- An existing row missing from the list is removed.

A many-to-many child can match any row of the related model. A many-to-many primary key that matches no row returns a `400`.

Removal depends on the relation. The server deletes a reverse foreign key row and unlinks a many-to-many row. It sets a `SET_NULL` or `SET_DEFAULT` foreign key to null or its default. A `PROTECT` foreign key fails the request with a `400`.

To keep a child, send it with its primary key. To leave every child unchanged, leave the relation's key out of the body. A create never removes rows. [Nested Write Compatibility](../core-concepts/nested-write-compatibility.md#write-order) describes the order of these steps.

## Keep a Relation Read-Only

Use {@api py:class:vueda.core.serializers.VuedaReadonlySerializer} for a relation that reads as nested objects but never takes writes. With `"many": True`, it uses {@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}.

```python
class OrderSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Order
        fields = ["id", "customer", "status", "items", "audit_log"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "items": (OrderItemSerializer, {"many": True}),
            "audit_log": (AuditLogReadonlySerializer, {"many": True}),
        }
```

The server discards `audit_log` data in a write body and returns no error for it.

## Remove Saved Inline Rows

{@api vue:component:FieldSetStackedInline} and {@api vue:component:FieldSetTabularInline} add a destroy action to each writable inline. Model info does not need to list one. The action puts a "Delete?" checkbox on each saved row:

1. Check the box. The row stays visible, marked for removal, and becomes an {@term Ignored Field}, so the submitted list leaves it out.
2. Clear the box to include the row again.
3. Save the parent. The update removes each row missing from the list, as [Send the Full Set of Children on Update](#send-the-full-set-of-children-on-update) describes. Marking every row sends an empty list.

An unsaved row has a Delete button, which removes the row from the form at once. A read-only inline, or any inline on a read view, has no destroy action.

Removal runs through the parent's update. The child needs no destroy route or destroy permission, and the server still checks the parent's update permission.

To replace the checkbox, fill the `destroy-checkbox` slot of either layout ([stacked]{@api vue:component:FieldSetStackedInlineRow:slot:destroy-checkbox}, [tabular]{@api vue:component:FieldSetTabularInline:slot:destroy-checkbox}). The slot props include `action`, `rowIndex`, `modelValue`, and an `onUpdate:modelValue` handler that marks or clears the row.

To change the action's label or value, add your own entry with `fieldName: "destroy"` and `action: true` to the inline's `fieldObjects`, as the next section shows. The inline keeps your entry and adds no second destroy action.

## Add a Custom Row Action

An inline shows a button for each entry in its [`fieldObjects`]{@api js:property:@arrai-innovations/vueda/use/useFieldSetInline#FIELD_SET_INLINE_PROPS} that has an `action` function. `fieldObjects` replaces the inline's field list, so list the row's fields too. Pass it through the form's [`fieldProps`]{@api vue:component:FormModel:prop:fieldProps} entry for the relation:

```js
const fieldProps = {
    items: {
        fieldObjects: [
            { name: "items.product", fieldName: "product" },
            { name: "items.quantity", fieldName: "quantity" },
            { fieldName: "inspect", label: "Inspect", action: inspectRow },
        ],
    },
};

function inspectRow({ rowValueName, fieldSetContextState, event }) {
    // rowValueName is the row's path, such as "items[1]".
}
```

{@api vue:component:FieldSetInlineActionButton} draws the button in both layouts. It calls the function without submitting the parent form, and passes one object:

- `action`: the entry itself.
- `event`: the click event.
- `rowValueName`: the row's path, such as `items[1]`. A singular stacked inline passes its field name with no index.
- `fieldSetContextState`: the stacked layout passes the inline's state, which holds the field objects, the actions, and the marked rows. The tabular layout passes the field context state, which includes the field value.
- `objectGridFieldSlotProps` and `doCreate`: the tabular layout only.

The two `fieldSetContextState` objects have different shapes, so check the layout before you read one.

To replace the button, fill the `item-action-button` slot ([stacked]{@api vue:component:FieldSetStackedInlineRow:slot:item-action-button}, [tabular]{@api vue:component:FieldSetTabularInline:slot:item-action-button}). The slot receives the same context but does not call the function for you, so handle the click in your replacement.

## Customize the Built-In Row Buttons

The Delete button on an unsaved row is a {@api vue:component:Button} with a trash icon and the visible label "Delete". The label gives the button its accessible name, and the icon is decorative. Pick the customization point by what you change:

- **Layout or extra classes on Delete:** override the [theme slot]{@term Theme Slot} {@api theme-key:FieldSetStackedInlineRow.destroyButton} or {@api theme-key:FieldSetTabularInline.destroyButton}. Singular stacked inlines use the stacked row's slot.
- **Button appearance:** override {@api theme-key:Button.root} or its composition primitives. A {@term Theme Override} on the inline applies to that inline and its descendants, so it also changes Create and the other buttons inside it.
- **The trash icon:** pass an [`iconOverride`]{@api js:property:@arrai-innovations/vueda/use/useIcons#ICON_OVERRIDE_PROPS} with a `typeDeleted` entry under `FieldSetStackedInlineRow` or `FieldSetTabularInline`. A `typeDeleted` entry under `Default` changes the icon for every component without its own entry.
- **Button props or content:** fill the `destroy-button` slot ([stacked]{@api vue:component:FieldSetStackedInlineRow:slot:destroy-button}, [tabular]{@api vue:component:FieldSetTabularInline:slot:destroy-button}). Bind the slot's `onClick` handler to your button so that the button still removes the row. Theme overrides change classes only, never component props.

## Show Nested Errors on Inline Fields

A nested validation error arrives under the relation and the row's index:

```json
{
    "items": [{}, { "quantity": ["A valid integer is required."] }]
}
```

The client keys it by the full {@term Field Path}, here `items[1].quantity`, which matches the inline field for that row. [Error and Validation Contract](../core-concepts/error-and-validation-contract.md#non-field-and-nested-path-semantics) lists the key that each body shape produces.

To clear a sibling field's server error when the user leaves a row field, follow [Clear Related Server Errors on Blur](./form-validation-and-errors.md#clear-related-server-errors-on-blur). [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md#object-form-submission) describes how a failed save scrolls to the first error.

## Verify

- A create with nested children and a matching `e` saves the parent and every child.
- An update with changed, new, and missing children applies all three.
- An update without the relation's key leaves every child unchanged.
- An object sent for a relation missing from `e` returns an `incorrect_type` error.
- A relation missing from the action's `permit_<action>_expands` returns an `Invalid expands.` error.
- A nested create or update of a related row fails for a user without the related viewset's permission, and no row changes.
- A link that sends only the related row's primary key succeeds for a user without the related update permission.
- The server discards data sent for a read-only relation and returns no error.
- A nested validation error shows on the matching row field.

## Troubleshooting

**`incorrect_type` on a relation field.** The body sends an object for a relation that `e` does not name, so the server reads it as a primary key. Add the relation to `e`.

**`400` with `Invalid expands.` on a write.** The relation is not in `expandable_fields`, or the write action's permit list leaves it out. Add it. [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md#action-scoped-expands) describes the permit lists.

**`{"items": [{"order": ["This field is required."]}]}`.** The child serializer lists the parent's foreign key. Remove it from the child's `fields`, or make it optional. [Nested Write Compatibility](../core-concepts/nested-write-compatibility.md#save-time-child-validation) describes how the server validates each child when it saves.

**Nested children are not created or updated.** The relation uses `VuedaReadonlySerializer` or `VuedaReadonlyListSerializer`, so the server discards its data. Use a writable serializer.

**Children disappear after an update.** The body sent the relation's key without them. Send every child that you keep, with its primary key, or leave the key out.

**`Cannot delete ... because protected relation exists`.** A `PROTECT` foreign key points at a child missing from the list. Send that child, or remove the protecting rows first.

**`TypeError: Cannot encode multipart value at ...` on save.** The save holds a file, so the client sends multipart, and the value at the named path has no JSON form. Examples are `undefined`, a `Date`, and a class instance. Convert the value before the save. [CRUD Adapter Layer](../core-concepts/crud-adapter-layer.md#multipart-saves) lists the values that a multipart save accepts.

**`Cannot establish create permission for ...` or `... update permission for ...` under a relation.** The related model has no registered viewset, or the viewset has no method for the action. Register the model with its viewset.

**`You do not have permission to create ...` or `... to update ...` under a relation.** The user lacks the related viewset's permission for that row. Grant the permission. To link the row without changing it, send only its primary key.

**A nested error does not show on its field.** The error's key must equal the field's path, such as `items[1].quantity`. Compare the path that the inline renders with the key in the response.
