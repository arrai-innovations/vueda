---
title: Sidebar
status: brainstorming
audience: designer
type: reference
aside: false
---

<script setup>
import Button from "@vueda/controls/button/Button.vue";
import Sidebar from "@vueda/navigation/sidebar/Sidebar.vue";
import SidebarContent from "@vueda/navigation/sidebar/SidebarContent.vue";
import SidebarFooter from "@vueda/navigation/sidebar/SidebarFooter.vue";
import SidebarGroup from "@vueda/navigation/sidebar/SidebarGroup.vue";
import SidebarGroupAction from "@vueda/navigation/sidebar/SidebarGroupAction.vue";
import SidebarGroupContent from "@vueda/navigation/sidebar/SidebarGroupContent.vue";
import SidebarGroupLabel from "@vueda/navigation/sidebar/SidebarGroupLabel.vue";
import SidebarHeader from "@vueda/navigation/sidebar/SidebarHeader.vue";
import SidebarInput from "@vueda/navigation/sidebar/SidebarInput.vue";
import SidebarInset from "@vueda/navigation/sidebar/SidebarInset.vue";
import SidebarMenu from "@vueda/navigation/sidebar/SidebarMenu.vue";
import SidebarMenuAction from "@vueda/navigation/sidebar/SidebarMenuAction.vue";
import SidebarMenuBadge from "@vueda/navigation/sidebar/SidebarMenuBadge.vue";
import SidebarMenuButton from "@vueda/navigation/sidebar/SidebarMenuButton.vue";
import SidebarMenuItem from "@vueda/navigation/sidebar/SidebarMenuItem.vue";
import SidebarMenuSkeleton from "@vueda/navigation/sidebar/SidebarMenuSkeleton.vue";
import SidebarMenuSub from "@vueda/navigation/sidebar/SidebarMenuSub.vue";
import SidebarMenuSubButton from "@vueda/navigation/sidebar/SidebarMenuSubButton.vue";
import SidebarMenuSubItem from "@vueda/navigation/sidebar/SidebarMenuSubItem.vue";
import SidebarProvider from "@vueda/navigation/sidebar/SidebarProvider.vue";
import SidebarRail from "@vueda/navigation/sidebar/SidebarRail.vue";
import SidebarSeparator from "@vueda/navigation/sidebar/SidebarSeparator.vue";
import SidebarTrigger from "@vueda/navigation/sidebar/SidebarTrigger.vue";
import SidebarUserBlock from "@vueda/navigation/sidebar/SidebarUserBlock.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    faBoxArchive,
    faChevronDown,
    faChevronRight,
    faEllipsis,
    faEllipsisVertical,
    faFileInvoiceDollar,
    faFlask,
    faGaugeHigh,
    faInbox,
    faKey,
    faPlus,
    faTriangleExclamation,
    faTruckFast,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import {
    faBell,
    faBuilding,
    faCircle,
    faCircleDot,
    faFolder,
    faHandshake,
    faRectangleList,
} from "@fortawesome/free-regular-svg-icons";
import { markRaw } from "vue";

const sidebarTriggerIconOverride = {
    SidebarTrigger: {
        toggle: {
            component: markRaw(FontAwesomeIcon),
            props: { icon: faRectangleList },
        },
    },
};
</script>

# Sidebar

The sidebar family provides the fixed left rail framing every authenticated screen: brand header, scrollable nav body with groups and sub-menus, and a user footer. Two states are the admin-app default: **expanded** (224 px, `--vueda-sidebar-width`) and **collapsed icon rail** (48 px, `--vueda-sidebar-width-icon`). Floating, inset, offcanvas-mobile, and right-side variants exist in source but are not covered here.

Demos below use `collapsible="none"` to pin the sidebar inside a bounded frame. Default skin gaps are visible by design: they are what this page exists to illuminate.

Theme keys: {@api theme-key:SidebarProvider}, {@api theme-key:Sidebar},
{@api theme-key:SidebarHeader}, {@api theme-key:SidebarContent},
{@api theme-key:SidebarFooter}, {@api theme-key:SidebarGroup},
{@api theme-key:SidebarGroupLabel}, {@api theme-key:SidebarGroupAction},
{@api theme-key:SidebarGroupContent}, {@api theme-key:SidebarMenu},
{@api theme-key:SidebarMenuItem}, `SidebarMenuButton` (no theme key),
{@api theme-key:SidebarMenuBadge}, {@api theme-key:SidebarMenuAction},
{@api theme-key:SidebarMenuSub}, {@api theme-key:SidebarMenuSubButton},
{@api theme-key:SidebarMenuSkeleton}, {@api theme-key:SidebarInput},
{@api theme-key:SidebarSeparator}, {@api theme-key:SidebarInset},
{@api theme-key:SidebarRail}, {@api theme-key:SidebarTrigger},
{@api theme-key:SidebarUserBlock}.

## Expanded shell

Full 224 px rail. Header carries the brand mark and sidebar trigger. Nav body groups are 11 px uppercase eyebrow labels. Active item shows `bg-sidebar-accent` + `font-medium`. Badge counts sit at the right edge. Sub-menu indents under the open parent.

<VuedaDemo>
  <div class="h-[540px] overflow-hidden rounded-vueda-card border border-border">
    <SidebarProvider>
      <Sidebar collapsible="none" class="shrink-0 border-r border-border">
        <SidebarHeader>
          <div class="flex items-center justify-between px-1">
            <a class="flex items-center gap-2" href="#" aria-label="VUEDA home" @click.prevent>
              <img src="/assets/logo-cube-solid.svg" alt="" class="h-5 w-5 shrink-0" />
              <span class="font-semibold text-sm tracking-tight">vueda</span>
            </a>
            <SidebarTrigger :icon-override="sidebarTriggerIconOverride" />
          </div>
          <SidebarInput placeholder="Search…" type="search" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" @click.prevent>
                    <FontAwesomeIcon :icon="faGaugeHigh" class="size-4 shrink-0" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" :is-active="true" @click.prevent>
                    <FontAwesomeIcon :icon="faFileInvoiceDollar" class="size-4 shrink-0" />
                    <span>Invoices</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>3</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" @click.prevent>
                    <FontAwesomeIcon :icon="faHandshake" class="size-4 shrink-0" />
                    <span>Customers</span>
                    <FontAwesomeIcon :icon="faChevronDown" class="ml-auto size-3 shrink-0 text-muted-foreground" />
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton as="a" href="#" @click.prevent>All customers</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton as="a" href="#" :is-active="true" @click.prevent>Active</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton as="a" href="#" @click.prevent>Archived</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" @click.prevent>
                    <FontAwesomeIcon :icon="faBoxArchive" class="size-4 shrink-0" />
                    <span>Inventory</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction :show-on-hover="true" as="button" aria-label="Inventory actions">
                    <FontAwesomeIcon :icon="faEllipsis" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" @click.prevent>
                    <FontAwesomeIcon :icon="faTruckFast" class="size-4 shrink-0" />
                    <span>Shipments</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>12</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton :show-icon="true" />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupAction as="button" aria-label="Add workspace item">
              <FontAwesomeIcon :icon="faPlus" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" @click.prevent>
                    <FontAwesomeIcon :icon="faUsers" class="size-4 shrink-0" />
                    <span>Team</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" @click.prevent>
                    <FontAwesomeIcon :icon="faKey" class="size-4 shrink-0" />
                    <span>API tokens</span>
                    <span class="ml-auto font-mono text-xs text-muted-foreground">⌘K</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" aria-disabled="true" @click.prevent>
                    <FontAwesomeIcon :icon="faFlask" class="size-4 shrink-0" />
                    <span>Experiments</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserBlock name="Jess Rivera" role="Admin · Acme Co." class="rounded-vueda-control p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <template #kebab>
              <FontAwesomeIcon :icon="faEllipsisVertical" class="ml-auto size-4 shrink-0 text-muted-foreground" />
            </template>
          </SidebarUserBlock>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header class="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3">
          <nav class="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <span>Operations</span>
            <FontAwesomeIcon :icon="faChevronRight" class="size-2.5" />
            <span class="text-foreground font-medium">Invoices</span>
          </nav>
          <div class="ml-auto flex items-center gap-2">
            <Button size="sm" emphasis="outline">
              <FontAwesomeIcon :icon="faFileInvoiceDollar" class="size-3" />
              Export
            </Button>
            <Button size="sm" tone="primary">
              <FontAwesomeIcon :icon="faPlus" class="size-3" />
              New invoice
            </Button>
          </div>
        </header>
        <div class="flex-1 overflow-auto p-3">
          <div class="mb-2">
            <h2 class="text-base font-semibold leading-tight">Invoices</h2>
            <p class="text-xs text-muted-foreground">48 invoices · 3 overdue</p>
          </div>
          <div class="overflow-hidden rounded-vueda-card border border-border">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-border bg-muted/40">
                  <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Number</th>
                  <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Customer</th>
                  <th class="px-3 py-1.5 text-right font-medium text-muted-foreground">Amount</th>
                  <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border">
                  <td class="px-3 py-1.5 font-mono">INV-2026-00482</td>
                  <td class="px-3 py-1.5">Northbeam Industrial</td>
                  <td class="px-3 py-1.5 text-right font-mono">$14,028.50</td>
                  <td class="px-3 py-1.5">Open</td>
                </tr>
                <tr class="border-b border-border">
                  <td class="px-3 py-1.5 font-mono">INV-2026-00481</td>
                  <td class="px-3 py-1.5">Solana Bay Logistics</td>
                  <td class="px-3 py-1.5 text-right font-mono">$3,240.00</td>
                  <td class="px-3 py-1.5">Open</td>
                </tr>
                <tr class="border-b border-border">
                  <td class="px-3 py-1.5 font-mono">INV-2026-00478</td>
                  <td class="px-3 py-1.5">Hartwell Mfg</td>
                  <td class="px-3 py-1.5 text-right font-mono">$22,910.00</td>
                  <td class="px-3 py-1.5 text-destructive">Overdue</td>
                </tr>
                <tr>
                  <td class="px-3 py-1.5 font-mono">INV-2026-00477</td>
                  <td class="px-3 py-1.5">Bristol Components</td>
                  <td class="px-3 py-1.5 text-right font-mono">$1,820.75</td>
                  <td class="px-3 py-1.5">Paid</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
  <footer class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span class="whitespace-nowrap">sidebar bg <code>--sidebar</code></span>
    <span class="whitespace-nowrap">border-r <code>--sidebar-border</code></span>
    <span class="whitespace-nowrap">width <code>--vueda-sidebar-width</code> (14rem · 224 px)</span>
    <span class="whitespace-nowrap">active bg <code>--sidebar-accent</code> · fg <code>--sidebar-accent-foreground</code></span>
    <span class="whitespace-nowrap">group label: 11px uppercase, <code>--sidebar-foreground/70</code></span>
  </footer>
</VuedaDemo>

## Collapsed icon rail

48 px rail. Group labels, badges, sub-menus, search, and user identity meta all hide. Only icons remain. Active item retains the `bg-sidebar-accent` fill so location is readable without a tooltip.

<VuedaDemo>
  <div class="h-[360px] overflow-hidden rounded-vueda-card border border-border">
    <SidebarProvider>
      <Sidebar collapsible="none" class="group shrink-0 border-r border-border" data-collapsible="icon" style="--sidebar-width: var(--vueda-sidebar-width-icon);">
        <SidebarHeader>
          <div class="flex items-center justify-center py-1">
            <img src="/assets/logo-cube-solid.svg" alt="VUEDA" class="h-5 w-5 shrink-0" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" tooltip="Dashboard" @click.prevent>
                    <FontAwesomeIcon :icon="faGaugeHigh" class="size-4 shrink-0" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" :is-active="true" tooltip="Invoices" @click.prevent>
                    <FontAwesomeIcon :icon="faFileInvoiceDollar" class="size-4 shrink-0" />
                    <span>Invoices</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" tooltip="Customers" @click.prevent>
                    <FontAwesomeIcon :icon="faHandshake" class="size-4 shrink-0" />
                    <span>Customers</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" tooltip="Inventory" @click.prevent>
                    <FontAwesomeIcon :icon="faBoxArchive" class="size-4 shrink-0" />
                    <span>Inventory</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" tooltip="Shipments" @click.prevent>
                    <FontAwesomeIcon :icon="faTruckFast" class="size-4 shrink-0" />
                    <span>Shipments</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" tooltip="Team" @click.prevent>
                    <FontAwesomeIcon :icon="faUsers" class="size-4 shrink-0" />
                    <span>Team</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton as="a" href="#" tooltip="API tokens" @click.prevent>
                    <FontAwesomeIcon :icon="faKey" class="size-4 shrink-0" />
                    <span>API tokens</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserBlock name="Jess Rivera" role="Admin · Acme Co." class="rounded-vueda-control p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <template #kebab>
              <FontAwesomeIcon :icon="faEllipsisVertical" class="ml-auto size-4 shrink-0 text-muted-foreground" />
            </template>
          </SidebarUserBlock>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header class="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3">
          <nav class="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <span>Operations</span>
            <FontAwesomeIcon :icon="faChevronRight" class="size-2.5" />
            <span class="text-foreground font-medium">Invoices</span>
          </nav>
          <div class="ml-auto flex items-center gap-2">
            <Button size="sm" tone="primary">
              <FontAwesomeIcon :icon="faPlus" class="size-3" />
              New invoice
            </Button>
          </div>
        </header>
        <div class="flex-1 overflow-auto p-3">
          <p class="text-sm font-semibold">Invoices</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Content region grows by <code>--vueda-sidebar-width</code> minus <code>--vueda-sidebar-width-icon</code> (176 px) when the rail collapses.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
  <footer class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span class="whitespace-nowrap">icon rail width <code>--vueda-sidebar-width-icon</code> (3rem · 48 px)</span>
    <span class="whitespace-nowrap">labels, badges, sub-menus hidden via <code>group-data-[collapsible=icon]</code></span>
    <span class="whitespace-nowrap">active fill persists: location readable without tooltip</span>
  </footer>
</VuedaDemo>

## Anatomy

Individual pieces of the sidebar surface. All cells share a single `SidebarProvider` so `useSidebar()` resolves correctly.

<VuedaDemo>
  <SidebarProvider style="min-height: 0;">
    <div class="grid w-full items-start gap-6 sm:grid-cols-2">
      <DemoCard title="SidebarMenuButton — states">
        <p class="text-xs text-muted-foreground">idle / hover / active / disabled · <code>isActive</code>, <code>aria-disabled</code></p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faCircle" class="size-4 shrink-0" />
                <span>Idle</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ForceState state="hover" as="block">
                <SidebarMenuButton as="a" href="#" @click.prevent>
                  <FontAwesomeIcon :icon="faCircle" class="size-4 shrink-0" />
                  <span>Hover</span>
                </SidebarMenuButton>
              </ForceState>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" :is-active="true" @click.prevent>
                <FontAwesomeIcon :icon="faCircleDot" class="size-4 shrink-0" />
                <span>Active</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" aria-disabled="true" @click.prevent>
                <FontAwesomeIcon :icon="faCircle" class="size-4 shrink-0" />
                <span>Disabled</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>hover bg <code>--sidebar-accent</code></span>
          <span>active: bg + font-medium</span>
          <span>disabled: opacity-50 pointer-events-none</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarMenuButton — sizes">
        <p class="text-xs text-muted-foreground">sm 28 px / default 32 px / lg 48 px · <code>size</code> prop</p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" size="sm" @click.prevent>
                <FontAwesomeIcon :icon="faGaugeHigh" class="size-4 shrink-0" />
                <span>Compact (sm · 28 px)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faGaugeHigh" class="size-4 shrink-0" />
                <span>Default (32 px)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" size="lg" @click.prevent>
                <FontAwesomeIcon :icon="faGaugeHigh" class="size-4 shrink-0" />
                <span>Large (lg · 48 px)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>sm: h-7 text-xs</span>
          <span>default: h-8 text-sm</span>
          <span>lg: h-12 text-sm</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarMenuButton — outline variant">
        <p class="text-xs text-muted-foreground">org / tenant switcher · <code>variant="outline"</code></p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenuButton as="a" href="#" variant="outline" @click.prevent>
            <FontAwesomeIcon :icon="faBuilding" class="size-4 shrink-0" />
            <span>Acme Co.</span>
            <FontAwesomeIcon :icon="faChevronDown" class="ml-auto size-3 shrink-0 text-muted-foreground" />
          </SidebarMenuButton>
        </div>
        <template #footer>
          <span>bg <code>--background</code> · 1 px inset shadow</span>
          <span>hover: shadow shifts to <code>--sidebar-accent</code></span>
          <span>signals "independent of sidebar surface"</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarMenuBadge">
        <p class="text-xs text-muted-foreground">count badge at right edge · absolute-positioned peer of menu-button</p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faInbox" class="size-4 shrink-0" />
                <span>Inbox</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>24</SidebarMenuBadge>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" :is-active="true" @click.prevent>
                <FontAwesomeIcon :icon="faBell" class="size-4 shrink-0" />
                <span>Notifications</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>3</SidebarMenuBadge>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faTriangleExclamation" class="size-4 shrink-0" />
                <span>Errors</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>!</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>h-5 min-w-5 rounded-md tabular-nums</span>
          <span>fg shifts on active peer: <code>--sidebar-accent-foreground</code></span>
          <span>hidden when rail collapses</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarMenuAction — show-on-hover">
        <p class="text-xs text-muted-foreground">kebab fades in on parent hover · <code>show-on-hover</code> prop</p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faFolder" class="size-4 shrink-0" />
                <span>Hover to reveal</span>
              </SidebarMenuButton>
              <SidebarMenuAction :show-on-hover="true" as="button" aria-label="Actions">
                <FontAwesomeIcon :icon="faEllipsis" />
              </SidebarMenuAction>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faFolder" class="size-4 shrink-0" />
                <span>Always visible</span>
              </SidebarMenuButton>
              <SidebarMenuAction as="button" aria-label="Actions">
                <FontAwesomeIcon :icon="faEllipsis" />
              </SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>show-on-hover: opacity-0 → opacity-100 on parent group hover/focus-within</span>
          <span>w-5 aspect-square, absolute top-1.5 right-1</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarMenuSub — indent rail">
        <p class="text-xs text-muted-foreground">left border rail under open parent · active dot on current item</p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faHandshake" class="size-4 shrink-0" />
                <span>Customers</span>
                <FontAwesomeIcon :icon="faChevronDown" class="ml-auto size-3 shrink-0 text-muted-foreground" />
              </SidebarMenuButton>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton as="a" href="#" @click.prevent>All</SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton as="a" href="#" :is-active="true" @click.prevent>Active</SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton as="a" href="#" size="sm" @click.prevent>Archived (sm)</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>border-l <code>--sidebar-border</code> · mx-3.5 px-2.5</span>
          <span>sub-button active: bg <code>--sidebar-accent</code></span>
          <span>hidden when rail collapses</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarGroupLabel + SidebarGroupAction">
        <p class="text-xs text-muted-foreground">11 px uppercase eyebrow + 20 px ghost action</p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarGroup class="p-0">
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupAction as="button" aria-label="Add">
              <FontAwesomeIcon :icon="faPlus" />
            </SidebarGroupAction>
          </SidebarGroup>
        </div>
        <template #footer>
          <span>label: h-8 text-xs font-medium tracking-wide opacity-70</span>
          <span>action: w-5 absolute top-3.5 right-3</span>
          <span>both hidden when rail collapses</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarSeparator">
        <p class="text-xs text-muted-foreground">full-bleed 1 px hairline · <code>bg-sidebar-border</code></p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faCircle" class="size-4 shrink-0" />
                <span>Above</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as="a" href="#" @click.prevent>
                <FontAwesomeIcon :icon="faCircle" class="size-4 shrink-0" />
                <span>Below</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>mx-2 w-auto (source default)</span>
          <span>design target: full-bleed like table hairlines</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarMenuSkeleton">
        <p class="text-xs text-muted-foreground">icon + variable-width text bar · <code>show-icon</code> prop</p>
        <div class="w-[var(--vueda-sidebar-width)] max-w-full rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuSkeleton :show-icon="true" /></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuSkeleton :show-icon="true" /></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuSkeleton :show-icon="true" /></SidebarMenuItem>
          </SidebarMenu>
        </div>
        <template #footer>
          <span>h-8 gap-2 px-2 · icon: size-4 rounded-md</span>
          <span>text bar width: random 50 to 90% per instance</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarInput">
        <p class="text-xs text-muted-foreground">h-8 search field · <code>bg-background</code> on <code>bg-sidebar</code></p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarInput placeholder="Search…" type="search" />
        </div>
        <template #footer>
          <span>bg <code>--background</code> · h-8 · shadow-none</span>
          <span>contrast: 1 px border on sidebar surface</span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarUserBlock">
        <p class="text-xs text-muted-foreground">32 px UserAvatar (sidebar tone) · name + role · #kebab slot</p>
        <div class="w-[var(--vueda-sidebar-width)] max-w-full rounded-vueda-card border border-border bg-sidebar p-2">
          <SidebarFooter class="p-0">
            <SidebarUserBlock name="Jess Rivera" role="Admin · Acme Co." class="rounded-vueda-control p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <template #kebab>
                <FontAwesomeIcon :icon="faEllipsisVertical" class="ml-auto size-4 shrink-0 text-muted-foreground" />
              </template>
            </SidebarUserBlock>
          </SidebarFooter>
        </div>
        <template #footer>
          <span>avatar: 32 px UserAvatar tone="sidebar" — bg <code>--sidebar-accent</code></span>
          <span>name: 13 px / 500 / <code>--sidebar-foreground</code></span>
          <span>role: 11 px / 400 / <code>--muted-foreground</code></span>
        </template>
      </DemoCard>
      <DemoCard title="SidebarTrigger">
        <p class="text-xs text-muted-foreground">28 px ghost · icon from registry · override via <code>iconOverride</code></p>
        <div class="rounded-vueda-card border border-border bg-sidebar p-2 flex items-center gap-2">
          <SidebarTrigger />
          <SidebarTrigger :icon-override="sidebarTriggerIconOverride" />
        </div>
        <template #footer>
          <span>left: registry default</span>
          <span>right: <code>fa-regular fa-rectangle-list</code> via <code>iconOverride</code></span>
          <span>h-7 w-7 ghost button</span>
        </template>
      </DemoCard>
    </div>
  </SidebarProvider>
</VuedaDemo>
