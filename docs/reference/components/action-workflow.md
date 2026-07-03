---
title: Action & Workflow Views
status: draft
audience: designer
type: reference
---

<script setup>
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import Button from "@vueda/controls/button/Button.vue";
import Input from "@vueda/controls/input/Input.vue";
import Textarea from "@vueda/controls/textarea/Textarea.vue";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import RadioGroup from "@vueda/controls/radio-group/RadioGroup.vue";
import RadioGroupItem from "@vueda/controls/radio-group/RadioGroupItem.vue";
import Table from "@vueda/grid/table/Table.vue";
import TableBody from "@vueda/grid/table/TableBody.vue";
import TableCell from "@vueda/grid/table/TableCell.vue";
import TableHead from "@vueda/grid/table/TableHead.vue";
import TableHeader from "@vueda/grid/table/TableHeader.vue";
import TableRow from "@vueda/grid/table/TableRow.vue";
import UserAvatar from "@vueda/display/avatar/UserAvatar.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faBoxArchive,
    faArrowRight,
    faTriangleExclamation,
    faCircleCheck,
    faCircleXmark,
    faShieldHalved,
    faArrowRotateRight,
    faCreditCard,
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
    faBuilding,
    faFileLines,
    faUser,
    faClock,
    faIdCard,
    faClone,
    faBell,
    faEnvelope,
} from "@fortawesome/free-regular-svg-icons";
import { ref } from "vue";

const selectedTransition = ref("send-for-review");
const notifyEmail = ref(true);
const forcePasswordReset = ref(false);
const copyDiscounts = ref(true);
</script>

# Action & Workflow Views

Four view-scale layouts that handle model actions, workflow transitions, and audit history. Each builds on {@api vue:component:PageTitle} from the CRUDL family. The new piece introduced here is the **tone-tracked action banner**: a full-bleed strip below the title that grounds the action's purpose and risk level before the user reaches the submit button.

Banner tone follows action sentiment: `info` for neutral confirmations, `success` for activations and restorations, `warning` for irreversible non-destructive moves, and `destructive` for permanent deletions (the destroy variant lives in CRUDL Views). Skipping the banner leaves users wondering what the action will actually do.

## ViewAction

Generic action confirmation view. An info-toned banner explains what the action does; the selected objects are listed below it; and a prompt panel restates the question in plain language before the actions strip. Extra action-specific fields sit between the object list and the prompt when present.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="archive" · 4 records selected · default info tone</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Archive 4 customers">
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <!-- info banner -->
    <div class="flex gap-4 border-b border-info/25 bg-info/8 px-6 py-4">
      <FontAwesomeIcon :icon="faBoxArchive" class="mt-0.5 shrink-0 text-info" />
      <div>
        <p class="font-semibold text-foreground">Archived customers move out of the active list and stop receiving renewal reminders.</p>
        <p class="mt-1 text-sm text-muted-foreground">Their records, contacts, and historical invoices stay accessible; you can restore at any time from the Archived view. Active subscriptions are <em>not</em> cancelled by this action — handle those separately.</p>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>action <strong class="text-foreground">archive</strong></span>
          <span>scope <strong class="text-foreground">4 selected</strong></span>
          <span>side-effects <strong class="text-foreground">none</strong></span>
        </div>
      </div>
    </div>
    <!-- body -->
    <div class="px-6 py-5">
      <div class="mb-4">
        <div class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Records to archive</h3>
          <span class="text-xs text-muted-foreground">4 of 4 selected</span>
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
          <div class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FontAwesomeIcon :icon="faBuilding" class="shrink-0 text-muted-foreground" />
            <span>Quay &amp; Tide Outfitters</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">#1031</span>
          </div>
        </div>
      </div>
      <div class="border-l-4 border-border bg-muted/8 px-4 py-3">
        <p class="text-sm font-semibold">Are you sure you want to archive these 4 customers?</p>
        <p class="mt-1 text-sm text-muted-foreground">This action is reversible — admins can restore records from <em>Customers → Archived</em>. Renewal reminders will stop within 5 minutes.</p>
      </div>
    </div>
    <!-- actions strip -->
    <div class="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
      <Button emphasis="ghost">Cancel</Button>
      <Button tone="primary">
        <FontAwesomeIcon :icon="faBoxArchive" />
        Archive 4 customers
      </Button>
      <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <FontAwesomeIcon :icon="faCircleQuestion" />
        Reversible — restore any time from <strong class="text-foreground">Archived</strong>
      </span>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>banner: <code>bg-info/8 border-info/25</code> strip; grounds the action before the buttons</span>
    <span>banner meta row: action · scope · side-effects — always populate what you know</span>
    <span>object list: <code>divide-y divide-border rounded-vueda-control border</code> with icon + label + pk</span>
    <span>prompt panel: <code>border-l-4 border-border bg-muted/8</code> left-rule treatment</span>
    <span>actions strip: <code>border-t border-border</code> hairline; hint text pushed right with <code>ml-auto</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="duplicate" · 1 record · single-object variant with extra fields</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Duplicate quote">
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <!-- info banner -->
    <div class="flex gap-4 border-b border-info/25 bg-info/8 px-6 py-4">
      <FontAwesomeIcon :icon="faClone" class="mt-0.5 shrink-0 text-info" />
      <div>
        <p class="font-semibold text-foreground">Create a copy of this quote with status <em>Draft</em> and today's issue date.</p>
        <p class="mt-1 text-sm text-muted-foreground">Line items, customer, and notes are copied. Signatures, invoices, and audit history are not.</p>
      </div>
    </div>
    <!-- body -->
    <div class="px-6 py-5">
      <div class="mb-5">
        <div class="mb-3 flex items-baseline border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Source</h3>
        </div>
        <div class="divide-y divide-border rounded-vueda-control border border-border">
          <div class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FontAwesomeIcon :icon="faFileLines" class="shrink-0 text-muted-foreground" />
            <span>Q-2026-0418 — Northwind Logistics · annual renewal</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">$14,028.50</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4 mb-5">
        <Field orientation="vertical">
          <FieldLabel for="dup-name">New quote name</FieldLabel>
          <FieldContent>
            <Input id="dup-name" :model-value="'Copy of Q-2026-0418'" />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel for="dup-customer">Assign to customer</FieldLabel>
          <FieldContent>
            <Input id="dup-customer" :model-value="'Northwind Logistics'" />
          </FieldContent>
        </Field>
        <div class="flex items-center gap-2">
          <Checkbox id="dup-discounts" v-model="copyDiscounts" />
          <label for="dup-discounts" class="cursor-pointer select-none text-sm">Copy line-item discounts</label>
        </div>
      </div>
    </div>
    <!-- actions strip -->
    <div class="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
      <Button emphasis="ghost">Cancel</Button>
      <Button tone="primary">
        <FontAwesomeIcon :icon="faClone" />
        Duplicate quote
      </Button>
      <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <kbd class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">⌘</kbd>
        <kbd class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">↵</kbd>
        to confirm
      </span>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>single-object variant: "Source" heading instead of "Records to archive N" — same panel chrome, different semantics</span>
    <span>extra fields: action-specific inputs appear between the object list and the actions strip; reuse Field + Input + Checkbox from the forms family</span>
    <span>keyboard hint: <code>kbd</code> tokens rendered inline in the hint area</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="bill-now" · 3 records · dry-run failed · warning tone</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Bill now (3 subscriptions)">
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <!-- warning banner -->
    <div class="flex gap-4 border-b border-warning/25 bg-warning/10 px-6 py-4">
      <FontAwesomeIcon :icon="faTriangleExclamation" class="mt-0.5 shrink-0 text-warning" />
      <div>
        <p class="font-semibold text-foreground">Dry-run found 2 problems. Fix or exclude affected subscriptions before billing.</p>
        <p class="mt-1 text-sm text-muted-foreground">Bill-now triggers a real charge against connected payment methods. Only subscriptions in <em>Active</em> state with a current payment method can be billed off-cycle.</p>
      </div>
    </div>
    <!-- body -->
    <div class="px-6 pt-5 pb-3">
      <Alert variant="destructive" class="mb-5">
        <FontAwesomeIcon :icon="faCircleXmark" />
        <AlertTitle>Cannot run action — 2 of 3 records are ineligible</AlertTitle>
        <AlertDescription>
          <p>These problems were found during dry-run. Resolve them and try again, or untick the affected rows.</p>
          <ul class="mt-2 list-none space-y-1 text-sm">
            <li><span class="font-semibold">subscription #4421</span> — No active payment method on file. Update billing details before charging.</li>
            <li><span class="font-semibold">subscription #4438</span> — State is <code class="font-mono text-xs">paused</code>. Resume the subscription first.</li>
          </ul>
        </AlertDescription>
      </Alert>
      <div class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
        <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Records</h3>
        <span class="text-xs text-muted-foreground">3 selected · 1 will run</span>
      </div>
      <div class="divide-y rounded-vueda-control border border-border" style="border-color: var(--border)">
        <!-- eligible row -->
        <div class="flex items-center gap-3 px-3 py-2.5 text-sm" style="border-color: color-mix(in oklab, var(--success) 35%, var(--border))">
          <FontAwesomeIcon :icon="faCircleCheck" class="shrink-0 text-success" />
          <span>Sub #4402 — Acme Coffee Roasters · monthly</span>
          <span class="ml-auto font-mono text-xs text-muted-foreground">$220.00</span>
        </div>
        <!-- ineligible rows -->
        <div class="flex items-center gap-3 px-3 py-2.5 text-sm" style="border-color: color-mix(in oklab, var(--destructive) 40%, var(--border)); background: color-mix(in oklab, var(--destructive) 4%, var(--card))">
          <FontAwesomeIcon :icon="faCircleXmark" class="shrink-0 text-destructive" />
          <span>Sub #4421 — Hightower Mfg. · quarterly</span>
          <span class="ml-auto font-mono text-xs text-muted-foreground">no payment method</span>
        </div>
        <div class="flex items-center gap-3 px-3 py-2.5 text-sm" style="border-color: color-mix(in oklab, var(--destructive) 40%, var(--border)); background: color-mix(in oklab, var(--destructive) 4%, var(--card))">
          <FontAwesomeIcon :icon="faCircleXmark" class="shrink-0 text-destructive" />
          <span>Sub #4438 — Stoneridge Architects · annual</span>
          <span class="ml-auto font-mono text-xs text-muted-foreground">paused</span>
        </div>
      </div>
    </div>
    <!-- actions strip -->
    <div class="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
      <Button emphasis="ghost">Cancel</Button>
      <Button emphasis="outline">
        <FontAwesomeIcon :icon="faArrowRotateRight" />
        Re-run dry-run
      </Button>
      <Button tone="primary" disabled aria-disabled="true">
        <FontAwesomeIcon :icon="faCreditCard" />
        Bill now
      </Button>
      <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <FontAwesomeIcon :icon="faShieldHalved" />
        Disabled until validation passes
      </span>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>warning banner: <code>bg-warning/10 border-warning/25</code>; use when the action is real-world-irreversible but not destructive (billing, sending, publishing)</span>
    <span>dry-run errors: Alert variant="destructive" in the body — distinct from the banner, which describes the action; Alert describes what's broken</span>
    <span>row-level eligibility: <code>color-mix(in oklab, var(--success/destructive) ..., var(--border/card))</code> for border and bg tint; avoids Tailwind class collisions on dynamic values</span>
    <span>primary action disabled until validation passes — the submit guard is a form-level concern, not just UX decoration</span>
  </footer>
</VuedaDemo>

## ViewActivate

Same recipe as ViewAction with the banner switched to a success tone. Establishes the tone-tracking pattern: **info** for neutral confirmation, **success** for activate and restore, **warning** for irreversible non-destructive moves. The action name and record metadata appear in the banner's footer row.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">action="activate" · 1 record · success-toned banner</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Reactivate user">
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <!-- success banner -->
    <div class="flex gap-4 border-b border-success/30 bg-success/10 px-6 py-4">
      <FontAwesomeIcon :icon="faCircleCheck" class="mt-0.5 shrink-0 text-success" />
      <div>
        <p class="font-semibold text-foreground">This user will regain access to their workspaces, sessions, and API keys.</p>
        <p class="mt-1 text-sm text-muted-foreground">Pending invitations are unchanged. Sign-in is enabled immediately; the user receives an email if a contact address is on file.</p>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>action <strong class="text-foreground">activate</strong></span>
          <span>last seen <strong class="text-foreground">2025-12-14</strong></span>
          <span>workspaces restored <strong class="text-foreground">3</strong></span>
        </div>
      </div>
    </div>
    <!-- body -->
    <div class="px-6 py-5">
      <div class="mb-5">
        <div class="mb-3 flex items-baseline border-b border-border pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">User</h3>
        </div>
        <div class="divide-y divide-border rounded-vueda-control border border-border">
          <div class="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FontAwesomeIcon :icon="faUser" class="shrink-0 text-muted-foreground" />
            <span>Jordan Reyes — jordan.reyes@example.com</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">deactivated 2026-01-08</span>
          </div>
        </div>
      </div>
      <div class="mb-5 border-l-4 border-border bg-muted/8 px-4 py-3">
        <p class="text-sm font-semibold">Reactivate this user?</p>
        <p class="mt-1 text-sm text-muted-foreground">The user will be able to sign in starting now. Their previous role assignments and group memberships are restored as they were on the day of deactivation.</p>
      </div>
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <Checkbox id="act-notify" v-model="notifyEmail" />
          <label for="act-notify" class="cursor-pointer select-none text-sm">Send notification email to the user</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="act-pwreset" v-model="forcePasswordReset" />
          <label for="act-pwreset" class="cursor-pointer select-none text-sm">Force password reset on next sign-in</label>
        </div>
      </div>
    </div>
    <!-- actions strip -->
    <div class="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
      <Button emphasis="ghost">Cancel</Button>
      <Button tone="primary">
        <FontAwesomeIcon :icon="faCircleCheck" />
        Reactivate user
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">Audited as <strong class="text-foreground">user.activate</strong> on save</span>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>success banner: <code>bg-success/10 border-success/30</code>; reserve for actions that restore, enable, or create positive state</span>
    <span>banner meta row carries contextual facts (last seen, workspaces affected) to reduce surprise after commit</span>
    <span>extra Checkbox fields: inline checkbox rows, not full Field wrappers — appropriate when the options have no validation or description</span>
    <span>audit hint in action strip: surfaces the event name that will appear in the history log</span>
  </footer>
</VuedaDemo>

## ViewWorkflowTransition

Promotes the default workflow transition RadioGroup (which renders as a raw debug string) into structured **transition cards**. Each card shows the target state pill, a plain-language description, and side-effect metadata. A reason textarea below the list is stored against the audit entry.

The current state is surfaced in a tinted strip below the title bar so there is no ambiguity about where the object is starting from.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">model="invoice" · current_state="draft" · 3 transitions available · interactive</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Move invoice to next state">
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <!-- current state strip -->
    <div class="flex items-center gap-3 border-b border-border bg-muted/15 px-6 py-3">
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
    <div class="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
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
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Move invoice to next state">
      <template #button>
        <Button size="sm" emphasis="ghost">Back to invoice</Button>
      </template>
    </PageTitle>
    <!-- current state strip -->
    <div class="flex items-center gap-3 border-b border-border bg-muted/15 px-6 py-3">
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
    <div class="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
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
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
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
    <div class="flex items-center gap-0 border-b border-border bg-muted/10 px-6 py-2 text-sm">
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
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Audit trail · Hightower Mfg.">
      <template #button>
        <Button size="sm" emphasis="outline">
          <FontAwesomeIcon :icon="faArrowUpFromBracket" />
          Export CSV
        </Button>
      </template>
    </PageTitle>
    <!-- filter / layout bar -->
    <div class="flex items-center gap-4 border-b border-border bg-muted/10 px-6 py-2 text-sm">
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
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
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
