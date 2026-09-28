---
title: Link List Rows to Read and Update Views
type: how-to
audience: integrator
status: draft
---

# Link List Rows to Read and Update Views

Turn one list column into a {@term Row Link}, so each row's value opens that row's `update` or `read` view. Pick a column that identifies the record, such as a purchase order's `reference`.

You need a working CRUD surface ([Create a CRUD Surface](./create-crud-surface)). [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views) describes how model config overrides combine.

## Set `detailLinkField`

1. Choose a column that the list already displays. The link wraps that column's value and adds no column of its own.

2. Name it in [`detailLinkField`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.detailLinkField} in the model's `list` override. Register the override when the application starts:

    ```js
    import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

    export function setupModelConfig(pinia) {
        storeModelConfig(pinia).setConfig({ app: "catalog", model: "purchaseorder" }, null, {
            list: {
                displayFields: ["reference", "supplier", "total_value"],
                detailLinkField: "reference",
            },
        });
    }
    ```

    Each [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} call replaces the levels it names, so pass `null` for a level you leave alone. [Register Overrides with `setConfig`](./configure-crud-views#register-overrides-with-setconfig) describes when to call it.

    `detailLinkField` defaults to `null`, which turns row links off. Set it to `null` in a `list` override to turn off a model-wide value.

3. Keep the linked field in the list request. The list fetches the columns it displays unless you set [`fetchFields`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fetchFields}. If you set `fetchFields`, include the linked field.

4. Check that the model's serializer includes {@term Available Actions}. {@api py:class:vueda.core.serializers.VuedaSerializer} declares the `available_actions` field. When `detailLinkField` is set, the list adds `available_actions` and the primary key to its requested fields. It does this even when the [`listFields`]{@api vue:component:ViewList:prop:listFields} prop replaces the fetch list. Neither field becomes a visible column.

{@api vue:component:ViewList} then reads each row's `available_actions` to pick the link's destination:

| Row's `available_actions`                     | Link destination                   |
| --------------------------------------------- | ---------------------------------- |
| Includes `update`                             | The row's `update` view            |
| Includes `retrieve`, without `update`         | The row's `read` view              |
| Includes neither, or the field is not present | Displayed value without a row link |

Each row picks its own destination. A user who can retrieve a purchase order but cannot update it gets a read link on its reference. An editable row in the same list gets an update link.

The link controls navigation in the UI only. Route guards and server permissions still decide access when the user follows it.

## Check Which Columns Get the Link

`ViewList` wraps the configured column only when its {@term Column Adapter} is one of these built-in adapters. The adapter keeps its display props.

- {@api vue:component:ColumnText}
- {@api vue:component:ColumnBoolean}
- {@api vue:component:ColumnDateTime}
- {@api vue:component:ColumnDuration}
- {@api vue:component:ColumnJson}

The check uses the adapter the column resolves to, so a `columnComponents` override that names one of these adapters keeps the link. Other adapters render without a row link:

- {@api vue:component:ColumnModelLink} already links to the related record and keeps that target.
- A custom adapter may contain links, buttons, or other controls, so VUEDA leaves its navigation alone. Use a field slot (next section) to link custom content.
- A column whose override names no component renders no cells, and the list shows an error for that column. [Customize List Column Rendering](./customize-list-column-rendering) describes the override chain.

A `field(<name>)` slot on the configured column replaces the automatic link. Remove the slot to use the row link.

The link is an anchor with the row's URL in both table and card layouts. The cell's content is the link text. A plain click navigates inside the application. The browser handles a modified click, such as Ctrl+click, so opening in a new tab works.

## Link a Custom Cell With `LinkModelView`

Use {@api vue:component:LinkModelView} in a `field(<name>)` slot when the cell needs custom content or its own destination rule. `LinkModelView` does not check permissions, so the slot reads the row's `available_actions` itself.

This list view applies the same update-then-read rule to custom content in the `reference` column:

```vue
<script setup>
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import ViewList from "@vueda/views/ViewList.vue";

defineProps({
    app: { type: String, required: true },
    model: { type: String, required: true },
});
defineOptions({ inheritAttrs: false });

const detailView = (obj) => {
    const actions = obj.available_actions || [];
    return actions.includes("update") ? "update" : actions.includes("retrieve") ? "read" : null;
};
</script>

<template>
    <view-list v-bind="{ ...$props, ...$attrs }">
        <template #[`field(reference)`]="{ pk, obj, formatted }">
            <link-model-view v-if="detailView(obj)" :app="app" :model="model" :pk="pk" :view="detailView(obj)">
                {{ formatted }}
            </link-model-view>
            <span v-else>{{ formatted }}</span>
        </template>
    </view-list>
</template>
```

To render this component as the model's list view, return it from a `list` loader passed to {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents}. [View Component Resolution Order](../core-concepts/routing-and-view-resolution-model#view-component-resolution-order) describes the loader.

Without `detailLinkField`, the list does not request `available_actions`. Add it to `fetchFields`, or to the `listFields` prop when you pass one, and leave it out of `displayFields`. Do not put another link or control inside the `LinkModelView`.

## Verify the Result

- Open the list as a user with a mix of editable, read-only, and unavailable rows. Confirm update links, read links, and plain values on the matching rows.
- In the browser's network panel, confirm the list request's fields include the primary key, the displayed columns, and `available_actions`. Confirm no extra column appears.
- Check both table and card layouts, keyboard activation, and a modified click on the linked value.
