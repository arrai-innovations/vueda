---
title: Customize List Column Rendering
type: how-to
audience: integrator
status: draft
---

# Customize List Column Rendering

This guide covers how to control how individual `list` columns render, without forking {@api vue:component:ViewList} or the grid cells beneath it. VUEDA derives a type-aware **column adapter** for each column from the same server metadata that drives form widgets, and lets you override that choice through three surfaces (model config, per-instance view props, and a per-column slot) with a defined precedence order.

This is the `list`-side companion to [Customize Field and Widget Rendering](./custom-field-widget-rendering), which covers form and filter surfaces. The mechanics are deliberately parallel: a type-derived default, the same three override surfaces, and string-keyed component references. It builds on [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views) and assumes a working CRUDL surface (see [Create a CRUDL Surface](./create-crudl-surface)).

If you want to link a row to its **own** `read`/`update` view (an "Edit"/"View" affordance per row), that is a different task covered in [Link List Rows to Read and Update Views](./link-list-rows-to-detail-views). This guide is about how a column's **value** renders, including auto-linking a foreign-key column to the _related_ model's detail view. The two are complementary, see [Column Links Versus Row Links](#column-links-versus-row-links) below.

## Goal and Preconditions

The objective is a column rendering that:

- Replaces the default plain-text cell for specific columns without modifying the grid.
- Uses the correct override surface for the scope of the change (model-wide config vs. per-view props vs. per-column slot).
- Receives the column's full cell context (value, formatted value, row object, primary key, field metadata) so it can render richly.

Before you begin, you have a model with a canonical registration and a working `list` view. Default columns render as text out of the box, so verify the list renders before introducing overrides.

## How Default Columns Are Chosen

Every `list` column renders through a **column adapter**: a small component that receives the grid cell's value-slot props and decides what to draw. VUEDA ships six:

- `ColumnText` is the universal fallback. It renders the cell's pre-formatted value as plain text, reproducing the historical cell output. Object and array values (an inlined related object, or a range) render as compact JSON rather than `[object Object]`.
- `ColumnDateTime` wraps {@api vue:component:DateTimeDisplay} for date, time, and datetime columns.
- `ColumnBoolean` wraps {@api vue:component:BooleanDisplay} to word a boolean column Yes or No.
- `ColumnDuration` wraps {@api vue:component:DurationDisplay} to name a duration column's units.
- `ColumnJson` wraps {@api vue:component:JsonDisplay} to render a `JSON` column compact and in the mono stack, truncated past `maxLength` (200 characters by default).
- `ColumnModelLink` wraps {@api vue:component:LinkModelView} to render a foreign-key column as a link to the related row's detail view.

The default adapter for a column is derived from the column's serializer field type, using the same metadata flow as form widgets. The mapping table lives in `columnMappings` (the `list`-column analogue of `fieldMappings`), keyed by `typeSerializer` then `typeModel`:

| Serializer type          | Model type                     | Adapter           | Default props                                              |
| ------------------------ | ------------------------------ | ----------------- | ---------------------------------------------------------- |
| `BooleanField`           | `BooleanField`                 | `ColumnBoolean`   |                                                            |
| `NullBooleanField`       | `NullBooleanField`             | `ColumnBoolean`   |                                                            |
| `DateField`              | `DateField`                    | `ColumnDateTime`  | `{ showTime: false }`                                      |
| `DateTimeField`          | `DateTimeField`                | `ColumnDateTime`  | `{ showTime: true }`                                       |
| `TimeField`              | `TimeField`                    | `ColumnDateTime`  | `{ format: "t", showRelative: false, showTooltip: false }` |
| `DurationField`          | `DurationField`                | `ColumnDuration`  |                                                            |
| `DurationSecondsField`   | `DurationField`                | `ColumnDuration`  |                                                            |
| `JSONField`              | `JSONField`                    | `ColumnJson`      |                                                            |
| `PrimaryKeyRelatedField` | `ForeignKey` / `OneToOneField` | `ColumnModelLink` | `{ view: "read" }`                                         |

Any type with no entry falls back to `ColumnText`, so columns you do not configure render exactly as before. This makes the whole system additive: adopting it changes nothing until a column matches a mapping or you configure an override.

::: info
Many relations (`ManyToManyField` / `ManyRelatedField`) and `SlugRelatedField` are intentionally **not** mapped. A many-relation list value is an array of bare primary keys with no labels, so `ColumnText` renders it as compact JSON rather than a misleading single link. See [Many Relations and Slug Relations](#many-relations-and-slug-relations).
:::

## Override Surface Selection

Four sources resolve a column's adapter, evaluated highest precedence first:

1. **A consumer `field(<name>)` slot** on `<ViewList>` (or a wrapper like `DefaultViewList`). A slot you provide always wins; VUEDA injects the resolved adapter only as the _default_ content of that slot.
2. **The `columnComponents` prop** on `<ViewList>` (per-instance, programmatic).
3. **`modelConfig.config.columnComponents[<name>]`** (model-wide, via `setConfig`). The preferred surface for behavior that should be consistent across views.
4. **The type default** from `columnMappings`, else `ColumnText`.

Choose the narrowest scope that achieves the goal. For a model-wide rule (always render `category` as a link), use model config. For a view-specific tweak, use the per-instance prop. For a one-off layout change on a single view, use the slot.

`columnProps` layers separately and additively, lowest to highest: the type-default `columnProps`, then `modelConfig.config.columnProps[<name>]`, then the `columnProps` prop. So you can keep the default adapter and only adjust its props (for example, turn off the relative-time tooltip on a datetime column).

## Component Registration Strategy

Override entries accept the same three value shapes as the form override chain:

**Direct component reference** passes a Vue component object. The most straightforward approach:

```js
import ColumnStatusBadge from "./ColumnStatusBadge.vue";

modelConfigStore.setConfig({ app: "myapp", model: "widget" }, { columnComponents: { status: ColumnStatusBadge } });
```

**String key** references a built-in adapter from the `availableColumns` registry by name (`"ColumnText"`, `"ColumnBoolean"`, `"ColumnDateTime"`, `"ColumnDuration"`, `"ColumnJson"`, `"ColumnModelLink"`). Use this to apply a built-in adapter to a column that would not get it by type, or with different props:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "widget" },
    {
        columnComponents: { release_date: "ColumnDateTime" },
        columnProps: { release_date: { showTime: false, format: "yyyy-LL-dd" } },
    },
);
```

**Factory function** returns a component dynamically (`() => MyComponent`), for conditional selection.

An unknown string key resolves to nothing and falls through to the next surface (ultimately `ColumnText`), rather than erroring. Pass a direct component reference when you want a missing-component mistake to be obvious.

## Custom Column Component Contract

A column adapter is an ordinary component that receives the grid cell's value-slot props. These are the public contract, identical for table and card layouts:

`field`, `value`, `formatted`, `obj`, `relatedObj`, `calculatedObj`, `pk`, `pkKey`, `rowIndex`, `columnIndex`, `rowCount`, `columnCount`, `isTableLayout`, `isCardLayout`, plus any `fieldProps` the grid carries (which include `modelInfo` and `modelConfig`). Your resolved `columnProps` are merged on top of these.

A few conventions keep custom adapters well-behaved:

- **Declare only the props you consume**, and set `defineOptions({ inheritAttrs: false })`. The cell passes many context props; without `inheritAttrs: false`, the ones you do not declare leak onto your root element as DOM attributes. All three built-in adapters do this.
- `value` is the raw field value; `formatted` is the server/grid pre-formatted string. `pk` is the **row's** primary key, not a foreign-key target. (`ColumnModelLink` derives the target pk from `value`, not `pk`, for exactly this reason.)
- Render a sensible empty state. `ColumnText` renders an empty string for nullish values; `DateTimeDisplay`, `BooleanDisplay`, `DurationDisplay`, and `JsonDisplay` render a dash.

A minimal custom adapter:

```vue
<script setup>
defineOptions({ inheritAttrs: false });
defineProps({
    value: { type: [String, Number], default: "" },
    formatted: { type: [String, Number], default: "" },
});
</script>

<template>
    <span :class="value >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatted }}</span>
</template>
```

## The Built-in Adapters

### ColumnDateTime

Wraps {@api vue:component:DateTimeDisplay}, binding the cell's raw `value` and forwarding display configuration from `columnProps`. Props: `format` (default `"absolute"`, which reads better than the inline default in a dense table), `showTime`, `showRelative`, `showTooltip`, `tooltipFormat`, `inline`. The `columnMappings` defaults already pick sensible values per type (date columns hide the time; time columns drop the date-relative tooltip); override through `columnProps` when a specific column needs different formatting.

### ColumnModelLink

Wraps {@api vue:component:LinkModelView} to render a foreign-key column as a link to the related row's detail view. It owns the target/pk/label resolution and the no-link guard that list views used to repeat by hand. Resolution order:

- **Target model:** the field's own `appLabel`/`model` (populated by the server for relation fields), then `app`/`model` supplied through `columnProps`, then no link.
- **Target pk:** a scalar `value` is the pk; an object `value` uses `value.id ?? value.pk`.
- **Label:** an explicit `label` prop, then `formatted`, then `value.formatted_name`/`.name`/`.id`/`.pk`, then `value`.
- **Guard:** when no target model or no pk resolves (or the value is an array), it degrades to plain label text with no link.

Props: `view` (default `"read"`), `app`/`model` (fallback target when the field omits it), `label`, `button`.

For **writable** foreign keys, the server already emits the related model's `app_label`/`model` in `model_fields`, so `ColumnModelLink` links them with zero configuration. If a column does not link (the server did not supply the target, for example a read-only relation on an older server), supply the target through `columnProps`:

```js
modelConfigStore.setConfig(
    { app: "myapp", model: "widget" },
    { columnProps: { category: { app: "myapp", model: "widgetcategory" } } },
);
```

## Slot Overrides

A consumer `field(<name>)` slot replaces a column's content entirely and takes precedence over every resolved adapter. This is the same slot used throughout the list guides:

```vue
<template #[`field(sku)`]="{ value, obj }">
    <code>{{ value }}</code>
    <span v-if="obj.is_active" class="ml-2 text-green-600">active</span>
</template>
```

VUEDA injects the resolved adapter as the _default_ content of each `field(<name>)` slot, so providing your own slot simply overrides that default. Injection covers both the table body cell and the card cell, because {@api vue:component:ObjectsGrid} maps `field(<name>)` into both.

## Column Links Versus Row Links

These two affordances are easy to confuse, so be deliberate about which you want:

- **`ColumnModelLink` (this guide)** links a foreign-key column to the **related** model's detail view. The `category` column on a widget list links to _that category's_ `read` page. It is automatic for writable foreign keys.
- **Row self-links** ([Link List Rows to Read and Update Views](./link-list-rows-to-detail-views)) link a row to **its own** `read`/`update` view, using `detailLinkField` on an existing identifying column, or a hand-placed {@api vue:component:LinkModelView} for custom content. The row's `name` column links to _that widget's own_ `read` page.

They compose cleanly: a widget list can auto-link its `category`/`supplier` foreign-key columns (column links) while also linking its `name` column to the widget's own detail view (a configured row link). A `ColumnModelLink` or custom adapter is not wrapped by `detailLinkField`; its existing controls keep their behavior. Explicit field slots also retain precedence.

## Edge Cases

### Many Relations and Slug Relations

Many relations (`ManyToManyField`) and `SlugRelatedField` are not mapped to an adapter. A many-relation list value, when not expanded, is an array of bare primary keys (`[2, 1]`) with no per-item labels and no stable order, so a single link would be wrong and per-item links would show only numbers. `ColumnText` renders the array as compact JSON instead. If you need linked items, expand the relation so each item is an object with a label, then provide a custom adapter through `columnComponents`.

### Object and JSON Columns

A `JSONField` column resolves to `ColumnJson`, which renders compact `JSON` in the mono stack and truncates past `maxLength`. A read view indents the same value over several lines through `WidgetJsonReadOnly`; a cell has one line, so the two differ in layout while printing the same `JSON`.

A column whose value is an inlined object (an expanded relation rendered directly) or a range has no type-specific adapter, so it falls back to `ColumnText`, which renders compact JSON, truncated when very large. Provide a custom adapter when such a column needs structured rendering.

### Server Metadata Availability

Auto-linking depends on the server emitting the related model's `app_label`/`model` for the relation field. Writable foreign keys carry it; read-only relations carry it on current servers but may not on older ones. When the target is absent, `ColumnModelLink` degrades to text. Supply `columnProps: { <col>: { app, model } }` as the explicit fallback. This affects only the rendered link; it is not an authorization control. The target view still enforces its own route guard and server permissions when the link is followed.

## Verification Checklist

After configuring column overrides, verify:

- The column renders with the expected adapter in both table and card layouts (resize below `tableBreakpoint` to confirm the card cell).
- A configured foreign-key column links to the correct related row (the URL contains the related row's primary key), and renders as plain text when the value is empty.
- Date/time columns render with the intended format and empty values render a dash.
- A consumer `field(<name>)` slot still overrides the resolved adapter where you provide one.
- Columns you did not configure are unchanged from the plain-text default.

## Troubleshooting

**A foreign-key column renders text, not a link.** The related model's target is not resolving. Confirm the server emits `app_label`/`model` for that field in `model_fields`, or supply `columnProps: { <col>: { app, model } }`. Also confirm the value is a scalar pk or an object with `id`/`pk`; an array value (a many relation) intentionally does not link.

**An override has no effect.** Check the column name matches the field name exactly, and that no higher-precedence surface is also set (a consumer `field(<col>)` slot beats the `columnComponents` prop, which beats model config). Register `setConfig` overrides at bootstrap, before the first CRUD navigation, for the same reason described in the [row-link guide](./link-list-rows-to-detail-views#opt-in-through-model-config).

**A string-keyed adapter is ignored.** The key must match a registered adapter name exactly (`"ColumnText"`, `"ColumnBoolean"`, `"ColumnDateTime"`, `"ColumnDuration"`, `"ColumnJson"`, `"ColumnModelLink"`). An unknown key silently falls through to the type default. Pass a direct component reference for a custom adapter.

**Surplus attributes appear on a custom adapter's root element.** Add `defineOptions({ inheritAttrs: false })` and declare only the cell props you consume.

## Relevant Implementation Surface

- Vue.js Components:
    - {@api vue:component:ViewList}
    - {@api vue:component:DateTimeDisplay}
    - {@api vue:component:LinkModelView}
    - {@api vue:component:ObjectsGridBodyCell}
    - {@api vue:component:ObjectsGridCardCell}
- JavaScript:
    - {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList}
    - {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}
    - {@api js:interface:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig}
- Related guides:
    - [Customize Field and Widget Rendering](./custom-field-widget-rendering)
    - [Link List Rows to Read and Update Views](./link-list-rows-to-detail-views)
    - [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views)
