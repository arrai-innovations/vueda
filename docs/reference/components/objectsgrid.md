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
    primary: "border-primary/30 bg-primary/10 text-primary",
    warning: "border-warning/40 bg-warning/10 text-warning",
};

</script>

# ObjectsGrid

ObjectsGrid is VUEDA's native responsive object list, predating the shadcn-vue Table primitives. It is not a wrapper around the `Table` family. One component renders the same dataset as a table above its `tableBreakpoint` and as label/value cards below it.

This page is the visual contract the default skin guarantees for {@api vue:component:ObjectsGrid}, {@api vue:component:ObjectsGridTableHeader}, {@api vue:component:ObjectsGridBodyCell}, {@api vue:component:ObjectsGridCardCell}, {@api vue:component:ObjectsGridBodyCellSkeleton}, and {@api vue:component:ObjectsGridCardCellSkeleton}. Use it as the target when re-skinning. If a row breaks after a customization, the change has crossed from skin into design language.

For how to change any of this, see [Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). Values belong in [CSS tokens](../theming/tokens.md); compositions belong in [theme keys](../theming/keys.md).

## Table Layout

The root element ({@api theme-key:ObjectsGrid} `root`, default `max-w-full overflow-x-auto`) carries no border or background; those come from the enclosing surface. Header cells use {@api theme-key:ObjectsGridTableHeader} `root` and are display-only; sorting is driven by `SortControl` and active sort chips outside the grid. Body cells use {@api theme-key:ObjectsGridBodyCell} `root`, default `h-[3.5rem] px-1 lg:px-2 align-middle`. The 56 px row height is the legacy source default. Rows divide from each other with a hairline on their cells, and the header band divides from the first data row the same way. The last row drops its divider, so the root edge closes the grid. {@api theme-key:ObjectsGrid} `table` fills the root and uses the separated border model, which does not paint borders on rows or row groups; that is why the dividers sit on cells. The demo forces table mode with `tableBreakpoint="xs"`.

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
    <span class="whitespace-nowrap">cells: <code>ObjectsGridBodyCell</code> · default <code>h-[3.5rem] px-1 lg:px-2</code></span>
    <span class="whitespace-nowrap">dividers: <code>[&amp;>*]:border-b-hairline</code> on each row's cells</span>
    <span class="whitespace-nowrap">sorting: driven by toolbar controls outside the grid</span>
  </footer>
</VuedaDemo>

## Card Layout

Below `tableBreakpoint` the same data renders as a grid of cards. Each row uses {@api theme-key:ObjectsGrid} `bodyRow` for the card border and padding; each field renders a label via {@api theme-key:ObjectsGridCardCell} `header` and a value via `value`. No column count is set by default. Add `grid-cols-x` to `bodyRowGroup` in a theme override to control cards per row. The demo uses `tableBreakpoint="inf"` so cards remain visible at every practical viewport width.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">card layout · same rows and fields</header>
  <ClientOnly>
    <ObjectsGrid :objects-in-order="accounts.slice(0, 3)" :fields="compactFields" table-breakpoint="inf" :field-props="{ statusClasses }">
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
    <span class="whitespace-nowrap">card border: <code>bodyRow</code></span>
    <span class="whitespace-nowrap">field label: <code>ObjectsGridCardCell.header</code></span>
    <span class="whitespace-nowrap">field value: <code>ObjectsGridCardCell.value</code></span>
  </footer>
</VuedaDemo>

The card grid columns are not set by default. Projects supply `grid-cols-x` via `themeOverride` as appropriate for their layout context.

## Loading and Empty

While loading, each cell is replaced by a `Skeleton` sized to its field type: `h-6 w-24` for text, `h-6 w-16` for dates, `h-6 w-full` as the fallback. When there are no rows and loading is false, the empty-state row renders inside {@api theme-key:ObjectsGrid} `emptyContent` — a flex column with an icon (resolved from `useIcons("ObjectsGrid")` keyed by the active variant), the `emptyText` prop as the title, and any consumer-provided description / CTA via the `empty` slot. The `emptyVariant` prop (`empty` | `loading` | `error` | `filtered`) drives `data-variant` on the content wrapper so the theme spins the icon on `loading` and recolors it to `--destructive` on `error`. Pass `:empty-text="null"` to suppress the empty-state row entirely (used by inline grids embedded in forms).

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
      <ObjectsGrid loading :skeleton-rows="2" :objects-in-order="[]" :fields="compactFields" table-breakpoint="inf" />
    </ClientOnly>
  </DemoCard>
  <DemoCard title="empty — first-run">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="No accounts yet." table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="filtered — no matches">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="No accounts match the current filters." empty-variant="filtered" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="loading — spinner + message">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="Loading accounts…" empty-variant="loading" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="error — destructive icon">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <ClientOnly>
        <ObjectsGrid :objects-in-order="[]" :fields="compactFields" empty-text="Could not load accounts." empty-variant="error" table-breakpoint="xs" />
      </ClientOnly>
    </div>
  </DemoCard>
</VuedaDemo>

## Tabular inline editing

{@api vue:component:FieldSetTabularInline} embeds an editable ObjectsGrid in its own
fieldset. The fieldset owns the outer edge and the separator above help and validation
messages; the embedded grid adds no second frame. Narrow screens switch the rows to cards.

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

The Sort and Filters controls use {@api vue:component:FieldPickerMenuList} for their
available fields. Long lists keep a scrollbar visible even before hovering or scrolling;
short lists fit their content without a scrollbar. The list height is capped at 15rem.
The same list appears in the desktop popover and mobile dialog.

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

## Customization Surface

Use tokens for color, type, radius, border, shadow, and density decisions that should apply across the component. Use theme keys when changing the composition: table wrappers, row groups, header cells, card label/value pairs, and skeleton placement.

The highest-value keys are:

- {@api theme-key:ObjectsGrid} `root`, `table`, `headerRowGroup`, `headerRow`, `headerCell`, `bodyRowGroup`, `bodyRow`, `cardContainer`, `emptyText`, `emptyContent`.
- {@api theme-key:ObjectsGridTableHeader} `root`, `label`.
- {@api theme-key:ObjectsGridBodyCell} for table cell chrome and the nested {@api theme-key:WidgetLabel} override used in form/grid compositions.
- {@api theme-key:ObjectsGridCardCell} `header` and `value`.

Per-instance props stay useful even when the global theme is stable: `fieldClasses`, `tableFieldClasses`, `cardFieldClasses`, `headerClasses`, `tableHeaderClasses`, and `cardHeaderClasses` let a single grid tune numeric columns, action column widths, and compact fields without adding a global variant.
