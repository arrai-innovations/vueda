---
title: System Views
status: draft
audience: designer
type: reference
---

<script setup>
import { ref } from "vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import ConsequencesBullets from "@vueda/components/ConsequencesBullets.vue";
import SystemMessageCard from "@vueda/components/SystemMessageCard.vue";
import TypedConfirmField from "@vueda/components/TypedConfirmField.vue";
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faHouse,
    faSearch,
    faCircleQuestion,
    faTriangleExclamation,
    faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const deactivateConfirm = ref("");
const destroyConfirm = ref("");
</script>

# System Views

Utility views that handle loading states and navigation dead ends. These are not linked to a specific model; they serve as default fallbacks when a route cannot be resolved or data is still in flight.

## ViewLoading

Fills its container with a centered `LoadingSpinnerBlock`. The spinner itself is icon-driven: it renders the component registered under the `loading` icon key via `useIcons("LoadingSpinnerBlock")`. There are no theme keys on `ViewLoading` or `LoadingSpinnerBlock` — customization is through icon registration.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewLoading — full-container centered spinner</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip" style="min-height: 220px;">
    <div class="flex w-full h-full items-center justify-center" style="min-height: 220px;">
      <LoadingSpinnerBlock class="w-1/3 h-1/3" />
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>layout: <code>flex items-center justify-center w-full h-full</code> — fills whatever container the router mounts it in</span>
    <span>spinner: <code>LoadingSpinnerBlock</code> rendered at <code>w-1/3 h-1/3</code> of the container</span>
    <span>icon-driven: replace the spinner graphic by registering a component under the <code>loading</code> icon key via <code>useIcons</code></span>
  </footer>
</VuedaDemo>

## ViewNotFound

Route-level 404 fallback. Renders when the router cannot match a path. The default output is intentionally unstyled: a `div` wrapping an `h1` and a `p` element showing the unmatched path. If `useSuggestRoute()` returns a candidate, an optional "Did you mean?" router link is appended.

All visible surfaces are theme keys with no default classes, so the component inherits document styles out of the box and relies entirely on the designer to provide context-appropriate treatment.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewNotFound — bare default output (no theme classes applied)</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip p-6">
    <!-- mirrors the actual component output: div > h1 + p + optional a -->
    <div>
      <h1>Route Not Found</h1>
      <p>/admin/customers/99999/edit</p>
      <a href="#">Did you mean /admin/customers/99999?</a>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>theme keys: <code>root</code> (outer div), <code>title</code> (h1) — no defaults; both are clean slates</span>
    <span>"Did you mean?" link: rendered only when <code>useSuggestRoute()</code> returns a match; the path is the suggested route</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewNotFound — example styled treatment using design tokens</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Page not found">
      <template #button>
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faArrowLeft" />
          Go back
        </Button>
      </template>
    </PageTitle>
    <div class="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <FontAwesomeIcon :icon="faCircleQuestion" class="text-4xl text-muted-foreground/40" />
      <div>
        <p class="font-semibold text-foreground">This page could not be found</p>
        <p class="mt-1 text-sm text-muted-foreground">No route matched <code class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">/admin/customers/99999/edit</code></p>
      </div>
      <a href="#" class="flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
        <FontAwesomeIcon :icon="faSearch" class="text-xs" />
        Did you mean /admin/customers/99999?
      </a>
      <Button variant="outline" size="sm">
        <FontAwesomeIcon :icon="faHouse" />
        Return to dashboard
      </Button>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>this treatment is entirely from theme keys — the component ships with none of these classes by default</span>
    <span>root: center the body with <code>flex flex-col items-center justify-center gap-4</code>; title: <code>font-semibold</code></span>
    <span>decorative icon: <code>text-muted-foreground/40</code> — signals error state without competing with the message</span>
    <span>suggestion link: <code>text-primary underline-offset-4 hover:underline</code> — standard interactive link treatment</span>
  </footer>
</VuedaDemo>

### Customization surface

| Key     | Element     | Default classes |
| ------- | ----------- | --------------- |
| `root`  | Outer `div` | none            |
| `title` | `h1`        | none            |

## ViewActionNotFound

Model-action 404 fallback. Renders when a requested action cannot be resolved for a given `app`/`model` combination. The component uses `stringSimilarity` to find close matches in the registered action list and renders them as router links.

Like `ViewNotFound`, all surfaces are bare theme keys with no defaults.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewActionNotFound — bare default output (no theme classes applied)</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip p-6">
    <!-- mirrors actual component output: div > h1 + p + p + ul > li > a -->
    <div>
      <h1>Action Not Found</h1>
      <p>The action <strong>archve</strong> does not exist on <strong>customer</strong>.</p>
      <p>Did you mean one of these?</p>
      <ul>
        <li><a href="#">archive</a></li>
        <li><a href="#">activate</a></li>
      </ul>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>theme keys: <code>root</code>, <code>title</code>, <code>description</code>, <code>suggestions</code>, <code>link</code> — all clean slates</span>
    <span>suggestion list: rendered only when <code>stringSimilarity</code> finds matches above the threshold</span>
    <span><code>description</code> wraps the "does not exist" paragraph; <code>suggestions</code> wraps the "Did you mean" paragraph; <code>link</code> is on each <code>router-link</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewActionNotFound — example styled treatment using design tokens</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Action not found">
      <template #button>
        <Button size="sm" variant="ghost">
          <FontAwesomeIcon :icon="faArrowLeft" />
          Go back
        </Button>
      </template>
    </PageTitle>
    <div class="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <FontAwesomeIcon :icon="faTriangleExclamation" class="text-4xl text-muted-foreground/40" />
      <div>
        <p class="font-semibold text-foreground">Action not found</p>
        <p class="mt-1 text-sm text-muted-foreground">The action <code class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">archve</code> does not exist on <code class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">customer</code>.</p>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Did you mean one of these?</p>
        <ul class="mt-2 flex flex-col gap-1">
          <li>
            <a href="#" class="text-sm text-primary underline-offset-4 hover:underline">archive</a>
          </li>
          <li>
            <a href="#" class="text-sm text-primary underline-offset-4 hover:underline">activate</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>this treatment is entirely from theme keys — the component ships with none of these classes</span>
    <span>root: <code>flex flex-col items-center justify-center gap-4</code>; title: <code>font-semibold</code>; description: <code>text-sm text-muted-foreground</code></span>
    <span>suggestions heading: <code>text-xs font-semibold uppercase tracking-wide text-muted-foreground</code> applied via the <code>suggestions</code> key</span>
    <span>link: <code>text-sm text-primary underline-offset-4 hover:underline</code></span>
  </footer>
</VuedaDemo>

### Customization surface

| Key           | Element                      | Default classes |
| ------------- | ---------------------------- | --------------- |
| `root`        | Outer `div`                  | none            |
| `title`       | `h1`                         | none            |
| `description` | `p` (action/model text)      | none            |
| `suggestions` | `p` ("Did you mean")         | none            |
| `link`        | `router-link` per suggestion | none            |

## SystemMessageCard

Centered 460 px card chassis shared by all four system views (NotFound, ActionNotFound, Loading, Deactivate) and by the AuthAndMFA card. Provides a tone-tracked 36 px crest icon tile above a border separator, a meta column (eyebrow label + mono kind text), an optional trailing status code, a body slot, and an optional actions footer.

The root carries `data-tone` and opens a `group/system-message-card` named scope. The `crestIcon` theme key routes soft tint colors (`~12–14 %` opacity) from that scope via `group-data-[tone=*]/system-message-card:` variants, so any icon component placed in the `crest-icon` slot inherits the tinted ink color automatically.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SystemMessageCard — info tone (404 route not found)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info">
      <template #crest-icon>
        <FontAwesomeIcon :icon="faCircleQuestion" />
      </template>
      <template #crest-eyebrow>route not found</template>
      <template #crest-kind>/admin/customers/99999/edit</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">The path <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">/admin/customers/99999/edit</code> does not match any registered route.</p>
      <template #actions>
        <Button size="sm" variant="outline">
          <FontAwesomeIcon :icon="faHouse" />
          Return to dashboard
        </Button>
        <Button size="sm" variant="ghost">
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
    <SystemMessageCard tone="warning">
      <template #crest-icon>
        <FontAwesomeIcon :icon="faTriangleExclamation" />
      </template>
      <template #crest-eyebrow>deactivate account</template>
      <template #crest-kind>mara.tani</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">This account will be suspended. All active sessions will end immediately.</p>
      <template #actions>
        <Button size="sm" variant="outline">Cancel</Button>
        <Button size="sm" variant="destructive">Deactivate</Button>
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
  <div class="rounded-vueda-card border border-border bg-card p-4">
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

Wraps `ModelActionForm` with `action="deactivate"` pre-set. It does not add any of its own layout or theme keys; the rendered output is the standard action form for the deactivate action. Tone, banner text, and field layout follow the same patterns documented in [Action & Workflow Views](/reference/components/action-workflow).

To style the deactivation confirmation form, apply theme keys to the underlying `ModelActionForm` family rather than to `ViewDeactivate` directly.

## TypedConfirmField

Anti-mistake confirmation primitive shared by destroy, deactivate, and recovery-code regenerate flows. The operator must type the exact `expectedValue` before the consumer's destructive button enables. The chrome is the canonical "type it to mean it" recipe: a bordered, muted-tinted box with a 12 px sans label, an inline mono chip showing the expected literal, and a 32 px mono input.

Consumers read the match state via `v-model:match` (or the `match` event) and gate their submit control on it. The raw typed value is exposed via `v-model` for callers that need to echo or inspect it.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TypedConfirmField — username self-destroy confirm</header>
  <div class="rounded-vueda-card border border-border bg-card p-4">
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
  <div class="rounded-vueda-card border border-border bg-card p-4">
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
