---
title: Action & Workflow Views
status: draft
audience: designer
type: reference
---

<script setup>
import Table from "@vueda/grid/table/Table.vue";
import { ref } from "vue";
import { demoResponse } from "../../.vitepress/theme/fixtures/demoApi.js";
import { customerScenario } from "../../.vitepress/theme/fixtures/showcaseRecords.js";

const copyDiscounts = ref(true);

// One scenario per live demo. Route registration is global and first-match-wins, so demos
// that need different responses for the same model take different app labels.
const archiveScenario = customerScenario({ app: "showcaseaction", actions: [{ name: "archive" }] });
const duplicateScenario = customerScenario({ app: "showcaseduplicate", actions: [{ name: "duplicate" }] });
const activateScenario = customerScenario({
    app: "showcaseactivate",
    actions: [{ name: "activate", method: "PATCH" }],
});
// Rejects the pre-flight the way a server does when some records cannot take the action:
// a 400 keyed by primary key. The confirmed request would succeed.
const historyScenario = customerScenario({ app: "showcasehistory" });
const emptyHistoryScenario = customerScenario({ app: "showcasehistoryempty", history: [] });
const billScenario = customerScenario({
    app: "showcasebill",
    actions: [
        {
            name: "bill_now",
            handler: ({ headers }) =>
                headers?.get("Dry-Run")?.toLowerCase() === "true"
                    ? demoResponse(400, {
                          11: ["No payment method on file."],
                          23: ["Subscription is paused; resume it before billing."],
                      })
                    : demoResponse(200, { detail: "Billed 3 customers." }),
        },
    ],
});
</script>

# Action & Workflow Views

Four view-scale layouts that handle model actions, workflow transitions, and audit history. Each builds on {@api vue:component:PageTitle} from the CRUDL family. The new piece introduced here is the **tone-tracked action banner**: a full-bleed strip below the title that grounds the action's purpose and risk level before the user reaches the submit button.

Banner tone follows action sentiment: `info` for neutral confirmations, `success` for activations and restorations, `warning` for irreversible non-destructive moves, and `destructive` for permanent deletions (the destroy variant lives in CRUDL Views). Skipping the banner leaves users wondering what the action will actually do.

## ViewAction

The generic action confirmation view: a tone-tracked banner, the records the action targets, a
prompt panel restating the question, then the actions strip. It is the one action view that does
not fetch anything. `ViewDestroy` and `ViewActivate` load their records and hand
`ModelActionForm` a fetch state; `ViewAction` passes the primary keys straight through, which is
why the rows below read as bare keys.

`ViewAction` also owns a form context of its own, seeded with one entry per primary key. That is
what gives per-record server messages somewhere to land, as the third demo shows.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="archive" · 4 records · default info tone · live ViewAction</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewAction.vue')"
    :app="archiveScenario.app"
    :model="archiveScenario.model"
    :pk="['4', '11', '23', '1']"
    action="archive"
    :seed="archiveScenario.seed"
    :api="archiveScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>tone: nothing was passed, so the card carries <code>data-tone="info"</code>: a neutral border with an 8 % ring, a 6 % info banner fill, and an info-filled icon tile</span>
    <span>banner text: generated from the action name and the model's verbose name, as on every model action; <code>banner-title</code> and <code>banner-description</code> replace them</span>
    <span>records: each chip shows the primary key. No fetch means no <code>formatted_name</code>. Pass <code>fetch-state</code> to show names alongside the keys</span>
    <span>requests: one PUT to the list action url with a <code>{ pks }</code> body, sent twice: the <code>Dry-Run: true</code> pre-flight on mount, then the real request on confirm</span>
    <span>theme keys: {@api theme-key:ViewAction}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewAction.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

An action with input fills the `extra-fields` slot. The demo below is the real view with that one
slot supplied by a docs-only wrapper; everything rendered is the framework's own output. Type
into Reason and submit, then clear it and submit again to see the validation summary.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="duplicate" · 1 record · extra fields · live ViewAction</header>
  <ModelDemo
    :view="() => import('../../.vitepress/theme/components/DemoActionFields.vue')"
    :app="duplicateScenario.app"
    :model="duplicateScenario.model"
    pk="1"
    action="duplicate"
    :seed="duplicateScenario.seed"
    :api="duplicateScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>slot: {@api theme-key:ModelActionForm.extraFields} stacks the rows below the prompt panel at the standard 12 px form gap, so they line up with the field column of a full form</span>
    <span>fields: ordinary {@api vue:component:FormField} rows, so they inherit the form family's label, help, and error treatment, and their errors join the same validation summary a server 400 fills</span>
    <span>input contract: the wrapper passes <code>has-input</code> and <code>transform-submit-data-fn</code> so slotted fields join validation and request-body construction. Use the same props when an action collects extra fields through <code>extra-fields</code></span>
    <span>single record: the action goes to the detail url (<code>/routes/:app/:model/:pk/duplicate/</code>); several records go to the list url with a <code>{ pks }</code> body</span>
  </footer>
</VuedaDemo>
</ClientOnly>

The dry-run pre-flight is a real request, so it can fail. Here the offline endpoint rejects the
pre-flight with per-record messages, which is what a server returns when some of the selected
records cannot take the action.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="bill_now" · 3 records · pre-flight rejected · warning tone</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewAction.vue')"
    :app="billScenario.app"
    :model="billScenario.model"
    :pk="['4', '11', '23']"
    action="bill_now"
    :seed="billScenario.seed"
    :api="billScenario.api"
    :view-props="{ tone: 'warning' }"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>tone: <code>tone="warning"</code> reaches {@api vue:component:ModelActionForm} as a fall-through attribute and swaps the card edge, banner fill, and icon tile together</span>
    <span>pre-flight: sent on mount with <code>Dry-Run: true</code>. A 400 becomes a <code>FormValidationError</code> and is routed onto the form context rather than toasted, which is why it lands silently rather than as a failure banner</span>
    <span>where the messages land: keyed by primary key, so each one appears twice: in {@api theme-key:ActionForm.validation}'s summary at the bottom, and beside the matching record chip above. The form context seeded per primary key is what makes the second one possible</span>
    <span>the banner does not react: its text is generated from the action and model names. A summary of what the pre-flight found belongs in the validation alert, which writes itself</span>
    <span>theme keys: {@api theme-key:ActionForm.validation}, {@api theme-key:ModelActionForm} · source: <code>ActionForm.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewActivate

The activate view is `ModelActionForm` with `request-method="PATCH"` and `tone="success"`,
which is what establishes the tone-tracking pattern: **info** for neutral confirmation,
**success** for activate and restore, **warning** for irreversible non-destructive moves.

The demo below is the live component, mounted through the `ModelDemo` harness against the
seeded showcase customer model. Confirming it sends a real PATCH to the offline endpoint.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="activate" · 1 record · live ViewActivate</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewActivate.vue')"
    :app="activateScenario.app"
    :model="activateScenario.model"
    pk="1"
    action="activate"
    :seed="activateScenario.seed"
    :api="activateScenario.api"
    page-title
    toasts
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>tone: <code>tone="success"</code> puts <code>data-tone="success"</code> on the card, which drives every tone-scoped class in one pass: a <code>border-success/50</code> edge with an 8 % success ring, a 6 % success banner fill, and a success-filled 36 px icon tile</span>
    <span>banner text: both lines are generated. The title is the action name plus the model's verbose name; the description is the same default sentence every action gets. Override them with the <code>banner-title</code> and <code>banner-description</code> props</span>
    <span>selected records: fetched by pk, then rendered through {@api vue:component:WidgetReadOnly}, which shows each record's <code>formatted_name</code> as a {@api vue:component:LinkModelView} link with the primary key as a trailing mono chip</span>
    <span>prompt: a generated "Are you sure you want to ..." sentence in the left-bordered panel; the <code>confirm-message</code> prop replaces the wording and the slot of the same name replaces the whole panel</span>
    <span>requests: the same PATCH goes to the detail action url twice, once on mount carrying <code>Dry-Run: true</code> and once on confirm. The server runs both and rolls the dry run back, so a pre-flight validates against real data without persisting</span>
    <span>PageTitle: supplied here by the docs harness, as an integrator's layout would; the view contributes the title and teleports its "Go Back" button into the title row</span>
    <span>theme keys: {@api theme-key:ViewActivate}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewActivate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewExecuteTransition

The framework confirmation for a workflow transition code with no project-supplied override.
Visually it is the `ViewAction` layout above, unchanged: the same tone-tracked banner, the same
selected-records panel, and the same prompt-then-actions-strip layout, all still `ModelActionForm`
underneath. There is no dedicated demo below because there is nothing new to look at; see the
`ViewAction` demos above for the shared visual pattern.

The differences are behavioral, not visual. The action's display name defaults to the matching
transition's own `name` from the workflow metadata (falling back to a start-cased version of the
transition code while metadata is still loading), and confirming submits through the workflow
execute-transition endpoint — carrying `transition_code` — instead of the generic model-action
endpoint `ViewAction` uses.

::: warning
This confirmation does not explain source state, target state, or why a given object is or is not
eligible for the transition. It confirms the transition's display name and the selected records
only, the same as any other `ModelActionForm` confirmation. A dry-run rejection still identifies
the rejected object ids in the field errors and validation summary; it just does not render a
human-readable eligibility summary alongside them. A richer, transition-aware confirmation
surface is a distinct, not-yet-built concern.
:::

theme keys: {@api theme-key:ViewExecuteTransition}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: `ViewExecuteTransition.vue`

## ViewHistoryList

Audit trail for a single object, presented as the actions that produced it. One action groups
every event it wrote that touches this object, and each event lists its field changes. The first
row of an action carries its metadata (when, who, kind, action name), the first row of each event
names the model and event type, and a left stripe ties the rows of one action together. A meta
strip above the grid toggles between table and card layouts, and a pagination footer follows.

The demo below is the live component. The actions come from the offline `history_list` endpoint,
so the grouping, the diff cells, and the pills are the framework's own output. Use the Table and
Cards buttons to switch layouts.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="customer" · pk=1 · 5 actions · live ViewHistoryList</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewHistoryList.vue')"
    :app="historyScenario.app"
    :model="historyScenario.model"
    pk="1"
    action="history_list"
    :seed="historyScenario.seed"
    :api="historyScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>columns: not the model's fields. The history response defines them (when, who, kind, action, model, relation, type, field, old, new) and the view labels them itself. The <code>fields</code> prop picks and orders from that set</span>
    <span>action grouping: one row per changed field, with <code>data-rev-start</code> on an action's first row, <code>data-rev-child</code> on the rest, and <code>data-event-start</code> on the first row of each event. {@api theme-key:ViewHistoryList} paints the stripe from those attributes, so the grouping survives a re-skin</span>
    <span>pills: the event types <code>created</code>, <code>updated</code>, and <code>deleted</code> map to a tone and an icon; the action kinds <code>request</code>, <code>task</code>, and <code>command</code> map to a tone. An unknown value of either renders as itself</span>
    <span>references: a field that points at another row shows that row's current name. A row that no longer exists, or a deleted acting user, renders as the client's own wording rather than a raw id, because the server publishes only the absence</span>
    <span>dates: an absolute timestamp plus a relative phrase, both from the stored ISO string through luxon</span>
    <span>layout: the meta strip's Table and Cards buttons pin a layout; left on auto it follows the <code>table-breakpoint</code> prop, so the same view reads as cards on a narrow viewport</span>
    <span>theme keys: {@api theme-key:ViewHistoryList}, {@api theme-key:ObjectsGrid} · source: <code>ViewHistoryList.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

A record with no history yet gets a dedicated empty state rather than an empty grid.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="customer" · pk=2 · no history yet</header>
  <ModelDemo
    :view="() => import('@vueda/views/ViewHistoryList.vue')"
    :app="emptyHistoryScenario.app"
    :model="emptyHistoryScenario.model"
    pk="2"
    action="history_list"
    :seed="emptyHistoryScenario.seed"
    :api="emptyHistoryScenario.api"
    page-title
  />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>empty state: replaces the grid and the meta strip, so no layout toggle or column headers are offered for nothing. The <code>empty</code> slot replaces the whole body</span>
    <span>it waits for loading to settle: while the request is in flight the grid stays up so its skeleton rows render, and the empty state only appears once zero rows are confirmed</span>
    <span>the pagination footer stays, reading zero of zero</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Customization surface

Every action view is `ModelActionForm` underneath, so the same slots and props reshape all of them:

- `banner-title` and `banner-description` replace the generated banner lines; `tone` switches the whole card, banner, and icon tile together.
- `confirm-message` replaces the prompt wording, and the slot of the same name replaces the panel.
- `extra-fields` adds action-specific inputs below the prompt.
- `actions-hint` fills the right side of the actions strip, for a shortcut or an audit note.
- `confirm-button` replaces the submit button, including its label.
- `selected-objects` replaces the whole selected-records panel, for a project that wants richer rows than a name and a primary key.

The action banner, selected-objects panel, prompt block, and actions strip each have a theme key: {@api theme-key:ModelActionForm.banner}, {@api theme-key:ModelActionForm.selectedObjects}, {@api theme-key:ModelActionForm.message}, and {@api theme-key:ActionForm.buttons}. Patch a key to change a composition; set a token to change a value everywhere it appears.

| Surface                | Key tokens                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Info banner            | `--info` as a 6 % background mix; the border stays `--border`                                       |
| Success banner         | `--success` as a 6 % background mix, `border-success/20`                                            |
| Warning banner         | `--warning` as a 6 % background mix, `border-warning/20`                                            |
| Destructive banner     | `--destructive` via `bg-destructive/[0.06]`, `border-destructive/20` (see CRUDL Views)              |
| Prompt block           | `--primary` (2 px left rule at `border-primary/60`), `--muted` (background tint via `bg-muted/25`)  |
| Selected-objects panel | `--muted` (`bg-muted/25`), `--border` (hairline), `--radius-vueda-card`                             |
| Selected-object chip   | `--card` (fill), `--border` (hairline), `--radius-vueda-control`                                    |
| Actions strip          | `--border` (top hairline), `--muted` (`bg-muted/25`)                                                |
| Diff old               | `--destructive` as a 7 % background mix and the leading minus glyph; the value stays `--foreground` |
| Diff new               | `--success` as an 8 % background mix and the leading plus glyph; the value stays `--foreground`     |
| Revision stripe        | `--primary` via `border-l-2 border-primary` on first cell of each revision group                    |
| Type pill (updated)    | `--info` via `bg-info/8`, `border-info/25`, `text-info`                                             |
| Type pill (created)    | `--success` via `bg-success/10`, `border-success/30`, `text-success`                                |
