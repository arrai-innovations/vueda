---
title: ObjectsGrid
status: brainstorming
audience: designer
type: reference
---

<script setup>
import ObjectsGrid from "@vueda/objects-grid/ObjectsGrid.vue";
import Button from "@vueda/controls/button/Button.vue";
import FieldPickerMenuList from "@vueda/display/field-picker/FieldPickerMenuList.vue";
import TabularInlineDemo from "../../.vitepress/theme/components/TabularInlineDemo.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faEllipsis, faPen } from "@fortawesome/free-solid-svg-icons";
import { ref } from "vue";

const pickerFields = [
    "Name", "Slug", "SKU", "Category", "Supplier", "Unit Price", "Weight", "Warranty Period",
    "Is Active", "Release Date", "Created At", "Updated At",
].map((label) => ({ label, value: label }));
const pickedField = ref("");

const fields = [
    { name: "account", label: "Account" },
    { name: "owner", label: "Owner" },
    { name: "status", label: "Status" },
    { name: "updated", label: "Updated" },
    { name: "mrr", label: "MRR" },
    { name: "actions", label: "" },
];

const compactFields = fields.slice(0, 5);

const accounts = [
    { id: 1, account: "Northwind Logistics", owner: "Mara Tani", status: "Active", statusTone: "primary", updated: "2026-04-26 14:08", mrr: "$14,028.50", initials: "NL" },
    { id: 2, account: "Acme Coffee Roasters", owner: "Jordan Reyes", status: "Renewed", statusTone: "warning", updated: "2026-04-26 09:42", mrr: "$2,440.00", initials: "AC" },
    { id: 3, account: "Hightower Mfg.", owner: "Priya Subramanian", status: "At risk", statusTone: "primary", updated: "2026-04-25 17:15", mrr: "$8,915.20", initials: "HM" },
    { id: 4, account: "Pemberton & Vale", owner: "Linnea Borg", status: "Trial", statusTone: null, updated: "2026-04-25 11:02", mrr: "$612.00", initials: "PV" },
];

const statusClasses = {
    primary: "border-primary/30 bg-primary/10 text-primary-text",
    warning: "border-warning/40 bg-warning/10 text-warning",
};

</script>

# ObjectsGrid

::: tip Which table to use
For a table-like list that breaks down into cards on narrow screens, use ObjectsGrid. For a native HTML table that keeps its table layout at every width, use the [Tables](tables.md) primitives.
:::

This page shows the {@term Visual Contract} of {@api vue:component:ObjectsGrid}, the responsive object list that {@api vue:component:ViewList} and {@api vue:component:FieldSetTabularInline} render their rows through. It also covers the grid's cell components: {@api vue:component:ObjectsGridTableHeader}, {@api vue:component:ObjectsGridBodyCell}, {@api vue:component:ObjectsGridCardCell}, {@api vue:component:ObjectsGridBodyCellSkeleton}, and {@api vue:component:ObjectsGridCardCellSkeleton}. [Components](index.md) describes the rules every component page shares.

## Layout switch

One ObjectsGrid renders the same rows and fields in two layouts: a table at or above its [`tableBreakpoint`]{@api vue:component:ObjectsGrid:prop:tableBreakpoint}, and a grid of cards below it. The default breakpoint is `lg`.

- The switch follows the viewport width, so a grid in a narrow container still renders a table on a wide viewport.
- Breakpoint names come from {@api js:property:@arrai-innovations/vueda/utils/breakpoints#breakpointsVueda}, from `2xs` to `inf`.
- `xs` always renders the table. `inf` keeps cards at any practical viewport width.
- The grid emits [`update:isTable`]{@api vue:component:ObjectsGrid:event:update:isTable} on mount and on every switch, with `true` for the table layout.

`ViewList` passes its own [`tableBreakpoint`]{@api vue:component:ViewList:prop:tableBreakpoint} to the grid. [CRUD Views](views-crud.md) describes the list chrome around the grid.

Both layouts render `div` elements with ARIA table, row, and cell roles.

## Table layout

- **Surface:** the root ({@api theme-key:ObjectsGrid.root}) carries the card fill in both layouts. In table layout it also carries the radius and {@term Hairline} edge that close the last row. A wide table scrolls sideways inside the root.
- **Embedded grids:** an ancestor marked `data-flush` removes the root's radius and edge, so the parent draws the only frame. `FieldSetTabularInline` works this way. `ViewList` removes them through its own {@api theme-key:ViewList.objectsGrid} key, so its strips above and below frame the grid.
- **Header:** header cells ({@api theme-key:ObjectsGrid.headerCell}, with content from {@api theme-key:ObjectsGridTableHeader}) show the field label and are display-only. Sorting uses the {@api vue:component:SortControl} menu and the active sort chips outside the grid.
- **Dividers:** a hairline on each row's cells divides that row from the next one. The same hairline divides the header band from the first data row. The root edge closes the grid below the last row. {@api theme-key:ObjectsGrid.table} fills the root.
- **Row height:** body cells ({@api theme-key:ObjectsGridBodyCell.root}) set row height from the [`density`]{@api vue:component:ObjectsGrid:prop:density} prop: `default`, `compact`, or `condensed`, each tighter than the last. A table cell treats that height as a minimum, so a row holding a chip or an avatar renders taller.
- **Numbers:** the grid renders numbers with tabular figures. A field descriptor with `numeric: true` right-aligns its header and cells.

The demo forces table mode with `tableBreakpoint="xs"`.

<VuedaDemo class="flex flex-col gap-3">
  <header class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
    <span class="font-semibold uppercase tracking-wide">table layout · populated</span>
    <span class="font-mono">headers: display-only</span>
  </header>
  <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
    <ClientOnly>
      <ObjectsGrid :objects-in-order="accounts" :fields="fields" table-breakpoint="xs" :field-props="{ statusClasses }">
        <template #[`field(account)`]="{ obj, formatted }">
          <span class="inline-flex min-w-0 items-center gap-2">
            <span class="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-border bg-muted font-mono text-[10px] font-semibold text-muted-foreground">{{ obj.initials }}</span>
            <span class="truncate">{{ formatted }}</span>
          </span>
        </template>
        <template #[`field(status)`]="{ obj, statusClasses }">
          <span :class="['inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusClasses[obj.statusTone] ?? 'border-border bg-muted text-muted-foreground']">{{ obj.status }}</span>
        </template>
        <template #[`field(actions)`]>
          <span class="inline-flex gap-1">
            <Button size="icon-sm" emphasis="ghost" aria-label="Edit"><FontAwesomeIcon :icon="faPen" /></Button>
            <Button size="icon-sm" emphasis="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button>
          </span>
        </template>
      </ObjectsGrid>
    </ClientOnly>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span class="whitespace-nowrap">header: <code>ObjectsGridTableHeader</code></span>
    <span class="whitespace-nowrap">cells: <code>ObjectsGridBodyCell</code>, height by density</span>
    <span class="whitespace-nowrap">dividers: on each row's cells</span>
    <span class="whitespace-nowrap">sorting: driven by toolbar controls outside the grid</span>
  </footer>
</VuedaDemo>

## Card layout

Below `tableBreakpoint`, each row renders as a card.

- **Card:** the row ({@api theme-key:ObjectsGrid.bodyRow}) carries the card fill, radius, and edge. It is the only edge in this layout; the root keeps its fill and drops its edge.
- **Card grid:** cards flow into more columns as the viewport widens ({@api theme-key:ObjectsGrid.bodyRowGroup}). To set a different column count, override `bodyRowGroup` with a {@term Theme Override} or a theme patch.
- **Fields:** inside a card, {@api theme-key:ObjectsGrid.cardContainer} aligns the fields into a label column and a value column. The label comes from {@api theme-key:ObjectsGridCardCell.header} and the value from {@api theme-key:ObjectsGridCardCell.value}.
- **Header band:** each card labels its own fields, so the header row group is hidden.

The demo uses `tableBreakpoint="inf"` so the cards show at every practical viewport width. It also removes the three-column step with a theme override, because the demo sits in a column narrower than the viewport.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">card layout · same rows and fields</header>
  <ClientOnly>
    <ObjectsGrid :objects-in-order="accounts.slice(0, 3)" :fields="compactFields" table-breakpoint="inf" :field-props="{ statusClasses }" :theme-override="{ ObjectsGrid: { bodyRowGroup: { class: { 'lg:grid-cols-3': false } } } }">
      <template #[`field(account)`]="{ obj, formatted }">
        <span class="inline-flex min-w-0 items-center gap-2">
          <span class="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-border bg-muted font-mono text-[10px] font-semibold text-muted-foreground">{{ obj.initials }}</span>
          <span class="truncate">{{ formatted }}</span>
        </span>
      </template>
      <template #[`field(status)`]="{ obj, statusClasses }">
        <span :class="['inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusClasses[obj.statusTone] ?? 'border-border bg-muted text-muted-foreground']">{{ obj.status }}</span>
      </template>
    </ObjectsGrid>
  </ClientOnly>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span class="whitespace-nowrap">card edge: <code>bodyRow</code></span>
    <span class="whitespace-nowrap">field label: <code>ObjectsGridCardCell.header</code></span>
    <span class="whitespace-nowrap">field value: <code>ObjectsGridCardCell.value</code></span>
  </footer>
</VuedaDemo>

## Row states

{@api theme-key:ObjectsGrid.bodyRow} styles each row in both layouts. A row takes its state from a `data-state` attribute, which the [`rowAttrs`]{@api vue:component:ObjectsGrid:prop:rowAttrs} function can set per row.

- **Hover and press:** the row takes an accent tint.
- **`selected`:** a low primary tint and a primary rail on the leading edge, so a selected row stays distinct from a hovered one.
- **`marked-destroy`:** a destructive tint and a strikethrough on every field except the `item-action-bar` column, so its undo control stays readable. `FieldSetTabularInline` sets it on rows that the user marks for removal.

{@api theme-key:ObjectsGrid.rowActions} provides classes for row controls that a consumer places in a cell. The container stays hidden at rest and shows when the pointer is over the row, the row holds focus, or the row is selected. Its `action` class styles compact icon buttons. Apply both classes in your cell content.

## Loading and empty

When [`loading`]{@api vue:component:ObjectsGrid:prop:loading} is true and the grid has no rows, it renders [`skeletonRows`]{@api vue:component:ObjectsGrid:prop:skeletonRows} rows of skeleton cells, one per field. {@api js:function:@arrai-innovations/vueda/utils/objectGridSkeletonClass#getSkeletonClassForField} sizes each skeleton by field type, and a field descriptor's `skeletonClass` replaces that size. A grid that already has rows keeps them on screen while it loads.

When the grid has no rows and is not loading, it renders one empty-state row:

- **Width:** the row spans the full width in both layouts. In table layout its cell is a `td` with `colspan` ({@api theme-key:ObjectsGrid.emptyText}); in card layout the row spans the card grid.
- **Default content:** an icon and the [`emptyText`]{@api vue:component:ObjectsGrid:prop:emptyText} prop as the title, laid out by {@api theme-key:ObjectsGrid.emptyContent}. The icon comes from the {@term Icon Registry} entry for `ObjectsGrid`, keyed by the variant.
- **Variants:** [`emptyVariant`]{@api vue:component:ObjectsGrid:prop:emptyVariant} is `empty`, `filtered`, `loading`, or `error`. It sets `data-variant` on the content, and the theme spins the icon for `loading` and colors it destructive for `error`.
- **Custom content:** the [`empty`]{@api vue:component:ObjectsGrid:slot:empty} slot replaces the icon and title. It receives `variant`.
- **No row:** `:empty-text="null"` removes the empty-state row unless you pass an `empty` slot. Inline grids embedded in forms use this.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="table skeletons">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid loading :skeleton-rows="3" :objects-in-order="[]" :fields="compactFields" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="card skeletons">
    <ClientOnly>
      <ObjectsGrid loading :skeleton-rows="2" :objects-in-order="[]" :fields="compactFields" table-breakpoint="inf" :theme-override="{ ObjectsGrid: { bodyRowGroup: { class: { 'sm:grid-cols-2': false, 'lg:grid-cols-3': false } } } }" />
    </ClientOnly>
  </DemoCard>
  <DemoCard title="empty: first run">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="No accounts yet." table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="filtered: no matches">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="No accounts match the current filters." empty-variant="filtered" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="loading: spinner and message">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="Loading accounts…" empty-variant="loading" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="error: destructive icon">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="Could not load accounts." empty-variant="error" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
</VuedaDemo>

## Tabular inline editing

`FieldSetTabularInline` embeds an editable ObjectsGrid in its own fieldset. The fieldset draws the outer edge and the separator above help and validation messages, so it is the only frame around the grid. Below its breakpoint (`lg` by default), the rows switch to cards.

<VuedaDemo>
  <DemoCard title="tabular inline contacts">
    <ClientOnly>
      <TabularInlineDemo />
    </ClientOnly>
    <template #footer>
      <span>one fieldset frame, with a single separator above the help panel</span>
      <span>edit or add contacts; changes stay in the demo</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Field picker menus

The sort and filter add-menus (`SortControl` and {@api vue:component:FilterMenu}) list their available fields with {@api vue:component:FieldPickerMenuList}. The list has a capped height ({@api theme-key:FieldPickerMenuList.list}). A list longer than the cap keeps its scrollbar visible before any hover or scroll; a shorter list fits its content with no scrollbar. The same list appears in the desktop popover and the mobile dialog.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="long field list">
    <FieldPickerMenuList :items="pickerFields" eyebrow="Add sort" @pick="pickedField = $event" />
    <template #footer>
      <span>scrollbar stays visible while fields overflow</span>
      <span>{{ pickedField ? `Picked: ${pickedField}` : "Pick any field" }}</span>
    </template>
  </DemoCard>
  <DemoCard title="short field list">
    <FieldPickerMenuList :items="pickerFields.slice(0, 3)" eyebrow="Add sort" @pick="pickedField = $event" />
    <template #footer>
      <span>no scrollbar when all fields fit</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Theme keys and class props

Theme keys change every grid:

- {@api theme-key:ObjectsGrid}: `root`, `table`, `headerRowGroup`, `headerRow`, `headerCell`, `bodyRowGroup`, `bodyRow`, `cardContainer`, `emptyText`, `emptyContent`, and `rowActions` (`root` and `action`).
- {@api theme-key:ObjectsGridTableHeader}: `root` and `label`.
- {@api theme-key:ObjectsGridBodyCell}: `root`, plus a nested {@api theme-key:WidgetLabel} override for widget labels inside table cells.
- {@api theme-key:ObjectsGridCardCell}: `header` and `value`.

Class props change one grid, keyed by field name: [`fieldClasses`]{@api vue:component:ObjectsGrid:prop:fieldClasses}, [`tableFieldClasses`]{@api vue:component:ObjectsGrid:prop:tableFieldClasses}, and [`cardFieldClasses`]{@api vue:component:ObjectsGrid:prop:cardFieldClasses} style cells; [`headerClasses`]{@api vue:component:ObjectsGrid:prop:headerClasses}, [`tableHeaderClasses`]{@api vue:component:ObjectsGrid:prop:tableHeaderClasses}, and [`cardHeaderClasses`]{@api vue:component:ObjectsGrid:prop:cardHeaderClasses} style labels. The unprefixed prop applies in both layouts; the `table` and `card` props apply in one. Use them to tune a numeric column, an action column's width, or a compact field in one grid.
