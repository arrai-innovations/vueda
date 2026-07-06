---
title: Sticky Chrome
status: draft
audience: designer
type: reference
---

<script setup>
import StickyBar from "@vueda/shell/sticky/StickyBar.vue";
import Button from "@vueda/controls/button/Button.vue";
import Input from "@vueda/controls/input/Input.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import Textarea from "@vueda/controls/textarea/Textarea.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faCheck, faFilter, faChevronDown, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { ref } from "vue";

// The live StickyBar demo binds its scroll-root to its own bounded, scrollable
// panel so the bar pins to and reacts to the demo viewport instead of the page
// (otherwise it would stick to the window and ride up over the site nav).
const stickyViewport = ref(null);
</script>

# Sticky Chrome

Page chrome (the title, a filter toolbar, a submit bar, a pagination footer) is most useful exactly when a list or form is long enough to scroll it out of view. VUEDA's sticky-chrome family pins that chrome to the top or bottom of the viewport on one principle: **only context is permanently pinned; actions are revealed on intent.** The title stays put because it answers "where am I." A filter toolbar hides while you scroll down to read and slides back when you scroll up to act. A submit bar comes back the moment you pause. Each bar runs on its own schedule, so adding chrome never grows a permanent fixed budget that eats the viewport.

The family has four parts:

| Part                           | Role                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **StickyStackProvider**        | Shell-level. The integrator wraps the scrolling region with it once; it owns the top and bottom sticky zones.   |
| **StickyChrome**               | View-level. Teleports a view's chrome into a zone at a given order and reveal behavior.                         |
| **useStickyStack**             | The context behind the two, mirroring `usePageTitle` (provider role establishes it, view role registers a bar). |
| {@api vue:component:StickyBar} | The bar primitive: a themed, scroll-aware container. Usable standalone or as a zone-managed bar.                |

This page is the visual and behavioral contract for that family. For where it sits in the z-index/stacking scale, see the default theme canon (`client/lib/theme/vueda-tailwind/README.md`, § 5.1) and the integrator-facing [Reserved z-index bands](../../core-concepts/theming-and-customization.md#reserved-z-index-bands).

## The model: zones, a stack, independent reveal

`StickyStackProvider` wraps the scrolling region and renders two zones: a **top zone** (`sticky top-0`) and a **bottom zone** (`sticky bottom-0`). The window keeps scrolling; the provider adds no `overflow` and establishes no inner scroll container. Its job is structure, the zone context, and one measurement (below), not scroll ownership.

Within a zone, bars form an ordered **stack**. Each bar is an independent sticky element with its own reveal behavior, so the title can stay pinned while a toolbar beneath it hides and reveals on its own. There is no height math across the layout boundary: the provider measures the visible bars and gives each one its sticky offset (the cumulative height of the visible bars between it and the edge), then hides a bar with a transform that also compacts the survivors. The relevant detail for a re-skin is that **nothing in a zone needs a hand-set `top` offset**: the stack computes it.

::: info Demo status
The provider is **window-scroll-only by design** (no `scrollRoot`, and it warns when an ancestor sets a non-visible `overflow` that would break window-relative sticky). That makes its reveal-and-compact behavior impossible to show faithfully inside a bounded documentation card without the bars pinning over the site nav. The provider and stack below are therefore **static illustrations**; the one live, interactive demo on this page is the standalone `StickyBar`. To see the full stack in motion, wire `StickyStackProvider` into a running shell (see [Integration](#integration)).
:::

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">stack model · static illustration · top zone has two bars, bottom zone has one</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
    <div class="flex items-center justify-between gap-3 border-b-hairline px-4 py-3">
      <span class="text-[22px] font-semibold leading-none">Customers</span>
      <span class="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">order 0 · reveal always</span>
    </div>
    <div class="flex items-center justify-between gap-3 border-b-hairline bg-muted/30 px-4 py-2">
      <Button size="sm" emphasis="outline">
        <FontAwesomeIcon :icon="faFilter" />
        Filters
        <FontAwesomeIcon :icon="faChevronDown" class="size-2.5 text-muted-foreground" />
      </Button>
      <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">order 10 · reveal scroll-up</span>
    </div>
    <div class="flex flex-col gap-2 px-4 py-6 text-sm text-muted-foreground">
      <span>Scrolling content (the routed view) sits between the two zones.</span>
      <span>As it scrolls down, the toolbar (scroll-up) slides up behind the pinned title; the title (always) stays.</span>
      <span>The pagination footer pins to the bottom of the viewport the whole time.</span>
    </div>
    <div class="flex items-center justify-between gap-3 border-t-hairline bg-muted/30 px-4 py-2">
      <span class="flex items-center gap-1">
        <Button size="icon-sm" emphasis="outline" aria-label="Previous page"><FontAwesomeIcon :icon="faChevronLeft" /></Button>
        <span class="px-2 text-xs font-medium text-foreground">Page 1 of 36</span>
        <Button size="icon-sm" emphasis="outline" aria-label="Next page"><FontAwesomeIcon :icon="faChevronRight" /></Button>
      </span>
      <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">bottom zone · order 0 · reveal always</span>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>top zone: page title (always) + filter toolbar (scroll-up), stacked by order</span>
    <span>bottom zone: pagination footer (always)</span>
    <span>each bar reveals on its own schedule; the provider computes every sticky offset from measured heights</span>
  </footer>
</VuedaDemo>

## Reveal behavior

A bar's `reveal` decides when it hides as the user scrolls. It is a strategy string or a boolean (so a bulk-action bar can reveal only while a selection exists):

| `reveal`            | Behavior                                                                                                  | Typical bar                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `always`            | Never hides. Stays pinned regardless of scroll.                                                           | Page title, pagination footer |
| `scroll-up`         | Hides once its original position scrolls out of view; reappears only on scroll up. No idle reveal.        | Filter / sort toolbar         |
| `scroll-up-or-idle` | Like `scroll-up`, but also reappears after scrolling pauses (default 300 ms).                             | Form submit / transition bar  |
| `true` / `false`    | Revealed when truthy. Drive it with a getter for bespoke logic (for example, a selection-gated bulk bar). | Bulk-action strip             |

The split is the principle in practice: context bars (`always`) never move; the toolbar reclaims space while reading (`scroll-up`) without popping back when you pause; the submit bar comes back fast on a pause (`scroll-up-or-idle`) because you return to it often.

::: tip Conditionally present bars belong in the bottom zone
A bar that appears only in a certain state (a bulk-action strip gated on a row selection, for example) adds and removes a box from the document every time that state flips. Where that box enters flow decides whether the user sees a jump.

In the **top zone** the box appears above the content being read, so it pushes the whole view down: selecting the first row shoves the grid by the bar's height. In the **bottom zone** the box grows the document at the bottom, below the reading position, so the same change reads as a small scrollbar adjustment instead of a shove (unless the user is already scrolled to the very end).

So gate a conditional bar with `v-if` and place it in the bottom zone with `reveal="always"`. `ViewList`'s bulk-action bar does exactly this, stacking just above the pagination footer. A boolean `reveal` that keeps the bar mounted and slides it out of view also avoids the jump, but it permanently reserves the bar's height even when nothing is selected, which the density canon would rather spend on data.
:::

## StickyBar

{@api vue:component:StickyBar} is the bar primitive. It wraps its default slot in a themed container and, on its own, hides when the user scrolls down past its initial position and reappears when they scroll back up. It has two modes:

- **Standalone** (no `zone`): the bar self-sticks to the window, or to the element passed as `scrollRoot` when it lives inside a scrollable region. Default reveal is `scroll-up-or-idle`. This is the mode the live demo below uses.
- **Zone-managed** (`zone="top"` / `"bottom"` plus `order` and `reveal`): the bar teleports its surface into a `StickyStackProvider` zone and hands positioning and reveal to the stack, so it stacks with the page title and other chrome instead of self-sticking. In this mode it renders only its inner surface; the zone provides the sticky wrapper.

The demo binds `scrollRoot` to the bounded panel, so the bar treats the panel as its page. Scroll inside the panel to see it hide on the way down and reappear on the way up.

Theme keys: {@api theme-key:StickyBar}.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">sticky bar · standalone · submit pattern</header>
  <ClientOnly>
    <div ref="stickyViewport" class="rounded-vueda-card hairline hairline-border bg-card overflow-y-auto max-h-[20rem]">
      <StickyBar :scroll-root="stickyViewport">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Button tone="primary">
              <FontAwesomeIcon :icon="faCheck" />
              Create customer
            </Button>
            <Button emphasis="outline">Save and add another</Button>
          </div>
          <span class="text-xs text-muted-foreground">All required fields marked <span class="text-destructive">*</span></span>
        </div>
      </StickyBar>
      <div class="px-6 py-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field orientation="vertical">
            <FieldLabel for="sc-name">Account name <span aria-hidden="true" class="text-destructive">*</span></FieldLabel>
            <FieldContent>
              <Input id="sc-name" placeholder="Granger Holdings" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-domain">Primary domain</FieldLabel>
            <FieldContent>
              <Input id="sc-domain" placeholder="example.com" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-owner">Owner <span aria-hidden="true" class="text-destructive">*</span></FieldLabel>
            <FieldContent>
              <NativeSelect id="sc-owner">
                <NativeSelectOption value="">— select —</NativeSelectOption>
                <NativeSelectOption value="mt">Mara Tani</NativeSelectOption>
                <NativeSelectOption value="jr">Jordan Reyes</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-tier">Plan tier</FieldLabel>
            <FieldContent>
              <NativeSelect id="sc-tier">
                <NativeSelectOption value="trial">Trial</NativeSelectOption>
                <NativeSelectOption value="standard" selected>Standard</NativeSelectOption>
                <NativeSelectOption value="enterprise">Enterprise</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-billing-email">Billing email</FieldLabel>
            <FieldContent>
              <Input id="sc-billing-email" type="email" placeholder="ar@example.com" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-currency">Currency</FieldLabel>
            <FieldContent>
              <NativeSelect id="sc-currency">
                <NativeSelectOption value="usd">USD</NativeSelectOption>
                <NativeSelectOption value="eur">EUR</NativeSelectOption>
                <NativeSelectOption value="gbp">GBP</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-tax">Tax ID</FieldLabel>
            <FieldContent>
              <Input id="sc-tax" placeholder="Optional" />
            </FieldContent>
          </Field>
          <Field orientation="vertical">
            <FieldLabel for="sc-phone">Billing phone</FieldLabel>
            <FieldContent>
              <Input id="sc-phone" type="tel" placeholder="Optional" />
            </FieldContent>
          </Field>
          <Field orientation="vertical" class="sm:col-span-2">
            <FieldLabel for="sc-notes">Notes</FieldLabel>
            <FieldContent>
              <Textarea id="sc-notes" placeholder="Internal notes visible only to staff." rows="3" />
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>
  </ClientOnly>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>StickyBar default slot: free-form layout, usually a flex row of actions</span>
    <span>theme key: <code>StickyBar.inner</code> for bar chrome (background, border, padding)</span>
    <span>standalone mode binds <code>scrollRoot</code> to this panel; scroll inside it to see the bar hide on the way down and reappear on the way up</span>
  </footer>
</VuedaDemo>

## Integration

An integrator opts in by placing the provider around the routed content once, with the page title in its `top` slot:

```vue
<StickyStackProvider>
    <template #top>
        <PageTitle />
    </template>

    <RouterView />

    <!-- Optional pinned bottom chrome owned by the shell goes in #bottom. -->
</StickyStackProvider>
```

`PageTitle` in the `top` slot becomes the always-pinned first bar of the top stack. Each view then teleports its own chrome into a zone with `StickyChrome` (or a zone-managed `StickyBar`), choosing an `order` and `reveal`:

```vue
<!-- Inside a list view -->
<StickyChrome zone="top" :order="10" reveal="scroll-up">
    <ListToolbar />
</StickyChrome>
<StickyChrome zone="bottom" reveal="always">
    <PaginationFooter />
</StickyChrome>
```

`StickyChrome` degrades gracefully: with no provider above it, the chrome renders inline where it sits, so a view used outside a provider still works (it just is not pinned).

Two integration rules:

- **No `overflow` between the provider and the window.** Because the window scrolls, any ancestor with `overflow` set to `auto`, `scroll`, `hidden`, or `clip` would capture the sticky and break it. The provider warns in development when it detects such an ancestor and names it. The default shell (`SidebarProvider` / `SidebarInset`) already satisfies this.
- **Keep custom chrome out of the `30` to `39` z-band.** That band belongs to the sticky stack. Prefer joining the stack over hand-rolling a sticky element at a competing z-index. See [Reserved z-index bands](../../core-concepts/theming-and-customization.md#reserved-z-index-bands).

## Customization surface

- {@api theme-key:StickyBar} — `root`, `inner`. Override `inner` to add a border, change the background, or adjust padding. To retint the bar from a wrapper, set the `--vueda-sticky-bar-surface` custom property instead of painting a competing background.
- {@api theme-key:PageTitle} — the title bar that sits in the provider's `top` slot. Setting its `sticky` prop is unnecessary inside a provider, which owns the pinning; see [CRUDL Views](./views-crudl.md#pagetitle).
- **`--vueda-sticky-stack-top`** — the provider publishes the visible top-stack height as this custom property so a sticky table header can offset against it. It is framework-internal; integrators do not set it.
- **z-index** — the stack lives in the `30` to `39` band. The full scale and rules are in the default theme canon, § 5.1.
