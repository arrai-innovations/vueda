---
title: Customize List Column Rendering
type: how-to
audience: integrator
status: draft
---

# Customize List Column Rendering

This guide shows how to change the component that renders a column's cells in {@api vue:component:ViewList}, change the props it receives, or write your own. Columns you leave alone keep their defaults.

Each cell renders through a {@term Column Adapter}. [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui#configuration-precedence) describes how model config and view props combine in general. This guide gives the order for list columns.

To link a row to its own read or update view, use a {@term Row Link}. [Link List Rows to Read and Update Views](./link-list-rows-to-detail-views) describes it, including which adapters it wraps.

## Before You Start

- The model has a {@term Canonical Registration} with a working `list` view ([Create a CRUD Surface](./create-crud-surface)). Check that the list renders before you add overrides.
- You know the field name of each column you want to change. Overrides are keyed by field name.

## How Default Columns Are Chosen

VUEDA picks each column's default adapter in {@api js:property:@arrai-innovations/vueda/utils/columnMappings#columnMappings}. It looks up the field's [`typeSerializer`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeSerializer}, then its [`typeModel`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.typeModel}:

| Serializer type          | Model type                     | Adapter                              | Default props                                              |
| ------------------------ | ------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| `BooleanField`           | `BooleanField`                 | {@api vue:component:ColumnBoolean}   |                                                            |
| `NullBooleanField`       | `NullBooleanField`             | `ColumnBoolean`                      |                                                            |
| `DateField`              | `DateField`                    | {@api vue:component:ColumnDateTime}  | `{ showTime: false }`                                      |
| `DateTimeField`          | `DateTimeField`                | `ColumnDateTime`                     | `{ showTime: true }`                                       |
| `TimeField`              | `TimeField`                    | `ColumnDateTime`                     | `{ format: "t", showRelative: false, showTooltip: false }` |
| `DurationField`          | `DurationField`                | {@api vue:component:ColumnDuration}  |                                                            |
| `DurationSecondsField`   | `DurationField`                | `ColumnDuration`                     |                                                            |
| `JSONField`              | `JSONField`                    | {@api vue:component:ColumnJson}      |                                                            |
| `PrimaryKeyRelatedField` | `ForeignKey` / `OneToOneField` | {@api vue:component:ColumnModelLink} | `{ view: "read" }`                                         |

Every other type renders through {@api vue:component:ColumnText}. That includes to-many relations and `SlugRelatedField`.

The adapters render as follows:

- `ColumnText` renders the cell value as text. It renders nothing for `null` or `undefined`. It renders an object or array as compact `JSON`, cut at 200 characters.
- `ColumnBoolean` renders {@api vue:component:BooleanDisplay}: "Yes" or "No".
- `ColumnDateTime` renders {@api vue:component:DateTimeDisplay}.
- `ColumnDuration` renders {@api vue:component:DurationDisplay}, which names the units.
- `ColumnJson` renders {@api vue:component:JsonDisplay}: compact `JSON` on one line, cut at `maxLength` (200 characters by default).
- `ColumnModelLink` renders a foreign key as a link to the related row's read view, through {@api vue:component:LinkModelView}.

`BooleanDisplay`, `DateTimeDisplay`, `DurationDisplay`, and `JsonDisplay` render a dash for an empty value.

## Choose Where to Override

| To change                                      | Use                                               |
| ---------------------------------------------- | ------------------------------------------------- |
| One column of a model, in every list           | [Model config](#set-an-override-in-model-config)  |
| One column in a `ViewList` you render yourself | [`ViewList` props](#pass-overrides-as-props)      |
| The markup of one column in one rendered list  | [A slot](#replace-a-column-with-a-slot)           |
| Every column of one type, in every model       | [A type mapping](#map-a-field-type-to-an-adapter) |

For one column, the first of these that is set picks the adapter:

1. A `field(<name>)` slot on `ViewList`.
2. The `ViewList` `columnComponents` prop.
3. The model config's `columnComponents`.
4. The type mapping, else `ColumnText`.

Props combine separately, as [Change Only an Adapter's Props](#change-only-an-adapter-s-props) describes.

## Set an Override in Model Config

1. Get the store with {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}.
2. Call [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig} when the application starts. [Register Overrides with `setConfig`](./configure-crud-views#register-overrides-with-setconfig) describes its arguments.
3. In the `list` layer, set [`columnComponents`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.columnComponents} to choose adapters. Set [`columnProps`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#OverridingModelConfig.columnProps} to add props. Key both by field name.

```js
import ColumnStatusBadge from "./ColumnStatusBadge.vue";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

storeModelConfig().setConfig({ app: "myapp", model: "widget" }, null, {
    list: {
        columnComponents: {
            status: () => ColumnStatusBadge,
            release_date: "ColumnDateTime",
        },
        columnProps: {
            release_date: { showTime: false, format: "yyyy-LL-dd" },
        },
    },
});
```

A `columnComponents` entry takes one of three values:

- **A function that returns a component**, such as `() => ColumnStatusBadge`. VUEDA calls it with no arguments. Use this form for your own components. The store keeps its values in reactive state and merges plain objects between layers; the function keeps the component out of both.
- **The name of a built-in adapter** in {@api js:property:@arrai-innovations/vueda/utils/columnLookups#availableColumns}: `"ColumnText"`, `"ColumnBoolean"`, `"ColumnDateTime"`, `"ColumnDuration"`, `"ColumnJson"`, or `"ColumnModelLink"`. Use a name to give a column a built-in adapter that its type does not map to.
- **A component object.** Use this form in the `columnComponents` prop. In model config, wrap the component in a function.

The model-wide layer also applies to the list view. When both layers set `columnComponents`, the list gets the entries of both. For a column that both layers name, the `list` layer wins. `columnProps` merges each column's props across the layers, key by key.

## Pass Overrides as Props

When you render `ViewList` yourself, pass [`columnComponents`]{@api vue:component:ViewList:prop:columnComponents} and [`columnProps`]{@api vue:component:ViewList:prop:columnProps}. They take the same values as the model config keys.

```vue
<template>
    <ViewList app="myapp" model="widget" :column-components="{ category: 'ColumnText' }" />
</template>
```

For the same column, a `columnComponents` prop entry wins over model config. It wins even when it names no adapter. The column then shows the error described in [Troubleshooting](#troubleshooting), even if model config has a valid entry for it.

## Change Only an Adapter's Props

To keep a column's adapter and change how it renders, set only `columnProps`. The adapter receives the type mapping's default props first. The model config's `columnProps` for the column come next, then the `columnProps` prop. A later source wins for the same key.

This hides the time on one datetime column:

```js
storeModelConfig().setConfig({ app: "myapp", model: "widget" }, null, {
    list: { columnProps: { updated_at: { showTime: false } } },
});
```

Each built-in adapter's generated page lists its props. The ones you are most likely to set:

- `ColumnDateTime`: `format` (default `"absolute"`, or a Luxon format string), `showTime`, `showRelative`, `showTooltip`, `tooltipFormat`.
- `ColumnBoolean`: `trueLabel`, `falseLabel`.
- `ColumnDuration`: `format` (default `"long"`).
- `ColumnJson`: `maxLength`.
- `ColumnModelLink`: `view` (default `"read"`), `app` and `model`, `label`, `button`.

## Link a Foreign Key Column

A `ForeignKey` or `OneToOneField` column renders through `ColumnModelLink` with no configuration. It reads the related model from the field's [`appLabel`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.appLabel} and [`model`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FieldInfo.model}. Model info sends both for writable and read-only relation fields.

- **Related pk:** a scalar cell value is the pk. An object value uses its `id`, else its `pk`.
- **Link text:** the `label` prop, else the cell's `formatted` value when it is text or a number. For a scalar foreign key, the text is the pk. For an expanded foreign key, the text is the related object's `formatted_name`, else its `name`, `id`, or `pk`.
- **No link:** when no related model or no pk resolves, or the value is an array, the cell renders the text without a link.

When the field carries no related model, supply one through `columnProps`:

```js
storeModelConfig().setConfig({ app: "myapp", model: "widget" }, null, {
    list: { columnProps: { category: { app: "myapp", model: "widgetcategory" } } },
});
```

The link controls navigation in the UI only. When the user follows it, the target view's route guard and the server still check the user's access.

## Replace a Column with a Slot

A [`field(<name>)`]{@api vue:component:ViewList:slots} slot on `ViewList` replaces the column's content and wins over every adapter. It receives the same props as an adapter ([Write a Column Adapter](#write-a-column-adapter)).

```vue
<template>
    <ViewList app="myapp" model="widget">
        <template #[`field(sku)`]="{ value, obj }">
            <code>{{ value }}</code>
            <span v-if="obj.is_active" class="ml-2 text-green-600">active</span>
        </template>
    </ViewList>
</template>
```

{@api vue:component:ObjectsGrid} renders the slot in both the table cell and the card cell. If you wrap `ViewList` in your own component, forward the slot to `ViewList`.

## Map a Field Type to an Adapter

To change the default for a type in every model, call {@api js:function:@arrai-innovations/vueda/utils/columnMappings#mergeColumnMappings} in your client entry, before the app mounts. It deep-merges your entries into `columnMappings`. The outer key is the `typeSerializer`, and the inner key is the `typeModel`.

This shows times as hours and minutes in every list:

```js
import { mergeColumnMappings } from "@vueda/utils/columnMappings.js";

mergeColumnMappings({
    TimeField: {
        TimeField: { columnProps: { format: "HH:mm" } },
    },
});
```

An entry's [`column`]{@api js:property:@arrai-innovations/vueda/utils/columnMappings#ColumnMappingEntry.column} names an adapter in `availableColumns`, and [`columnProps`]{@api js:property:@arrai-innovations/vueda/utils/columnMappings#ColumnMappingEntry.columnProps} holds its default props. The entry marked [`default`]{@api js:property:@arrai-innovations/vueda/utils/columnMappings#ColumnMappingEntry.default} applies when `typeModel` is empty. A `column` that names no adapter shows the column error described in [Troubleshooting](#troubleshooting) on every column of that type, unless an override sets the column's adapter.

## Write a Column Adapter

An adapter is a Vue component. `ViewList` passes it the cell's slot props, with the column's resolved `columnProps` on top. The table cell and the card cell pass the same props:

- [`value`]{@api vue:component:ObjectsGridBodyCell:slot:value.value}: the field's value in the row.
- [`formatted`]{@api vue:component:ObjectsGridBodyCell:slot:value.formatted}: in a `ViewList` cell, the same value as `value`.
- [`obj`]{@api vue:component:ObjectsGridBodyCell:slot:value.obj}: the row object. [`relatedObj`]{@api vue:component:ObjectsGridBodyCell:slot:value.relatedObj} and [`calculatedObj`]{@api vue:component:ObjectsGridBodyCell:slot:value.calculatedObj} hold the row's related and calculated objects.
- [`pk`]{@api vue:component:ObjectsGridBodyCell:slot:value.pk}: the row's primary key. A foreign key's target pk is in `value`.
- [`field`]{@api vue:component:ObjectsGridBodyCell:slot:value.field}: the column's field descriptor.
- `rowIndex`, `columnIndex`, `rowCount`, `columnCount`, `isTableLayout`, and `isCardLayout`: the cell's position and the current layout.
- `pkKey`, `modelInfo`, and `modelConfig`: the model's pk field name, its {@term Model Info}, and its {@term Model Config}.

Declare only the props you use. Set `inheritAttrs: false` so the others do not become attributes on your root element. The built-in adapters do both.

```vue
<script setup>
defineOptions({ inheritAttrs: false });
defineProps({
    value: { type: Number, default: null },
});
</script>

<template>
    <span v-if="value != null" :class="value >= 0 ? 'text-green-600' : 'text-red-600'">{{ value }}</span>
</template>
```

Register it through a function in model config, or pass it in the `columnComponents` prop.

## Check the Result

- Each changed column renders its adapter in the table layout. Below the list's [`tableBreakpoint`]{@api vue:component:ViewList:prop:tableBreakpoint}, it renders the adapter in the card layout too.
- A foreign key column links to the related row, and its URL carries the related row's pk. An empty value renders without a link.
- Columns you did not change render as before.
- No column error shows above the list.

## Troubleshooting

**The list shows "There was an error while rendering the list columns."** A `columnComponents` entry or a type mapping's `column` does not name an adapter, or a function returned nothing. The message names the column, such as `No column component named "Nope" for column "status"`, and adds `in the type mapping` when the mapping is the cause. That column's cells render empty, and the other columns render normally. Check the name against `availableColumns`, or pass your own component through a function. The error shows even when a `field(<name>)` slot fills the column. A list you build on {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList} gets these errors in [`columnErrors`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListListGroup.columnErrors}.

**The override has no effect.** Check that the key matches the field name exactly. A `field(<name>)` slot wins over both override maps, and a `columnComponents` prop entry wins over model config. A `setConfig` call made after the list has built its config does not reach that list, so call `setConfig` when the application starts.

**A foreign key column renders text without a link.** The value is empty or an array, or no related model resolved. Check the field's `app_label` and `model` in the [model info response]{@api rest:schema:ModelInfoField}. Or supply `app` and `model` through `columnProps`.

**A to-many relation renders as `[2, 1]`.** A to-many relation's list value is an array of pks, and `ColumnText` renders it as `JSON`. To render linked items, expand the relation so each item carries a label, and write an adapter for it.

**Attributes you did not set appear on your adapter's root element.** Add `defineOptions({ inheritAttrs: false })`.
