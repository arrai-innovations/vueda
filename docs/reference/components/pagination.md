---
title: Pagination
status: draft
audience: designer
type: reference
---

<script setup>
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationEllipsis from "@vueda/navigation/pagination/PaginationEllipsis.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationItem from "@vueda/navigation/pagination/PaginationItem.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";
</script>

# Pagination

The pagination family covers everything that moves a user through a paged result set: the
headless Reka-based primitives (`Pagination`, `PaginationContent`, the First/Previous/Next/Last
nav buttons, numbered `PaginationItem`s, and `PaginationEllipsis`), the VUEDA-original footer
pieces (`PaginationBar`, `PaginationMeta`), and the composed {@api vue:component:PaginationComponent}
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
Navigation buttons compose from `_ButtonGhost` and show a text label (`Previous` / `Next`)
visible at the `sm` breakpoint and above.

Theme keys: {@api theme-key:Pagination}, {@api theme-key:PaginationContent},
{@api theme-key:PaginationItem}, {@api theme-key:NavigationPaginationNavButton},
{@api theme-key:PaginationEllipsis}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="default" description="(sibling-count=1, page 5 of 10)">
    <Pagination :total="100" :items-per-page="10" :sibling-count="1" :default-page="5">
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === 5">
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else-if="item.type === 'ellipsis'" />
        </template>
        <PaginationNext />
      </PaginationContent>
    </Pagination>
    <template #footer>
      <span>active item composes <code>_ButtonOutline</code></span>
      <span>inactive items compose <code>_ButtonGhost</code></span>
      <span>nav buttons: gap-1, px-2.5, show label at sm+</span>
    </template>
  </DemoCard>
  <DemoCard title="show-edges" description="(first/last buttons + edge page numbers)">
    <Pagination :total="100" :items-per-page="10" :sibling-count="1" :default-page="5" :show-edges="true">
      <PaginationContent v-slot="{ items }">
        <PaginationFirst />
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === 5">
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
  <DemoCard title="disabled">
    <Pagination :total="100" :items-per-page="10" :sibling-count="1" :default-page="5" disabled>
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious />
        <template v-for="(item, idx) in items" :key="idx">
          <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === 5">
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else-if="item.type === 'ellipsis'" />
        </template>
        <PaginationNext />
      </PaginationContent>
    </Pagination>
    <template #footer>
      <span>disabled: pointer-events-none, opacity-50 on all items</span>
    </template>
  </DemoCard>
</VuedaDemo>
