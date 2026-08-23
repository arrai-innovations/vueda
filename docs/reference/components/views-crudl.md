---
title: CRUDL Views
status: draft
audience: designer
type: reference
---

<script setup>
import StickyBar from "@vueda/shell/sticky/StickyBar.vue";
import ObjectsGrid from "@vueda/objects-grid/ObjectsGrid.vue";
import Button from "@vueda/controls/button/Button.vue";
import Input from "@vueda/controls/input/Input.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faAnglesLeft,
    faAnglesRight,
    faArrowRight,
    faArrowUpFromBracket,
    faCheck,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faEllipsis,
    faFileImport,
    faFilter,
    faGripVertical,
    faMagnifyingGlass,
    faPen,
    faPlus,
    faSort,
    faSortDown,
    faTableColumns,
    faTag,
    faTrash,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faEnvelope } from "@fortawesome/free-regular-svg-icons";
import { ref } from "vue";
import { customerScenario } from "../../.vitepress/theme/fixtures/showcaseRecords.js";

const fields = [
    { name: "account", label: "Account" },
    { name: "owner", label: "Owner" },
    { name: "status", label: "Status" },
    { name: "updated", label: "Updated" },
    { name: "mrr", label: "MRR" },
    { name: "actions", label: "" },
];

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

const sorted = ref(["-updated", "mrr"]);

// Each StickyBar demo binds its scroll-root to its own bounded, scrollable
// panel so the bar pins to and reacts to the demo viewport instead of the page
// (otherwise it would stick to the window and ride up over the site nav).
const createViewport = ref(null);
const updateViewport = ref(null);

// One scenario per live demo. Route registration is global and first-match-wins, so demos
// that need different responses for the same model take different app labels.
const readScenario = customerScenario({ app: "showcaseread" });
const destroyScenario = customerScenario({ app: "showcasedestroy" });

// enableDryRun is off because the dry-run pre-flight currently fails against a real server;
// see the callout in the ViewDestroy section. The rest is the view's own default behavior.
const destroyViewProps = {
    confirmText: "delete 3 customers",
    enableDryRun: false,
    linkedObjectCounts: [
        { count: 26, verboseNamePlural: "contacts" },
        { count: 112, verboseNamePlural: "invoices" },
        { count: 8, verboseNamePlural: "attachments" },
    ],
};

const customerCreateFields = ["account", "domain", "owner", "tier", "mrr", "currency", "taxExempt", "notes"];
const customerUpdateFields = ["account", "domain", "owner", "tier", "mrr", "currency"];
const customerUpdateValues = {
    account: "Northwind Logistics",
    domain: "northwind-logistics.example",
    owner: "mt",
    tier: "enterprise",
    mrr: "14028.50",
    currency: "usd",
};

</script>

# CRUDL Views

Five view-scale layouts that form the backbone of every VUEDA application: list, create, read, update, and destroy. The new component introduced here is {@api vue:component:PageTitle}, the layout-level header that displays each view's title and page actions. The scroll-aware action bars these views use to keep submit and transition controls reachable on long forms ({@api vue:component:StickyBar} and the surrounding sticky-stack family) have their own page: [Sticky Chrome](./sticky-chrome.md). All other chrome — fields, field sets, alerts, ObjectsGrid, badges — is composed from earlier families.

Token surface: {@api css-token:background}, {@api css-token:card}, {@api css-token:border}, {@api css-token:primary}, {@api css-token:destructive}, {@api css-token:muted}, {@api css-token:muted-foreground}.

This page is the visual contract the default theme guarantees at view scale. Use it as the target spec when re-skinning. For the mechanics of overriding any of this, see [Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md).

## PageTitle

{@api vue:component:PageTitle} is the layout-level page header. The integrator places it once above `<RouterView>`; it reads the active view's title and loading state from `usePageTitle` (not from props) and hosts the action zone that `PageActions` teleports page-level buttons into. Setting `sticky` pins the bar to the top of the scroll viewport.

The demos below use a small `DemoTitleBar` wrapper that stands in for the layout: it establishes an isolated page-title context, registers a title into it, and renders the real `PageTitle` plus a `PageActions` cluster. In an application the layout owns that wiring once and each view contributes only its title and actions.

Theme keys: {@api theme-key:PageTitle}.

<VuedaDemo class="flex flex-col gap-6">
  <DemoCard title="title + actions">
    <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
      <ClientOnly>
        <DemoTitleBar title="Customers">
          <template #actions>
            <Button size="sm" emphasis="outline">
              <FontAwesomeIcon :icon="faArrowUpFromBracket" />
              Export
            </Button>
            <Button size="sm" tone="primary">
              <FontAwesomeIcon :icon="faPlus" />
              New customer
            </Button>
          </template>
        </DemoTitleBar>
      </ClientOnly>
    </div>
    <template #footer>
      <span>title via usePageTitle; actions via PageActions</span>
      <span>theme key: <code>PageTitle.title</code>, <code>PageTitle.buttons</code></span>
    </template>
  </DemoCard>
  <DemoCard title="loading">
    <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
      <ClientOnly>
        <DemoTitleBar title="Northwind Logistics" :loading="true">
          <template #actions>
            <Button size="sm" tone="primary" disabled>Edit</Button>
          </template>
        </DemoTitleBar>
      </ClientOnly>
    </div>
    <template #footer>
      <span>loading state via usePageTitle: inline spinner after the title</span>
      <span>theme key: <code>PageTitle.title</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## Sticky action bars

The create, read, and update views below pair PageTitle with a scroll-aware action bar that keeps the primary submit or transition controls reachable on long forms. That bar is {@api vue:component:StickyBar}, and in a real shell each view teleports it into the framework-owned sticky stack (via `StickyChrome` / `StickyStackProvider`) so it stacks beneath the pinned title and reveals on its own schedule. The demos on this page show the bar with a standalone `StickyBar` bound to the demo panel, which is visually identical but self-contained.

The bar primitive, the stack model, reveal strategies, and the integration contract are documented on their own page: [Sticky Chrome](./sticky-chrome.md).

## ViewList

The list view is the entry point for every {@term CRUDL} resource. PageTitle anchors the top with primary create actions. An under-actions bar provides search, column control, and filter and sort entry points. The search and column buttons stay anchored right at all times. The `Filters` control on the left opens an add-filter menu listing the fields not yet applied; picking one slides the popover to that field's filter form in place (no modal, no second surface), and a back affordance returns to the list to add another. Active filters and sorts render as a sticky constraints band below: click a filter chip to edit it (reopening the same form anchored to the chip), the ✕ to remove a chip, or a group's `Clear filters` / `Clear sort` to clear that axis. When rows are selected, a bulk-actions strip appears. {@api vue:component:ObjectsGrid} fills the card body flush, and a pagination footer follows.

::: info Mockup status
This ViewList is a static mockup. The live components implement the filter UX: `FilterGroup` orchestrates the add-filter `FilterMenu` (its trigger teleports into the toolbar) and the active-filter `FilterChip`s, each editing through a shared `FilterFieldForm`. The toolbar `Sort` trigger is now live too: `SortControl` opens an add-field menu of the not-yet-sorted columns (a popover on desktop, a full-screen dialog on mobile), and `ViewList` renders it next to `Filters` whenever the model has sortable fields. Active filters and sorts share one sticky constraints band below the toolbar: filter chips (primary-tinted) and sort chips (neutral). Sort editing lives on the chips: click to toggle direction, the trailing control removes, and (with more than one sort) each chip shows a grip handle and priority ordinal, and can be dragged by the handle to reorder. Each group has its own clear control (`Clear filters` / `Clear sort`), shown only with more than one chip. Column headers are not interactive; sorting is driven entirely from the `Sort` control and the sort chips, so the data surface stays free of sort affordances. The pagination footer is live too: `PaginationFooter` renders the range read-out, the rows-per-page selector (its `All` entry loads every page), and the navigation cluster; the selected page size persists per model. The panels below are static illustrations of the add menus and chip states; the live `SortControl` / `SortGroup` / `FilterGroup` are the source of truth, and this mockup trails them where they have moved ahead. See [Pagination](./pagination.md) for the footer's own reference.
:::

<VuedaDemo class="flex flex-col gap-3">
  <header class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
    <span class="font-semibold uppercase tracking-wide">view list · 4 rows · 1 selected · 3 active filters · 2 sorts (updated desc, mrr asc)</span>
    <span class="font-mono">sorted: {{ sorted.join(", ") }}</span>
  </header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <ClientOnly>
      <DemoTitleBar title="Customers">
        <template #actions>
          <Button size="sm" emphasis="outline">
            <FontAwesomeIcon :icon="faArrowUpFromBracket" />
            Export
          </Button>
          <Button size="sm" emphasis="outline">
            <FontAwesomeIcon :icon="faFileImport" />
            Import
          </Button>
          <Button size="sm" tone="primary">
            <FontAwesomeIcon :icon="faPlus" />
            New customer
          </Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <div class="flex items-center justify-between gap-2 border-b-hairline px-4 py-2">
      <div class="flex items-center gap-2">
        <Button size="sm" emphasis="outline" aria-haspopup="menu">
          <FontAwesomeIcon :icon="faFilter" />
          Filters
          <span class="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">3</span>
          <FontAwesomeIcon :icon="faChevronDown" class="size-2.5 text-muted-foreground" />
        </Button>
        <Button size="sm" emphasis="outline" aria-haspopup="dialog">
          <FontAwesomeIcon :icon="faSort" />
          Sort
          <span class="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">2</span>
          <FontAwesomeIcon :icon="faChevronDown" class="size-2.5 text-muted-foreground" />
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground"><FontAwesomeIcon :icon="faMagnifyingGlass" class="size-3" /></span>
          <Input class="w-48 pl-7" type="search" placeholder="Search customers…" />
        </div>
        <Button size="icon-sm" emphasis="outline" aria-label="Columns">
          <FontAwesomeIcon :icon="faTableColumns" />
        </Button>
        <Button size="icon-sm" emphasis="outline" aria-label="More">
          <FontAwesomeIcon :icon="faEllipsis" />
        </Button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2 border-b-hairline bg-muted/30 px-4 py-2">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>
      <span class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
        <button type="button" class="inline-flex items-center rounded-l-full py-0.5 pl-2.5 pr-2 hover:bg-primary/15" aria-label="Edit filter: Status">Status: Active</button>
        <span class="h-3.5 w-px bg-primary/30" aria-hidden="true"></span>
        <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-0.5 opacity-70 hover:bg-primary/15 hover:opacity-100" aria-label="Remove filter: Status"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <span class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
        <button type="button" class="inline-flex items-center rounded-l-full py-0.5 pl-2.5 pr-2 hover:bg-primary/15" aria-label="Edit filter: Owner">Owner: Mara Tani</button>
        <span class="h-3.5 w-px bg-primary/30" aria-hidden="true"></span>
        <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-0.5 opacity-70 hover:bg-primary/15 hover:opacity-100" aria-label="Remove filter: Owner"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <span class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
        <button type="button" class="inline-flex items-center rounded-l-full py-0.5 pl-2.5 pr-2 hover:bg-primary/15" aria-label="Edit filter: MRR">MRR: ≥ $1,000</button>
        <span class="h-3.5 w-px bg-primary/30" aria-hidden="true"></span>
        <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-0.5 opacity-70 hover:bg-primary/15 hover:opacity-100" aria-label="Remove filter: MRR"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <Button size="sm" emphasis="ghost" class="text-xs">Clear filters</Button>
      <span class="h-5 w-px self-center bg-border" aria-hidden="true"></span>
      <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sort</span>
      <span class="inline-flex items-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
        <span class="drag-handle inline-flex items-center gap-0.5 rounded-l-full cursor-grab select-none py-1 pl-2 pr-1 text-[10px] text-muted-foreground" aria-hidden="true"><FontAwesomeIcon :icon="faGripVertical" class="size-2.5 opacity-70" /><span class="font-mono tabular-nums">1</span></span>
        <button type="button" class="inline-flex items-center gap-1.5 py-1 pl-1.5 pr-2 hover:bg-accent" aria-label="Toggle sort: Updated (descending)">Updated<FontAwesomeIcon :icon="faSortDown" class="size-2.5 text-muted-foreground" /></button>
        <span class="h-4 w-px bg-border" aria-hidden="true"></span>
        <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-1 opacity-70 hover:bg-accent hover:opacity-100" aria-label="Remove sort: Updated"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <span class="inline-flex items-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
        <span class="drag-handle inline-flex items-center gap-0.5 rounded-l-full cursor-grab select-none py-1 pl-2 pr-1 text-[10px] text-muted-foreground" aria-hidden="true"><FontAwesomeIcon :icon="faGripVertical" class="size-2.5 opacity-70" /><span class="font-mono tabular-nums">2</span></span>
        <button type="button" class="inline-flex items-center gap-1.5 py-1 pl-1.5 pr-2 hover:bg-accent" aria-label="Toggle sort: MRR (ascending)">MRR<FontAwesomeIcon :icon="faSortDown" class="size-2.5 rotate-180 text-muted-foreground" /></button>
        <span class="h-4 w-px bg-border" aria-hidden="true"></span>
        <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-1 opacity-70 hover:bg-accent hover:opacity-100" aria-label="Remove sort: MRR"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <Button size="sm" emphasis="ghost" class="text-xs">Clear sort</Button>
    </div>
    <div class="flex items-center gap-4 border-b-hairline bg-muted/50 px-4 py-2 text-sm">
      <span class="flex items-center gap-2 font-medium">
        <FontAwesomeIcon :icon="faCheck" class="text-primary" />
        <strong>1</strong> selected
      </span>
      <div class="flex items-center gap-1">
        <Button size="sm" emphasis="ghost">
          <FontAwesomeIcon :icon="faEnvelope" />
          Email
        </Button>
        <Button size="sm" emphasis="ghost">
          <FontAwesomeIcon :icon="faTag" />
          Tag
        </Button>
        <Button size="sm" emphasis="ghost">
          <FontAwesomeIcon :icon="faArrowRight" />
          Reassign
        </Button>
        <Button size="sm" emphasis="ghost">
          <FontAwesomeIcon :icon="faTrash" />
          Delete
        </Button>
      </div>
    </div>
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
    <div class="flex flex-wrap items-center justify-between gap-3 border-t-hairline px-4 py-2 text-xs text-muted-foreground">
      <div class="flex items-center gap-4">
        <span class="font-mono tabular-nums">Showing <strong class="text-foreground">1 to 4</strong> of <strong class="text-foreground">142</strong></span>
        <span class="flex items-center gap-1.5">
          Rows per page:
          <NativeSelect class="w-auto">
            <NativeSelectOption value="25">25</NativeSelectOption>
            <NativeSelectOption value="50">50</NativeSelectOption>
            <NativeSelectOption value="100">100</NativeSelectOption>
            <NativeSelectOption value="200">200</NativeSelectOption>
            <NativeSelectOption value="all">All</NativeSelectOption>
          </NativeSelect>
        </span>
      </div>
      <nav class="flex items-center gap-1" aria-label="Pagination">
        <Button size="icon-sm" emphasis="outline" aria-label="First page" disabled>
          <FontAwesomeIcon :icon="faAnglesLeft" />
        </Button>
        <Button size="icon-sm" emphasis="outline" aria-label="Previous page" disabled>
          <FontAwesomeIcon :icon="faChevronLeft" />
        </Button>
        <span class="px-2 font-mono text-xs font-medium tabular-nums text-foreground">Page 1 of 36</span>
        <Button size="icon-sm" emphasis="outline" aria-label="Next page">
          <FontAwesomeIcon :icon="faChevronRight" />
        </Button>
        <Button size="icon-sm" emphasis="outline" aria-label="Last page">
          <FontAwesomeIcon :icon="faAnglesRight" />
        </Button>
      </nav>
    </div>
  </div>
  <div class="flex flex-col gap-2">
    <header class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filters [3] → add-filter flow · the popover swaps content in place (no modal, no second surface)</header>
    <div class="flex flex-wrap items-start gap-6">
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">1 · pick a field (lists only the fields not yet applied)</span>
        <div class="w-60 rounded-vueda-control overlay-hairline bg-popover p-1 text-popover-foreground">
          <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Add filter</div>
          <button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">Account<FontAwesomeIcon :icon="faChevronRight" class="ml-auto size-3 text-muted-foreground" /></button>
          <button type="button" class="flex w-full items-center gap-2 rounded-sm bg-accent px-2 py-1.5 text-sm text-accent-foreground">Plan tier<FontAwesomeIcon :icon="faChevronRight" class="ml-auto size-3" /></button>
          <button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">Created<FontAwesomeIcon :icon="faChevronRight" class="ml-auto size-3 text-muted-foreground" /></button>
          <button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">Renewal date<FontAwesomeIcon :icon="faChevronRight" class="ml-auto size-3 text-muted-foreground" /></button>
          <button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">Tax-exempt<FontAwesomeIcon :icon="faChevronRight" class="ml-auto size-3 text-muted-foreground" /></button>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">2 · set the value · ‹ returns to the list to add another</span>
        <div class="w-60 rounded-vueda-control overlay-hairline bg-popover p-1 text-popover-foreground">
          <button type="button" class="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"><FontAwesomeIcon :icon="faChevronLeft" class="size-3" />Add filter</button>
          <div class="bg-border -mx-1 my-1 h-px"></div>
          <div class="px-2 pb-1 pt-0.5">
            <h3 class="mb-2 text-sm font-semibold">Filter by Plan tier</h3>
            <div class="flex h-7 items-center justify-between rounded-vueda-control border border-input bg-background px-2 text-sm text-foreground">Enterprise<FontAwesomeIcon :icon="faChevronDown" class="size-3 text-muted-foreground" /></div>
            <div class="mt-2 flex justify-end"><Button size="sm" tone="primary">Apply</Button></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="flex flex-col gap-2">
    <header class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sort → the trigger opens an add-field menu · picking a field appends a chip · editing lives on the chips in the band above</header>
    <div class="flex flex-wrap items-start gap-6">
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">chip anatomy · grip + mono ordinal show only with more than one sort · the label toggles direction · ✕ removes</span>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
            <span class="drag-handle inline-flex items-center gap-0.5 rounded-l-full cursor-grab select-none py-1 pl-2 pr-1 text-[10px] text-muted-foreground" aria-hidden="true"><FontAwesomeIcon :icon="faGripVertical" class="size-2.5 opacity-70" /><span class="font-mono tabular-nums">1</span></span>
            <button type="button" class="inline-flex items-center gap-1.5 py-1 pl-1.5 pr-2 hover:bg-accent" aria-label="Toggle sort: Updated (descending)">Updated<FontAwesomeIcon :icon="faSortDown" class="size-2.5 text-muted-foreground" /></button>
            <span class="h-4 w-px bg-border" aria-hidden="true"></span>
            <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-1 opacity-70 hover:bg-accent hover:opacity-100" aria-label="Remove sort: Updated"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
          </span>
          <span class="text-[11px] text-muted-foreground">→ with a single sort the grip and ordinal drop:</span>
          <span class="inline-flex items-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
            <button type="button" class="inline-flex items-center gap-1.5 rounded-l-full py-1 pl-2.5 pr-2 hover:bg-accent" aria-label="Toggle sort: Updated (descending)">Updated<FontAwesomeIcon :icon="faSortDown" class="size-2.5 text-muted-foreground" /></button>
            <span class="h-4 w-px bg-border" aria-hidden="true"></span>
            <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-1 opacity-70 hover:bg-accent hover:opacity-100" aria-label="Remove sort: Updated"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">Add sort menu · lists only fields not already sorted · clicking one appends a chip · popover on desktop, full-screen dialog on mobile</span>
        <div class="w-60 rounded-vueda-control overlay-hairline bg-popover p-1 text-popover-foreground">
          <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Add sort</div>
          <button type="button" class="flex w-full items-center rounded-sm bg-accent px-2 py-1.5 text-sm text-accent-foreground">Account</button>
          <button type="button" class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">Owner</button>
          <button type="button" class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">Status</button>
        </div>
      </div>
    </div>
  </div>
  <div class="flex flex-col gap-2">
    <header class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Error state · the server rejects a filter value (HTTP 400, keyed by field) — no separate banner</header>
    <div class="flex flex-wrap items-start gap-6">
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">errored chip · destructive tint flags which filter is invalid</span>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
            <button type="button" class="inline-flex items-center rounded-l-full py-0.5 pl-2.5 pr-2 hover:bg-primary/15" aria-label="Edit filter: Status">Status: Active</button>
            <span class="h-3.5 w-px bg-primary/30" aria-hidden="true"></span>
            <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-0.5 opacity-70 hover:bg-primary/15 hover:opacity-100" aria-label="Remove filter: Status"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
          </span>
          <span class="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 text-xs font-semibold text-destructive">
            <button type="button" class="inline-flex items-center gap-1.5 rounded-l-full py-0.5 pl-2.5 pr-2 hover:bg-destructive/15" aria-label="Edit filter: Plan tier (invalid value)"><FontAwesomeIcon :icon="faTriangleExclamation" class="size-2.5" />Plan tier: 24</button>
            <span class="h-3.5 w-px bg-destructive/30" aria-hidden="true"></span>
            <button type="button" class="inline-flex items-center rounded-r-full px-1.5 py-0.5 opacity-70 hover:bg-destructive/15 hover:opacity-100" aria-label="Remove filter: Plan tier"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">click the errored chip · same form, chip container · the server message renders inline</span>
        <div class="w-60 rounded-vueda-control overlay-hairline bg-popover p-1 text-popover-foreground">
          <div class="px-2 pb-1 pt-1.5">
            <h3 class="mb-2 text-sm font-semibold">Filter by Plan tier</h3>
            <div class="flex h-7 items-center justify-between rounded-vueda-control border border-destructive bg-background px-2 text-sm text-foreground" aria-invalid="true">24<FontAwesomeIcon :icon="faChevronDown" class="size-3 text-muted-foreground" /></div>
            <p class="mt-1 text-xs text-destructive">Select a valid choice. 24 is not one of the available choices.</p>
            <div class="mt-2 flex items-center justify-between">
              <Button size="sm" tone="destructive" emphasis="ghost" class="text-xs">Remove</Button>
              <Button size="sm" tone="primary">Apply</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>under-actions: search and column controls anchored right; the Filters and Sort controls sit left</span>
    <span>Sort: opens the add-field menu of fields not already sorted (popover on desktop, full-screen dialog on mobile); clicking one appends a sort chip</span>
    <span>sort chips: click to toggle direction, ✕ to remove; with more than one sort, drag a chip by its grip handle to reorder. Each group's Clear sort shows only with more than one chip</span>
    <span>Filters: opens the add-filter menu of not-yet-applied fields</span>
    <span>add-filter flow: pick a field, the popover slides to that field's form in place; ‹ returns to the list; one anchored surface, no modal</span>
    <span>filter chips: one per active filter; click the label to edit (reopens the same form anchored to the chip), ✕ to remove, Clear filters resets every filter</span>
    <span>constraints band: tinted, sticky, and present only when active filters or sorts exist</span>
    <span>errors (HTTP 400, keyed by field): the offending chip turns destructive and its form shows the server message inline; no separate error banner</span>
    <span>bulk-actions strip: transient, appears only when rows are selected</span>
    <span>ObjectsGrid: flush inside the card — no nested border or card-in-card radius</span>
    <span>pagination footer: range read-out (Showing X to Y of N), rows-per-page selector (All loads every page), Page N of M; the selected page size persists per model</span>
  </footer>
</VuedaDemo>

## ViewCreate

The create view pairs PageTitle with a sticky action bar that holds the primary submit action (pinned and always reachable during form entry) alongside secondary options like "Save and add another." In a real shell that bar teleports into the sticky stack beneath the title (see [Sticky Chrome](./sticky-chrome.md)); the demo below shows it as a standalone `StickyBar` bound to the demo panel. The form body renders a real {@api vue:component:FormModel} against seeded model metadata, so it shows the framework's actual default field layout (a single-column stack) rather than hand-built markup. Grouping fields into sections or a multi-column grid is a customization layered on top; see [Forms](/reference/components/forms).

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view create · blank form · pristine</header>
  <div ref="createViewport" class="rounded-vueda-card hairline hairline-border bg-card overflow-y-auto max-h-[34rem]">
    <ClientOnly>
      <DemoTitleBar title="Create customer">
        <template #actions>
          <Button size="sm" emphasis="ghost">Cancel</Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <StickyBar :scroll-root="createViewport">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button tone="primary">
            <FontAwesomeIcon :icon="faCheck" />
            Create customer
          </Button>
          <Button emphasis="outline">Save and add another</Button>
        </div>
        <span class="text-xs text-muted-foreground">All required fields marked <span class="text-destructive">*</span></span>
      </div>
    </StickyBar>
    <ClientOnly>
      <DemoFormModel app="showcase" :fields="customerCreateFields" model="customer" view="create" view-theme="ViewCreate" />
    </ClientOnly>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>StickyBar sits directly below PageTitle: primary submit is always reachable without scrolling to the bottom</span>
    <span>form body: a real FormModel rendered against seeded model metadata; the gutter comes from the ViewCreate body theme slot</span>
    <span>the default field layout is a single-column stack. Section grouping and multi-column grids are customizations.</span>
  </footer>
</VuedaDemo>

## ViewRead

The read view presents a single record in a non-editable layout: a `FormModel` in `read`
view, where every field renders through {@api vue:component:WidgetReadOnly} as a
label/value row. Above it sits a sticky action bar of transition buttons, and the
page-level actions teleport into the layout's PageTitle action zone.

The demo below is the live component. It runs through the `ModelDemo` harness against the
same seeded customer model the create and update demos use, so the row layout, label
column, and action buttons are the framework's actual output rather than an approximation.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view read · single record · live ViewRead</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <ModelDemo
      :view="() => import('@vueda/views/ViewRead.vue')"
      :app="readScenario.app"
      :model="readScenario.model"
      pk="1"
      :seed="readScenario.seed"
      :api="readScenario.api"
      page-title
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>read rows: {@api theme-key:Field} in its <code>read</code> orientation — a <code>180px</code> label column, <code>1fr</code> value, and a bottom hairline per row</span>
    <span>label type: 12 px / 500 / <code>--muted-foreground</code>, top-aligned against a value that may wrap to several lines</span>
    <span>action bar: one {@api vue:component:LinkModelView} button per entry in the record's <code>available_actions</code>, with <code>update</code> promoted to the filled primary and <code>destroy</code> picking up the destructive tone</span>
    <span>PageTitle: supplied here by the docs harness, as an integrator's layout would; the view contributes the title and teleports its non-detail actions into the title row</span>
    <span>theme keys: {@api theme-key:ViewRead}, {@api theme-key:Field}, {@api theme-key:WidgetReadOnly} · source: <code>ViewRead.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

::: info What the retired mockup showed
This section used to carry a hand-authored mockup. Some of what it showed is not what the
default read view renders, and those gaps are recorded here rather than lost:

- **Grouped sections.** The mockup split the record into Profile / Billing / Notes bands,
  each with an uppercase heading and a right-aligned meta line. `ViewRead` renders one flat
  `FormModel`. Section grouping is a customization, not a default.
- **Named transition buttons.** The mockup showed Edit, History, Email, and Renew plus an
  overflow menu. The real bar is generated from the record's `available_actions`, so it
  reads Update, Partial Update, and Destroy. History, Email, and Renew are project-defined
  actions; the overflow menu does not exist at all.
- **Action labels.** Button text is `startCase` applied to the DRF action name, so the
  `partial_update` action reads "Partial Update" rather than a friendlier phrase.
- **A status badge in the title row.** The mockup put an "Active" badge beside the title.
  `PageActions` hosts action buttons; a status badge there is a consumer addition.
- **Choice and boolean values.** The mockup rendered `Mara Tani`, `Enterprise`, `USD`, and
  `No`. `WidgetReadOnly` resolves a foreign key through its `formatted_name` but does not
  map a static `ChoiceField` value to its label, so the live demo shows the stored `mt`,
  `enterprise`, `usd`, and `false`. This is a gap in `WidgetReadOnly`, not a deliberate
  design decision.
- **Row metrics.** The mockup used a 160 px label column with `divide-y` separators. The
  real read orientation uses 180 px and a per-row bottom hairline.
  :::

## ViewUpdate

The update view renders the same form as create, populated from the loaded record. The body below is a real {@api vue:component:FormModel} seeded with initial values. Two update-specific behaviors are view-level and are not shown by a standalone FormModel: per-field modified indicators (a primary-tinted dot and "Modified" badge in the label) and the form-level error Alert that renders after a failed save.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view update · populated form · real FormModel</header>
  <div ref="updateViewport" class="rounded-vueda-card hairline hairline-border bg-card overflow-y-auto max-h-[34rem]">
    <ClientOnly>
      <DemoTitleBar title="Edit Northwind Logistics">
        <template #actions>
          <Button size="sm" emphasis="ghost">View read-only</Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <StickyBar :scroll-root="updateViewport">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button tone="primary">
            <FontAwesomeIcon :icon="faCheck" />
            Save changes
          </Button>
          <Button emphasis="outline">Discard</Button>
        </div>
      </div>
    </StickyBar>
    <ClientOnly>
      <DemoFormModel app="showcase" :fields="customerUpdateFields" :initial-values="customerUpdateValues" model="customer" view="update" view-theme="ViewUpdate" />
    </ClientOnly>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>form body: a real FormModel seeded with initial values; the gutter comes from the ViewUpdate body theme slot</span>
    <span>per-field modified indicators and the form-level error Alert are view-level behaviors, not shown by a standalone FormModel</span>
    <span>labels, help text, required markers, and select options all come from the seeded field metadata</span>
  </footer>
</VuedaDemo>

## ViewDestroy

The destroy view is a dedicated danger page, not a modal, so it can be linked to, bookmarked,
and made part of a multi-stage flow. `ViewDestroy` wraps a `ModelActionForm` in its own
destructive-toned card: a banner quantifies the blast radius, the selected records are listed
from the fetched instances, and an optional type-to-confirm phrase gates the submit button.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view destroy · 3 records selected · live ViewDestroy</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewDestroy.vue')"
    :app="destroyScenario.app"
    :model="destroyScenario.model"
    :pk="['4', '11', '23']"
    action="destroy"
    :seed="destroyScenario.seed"
    :api="destroyScenario.api"
    :view-props="destroyViewProps"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>card: {@api theme-key:ViewDestroy} paints a <code>border-destructive/50</code> edge plus an 8 % destructive ring, and wraps the inner {@api theme-key:ModelActionForm} as <code>bare</code> so only this surface carries chrome</span>
    <span>banner: destructive 6 %-mix fill behind a 36 px destructive icon tile; the title is generated from the record count and model verbose name</span>
    <span>consequences: the <code>linkedObjectCounts</code> prop becomes a {@api vue:component:ConsequencesBullets} list. With none supplied the banner falls back to a single "This action cannot be undone." line</span>
    <span>records: fetched by pk, then rendered through {@api vue:component:WidgetReadOnly}, which shows each row's <code>formatted_name</code> beside its primary key</span>
    <span>type-to-confirm: {@api vue:component:TypedConfirmField} holds its own value and gates submit; it is not a form field, so the phrase never reaches the request body</span>
    <span>theme keys: {@api theme-key:ViewDestroy}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewDestroy.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

::: warning This demo disables the dry-run pre-flight
`ModelActionForm` runs a dry-run request on mount so the server can reject early. Against a
real backend that pre-flight currently fails: the server answers a dry-run destroy with
`200` (`vueda/core/viewsets/__init__.py`), while `defaultObjectsDelete` accepts only `204`
as success and raises a `FetchError` for anything else. `ViewDestroy` hands the resulting
list state to `ActionForm` as `fetchState`, so the view mounts with a "Failed to delete
object: 200" banner over an otherwise correct page.

The demo passes `enableDryRun: false` so the page reads as intended rather than as the bug.
Fixing the status handling then exposes a second one: reactive-helpers' `bulkDelete` empties
its object list on any resolved delete, dry run included, so a successful pre-flight would
clear the selected records before the operator confirms. The two need fixing together.
:::

::: info What the retired mockup showed
The hand-authored mockup this section used to carry differed from the default view in
several ways, recorded here rather than lost:

- **Banner copy.** The mockup wrote two prose paragraphs with counts bolded inline. The real
  banner is a generated title plus a `ConsequencesBullets` list, one line per linked type.
  The mockup's "Audit log entries will be retained for 90 days" sentence has no equivalent.
- **Record rows.** The mockup hand-built rows with a building icon and a `#1019`-style id.
  The real list renders each fetched record through `WidgetReadOnly`, with no icon and the
  bare primary key as a trailing mono chip.
- **Confirm field placement.** The mockup put the type-to-confirm inside a `Field` with its
  own label and description. `TypedConfirmField` is self-contained: a label with an inline
  mono chip carrying the expected phrase, then a mono input.
- **Its own action row.** The mockup ended with a hand-built Cancel / Delete pair, the
  destructive one labelled "Delete 3 customers permanently". The real buttons come from
  `ActionForm` and read "Yes, continue" and "Cancel, go back" unless a consumer overrides
  the `confirm-button` slot.
- **Card accent.** The mockup applied an inline `color-mix` border at 40 % and a 10 %
  box-shadow ring. The theme uses `border-destructive/50` and an 8 % ring.
  :::

## Customization surface

Token decisions flow across all five views:

- {@api css-token:card} and {@api css-token:background} set the view card and page background.
- {@api css-token:border} controls every divider, separator, and card edge in the views.
- {@api css-token:primary} tints active filter chips, modified indicators, status badges, and the selected-row accent.
- {@api css-token:destructive} drives the destroy view's card border, banner background, and submit button.
- {@api css-token:muted} and {@api css-token:muted-foreground} apply to filter strips, pagination labels, section headers, and empty values.

The highest-value theme keys for CRUDL views:

- {@api theme-key:PageTitle} — `root`, `title`, `buttons`. Override `title` to change the heading size and weight (default: `text-[22px] font-semibold leading-[1.2]`).
- StickyBar and the sticky-stack keys are covered on its own page: see [Sticky Chrome](./sticky-chrome.md#customization-surface).
- ObjectsGrid keys are covered on its own page: {@api theme-key:ObjectsGrid}, {@api theme-key:ObjectsGridTableHeader}, {@api theme-key:ObjectsGridBodyCell}.
- Field and form keys are covered on the Forms page: {@api theme-key:Field}, {@api theme-key:FieldLabel}, {@api theme-key:FieldContent}.
- {@api theme-key:Alert} controls the form-level error banner in ViewUpdate.
- {@api theme-key:Button} — override `_ButtonDestructive` to restyle the delete action across destroy views without touching other button variants.
