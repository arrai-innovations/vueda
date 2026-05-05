---
title: Navigation
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Breadcrumb from "@vueda/navigation/breadcrumb/Breadcrumb.vue";
import BreadcrumbEllipsis from "@vueda/navigation/breadcrumb/BreadcrumbEllipsis.vue";
import BreadcrumbItem from "@vueda/navigation/breadcrumb/BreadcrumbItem.vue";
import BreadcrumbLink from "@vueda/navigation/breadcrumb/BreadcrumbLink.vue";
import BreadcrumbList from "@vueda/navigation/breadcrumb/BreadcrumbList.vue";
import BreadcrumbPage from "@vueda/navigation/breadcrumb/BreadcrumbPage.vue";
import BreadcrumbSeparator from "@vueda/navigation/breadcrumb/BreadcrumbSeparator.vue";
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationEllipsis from "@vueda/navigation/pagination/PaginationEllipsis.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationItem from "@vueda/navigation/pagination/PaginationItem.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";
import NavigationMenu from "@vueda/navigation/menu/NavigationMenu.vue";
import NavigationMenuItem from "@vueda/navigation/menu/NavigationMenuItem.vue";
import NavigationMenuList from "@vueda/navigation/menu/NavigationMenuList.vue";
import NavigationMenuTrigger from "@vueda/navigation/menu/NavigationMenuTrigger.vue";
import Menubar from "@vueda/navigation/menubar/Menubar.vue";
import MenubarMenu from "@vueda/navigation/menubar/MenubarMenu.vue";
import MenubarTrigger from "@vueda/navigation/menubar/MenubarTrigger.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faCheck, faCircle } from "@fortawesome/free-solid-svg-icons";
</script>

# Navigation

The navigation family covers wayfinding primitives: Breadcrumb trails, Pagination controls,
NavigationMenu flyout menus, and Menubar application menus. All share the same 32px control
sizing baseline ({@api css-token:vueda-control-height}) and focus treatment.

This page is the visual contract the default theme guarantees. Use it as the target spec when
you re-skin: every cell shown here should still read as the same control after a customization.
If a cell breaks, the change has crossed from skin into design language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). In brief: values
belong in [CSS tokens](../theming/tokens.md); compositions belong in
[theme keys](../theming/keys.md).

NavigationMenu and Menubar "open content" cells below are static anatomy panels rendered with
the same Tailwind classes the theme keys produce, avoiding portal-positioning constraints inside
the docs grid. Trigger cells are live components.

## Breadcrumb

Breadcrumb renders a `<nav>` landmark containing an ordered list of location segments. The
separator defaults to `/`; any slot content replaces it. BreadcrumbEllipsis collapses deep
trails into a size-9 click target with a screen-reader label.

Theme keys: {@api theme-key:BreadcrumbList}, {@api theme-key:BreadcrumbItem},
{@api theme-key:BreadcrumbLink}, {@api theme-key:BreadcrumbPage},
{@api theme-key:BreadcrumbSeparator}, {@api theme-key:BreadcrumbEllipsis}.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      anatomy
    </header>
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Clients</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Acme Corp</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Invoice #1042</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Invoice #1042</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">list: flex-wrap, gap-1.5 sm:gap-2.5, text-sm</span>
      <span class="whitespace-nowrap">separator: svg size-3.5</span>
      <span class="whitespace-nowrap">ellipsis: size-9 click target</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      link states
    </header>
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">default</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <ForceState state="hover">
            <BreadcrumbLink href="#">hover</BreadcrumbLink>
          </ForceState>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <ForceState state="focus">
            <BreadcrumbLink href="#">focus</BreadcrumbLink>
          </ForceState>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>current page</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">link fg <code>--muted-foreground</code></span>
      <span class="whitespace-nowrap">link hover fg <code>--foreground</code></span>
      <span class="whitespace-nowrap">page: font-normal, fg <code>--foreground</code></span>
      <span class="whitespace-nowrap">page: aria-current="page", aria-disabled</span>
    </footer>
  </section>
</div>

## Pagination

Pagination renders a `<nav>` landmark with Previous/Next navigation buttons and numbered page
items. Page items compose from `_ButtonGhost` (inactive) or `_ButtonOutline` (active).
Navigation buttons compose from `_ButtonGhost` and show a text label (`Previous` / `Next`)
visible at the `sm` breakpoint and above.

Theme keys: {@api theme-key:Pagination}, {@api theme-key:PaginationContent},
{@api theme-key:PaginationItem}, {@api theme-key:NavigationPaginationNavButton},
{@api theme-key:PaginationEllipsis}.

<div class="not-prose grid gap-6">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      default <span class="font-normal normal-case">(sibling-count=1, page 5 of 10)</span>
    </header>
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
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">active item composes <code>_ButtonOutline</code></span>
      <span class="whitespace-nowrap">inactive items compose <code>_ButtonGhost</code></span>
      <span class="whitespace-nowrap">nav buttons: gap-1, px-2.5, show label at sm+</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      show-edges <span class="font-normal normal-case">(first/last buttons + edge page numbers)</span>
    </header>
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
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">PaginationFirst / PaginationLast share NavigationPaginationNavButton key</span>
      <span class="whitespace-nowrap">show-edges always includes page 1 and last page in the number list</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      disabled
    </header>
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
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">disabled: pointer-events-none, opacity-50 on all items</span>
    </footer>
  </section>
</div>

## NavigationMenu

NavigationMenu renders a horizontal list of triggers that open flyout content panels through a
shared viewport. The viewport renders inside the NavigationMenu root element (not in a portal),
so the open content panel is shown as a static anatomy panel. Trigger states use the live
component alongside raw-class approximations for the interactive states.

Theme keys: {@api theme-key:NavigationMenu}, {@api theme-key:NavigationMenuList},
{@api theme-key:NavigationMenuTrigger}, {@api theme-key:NavigationMenuContent},
{@api theme-key:NavigationMenuLink}, {@api theme-key:NavigationMenuViewport},
{@api theme-key:NavigationMenuIndicator}.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      trigger states
    </header>
    <NavigationMenu :viewport="false">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Company</NavigationMenuTrigger>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
    <div class="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover / focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">open</div>
      <div>
        <div class="inline-flex h-9 items-center justify-center rounded-vueda-control bg-accent text-accent-foreground px-4 py-2 text-sm font-medium outline-2 outline-offset-2 outline-ring">
          Products <span class="ml-1 opacity-60 text-xs">&#8964;</span>
        </div>
      </div>
      <div>
        <div class="inline-flex h-9 items-center justify-center rounded-vueda-control bg-accent/50 text-accent-foreground px-4 py-2 text-sm font-medium">
          Products <span class="ml-1 opacity-60 text-xs rotate-180 inline-block">&#8964;</span>
        </div>
      </div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">h-9 · rounded-vueda-control · text-sm font-medium</span>
      <span class="whitespace-nowrap">hover/focus bg <code>--accent</code></span>
      <span class="whitespace-nowrap">open bg <code>--accent/50</code></span>
      <span class="whitespace-nowrap">focus-visible: 2px outline <code>--ring</code></span>
      <span class="whitespace-nowrap">caret rotates 180° on open</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      content anatomy <span class="font-normal normal-case">(static panel)</span>
    </header>
    <div class="bg-popover text-popover-foreground rounded-vueda-control border shadow overflow-hidden p-2 flex flex-col gap-0.5">
      <a href="#" class="flex flex-col gap-1 rounded-sm p-2 text-sm hover:bg-accent hover:text-accent-foreground">
        <span class="font-medium leading-none">Components</span>
        <span class="text-muted-foreground text-xs leading-snug">Browse the component library</span>
      </a>
      <a href="#" class="flex flex-col gap-1 rounded-sm p-2 text-sm bg-accent/50 text-accent-foreground">
        <span class="font-medium leading-none">Theming</span>
        <span class="text-xs leading-snug opacity-70">Tokens, keys, and overrides</span>
      </a>
      <a href="#" class="flex flex-col gap-1 rounded-sm p-2 text-sm hover:bg-accent hover:text-accent-foreground">
        <span class="font-medium leading-none">Guides</span>
        <span class="text-muted-foreground text-xs leading-snug">Integration and customization</span>
      </a>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">viewport: bg <code>--popover</code>, rounded, border, shadow</span>
      <span class="whitespace-nowrap">link: flex-col, gap-1, p-2, rounded-sm, text-sm</span>
      <span class="whitespace-nowrap">active link: bg <code>--accent/50</code></span>
      <span class="whitespace-nowrap">hover/focus link: bg <code>--accent</code></span>
    </footer>
  </section>
</div>

## Menubar

Menubar renders a bordered application-style menu bar (h-9, rounded-vueda-control,
shadow-vueda-control). Each trigger opens a portal-based content panel. The open content panel
is shown as a static anatomy panel covering all item variants; the bar and its triggers are
live components.

Theme keys: {@api theme-key:Menubar}, {@api theme-key:MenubarTrigger},
{@api theme-key:MenubarContent}, {@api theme-key:MenubarItem},
{@api theme-key:MenubarLabel}, {@api theme-key:MenubarSeparator},
{@api theme-key:MenubarCheckboxItem}, {@api theme-key:MenubarRadioItem},
{@api theme-key:MenubarShortcut}.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      bar &amp; trigger states
    </header>
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
      </MenubarMenu>
    </Menubar>
    <div class="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover / focus / open</div>
      <div></div>
      <div>
        <div class="bg-background flex h-9 w-fit items-center gap-1 rounded-vueda-control border p-1 shadow-vueda-control">
          <div class="flex items-center rounded-sm px-2 py-1 text-sm font-medium bg-accent text-accent-foreground select-none">File</div>
        </div>
      </div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">bar: bg <code>--background</code>, h-9, rounded, border, shadow</span>
      <span class="whitespace-nowrap">trigger hover/focus/open: bg <code>--accent</code>, fg <code>--accent-foreground</code></span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      content anatomy <span class="font-normal normal-case">(static panel)</span>
    </header>
    <div class="bg-popover text-popover-foreground min-w-48 rounded-vueda-control border p-1 shadow-vueda-popover">
      <div class="px-2 py-1.5 text-sm font-medium">File</div>
      <div class="bg-border -mx-1 my-1 h-px"></div>
      <div class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none">
        New Window
        <span class="text-muted-foreground ml-auto text-xs tracking-widest">&#8984;N</span>
      </div>
      <div class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none bg-accent text-accent-foreground">
        Open...
        <span class="ml-auto text-xs tracking-widest opacity-70">&#8984;O</span>
      </div>
      <div class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none opacity-50">
        Close
        <span class="text-muted-foreground ml-auto text-xs tracking-widest">&#8984;W</span>
      </div>
      <div class="bg-border -mx-1 my-1 h-px"></div>
      <div class="relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm select-none">
        <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          <FontAwesomeIcon :icon="faCheck" class="size-3" />
        </span>
        Show Toolbar
      </div>
      <div class="relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm select-none text-muted-foreground">
        Show Statusbar
      </div>
      <div class="bg-border -mx-1 my-1 h-px"></div>
      <div class="relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm select-none">
        <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          <FontAwesomeIcon :icon="faCircle" class="size-2" />
        </span>
        Small Text
      </div>
      <div class="relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm select-none text-muted-foreground">
        Large Text
      </div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">content: bg <code>--popover</code>, min-w-48, rounded, border, shadow</span>
      <span class="whitespace-nowrap">item hover/focus: bg <code>--accent</code></span>
      <span class="whitespace-nowrap">indicator: size-3.5, absolute left-2</span>
      <span class="whitespace-nowrap">shortcut: text-xs tracking-widest ml-auto</span>
      <span class="whitespace-nowrap">disabled: opacity-50 pointer-events-none</span>
    </footer>
  </section>
</div>
