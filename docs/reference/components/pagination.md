---
title: Pagination
status: draft
audience: designer
type: reference
---

<script setup>
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationBar from "@vueda/navigation/pagination/PaginationBar.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationEllipsis from "@vueda/navigation/pagination/PaginationEllipsis.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationItem from "@vueda/navigation/pagination/PaginationItem.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationMeta from "@vueda/navigation/pagination/PaginationMeta.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";
import PaginationFooter from "@vueda/navigation/pagination/PaginationFooter.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import { ref } from "vue";

const barPage = ref(1);
const widgetPage = ref(3);
const widgetPerPage = ref(25);
</script>

# Pagination

The pagination family covers everything that moves a user through a paged result set: the
headless Reka-based primitives (`Pagination`, `PaginationContent`, the First/Previous/Next/Last
nav buttons, numbered `PaginationItem`s, and `PaginationEllipsis`), the VUEDA-original footer
pieces (`PaginationBar`, `PaginationMeta`), and the composed {@api vue:component:PaginationFooter}
widget that data views render. All share the same 32px control sizing baseline
({@api css-token:vueda-control-height}) and focus treatment as the rest of the navigation family.

This page is the visual contract the default theme guarantees. Use it as the target spec when you
re-skin: every cell shown here should still read as the same control after a customization. If a
cell breaks, the change has crossed from skin into design language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). In brief: values belong
in [CSS tokens](../theming/tokens.md); compositions belong in [theme keys](../theming/keys.md).

The other navigation primitives (Breadcrumb, NavigationMenu, Menubar) live on the
[Navigation](./navigation.md) page.

## Primitives

Pagination renders a `<nav>` landmark with Previous/Next navigation buttons and numbered page
items. Page items compose from `_ButtonGhost` (inactive) or `_ButtonOutline` (active).
The active page keeps a foreground-colored edge at rest, distinct from the lighter navigation
button outlines. Disabled items drop their edges along with the navigation buttons.
Page items default to 32px squares; their `size` prop supports the same tiers as `Button`.
Navigation buttons compose from `_ButtonOutline` and render icon-only as compact (sm) squares.
First and Last use double-angle glyphs to set them apart from the single-chevron Previous and
Next; each carries an `sr-only` label so the control keeps an accessible name.

Theme keys: {@api theme-key:Pagination}, {@api theme-key:PaginationContent},
{@api theme-key:PaginationItem}, {@api theme-key:NavigationPaginationNavButton},
{@api theme-key:PaginationEllipsis}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="default" description="(sibling-count=1, page 5 of 10)">
    <Pagination v-slot="{ page }" :total="100" :items-per-page="10" :sibling-count="1" :default-page="5">
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else-if="item.type === 'ellipsis'" />
        </template>
        <PaginationNext />
      </PaginationContent>
    </Pagination>
    <template #footer>
      <span>current page: persistent foreground edge; inactive pages have no edge</span>
      <span>inactive items compose <code>_ButtonGhost</code></span>
      <span>nav buttons: icon-only, outline, sm square</span>
    </template>
  </DemoCard>
  <DemoCard title="show-edges" description="(first/last buttons + edge page numbers)">
    <Pagination v-slot="{ page }" :total="100" :items-per-page="10" :sibling-count="1" :default-page="5" :show-edges="true">
      <PaginationContent v-slot="{ items }">
        <PaginationFirst />
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else-if="item.type === 'ellipsis'" />
        </template>
        <PaginationNext />
        <PaginationLast />
      </PaginationContent>
    </Pagination>
    <template #footer>
      <span>PaginationFirst / PaginationLast share NavigationPaginationNavButton key</span>
      <span>show-edges always includes page 1 and last page in the number list</span>
    </template>
  </DemoCard>
  <DemoCard title="at the first page" description="(show-edges, page 1 of 10)">
    <Pagination v-slot="{ page }" :total="100" :items-per-page="10" :sibling-count="1" :default-page="1" :show-edges="true">
      <PaginationContent v-slot="{ items }">
        <PaginationFirst />
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else-if="item.type === 'ellipsis'" />
        </template>
        <PaginationNext />
        <PaginationLast />
      </PaginationContent>
    </Pagination>
    <template #footer>
      <span>the ordinary mixed state: first and previous cannot act, next and last can</span>
      <span>a disabled outline cell drops its edge and micro-shadow entirely, so the cluster shows which controls still act without reading their glyphs</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled">
    <Pagination v-slot="{ page }" :total="100" :items-per-page="10" :sibling-count="1" :default-page="5" disabled>
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else-if="item.type === 'ellipsis'" />
        </template>
        <PaginationNext />
      </PaginationContent>
    </Pagination>
    <template #footer>
      <span>disabled: <code>pointer-events-none</code> on every item, and each cell takes its own disabled surface rather than a uniform alpha</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Footer chrome

`PaginationBar` is the footer row that seats against the bottom of a data surface (a grid or
table). It supplies the `border-t`, card surface, bottom card-radius caps, and a `justify-between`
flex row, then exposes a default slot. `PaginationMeta` is the mono supporting-text label for the
count or page summary that sits at one end. Consumers compose the meta label, an optional
rows-per-page selector, and a `Pagination` control inside the bar.

Theme keys: {@api theme-key:NavigationPaginationBar}, {@api theme-key:PaginationMeta}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="PaginationMeta" description="(mono supporting-text summary)">
    <div class="flex flex-col gap-2">
      <PaginationMeta>142 invoices</PaginationMeta>
      <PaginationMeta>1–25 of 142 · page 1 of 6</PaginationMeta>
    </div>
    <template #footer>
      <span>mono, <code>--vueda-text-supporting</code>, <code>--muted-foreground</code></span>
      <span>positional read-outs are mono per the type rules</span>
    </template>
  </DemoCard>
  <DemoCard title="PaginationBar" description="(footer substrate seated against a data surface)">
    <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
      <div class="px-3 py-6 text-center text-sm text-muted-foreground">grid / table body</div>
      <PaginationBar>
        <PaginationMeta>1–25 of 142 · page 1 of 6</PaginationMeta>
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
            Rows
            <NativeSelect class="w-auto">
              <NativeSelectOption value="10">10</NativeSelectOption>
              <NativeSelectOption value="25">25</NativeSelectOption>
              <NativeSelectOption value="50">50</NativeSelectOption>
              <NativeSelectOption value="100">100</NativeSelectOption>
            </NativeSelect>
          </span>
          <Pagination v-model:page="barPage" :total="142" :items-per-page="25">
            <PaginationContent>
              <PaginationFirst />
              <PaginationPrevious />
              <PaginationNext />
              <PaginationLast />
            </PaginationContent>
          </Pagination>
        </div>
      </PaginationBar>
    </div>
    <template #footer>
      <span>bar: border-t, bg-card, rounded-b-vueda-card, justify-between</span>
      <span>meta sits left; rows-per-page selector + Pagination sit right</span>
      <span>the bar is a slot container — consumers compose its contents</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Composed widget

{@api vue:component:PaginationFooter} is the higher-level widget that data views (`ViewList`,
`ViewHistoryList`) render. It composes the `PaginationBar` substrate into a complete footer: a
"Showing X to Y of N" range read-out (`PaginationMeta`) at the start, then a rows-per-page selector
and the navigation cluster (first/previous, a mono "Page N of M" indicator, next/last) at the end.
The selector's final **All** entry loads every page at once and hides the navigation cluster.

Theme keys: {@api theme-key:PaginationFooter}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="PaginationFooter" description="(total=142, rows=25)">
    <PaginationFooter
      v-model:current-page="widgetPage"
      v-model:per-page="widgetPerPage"
      :total-records="142"
      :rows="25"
    />
    <template #footer>
      <span>start: "Showing X to Y of N" range read-out (mono)</span>
      <span>end: rows-per-page selector (All loads every page) + first/previous + "Page N of M" + next/last</span>
      <span>selecting All hides the navigation cluster</span>
    </template>
  </DemoCard>
</VuedaDemo>
