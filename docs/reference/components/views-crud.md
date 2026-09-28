---
title: CRUD Views
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

# CRUD Views

This page shows the five {@term CRUD} views in the default theme: list, create, read, update, and destroy. It also shows {@api vue:component:PageTitle}, the layout header each view fills. [Components](./index.md) describes the rules every component page shares.

## PageTitle

{@api vue:component:PageTitle} is the page header that the layout places once above the routed view. It shows the active view's title as the page heading, a loading indicator beside the title, and the page actions at the right. The [`sticky`]{@api vue:component:PageTitle:prop:sticky} prop pins the header to the top of the viewport. [Place the Page Title and Page Actions](../../guides/place-page-title-and-actions.md) describes how a layout and a view connect to it.

The header keeps its height stable. Space for the loading indicator is always reserved, and a skeleton holds the title's place while a view has registered but has no title yet. Long action lists wrap onto a second line.

In the demos below, a docs wrapper stands in for the layout.

Theme keys: {@api theme-key:PageTitle}. {@api theme-key:PageTitle.title} sets the heading type, and {@api theme-key:PageTitle.buttons} lays out the actions.

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

The create, read, and update views put their submit, action, and transition buttons in a {@api vue:component:StickyBar} that joins the layout's sticky stack below the title. [Sticky Chrome](./sticky-chrome.md) describes the bar and when it reveals, and [Place the Page Title and Page Actions](../../guides/place-page-title-and-actions.md) describes the layout side. The docs harness has no sticky stack, so each bar in the demos renders in place.

## ViewList

{@api vue:component:ViewList} is the entry point for a model. From top to bottom it shows:

- the page title, with a button per list-level action (such as Create) in the title row;
- an under-actions bar with the Filters and Sort triggers and the search box;
- a constraints band with the active scope, filter, and sort chips, shown only while one is active;
- an {@api vue:component:ObjectsGrid} with the records;
- a bulk-actions strip while rows are selected;
- a pagination footer.

The columns come from the [model config]{@term Model Config}'s `displayFields` (see {@term View Field Lists}). By default that is every field except the pk, hidden fields, and fields the model info leaves out of the list. Each cell renders through a {@term Column Adapter}; [Customize List Column Rendering](../../guides/customize-list-column-rendering.md) lists them. The list saves the reader's page size, sort, filters, and hidden columns in the browser for each app and model; [Configure CRUD Views](../../guides/configure-crud-views.md#list-preferences) describes these list preferences.

The demo below is the live component against 28 offline records. Every control works.

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
    <span>columns: the model config's <code>displayFields</code>, narrowed to five for this demo</span>
    <span>cell values: text, date-time, and model-link column adapters print the stored value, so <code>enterprise</code> stays <code>enterprise</code></span>
    <span>toolbar: the Filters and Sort triggers sit in the under-actions bar; each add menu lists only fields not applied yet</span>
    <span>constraints band: filter chips are primary-tinted, sort chips neutral; column headers do not sort</span>
    <span>selection: ticking a row opens the bulk-actions strip above the pagination footer, with the selection count and the bulk actions</span>
    <span>pagination: range read-out, rows-per-page selector (<code>All</code> loads every page), and navigation</span>
    <span>theme keys: {@api theme-key:ViewList}, {@api theme-key:ObjectsGrid}, {@api theme-key:FilterChip} · source: <code>ViewList.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

### A wider model

This demo is the same component against a twelve-column model with a value of every shape: dates, a datetime, two ranges, a duration, a multi-value choice, a JSON blob, file and image paths, and an IP address. Every nullable column is empty in at least one row, and the last row is empty in all of them.

The demo sets [`tableBreakpoint`]{@api vue:component:ViewList:prop:tableBreakpoint} to `xs` to force table mode. With the `lg` default, the grid shows cards below that breakpoint; [ObjectsGrid](./objectsgrid.md) describes both layouts.

A wide table scrolls sideways inside its own card. Date, time, datetime, boolean, duration, and `JSON` fields have their own adapters ({@api vue:component:ColumnDateTime}, {@api vue:component:ColumnBoolean}, {@api vue:component:ColumnDuration}, and {@api vue:component:ColumnJson}). Range and multi-value choice fields fall back to {@api vue:component:ColumnText}, which prints an object as compact `JSON`, so a range shows its `lower` and `upper` keys.

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
    <span>columns: no <code>displayFields</code> override, so the default field list applies</span>
    <span>layout: <code>tableBreakpoint="xs"</code> forces table mode in the narrow demo frame</span>
    <span>overflow: the grid scrolls sideways inside its card; columns size to content and header labels stay on one line</span>
    <span>adapters: date, time, and datetime use <code>ColumnDateTime</code>, boolean <code>ColumnBoolean</code> (Yes or No, even for a boolean with choices), duration <code>ColumnDuration</code>, and JSON <code>ColumnJson</code>; range and choice fields fall back to <code>ColumnText</code></span>
    <span>empty values: the type adapters print a dash for a null, and <code>ColumnText</code> prints nothing. <code>ColumnJson</code> prints <code>{}</code> for an empty object, and <code>ColumnText</code> prints <code>[]</code> for an empty choice list</span>
    <span>theme keys: {@api theme-key:ObjectsGrid} · source: <code>ViewList.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewCreate

{@api vue:component:ViewCreate} shows the page title, a sticky bar with the Create button, and a form built from the model config. The form uses the create view's `displayFields`, which default to every writable field except the pk and hidden fields. A form-level error appears above the fields. A save that returns warnings opens a {@term Warning Confirmation} dialog.

After a successful create, the view opens the new record's update view. The [`redirectAfter`]{@api vue:component:ViewCreate:prop:redirectAfter} prop picks `list`, `update`, or `read`.

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
    <span>fields: the model config's <code>displayFields</code> for create; each widget follows the field's serializer and model types</span>
    <span>layout: one column. Section grouping and multi-column grids are customizations; see <a href="./forms.html" class="text-primary-text underline underline-offset-4">Forms</a></span>
    <span>submit bar: a {@api vue:component:StickyBar} in the top zone; it renders in place here because the docs harness has no sticky stack</span>
    <span>page actions: one link per non-detail action except create, so List appears in the title row and Create does not</span>
    <span>submitting creates the record, then opens its update view (<code>redirect-after</code> picks list, update, or read)</span>
    <span>theme keys: {@api theme-key:ViewCreate}, {@api theme-key:StickyBar} · source: <code>ViewCreate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewRead

{@api vue:component:ViewRead} shows one record as read-only label and value rows, through a {@api vue:component:FormModel} in the `read` view. Each field renders through its read-only widget, which is {@api vue:component:WidgetReadOnly} by default. Boolean, date, datetime, time, duration, and `JSON` fields have type-specific read-only widgets ({@api js:module:@arrai-innovations/vueda/utils/fieldMappings}).

The sticky bar holds the record's detail actions and its transitions:

- One {@api vue:component:LinkModelView} button for each configured detail action that the record's {@term Available Actions} list includes, except the read action itself.
- One button for each of the record's {@term Valid Transitions}.

Update renders as the filled primary button, and the [`primaryActions`]{@api vue:component:ViewRead:prop:primaryActions} prop picks which actions render that way. Delete and destroy actions take the destructive tone. Actions that are not detail actions, such as List and Create, go to the page title.

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
    <span>choice labels: {@api vue:component:WidgetReadOnly} shows the label of the field's matching option, so the stored <code>enterprise</code> reads "Enterprise"</span>
    <span>read rows: {@api theme-key:Field} in its <code>read</code> orientation, a label column beside the value with a hairline under each row; labels are muted and top-aligned against values that wrap</span>
    <span>action bar: one button per detail action the record allows, then one per valid transition. Update is the filled primary button; Destroy takes the destructive tone</span>
    <span>page title: supplied by the docs harness, as a layout would; the view sends its title and its non-detail actions to it</span>
    <span>theme keys: {@api theme-key:ViewRead}, {@api theme-key:Field}, {@api theme-key:WidgetReadOnly} · source: <code>ViewRead.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewUpdate

{@api vue:component:ViewUpdate} shows the create form filled from the fetched record. Its sticky bar holds the Update button, the record's other detail actions, and its valid transitions. An unsaved-changes marker shows while any field differs from its original value.

If the record's available actions lack `update`, the view hides the Update button and shows an "Editing unavailable" notice in place of the form. The [`update-unavailable`]{@api vue:component:ViewUpdate:slot:update-unavailable} slot replaces the notice.

After a successful save the view stays on the page unless [`redirectAfter`]{@api vue:component:ViewUpdate:prop:redirectAfter} is `list` or `read`. [Configure CRUD Views](../../guides/configure-crud-views.md) describes which fields the view fetches and submits.

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
    <span>the form starts from the fetched record</span>
    <span>edit a field and the sticky bar shows an unsaved-changes marker; it clears when every field is back to its original value</span>
    <span>action bar: the Update submit button, then the record's other detail actions and valid transitions</span>
    <span>a rejected save shows a form-level Alert above the fields, apart from the messages under each field</span>
    <span>theme keys: {@api theme-key:ViewUpdate}, {@api theme-key:Alert} · source: <code>ViewUpdate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewDestroy

{@api vue:component:ViewDestroy} is a routed page, so a user can link to it, bookmark it, or reach it from a multi-step flow. It wraps a {@api vue:component:ModelActionForm} in a destructive card with three parts:

- A banner states what the delete removes. The [`linkedObjectCounts`]{@api vue:component:ViewDestroy:prop:linkedObjectCounts} prop adds one line per related model that the delete also removes.
- A list shows each selected record, fetched by pk, with its {@term Formatted Name} and pk.
- An optional type-to-confirm phrase, set by [`confirmText`]{@api vue:component:ViewDestroy:prop:confirmText}, keeps the confirm button disabled until the reader types it.

The page title reads "Delete" followed by the model name, with the count for a bulk destroy. The confirm button reads "Yes, continue" and takes the destructive tone; the cancel button reads "Cancel, go back".

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
    <span>card: {@api theme-key:ViewDestroy} draws the destructive card and embeds {@api theme-key:ModelActionForm} bare, so only the outer card has chrome</span>
    <span>title: "Delete 3 Customers", counted for a bulk destroy</span>
    <span>banner: a destructive icon tile and a title built from the record count and the model's verbose name</span>
    <span>consequences: <code>linkedObjectCounts</code> becomes a {@api vue:component:ConsequencesBullets} list; with none, the banner reads "This action cannot be undone."</span>
    <span>records: fetched by pk; each row shows the record's formatted name beside its pk</span>
    <span>type-to-confirm: {@api vue:component:TypedConfirmField} keeps Yes, continue disabled until the phrase matches; the phrase is not sent</span>
    <span>theme keys: {@api theme-key:ViewDestroy}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewDestroy.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Customization surface

These tokens apply across the five views:

- {@api css-token:card} and {@api css-token:background} set the view card and the page background.
- {@api css-token:border} sets dividers, separators, and card edges.
- {@api css-token:primary} tints filter chips, the unsaved-changes marker, and selected rows.
- {@api css-token:destructive} colors the destroy view's card edge, banner, and confirm button, and every delete or destroy action button.
- {@api css-token:muted} and {@api css-token:muted-foreground} set the constraints band tint and secondary text such as read-view labels.

Some parts of a finished screen are additions to the default views:

- `ViewRead` renders one flat form. Grouping fields into titled sections is a customization.
- `PageTitle` renders the title text. A status badge beside it goes in the [`title`]{@api vue:component:PageTitle:slot:title} slot.
- Action and transition button labels are the action name in title case. To change one on `ViewRead`, use the [`action-button`]{@api vue:component:ViewRead:slot:action-button}, [`targetless-action-button`]{@api vue:component:ViewRead:slot:targetless-action-button}, and [`transition-button`]{@api vue:component:ViewRead:slot:transition-button} slot; each replaces one button and receives its label.
- `ViewDestroy` passes its slots through to its form. The [`confirm-button`]{@api vue:component:ModelActionForm:slot:confirm-button} and [`cancel-button`]{@api vue:component:ActionForm:slot:cancel-button} slots replace either button.

Theme keys by area:

- {@api theme-key:PageTitle}: `root`, `title`, and `buttons`.
- Sticky bars: [Sticky Chrome](./sticky-chrome.md#customization-surface).
- The grid: {@api theme-key:ObjectsGrid}, {@api theme-key:ObjectsGridTableHeader}, and {@api theme-key:ObjectsGridBodyCell}, described on [ObjectsGrid](./objectsgrid.md).
- Fields: {@api theme-key:Field}, {@api theme-key:FieldLabel}, and {@api theme-key:FieldContent}, described on [Forms](./forms.md).
- {@api theme-key:Alert}: the form-level error banner.
- {@api theme-key:Button}: the destructive tone styles the delete and destroy buttons in action bars and the destroy view's confirm button. [Buttons](./buttons.md) describes the tones.
