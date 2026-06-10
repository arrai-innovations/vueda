---
title: CRUDL Views
status: draft
audience: designer
type: reference
---

<script setup>
import PageTitle from "@vueda/components/PageTitle.vue";
import PageActions from "@vueda/components/PageActions.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import Button from "@vueda/controls/button/Button.vue";
import Input from "@vueda/controls/input/Input.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import Textarea from "@vueda/controls/textarea/Textarea.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faAnglesLeft,
    faAnglesRight,
    faArrowRight,
    faArrowUpFromBracket,
    faCheck,
    faChevronLeft,
    faChevronRight,
    faClockRotateLeft,
    faEllipsis,
    faFileImport,
    faFilter,
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
import { faBuilding, faEnvelope } from "@fortawesome/free-regular-svg-icons";
import { defineComponent, h, ref } from "vue";

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

const sorted = ref(["-updated"]);

// Each StickyBar demo binds its scroll-root to its own bounded, scrollable
// panel so the bar pins to and reacts to the demo viewport instead of the page
// (otherwise it would stick to the window and ride up over the site nav).
const stickyViewport = ref(null);
const createViewport = ref(null);
const readViewport = ref(null);
const updateViewport = ref(null);

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

// Registers a title source into the surrounding page-title context, rendering nothing itself.
// In a real app this is what a view does via usePageTitle(() => ({ title, loading })).
const TitleRegistrar = defineComponent({
    name: "TitleRegistrar",
    props: { title: { type: String, default: undefined }, loading: { type: Boolean, default: undefined } },
    setup(props) {
        usePageTitle(() => ({ title: props.title, loading: props.loading }));
        return () => null;
    },
});

// Demo-only wrapper. Each example needs its own title, so this establishes an isolated page-title
// context (usePageTitle with no args), registers the title, and renders the real PageTitle display
// plus a PageActions cluster from the #actions slot. In a real app the layout calls usePageTitle()
// once above <RouterView> and each view registers its own title; here we collapse that into one
// component so every demo is self-contained. Client-only because PageActions teleports into the
// title bar's action zone, which only exists after the display mounts.
const DemoTitleBar = defineComponent({
    name: "DemoTitleBar",
    props: { title: { type: String, default: undefined }, loading: { type: Boolean, default: undefined } },
    setup(props, { slots }) {
        usePageTitle();
        return () => [
            h(TitleRegistrar, { title: props.title, loading: props.loading }),
            h(PageTitle),
            slots.actions ? h(PageActions, null, { default: slots.actions }) : null,
        ];
    },
});
</script>

# CRUDL Views

Five view-scale layouts that form the backbone of every VUEDA application: list, create, read, update, and destroy. The two new components introduced here are {@api vue:component:PageTitle}, the layout-level header that displays each view's title and page actions, and {@api vue:component:StickyBar}, a scroll-aware action zone that keeps submit controls reachable on long forms. All other chrome — fields, field sets, alerts, ObjectsGrid, badges — is composed from earlier families.

Token surface: {@api css-token:background}, {@api css-token:card}, {@api css-token:border}, {@api css-token:primary}, {@api css-token:destructive}, {@api css-token:muted}, {@api css-token:muted-foreground}.

This page is the visual contract the default theme guarantees at view scale. Use it as the target spec when re-skinning. For the mechanics of overriding any of this, see [Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md).

## PageTitle

{@api vue:component:PageTitle} is the layout-level page header. The integrator places it once above `<RouterView>`; it reads the active view's title and loading state from `usePageTitle` (not from props) and hosts the action zone that `PageActions` teleports page-level buttons into. Setting `sticky` pins the bar and adds a gradient fade below it.

The demos below use a small `DemoTitleBar` wrapper that stands in for the layout: it establishes the page-title context, registers a title, and renders `PageTitle` plus a `PageActions` cluster. In an application the layout owns that wiring and each view contributes only its title and actions.

Theme keys: {@api theme-key:PageTitle}.

<VuedaDemo class="flex flex-col gap-6">
  <DemoCard title="title + actions">
    <div class="rounded-vueda-card border border-border bg-card overflow-clip">
      <ClientOnly>
        <DemoTitleBar title="Customers">
          <template #actions>
            <Button size="sm" variant="outline">
              <FontAwesomeIcon :icon="faArrowUpFromBracket" />
              Export
            </Button>
            <Button size="sm" variant="default">
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
    <div class="rounded-vueda-card border border-border bg-card overflow-clip">
      <ClientOnly>
        <DemoTitleBar title="Northwind Logistics" :loading="true">
          <template #actions>
            <Button size="sm" variant="default" disabled>Edit</Button>
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

## StickyBar

{@api vue:component:StickyBar} wraps the default slot in a themed container that hides when the user scrolls down past its initial position and reappears when they scroll back up. In VUEDA forms it sits directly below PageTitle and holds the primary submit action.

By default the bar reacts to the window's scroll. When the bar lives inside a scrollable region rather than scrolling the whole page, pass that region's element to the `scrollRoot` prop so the bar pins to and reacts to it. The demo below does this: it binds `scrollRoot` to the bounded, scrollable panel so the bar treats the panel as its page.

Theme keys: {@api theme-key:StickyBar}.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">sticky bar · submit pattern</header>
  <ClientOnly>
    <div ref="stickyViewport" class="rounded-vueda-card border border-border bg-card overflow-y-auto max-h-[20rem]">
      <StickyBar :scroll-root="stickyViewport">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Button variant="default">
              <FontAwesomeIcon :icon="faCheck" />
              Create customer
            </Button>
            <Button variant="outline">Save and add another</Button>
          </div>
          <span class="text-xs text-muted-foreground">All required fields marked <span class="text-destructive">*</span></span>
        </div>
      </StickyBar>
      <div class="px-6 py-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field orientation="vertical">
            <FieldLabel for="sb-name">Account name <span aria-hidden="true" class="text-destructive">*</span></FieldLabel>
            <FieldContent>
              <Input id="sb-name" placeholder="Granger Holdings" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-domain">Primary domain</FieldLabel>
            <FieldContent>
              <Input id="sb-domain" placeholder="example.com" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-owner">Owner <span aria-hidden="true" class="text-destructive">*</span></FieldLabel>
            <FieldContent>
              <NativeSelect id="sb-owner">
                <NativeSelectOption value="">— select —</NativeSelectOption>
                <NativeSelectOption value="mt">Mara Tani</NativeSelectOption>
                <NativeSelectOption value="jr">Jordan Reyes</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-tier">Plan tier</FieldLabel>
            <FieldContent>
              <NativeSelect id="sb-tier">
                <NativeSelectOption value="trial">Trial</NativeSelectOption>
                <NativeSelectOption value="standard" selected>Standard</NativeSelectOption>
                <NativeSelectOption value="enterprise">Enterprise</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-billing-email">Billing email</FieldLabel>
            <FieldContent>
              <Input id="sb-billing-email" type="email" placeholder="ar@example.com" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-currency">Currency</FieldLabel>
            <FieldContent>
              <NativeSelect id="sb-currency">
                <NativeSelectOption value="usd">USD</NativeSelectOption>
                <NativeSelectOption value="eur">EUR</NativeSelectOption>
                <NativeSelectOption value="gbp">GBP</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-tax">Tax ID</FieldLabel>
            <FieldContent>
              <Input id="sb-tax" placeholder="Optional" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sb-phone">Billing phone</FieldLabel>
            <FieldContent>
              <Input id="sb-phone" type="tel" placeholder="Optional" />
            </FieldContent>
          </Field>
          <Field orientation="vertical" class="sm:col-span-2">
            <FieldLabel for="sb-notes">Notes</FieldLabel>
            <FieldContent>
              <Textarea id="sb-notes" placeholder="Internal notes visible only to staff." rows="3" />
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>
  </ClientOnly>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>StickyBar default slot: free-form layout, usually a flex row of actions</span>
    <span>theme key: <code>StickyBar.inner</code> for bar chrome, <code>StickyBar.gradient</code> for the fade below</span>
    <span>the bar binds <code>scrollRoot</code> to this panel; scroll inside the panel to see it hide on the way down and reappear on the way up</span>
  </footer>
</VuedaDemo>

## ViewList

The list view is the entry point for every {@term CRUDL} resource. PageTitle anchors the top with primary create actions. An under-actions bar provides search, column control, and filter/sort toggles — the search and column buttons stay anchored right at all times. When rows are selected, a bulk-actions strip appears below. Filter chips sit in a tinted strip when active filters are present. {@api vue:component:ObjectsGrid} fills the card body flush, and a pagination footer follows.

<VuedaDemo class="flex flex-col gap-3">
  <header class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
    <span class="font-semibold uppercase tracking-wide">view list · 4 rows · 1 selected · 3 active filters · sorted updated desc</span>
    <span class="font-mono">sorted: {{ sorted.join(", ") }}</span>
  </header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <ClientOnly>
      <DemoTitleBar title="Customers">
        <template #actions>
          <Button size="sm" variant="outline">
            <FontAwesomeIcon :icon="faArrowUpFromBracket" />
            Export
          </Button>
          <Button size="sm" variant="outline">
            <FontAwesomeIcon :icon="faFileImport" />
            Import
          </Button>
          <Button size="sm" variant="default">
            <FontAwesomeIcon :icon="faPlus" />
            New customer
          </Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <div class="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
      <div class="flex items-center gap-2">
        <Button size="sm" variant="outline">
          <FontAwesomeIcon :icon="faFilter" />
          Filters
          <span class="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">3</span>
        </Button>
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faSort" />
          Sort
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground"><FontAwesomeIcon :icon="faMagnifyingGlass" class="size-3" /></span>
          <Input class="w-48 pl-7" type="search" placeholder="Search customers…" />
        </div>
        <Button size="icon-sm" variant="outline" aria-label="Columns">
          <FontAwesomeIcon :icon="faTableColumns" />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="More">
          <FontAwesomeIcon :icon="faEllipsis" />
        </Button>
      </div>
    </div>
    <div class="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>
      <span class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
        Status: Active
        <button type="button" class="inline-flex items-center text-current opacity-70 hover:opacity-100" aria-label="Remove filter"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <span class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
        Owner: Mara Tani
        <button type="button" class="inline-flex items-center text-current opacity-70 hover:opacity-100" aria-label="Remove filter"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <span class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
        MRR: ≥ $1,000
        <button type="button" class="inline-flex items-center text-current opacity-70 hover:opacity-100" aria-label="Remove filter"><FontAwesomeIcon :icon="faXmark" class="size-2.5" /></button>
      </span>
      <Button size="sm" variant="ghost" class="ml-auto text-xs">Clear all</Button>
    </div>
    <div class="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-2 text-sm">
      <span class="flex items-center gap-2 font-medium">
        <FontAwesomeIcon :icon="faCheck" class="text-primary" />
        <strong>1</strong> selected
      </span>
      <div class="flex items-center gap-1">
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faEnvelope" />
          Email
        </Button>
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faTag" />
          Tag
        </Button>
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faArrowRight" />
          Reassign
        </Button>
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faTrash" />
          Delete
        </Button>
      </div>
    </div>
    <ClientOnly>
      <ObjectsGrid v-model:sorted="sorted" :objects-in-order="accounts" :fields="fields" :sortables="['account', 'owner', 'status', 'updated', 'mrr']" table-breakpoint="xs" :field-props="{ statusClasses }">
        <template #sort-icon="{ ascending, descending }">
          <FontAwesomeIcon v-if="ascending" :icon="faSortDown" class="rotate-180" />
          <FontAwesomeIcon v-else-if="descending" :icon="faSortDown" />
          <FontAwesomeIcon v-else :icon="faSort" />
        </template>
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
            <button type="button" class="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit"><FontAwesomeIcon :icon="faPen" /></button>
            <button type="button" class="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></button>
          </span>
        </template>
      </ObjectsGrid>
    </ClientOnly>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
      <div class="flex items-center gap-4">
        <span>Showing <strong class="text-foreground">1–4</strong> of <strong class="text-foreground">142</strong></span>
        <span class="flex items-center gap-1.5">
          Rows per page:
          <NativeSelect class="w-auto">
            <NativeSelectOption value="8">8</NativeSelectOption>
            <NativeSelectOption value="25">25</NativeSelectOption>
            <NativeSelectOption value="50">50</NativeSelectOption>
          </NativeSelect>
        </span>
      </div>
      <nav class="flex items-center gap-1" aria-label="Pagination">
        <Button size="icon-sm" variant="outline" aria-label="First page" disabled>
          <FontAwesomeIcon :icon="faAnglesLeft" />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="Previous page" disabled>
          <FontAwesomeIcon :icon="faChevronLeft" />
        </Button>
        <span class="px-2 text-xs font-medium text-foreground">Page 1 of 36</span>
        <Button size="icon-sm" variant="outline" aria-label="Next page">
          <FontAwesomeIcon :icon="faChevronRight" />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="Last page">
          <FontAwesomeIcon :icon="faAnglesRight" />
        </Button>
      </nav>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>under-actions: search and column controls always anchored right; filter/sort toggles left</span>
    <span>bulk-actions strip: transient, appears only when rows are selected</span>
    <span>filter chips: tinted strip below under-actions, present only when active filters exist</span>
    <span>ObjectsGrid: flush inside the card — no nested border or card-in-card radius</span>
  </footer>
</VuedaDemo>

## ViewCreate

The create view pairs PageTitle with a StickyBar immediately below it. The StickyBar holds the primary submit action (pinned and always reachable during form entry) alongside secondary options like "Save and add another." The form body below renders a real {@api vue:component:FormModel} against seeded model metadata, so it shows the framework's actual default field layout (a single-column stack) rather than hand-built markup. Grouping fields into sections or a multi-column grid is a customization layered on top; see [Forms](/reference/components/forms).

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view create · blank form · pristine</header>
  <div ref="createViewport" class="rounded-vueda-card border border-border bg-card overflow-y-auto max-h-[34rem]">
    <ClientOnly>
      <DemoTitleBar title="Create customer">
        <template #actions>
          <Button size="sm" variant="ghost">Cancel</Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <StickyBar :scroll-root="createViewport">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button variant="default">
            <FontAwesomeIcon :icon="faCheck" />
            Create customer
          </Button>
          <Button variant="outline">Save and add another</Button>
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

The read view presents a single record in a non-editable layout. Inputs are replaced by label/value rows with a fixed-width label column. The StickyBar swaps the submit button for transition actions (Edit, History, workflow steps). A status badge appears in the title actions area.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view read · single record · Northwind Logistics</header>
  <div ref="readViewport" class="rounded-vueda-card border border-border bg-card overflow-y-auto max-h-[34rem]">
    <ClientOnly>
      <DemoTitleBar title="Northwind Logistics">
        <template #actions>
          <span class="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Active</span>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <StickyBar :scroll-root="readViewport">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button variant="default">
            <FontAwesomeIcon :icon="faPen" />
            Edit
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline">
            <FontAwesomeIcon :icon="faClockRotateLeft" />
            History
          </Button>
          <Button variant="outline">
            <FontAwesomeIcon :icon="faEnvelope" />
            Email
          </Button>
          <Button variant="outline">
            <FontAwesomeIcon :icon="faArrowRight" />
            Renew
          </Button>
          <Button size="icon" variant="outline" aria-label="More">
            <FontAwesomeIcon :icon="faEllipsis" />
          </Button>
        </div>
      </div>
    </StickyBar>
    <div class="px-6 py-5">
      <div class="mb-6">
        <div class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</h3>
          <span class="text-xs text-muted-foreground">created 2024-08-12</span>
        </div>
        <div class="divide-y divide-border">
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Account name</span>
            <span>Northwind Logistics</span>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Primary domain</span>
            <a href="#" class="text-primary hover:underline">https://northwind.example</a>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Owner</span>
            <span>Mara Tani</span>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Plan tier</span>
            <span>Enterprise</span>
          </div>
        </div>
      </div>
      <div class="mb-6">
        <div class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Billing</h3>
          <span class="text-xs text-muted-foreground">last invoice 2026-04-01</span>
        </div>
        <div class="divide-y divide-border">
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">MRR</span>
            <span class="font-mono">$14,028.50</span>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Currency</span>
            <span>USD</span>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Tax-exempt</span>
            <span class="text-muted-foreground">No</span>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Renewal date</span>
            <span class="font-mono">2027-08-12</span>
          </div>
        </div>
      </div>
      <div>
        <div class="mb-3 border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes</h3>
        </div>
        <div class="divide-y divide-border">
          <div class="grid grid-cols-[160px_1fr] gap-x-6 py-2.5 text-sm">
            <span class="text-muted-foreground">Internal note</span>
            <span>Strong renewal signal — operations team expanded headcount in Q1 and added two new warehouse sites. Worth a check-in around mid-cycle. Last QBR: 2026-03-14.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>read-only rows: fixed-width label column (160 px) + 1fr value; border-bottom separators</span>
    <span>StickyBar: Edit is the primary action; secondary actions are context-specific transitions and history</span>
    <span>status badge: rendered through PageActions, right-aligned in the title row</span>
  </footer>
</VuedaDemo>

## ViewUpdate

The update view renders the same form as create, populated from the loaded record. The body below is a real {@api vue:component:FormModel} seeded with initial values. Two update-specific behaviors are view-level and are not shown by a standalone FormModel: per-field modified indicators (a primary-tinted dot and "Modified" badge in the label) and the form-level error Alert that renders after a failed save.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view update · populated form · real FormModel</header>
  <div ref="updateViewport" class="rounded-vueda-card border border-border bg-card overflow-y-auto max-h-[34rem]">
    <ClientOnly>
      <DemoTitleBar title="Edit Northwind Logistics">
        <template #actions>
          <Button size="sm" variant="ghost">View read-only</Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <StickyBar :scroll-root="updateViewport">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button variant="default">
            <FontAwesomeIcon :icon="faCheck" />
            Save changes
          </Button>
          <Button variant="outline">Discard</Button>
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

The destroy view is a dedicated danger page, not a modal. Bulk-selected records are surfaced as a list of named items. A banner at the top quantifies the cascading impact. A type-to-confirm field prevents accidental submission. The destructive action remains disabled until the confirmation phrase is typed exactly.

The view card takes on a destructive accent: border color is tinted toward `--destructive` and a matching box-shadow ring adds depth to reinforce the danger context.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view destroy · 3 records selected · destructive intent</header>
  <div class="rounded-vueda-card border bg-card overflow-clip" style="border-color: color-mix(in oklab, var(--destructive) 40%, var(--border)); box-shadow: 0 0 0 3px color-mix(in oklab, var(--destructive) 10%, transparent);">
    <ClientOnly>
      <DemoTitleBar title="Delete 3 customers">
        <template #actions>
          <Button size="sm" variant="ghost">Cancel</Button>
        </template>
      </DemoTitleBar>
    </ClientOnly>
    <div class="flex gap-4 border-b border-destructive/20 bg-destructive/5 px-6 py-4">
      <FontAwesomeIcon :icon="faTriangleExclamation" class="mt-0.5 shrink-0 text-destructive" />
      <div>
        <p class="font-semibold text-destructive">This will permanently delete 3 customer records and all associated data.</p>
        <p class="mt-1 text-sm text-muted-foreground"><strong class="text-foreground">26 contacts</strong>, <strong class="text-foreground">112 invoices</strong>, and <strong class="text-foreground">8 attachments</strong> linked to these customers will also be removed. Audit log entries will be retained for 90 days.</p>
      </div>
    </div>
    <div class="px-6 py-5">
      <div class="mb-5">
        <div class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Records to delete</h3>
          <span class="text-xs text-muted-foreground">3 of 3 selected</span>
        </div>
        <div class="divide-y divide-border rounded-vueda-control border border-border">
          <div class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FontAwesomeIcon :icon="faBuilding" class="shrink-0 text-muted-foreground" />
            <span>Pemberton &amp; Vale</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">#1019</span>
          </div>
          <div class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FontAwesomeIcon :icon="faBuilding" class="shrink-0 text-muted-foreground" />
            <span>Cordillera Botanicals</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">#1023</span>
          </div>
          <div class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FontAwesomeIcon :icon="faBuilding" class="shrink-0 text-muted-foreground" />
            <span>Foxglove &amp; Kettle</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">#1027</span>
          </div>
        </div>
      </div>
      <Field orientation="vertical" class="mb-5">
        <FieldLabel for="vd-confirm">Type to confirm</FieldLabel>
        <FieldContent>
          <Input id="vd-confirm" placeholder="delete 3 customers" />
          <FieldDescription>Type <code class="font-mono text-xs">delete 3 customers</code> exactly to enable the delete button.</FieldDescription>
        </FieldContent>
      </Field>
      <div class="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button variant="ghost">Cancel</Button>
        <Button variant="destructive" disabled aria-disabled="true">
          <FontAwesomeIcon :icon="faTrash" />
          Delete 3 customers permanently
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>card accent: border-color and box-shadow tinted toward <code>--destructive</code> via <code>color-mix</code></span>
    <span>banner: bg-destructive/5 tint + destructive icon; quantifies cascading deletes before the user commits</span>
    <span>type-to-confirm: submit remains disabled until the phrase matches; guards against accidental bulk-delete</span>
    <span>full view (not a modal): destroy can be linked to, bookmarked, and is sometimes a multi-stage flow</span>
  </footer>
</VuedaDemo>

## Customization surface

Token decisions flow across all five views:

- {@api css-token:card} and {@api css-token:background} set the view card and page background.
- {@api css-token:border} controls every divider, separator, and card edge in the views.
- {@api css-token:primary} tints active filter chips, modified indicators, status badges, and the selected-row accent.
- {@api css-token:destructive} drives the destroy view's card border, banner background, and submit button.
- {@api css-token:muted} and {@api css-token:muted-foreground} apply to filter strips, pagination labels, section headers, and empty values.

The highest-value theme keys for CRUDL views:

- {@api theme-key:PageTitle} — `root`, `title`, `buttons`, `gradient`. Override `title` to change the heading size and weight (default: `text-[22px] font-semibold leading-[1.2]`).
- {@api theme-key:StickyBar} — `root`, `inner`, `gradient`. Override `inner` to add a border, change the background, or adjust padding.
- ObjectsGrid keys are covered on its own page: {@api theme-key:ObjectsGrid}, {@api theme-key:ObjectsGridTableHeader}, {@api theme-key:ObjectsGridBodyCell}.
- Field and form keys are covered on the Forms page: {@api theme-key:Field}, {@api theme-key:FieldLabel}, {@api theme-key:FieldContent}.
- {@api theme-key:Alert} controls the form-level error banner in ViewUpdate.
- {@api theme-key:Button} — override `_ButtonDestructive` to restyle the delete action across destroy views without touching other button variants.
