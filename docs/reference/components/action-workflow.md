---
title: Action & Workflow Views
status: draft
audience: designer
type: reference
---

<script setup>
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import Button from "@vueda/controls/button/Button.vue";
import Textarea from "@vueda/controls/textarea/Textarea.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import RadioGroup from "@vueda/controls/radio-group/RadioGroup.vue";
import RadioGroupItem from "@vueda/controls/radio-group/RadioGroupItem.vue";
import Table from "@vueda/grid/table/Table.vue";
import TableBody from "@vueda/grid/table/TableBody.vue";
import TableCell from "@vueda/grid/table/TableCell.vue";
import TableHead from "@vueda/grid/table/TableHead.vue";
import TableHeader from "@vueda/grid/table/TableHeader.vue";
import TableRow from "@vueda/grid/table/TableRow.vue";
import UserAvatar from "@vueda/display/avatar/UserAvatar.vue";
import Kbd from "@vueda/display/kbd/Kbd.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faArrowRight,
    faFlagCheckered,
    faRotateLeft,
    faPen,
    faPlus,
    faTable,
    faFilter,
    faArrowUpFromBracket,
    faLock,
    faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import {
    faClock,
    faIdCard,
    faBell,
    faEnvelope,
} from "@fortawesome/free-regular-svg-icons";
import { ref } from "vue";
import { demoResponse } from "../../.vitepress/theme/fixtures/demoApi.js";
import { customerScenario } from "../../.vitepress/theme/fixtures/showcaseRecords.js";

const selectedTransition = ref("send-for-review");
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
    <span>tone: nothing was passed, so the card carries <code>data-tone="info"</code> — a neutral border with an 8 % ring, a 6 % info banner fill, and an info-filled icon tile</span>
    <span>banner text: generated from the action name and the model's verbose name, as on every model action; <code>banner-title</code> and <code>banner-description</code> replace them</span>
    <span>records: each chip shows the primary key twice, as its label and as the trailing mono chip. There is nothing else to show: no fetch means no <code>formatted_name</code>. Pass <code>fetch-state</code> to render names instead</span>
    <span>requests: one PUT to the list action url with a <code>{ pks }</code> body, sent twice — the <code>Dry-Run: true</code> pre-flight on mount, then the real request on confirm</span>
    <span>theme keys: {@api theme-key:ViewAction}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewAction.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

An action with input fills the `extra-fields` slot. The demo below is the real view with that one
slot supplied by a docs-only wrapper; everything rendered is the framework's own output. Type
into Reason and submit to see the request body, then clear it and submit again to see the
validation summary.

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
    <span>request body: field values reach the server only through <code>transform-submit-data-fn</code>. With it, confirming sends <code>{"reason": "...", "copy_notes": false}</code>; without it the action sends no body at all, because the form's own shape is one entry per primary key rather than a request body</span>
    <span><code>has-input</code>: not a default. Without it {@api vue:component:ActionForm} submits without validating, and a required field left empty still goes to the server</span>
    <span>required by default: {@api js:function:@arrai-innovations/vueda/use/useField#useField} treats an unset <code>required</code> as <code>true</code>, so an optional field in this slot needs <code>:required="false"</code> or it renders an asterisk</span>
    <span>one gap worth knowing: a required field the user never touched does not block submit. The submit path touches the paths already in the form values, and a pristine field has none</span>
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
    <span>where the messages land: keyed by primary key, so each one appears twice — in {@api theme-key:ActionForm.validation}'s summary at the bottom, and beside the matching record chip above. The form context seeded per primary key is what makes the second one possible</span>
    <span>the banner does not react: its text is generated from the action and model names. A summary of what the pre-flight found belongs in the validation alert, which writes itself</span>
    <span>theme keys: {@api theme-key:ActionForm.validation}, {@api theme-key:ModelActionForm} · source: <code>ActionForm.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

::: info What the retired mockups showed
Three hand-authored mockups used to stand here. What they showed that the default view does not:

- **Written banner copy, per action.** Each mockup opened with two sentences describing exactly
  what that action would do and what it would leave alone. Every real banner is a generated title
  plus one fixed sentence. Projects that want the prose pass `banner-title` and
  `banner-description`.
- **A banner that reported the dry run.** The bill-now mockup's banner read "Dry-run found 2
  problems". No banner reads the pre-flight. The findings render in the validation alert below the
  prompt instead, which the third demo shows.
- **Record rows with detail.** The mockups listed accounts with icons, owners, amounts, and
  per-record exclude checkboxes. `ViewAction` renders primary keys, because it fetches nothing.
- **Named buttons and hints.** "Archive 4 customers", a `Kbd` shortcut hint, and an audit note in
  the actions strip. The real strip is "Yes, continue" and "Cancel, go back", with an empty
  `actions-hint` slot where the note would go.
- **Cancel in the title row.** The mockups put a Cancel button beside the page title. The real
  view teleports one "Go Back" button there.
- **Field styling.** The duplicate mockup styled its inputs by hand. The real slot content is
  ordinary `FormField` rows, so they inherit the form family's label, help, and error treatment.
  :::

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
    <span>tone: <code>tone="success"</code> puts <code>data-tone="success"</code> on the card, which drives every tone-scoped class in one pass — a <code>border-success/50</code> edge with an 8 % success ring, a 6 % success banner fill, and a success-filled 36 px icon tile</span>
    <span>banner text: both lines are generated. The title is the action name plus the model's verbose name; the description is the same default sentence every action gets. Override them with the <code>banner-title</code> and <code>banner-description</code> props</span>
    <span>selected records: fetched by pk, then rendered through {@api vue:component:WidgetReadOnly}, which shows each record's <code>formatted_name</code> as a {@api vue:component:LinkModelView} link with the primary key as a trailing mono chip</span>
    <span>prompt: a generated "Are you sure you want to ..." sentence in the left-bordered panel; the <code>confirm-message</code> prop replaces the wording and the slot of the same name replaces the whole panel</span>
    <span>requests: the same PATCH goes to the detail action url twice, once on mount carrying <code>Dry-Run: true</code> and once on confirm. The server runs both and rolls the dry run back, so a pre-flight validates against real data without persisting</span>
    <span>PageTitle: supplied here by the docs harness, as an integrator's layout would; the view contributes the title and teleports its "Go Back" button into the title row</span>
    <span>theme keys: {@api theme-key:ViewActivate}, {@api theme-key:ModelActionForm}, {@api theme-key:ActionForm} · source: <code>ViewActivate.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

::: info What the retired mockup showed
The hand-authored mockup this section used to carry differed from the default view in
several ways, recorded here rather than lost:

- **A banner meta row.** The mockup ended the banner with a row of contextual facts (action
  name, last seen, workspaces restored). The banner has no meta row; it is a title, a
  description, and nothing else.
- **Written banner copy.** The mockup's two lines were prose about what activation does to
  sessions and API keys. Both real lines are generated from the action and model names, so
  a project that wants that copy passes `banner-title` and `banner-description`.
- **Extra checkbox fields.** "Send notification email" and "Force password reset" were part
  of the mockup. The default view renders no extra fields. The `extra-fields` slot is where
  they belong: fields placed there join the form context, so their values reach the request
  body.
- **An audit hint.** The mockup's action strip ended with "Audited as `user.activate` on
  save". The `actions-hint` slot exists for exactly that and is empty by default.
- **Named buttons.** The mockup submitted with "Reactivate user" beside a check icon and
  offered Cancel in both the title row and the action strip. The real buttons read "Yes,
  continue" and "Cancel, go back" (override the `confirm-button` slot to change that), and
  the only title-row button is the view's own "Go Back".
- **The record row.** The mockup hand-built a row with a user icon, an email address, and a
  deactivation date. The real chip carries the record's `formatted_name` and its primary
  key.
  :::

## ViewWorkflowTransition

Promotes the default workflow transition RadioGroup (which renders as a raw debug string) into structured **transition cards**. Each card shows the target state pill, a plain-language description, and side-effect metadata. A reason textarea below the list is stored against the audit entry.

The current state is surfaced in a tinted strip below the title bar so there is no ambiguity about where the object is starting from.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="invoice" · current_state="draft" · 3 transitions available · interactive</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <PageTitle title="Move invoice to next state">
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <!-- current state strip -->
    <div class="flex items-center gap-3 border-b-hairline bg-muted/15 px-6 py-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currently</span>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-info/25 bg-info/8 px-2.5 py-1 text-xs font-semibold text-info">
        <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
        Draft
      </span>
      <span class="text-xs text-muted-foreground">INV-2026-1182 · $14,028.50 · created 2026-04-21</span>
    </div>
    <!-- body -->
    <div class="px-6 py-5">
      <div class="mb-4 flex items-baseline justify-between">
        <h3 class="text-sm font-semibold">Available transitions</h3>
        <span class="text-xs text-muted-foreground">3 of 6 transitions allowed for your role</span>
      </div>
      <RadioGroup v-model="selectedTransition" class="flex flex-col gap-3">
        <!-- send for review -->
        <div :class="selectedTransition === 'send-for-review' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="cursor-pointer rounded-vueda-control border p-4 transition-colors" @click="selectedTransition = 'send-for-review'">
          <div class="flex items-start gap-3">
            <RadioGroupItem id="tr-review" value="send-for-review" class="mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Send for review
                <FontAwesomeIcon :icon="faArrowRight" class="text-xs text-muted-foreground" />
                <span class="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">In review</span>
              </p>
              <p class="mt-1 text-sm text-muted-foreground">Routes to the assigned reviewer. The invoice becomes read-only for editors until reviewed. Notifies <strong class="text-foreground">priya.s</strong>.</p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><FontAwesomeIcon :icon="faBell" /> 1 notification</span>
                <span>SLA · 2 business days</span>
              </div>
            </div>
          </div>
        </div>
        <!-- send to customer -->
        <div :class="selectedTransition === 'send-to-customer' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="cursor-pointer rounded-vueda-control border p-4 transition-colors" @click="selectedTransition = 'send-to-customer'">
          <div class="flex items-start gap-3">
            <RadioGroupItem id="tr-send" value="send-to-customer" class="mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Send to customer
                <FontAwesomeIcon :icon="faArrowRight" class="text-xs text-muted-foreground" />
                <span class="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Sent</span>
              </p>
              <p class="mt-1 text-sm text-muted-foreground">Skip the review step (allowed for invoices under $5,000). Emails the PDF to the billing contact and starts the payment-due timer.</p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><FontAwesomeIcon :icon="faEnvelope" /> Email + PDF</span>
                <span>Locks invoice</span>
              </div>
            </div>
          </div>
        </div>
        <!-- void (disabled) -->
        <div class="cursor-not-allowed rounded-vueda-control border border-border bg-card p-4 opacity-50">
          <div class="flex items-start gap-3">
            <RadioGroupItem id="tr-void" value="void" :disabled="true" class="mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Void
                <FontAwesomeIcon :icon="faArrowRight" class="text-xs text-muted-foreground" />
                <span class="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-xs font-semibold text-destructive">Voided</span>
              </p>
              <p class="mt-1 text-sm text-muted-foreground">Voiding requires the <em>billing.admin</em> role. Voided invoices remain visible in audit and reports but cannot be sent or paid.</p>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><FontAwesomeIcon :icon="faLock" /> Restricted</span>
                <span>Irreversible</span>
              </div>
            </div>
          </div>
        </div>
      </RadioGroup>
      <div class="mt-5">
        <Field orientation="vertical">
          <FieldLabel for="vwt-reason">
            Reason
            <span class="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <FieldContent>
            <Textarea id="vwt-reason" placeholder="Add context for the reviewer — visible in the audit log." />
            <FieldDescription>Stored against the audit entry. Visible to anyone with access to this invoice.</FieldDescription>
          </FieldContent>
        </Field>
      </div>
    </div>
    <!-- actions strip -->
    <div class="flex flex-wrap items-center gap-3 border-t-hairline px-6 py-4">
      <Button emphasis="ghost">Cancel</Button>
      <Button tone="primary">
        <FontAwesomeIcon :icon="faArrowRight" />
        {{ selectedTransition === 'send-for-review' ? 'Send for review' : selectedTransition === 'send-to-customer' ? 'Send to customer' : 'Apply transition' }}
      </Button>
      <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <FontAwesomeIcon :icon="faCircleQuestion" />
        Transition is recorded against your account
      </span>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>current-state strip: <code>bg-muted/15</code> tint below PageTitle; the state pill reuses the same tone classes as Badge</span>
    <span>transition cards: <code>RadioGroup v-model</code> + ternary <code>border-primary bg-primary/5</code> vs <code>border-border bg-card</code>; card wrapper <code>@click</code> makes the whole surface selectable</span>
    <span>destination pills: hand-rolled <code>inline-flex rounded-full border</code> with tone classes — Badge has no info/success/warning variants</span>
    <span>disabled option: <code>opacity-50 cursor-not-allowed</code> on wrapper div; <code>:disabled="true"</code> on RadioGroupItem prevents keyboard selection</span>
    <span>submit label: reflects the selected transition name — not just "Submit"</span>
    <span>reason textarea: Field + Textarea + FieldDescription; stored in the audit log, so the description says so</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="invoice" · current_state="paid" · terminal state · no transitions available</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <PageTitle title="Move invoice to next state">
      <template #button>
        <Button size="sm" emphasis="ghost">Back to invoice</Button>
      </template>
    </PageTitle>
    <!-- current state strip -->
    <div class="flex items-center gap-3 border-b-hairline bg-muted/15 px-6 py-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currently</span>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
        <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
        Paid
      </span>
      <span class="text-xs text-muted-foreground">INV-2026-1095 · $2,440.00 · paid 2026-04-12</span>
    </div>
    <!-- empty state -->
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <FontAwesomeIcon :icon="faFlagCheckered" class="text-3xl text-muted-foreground/40" />
      <p class="font-semibold text-foreground">No transitions available from <em>Paid</em></p>
      <p class="max-w-sm text-sm text-muted-foreground">This is a terminal state in the invoice workflow. To make changes, issue a credit note or refund from the invoice page instead.</p>
    </div>
    <!-- actions strip -->
    <div class="flex flex-wrap items-center gap-3 border-t-hairline px-6 py-4">
      <Button emphasis="ghost">Back to invoice</Button>
      <span class="ml-auto"></span>
      <Button emphasis="outline">
        <FontAwesomeIcon :icon="faRotateLeft" />
        Issue credit note
      </Button>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>terminal state: show an empty state instead of an empty RadioGroup; explain why and offer the relevant escape hatch</span>
    <span>empty state icon: muted at <code>text-muted-foreground/40</code> — decorative, not informational</span>
    <span>escape-hatch action: pushed to the right with <code>ml-auto spacer</code> so it does not compete with Back</span>
  </footer>
</VuedaDemo>

## ViewHistoryList

Audit trail for a single object. Each row is one field change; sibling rows share a revision. The first row of each revision carries the metadata (timestamp, user, type) and a left-border stripe visually groups the changes that belong to it. A filter bar sits above the table with a layout toggle (table vs. cards).

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="customer" · pk=1024 · 4 revisions · 9 changes · table layout</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <PageTitle title="Audit trail · Northwind Logistics">
      <template #button>
        <Button size="sm" emphasis="outline">
          <FontAwesomeIcon :icon="faFilter" />
          Filter
        </Button>
        <Button size="sm" emphasis="outline">
          <FontAwesomeIcon :icon="faArrowUpFromBracket" />
          Export CSV
        </Button>
      </template>
      <template #subtitle>
        <strong>9 changes</strong> across 4 revisions · oldest 2026-01-12
        <span class="ml-auto text-muted-foreground">Retention <strong class="text-foreground">7 years</strong></span>
      </template>
    </PageTitle>
    <!-- filter / layout bar -->
    <div class="flex items-center gap-0 border-b-hairline bg-muted/10 px-6 py-2 text-sm">
      <span class="mr-4 text-muted-foreground"><strong class="text-foreground">Range</strong> last 90 days</span>
      <span class="mr-4 text-muted-foreground"><strong class="text-foreground">Type</strong> all</span>
      <span class="text-muted-foreground"><strong class="text-foreground">User</strong> any</span>
      <div class="ml-auto flex overflow-clip rounded-vueda-control border border-border">
        <Button size="sm" emphasis="ghost" class="rounded-none border-r border-border text-xs">
          <FontAwesomeIcon :icon="faTable" /> Table
        </Button>
        <Button size="sm" emphasis="ghost" class="rounded-none text-xs text-muted-foreground">
          <FontAwesomeIcon :icon="faIdCard" /> Cards
        </Button>
      </div>
    </div>
    <!-- table -->
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-16">Rev</TableHead>
          <TableHead class="w-36">When</TableHead>
          <TableHead class="w-44">Who</TableHead>
          <TableHead class="w-28">Type</TableHead>
          <TableHead class="w-40">Field</TableHead>
          <TableHead>Old</TableHead>
          <TableHead>New</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <!-- Revision 4 — 3 changes -->
        <TableRow>
          <TableCell class="border-l-2 border-primary align-top font-mono text-xs text-muted-foreground">#4</TableCell>
          <TableCell class="align-top">
            <div class="text-sm">2026-04-26 14:08</div>
            <div class="text-xs text-muted-foreground">2 hours ago</div>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
              <UserAvatar name="Mara Tani" :size="22" />
              Mara Tani
            </span>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/8 px-2 py-0.5 text-xs text-info">
              <FontAwesomeIcon :icon="faPen" /> updated
            </span>
          </TableCell>
          <TableCell class="align-top font-mono text-xs">mrr_cents</TableCell>
          <TableCell class="align-top"><span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">1382000</span></TableCell>
          <TableCell class="align-top"><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">1402850</span></TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="border-l-2 border-primary font-mono text-xs text-muted-foreground">·</TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell class="font-mono text-xs">renewal_at</TableCell>
          <TableCell><span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">2026-12-01</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">2027-01-15</span></TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="border-l-2 border-primary font-mono text-xs text-muted-foreground">·</TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell class="font-mono text-xs">notes</TableCell>
          <TableCell><span class="inline-block max-w-48 truncate rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">Annual renewal — review pricing tier in Q4.</span></TableCell>
          <TableCell><span class="inline-block max-w-48 truncate rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">Annual renewal locked at Tier 3 through 2027.</span></TableCell>
        </TableRow>
        <!-- Revision 3 — 1 change -->
        <TableRow>
          <TableCell class="border-l-2 border-primary align-top font-mono text-xs text-muted-foreground">#3</TableCell>
          <TableCell class="align-top">
            <div class="text-sm">2026-04-12 09:42</div>
            <div class="text-xs text-muted-foreground">2 weeks ago</div>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
              <UserAvatar name="Jordan Reyes" :size="22" />
              Jordan Reyes
            </span>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/8 px-2 py-0.5 text-xs text-info">
              <FontAwesomeIcon :icon="faPen" /> updated
            </span>
          </TableCell>
          <TableCell class="font-mono text-xs">status</TableCell>
          <TableCell><span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">trial</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">active</span></TableCell>
        </TableRow>
        <!-- Revision 2 — 4 changes -->
        <TableRow>
          <TableCell class="border-l-2 border-primary align-top font-mono text-xs text-muted-foreground">#2</TableCell>
          <TableCell class="align-top">
            <div class="text-sm">2026-02-04 17:15</div>
            <div class="text-xs text-muted-foreground">3 months ago</div>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
              <UserAvatar name="Priya Subramanian" :size="22" />
              Priya Subramanian
            </span>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/8 px-2 py-0.5 text-xs text-info">
              <FontAwesomeIcon :icon="faPen" /> updated
            </span>
          </TableCell>
          <TableCell class="font-mono text-xs">owner_id</TableCell>
          <TableCell><span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">user:42 (Linnea Borg)</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">user:7 (Mara Tani)</span></TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="border-l-2 border-primary font-mono text-xs text-muted-foreground">·</TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell class="font-mono text-xs">tags</TableCell>
          <TableCell><span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">["logistics","new"]</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">["logistics","strategic","apac"]</span></TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="border-l-2 border-primary font-mono text-xs text-muted-foreground">·</TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell class="font-mono text-xs">billing_address</TableCell>
          <TableCell><span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">12 Wharf Rd, Auckland</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">Lvl 3, 88 Quay St, Auckland 1010</span></TableCell>
        </TableRow>
        <TableRow>
          <TableCell class="border-l-2 border-primary font-mono text-xs text-muted-foreground">·</TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell class="font-mono text-xs">phone</TableCell>
          <TableCell><span class="text-xs italic text-muted-foreground">— empty</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">+64 9 555 0142</span></TableCell>
        </TableRow>
        <!-- Revision 1 — created -->
        <TableRow>
          <TableCell class="border-l-2 border-primary align-top font-mono text-xs text-muted-foreground">#1</TableCell>
          <TableCell class="align-top">
            <div class="text-sm">2026-01-12 11:02</div>
            <div class="text-xs text-muted-foreground">3.5 months ago</div>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
              <UserAvatar name="Linnea Borg" :size="22" />
              Linnea Borg
            </span>
          </TableCell>
          <TableCell class="align-top">
            <span class="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">
              <FontAwesomeIcon :icon="faPlus" /> created
            </span>
          </TableCell>
          <TableCell class="text-xs italic text-muted-foreground">— record created —</TableCell>
          <TableCell><span class="text-xs italic text-muted-foreground">no prior values</span></TableCell>
          <TableCell><span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">12 fields populated</span></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>revision grouping: <code>border-l-2 border-primary</code> on every first-cell of the revision — consistent stripe, no row background needed</span>
    <span>child rows: first four cells empty; only Field/Old/New columns carry data</span>
    <span>diff cells: old = <code>bg-destructive/5 text-destructive line-through</code>, new = <code>bg-success/10 text-success</code>; empty values as italic muted text</span>
    <span>type pills: hand-rolled <code>rounded-full border</code> spans with tone classes; "updated" → info, "created" → success, "restored" → warning</span>
    <span>user avatar: <code>UserAvatar :size="22"</code> — primary-tinted initials chip</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="customer" · same data · cards layout · includes "restored" revision type</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <PageTitle title="Audit trail · Hightower Mfg.">
      <template #button>
        <Button size="sm" emphasis="outline">
          <FontAwesomeIcon :icon="faArrowUpFromBracket" />
          Export CSV
        </Button>
      </template>
    </PageTitle>
    <!-- filter / layout bar -->
    <div class="flex items-center gap-4 border-b-hairline bg-muted/10 px-6 py-2 text-sm">
      <span class="text-muted-foreground"><strong class="text-foreground">Range</strong> all time</span>
      <span class="text-muted-foreground"><strong class="text-foreground">3 revisions</strong></span>
      <div class="ml-auto flex overflow-clip rounded-vueda-control border border-border">
        <Button size="sm" emphasis="ghost" class="rounded-none border-r border-border text-xs text-muted-foreground">
          <FontAwesomeIcon :icon="faTable" /> Table
        </Button>
        <Button size="sm" emphasis="ghost" class="rounded-none text-xs">
          <FontAwesomeIcon :icon="faIdCard" /> Cards
        </Button>
      </div>
    </div>
    <!-- cards -->
    <div class="divide-y divide-border">
      <!-- Rev 3 — updated 2 fields -->
      <div class="px-6 py-4">
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="font-mono text-xs text-muted-foreground">#3</span>
          <span class="text-sm"><strong>2026-04-25 17:15</strong> · 3 days ago</span>
          <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
            <UserAvatar name="Priya Subramanian" :size="22" />
            Priya Subramanian
          </span>
          <span class="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/8 px-2 py-0.5 text-xs text-info">
            <FontAwesomeIcon :icon="faPen" /> updated · 2 fields
          </span>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-3">
            <span class="w-32 shrink-0 font-mono text-xs text-muted-foreground">status</span>
            <span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">active</span>
            <FontAwesomeIcon :icon="faArrowRight" class="text-xs text-muted-foreground" />
            <span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">at_risk</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="w-32 shrink-0 font-mono text-xs text-muted-foreground">health_score</span>
            <span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">82</span>
            <FontAwesomeIcon :icon="faArrowRight" class="text-xs text-muted-foreground" />
            <span class="inline-block rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">54</span>
          </div>
        </div>
      </div>
      <!-- Rev 2 — restored -->
      <div class="px-6 py-4">
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="font-mono text-xs text-muted-foreground">#2</span>
          <span class="text-sm"><strong>2026-03-08 09:42</strong> · 7 weeks ago</span>
          <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
            <UserAvatar name="Jordan Reyes" :size="22" />
            Jordan Reyes
          </span>
          <span class="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-xs text-warning">
            <FontAwesomeIcon :icon="faRotateLeft" /> restored
          </span>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-3">
            <span class="w-32 shrink-0 font-mono text-xs text-muted-foreground">deleted_at</span>
            <span class="inline-block rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-xs text-destructive line-through">2026-02-22 14:10</span>
            <FontAwesomeIcon :icon="faArrowRight" class="text-xs text-muted-foreground" />
            <span class="text-xs italic text-muted-foreground">— cleared</span>
          </div>
        </div>
      </div>
      <!-- Rev 1 — created -->
      <div class="px-6 py-4">
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="font-mono text-xs text-muted-foreground">#1</span>
          <span class="text-sm"><strong>2025-11-04 11:02</strong> · 6 months ago</span>
          <span class="inline-flex items-center gap-2 text-[length:var(--vueda-text-supporting)] font-medium">
            <UserAvatar name="Linnea Borg" :size="22" />
            Linnea Borg
          </span>
          <span class="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">
            <FontAwesomeIcon :icon="faPlus" /> created
          </span>
        </div>
        <p class="text-sm text-muted-foreground">Record created with 9 fields populated. Initial owner Linnea Borg.</p>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>cards layout: each revision is a <code>divide-y</code> block — header row + change list; no table chrome needed</span>
    <span>"restored" type pill: <code>bg-warning/10 border-warning/25 text-warning</code>; third tone in the type vocabulary alongside "updated" (info) and "created" (success)</span>
    <span>card layout is the default on narrow viewports; table layout is the default on wide viewports</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="customer" · pk=2099 · no history yet (just created)</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <PageTitle title="Audit trail · Foxglove &amp; Kettle" />
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <FontAwesomeIcon :icon="faClock" class="text-3xl text-muted-foreground/40" />
      <p class="font-semibold text-foreground">No history yet</p>
      <p class="max-w-sm text-sm text-muted-foreground">This record was created less than an hour ago and hasn't been edited since. Once changes are made, they'll appear here grouped by revision with a per-field old → new diff.</p>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>empty state: no filter bar, no layout toggle — surface nothing until there is something to surface</span>
    <span>clock icon from <code>@fortawesome/free-regular-svg-icons</code>: the regular (outline) variant reads as "waiting" rather than "done"</span>
  </footer>
</VuedaDemo>

## Customization surface

The action banner, selected-objects panel, prompt block, and actions strip are all composed from tokens — there are no dedicated theme keys for them yet. Customization happens at the token level.

| Surface                  | Key tokens                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Info banner              | `--info`, `--info-foreground` via `bg-info/8`, `border-info/25`, `text-info`                 |
| Success banner           | `--success`, `--success-foreground` via `bg-success/10`, `border-success/30`, `text-success` |
| Warning banner           | `--warning`, `--warning-foreground` via `bg-warning/10`, `border-warning/25`, `text-warning` |
| Destructive banner       | `--destructive` via `bg-destructive/5`, `border-destructive/20` (see CRUDL Views)            |
| Prompt block             | `--border` (left rule), `--muted` (background tint via `bg-muted/8`)                         |
| Object list              | `--border` (dividers, outer ring), `--radius-vueda-control`                                  |
| Actions strip            | `--border` (top hairline)                                                                    |
| Transition card selected | `--primary` via `border-primary`, `bg-primary/5`                                             |
| Current state strip      | `--muted` via `bg-muted/15`; state pill tone from the workflow state vocabulary              |
| Diff old                 | `--destructive` via `bg-destructive/5`, `border-destructive/20`, `text-destructive`          |
| Diff new                 | `--success` via `bg-success/10`, `border-success/30`, `text-success`                         |
| Revision stripe          | `--primary` via `border-l-2 border-primary` on first cell of each revision group             |
| Type pill (updated)      | `--info` via `bg-info/8`, `border-info/25`, `text-info`                                      |
| Type pill (created)      | `--success` via `bg-success/10`, `border-success/30`, `text-success`                         |
| Type pill (restored)     | `--warning` via `bg-warning/10`, `border-warning/25`, `text-warning`                         |
