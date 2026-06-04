---
title: Overlays
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import Tooltip from "@vueda/shell/tooltip/Tooltip.vue";
import TooltipContent from "@vueda/shell/tooltip/TooltipContent.vue";
import TooltipProvider from "@vueda/shell/tooltip/TooltipProvider.vue";
import TooltipTrigger from "@vueda/shell/tooltip/TooltipTrigger.vue";
import DropdownMenu from "@vueda/navigation/dropdown-menu/DropdownMenu.vue";
import DropdownMenuCheckboxItem from "@vueda/navigation/dropdown-menu/DropdownMenuCheckboxItem.vue";
import DropdownMenuContent from "@vueda/navigation/dropdown-menu/DropdownMenuContent.vue";
import DropdownMenuItem from "@vueda/navigation/dropdown-menu/DropdownMenuItem.vue";
import DropdownMenuLabel from "@vueda/navigation/dropdown-menu/DropdownMenuLabel.vue";
import DropdownMenuRadioGroup from "@vueda/navigation/dropdown-menu/DropdownMenuRadioGroup.vue";
import DropdownMenuRadioItem from "@vueda/navigation/dropdown-menu/DropdownMenuRadioItem.vue";
import DropdownMenuSeparator from "@vueda/navigation/dropdown-menu/DropdownMenuSeparator.vue";
import DropdownMenuShortcut from "@vueda/navigation/dropdown-menu/DropdownMenuShortcut.vue";
import DropdownMenuSub from "@vueda/navigation/dropdown-menu/DropdownMenuSub.vue";
import DropdownMenuSubContent from "@vueda/navigation/dropdown-menu/DropdownMenuSubContent.vue";
import DropdownMenuSubTrigger from "@vueda/navigation/dropdown-menu/DropdownMenuSubTrigger.vue";
import DropdownMenuTrigger from "@vueda/navigation/dropdown-menu/DropdownMenuTrigger.vue";
import ContextMenu from "@vueda/navigation/context-menu/ContextMenu.vue";
import ContextMenuContent from "@vueda/navigation/context-menu/ContextMenuContent.vue";
import ContextMenuItem from "@vueda/navigation/context-menu/ContextMenuItem.vue";
import ContextMenuLabel from "@vueda/navigation/context-menu/ContextMenuLabel.vue";
import ContextMenuRadioGroup from "@vueda/navigation/context-menu/ContextMenuRadioGroup.vue";
import ContextMenuRadioItem from "@vueda/navigation/context-menu/ContextMenuRadioItem.vue";
import ContextMenuSeparator from "@vueda/navigation/context-menu/ContextMenuSeparator.vue";
import ContextMenuShortcut from "@vueda/navigation/context-menu/ContextMenuShortcut.vue";
import ContextMenuTrigger from "@vueda/navigation/context-menu/ContextMenuTrigger.vue";
import Label from "@vueda/shell/label/Label.vue";
import Input from "@vueda/controls/input/Input.vue";
import Textarea from "@vueda/controls/textarea/Textarea.vue";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faChevronDown,
  faCircleInfo,
  faCopy,
  faDownload,
  faEnvelope,
  faFileExport,
  faFileLines,
  faFolderOpen,
  faPen,
  faPlus,
  faPrint,
  faShareNodes,
  faTrash,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { ref } from "vue";

const colCustomer = ref(true);
const colAmount = ref(true);
const colDueDate = ref(true);
const colPoNumber = ref(false);
const sortBy = ref("dueDate");
const assignee = ref("me");
</script>

# Overlays

Popover, DropdownMenu, ContextMenu, and Tooltip. Three of the four share one floating surface: `bg-popover` fill, 1 px `border-border` edge, `--vueda-control-radius` corners, and `--vueda-shadow-popover` elevation. The border carries the elevation signal in VUEDA; the shadow is a 12 px ambient softener, not a lift. Tooltip deliberately inverts the surface (`bg-foreground` / `text-background`) so it reads as a transient label rather than an actionable panel.

This page is the visual contract for {@api vue:component:Popover}, {@api vue:component:DropdownMenu}, {@api vue:component:ContextMenu}, and {@api vue:component:Tooltip}. The Combobox list panel uses the same floating surface; its trigger and open states are documented on [Selection + Command](./selection-and-command).

For how to change any of this, see [Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). Values belong in [CSS tokens](../theming/tokens.md); compositions belong in [theme keys](../theming/keys.md).

## Popover

Popover is the anchored action panel. Width and padding are caller-supplied, not part of the theme key: the theme key governs only the surface (background, border, radius, shadow) and internal typography rhythm. Typical sizes are `w-72 p-4` for forms, `w-60 p-3` for compact info panels, and `w-80 p-4` for wide destructive-action confirmations.

Theme key: {@api theme-key:PopoverContent}. Token surface: {@api css-token:popover}, {@api css-token:popover-foreground}, {@api css-token:border}, {@api css-token:vueda-control-radius}, {@api css-token:vueda-shadow-popover}.

<VuedaDemo class="grid gap-6 lg:grid-cols-3">
  <DemoCard title="default · w-72 · form in a popover">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline">Edit terms</Button>
          </PopoverTrigger>
          <PopoverContent class="w-72">
            <p class="font-semibold leading-none tracking-tight">Payment terms</p>
            <p class="mt-1 text-sm text-muted-foreground">Override the customer default for this invoice only.</p>
            <div class="mt-3 grid gap-3">
              <div class="grid gap-1.5">
                <Label for="pop-due-days">Due days</Label>
                <Input id="pop-due-days" value="30" />
              </div>
              <div class="grid gap-1.5">
                <Label for="pop-early-pay">Early-pay discount</Label>
                <Input id="pop-early-pay" value="2% / 10 days" />
              </div>
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button size="sm">Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </ClientOnly>
    </div>
    <template #footer>
      <span>surface: <code>PopoverContent</code></span>
      <span>width + padding: caller-supplied</span>
    </template>
  </DemoCard>
  <DemoCard title="sm · w-60 p-3 · utility info">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="ghost" size="icon" aria-label="Reconciliation status">
              <FontAwesomeIcon :icon="faCircleInfo" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-60 p-3">
            <p class="font-semibold leading-none tracking-tight">Reconciliation status</p>
            <p class="mt-2 text-sm text-muted-foreground">Last matched against bank feed <strong>2026-04-18 09:22</strong>. Two entries pending manual review.</p>
          </PopoverContent>
        </Popover>
      </ClientOnly>
    </div>
    <template #footer>
      <span>info-only · no actions</span>
    </template>
  </DemoCard>
  <DemoCard title="lg · w-80 · destructive action">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline">Archive invoice…</Button>
          </PopoverTrigger>
          <PopoverContent class="w-80">
            <p class="font-semibold leading-none tracking-tight">Archive INV-2026-0418-A1</p>
            <p class="mt-1 text-sm text-muted-foreground">Archived invoices are excluded from ageing reports. Restore from the archive tab within 90 days.</p>
            <div class="mt-3 grid gap-1.5">
              <Label for="pop-reason">Reason (optional)</Label>
              <Textarea id="pop-reason" placeholder="Paid offline, closed in parent system." />
            </div>
            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Checkbox id="pop-close-quote" />
                <Label for="pop-close-quote" class="font-normal text-muted-foreground">Also close linked quote</Label>
              </div>
              <div class="flex gap-2">
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="destructive" size="sm">Archive</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </ClientOnly>
    </div>
    <template #footer>
      <span>destructive confirm stays inside the surface, not a Dialog</span>
    </template>
  </DemoCard>
</VuedaDemo>

## DropdownMenu

DropdownMenu and ContextMenu share the same panel and item components — a design change to one must be mirrored in the other. The highlight recipe is `bg-accent text-accent-foreground`. Destructive items tint only the foreground at rest; on focus they add `bg-destructive/10`. Menu icons sit at `--muted-foreground` at rest and inherit `--accent-foreground` on highlight so the row reads as a unit.

Theme keys: {@api theme-key:DropdownMenuContent}, {@api theme-key:DropdownMenuItem}, {@api theme-key:DropdownMenuLabel}, {@api theme-key:DropdownMenuSeparator}. Token surface: {@api css-token:popover}, {@api css-token:popover-foreground}, {@api css-token:accent}, {@api css-token:destructive}.

<VuedaDemo class="grid gap-6 lg:grid-cols-3">
  <DemoCard title="row actions · mixed items">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              Row actions
              <FontAwesomeIcon :icon="faChevronDown" class="ml-1 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48">
            <DropdownMenuLabel>INV-2026-0418-A1</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faFileLines" />
              Open
              <DropdownMenuShortcut>↵</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faPen" />
              Edit
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faCopy" />
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faDownload" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FontAwesomeIcon :icon="faFileExport" />
                Export as
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>CSV</DropdownMenuItem>
                <DropdownMenuItem>XLSX</DropdownMenuItem>
                <DropdownMenuItem>PDF</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <FontAwesomeIcon :icon="faTrash" />
              Archive
              <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ClientOnly>
    </div>
    <template #footer>
      <span>icons: muted at rest · accent on highlight</span>
      <span>destructive: text tint only at rest</span>
    </template>
  </DemoCard>
  <DemoCard title="checkbox + radio items">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              View
              <FontAwesomeIcon :icon="faChevronDown" class="ml-1 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48">
            <DropdownMenuLabel :inset="true">COLUMNS</DropdownMenuLabel>
            <DropdownMenuCheckboxItem v-model="colCustomer">Customer</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem v-model="colAmount">Amount <DropdownMenuShortcut>$</DropdownMenuShortcut></DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem v-model="colDueDate">Due date</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem v-model="colPoNumber">PO number</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel :inset="true">SORT BY</DropdownMenuLabel>
            <DropdownMenuRadioGroup v-model="sortBy">
              <DropdownMenuRadioItem value="dueDate">Due date</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="amount">Amount</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="customer">Customer (A to Z)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ClientOnly>
    </div>
    <template #footer>
      <span>check: drawn SVG path · not a font glyph</span>
      <span>radio dot: <code>circle r="3"</code></span>
    </template>
  </DemoCard>
  <DemoCard title="with submenu · disabled item">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              File
              <FontAwesomeIcon :icon="faChevronDown" class="ml-1 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-44">
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faPlus" />
              New invoice
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faFolderOpen" />
              Open
              <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FontAwesomeIcon :icon="faShareNodes" />
                Share
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <FontAwesomeIcon :icon="faEnvelope" />
                  Email…
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Share link
                  <DropdownMenuShortcut>⇧⌘L</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>Copy to clipboard</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem :disabled="true">
              <FontAwesomeIcon :icon="faPrint" />
              Print
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ClientOnly>
    </div>
    <template #footer>
      <span>submenu: same surface · separate portal</span>
      <span>disabled: muted text · pointer-events-none</span>
    </template>
  </DemoCard>
  <DemoCard title="open panel anatomy — item state matrix · static" class="lg:col-span-3">
    <div class="flex flex-wrap gap-8 items-start">
      <div class="bg-popover text-popover-foreground rounded-vueda-control border p-1 shadow-vueda-popover w-52 shrink-0 text-sm">
        <div class="px-2 py-1.5 text-sm font-medium">INV-2026-0418-A1</div>
        <div class="bg-border -mx-1 my-1 h-px"></div>
        <div class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
          <FontAwesomeIcon :icon="faFileLines" class="size-4 shrink-0 text-muted-foreground" />
          Open
          <span class="ml-auto text-xs tracking-widest text-muted-foreground">↵</span>
        </div>
        <div class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm bg-accent text-accent-foreground">
          <FontAwesomeIcon :icon="faPen" class="size-4 shrink-0" />
          Edit
          <span class="ml-auto text-xs tracking-widest">⌘E</span>
        </div>
        <div class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
          <FontAwesomeIcon :icon="faCopy" class="size-4 shrink-0 text-muted-foreground" />
          Duplicate
          <span class="ml-auto text-xs tracking-widest text-muted-foreground">⌘D</span>
        </div>
        <div class="bg-border -mx-1 my-1 h-px"></div>
        <div class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive">
          <FontAwesomeIcon :icon="faTrash" class="size-4 shrink-0 text-destructive" />
          Archive
          <span class="ml-auto text-xs tracking-widest">⌘⌫</span>
        </div>
        <div class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive bg-destructive/10">
          <FontAwesomeIcon :icon="faTrash" class="size-4 shrink-0 text-destructive" />
          Archive
          <span class="ml-auto text-xs tracking-widest">⌘⌫</span>
        </div>
        <div class="bg-border -mx-1 my-1 h-px"></div>
        <div class="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-50 pointer-events-none">
          <FontAwesomeIcon :icon="faPrint" class="size-4 shrink-0 text-muted-foreground" />
          Print
          <span class="ml-auto text-xs tracking-widest text-muted-foreground">⌘P</span>
        </div>
      </div>
    </div>
    <template #footer>
      <span>icon at rest: <code>text-muted-foreground</code></span>
      <span>highlighted: <code>bg-accent text-accent-foreground</code> · icon inherits accent</span>
      <span>destructive at rest: foreground tint only · icon <code>text-destructive</code></span>
      <span>destructive focused: adds <code>bg-destructive/10</code></span>
      <span>disabled: <code>opacity-50 pointer-events-none</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## ContextMenu

ContextMenu uses the same panel and item primitives as DropdownMenu; the only difference is the trigger (right-click on a region rather than a button click). Any theme change to {@api theme-key:ContextMenuContent} or {@api theme-key:ContextMenuItem} must be mirrored in the DropdownMenu keys to keep both surfaces visually identical.

<VuedaDemo class="grid gap-6">
  <DemoCard title="on a list row · right-click to open">
    <ClientOnly>
      <ContextMenu>
        <ContextMenuTrigger class="flex cursor-default select-none items-center justify-between rounded-vueda-control border border-dashed border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50">
          <div class="grid gap-0.5">
            <span class="font-semibold text-foreground">INV-2026-0418-A1</span>
            <span class="font-mono text-xs text-muted-foreground">Acme Pressroom, Ltd. · $2,480.00 · overdue 6d</span>
          </div>
          <span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">right-click</span>
        </ContextMenuTrigger>
        <ContextMenuContent class="w-52">
          <ContextMenuItem>
            <FontAwesomeIcon :icon="faEnvelope" />
            Send reminder email
            <ContextMenuShortcut>⌘R</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Mark as sent
            <ContextMenuShortcut>⌘↵</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>Match to payment…</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel :inset="true">ASSIGN TO</ContextMenuLabel>
          <ContextMenuRadioGroup v-model="assignee">
            <ContextMenuRadioItem value="me">M. Abelardo (me)</ContextMenuRadioItem>
            <ContextMenuRadioItem value="iwasaki">T. Iwasaki</ContextMenuRadioItem>
            <ContextMenuRadioItem value="unassigned">Unassigned</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuItem>
            Copy reference
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem variant="destructive">
            <FontAwesomeIcon :icon="faTrash" />
            Void invoice
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </ClientOnly>
    <template #footer>
      <span>same surface + item primitive as DropdownMenu</span>
      <span>trigger: any right-click region · not a button</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Tooltip

Tooltip inverts the shared overlay surface: `bg-foreground` / `text-background` with the same `--vueda-control-radius` and an arrow sitting behind the panel edge. The inversion is a canonical choice: in dense operator screens, the contrast flip is what makes a tooltip register at a glance as a passing label rather than a panel.

Theme key: {@api theme-key:TooltipContent}. Token surface: {@api css-token:foreground}, {@api css-token:background}, {@api css-token:vueda-control-radius}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  <DemoCard title="bottom · default placement">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="Customer tax info">
                <FontAwesomeIcon :icon="faCircleInfo" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Customer tax ID on file</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="top">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button variant="outline">Reconcile</Button>
            </TooltipTrigger>
            <TooltipContent side="top">Match this invoice to a bank-feed transaction</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="right">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="Duplicate invoice">
                <FontAwesomeIcon :icon="faCopy" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Duplicate</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="left">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="Archive invoice">
                <FontAwesomeIcon :icon="faTrash" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Archive</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
  </DemoCard>
  <DemoCard title="with keyboard shortcut">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button variant="outline">Save</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Save invoice
              <kbd class="ml-1.5 inline-flex h-5 select-none items-center rounded border border-background/20 bg-background/10 px-1.5 font-mono text-[10px] font-medium">⌘S</kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
    <template #footer>
      <span><code>kbd</code>: border + bg at <code>/20</code> against foreground surface</span>
    </template>
  </DemoCard>
  <DemoCard title="wrapped · long content">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="Customer risk warning">
                <FontAwesomeIcon :icon="faTriangleExclamation" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" class="max-w-[220px] text-center">Customer hasn't responded in 14 days. Consider escalating to collections review.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
    <template #footer>
      <span>max-width: caller-supplied via <code>class</code></span>
    </template>
  </DemoCard>
  <DemoCard title="surface anatomy — inverted tokens · arrow · kbd · static" class="sm:col-span-2 lg:col-span-3">
    <div class="flex flex-wrap gap-8 items-start pt-2">
      <div class="flex flex-col items-center">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground self-start mb-2">plain label</span>
        <div class="bg-foreground text-background rounded-vueda-control px-3 py-1.5 text-xs whitespace-nowrap">Customer tax ID on file</div>
        <div class="size-2.5 bg-foreground rotate-45 rounded-[2px] -mt-[4px]"></div>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground self-start mb-2">with keyboard shortcut</span>
        <div class="bg-foreground text-background rounded-vueda-control px-3 py-1.5 text-xs inline-flex items-center whitespace-nowrap">
          Save invoice
          <kbd class="ml-1.5 inline-flex h-5 select-none items-center rounded border border-background/20 bg-background/10 px-1.5 font-mono text-[10px] font-medium">⌘S</kbd>
        </div>
        <div class="size-2.5 bg-foreground rotate-45 rounded-[2px] -mt-[4px]"></div>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground self-start mb-2">long content</span>
        <div class="bg-foreground text-background rounded-vueda-control px-3 py-1.5 text-xs max-w-[220px] text-center text-balance">Customer hasn't responded in 14 days. Consider escalating to collections review.</div>
        <div class="size-2.5 bg-foreground rotate-45 rounded-[2px] -mt-[4px]"></div>
      </div>
    </div>
    <template #footer>
      <span>surface: <code>bg-foreground text-background</code> · inverts the shared overlay palette</span>
      <span>radius: same <code>--vueda-control-radius</code> as all overlays</span>
      <span>arrow: rotated square · <code>size-2.5 rotate-45 rounded-[2px]</code> · same fill as surface</span>
      <span><code>kbd</code>: <code>border-background/20 bg-background/10</code> against the inverted surface</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Customization Surface

The shared overlay surface (`--popover`, `--popover-foreground`, `--border`, `--vueda-shadow-popover`) is the single dial that shifts all four components at once. Tooltip's inverted surface uses `--foreground` and `--background` directly and does not reference `--popover`, so a popover re-tone does not affect tooltips.

The highest-value theme keys for structural customization are:

- {@api theme-key:PopoverContent}: `root` (surface, padding defaults).
- {@api theme-key:DropdownMenuContent} and {@api theme-key:ContextMenuContent}: `root` (surface), each must remain visually identical.
- {@api theme-key:DropdownMenuItem} and {@api theme-key:ContextMenuItem}: `root` (base), `highlighted` (hover/focus recipe), `destructive` (color-only variant at rest).
- {@api theme-key:TooltipContent}: `root` (inverted surface, arrow, radius).
