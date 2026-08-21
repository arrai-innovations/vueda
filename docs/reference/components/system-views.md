---
title: System Views
status: draft
audience: designer
type: reference
---

<script setup>
import { ref } from "vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import ConsequencesBullets from "@vueda/display/consequences-bullets/ConsequencesBullets.vue";
import SystemMessageCard from "@vueda/display/system-message/SystemMessageCard.vue";
import TypedConfirmField from "@vueda/form/confirm/TypedConfirmField.vue";
import TriedUrlCallout from "@vueda/display/system-message/TriedUrlCallout.vue";
import DiagnosticStrip from "@vueda/display/system-message/DiagnosticStrip.vue";
import SuggestionList from "@vueda/display/system-message/SuggestionList.vue";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faHouse, faSearch } from "@fortawesome/free-solid-svg-icons";

const deactivateConfirm = ref("");
const destroyConfirm = ref("");

// Fixtures for the SuggestionList, DiagnosticStrip, and ErrorDisplay demos below.
// All values are fictional. Emails use domain.invalid per the test conventions.
const routeSuggestions = [
  { label: "customers", sub: "/customers", score: 0.92, to: "/customers" },
  { label: "customer-groups", sub: "/customer-groups", score: 0.71, to: "/customer-groups" },
  { label: "custom-fields", sub: "/settings/custom-fields", score: 0.54, to: "/settings/custom-fields" },
];
const actionSuggestions = [
  { label: "archive", sub: "Move out of the active list", verb: "POST", to: "/customers/archive" },
  { label: "retrieve", sub: "Read one customer", verb: "GET", to: "/customers/9" },
  { label: "destroy", sub: "Delete permanently", verb: "DELETE", to: "/customers/9/destroy" },
];
const diagnosticRows = [
  { label: "request id", value: "req_01HZXQ4M7T" },
  { label: "route", value: "/customers/9/edit" },
  { label: "session", value: "sess_8f2ad41c" },
];
const diagnosticProseRows = [
  { label: "what happened", value: "The record was locked by another editor." },
  { label: "who to ask", value: "support@domain.invalid" },
];

// A plain object rather than an Error instance: the formatter includes a stack trace in
// development builds, which would make these cards differ between the dev server and the
// published site. Shaped like the FetchError the server layer raises.
const conflictError = {
  name: "FetchError",
  message: "Request failed.",
  response: { status: 409, statusText: "Conflict" },
  responseData: { detail: "Customer 9 is locked by another editor until 14:05." },
};
const batchErrors = [
  conflictError,
  { name: "FetchError", message: "Request failed.", response: { status: 422, statusText: "Unprocessable Content" }, responseData: { detail: "Row 14 has no matching ledger account." } },
];
</script>

# System Views

Utility views that handle loading states and navigation dead ends. These are not linked to a specific model; they serve as default fallbacks when a route cannot be resolved or data is still in flight.

## ViewLoading

Route-level loading fallback. Composes `SystemMessageCard(tone="loading")` with the `loading` icon registry key, optional request identity in the crest kind, a skeleton preview, and a heartbeat strip. Once `slowAfterMs` is reached the card flips to warning tone and switches its crest icon name to `hourglass`.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewLoading: composed card with registry-backed crest icon</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip" style="min-height: 220px;">
    <ViewLoading
      name="Loading customer record"
      verb="GET"
      path="/crm/customers/42"
      context="Northwind Logistics"
      request-id="req-demo-42"
      :dependencies="{ resolved: 2, total: 5 }"
      :slow-after-ms="60000"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>layout: centers the shared <code>SystemMessageCard</code> in the route container</span>
    <span>normal crest icon: <code>icon-name="loading"</code>; slow crest icon: <code>icon-name="hourglass"</code></span>
    <span>customization: register those keys globally, or pass an <code>iconOverride</code> scoped to this view</span>
  </footer>
</VuedaDemo>

## ViewNotFound

Route-level 404 fallback. Composes `SystemMessageCard(tone="info")` with a "404" crest showing the typed path, a `TriedUrlCallout` whose bad segments are diff'd against the closest registered route, a `SuggestionList(shape="route")` listing N-best matches with similarity-score chips, a `DiagnosticStrip` debug footer (route by default; extend via the `diagnostics` prop), and a `Back` + `Go to home` actions row.

Suggestion data comes from `useSuggestRoutes({ limit })` (N-best matches with scores). The number of suggestions defaults to 5 and is configurable via the `suggestionLimit` prop. The home button navigates to `homePath` (default `/`). Both the `blurb` and `actions` slots accept overrides.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewNotFound — composed output (404 crest + tried path + suggestions + diagnostics)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info" icon-name="notFound">
      <template #crest-eyebrow>Route not found</template>
      <template #crest-kind>/admin/custmrs/99999/edit</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">No registered route matched this path. The closest matches in the router are listed below.</p>
      <TriedUrlCallout
        label="You tried"
        :segments="[
          { text: '/admin' },
          { text: '/custmrs', bad: true },
          { text: '/99999' },
          { text: '/edit' },
        ]"
      />
      <template #actions>
        <Button size="sm" emphasis="outline">Back</Button>
        <Button size="sm" tone="primary" class="ml-auto">Go to home</Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>composition: <code>SystemMessageCard</code> · <code>TriedUrlCallout</code> · <code>SuggestionList</code> (shape=route) · <code>DiagnosticStrip</code></span>
    <span>tried path: diff'd segment-by-segment against the top suggestion's normalized path; non-matching segments tint destructive</span>
    <span>diagnostics: route row by default; consumers append <code>request id</code> / <code>session</code> via the <code>diagnostics</code> prop</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key     | Element       | Default classes                                   |
| ------- | ------------- | ------------------------------------------------- |
| `root`  | Outer `<div>` | `flex min-h-full items-center justify-center p-8` |
| `blurb` | Default `<p>` | `text-[13px] leading-[1.5] text-muted-foreground` |

## ViewActionNotFound

Model-action 404 fallback. Composes `SystemMessageCard(tone="info")` with a "404" crest showing the `app/model/action` key (action segment tinted destructive in the callout), a `TriedUrlCallout` with label `Action key`, a `SuggestionList(shape="action")` listing all registered actions for the closest matching model sorted by similarity to the tried action, a `DiagnosticStrip` debug footer, and a `Back` + `Browse all actions` actions row.

Suggestions widen the previous closest-only behavior: every action on the closest model is rendered, sorted by `stringSimilarity` against the tried action name. HTTP verb chips in the action shape remain empty until the server exposes per-action verb metadata.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewActionNotFound — composed output (404 crest + action-key callout + available actions)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info" icon-name="actionNotFound">
      <template #crest-eyebrow>Action not found</template>
      <template #crest-kind>crm/customer/archve</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">No such action is registered for this model. The model's available actions are listed below.</p>
      <TriedUrlCallout
        label="Action key"
        :segments="[
          { text: 'crm' },
          { text: '/' },
          { text: 'customer' },
          { text: '/' },
          { text: 'archve', bad: true },
        ]"
      />
      <template #actions>
        <Button size="sm" emphasis="outline">Back</Button>
        <Button size="sm" tone="primary" class="ml-auto">Browse all actions</Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>composition: same chassis as <code>ViewNotFound</code>; the <code>SuggestionList</code> uses <code>shape="action"</code></span>
    <span>callout: only the action segment is tinted destructive; app and model are surfaced verbatim</span>
    <span>browse: navigates to the closest model's list route (<code>/{app}/{model}/list</code>); hidden when no model can be resolved</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key     | Element       | Default classes                                   |
| ------- | ------------- | ------------------------------------------------- |
| `root`  | Outer `<div>` | `flex min-h-full items-center justify-center p-8` |
| `blurb` | Default `<p>` | `text-[13px] leading-[1.5] text-muted-foreground` |

## SystemMessageCard

Centered 460 px card chassis shared by all four system views (NotFound, ActionNotFound, Loading, Deactivate) and by the AuthAndMFA card. Provides a tone-tracked 36 px crest icon tile above a border separator, a meta column (eyebrow label + mono kind text), an optional trailing status code, a body slot, and an optional actions footer.

The root carries `data-tone` and opens a `group/system-message-card` named scope. The `crestIcon` theme key routes soft tint colors (about 12 to 14 percent opacity) from that scope via `group-data-[tone=*]/system-message-card:` variants, so the icon resolved from `icon-name` inherits the tinted ink color automatically.

Set `icon-name` to a registry key to render the crest icon. Pass `icon-props` for per-call attributes or classes, and use `iconOverride` to replace the icon registry entry for this card and its descendants.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SystemMessageCard — info tone (404 route not found)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info" icon-name="notFound">
      <template #crest-eyebrow>route not found</template>
      <template #crest-kind>/admin/customers/99999/edit</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">The path <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">/admin/customers/99999/edit</code> does not match any registered route.</p>
      <template #actions>
        <Button size="sm" emphasis="outline">
          <FontAwesomeIcon :icon="faHouse" />
          Return to dashboard
        </Button>
        <Button size="sm" emphasis="ghost">
          <FontAwesomeIcon :icon="faSearch" />
          Did you mean /admin/customers/99999?
        </Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>tone: <code>info</code> — primary/blue soft tint on crest icon tile</span>
    <span>crest-code: optional trailing mono numeral (36 px / 600 / tabular-nums); omit the slot and it disappears</span>
    <span>actions slot: renders only when provided; omit and the footer disappears</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SystemMessageCard — warning tone (deactivate confirmation)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="warning" icon-name="warning">
      <template #crest-eyebrow>deactivate account</template>
      <template #crest-kind>mara.tani</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">This account will be suspended. All active sessions will end immediately.</p>
      <template #actions>
        <Button size="sm" emphasis="outline">Cancel</Button>
        <Button size="sm" tone="destructive">Deactivate</Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>tone: <code>warning</code> — amber soft tint on crest icon tile; no crest-code slot used</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key            | Element                      | Default classes                                                                                                                  |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `root`         | Card `<div>`                 | `max-w-[460px]` · flex column `gap-5` · `rounded-vueda-card border bg-card` · `px-8 pt-8 pb-7` · 1 px foreground/4 bottom shadow |
| `crest`        | Crest row `<div>`            | `flex items-start gap-3 pb-4 border-b border-border`                                                                             |
| `crestIcon`    | Icon tile `<div>`            | 36 px square · 4 px radius · 18 px icon · tone-tinted bg + ink via named group scope                                             |
| `crestMeta`    | Eyebrow + kind stack `<div>` | `flex flex-col justify-center gap-0.5 min-w-0 flex-1`                                                                            |
| `crestEyebrow` | Eyebrow `<span>`             | 10 px / 600 / uppercase / 0.06 em tracking · `text-muted-foreground`                                                             |
| `crestKind`    | Kind `<span>`                | mono 12 px / 500 · `text-foreground`                                                                                             |
| `crestCode`    | Trailing code `<span>`       | mono 36 px / 600 / tabular-nums · `text-foreground/50` · hidden when slot absent                                                 |
| `body`         | Body wrapper `<div>`         | `flex flex-col gap-3`                                                                                                            |
| `actions`      | Actions footer `<div>`       | `flex items-center gap-2` · hidden when slot absent                                                                              |

## ConsequencesBullets

Bulleted consequence list for destructive surfaces. Each row renders an optional leading icon, a bold label, and an optional muted description inside a 2-column grid (icon · label/sub stack). Per-row `tone` (`default` | `warn` | `danger`) tints only the leading icon via the `toneWarn` / `toneDanger` keys, so the list signals relative severity without overwhelming the surrounding card.

Icons resolve through `useIcons("ConsequencesBullets")`. Register a component under each icon name your messaging uses (or fall back to a `Default` registry entry). When the lookup misses, the icon cell still renders so labels stay aligned across rows.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ConsequencesBullets — self-destroy cascade</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4">
    <ConsequencesBullets
      :items="[
        { icon: 'shieldHalved', label: 'Sessions revoked', description: 'All sessions across devices end immediately.' },
        { icon: 'lifeRing', label: 'API tokens disabled', description: 'Personal access tokens stop authenticating.' },
        { icon: 'circle', label: 'Shared resources transfer', description: 'Owned records move to the team default owner.', tone: 'warn' },
        { icon: 'clock', label: 'After 30 days, irrecoverable', description: 'Account and history are purged.', tone: 'danger' },
      ]"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>row shape: <code>{ icon, label, description, tone }</code> — only <code>label</code> is required</span>
    <span>tone routing: <code>data-tone</code> on the row, <code>toneWarn</code> / <code>toneDanger</code> tint the icon wrapper</span>
    <span>icon lookup: <code>useIcons("ConsequencesBullets")(item.icon)</code> with fallback to the <code>Default</code> registry</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key           | Element                 | Default classes                                           |
| ------------- | ----------------------- | --------------------------------------------------------- |
| `root`        | `<ul>`                  | flex column, `gap-2`, list-reset                          |
| `item`        | `<li>` row              | `grid grid-cols-[18px_1fr] items-start gap-x-2.5`         |
| `icon`        | leading icon `<span>`   | 18 px square cell, 14 px glyph, `text-muted-foreground`   |
| `text`        | label/description stack | `flex flex-col gap-0.5 min-w-0`                           |
| `label`       | label `<span>`          | 13 px / 600 / `--foreground`                              |
| `description` | description `<span>`    | 11.5 px / 400 / `--muted-foreground`                      |
| `toneWarn`    | applied to icon wrapper | `text-warning` (active when `item.tone === "warn"`)       |
| `toneDanger`  | applied to icon wrapper | `text-destructive` (active when `item.tone === "danger"`) |

## ViewDeactivate

Self-service account deactivation view. Wraps the deactivate action in a `SystemMessageCard(tone="warning")` chassis: an icon crest identifies the action, an optional `ConsequencesBullets` list communicates the impact, and a `TypedConfirmField` gates the destructive button on the operator typing their own email address. Sends a PATCH to the model's `deactivate` endpoint on confirmation.

Props: `app` + `model` + `pk` (or array of PKs) identify the target. `consequences[]` forwards to `ConsequencesBullets`; when empty the bullet list is omitted. The `message` slot overrides the default suspension explanation paragraph.

The submit button stays disabled until `TypedConfirmField` emits a match and remains disabled while the request is in-flight. On success the component emits `success`. On a non-200 response an inline error paragraph appears.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewDeactivate — full composition (consequences + typed confirm)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="warning" icon-name="warning">
      <template #crest-eyebrow>account · deactivate</template>
      <template #crest-kind>myapp/account/deactivate</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">Your account will be suspended. Active sessions will end immediately, API tokens will be disabled, and shared resources will be reassigned. After 30 days this action is permanent.</p>
      <ConsequencesBullets
        :items="[
          { label: 'Sessions revoked', description: 'All active sessions across devices end immediately.' },
          { label: 'API tokens disabled', description: 'Personal access tokens stop authenticating.' },
          { label: 'Shared resources transfer', description: 'Owned records move to the team default owner.', tone: 'warn' },
          { label: 'After 30 days, irrecoverable', description: 'Account and history are permanently purged.', tone: 'danger' },
        ]"
      />
      <TypedConfirmField
        v-model="deactivateConfirm"
        expected-value="mara.tani@example.com"
        label-lead="Type your email address"
        label-tail="to confirm"
      />
      <template #actions>
        <Button size="sm" emphasis="outline">Cancel</Button>
        <Button size="sm" tone="destructive" :disabled="deactivateConfirm !== 'mara.tani@example.com'" class="ml-auto">Deactivate account</Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>consequences: forwarded to <code>ConsequencesBullets</code>; omit the prop (or pass an empty array) and the bullet section disappears</span>
    <span>typed confirm: expected value is <code>userStore.loggedInUser.email</code>; the field is omitted when the email is unavailable</span>
    <span>submit stays disabled until typed value matches and re-disables while the PATCH is in-flight</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key       | Element               | Default classes                                   |
| --------- | --------------------- | ------------------------------------------------- |
| `root`    | Outer `<div>`         | `flex min-h-full items-center justify-center p-8` |
| `message` | Default message `<p>` | `text-[13px] leading-[1.5] text-muted-foreground` |
| `error`   | Error `<p>`           | `text-[12px] text-destructive leading-[1.5]`      |

## TypedConfirmField

Anti-mistake confirmation primitive shared by destroy, deactivate, and recovery-code regenerate flows. The operator must type the exact `expectedValue` before the consumer's destructive button enables. The chrome is the canonical "type it to mean it" recipe: a bordered, muted-tinted box with a 12 px sans label, an inline mono chip showing the expected literal, and a 32 px mono input.

Consumers read the match state via `v-model:match` (or the `match` event) and gate their submit control on it. The raw typed value is exposed via `v-model` for callers that need to echo or inspect it.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TypedConfirmField — username self-destroy confirm</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4">
    <TypedConfirmField
      v-model="deactivateConfirm"
      expected-value="mara.tani"
      label-lead="Type your username"
      label-tail="to confirm"
    />
    <p class="mt-3 text-xs text-muted-foreground">
      typed: <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">{{ deactivateConfirm || "—" }}</code>
      · match: <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">{{ deactivateConfirm === "mara.tani" ? "true" : "false" }}</code>
    </p>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>label: <code>labelLead</code> + inline <code>&lt;code&gt;</code> chip (<code>expectedValue</code>) + <code>labelTail</code></span>
    <span>match: typed value equals <code>expectedValue</code> exactly (case- and whitespace-sensitive); root carries <code>data-match="true|false"</code></span>
    <span>input: <code>autocomplete="off"</code>, <code>spellcheck="false"</code>, mono 12.5 px, hairline + focus-ring on <code>:focus-visible</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TypedConfirmField — multi-record destroy phrase</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4">
    <TypedConfirmField
      v-model="destroyConfirm"
      expected-value="delete 3 customers"
      label-lead="Type"
      label-tail="to permanently delete the selected records"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>placeholder defaults to <code>expectedValue</code>; override via the <code>placeholder</code> prop when the phrase is too long to echo</span>
    <span>for fully-custom label markup, use the <code>label</code> slot (receives <code>expectedValue</code> and <code>chipClass</code> slot props)</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key            | Element              | Default classes                                                          |
| -------------- | -------------------- | ------------------------------------------------------------------------ |
| `root`         | Outer `<label>`      | muted-tinted box · rounded-vueda-card · 12 px gap-1.5 column             |
| `label`        | Label text `<span>`  | 12 px sans, foreground ink                                               |
| `expectedChip` | Inline `<code>` chip | mono 12 px semibold · rounded 3 px · border + background fill            |
| `input`        | Text `<input>`       | 32 px tall · mono 12.5 px · hairline + `focus-visible:focus-ring-shadow` |

## TriedUrlCallout

Bordered callout showing the URL path or action key the user attempted, with the bad segment tinted destructive. Used in `ViewNotFound` and `ViewActionNotFound` to ground the suggestion list visually rather than explaining the typo in prose.

The root is a 2-column grid: an 88 px uppercase eyebrow label column on the left, a 1fr mono value column on the right. The `segments` prop accepts a `{ text, bad? }[]` array; segments with `bad: true` receive `text-destructive`, while non-bad segments receive the `fade` theme key (muted-foreground by default) so the destructive segment reads as the error signal.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TriedUrlCallout — route path with typo segment</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4 flex flex-col gap-3">
    <TriedUrlCallout
      label="You tried"
      :segments="[
        { text: '/admin/' },
        { text: 'custommers', bad: true },
        { text: '/list' },
      ]"
    />
    <TriedUrlCallout
      label="Action key"
      :segments="[{ text: 'archve', bad: true }]"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>bad segment: receives hardcoded <code>text-destructive</code>; non-bad segments receive the <code>fade</code> theme key (<code>text-muted-foreground</code>)</span>
    <span>label defaults to "You tried"; override via the <code>label</code> prop</span>
    <span>consumers compute segment splits; pass the full path pre-split with the typo segment marked <code>bad: true</code></span>
  </footer>
</VuedaDemo>

### Customization surface

| Key     | Element                  | Default classes                                                         |
| ------- | ------------------------ | ----------------------------------------------------------------------- |
| `root`  | Outer `<div>`            | `grid grid-cols-[88px_1fr]` · `rounded-vueda-card border` · `px-3 py-2` |
| `label` | Label `<span>`           | 10 px / 600 / uppercase / 0.06 em tracking · `text-muted-foreground`    |
| `value` | Value wrapper `<span>`   | mono 12.5 px / 400 · `min-w-0 truncate`                                 |
| `fade`  | Non-bad segment `<span>` | `text-muted-foreground` — fades path so bad segments pop                |

## SuggestionList

`SuggestionList` is the "Did you mean?" list the 404 views compose. It takes a
head label, an optional mono source label, and a list of rows. Each row is a
four-column grid: icon, label with an optional sub-line, a trailing chip, and a
chevron. Two shapes decide what the trailing chip carries: `route` shows a
similarity score, `action` shows an HTTP verb.

Each row renders a `router-link`, so an application installs vue-router and these
navigate. This page has no router, so the rows below render the anchor a real
`RouterLink` would produce and swallow the click; hover and focus are otherwise
the real recipe.

Theme keys: {@api theme-key:SuggestionList}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title='shape="route"' description=" (similarity score chip)">
    <SuggestionList
      head="Did you mean"
      source="router.suggest()"
      shape="route"
      :items="routeSuggestions"
    />
    <template #footer>
      <span>the score chip formats a 0-to-1 similarity as a percentage; a row without <code>score</code> leaves the column empty</span>
      <span><code>sub</code> is the optional second line beneath the label</span>
    </template>
  </DemoCard>
  <DemoCard title='shape="action"' description=" (HTTP verb chip)">
    <SuggestionList head="Available actions" source="customer" shape="action" :items="actionSuggestions" />
    <template #footer>
      <span>the same rows with <code>shape="action"</code>: the trailing column carries <code>verb</code> instead of a score</span>
      <span>a verb chip states which method the action issues; it does not imply the reader may call it</span>
    </template>
  </DemoCard>
</VuedaDemo>

## DiagnosticStrip

`DiagnosticStrip` is the two-column definition list the system views put in their
footer, so an operator can copy the request id, route, and session into a ticket
rather than describing what they saw. Values render monospace by default because
they exist to be pasted somewhere else.

It presents whatever the view hands it. Nothing in the strip is fetched, and
nothing about it changes what the server did.

Theme keys: {@api theme-key:DiagnosticStrip}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="default" description=" (mono values)">
    <DiagnosticStrip :rows="diagnosticRows" />
    <template #footer>
      <span>each row is a <code>dt</code> and <code>dd</code> pair: a 10 px uppercase label against an 11 px value</span>
      <span>intended for the body slot of a <code>SystemMessageCard</code>, which is where the 404 views place it</span>
    </template>
  </DemoCard>
  <DemoCard title=':mono="false"' description=" (prose values)">
    <DiagnosticStrip :mono="false" :rows="diagnosticProseRows" />
    <template #footer>
      <span>turn mono off when the values are sentences rather than identifiers</span>
    </template>
  </DemoCard>
</VuedaDemo>

## ErrorDisplay

`ErrorDisplay` is the dismissible error card the view layer renders above a
failed surface. `ActionForm` mounts one for every submit, which is why a failed
save shows a card without the view doing anything. It takes an `errored` flag and
an `error`, and formats whatever it is given: an `Error`, a `FetchError` carrying
a response and server detail, an array of several, or a bare string.

It also reports each distinct error to Sentry once. That is part of its contract
rather than a side effect of these demos: no Sentry client is initialised for this
documentation site, so the calls below go nowhere.

Several error classes are deliberately ignorable, so a view can mount one card
and still let the surfaces that own those failures present them instead:
`ignore-form-validation-errors` for per-field validation that belongs on the
fields, `ignore-list-filter-errors` for filter errors that belong on the chip,
and `ignore-aborted-requests` for a request the user navigated away from.

Displaying an error changes nothing on the server. It reports what already
happened, and dismissing the card does not retry or undo it.

Theme keys: {@api theme-key:ErrorDisplay}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="server error" description=" (status, statusText, and server detail)">
    <ErrorDisplay :error="conflictError" :errored="true" while-text="saving the customer" />
    <template #footer>
      <span>the card leads with the <code>while-text</code>, so the reader learns what failed before how</span>
      <span>the formatter stacks name and message, then <code>response.status</code> and <code>statusText</code>, then <code>responseData.detail</code></span>
      <span>the underlying surface is an <code>Alert</code>, so a re-tone of the destructive tokens carries here</span>
    </template>
  </DemoCard>
  <DemoCard title="several errors at once">
    <ErrorDisplay :error="batchErrors" :errored="true" while-text="reconciling the batch" />
    <template #footer>
      <span>an array renders every entry in one card rather than stacking a card per error</span>
      <span>each distinct error reports once; a repeat of the same message is not re-reported</span>
    </template>
  </DemoCard>
  <DemoCard title="dismissible">
    <ErrorDisplay :dismissible="true" :error="conflictError" :errored="true" while-text="saving the customer" />
    <template #footer>
      <span><code>dismissible</code> adds an <code>AlertClose</code> and emits <code>dismiss-error</code>; the owning view decides what that clears</span>
      <span>dismissing is a presentation change only. The failed request is not retried.</span>
    </template>
  </DemoCard>
</VuedaDemo>
