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
import TableRowActions from "@vueda/grid/table/TableRowActions.vue";
import Button from "@vueda/controls/button/Button.vue";
import Badge from "@vueda/display/badge/Badge.vue";
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

::: tip Which table to use
For a native HTML table that keeps its table layout at every width, use these
primitives. For a table-like list that breaks down into cards on narrow
screens, use [ObjectsGrid](objectsgrid.md). {@api vue:component:ViewList}
builds each model's list on ObjectsGrid.
:::

This page shows the {@term Visual Contract} of the table primitives:
{@api vue:component:Table}, {@api vue:component:TableHeader},
{@api vue:component:TableBody}, {@api vue:component:TableFooter},
{@api vue:component:TableRow}, {@api vue:component:TableHead},
{@api vue:component:TableCell}, {@api vue:component:TableCaption},
{@api vue:component:TableEmpty}, and {@api vue:component:TableRowActions}.
It ends with a DataTable recipe that composes them. [Components](index.md)
describes the rules every component page shares.

## Table

`Table` renders a scroll container around the `<table>` element. The
container draws the table's frame: the card fill, the card radius, and a
hairline edge. Wide tables scroll sideways inside it.

- **Dividers:** a hairline on each row's cells divides it from the next row,
  and the header row from the body.
- **Last row:** the container edge closes the table below the last body row.
- **Footer:** `TableFooter` rows take a muted fill and muted text, with a
  divider above the first footer row. Use it for totals and summaries.
- **Caption:** `TableCaption` renders low-emphasis text below the rows.
- **Hover and selection:** a row fills on hover. A row marked
  `data-state="selected"` takes a primary tint and a leading primary rail, and
  hover and press deepen the tint.
- **Numbers and codes:** a `TableHead` or `TableCell` marked `data-numeric`
  aligns right in a monospaced face. One marked `data-mono` uses the
  monospaced face at its normal alignment. The table sets tabular figures, so
  digits line up in every column.
- **Checkbox columns:** a cell or header holding a checkbox tightens its
  trailing padding and aligns the box with the text line.

Theme keys: {@api theme-key:Table}, {@api theme-key:TableHeader},
{@api theme-key:TableBody}, {@api theme-key:TableFooter},
{@api theme-key:TableRow}, {@api theme-key:TableHead},
{@api theme-key:TableCell}, {@api theme-key:TableCaption}. Current values:
{@api css-token:card}, {@api css-token:vueda-card-radius},
{@api css-token:border}, {@api css-token:vueda-hairline-width},
{@api css-token:accent}, {@api css-token:primary},
{@api css-token:muted}, and {@api css-token:muted-foreground}.

<VuedaDemo class="flex flex-col gap-6">
  <DemoCard title="header, body, footer, caption">
      <Table>
        <TableCaption>Recent invoices, all amounts in USD.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Status</TableHead>
            <TableHead data-numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell data-mono>INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell data-mono>2026-04-12</TableCell>
            <TableCell><Badge variant="info">Sent</Badge></TableCell>
            <TableCell data-numeric>$14,028.50</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell data-mono>2026-04-11</TableCell>
            <TableCell><Badge variant="success">Paid</Badge></TableCell>
            <TableCell data-numeric>$2,440.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell data-mono>2026-04-09</TableCell>
            <TableCell><Badge variant="warning">Overdue</Badge></TableCell>
            <TableCell data-numeric>$8,915.20</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00479</TableCell>
            <TableCell>Pemberton &amp; Vale</TableCell>
            <TableCell data-mono>2026-04-07</TableCell>
            <TableCell><Badge variant="secondary">Draft</Badge></TableCell>
            <TableCell data-numeric>$612.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colspan="4">Total, 4 invoices</TableCell>
            <TableCell data-numeric>$25,995.70</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    <template #footer>
      <span>the container draws the frame</span>
      <span>the container edge closes the last row</span>
      <span>the footer is muted and divided from the body</span>
    </template>
  </DemoCard>
  <DemoCard title="selected row">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead data-numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell data-mono>INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell data-mono>2026-04-12</TableCell>
            <TableCell data-numeric>$14,028.50</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell data-mono>2026-04-11</TableCell>
            <TableCell data-numeric>$2,440.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell data-mono>2026-04-09</TableCell>
            <TableCell data-numeric>$8,915.20</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    <template #footer>
      <span>selected: primary tint plus a leading rail</span>
      <span>hover fills the row</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Sticky header

With the {@api vue:component:Table:prop:sticky} prop, the container becomes a
vertically scrolling region with a capped height. Header cells pin to the top
and take the card fill, and each carries its divider over the scrolling rows.
To change the cap, set the `--vueda-tbl-max-h` custom property on the `Table`
or an ancestor.

<VuedaDemo>
  <DemoCard title="sticky header, capped height">
    <Table sticky style="--vueda-tbl-max-h: 12rem">
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Item</TableHead>
          <TableHead data-numeric>On hand</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell data-mono>SKU-00412</TableCell>
          <TableCell>Bearing, 6203-2RS</TableCell>
          <TableCell data-numeric>1,840</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00413</TableCell>
          <TableCell>Bearing, 6204-2RS</TableCell>
          <TableCell data-numeric>912</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00414</TableCell>
          <TableCell>Bearing, 6205-2RS</TableCell>
          <TableCell data-numeric>3,210</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00415</TableCell>
          <TableCell>Bearing, 6206-2RS</TableCell>
          <TableCell data-numeric>604</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00416</TableCell>
          <TableCell>Bearing, 6207-2RS</TableCell>
          <TableCell data-numeric>1,125</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00417</TableCell>
          <TableCell>Seal, 35x52x7</TableCell>
          <TableCell data-numeric>2,480</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00418</TableCell>
          <TableCell>Seal, 40x62x8</TableCell>
          <TableCell data-numeric>1,016</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00419</TableCell>
          <TableCell>Seal, 45x62x8</TableCell>
          <TableCell data-numeric>388</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00420</TableCell>
          <TableCell>Seal, 50x72x8</TableCell>
          <TableCell data-numeric>752</TableCell>
        </TableRow>
        <TableRow>
          <TableCell data-mono>SKU-00421</TableCell>
          <TableCell>Circlip, 35 mm</TableCell>
          <TableCell data-numeric>5,600</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <template #footer>
      <span>scroll the rows; the header stays in place</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Density

The {@api vue:component:Table:prop:density} prop sets a row height tier:
`default`, `compact`, or `condensed`. `Table` writes it to `data-density` on
the `<table>` element, and `TableHead` and `TableCell` read it. Each tier sets
shorter rows than the one before it. Header cells shorten at `compact` and
`condensed`, and `condensed` also uses smaller text. When `density` is unset,
cells size to their padding and content.

Theme keys: {@api theme-key:TableHead.root} and
{@api theme-key:TableCell.root} hold the tiers.

<VuedaDemo class="grid gap-6 sm:grid-cols-3">
  <DemoCard title="default">
      <Table density="default">
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item</TableHead>
            <TableHead data-numeric>On hand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell data-mono>SKU-00412</TableCell>
            <TableCell>Bearing, 6203-2RS</TableCell>
            <TableCell data-numeric>1,840</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>SKU-00413</TableCell>
            <TableCell>Bearing, 6204-2RS</TableCell>
            <TableCell data-numeric>912</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>SKU-00414</TableCell>
            <TableCell>Bearing, 6205-2RS</TableCell>
            <TableCell data-numeric>3,210</TableCell>
          </TableRow>
        </TableBody>
      </Table>
  </DemoCard>
  <DemoCard title="compact">
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item</TableHead>
            <TableHead data-numeric>On hand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell data-mono>SKU-00412</TableCell>
            <TableCell>Bearing, 6203-2RS</TableCell>
            <TableCell data-numeric>1,840</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>SKU-00413</TableCell>
            <TableCell>Bearing, 6204-2RS</TableCell>
            <TableCell data-numeric>912</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>SKU-00414</TableCell>
            <TableCell>Bearing, 6205-2RS</TableCell>
            <TableCell data-numeric>3,210</TableCell>
          </TableRow>
        </TableBody>
      </Table>
  </DemoCard>
  <DemoCard title="condensed">
      <Table density="condensed">
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item</TableHead>
            <TableHead data-numeric>On hand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell data-mono>SKU-00412</TableCell>
            <TableCell>Bearing, 6203-2RS</TableCell>
            <TableCell data-numeric>1,840</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>SKU-00413</TableCell>
            <TableCell>Bearing, 6204-2RS</TableCell>
            <TableCell data-numeric>912</TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>SKU-00414</TableCell>
            <TableCell>Bearing, 6205-2RS</TableCell>
            <TableCell data-numeric>3,210</TableCell>
          </TableRow>
        </TableBody>
      </Table>
  </DemoCard>
</VuedaDemo>

## TableEmpty

`TableEmpty` is an empty-state row. It renders a `TableRow` with one
`TableCell` that spans {@api vue:component:TableEmpty:prop:colspan}
columns, and centers its content in a column. You supply the content in the
default slot: an icon, a title, a description, and an action.

The {@api vue:component:TableEmpty:prop:variant} prop names the state:
`empty` (the default), `loading`, `error`, or `filtered`. It sets
`data-variant` on the content wrapper. A direct child marked
`data-slot="icon"` takes the muted icon treatment, spins for `loading`, and
takes the destructive color for `error`. For `filtered`, a ghost or tertiary
action keeps the page's primary action the most prominent.

Theme key: {@api theme-key:TableEmpty}. Current values:
{@api css-token:muted-foreground} and {@api css-token:destructive}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="empty: first run, primary action">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead data-numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4">
            <FontAwesomeIcon :icon="faFolderOpen" data-slot="icon" />
            <strong class="font-semibold text-foreground">No invoices yet.</strong>
            <span>Issue your first invoice to populate this table.</span>
            <div class="mt-1">
              <Button size="sm" tone="primary">
                <FontAwesomeIcon :icon="faPlus" />New invoice
              </Button>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
  </DemoCard>
  <DemoCard title="loading">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead data-numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4" variant="loading">
            <FontAwesomeIcon :icon="faCircleNotch" data-slot="icon" />
            <span>Loading invoices…</span>
          </TableEmpty>
        </TableBody>
      </Table>
    <template #footer>
      <span>the variant spins the icon</span>
    </template>
  </DemoCard>
  <DemoCard title="error: retry action">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead data-numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4" variant="error">
            <FontAwesomeIcon :icon="faTriangleExclamation" data-slot="icon" />
            <strong class="font-semibold text-foreground">Could not load invoices.</strong>
            <span>Check your connection and try again.</span>
            <div class="mt-1">
              <Button size="sm" emphasis="outline">
                <FontAwesomeIcon :icon="faRotateRight" />Retry
              </Button>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
    <template #footer>
      <span>the variant colors the icon destructive</span>
    </template>
  </DemoCard>
  <DemoCard title="filtered: no matches, clear action">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead data-numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="4" variant="filtered">
            <FontAwesomeIcon :icon="faCircleQuestion" data-slot="icon" />
            <strong class="font-semibold text-foreground">No matches.</strong>
            <span>No invoices match the current filters.</span>
            <div class="mt-1">
              <Button size="sm" emphasis="ghost">Clear filters</Button>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
    <template #footer>
      <span>a ghost action leaves the primary action unchallenged</span>
    </template>
  </DemoCard>
</VuedaDemo>

## TableRowActions

`TableRowActions` groups small icon buttons inside a row. It appears while its
row has the pointer or focus, or is selected. It holds its width while
hidden, so the columns stay in place when it appears. Place it in a `TableCell` near the
row's right edge. Its default slot receives
{@api vue:component:TableRowActions:slot:default.actionClass}. Apply that class
to each button, so row actions share one hover surface, border, and focus ring.

Theme key: {@api theme-key:TableRowActions}. Current values:
{@api css-token:muted}, {@api css-token:border}, and
{@api css-token:ring}.

<VuedaDemo>
  <DemoCard title="row actions: hover, focus, or selected">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead data-numeric>Amount</TableHead>
            <TableHead class="w-24" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell data-mono>INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell data-numeric>$14,028.50</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell data-numeric>$2,440.00</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-mono>INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell data-numeric>$8,915.20</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    <template #footer>
      <span>the selected row shows its actions</span>
      <span>hover or tab into another row to reveal its actions</span>
    </template>
  </DemoCard>
</VuedaDemo>

## DataTable recipe

This recipe composes a data table by hand from the table primitives with a
toolbar, a filter chip rail, a selection bar, and a pagination footer. Your
application holds the sorting, selection, and paging state, for example with
[TanStack Vue Table](https://tanstack.com/table/latest/docs/framework/vue/vue-table).

- **Toolbar and chips:** search sits on the left and view controls on the
  right. Active filters show as removable chips below the toolbar.
- **Sortable headers:** each sortable `TableHead` sets `aria-sort`. On a
  `data-numeric` header, the element marked `data-slot="sort-icon"` moves
  before the label, so the column's right edge stays put as the sort changes.
- **Selection:** selected rows take the selected-row state. The selection bar
  uses the same primary tint, so it reads as part of the selection.
- **Row actions:** each row's `TableRowActions` shows for selected rows and on
  hover or focus for the others.
- **Height:** the table uses `sticky`, so the header stays visible while the
  rows scroll.

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
      <Table sticky style="--vueda-tbl-max-h: 340px">
        <TableHeader>
          <TableRow>
            <TableHead class="w-9">
              <Checkbox :model-value="recipeSelectAll" aria-label="Select all rows" @update:model-value="setRecipeSelectAll" />
            </TableHead>
            <TableHead aria-sort="descending" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Invoice
                <span data-slot="sort-icon" class="inline-flex items-center justify-center w-3 text-[10px] text-primary">
                  <FontAwesomeIcon :icon="faArrowDownLong" />
                </span>
              </span>
            </TableHead>
            <TableHead aria-sort="none" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Customer
                <span data-slot="sort-icon" class="inline-flex items-center justify-center w-3 text-[10px] text-muted-foreground opacity-40">
                  <FontAwesomeIcon :icon="faSort" />
                </span>
              </span>
            </TableHead>
            <TableHead aria-sort="none" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Issued
                <span data-slot="sort-icon" class="inline-flex items-center justify-center w-3 text-[10px] text-muted-foreground opacity-40">
                  <FontAwesomeIcon :icon="faSort" />
                </span>
              </span>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead data-numeric aria-sort="ascending" class="cursor-pointer select-none">
              <span class="inline-flex items-center gap-1.5">
                Amount
                <span data-slot="sort-icon" class="inline-flex items-center justify-center w-3 text-[10px] text-primary">
                  <FontAwesomeIcon :icon="faArrowUpLong" />
                </span>
              </span>
            </TableHead>
            <TableHead class="w-24" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow :data-state="recipeRows[0] ? 'selected' : undefined">
            <TableCell class="w-9"><Checkbox v-model="recipeRows[0]" aria-label="Select row" /></TableCell>
            <TableCell data-mono>INV-2026-00482</TableCell>
            <TableCell>Northwind Logistics</TableCell>
            <TableCell data-mono>2026-04-12</TableCell>
            <TableCell><Badge variant="info">Sent</Badge></TableCell>
            <TableCell data-numeric>$14,028.50</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[1] ? 'selected' : undefined">
            <TableCell class="w-9"><Checkbox v-model="recipeRows[1]" aria-label="Select row" /></TableCell>
            <TableCell data-mono>INV-2026-00480</TableCell>
            <TableCell>Hightower Mfg.</TableCell>
            <TableCell data-mono>2026-04-09</TableCell>
            <TableCell><Badge variant="warning">Overdue</Badge></TableCell>
            <TableCell data-numeric>$8,915.20</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[2] ? 'selected' : undefined">
            <TableCell class="w-9"><Checkbox v-model="recipeRows[2]" aria-label="Select row" /></TableCell>
            <TableCell data-mono>INV-2026-00481</TableCell>
            <TableCell>Acme Coffee Roasters</TableCell>
            <TableCell data-mono>2026-04-11</TableCell>
            <TableCell><Badge variant="success">Paid</Badge></TableCell>
            <TableCell data-numeric>$2,440.00</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[3] ? 'selected' : undefined">
            <TableCell class="w-9"><Checkbox v-model="recipeRows[3]" aria-label="Select row" /></TableCell>
            <TableCell data-mono>INV-2026-00479</TableCell>
            <TableCell>Pemberton &amp; Vale</TableCell>
            <TableCell data-mono>2026-04-07</TableCell>
            <TableCell><Badge variant="secondary">Draft</Badge></TableCell>
            <TableCell data-numeric>$612.00</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
          <TableRow :data-state="recipeRows[4] ? 'selected' : undefined">
            <TableCell class="w-9"><Checkbox v-model="recipeRows[4]" aria-label="Select row" /></TableCell>
            <TableCell data-mono>INV-2026-00477</TableCell>
            <TableCell>Riverbend Builders</TableCell>
            <TableCell data-mono>2026-04-04</TableCell>
            <TableCell><Badge variant="success">Paid</Badge></TableCell>
            <TableCell data-numeric>$11,240.00</TableCell>
            <TableCell>
              <TableRowActions v-slot="{ actionClass }">
                <button type="button" title="Open" aria-label="Open" :class="actionClass"><FontAwesomeIcon :icon="faFolderOpen" /></button>
                <button type="button" title="Send" aria-label="Send" :class="actionClass"><FontAwesomeIcon :icon="faPaperPlane" /></button>
                <button type="button" title="More" aria-label="More" :class="actionClass"><FontAwesomeIcon :icon="faEllipsis" /></button>
              </TableRowActions>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
    <span class="whitespace-nowrap">the search field and every checkbox are live</span>
    <span class="whitespace-nowrap">toggling a row updates the count, the row tint, and the header checkbox</span>
    <span class="whitespace-nowrap">the Amount sort icon sits before its label</span>
    <span class="whitespace-nowrap">the page control works</span>
  </div>
</VuedaDemo>
