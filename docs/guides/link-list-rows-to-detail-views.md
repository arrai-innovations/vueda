---
title: Link List Rows to Read and Update Views
type: how-to
audience: integrator
status: draft
---

# Link List Rows to Read and Update Views

This guide shows how to add a per-row link from a `list` view to that row's `read` or `update` view. Out of the box, a `ViewList` row has no such affordance, so you add one yourself with a {@api vue:component:LinkModelView} in a field slot.

The recommended shape is layered, so the affordance is written once and reused: a reusable link slot lives in your project's default list wrapper, each model opts in through config, and model-specific views are reserved for genuine per-model differences.

This builds on [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views) and assumes a working CRUDL surface (see [Create a CRUDL Surface](./create-crudl-surface)).

## Why Rows Are Not Linked by Default

Three facts combine to mean a stock list row cannot navigate to its own detail view:

- **Detail actions do not render as list buttons.** `useViewList` sorts the available actions into _targetless_ actions (neither `detail` nor `bulk`) and _bulk_ actions (`bulk`). The `retrieve` and `update` actions are `detail: true, bulk: false`, so they fall into neither group and produce no button in the list. They render only inside a detail view (`ViewRead`), not the list. See [Control Action Availability in the UI](./control-action-availability) for the classification rules.
- **Cells are plain text.** Grid cells render the field's formatted value as text. There is no automatic linking, including for foreign-key columns.
- **There is no row-click handler.** `ViewList` does not make rows clickable.

So a link is something you add deliberately. The sanctioned way is a field slot that renders a {@api vue:component:LinkModelView}.

## The Layered Pattern

The project templates resolve a list route to `View<Action><App><Model>.vue` if it exists, then fall back to a shared `DefaultViewList.vue` (see [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model)). That gives you three places to put behaviour, and each layer has a clear job:

1. **`DefaultViewList.vue` (app-wide):** define the reusable `field(update)` and `field(read)` link slots once. Every model gets the capability for free.
2. **Model config (per-model):** a model opts in by adding the synthetic `update` or `read` column to its list `displayFields`. This is the activation switch.
3. **`View<Action><App><Model>.vue` (model-specific):** wrap `DefaultViewList` (not `ViewList` directly) only when a model needs more, such as linking an existing data column instead of, or in addition to, the synthetic action column.

A synthetic action column is a column named after the action (`update` or `read`). Because the name is not a real model field, it has no fetched value; the slot supplies the cell content instead.

### Step 1: Add reusable link slots to `DefaultViewList`

`ViewList` forwards a `field(<columnName>)` slot to the grid cell for that column. The slot props include `pk` (the row's primary key), `obj` (the row data), `value`, `formatted`, and `pkKey`. Define the action-column slots once in the shared wrapper:

```vue
<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import ViewList from "@vueda/views/ViewList.vue";

defineProps({
    app: { type: String, required: true },
    model: { type: String, required: true },
});
defineOptions({ inheritAttrs: false });
</script>

<template>
    <view-list v-bind="{ ...$props, ...$attrs }">
        <template #[`field(update)`]="{ pk }">
            <link-model-view :app="app" :model="model" :pk="pk" view="update" label="Edit" />
        </template>
        <template #[`field(read)`]="{ pk }">
            <link-model-view :app="app" :model="model" :pk="pk" view="read" label="View" />
        </template>
        <!-- Synthetic columns have no server-provided header; label them in card layout. -->
        <template #[`header(update)`]="slotProps">
            <div v-if="slotProps.isCardLayout" :class="slotProps.class" data-card-header="update">Actions</div>
        </template>
        <!-- Forward any slots a model-specific wrapper passes down. -->
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </view-list>
</template>
```

`LinkModelView` accepts `view="read"` (which resolves to the server `retrieve` action) and `view="update"` directly. Its `useLinkModelView` machinery enables the link only when a primary key is present, which the row always supplies, so no extra gating is needed. The default header is the start-cased column name; the `header(<columnName>)` override above gives the synthetic column a sensible label in the card layout (below `tableBreakpoint`).

### Step 2: Opt in per model through config

A model gets the link by listing the action name as a column in its list `displayFields`. Place it wherever you want the column to appear.

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

export function setupModelConfig(pinia) {
    storeModelConfig(pinia).setConfig(
        { app: "myapp", model: "widget" },
        {},
        {
            list: {
                displayFields: ["update", "name", "status", "category"],
            },
        },
    );
}
```

The `update` column renders with the start-cased label "Update" and an empty value that `DefaultViewList`'s slot fills. Do not add `update` to `fetchFields`; it is not a real field and nothing fetches it.

::: warning
**Register overrides at bootstrap, before the first CRUD navigation.** Call `setupModelConfig(pinia)` from your entry point (`main.js`), not from inside a view's `setup`. The `requireModelInfo` route guard builds and caches each model's config the first time that model is navigated to. `setConfig` records your override and clears the built config, but it does not re-trigger an already-mounted `ViewList`, and a completed `getConfig` promise is still cached, so a late `setConfig` is silently ignored for that model. Registering at bootstrap guarantees the first built config already includes the override.
:::

### Step 3 (optional): Link an existing column in a model-specific view

When a model wants more than the shared default, add `View<Action><App><Model>.vue`. Wrap `DefaultViewList` so it inherits the reusable links, then override only what is specific to this model. A common case is turning an existing column (a name or title) into a link to the row's `read` view:

```vue
<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";

import DefaultViewList from "@/views/DefaultViewList.vue";

defineProps({
    app: { type: String, required: true },
    model: { type: String, required: true },
});
defineOptions({ inheritAttrs: false });
</script>

<template>
    <default-view-list v-bind="{ ...$props, ...$attrs }">
        <template #[`field(name)`]="{ pk, formatted }">
            <link-model-view :app="app" :model="model" :pk="pk" view="read">
                {{ formatted }}
            </link-model-view>
        </template>
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </default-view-list>
</template>
```

Wrapping `DefaultViewList` rather than `ViewList` is what keeps the layers composable: this view still gets the synthetic `update`/`read` columns from Step 1, and only adds the existing-column link. Point the existing-column link at a different view than your synthetic column (for example, name to `read` while the synthetic column handles `update`) so the two affordances stay distinct rather than duplicating one target.

## Notes and Constraints

- A synthetic action column is not a server field: it is never fetched, and it is not sortable (sortables come from the viewset's ordering fields).
- If `allowColumnHiding` is enabled, the synthetic column appears in the column selector like any other column. Users can hide it.
- The link respects action availability only as far as you wire it. Hiding the `update`/`retrieve` action from `actions` removes the detail view's buttons, but a hand-placed `LinkModelView` still renders. If a row should not be editable, gate the slot yourself (for example, with `v-if`) or rely on the route guard and server permission checks, which still apply when the link is followed.
- `LinkModelView` renders an anchor by default; pass the `button` prop for a button-styled control. It renders both its `label` prop and its default slot, so the synthetic-column form (`label="Edit"`) and the existing-column form (slot content) both work.

## Verification Checklist

- The synthetic column appears in the list with the expected header and an otherwise empty cell that contains your link.
- Clicking the link navigates to the correct row's `read` or `update` view (the URL contains the row's primary key).
- The column is not sent in the list fetch request (confirm `update`/`read` is absent from `fetchFields`).
- In card layout, the column renders with a sensible label (override `header(<columnName>)` if needed).
- A model-specific wrapper still shows the inherited synthetic columns, confirming it wraps `DefaultViewList` rather than `ViewList`.

## Relevant Implementation Surface

- Vue.js Components:
    - {@api vue:component:ViewList}
    - {@api vue:component:LinkModelView}
- JavaScript:
    - {@api js:function:@arrai-innovations/vueda/use/useLinkModelView#useLinkModelView}
    - {@api js:module:@arrai-innovations/vueda/use/useViewList}
    - {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}
- Related guides:
    - [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views)
    - [Control Action Availability in the UI](./control-action-availability)
    - [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model)
