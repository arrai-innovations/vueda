---
title: CRUDL Views
status: draft
audience: designer
type: reference
---

<script setup>
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faArrowUpFromBracket,
    faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { customerScenario, fieldTypesScenario } from "../../.vitepress/theme/fixtures/showcaseRecords.js";

// One scenario per live demo. Route registration is global and first-match-wins, so demos
// that need different responses for the same model take different app labels.
const listScenario = customerScenario({
    app: "showcaselist",
    viewConfigs: { list: { displayFields: ["account", "owner", "tier", "mrr", "currency"] } },
});
const wideListScenario = fieldTypesScenario({ app: "showcasewidelist" });
const createScenario = customerScenario({ app: "showcasecreate" });
const updateScenario = customerScenario({ app: "showcaseupdate" });
const readScenario = customerScenario({ app: "showcaseread" });
const destroyScenario = customerScenario({ app: "showcasedestroy" });

const destroyViewProps = {
    confirmText: "delete 3 customers",
    linkedObjectCounts: [
        { count: 26, verboseNamePlural: "contacts" },
        { count: 112, verboseNamePlural: "invoices" },
        { count: 8, verboseNamePlural: "attachments" },
    ],
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

The create, read, and update views pair PageTitle with a scroll-aware action bar that keeps the primary submit or transition controls reachable on long forms. That bar is {@api vue:component:StickyBar}, and each view teleports it into the framework-owned sticky stack (via `StickyChrome` / `StickyStackProvider`) so it stacks beneath the pinned title and reveals on its own schedule. The docs harness stands in for a layout but hosts no sticky stack, so in the demos below each bar renders in place instead of pinning: the stack would take the browser window as its scroll container and float the bar over this page.

The bar primitive, the stack model, reveal strategies, and the integration contract are documented on their own page: [Sticky Chrome](./sticky-chrome.md).

## ViewList

The list view is the entry point for every {@term CRUDL} resource: a title row with the create
action, an under-actions bar holding search and the filter and sort entry points, a constraints
band for whatever is currently applied, {@api vue:component:ObjectsGrid} filling the card body,
and a pagination footer.

The demo below is the live component against 28 offline records. Search, filter, sort, select
rows, and page through it; every control is the real one.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view list · 28 records · live ViewList</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewList.vue')"
    :app="listScenario.app"
    :model="listScenario.model"
    action="list"
    :seed="listScenario.seed"
    :api="listScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>columns: the model config's <code>displayFields</code>, which defaults to every non-pk field. This demo narrows it to five through <code>storeModelConfig.setConfig(target, null, { list: { displayFields: [...] } })</code>, the same call an app makes at bootstrap</span>
    <span>cell values: list columns render through the column adapters (text, date-time, and model link), which print the stored value. The label resolution in the read view above comes from {@api vue:component:WidgetReadOnly}, which the grid does not use, so <code>enterprise</code> stays <code>enterprise</code> here</span>
    <span>toolbar: the Filters and Sort triggers teleport into the under-actions bar while their popovers stay anchored to it. Each add menu lists only what is not applied yet, so a field leaves the menu once it has a chip</span>
    <span>constraints band: filter and sort chips share one band below the toolbar, primary-tinted for filters and neutral for sorts. Sorting is driven entirely from there; the column headers carry no sort affordance</span>
    <span>selection: ticking a row reveals the bulk-actions strip, with the selection count and the model's bulk actions. It replaces the toolbar contents rather than stacking below it</span>
    <span>pagination: the range read-out, the rows-per-page selector (its <code>All</code> entry loads every page in one pass), and the navigation cluster. The chosen page size is remembered per model</span>
    <span>theme keys: {@api theme-key:ViewList}, {@api theme-key:ObjectsGrid}, {@api theme-key:FilterChip} · source: <code>ViewList.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

### A wider model

The demo above narrows the list to five short columns, which is the comfortable case. A
real model is usually wider and emptier. This second demo is the same component against
a twelve-column model with a value of every shape: dates, a datetime, two ranges, a
duration, a multi-value choice, a JSON blob, file and image paths, and an IP address.
Every nullable column is empty in at least one row, and the last row is empty in all of
them.

This demo forces table mode with `tableBreakpoint="xs"`, because the demo frame is
narrower than the `lg` default at which the grid switches from cards to a table.

Two things are visible here that the narrow demo cannot show. The grid runs wider than
its frame and scrolls sideways inside its own card, rather than compressing columns to
fit. Date, time, datetime, boolean, duration, and `JSON` fields have a column adapter of
their own ({@api vue:component:ColumnDateTime}, {@api vue:component:ColumnBoolean},
{@api vue:component:ColumnDuration}, and {@api vue:component:ColumnJson}); the two ranges
and the multi-value choice fall through to {@api vue:component:ColumnText}, which prints
the stored value, so a range reads as its raw `lower` and `upper` object.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view list - 12 records - every field type</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewList.vue')"
    :app="wideListScenario.app"
    :model="wideListScenario.model"
    action="list"
    :seed="wideListScenario.seed"
    :api="wideListScenario.api"
    :view-props="{ tableBreakpoint: 'xs' }"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>columns: no <code>displayFields</code> override, so the config default applies and every non-pk field gets a column</span>
    <span>layout: <code>tableBreakpoint="xs"</code> forces table mode. The demo frame is 688 px, below the <code>lg</code> default, so both list demos would otherwise render as cards</span>
    <span>overflow: {@api theme-key:ObjectsGrid} <code>root</code> is the scroll surface. Columns size to content, and the header row stays on one line rather than wrapping to keep the table narrow</span>
    <span>adapters: date, time, and datetime resolve to <code>ColumnDateTime</code>, boolean to <code>ColumnBoolean</code>, duration to <code>ColumnDuration</code>, and JSON to <code>ColumnJson</code>, all through <code>columnMappings.js</code>; range and choice have no entry and fall back to <code>ColumnText</code>. Handling is a boolean with choices, so <code>ColumnBoolean</code> words it Yes or No rather than using its choice labels</span>
    <span>empty values: the four type adapters print a dash for a null, while <code>ColumnText</code> prints nothing at all. An empty container keeps its own mark: <code>ColumnJson</code> prints <code>{}</code>, and the empty choice list prints <code>[]</code> through <code>ColumnText</code>. Whether a list should carry one placeholder for the absent case everywhere is open, and read views have to answer it the same way</span>
    <span>sorting: release date, published at, lead time, and handling carry ordering metadata; the rest are display-only</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewCreate

The create view is a page title, a sticky bar holding the submit action, and a form body
rendered from the model's configured fields. The demo below is the live component.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view create · blank form · live ViewCreate</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewCreate.vue')"
    :app="createScenario.app"
    :model="createScenario.model"
    action="create"
    :seed="createScenario.seed"
    :api="createScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>fields: no field list is passed here. The form renders the model config's <code>displayFields</code>, which on create defaults to every writable non-pk field, and each widget is chosen from the field's serializer and model types</span>
    <span>the default layout is a single-column stack. Section grouping and multi-column grids are customizations; see <a href="./forms.html" class="text-primary-text underline underline-offset-4">Forms</a></span>
    <span>submit bar: a {@api vue:component:StickyBar} in <code>zone="top"</code>, which teleports into the layout's sticky stack. The docs harness has no stack, so it renders in place here; <a href="./sticky-chrome.html" class="text-primary-text underline underline-offset-4">Sticky Chrome</a> covers the pinned behavior</span>
    <span>page actions: the view teleports a link per non-detail action into the title row, which is why List appears there and Create does not</span>
    <span>submitting posts the submit fields to the model's list url, then routes to the new record's update screen (<code>redirect-after</code> chooses list, update, or read)</span>
    <span>theme keys: {@api theme-key:ViewCreate}, {@api theme-key:StickyBar} · source: <code>ViewCreate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

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
    <span>static choices resolve to their labels: {@api vue:component:WidgetReadOnly} takes the field's <code>options</code> and shows the matching <code>label</code>, so the stored <code>enterprise</code> reads as "Enterprise"</span>
    <span>read rows: {@api theme-key:Field} in its <code>read</code> orientation: a <code>180px</code> label column, <code>1fr</code> value, and a bottom hairline per row</span>
    <span>label type: 12 px / 500 / <code>--muted-foreground</code>, top-aligned against a value that may wrap to several lines</span>
    <span>action bar: one {@api vue:component:LinkModelView} button per entry in the record's <code>available_actions</code>, with <code>update</code> promoted to the filled primary and <code>destroy</code> picking up the destructive tone</span>
    <span>PageTitle: supplied here by the docs harness, as an integrator's layout would; the view contributes the title and teleports its non-detail actions into the title row</span>
    <span>theme keys: {@api theme-key:ViewRead}, {@api theme-key:Field}, {@api theme-key:WidgetReadOnly} · source: <code>ViewRead.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewUpdate

The update view renders the same form as create, populated from the fetched record.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">view update · populated form · live ViewUpdate</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewUpdate.vue')"
    :app="updateScenario.app"
    :model="updateScenario.model"
    pk="1"
    action="update"
    :seed="updateScenario.seed"
    :api="updateScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the record is fetched first: one request for the config's <code>fetchFields</code> plus its expands, and the form seeds its initial values from the response</span>
    <span>edit any field and the sticky bar gains an unsaved-changes marker. It tracks the form context, not the individual input, so it clears again if you restore the original value</span>
    <span>the action bar carries the record's other actions, taken from its <code>available_actions</code>, so update itself is absent and Destroy, Partial Update, and Retrieve are not</span>
    <span>submitting sends the submit fields to the record's detail url and re-fetches it, so the screen shows what the server stored rather than what was typed</span>
    <span>a rejected save renders a form-level Alert above the fields, separate from the per-field messages a 400 fills in</span>
    <span>theme keys: {@api theme-key:ViewUpdate}, {@api theme-key:Alert} · source: <code>ViewUpdate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

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
    <span>title: contributed through <code>usePageTitle</code> like the other CRUD views, and counted for a bulk destroy. It reads Delete, not Destroy: the route names the operation, the page says what the operator is doing</span>
    <span>banner: destructive 6 %-mix fill behind a 36 px destructive icon tile; the banner title is generated from the record count and model verbose name</span>
    <span>consequences: the <code>linkedObjectCounts</code> prop becomes a {@api vue:component:ConsequencesBullets} list. With none supplied the banner falls back to a single "This action cannot be undone." line</span>
    <span>records: fetched by pk, then rendered through {@api vue:component:WidgetReadOnly}, which shows each row's <code>formatted_name</code> beside its primary key</span>
    <span>type-to-confirm: {@api vue:component:TypedConfirmField} holds its own value and gates submit; it is not a form field, so the phrase never reaches the request body</span>
    <span>theme keys: {@api theme-key:ViewDestroy}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewDestroy.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Customization surface

Token decisions flow across all five views:

- {@api css-token:card} and {@api css-token:background} set the view card and page background.
- {@api css-token:border} controls every divider, separator, and card edge in the views.
- {@api css-token:primary} tints active filter chips, modified indicators, status badges, and the selected-row accent.
- {@api css-token:destructive} drives the destroy view's card border, banner background, and submit button.
- {@api css-token:muted} and {@api css-token:muted-foreground} apply to filter strips, pagination labels, section headers, and empty values.

Some of what a finished screen shows is a consumer addition rather than a view default:

- `ViewRead` renders one flat `FormModel`. Grouping fields into titled sections is a customization.
- `PageActions` hosts action buttons; a status badge beside the title is something the layout adds.
- The detail action bar is generated from each record's `available_actions`, and each label is `startCase` applied to the DRF action name. Friendlier labels and extra entries come from project-defined actions, not from the view.
- `ViewDestroy`'s buttons read "Yes, continue" and "Cancel, go back" unless the `confirm-button` slot overrides them.

The highest-value theme keys for CRUDL views:

- {@api theme-key:PageTitle} — `root`, `title`, `buttons`. Override `title` to change the heading size and weight (default: `text-[22px] font-semibold leading-[1.2]`).
- StickyBar and the sticky-stack keys are covered on its own page: see [Sticky Chrome](./sticky-chrome.md#customization-surface).
- ObjectsGrid keys are covered on its own page: {@api theme-key:ObjectsGrid}, {@api theme-key:ObjectsGridTableHeader}, {@api theme-key:ObjectsGridBodyCell}.
- Field and form keys are covered on the Forms page: {@api theme-key:Field}, {@api theme-key:FieldLabel}, {@api theme-key:FieldContent}.
- {@api theme-key:Alert} controls the form-level error banner in ViewUpdate.
- {@api theme-key:Button} — override `_ButtonDestructive` to restyle the delete action across destroy views without touching other button variants.
