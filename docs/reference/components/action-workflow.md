---
title: Action & Workflow Views
status: draft
audience: designer
type: reference
---

<script setup>
import { demoResponse } from "../../.vitepress/theme/fixtures/demoApi.js";
import { customerScenario } from "../../.vitepress/theme/fixtures/showcaseRecords.js";

// One scenario per live demo. Route registration is global and first-match-wins, so demos
// that need different responses for the same model take different app labels.
const archiveScenario = customerScenario({ app: "showcaseaction", actions: [{ name: "archive" }] });
const duplicateScenario = customerScenario({ app: "showcaseduplicate", actions: [{ name: "duplicate" }] });
const activateScenario = customerScenario({
    app: "showcaseactivate",
    actions: [{ name: "activate", method: "PATCH" }],
});
const historyScenario = customerScenario({ app: "showcasehistory" });
const emptyHistoryScenario = customerScenario({ app: "showcasehistoryempty", history: [] });
// Rejects the pre-flight the way a server does when some records cannot take the action:
// a 400 keyed by primary key. The confirmed request would succeed.
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

This page shows the action confirmation views and the history view in the default theme: {@api vue:component:ViewAction}, {@api vue:component:ViewActivate}, {@api vue:component:ViewExecuteTransition}, and {@api vue:component:ViewHistoryList}. [CRUD Views](./views-crud.md#viewdestroy) shows `ViewDestroy`, which uses the same action card. [Components](./index.md) describes the rules every component page shares.

[Action Contract and Availability](../../core-concepts/action-contract-and-availability.md) describes which actions a view offers and which actions honor a {@term Dry Run}. [Design Transition UX and Redirects](../../guides/transition-ux-and-redirects.md) describes what an action form does on pre-flight, submit, and cancel, and where it goes afterward.

## Action card

Every action view renders its confirmation in {@api vue:component:ModelActionForm}. The card has three parts, from top to bottom:

- The banner: an icon tile, a title, and a one-line description. The title combines the action name and the model's verbose name. The description defaults to "Review the selected records before continuing."
- The body: the selected-records panel, a prompt panel that asks "Are you sure you want to ...", and any fields the action collects.
- The actions strip from {@api vue:component:ActionForm}: "Yes, continue", "Cancel, go back", and an optional hint at the right.

The banner is a required part of every action view. It states the action and the records it targets before the user reaches the confirm button, and its tone signals the action's risk.

The [`tone`]{@api vue:component:ModelActionForm:prop:tone} prop sets that risk level. The card carries the value as `data-tone`, and the card edge, banner fill, and banner icon tile change together.

| `tone`           | Meaning                                     | Default for                           | Banner icon      |
| ---------------- | ------------------------------------------- | ------------------------------------- | ---------------- |
| `info` (default) | A neutral confirmation                      | `ViewAction`, `ViewExecuteTransition` | Information      |
| `success`        | Activate or restore                         | `ViewActivate`                        | Check mark       |
| `warning`        | An irreversible change that deletes nothing | {@api vue:component:ViewDeactivate}   | Warning triangle |
| `danger`         | A permanent deletion                        | {@api vue:component:ViewDestroy}      | Warning triangle |

At `danger`, the selected-records panel and its chips also take the destructive tint, and the default confirm button takes the destructive button tone. At every other tone, the confirm button keeps the primary tone.

The selected-records panel is headed "Selected" plus the model's verbose name, with an "N of N selected" count. Each record is a chip that ends in its primary key. A view that fetches its records shows each record's {@term Formatted Name} in the chip as a {@api vue:component:LinkModelView} link. A view that does not fetch shows the primary keys only.

Each chip is a {@api vue:component:FormField} named for its record's primary key. {@term Server Feedback} keyed by primary key therefore appears beside the matching chip. {@api theme-key:ActionForm.validation} lists, above the card, any error that no rendered field shows.

The card's states:

- **Pre-flight.** When the view opens, the card sends the action as a dry run. Its server feedback appears on the form without a toast.
- **Running.** While a request runs, both buttons are disabled and show a spinner.
- **Server feedback only.** "Yes, continue" stays enabled while only server feedback remains, because the server checks the records again on confirm.
- **Success.** A success toast appears, and the buttons stay disabled until the next page replaces the view.
- **Warnings.** A {@term Warning Confirmation} opens {@api vue:component:FormConfirmDialog}. For an action on several records, the dialog groups the warnings by record, each under the record's link.
- **Failure.** Any other failed confirm shows an error toast.

Theme keys: {@api theme-key:ModelActionForm} for the card and {@api theme-key:ActionForm} for the actions strip and the validation summary. {@api theme-key:ModelActionForm.card}, {@api theme-key:ModelActionForm.banner}, and {@api theme-key:ModelActionForm.bannerIcon} hold the per-tone treatment.

## ViewAction

{@api vue:component:ViewAction} is the generic confirmation that {@term Action View Resolution} falls back to for a model action. It puts the action and model names in the page title and a "Go Back" button in the page actions. It passes its [`pk`]{@api vue:component:ViewAction:prop:pk} values to the card without fetching the records, so its chips show primary keys. It sends the action as `PUT` unless [`requestMethod`]{@api vue:component:ModelActionForm:prop:requestMethod} names another method.

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
    <span>tone: nothing was passed, so the card carries <code>data-tone="info"</code></span>
    <span>banner: both lines are generated; <code>bannerTitle</code> and <code>bannerDescription</code> replace them</span>
    <span>records: four chips showing primary keys, because <code>ViewAction</code> fetches nothing</span>
    <span>requests: a dry-run pre-flight when the view opens, then the action on confirm</span>
    <span>theme keys: {@api theme-key:ViewAction}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewAction.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

An action that takes input puts its fields in the [`extra-fields`]{@api vue:component:ModelActionForm:slot:extra-fields} slot, below the prompt panel. For the fields to be validated and sent, the view also takes [`hasInput`]{@api vue:component:ActionForm:prop:hasInput} and [`transformSubmitDataFn`]{@api vue:component:ModelActionForm:prop:transformSubmitDataFn}. The demo below is the real view with the slot filled by a docs-only wrapper. Type into Reason and submit, then clear it and submit again to see the error appear under the field.

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
    <span>slot: {@api theme-key:ModelActionForm.extraFields} stacks the rows below the prompt panel on the form field rhythm, so they line up with the field column of a full form</span>
    <span>fields: ordinary <code>FormField</code> rows with the form family's label, help, and error treatment; an error from local validation or from the server appears under its field</span>
    <span>input: the wrapper passes <code>hasInput</code> and <code>transformSubmitDataFn</code>, so the slotted fields join validation and become the request body</span>
  </footer>
</VuedaDemo>
</ClientOnly>

The pre-flight is a real request, so it can fail. Here the endpoint rejects the pre-flight with a message for two of the three records, keyed by primary key. That is how a server reports records that cannot take the action.

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
    <span>tone: <code>tone="warning"</code> passes through <code>ViewAction</code> to the card and switches the card edge, banner fill, and icon tile together</span>
    <span>pre-flight: the 400 lands on the form as server feedback, with no toast</span>
    <span>messages: each appears beside its record's chip, so {@api theme-key:ActionForm.validation} has nothing left to list and stays hidden</span>
    <span>banner: its text stays generated from the action and model names; the pre-flight result shows beside the chips</span>
    <span>confirm: "Yes, continue" stays enabled, and the server checks the records again on confirm</span>
    <span>theme keys: {@api theme-key:ActionForm.validation}, {@api theme-key:ModelActionForm} · source: <code>ActionForm.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewActivate

{@api vue:component:ViewActivate} confirms the `activate` action in the `success` tone. It fetches the selected records, so each chip shows the record's formatted name as a link beside its primary key. It sends the action as `PATCH`. The title reads "Activate" plus the model name unless you set the [`title`]{@api vue:component:ViewActivate:prop:title} prop.

`ViewDeactivate` shares this body, {@api vue:component:ViewSelectedObjectsAction}, in the `warning` tone. [System Views](./system-views.md#viewdeactivate) describes it.

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
    <span>tone: <code>data-tone="success"</code> switches the card edge, banner fill, and icon tile, and the banner shows the check mark</span>
    <span>banner text: the generated title and the default description; <code>bannerTitle</code> and <code>bannerDescription</code> replace them</span>
    <span>selected records: fetched by primary key; each chip is a {@api vue:component:WidgetReadOnly} link with the formatted name, then the primary key</span>
    <span>prompt: a generated "Are you sure you want to ..." question; <code>confirmMessage</code> replaces the wording, and the <code>confirm-message</code> slot replaces the panel's contents</span>
    <span>requests: the same <code>PATCH</code> goes out twice, as a dry run when the view opens and as the action on confirm; the server rolls the dry run back</span>
    <span>PageTitle: supplied here by the docs harness, as an application layout would; the view contributes the title and its "Go Back" button</span>
    <span>theme keys: {@api theme-key:ViewActivate}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewActivate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewExecuteTransition

{@api vue:component:ViewExecuteTransition} confirms a workflow {@term Transition} when the project supplies no view for its code. It renders the `ViewAction` card unchanged, in the `info` tone, so the `ViewAction` demos above show its layout. Like `ViewAction`, it fetches nothing, and its chips show primary keys.

The view differs from `ViewAction` in its copy and its request:

- The page title is the transition's `name` followed by the model name. Until the workflow metadata loads, the title uses the transition code in title case. The prompt uses the same name in lower case.
- Both the pre-flight and the confirm execute the transition. [Design Transition UX and Redirects](../../guides/transition-ux-and-redirects.md) describes the request.

The confirmation shows the transition name and the selected records only. A pre-flight rejection shows its message beside the record's chip. To show source and target states or eligibility reasons, supply a project view for the transition code.

Fields in the `extra-fields` slot render and validate, but their values are not sent with the transition.

Theme keys: {@api theme-key:ViewExecuteTransition}, {@api theme-key:ModelActionForm}, and {@api theme-key:ActionForm}.

## ViewHistoryList

{@api vue:component:ViewHistoryList} shows the {@term Model History} of one record as the actions that produced it. The page title reads "History of" plus the model's verbose name, and a "Back" button sits in the page actions. Each action groups the events it wrote that touch the record, and each event lists its field changes. A meta strip above the grid switches between table and card layouts, and a {@api vue:component:PaginationFooter} follows the grid.

In the table layout, each field change is one row. The first row of an action carries the action's When, Who, Kind, and Action cells. The first row of each event carries its Model and Type cells. An action's first row has `data-rev-start`, its other rows have `data-rev-child`, and each event's first row has `data-event-start`. {@api theme-key:ViewHistoryList.row} draws the action stripe from these attributes, so the grouping survives a reskin.

In the card layout, each event is one card. Its changes stack in the Old and New cells, each value labeled with its field name.

The demo below is the live component against an offline history endpoint. Use the Table and Cards buttons to switch layouts.

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
    <span>columns: the history response defines them, and the view labels them; the <code>fields</code> prop picks and orders from <code>recorded_at</code>, <code>actor</code>, <code>kind</code>, <code>label</code>, <code>model</code>, <code>relation</code>, <code>type</code>, <code>field</code>, <code>old</code>, and <code>new</code>; the default leaves out <code>relation</code></span>
    <span>diff: {@api theme-key:ViewHistoryList.diff} styles old and new values apart by <code>data-side</code>, and an empty side by <code>data-empty</code></span>
    <span>type pill: <code>created</code>, <code>updated</code>, and <code>deleted</code> each get a tone and an icon; any other type renders as plain text</span>
    <span>kind pill: neutral, with added emphasis for the kinds VUEDA defines; any kind renders as written</span>
    <span>no field changes: the Field cell reads "(created)", "(deleted)", or "(no field changes)"</span>
    <span>references: a field that points at another row shows that row's current name; a row that no longer exists reads "deleted row", and a deleted actor reads "deleted user", each followed by its id when the server sends one</span>
    <span>dates: an absolute date and time, with a relative phrase below it</span>
    <span>layout: the Table and Cards buttons pin a layout; until one is pressed, the <code>tableBreakpoint</code> prop picks it</span>
    <span>theme keys: {@api theme-key:ViewHistoryList}, {@api theme-key:ObjectsGrid} · source: <code>ViewHistoryList.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

A record with no history shows an empty state in place of the meta strip and the grid.

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
    <span>empty state: "No history yet" with a short description; the <code>empty</code> slot replaces its contents</span>
    <span>loading: while the request runs, the grid stays up with its skeleton rows; the empty state appears once zero rows are confirmed</span>
    <span>pagination: the footer stays</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## Customization surface

`ViewAction`, `ViewActivate`, `ViewDeactivate`, and `ViewExecuteTransition` pass their attributes and slots through to `ModelActionForm`, so these props and slots apply to all of them:

- [`bannerTitle`]{@api vue:component:ModelActionForm:prop:bannerTitle} and [`bannerDescription`]{@api vue:component:ModelActionForm:prop:bannerDescription} replace the banner lines. The [`action-banner`]{@api vue:component:ModelActionForm:slot:action-banner} slot replaces the whole banner, and [`banner-meta`]{@api vue:component:ModelActionForm:slot:banner-meta} adds a line below the description.
- [`selected-objects`]{@api vue:component:ModelActionForm:slot:selected-objects} replaces the contents of the selected-records panel, for a project that wants richer rows than a name and a primary key. [`link-item`]{@api vue:component:ModelActionForm:slot:link-item} replaces the link in each chip.
- [`confirmMessage`]{@api vue:component:ModelActionForm:prop:confirmMessage} replaces the prompt wording, and the [`confirm-message`]{@api vue:component:ModelActionForm:slot:confirm-message} slot replaces the prompt panel's contents.
- `extra-fields` adds fields below the prompt panel.
- [`confirmText`]{@api vue:component:ModelActionForm:prop:confirmText} adds a {@api vue:component:TypedConfirmField} and keeps the confirm button disabled until the typed text matches.
- [`actions-hint`]{@api vue:component:ActionForm:slot:actions-hint} fills the right side of the actions strip, for a shortcut or an audit note. [`confirm-button`]{@api vue:component:ModelActionForm:slot:confirm-button} and [`cancel-button`]{@api vue:component:ActionForm:slot:cancel-button} replace either button, including its label.
- [`validation-summary`]{@api vue:component:ActionForm:slot:validation-summary} replaces the list of errors that no field shows. [`warning-entry`]{@api vue:component:ModelActionForm:slot:warning-entry} replaces one field's warnings in the confirmation dialog.

The default slot of `ViewAction` replaces the whole card.

`ViewHistoryList` takes [`hideMetaStrip`]{@api vue:component:ViewHistoryList:prop:hideMetaStrip} to hide the meta strip. Its [slots]{@api vue:component:ViewHistoryList:slots} replace the meta strip, add filter chips to it, replace the empty state, and replace the cells of the When, Who, Kind, Model, Type, Old, and New columns.

Theme keys by area:

- {@api theme-key:ModelActionForm}: the card, banner, and icon tile per tone ({@api theme-key:ModelActionForm.card}, {@api theme-key:ModelActionForm.banner}, {@api theme-key:ModelActionForm.bannerIcon}), the selected-records panel and chips ({@api theme-key:ModelActionForm.selectedObjects}, {@api theme-key:ModelActionForm.listItem}), the prompt panel ({@api theme-key:ModelActionForm.message}), and the warning groups in the confirmation dialog ({@api theme-key:ModelActionForm.confirmWarningGroup}).
- {@api theme-key:ActionForm}: the actions strip ({@api theme-key:ActionForm.buttons}) and the validation summary ({@api theme-key:ActionForm.validation}).
- {@api theme-key:ViewHistoryList}: the action stripe ({@api theme-key:ViewHistoryList.row}), the diff values ({@api theme-key:ViewHistoryList.diff}), the pills ({@api theme-key:ViewHistoryList.typePill}, {@api theme-key:ViewHistoryList.kindPill}), the meta strip ({@api theme-key:ViewHistoryList.meta}), and the empty state ({@api theme-key:ViewHistoryList.empty}).
- {@api theme-key:ViewAction}, {@api theme-key:ViewActivate}, {@api theme-key:ViewDeactivate}, and {@api theme-key:ViewExecuteTransition}: each view's outer wrapper.

Tokens:

- {@api css-token:info}, {@api css-token:success}, {@api css-token:warning}, and {@api css-token:destructive} color the banner and icon tile of their tone. The `success`, `warning`, and `danger` tones also color the card edge.
- {@api css-token:primary} draws the prompt panel's rule and the history action stripe.
