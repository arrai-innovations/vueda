---
title: Tables
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Table from "@vueda/grid/table/Table.vue";
import TableBody from "@vueda/grid/table/TableBody.vue";
import TableCaption from "@vueda/grid/table/TableCaption.vue";
import TableCell from "@vueda/grid/table/TableCell.vue";
import TableEmpty from "@vueda/grid/table/TableEmpty.vue";
import TableFooter from "@vueda/grid/table/TableFooter.vue";
import TableHead from "@vueda/grid/table/TableHead.vue";
import TableHeader from "@vueda/grid/table/TableHeader.vue";
import TableRow from "@vueda/grid/table/TableRow.vue";
import Button from "@vueda/controls/button/Button.vue";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";
import Input from "@vueda/controls/input/Input.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationBar from "@vueda/navigation/pagination/PaginationBar.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationMeta from "@vueda/navigation/pagination/PaginationMeta.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faArrowDownLong,
    faArrowUpLong,
    faBars,
    faCalendar,
    faCircleNotch,
    faCircleQuestion,
    faDownload,
    faEllipsis,
    faFilter,
    faFolderOpen,
    faMagnifyingGlass,
    faPaperPlane,
    faPlus,
    faRotateRight,
    faSort,
    faTableColumns,
    faTag,
    faTrash,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { computed, ref } from "vue";

// Selection state for the DataTable recipe below. Three of the five rows start
// selected, so the header checkbox opens in its indeterminate state and the
// selection bar opens visible. Both are derived, so clicking a row checkbox
// updates the count and can empty the bar entirely.
const recipeSearch = ref("");
const recipePage = ref(1);
const recipePageSize = ref("5");
const recipeRows = ref([true, true, true, false, false]);
const recipeSelectedCount = computed(() => recipeRows.value.filter(Boolean).length);
const recipeSelectAll = computed(() => {
    if (recipeSelectedCount.value === 0) return false;
    if (recipeSelectedCount.value === recipeRows.value.length) return true;
    return "indeterminate";
});
const setRecipeSelectAll = (value) => {
    recipeRows.value = recipeRows.value.map(() => value === true);
};
</script>

# Tables

The table family covers the full surface for tabular data: nine primitive
components that compose into a typed HTML table, plus a DataTable recipe layer
that wires in row selection, sortable headers, a toolbar, and pagination at
app level via TanStack Vue Table.

Source ships only primitives under `grid/table/`. There is no `DataTable`
composite in VUEDA; TanStack Vue Table integrates at the consuming application
level. The DataTable section below is a recipe: a documented composition of
primitives and layout patterns that any app can adopt directly.

This page is the visual contract the default theme guarantees. Use it as the
target spec when you re-skin. If a cell breaks after a customization, the
change has crossed from skin into design language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). Values
(color, dimension) belong in [CSS tokens](../theming/tokens.md); compositions
belong in [theme keys](../theming/keys.md).

## Table

The root `Table` component renders a scrollable container div
({@api theme-key:Table} `container` slot, default `relative w-full overflow-auto`)
wrapping the `<table>` element ({@api theme-key:Table} `table` slot, default
`w-full caption-bottom text-sm`). The container does not include border or
background by default; those come from the enclosing surface (typically a Card
or a bordered wrapper the consumer provides).

Seven additional keys cover the inner elements:
{@api theme-key:TableHeader} (`[&_tr]:border-b`),
{@api theme-key:TableBody} (`[&_tr:last-child]:border-0`),
{@api theme-key:TableFooter} (`bg-muted/50 border-t font-medium`),
{@api theme-key:TableRow} (`hover:bg-accent/50 data-[state=selected]:bg-primary/[0.06] border-b transition-colors`),
{@api theme-key:TableHead} (`h-10 px-2 text-left align-middle font-medium whitespace-nowrap`),
{@api theme-key:TableCell} (`p-2 align-middle whitespace-nowrap`),
{@api theme-key:TableCaption} (`text-muted-foreground mt-4 text-sm`).

<VuedaDemo class="flex flex-col gap-6">
  <DemoCard title="full anatomy — header · body · footer · caption">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableCaption>Recent invoices · all amounts in USD.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell class="font-mono text-[11px]">INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-12</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-primary/10 text-primary border-primary/30">Sent</span></TableCell>
            <TableCell class="text-right tabular-nums">$14,028.50</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-11</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-success/10 text-success border-success/50">Paid</span></TableCell>
            <TableCell class="text-right tabular-nums">$2,440.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-09</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-warning/10 text-warning border-warning/50">Overdue</span></TableCell>
            <TableCell class="text-right tabular-nums">$8,915.20</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">INV-2026-00479</TableCell>
            <TableCell>Pemberton &amp; Vale</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-07</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-muted text-foreground border-border">Draft</span></TableCell>
            <TableCell class="text-right tabular-nums">$612.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colspan="4">Total · 4 invoices</TableCell>
            <TableCell class="text-right tabular-nums">$25,995.70</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
    <template #footer>
      <span>container: <code>relative w-full overflow-auto</code></span>
      <span>footer: <code>bg-muted/50 border-t font-medium</code></span>
      <span>caption: <code>caption-bottom mt-4 text-sm text-muted-foreground</code></span>
    </template>
  </DemoCard>
  <DemoCard title="selected row — data-[state=selected]:bg-muted">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell class="font-mono text-[11px]">INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-12</TableCell>
            <TableCell class="text-right tabular-nums">$14,028.50</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-11</TableCell>
            <TableCell class="text-right tabular-nums">$2,440.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-09</TableCell>
            <TableCell class="text-right tabular-nums">$8,915.20</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>selected fills to <code>bg-muted</code> (neutral tint) in the default theme</span>
      <span>hover fills to <code>bg-muted/50</code></span>
      <span><code>border-b transition-colors</code> on every row</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Density

Density is a design-system pattern applied above the primitive layer, not
encoded in the default theme keys. Three row heights are defined: **default**
(32 px), **compact** (28 px), and **condensed** (24 px). In practice, density
is set by overriding the `TableHead` and `TableCell` `class` props at the table
level, or by patching the theme keys for a given context. The demos below use
`class` prop overrides to show each tier.

<VuedaDemo class="grid gap-6 sm:grid-cols-3">
  <DemoCard title="default — 32 px rows">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item</TableHead>
            <TableHead class="text-right">On hand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell class="font-mono text-[11px]">SKU-00412</TableCell>
            <TableCell>Bearing, 6203-2RS</TableCell>
            <TableCell class="text-right tabular-nums">1,840</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">SKU-00413</TableCell>
            <TableCell>Bearing, 6204-2RS</TableCell>
            <TableCell class="text-right tabular-nums">912</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-mono text-[11px]">SKU-00414</TableCell>
            <TableCell>Bearing, 6205-2RS</TableCell>
            <TableCell class="text-right tabular-nums">3,210</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>theme default: <code>h-10</code> head, <code>p-2</code> cells</span>
    </template>
  </DemoCard>
  <DemoCard title="compact — 28 px rows">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="!h-8">SKU</TableHead>
            <TableHead class="!h-8">Item</TableHead>
            <TableHead class="!h-8 text-right">On hand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell class="!py-1 font-mono text-[11px]">SKU-00412</TableCell>
            <TableCell class="!py-1">Bearing, 6203-2RS</TableCell>
            <TableCell class="!py-1 text-right tabular-nums">1,840</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="!py-1 font-mono text-[11px]">SKU-00413</TableCell>
            <TableCell class="!py-1">Bearing, 6204-2RS</TableCell>
            <TableCell class="!py-1 text-right tabular-nums">912</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="!py-1 font-mono text-[11px]">SKU-00414</TableCell>
            <TableCell class="!py-1">Bearing, 6205-2RS</TableCell>
            <TableCell class="!py-1 text-right tabular-nums">3,210</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>override: <code>!h-8</code> head, <code>!py-1</code> cells</span>
    </template>
  </DemoCard>
  <DemoCard title="condensed — 24 px rows">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="!h-7 !text-[11px]">SKU</TableHead>
            <TableHead class="!h-7 !text-[11px]">Item</TableHead>
            <TableHead class="!h-7 !text-[11px] text-right">On hand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell class="!py-0.5 !text-[11px] font-mono">SKU-00412</TableCell>
            <TableCell class="!py-0.5 !text-[11px]">Bearing, 6203-2RS</TableCell>
            <TableCell class="!py-0.5 !text-[11px] text-right tabular-nums">1,840</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="!py-0.5 !text-[11px] font-mono">SKU-00413</TableCell>
            <TableCell class="!py-0.5 !text-[11px]">Bearing, 6204-2RS</TableCell>
            <TableCell class="!py-0.5 !text-[11px] text-right tabular-nums">912</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="!py-0.5 !text-[11px] font-mono">SKU-00414</TableCell>
            <TableCell class="!py-0.5 !text-[11px]">Bearing, 6205-2RS</TableCell>
            <TableCell class="!py-0.5 !text-[11px] text-right tabular-nums">3,210</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>override: <code>!h-7 !text-[11px]</code> head, <code>!py-0.5 !text-[11px]</code> cells</span>
    </template>
  </DemoCard>
</VuedaDemo>

## TableEmpty

`TableEmpty` is a full-width empty-state row. It renders a `TableRow`
containing a `TableCell` (spanning via `colspan`) that centers a vertically
padded content block. The two theme keys are
{@api theme-key:TableEmpty} `root` (`p-4 whitespace-nowrap align-middle text-sm text-foreground`)
and `content` (`flex items-center justify-center py-10`). Consumer content
goes in the default slot and is displayed as a flex column inside `content`.

Four canonical variants: **empty** (first-run, primary CTA), **loading**
(spinner + message), **error** (destructive icon + retry CTA), and
**filtered-empty** (no matches, clear-filters CTA).

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="empty — first-run, primary CTA">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4">
            <FontAwesomeIcon :icon="faFolderOpen" class="text-xl text-muted-foreground/70" />
            <strong class="text-sm font-semibold text-foreground">No invoices yet.</strong>
            <span class="text-sm text-muted-foreground">Issue your first invoice to populate this table.</span>
            <div class="mt-1">
              <Button size="sm" tone="primary">
                <FontAwesomeIcon :icon="faPlus" />New invoice
              </Button>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>content is a flex column with <code>gap</code></span>
      <span>icon, strong, span, and action compose naturally</span>
    </template>
  </DemoCard>
  <DemoCard title="loading — spinner + message">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4">
            <FontAwesomeIcon :icon="faCircleNotch" spin class="text-xl text-muted-foreground/70" />
            <span class="text-sm text-muted-foreground">Loading invoices…</span>
          </TableEmpty>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>spinning icon via <code>spin</code> prop on FontAwesomeIcon</span>
    </template>
  </DemoCard>
  <DemoCard title="error — destructive icon, retry CTA">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4">
            <FontAwesomeIcon :icon="faTriangleExclamation" class="text-xl text-destructive/80" />
            <strong class="text-sm font-semibold text-foreground">Could not load invoices.</strong>
            <span class="text-sm text-muted-foreground">Check your connection and try again.</span>
            <div class="mt-1">
              <Button size="sm" emphasis="outline">
                <FontAwesomeIcon :icon="faRotateRight" />Retry
              </Button>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>icon color is consumer-provided, not from theme key</span>
    </template>
  </DemoCard>
  <DemoCard title="filtered-empty — no matches, clear CTA">
    <div class="rounded-vueda-card hairline hairline-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4">
            <FontAwesomeIcon :icon="faCircleQuestion" class="text-xl text-muted-foreground/70" />
            <strong class="text-sm font-semibold text-foreground">No matches.</strong>
            <span class="text-sm text-muted-foreground">No invoices match the current filters.</span>
            <div class="mt-1">
              <Button size="sm" emphasis="ghost">Clear filters</Button>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
    </div>
    <template #footer>
      <span>use ghost or tertiary CTA so it doesn't compete with primary actions</span>
    </template>
  </DemoCard>
</VuedaDemo>

## DataTable recipe

DataTable is not a VUEDA source composite. TanStack Vue Table wires in at app
level; the patterns below show how the Table primitives compose with a toolbar,
filter chip rail, selection bar, and pagination footer. These elements are
application-layer responsibilities, not theme keys. The recipe is a candidate
for promotion to a future composite component.

Key design decisions reflected here: sortable column headers use `aria-sort`
for accessibility and flip the sort icon to the left of numeric columns so the
number column edge stays stable when sort toggles; in-row actions are hidden
by default and revealed on row hover, focus, or selected state; the selection
bar appears at accent tint to signal a system-level state distinct from hover.

<VuedaDemo>
  <div class="flex flex-col gap-2.5 p-3 rounded-vueda-card hairline hairline-border bg-card">
    <!-- toolbar -->
    <div class="flex items-center gap-2 flex-wrap">
      <div class="relative flex-[0_1_280px] min-w-[160px]">
        <FontAwesomeIcon :icon="faMagnifyingGlass" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none" />
        <Input v-model="recipeSearch" type="text" placeholder="Search invoices…" class="pl-7" aria-label="Search invoices" />
      </div>
      <Button size="sm" emphasis="outline">
        <FontAwesomeIcon :icon="faFilter" />Filter
      </Button>
      <Button size="sm" emphasis="outline">
        <FontAwesomeIcon :icon="faCalendar" />Date range
      </Button>
      <div class="flex-1"></div>
      <span class="font-mono text-[11px] text-muted-foreground whitespace-nowrap">48 rows · 3 overdue</span>
      <Button size="sm" emphasis="ghost" aria-label="Density">
        <FontAwesomeIcon :icon="faBars" />
      </Button>
      <Button size="sm" emphasis="ghost" aria-label="Columns">
        <FontAwesomeIcon :icon="faTableColumns" />
      </Button>
      <Button size="sm" emphasis="ghost" aria-label="Export">
        <FontAwesomeIcon :icon="faDownload" />
      </Button>
      <Button size="sm" tone="primary">
        <FontAwesomeIcon :icon="faPlus" />New invoice
      </Button>
    </div>
    <!-- filter chip rail -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-border bg-card text-[11px] font-medium text-foreground">
        <span class="text-muted-foreground font-normal">Status:</span>Sent, Overdue
        <button class="text-muted-foreground hover:text-foreground ml-0.5 text-[10px]" aria-label="Remove">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </span>
      <span class="inline-flex items-center gap-1.5 h-6 px-2 rounded border border-border bg-card text-[11px] font-medium text-foreground">
        <span class="text-muted-foreground font-normal">Issued:</span>Last 30 days
        <button class="text-muted-foreground hover:text-foreground ml-0.5 text-[10px]" aria-label="Remove">
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </span>
      <button class="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline px-1">Clear all</button>
    </div>
    <!-- selection bar -->
    <div v-if="recipeSelectedCount" class="flex items-center gap-3 px-3 py-1.5 rounded border border-primary/30 bg-primary/10 text-[12px] font-medium text-foreground">
      <Checkbox :model-value="recipeSelectAll" aria-label="Selected rows" @update:model-value="setRecipeSelectAll" />
      <span><strong class="font-semibold">{{ recipeSelectedCount }}</strong> rows selected</span>
      <div class="flex-1"></div>
      <Button size="sm" emphasis="ghost">
        <FontAwesomeIcon :icon="faPaperPlane" />Send
      </Button>
      <Button size="sm" emphasis="ghost">
        <FontAwesomeIcon :icon="faTag" />Tag
      </Button>
      <Button size="sm" emphasis="ghost">
        <FontAwesomeIcon :icon="faDownload" />Export
      </Button>
      <Button size="sm" tone="destructive" emphasis="ghost">
        <FontAwesomeIcon :icon="faTrash" />Delete
      </Button>
    </div>
    <!-- table -->
    <div class="rounded-vueda-card hairline hairline-border overflow-auto max-h-[340px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="!pr-0 !w-9">
              <Checkbox :model-value="recipeSelectAll" aria-label="Select all rows" class="translate-y-0.5" @update:model-value="setRecipeSelectAll" />
            </TableHead>
            <TableHead aria-sort="descending" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Invoice
                <span class="inline-flex items-center justify-center w-3 text-[10px] text-primary">
                  <FontAwesomeIcon :icon="faArrowDownLong" />
                </span>
              </span>
            </TableHead>
            <TableHead aria-sort="none" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Customer
                <span class="inline-flex items-center justify-center w-3 text-[10px] text-muted-foreground opacity-40">
                  <FontAwesomeIcon :icon="faSort" />
                </span>
              </span>
            </TableHead>
            <TableHead aria-sort="none" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Issued
                <span class="inline-flex items-center justify-center w-3 text-[10px] text-muted-foreground opacity-40">
                  <FontAwesomeIcon :icon="faSort" />
                </span>
              </span>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right cursor-pointer select-none" aria-sort="ascending">
              <span class="inline-flex flex-row-reverse items-center gap-1.5">
                Amount
                <span class="inline-flex items-center justify-center w-3 text-[10px] text-primary">
                  <FontAwesomeIcon :icon="faArrowUpLong" />
                </span>
              </span>
            </TableHead>
            <TableHead class="w-24" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow :data-state="recipeRows[0] ? 'selected' : undefined">
            <TableCell class="!pr-0 !w-9"><Checkbox v-model="recipeRows[0]" aria-label="Select row" class="translate-y-0.5" /></TableCell>
            <TableCell class="font-mono text-[11px]">INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-12</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-primary/10 text-primary border-primary/30">Sent</span></TableCell>
            <TableCell class="text-right tabular-nums">$14,028.50</TableCell>
            <TableCell>
              <span class="inline-flex gap-0.5">
                <button title="Open" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button title="Send" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button title="More" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </span>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[1] ? 'selected' : undefined">
            <TableCell class="!pr-0 !w-9"><Checkbox v-model="recipeRows[1]" aria-label="Select row" class="translate-y-0.5" /></TableCell>
            <TableCell class="font-mono text-[11px]">INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-09</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-warning/10 text-warning border-warning/50">Overdue</span></TableCell>
            <TableCell class="text-right tabular-nums">$8,915.20</TableCell>
            <TableCell>
              <span class="inline-flex gap-0.5">
                <button title="Open" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button title="Send" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button title="More" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </span>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[2] ? 'selected' : undefined">
            <TableCell class="!pr-0 !w-9"><Checkbox v-model="recipeRows[2]" aria-label="Select row" class="translate-y-0.5" /></TableCell>
            <TableCell class="font-mono text-[11px]">INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-11</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-success/10 text-success border-success/50">Paid</span></TableCell>
            <TableCell class="text-right tabular-nums">$2,440.00</TableCell>
            <TableCell>
              <span class="inline-flex gap-0.5">
                <button title="Open" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button title="Send" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button title="More" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </span>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[3] ? 'selected' : undefined">
            <TableCell class="!pr-0 !w-9"><Checkbox v-model="recipeRows[3]" aria-label="Select row" class="translate-y-0.5" /></TableCell>
            <TableCell class="font-mono text-[11px]">INV-2026-00479</TableCell>
            <TableCell>Pemberton &amp; Vale</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-07</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-muted text-foreground border-border">Draft</span></TableCell>
            <TableCell class="text-right tabular-nums">$612.00</TableCell>
            <TableCell>
              <span class="inline-flex gap-0.5">
                <button title="Open" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button title="Send" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button title="More" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </span>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[4] ? 'selected' : undefined">
            <TableCell class="!pr-0 !w-9"><Checkbox v-model="recipeRows[4]" aria-label="Select row" class="translate-y-0.5" /></TableCell>
            <TableCell class="font-mono text-[11px]">INV-2026-00477</TableCell>
            <TableCell>Riverbend Builders</TableCell>
            <TableCell class="font-mono text-[11px]">2026-04-04</TableCell>
            <TableCell><span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border bg-success/10 text-success border-success/50">Paid</span></TableCell>
            <TableCell class="text-right tabular-nums">$11,240.00</TableCell>
            <TableCell>
              <span class="inline-flex gap-0.5">
                <button title="Open" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button title="Send" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button title="More" class="inline-flex items-center justify-center size-6 rounded border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border text-[11px]"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <!-- footer -->
    <PaginationBar>
      <PaginationMeta>1 to 5 of 48 · page {{ recipePage }} of 10</PaginationMeta>
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
          Rows
          <NativeSelect v-model="recipePageSize" class="w-auto">
            <NativeSelectOption value="5">5</NativeSelectOption>
            <NativeSelectOption value="25">25</NativeSelectOption>
            <NativeSelectOption value="50">50</NativeSelectOption>
          </NativeSelect>
        </span>
        <Pagination v-model:page="recipePage" :total="48" :items-per-page="5">
          <PaginationContent>
            <PaginationFirst />
            <PaginationPrevious />
            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
      </div>
    </PaginationBar>
  </div>
  <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
    <span class="whitespace-nowrap">toolbar: search left, view controls right, secondary actions on a chip rail</span>
    <span class="whitespace-nowrap">selection bar: accent tint distinguishes it from hover</span>
    <span class="whitespace-nowrap">sortable header: sort glyph flips to <code>row-reverse</code> on numeric columns</span>
    <span class="whitespace-nowrap">in-row actions: shown for selected rows; reveal on hover for others</span>
    <span class="whitespace-nowrap">search field and every checkbox are live <code>Input</code> and <code>Checkbox</code></span>
    <span class="whitespace-nowrap">selection is real: toggling a row updates the count, the row tint, and the header's indeterminate state</span>
    <span class="whitespace-nowrap">footer: live <code>PaginationBar</code> + <code>PaginationMeta</code> + <code>Pagination</code>; the page control works</span>
  </div>
</VuedaDemo>
