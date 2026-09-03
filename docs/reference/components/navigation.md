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
import NavigationMenu from "@vueda/navigation/menu/NavigationMenu.vue";
import NavigationMenuItem from "@vueda/navigation/menu/NavigationMenuItem.vue";
import NavigationMenuList from "@vueda/navigation/menu/NavigationMenuList.vue";
import NavigationMenuTrigger from "@vueda/navigation/menu/NavigationMenuTrigger.vue";
import NavigationMenuContent from "@vueda/navigation/menu/NavigationMenuContent.vue";
import NavigationMenuLink from "@vueda/navigation/menu/NavigationMenuLink.vue";
import Menubar from "@vueda/navigation/menubar/Menubar.vue";
import MenubarMenu from "@vueda/navigation/menubar/MenubarMenu.vue";
import MenubarShortcut from "@vueda/navigation/menubar/MenubarShortcut.vue";
import MenubarTrigger from "@vueda/navigation/menubar/MenubarTrigger.vue";
import MenubarContent from "@vueda/navigation/menubar/MenubarContent.vue";
import MenubarItem from "@vueda/navigation/menubar/MenubarItem.vue";
import MenubarLabel from "@vueda/navigation/menubar/MenubarLabel.vue";
import MenubarSeparator from "@vueda/navigation/menubar/MenubarSeparator.vue";
import MenubarCheckboxItem from "@vueda/navigation/menubar/MenubarCheckboxItem.vue";
import MenubarRadioGroup from "@vueda/navigation/menubar/MenubarRadioGroup.vue";
import MenubarRadioItem from "@vueda/navigation/menubar/MenubarRadioItem.vue";
</script>

# Navigation

The navigation family covers wayfinding primitives: Breadcrumb trails, NavigationMenu flyout
menus, and Menubar application menus. All share the same 32px control sizing baseline
({@api css-token:vueda-control-height}) and focus treatment. Pagination shares that baseline but
has outgrown this page; it lives on [Pagination](./pagination.md).

This page is the visual contract the default theme guarantees. Use it as the target spec when
you re-skin: every cell shown here should still read as the same control after a customization.
If a cell breaks, the change has crossed from skin into design language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). In brief: values
belong in [CSS tokens](../theming/tokens.md); compositions belong in
[theme keys](../theming/keys.md).

Every cell below is a live component, including the two open-content panels. NavigationMenu
renders its content inside the menu root rather than a portal, so that panel needs nothing but
reserved space. Menubar's panel is portal-based, so it is force-mounted with its side pinned to
land in the same reserved space.

## Breadcrumb

Breadcrumb renders a `<nav>` landmark containing an ordered list of location segments. The
separator defaults to `/`; any slot content replaces it. BreadcrumbEllipsis collapses deep
trails into a size-9 click target with a screen-reader label.

Theme keys: {@api theme-key:BreadcrumbList}, {@api theme-key:BreadcrumbItem},
{@api theme-key:BreadcrumbLink}, {@api theme-key:BreadcrumbPage},
{@api theme-key:BreadcrumbSeparator}, {@api theme-key:BreadcrumbEllipsis}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="anatomy">
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
    <template #footer>
      <span>list: flex-wrap, gap-1.5 sm:gap-2.5, text-sm</span>
      <span>separator: svg size-3.5</span>
      <span>ellipsis: size-9 click target</span>
    </template>
  </DemoCard>
  <DemoCard title="link states">
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
    <template #footer>
      <span>link fg <code>--muted-foreground</code></span>
      <span>link hover fg <code>--foreground</code></span>
      <span>page: font-normal, fg <code>--foreground</code></span>
      <span>page: aria-current="page", aria-disabled</span>
    </template>
  </DemoCard>
</VuedaDemo>

## NavigationMenu

NavigationMenu renders a horizontal list of triggers that open flyout content panels through a
shared viewport. The viewport renders inside the NavigationMenu root element rather than in a
portal, so with the viewport disabled an open panel sits in the menu's own stacking context and
can be shown in place. Every cell below is the live component rendered in the named state, so
what you see is exactly what your customization will produce.

Theme keys: {@api theme-key:NavigationMenu}, {@api theme-key:NavigationMenuList},
{@api theme-key:NavigationMenuTrigger}, {@api theme-key:NavigationMenuContent},
{@api theme-key:NavigationMenuLink}, {@api theme-key:NavigationMenuViewport},
{@api theme-key:NavigationMenuIndicator}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="trigger states">
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
    <div class="grid grid-cols-3 gap-x-3 gap-y-1 pt-1">
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>open</StateLabel>
      <div>
        <ForceState state="hover">
          <NavigationMenu :viewport="false">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </ForceState>
      </div>
      <div>
        <ForceState state="focus">
          <NavigationMenu :viewport="false">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </ForceState>
      </div>
      <div>
        <NavigationMenu :viewport="false" default-value="products">
          <NavigationMenuList>
            <NavigationMenuItem value="products">
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
    <template #footer>
      <span>h-9 · rounded-vueda-control · text-sm font-medium</span>
      <span>hover/focus bg <code>--accent</code></span>
      <span>open bg <code>--accent/50</code></span>
      <span>focus-visible: 2px outline <code>--ring</code></span>
      <span>caret rotates 180° on open</span>
    </template>
  </DemoCard>
  <DemoCard title="content anatomy" description=" (live, viewport disabled)">
    <div class="pb-40">
      <ClientOnly>
        <NavigationMenu :viewport="false" default-value="products">
          <NavigationMenuList>
            <NavigationMenuItem value="products">
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent force-mount class="md:w-64">
                <NavigationMenuLink href="#">
                  <span class="font-medium leading-none">Components</span>
                  <span class="text-muted-foreground text-xs leading-snug">Browse the component library</span>
                </NavigationMenuLink>
                <ForceState state="hover" as="block">
                  <NavigationMenuLink href="#">
                    <span class="font-medium leading-none">Theming</span>
                    <span class="text-muted-foreground text-xs leading-snug">Tokens, keys, and overrides</span>
                  </NavigationMenuLink>
                </ForceState>
                <NavigationMenuLink href="#" :active="true">
                  <span class="font-medium leading-none">Guides</span>
                  <span class="text-muted-foreground text-xs leading-snug">Integration and customization</span>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </ClientOnly>
    </div>
    <template #footer>
      <span>real <code>NavigationMenuContent</code> and <code>NavigationMenuLink</code>: this family renders inside the menu root rather than a portal, so the panel is plain <code>md:absolute</code> and needs only reserved space</span>
      <span>surface comes from <code>group-data-[viewport=false]/navigation-menu:bg-popover</code>, so the panel is only self-toned when the viewport is disabled</span>
      <span>row 2 is wrapped in <code>ForceState</code>; the link recipe paints hover and focus with <code>bg-accent</code></span>
      <span>row 3 sets <code>:active="true"</code>, which emits <code>data-active</code>. The default theme has no <code>data-[active]</code> recipe, so it renders identically to row 1 today.</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Menubar

Menubar renders a bordered application-style menu bar (h-9, rounded-vueda-control,
shadow-vueda-control). Each trigger opens a portal-based content panel. The panel below is that
real content, force-mounted so it stays open, and it covers every item variant the family
provides.

Theme keys: {@api theme-key:Menubar}, {@api theme-key:MenubarTrigger},
{@api theme-key:MenubarContent}, {@api theme-key:MenubarItem},
{@api theme-key:MenubarLabel}, {@api theme-key:MenubarSeparator},
{@api theme-key:MenubarCheckboxItem}, {@api theme-key:MenubarRadioItem},
{@api theme-key:MenubarShortcut}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="bar &amp; trigger states">
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
      <StateLabel>hover / focus / open</StateLabel>
      <div></div>
      <div>
        <div class="bg-background flex h-9 w-fit items-center gap-1 rounded-vueda-control hairline hairline-border p-1 shadow-vueda-control">
          <div class="flex items-center rounded-sm px-2 py-1 text-sm font-medium bg-accent text-accent-foreground select-none">File</div>
        </div>
      </div>
    </div>
    <template #footer>
      <span>bar: bg <code>--background</code>, h-9, rounded, <code>hairline hairline-border</code>, shadow</span>
      <span>trigger hover/focus/open: bg <code>--accent</code>, fg <code>--accent-foreground</code></span>
    </template>
  </DemoCard>
  <DemoCard title="content anatomy" description=" (live, force-mounted)">
    <div class="pb-72">
      <ClientOnly>
        <Menubar>
          <MenubarMenu value="file">
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent force-mount side="bottom" align="start" :side-offset="6" :avoid-collisions="false" @escape-key-down.prevent @pointer-down-outside.prevent @focus-outside.prevent @interact-outside.prevent>
              <MenubarLabel>File</MenubarLabel>
              <MenubarSeparator />
              <MenubarItem>
                New Window
                <MenubarShortcut :keys="['⌘', 'N']" />
              </MenubarItem>
              <ForceState state="focus" as="block">
                <MenubarItem>
                  Open...
                  <MenubarShortcut :keys="['⌘', 'O']" />
                </MenubarItem>
              </ForceState>
              <MenubarItem disabled>
                Close
                <MenubarShortcut :keys="['⌘', 'W']" />
              </MenubarItem>
              <MenubarSeparator />
              <MenubarCheckboxItem :model-value="true">Show Toolbar</MenubarCheckboxItem>
              <MenubarCheckboxItem :model-value="false">Show Statusbar</MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarRadioGroup model-value="compact">
                <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
                <MenubarRadioItem value="cosy">Cosy</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </ClientOnly>
    </div>
    <template #footer>
      <span>every row is real: <code>MenubarLabel</code>, <code>MenubarSeparator</code>, <code>MenubarItem</code>, <code>MenubarCheckboxItem</code>, <code>MenubarRadioItem</code>, and <code>MenubarShortcut</code></span>
      <span>the check and radio indicators are the components' own, driven by <code>model-value</code>, not glyphs placed by hand</span>
      <span>"Open..." sits in a <code>ForceState</code> wrapper; "Close" carries the real <code>disabled</code> prop</span>
      <span>this panel is portal-based like DropdownMenu, so its side is pinned and it lands in the card's reserved space</span>
      <span>Menubar item recipes must stay identical to the DropdownMenu keys; see [Overlays](./overlays.md)</span>
    </template>
  </DemoCard>
</VuedaDemo>
