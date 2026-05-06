---
title: System Views
status: draft
audience: designer
type: reference
---

<script setup>
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faHouse,
    faSearch,
    faCircleQuestion,
    faTriangleExclamation,
    faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
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

## ViewDeactivate

Wraps `ModelActionForm` with `action="deactivate"` pre-set. It does not add any of its own layout or theme keys; the rendered output is the standard action form for the deactivate action. Tone, banner text, and field layout follow the same patterns documented in [Action & Workflow Views](/reference/components/action-workflow).

To style the deactivation confirmation form, apply theme keys to the underlying `ModelActionForm` family rather than to `ViewDeactivate` directly.
