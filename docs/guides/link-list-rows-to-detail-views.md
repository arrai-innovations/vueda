---
title: Link List Rows to Read and Update Views
type: how-to
audience: integrator
status: draft
---

# Link List Rows to Read and Update Views

Set `detailLinkField` in a model's list configuration to link an existing column to each row's `update` or `read` view. Choose a column that identifies the record, such as a purchase order's `reference`. No extra action column or field slot is required.

This builds on [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views) and assumes a working CRUDL surface (see [Create a CRUDL Surface](./create-crudl-surface)).

## Opt In Through Model Config

Register the configuration during application bootstrap, before the first CRUD navigation:

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

export function setupModelConfig(pinia) {
    storeModelConfig(pinia).setConfig(
        { app: "catalog", model: "purchaseorder" },
        {},
        {
            list: {
                displayFields: ["reference", "supplier", "total_value"],
                fetchFields: ["reference", "supplier", "total_value"],
                detailLinkField: "reference",
            },
        },
    );
}
```

Keep the configured field in `displayFields` and fetch its value. `detailLinkField` does not add a column or change the displayed value. It defaults to `null`, so existing lists retain their rendering until configured. Set it to `null` in a list override to disable a generic setting.

For each row, {@api vue:component:ViewList} reads `available_actions` from the server response:

| Row actions                              | Link destination                   |
| ---------------------------------------- | ---------------------------------- |
| Includes `update`                        | The row's `update` view            |
| Includes `retrieve`, without `update`    | The row's `read` view              |
| Includes neither, or metadata is missing | Displayed value without a row link |

An Accountant who can retrieve a purchase order but cannot update it gets a read link on its reference. Rows in the same list can have different destinations. Model-level action availability does not substitute for the row's action metadata.

The list automatically includes `available_actions` alongside the primary key in its requested fields, including when `listFields` overrides the fetch list. Neither becomes a visible column through this feature. Your serializer must expose `available_actions`; missing row metadata leaves the value unlinked.

These links control navigation shown in the UI. Route guards and server permissions continue to enforce access when a link is followed.

::: warning
Register `setConfig` overrides before the first CRUD navigation. The route guard builds and caches model configuration; registering an override from inside an already-mounted view does not rebuild that view's configuration.
:::

## Rendering and Interaction

The configured column uses a normal anchor in both table and card layouts. Its displayed value supplies the link's accessible name. Keyboard activation, modified clicks, opening in a new tab, and text selection work as they do for other links. The rest of the row remains independent.

Automatic wrapping supports the built-in `ColumnText`, `ColumnBoolean`, `ColumnDateTime`, `ColumnDuration`, and `ColumnJson` adapters and preserves their display props. `ColumnModelLink` already links to a related record, so it keeps its own target. Custom adapters are also left unwrapped because they may contain links, buttons, or other controls. Use a field slot for custom linked content.

An explicit `field(<name>)` slot takes precedence over the automatic link, even on the configured column. If column hiding is enabled, readers can hide the linked column like any other column.

## Migrate From Manual Row Links

For a wrapper that currently adds an `update` or `read` column, remove that synthetic column from the list's `displayFields` and set `detailLinkField` to an existing identifying column. A synthetic column is a column with no server field behind it; its slot supplies all its content.

Remove a manual `field(reference)` slot if it should use the configured behavior. Leaving that slot in place keeps the manual rendering and destination. Shared wrapper slots for synthetic columns may remain for other lists that still use them.

## Custom Layouts With a Field Slot

Use {@api vue:component:LinkModelView} in a field slot when you need custom content or destination rules. A project's shared `DefaultViewList.vue` can own this slot, or a model-specific view can wrap it and override one column. Forward slots through shared wrappers so model-specific content retains precedence.

This example applies the same update-then-read selection to custom reference content:

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
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </view-list>
</template>
```

If `detailLinkField` remains configured, the list still requests `available_actions` for this slot. Without it, include `available_actions` explicitly in `fetchFields` (or `listFields` when supplied). Keep it out of `displayFields`.

A manual `LinkModelView` does not choose a permitted action for you. The slot must check row metadata as above. Do not wrap another link or control in the reference link.

## Verify the Result

- Open a list containing editable, read-only, and unavailable rows. Confirm update links, read links, and unlinked values respectively.
- Confirm the list request includes the primary key, the configured fetch fields, and `available_actions`, without an extra visible action column.
- Check table and card layouts, keyboard activation, modified clicks, and any custom cells beside the linked column.

## Relevant Implementation Surface

- {@api vue:component:ViewList}
- {@api vue:component:LinkModelView}
- {@api js:interface:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig}
- [Customize List Column Rendering](./customize-list-column-rendering)
- [Control Action Availability in the UI](./control-action-availability)
