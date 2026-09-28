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
const barPerPage = ref("25");
const widgetPage = ref(3);
const widgetPerPage = ref(25);
</script>

# Pagination

This page shows the {@term Visual Contract} of the pagination controls: page
primitives, the footer bar and its label, and the footer that list views
render. [Components](index.md) describes the rules every component page shares.
Breadcrumb, NavigationMenu, and Menubar are on [Navigation](./navigation.md).

## Primitives

{@api vue:component:Pagination} renders a `<nav>` landmark, and
{@api vue:component:PaginationContent} lays its controls out in one row. A
re-skin keeps these parts distinct:

- **Page items:** {@api vue:component:PaginationItem} renders one numbered page
  as a button. Inactive pages gain a fill and edge on hover. The current
  page keeps a foreground-colored edge at rest, so it stands apart from the
  navigation buttons. Its `size` prop takes the same tiers as
  {@api vue:component:Button}.
- **Navigation buttons:** {@api vue:component:PaginationFirst},
  {@api vue:component:PaginationPrevious}, {@api vue:component:PaginationNext},
  and {@api vue:component:PaginationLast} are icon-only outline squares on the
  compact control tier. First and Last use double-angle glyphs; Previous and
  Next use single chevrons. Each carries a screen-reader label.
- **Ellipsis:** {@api vue:component:PaginationEllipsis} marks omitted pages and
  carries a "More pages" screen-reader label.
- **Disabled:** a disabled control takes no pointer input. A disabled outline
  control keeps only its glyph or number.

Theme keys: {@api theme-key:Pagination}, {@api theme-key:PaginationContent},
{@api theme-key:PaginationItem}, {@api theme-key:NavigationPaginationNavButton},
{@api theme-key:PaginationEllipsis}. Control heights:
{@api css-token:vueda-control-height} and
{@api css-token:vueda-control-height-sm}.

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
  </DemoCard>
</VuedaDemo>

## Footer bar

{@api vue:component:PaginationBar} is the footer row that sits against the
bottom of a data surface, such as a grid or table. It draws a {@term Hairline}
top edge, the card surface, and bottom corners that match the card above it. It
spreads its contents to both ends of the row. You compose those contents in its
default slot.

{@api vue:component:PaginationMeta} is the count or page summary label. It
renders mono supporting text in the muted color.

Theme keys: {@api theme-key:NavigationPaginationBar},
{@api theme-key:PaginationMeta}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="PaginationMeta" description="(mono supporting-text summary)">
    <div class="flex flex-col gap-2">
      <PaginationMeta>142 invoices</PaginationMeta>
      <PaginationMeta>Showing 1 to 25 of 142 · Page 1 of 6</PaginationMeta>
    </div>
  </DemoCard>
  <DemoCard title="PaginationBar" description="(footer substrate seated against a data surface)">
    <div class="rounded-vueda-card hairline hairline-border bg-card overflow-clip">
      <div class="px-3 py-6 text-center text-sm text-muted-foreground">grid / table body</div>
      <PaginationBar>
        <PaginationMeta>Showing 1 to 25 of 142 · Page 1 of 6</PaginationMeta>
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
            Rows
            <NativeSelect v-model="barPerPage" :theme-override="{ NativeSelect: { root: { class: { 'w-full': false } } } }">
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
  </DemoCard>
</VuedaDemo>

## Composed footer

{@api vue:component:PaginationFooter} is the footer that
{@api vue:component:ViewList} and {@api vue:component:ViewHistoryList} render.
It fills a `PaginationBar` with two groups:

- **Start:** the "Showing X to Y of N" range read-out, with the figures
  emphasized against the muted label, then the rows-per-page selector.
- **End:** the navigation cluster: First, Previous, a mono "Page N of M"
  indicator, Next, and Last.

On a narrow viewport the groups wrap and center, with the read-out and selector
above the navigation cluster.

The **All** entry, last in the default options, loads every page. It hides the
navigation cluster, and the read-out changes to "All N results".
[List Preferences](../../guides/configure-crud-views.md#list-preferences)
describes how a list saves the chosen page size.

While [`loading`]{@api vue:component:PaginationFooter:prop:loading} is `true`,
the read-out is blank and the indicator shows "Page N of ?". The navigation
controls show their disabled state.

To replace the read-out or the selector, fill the
[`meta`]{@api vue:component:PaginationFooter:slot:meta} or
[`rows-per-page`]{@api vue:component:PaginationFooter:slot:rows-per-page} slot.
Setting
[`showTotalRecordNum`]{@api vue:component:PaginationFooter:prop:showTotalRecordNum}
to `false` hides the default read-out.

Theme key: {@api theme-key:PaginationFooter}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="PaginationFooter" description="(total=142, rows=25)">
    <PaginationFooter
      v-model:current-page="widgetPage"
      v-model:per-page="widgetPerPage"
      :total-records="142"
      :rows="25"
    />
  </DemoCard>
</VuedaDemo>
