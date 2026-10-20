---
title: Render a Relation as an Inline
type: how-to
audience: integrator
status: draft
---

# Render a Relation as an Inline

An {@term Inline} edits related objects inside the parent form. This guide takes a relation from its serializer declaration to an inline on the create, update, and read forms. It then shows how to pick the layout and the fields in each row. [Build Nested/Inlined Writes](./nested-writable-inlines.md) describes how the server saves the related objects.

## Before You Begin

The model needs a working {@term CRUD} surface, with its serializer and viewset registered and its views routed. [Create a CRUD Surface](./create-crud-surface.md) sets one up.

The examples use an `Order` model with two relations. `items` is a reverse foreign key to `OrderItem`, and `customer` is a foreign key to `Customer`. The parent serializer lists both relations in `Meta.expandable_fields`:

```python
class OrderSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Order
        fields = ["id", "customer", "status", "items"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "customer": (CustomerSerializer, {}),
            "items": (OrderItemSerializer, {"many": True}),
        }
```

[Declare the Nested Serializer](./nested-writable-inlines.md#declare-the-nested-serializer) describes each part of this declaration. A relation must appear in `expandable_fields`, because the client takes each inline's fields from the expand descriptor in {@term Model Info}.

A nested write that changes a `Customer` row also needs the permissions that [Set Up Permissions for Related Rows](./nested-writable-inlines.md#permissions-for-related-rows) lists.

## Name the Relation in Each Form View's `expand`

A form renders a relation as an inline only when the view's [`expand`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.expand} names it. The default `expand` is empty. Without an entry, a foreign key or a many-to-many relation renders a combobox that searches the related rows. A reverse foreign key shows a field render failure on the create and update forms.

Call {@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} when the application starts, before any view of the model renders. Name the relations in the `create`, `update`, and `read` layers:

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

const formConfig = { expand: ["items", "customer"] };

storeModelConfig().setConfig({ app: "shop", model: "order" }, null, {
    create: formConfig,
    update: formConfig,
    read: formConfig,
});
```

An `expand` in the generic layer (the second argument) also applies to the list view. The list then sends `e=items,customer`, and the server answers with a `400` unless the viewset names both relations in `permit_list_expands`. [Action-Scoped Expands](../core-concepts/field-and-expand-semantics.md#action-scoped-expands) describes each action's permit list. When the viewset sets `permit_retrieve_expands`, `permit_create_expands`, or `permit_update_expands`, add both relations to each list that it sets.

The update and read forms now show:

- `items` as a {@api vue:component:FieldSetStackedInline}: a card for each related row, with a Create button for a new row.
- `customer` as a {@api vue:component:FieldSetSingularStackedInline}: one card for the related object.

The expand descriptor's `many` value picks between the two layouts. [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui.md) describes how the client picks each field's component. Each card shows every field of the related serializer, and the primary key is read-only. On the create form, `items` starts empty and shows its Create button.

## Show the Rows as a Table

Set {@api vue:component:FieldSetTabularInline} as the relation's field component to show its rows as a table:

```js
const formConfig = {
    expand: ["items", "customer"],
    fieldComponents: { items: "FieldSetTabularInline" },
};
```

The tabular layout is for a relation whose expand has `many`. It shows a table at the `lg` breakpoint and wider, and a card for each row below that. To change the breakpoint, pass `tableBreakpoint` in the relation's [`fieldProps`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.fieldProps} entry, such as `fieldProps: { items: { tableBreakpoint: "sm" } }`.

Keep `fieldComponents` in the form layers. List filter forms read the generic layer's `fieldComponents` by filter name, so a generic entry for `items` also replaces a filter input named `items`.

## Choose the Fields in Each Row

List the fields of a row as dotted entries in the view's [`displayFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.displayFields}. The row shows them in that order. Keep the relation's own name in the list as well, because the form renders the inline from that entry:

```js
const formConfig = {
    expand: ["items", "customer"],
    displayFields: ["customer", "customer.name", "status", "items", "items.product", "items.quantity"],
};
```

When `displayFields` holds a dotted entry for one relation, list dotted entries for every relation in `expand`. A relation without dotted entries then shows a render failure for each of its fields. For `customer`, a message starts with `There was an error while rendering the "customer.id" field`. When `displayFields` holds no dotted entries at all, every inline shows all of its fields.

## Hide Fields and Change Labels

Set an [`expandDetails`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.expandDetails} entry for the relation to change its inline without listing every field:

```js
const formConfig = {
    expand: ["items", "customer"],
    expandDetails: {
        items: {
            label: "Order lines",
            hidden: ["product"],
            f: { quantity: { label: "Qty" } },
        },
    },
};
```

- `label` sets the inline's title.
- [`hidden`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ExpandInfo.hidden} lists the fields that each row leaves out. A field in `hidden` stays hidden even when `displayFields` lists it.
- [`f`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ExpandInfo.f} changes the details of a field, such as its label. Each key in `f` is a field name. The client merges each entry into the details that model info reports.

A `fieldDetails` entry with a dotted key, such as `items.quantity`, does not change a field inside an inline. Use `expandDetails.<relation>.f` instead.

## Keep an Inline Read-Only

Declare the relation with {@api py:class:vueda.core.serializers.VuedaReadonlySerializer} on the server. Model info then marks the expand and every one of its fields read-only. The inline shows each field as read-only, and it shows no Create button and no delete controls. [Keep a Relation Read-Only](./nested-writable-inlines.md#keep-a-relation-read-only) shows the declaration.

The read form shows every inline as read-only, including an inline for a writable relation.

## Check What Each Save Sends

The create and update views name each relation from `expand` in `e` when the form holds a value for that relation. An empty list of rows counts as a value. [Field and Expand Semantics](../core-concepts/field-and-expand-semantics.md#expands-on-the-client) describes what each view sends. [Name Each Nested Relation in `e`](./nested-writable-inlines.md#name-each-nested-relation-in-e) shows the resulting request body.

## Troubleshooting

**`Model config for shop.order is invalid: displayFields names items.quantity, but expand does not name items.`** A dotted entry in `displayFields`, `fetchFields`, or `submitFields` names a relation that the view's `expand` leaves out. Add the relation to the same view's `expand`.

**`Model config for shop.order is invalid: expand names lines, which model info does not declare.`** The `expand` entry does not match a relation in the serializer's `Meta.expandable_fields`. Fix the spelling, or declare the relation on the server.

**`Unknown field price specified for expand items on shop.order`.** A dotted entry in `displayFields` names a field that the related serializer does not have. {@api vue:component:FormModel} throws this error when it builds its fields. Use a field name from the related serializer's `fields`.

**`submitFields for shop.order names expand-flattened display field(s): items.quantity.`** `submitFields` lists a dotted entry. List the relation's own name, `items`, in `submitFields`. The inline submits its rows under that name.

**`No widget component found for field "items" in app "shop" model "order"`.** The form renders the relation as a plain field, and the field's type has no widget. Add the relation to the view's `expand`.

**`There was an error while rendering the "customer.id" field.`** `displayFields` lists dotted entries for another relation but none for `customer`. Add dotted entries for `customer`, as [Choose the Fields in Each Row](#choose-the-fields-in-each-row) describes.
