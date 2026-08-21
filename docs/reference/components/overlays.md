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
import HoverCard from "@vueda/shell/hover-card/HoverCard.vue";
import HoverCardContent from "@vueda/shell/hover-card/HoverCardContent.vue";
import HoverCardTrigger from "@vueda/shell/hover-card/HoverCardTrigger.vue";
import Dialog from "@vueda/shell/dialog/Dialog.vue";
import DialogContent from "@vueda/shell/dialog/DialogContent.vue";
import DialogDescription from "@vueda/shell/dialog/DialogDescription.vue";
import DialogFooter from "@vueda/shell/dialog/DialogFooter.vue";
import DialogHeader from "@vueda/shell/dialog/DialogHeader.vue";
import DialogScrollContent from "@vueda/shell/dialog/DialogScrollContent.vue";
import DialogTitle from "@vueda/shell/dialog/DialogTitle.vue";
import DialogTrigger from "@vueda/shell/dialog/DialogTrigger.vue";
import Sheet from "@vueda/shell/sheet/Sheet.vue";
import SheetClose from "@vueda/shell/sheet/SheetClose.vue";
import SheetContent from "@vueda/shell/sheet/SheetContent.vue";
import SheetDescription from "@vueda/shell/sheet/SheetDescription.vue";
import SheetFooter from "@vueda/shell/sheet/SheetFooter.vue";
import SheetHeader from "@vueda/shell/sheet/SheetHeader.vue";
import SheetTitle from "@vueda/shell/sheet/SheetTitle.vue";
import SheetTrigger from "@vueda/shell/sheet/SheetTrigger.vue";
import AlertDialog from "@vueda/shell/alert-dialog/AlertDialog.vue";
import AlertDialogAction from "@vueda/shell/alert-dialog/AlertDialogAction.vue";
import AlertDialogCancel from "@vueda/shell/alert-dialog/AlertDialogCancel.vue";
import AlertDialogContent from "@vueda/shell/alert-dialog/AlertDialogContent.vue";
import AlertDialogDescription from "@vueda/shell/alert-dialog/AlertDialogDescription.vue";
import AlertDialogFooter from "@vueda/shell/alert-dialog/AlertDialogFooter.vue";
import AlertDialogHeader from "@vueda/shell/alert-dialog/AlertDialogHeader.vue";
import AlertDialogTitle from "@vueda/shell/alert-dialog/AlertDialogTitle.vue";
import AlertDialogTrigger from "@vueda/shell/alert-dialog/AlertDialogTrigger.vue";
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
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import Kbd from "@vueda/display/kbd/Kbd.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faBars,
  faChevronDown,
  faCircleCheck,
  faCircleInfo,
  faClock,
  faCopy,
  faDownload,
  faEnvelope,
  faFileExport,
  faFileLines,
  faFolderOpen,
  faLayerGroup,
  faListCheck,
  faPen,
  faPlus,
  faPrint,
  faShareNodes,
  faShieldHalved,
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

Overlays cover anchored popovers, menu panels, transient labels, modal dialogs,
edge sheets, and blocking confirmations. Popover, HoverCard, DropdownMenu,
and ContextMenu share one floating surface: `bg-popover` fill, a DPR-aware
`overlay-hairline` edge, `--vueda-control-radius` corners, and
`--vueda-shadow-popover` elevation. Dialog and AlertDialog use the modal
radius plus `overlay-hairline-elevated`; Sheet uses directional
`border-*-hairline` edges with the same overlay elevation. Tooltip
deliberately inverts the surface (`bg-foreground` / `text-background`) so it
reads as a transient label rather than an actionable panel.

This page is the visual contract for {@api vue:component:Popover},
{@api vue:component:HoverCard}, {@api vue:component:Dialog},
{@api vue:component:Sheet}, {@api vue:component:AlertDialog},
{@api vue:component:DropdownMenu}, {@api vue:component:ContextMenu}, and
{@api vue:component:Tooltip}. Menubar and NavigationMenu also open overlay
surfaces, but their triggers are navigation primitives, so their visual
coverage lives on [Navigation](./navigation). The Combobox and Select list
panels use the same floating surface; their triggers and open states are
documented on [Selection + Command](./selection-and-command).

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
            <Button emphasis="outline">Edit terms</Button>
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
              <Button emphasis="ghost" size="sm">Cancel</Button>
              <Button size="sm" tone="primary">Apply</Button>
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
            <Button emphasis="ghost" size="icon" aria-label="Reconciliation status">
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
            <Button emphasis="outline">Archive invoice…</Button>
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
                <Button emphasis="ghost" size="sm">Cancel</Button>
                <Button tone="destructive" size="sm">Archive</Button>
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

## HoverCard

HoverCard is a glance-weight summary popover, lighter than Popover. The
content panel is `w-64` (256 px) with {@api css-token:vueda-control-radius},
deliberately tighter than the actionable Popover surface. Use it for read-only
summaries: a profile by hovering a username, or a record summary by hovering
an ID.

Theme key: {@api theme-key:HoverCardContent}. Token surface:
{@api css-token:popover}, {@api css-token:popover-foreground},
{@api css-token:border}, {@api css-token:vueda-control-radius}, and
{@api css-token:vueda-shadow-popover}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="profile summary - initially open">
    <div class="flex justify-center py-8">
      <ClientOnly>
        <HoverCard :open-delay="0" :close-delay="150" :default-open="true">
          <HoverCardTrigger as-child>
            <Button emphasis="ghost">Jadesola Okafor</Button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="center">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">JO</div>
              <div class="grid gap-0.5">
                <div class="text-sm font-medium leading-tight">Jadesola Okafor</div>
                <div class="text-xs text-muted-foreground">j.okafor · Accounts</div>
              </div>
            </div>
            <p class="mt-3 text-xs leading-snug text-muted-foreground">
              Senior AR specialist. Posts to GL-4100 and GL-4105 only.
            </p>
            <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt class="text-muted-foreground">Role</dt>
              <dd class="font-mono">AR.Specialist</dd>
              <dt class="text-muted-foreground">Last login</dt>
              <dd>today, 13:52</dd>
              <dt class="text-muted-foreground">Posted</dt>
              <dd>1,284 invoices</dd>
            </dl>
          </HoverCardContent>
        </HoverCard>
      </ClientOnly>
    </div>
    <template #footer>
      <span>width <code>w-64</code></span>
      <span>padding <code>p-4</code></span>
      <span>surface from <code>HoverCardContent</code></span>
    </template>
  </DemoCard>
  <DemoCard title="record summary - hover trigger">
    <div class="flex justify-center py-8">
      <ClientOnly>
        <HoverCard :open-delay="0" :close-delay="150">
          <HoverCardTrigger as-child>
            <Button emphasis="outline">
              CUST-3487
              <FontAwesomeIcon :icon="faArrowUpRightFromSquare" class="ml-1 size-3" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</div>
            <div class="mt-1 text-sm font-medium leading-tight">Granger Holdings</div>
            <div class="text-xs text-muted-foreground">CUST-3487 · Net 30</div>
            <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt class="text-muted-foreground">Balance</dt>
              <dd class="font-mono">$24,108.50</dd>
              <dt class="text-muted-foreground">Open INV</dt>
              <dd class="font-mono">3</dd>
              <dt class="text-muted-foreground">DSO</dt>
              <dd class="font-mono">42d</dd>
              <dt class="text-muted-foreground">Credit</dt>
              <dd class="font-mono">$50,000</dd>
            </dl>
          </HoverCardContent>
        </HoverCard>
      </ClientOnly>
    </div>
    <template #footer>
      <span>summary only</span>
      <span>use Popover when the panel needs actions</span>
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
            <Button emphasis="outline">
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
              <DropdownMenuShortcut :keys="['↵']" />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faPen" />
              Edit
              <DropdownMenuShortcut :keys="['⌘', 'E']" />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faCopy" />
              Duplicate
              <DropdownMenuShortcut :keys="['⌘', 'D']" />
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
              <DropdownMenuShortcut :keys="['⌘', '⌫']" />
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
            <Button emphasis="outline">
              View
              <FontAwesomeIcon :icon="faChevronDown" class="ml-1 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48">
            <DropdownMenuLabel :inset="true">COLUMNS</DropdownMenuLabel>
            <DropdownMenuCheckboxItem v-model="colCustomer">Customer</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem v-model="colAmount">Amount <DropdownMenuShortcut :keys="['$']" /></DropdownMenuCheckboxItem>
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
            <Button emphasis="outline">
              File
              <FontAwesomeIcon :icon="faChevronDown" class="ml-1 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-44">
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faPlus" />
              New invoice
              <DropdownMenuShortcut :keys="['⌘', 'N']" />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faFolderOpen" />
              Open
              <DropdownMenuShortcut :keys="['⌘', 'O']" />
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
                  <DropdownMenuShortcut :keys="['⇧', '⌘', 'L']" />
                </DropdownMenuItem>
                <DropdownMenuItem>Copy to clipboard</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem :disabled="true">
              <FontAwesomeIcon :icon="faPrint" />
              Print
              <DropdownMenuShortcut :keys="['⌘', 'P']" />
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
  <DemoCard title="open panel anatomy" description=" (item state matrix, live)" class="lg:col-span-3">
    <div class="flex justify-center py-2 pb-64">
      <ClientOnly>
        <DropdownMenu :open="true">
          <DropdownMenuTrigger as-child>
            <Button emphasis="outline">INV-2026-0418-A1</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56" force-mount side="bottom" align="center" :side-offset="6" :avoid-collisions="false" @escape-key-down.prevent @pointer-down-outside.prevent @focus-outside.prevent @interact-outside.prevent>
            <DropdownMenuLabel>INV-2026-0418-A1</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FontAwesomeIcon :icon="faFileLines" />
              Open
              <DropdownMenuShortcut :keys="['↵']" />
            </DropdownMenuItem>
            <ForceState state="focus" as="block">
              <DropdownMenuItem>
                <FontAwesomeIcon :icon="faPen" />
                Edit
                <DropdownMenuShortcut :keys="['⌘', 'E']" />
              </DropdownMenuItem>
            </ForceState>
            <DropdownMenuItem disabled>
              <FontAwesomeIcon :icon="faCopy" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <FontAwesomeIcon :icon="faTrash" />
              Archive
              <DropdownMenuShortcut :keys="['⌘', '⌫']" />
            </DropdownMenuItem>
            <ForceState state="focus" as="block">
              <DropdownMenuItem variant="destructive">
                <FontAwesomeIcon :icon="faTrash" />
                Archive
                <DropdownMenuShortcut :keys="['⌘', '⌫']" />
              </DropdownMenuItem>
            </ForceState>
          </DropdownMenuContent>
        </DropdownMenu>
      </ClientOnly>
    </div>
    <template #footer>
      <span>every row is a real <code>DropdownMenuItem</code> in a real force-mounted panel, so this matrix cannot drift from <code>DropdownMenuItem.root</code></span>
      <span>rows 2 and 5 sit in a <code>ForceState</code> wrapper; the others are at rest</span>
      <span>disabled and destructive are the real <code>disabled</code> and <code>variant</code> props, which set <code>data-disabled</code> and <code>data-variant</code> for the theme to key off</span>
      <span>highlight is <code>focus:bg-accent</code>, driven by real DOM focus, so only one row could be highlighted for real; the docs shim paints the rest</span>
      <span>the panel is floating-ui positioned and cannot sit in grid flow, so the card reserves height below the trigger for it</span>
      <span>side and collision avoidance are pinned so the panel always lands in that reserved space instead of flipping above the trigger</span>
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
            <ContextMenuShortcut :keys="['⌘', 'R']" />
          </ContextMenuItem>
          <ContextMenuItem>
            Mark as sent
            <ContextMenuShortcut :keys="['⌘', '↵']" />
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
            <ContextMenuShortcut :keys="['⌘', 'C']" />
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

## Dialog

Dialog is the centered modal surface for focused work that needs a blocking
context but is not inherently destructive. Standard content uses the modal
radius with `overlay-hairline overlay-hairline-elevated`; the scroll content
variant preserves the same surface while letting the overlay own vertical
scroll.

Theme keys: {@api theme-key:DialogContent},
{@api theme-key:DialogScrollContent}, {@api theme-key:DialogHeader},
{@api theme-key:DialogTitle}, {@api theme-key:DialogDescription}, and
{@api theme-key:DialogFooter}. Token surface: {@api css-token:background},
{@api css-token:foreground}, {@api css-token:overlay},
{@api css-token:vueda-modal-radius}, and {@api css-token:vueda-shadow-overlay}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="standard modal">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <Dialog>
          <DialogTrigger as-child>
            <Button emphasis="outline">
              <FontAwesomeIcon :icon="faShieldHalved" />
              Review hold
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review payment hold</DialogTitle>
              <DialogDescription>
                Confirm the customer record, hold reason, and release criteria before changing payment status.
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-3 text-sm">
              <div class="rounded-vueda-control bg-muted/40 p-3">
                <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</div>
                <div class="mt-1 font-medium">Northwind Logistics</div>
                <div class="text-xs text-muted-foreground">Balance $18,240.00 · 2 invoices past due</div>
              </div>
              <div class="grid grid-cols-[16px_1fr] gap-2 text-muted-foreground">
                <FontAwesomeIcon :icon="faClock" class="mt-0.5" />
                <p class="m-0">The hold expires automatically in 48 hours if no action is taken.</p>
              </div>
            </div>
            <DialogFooter show-close-button>
              <Button tone="primary">
                <FontAwesomeIcon :icon="faCircleCheck" />
                Release hold
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ClientOnly>
    </div>
    <template #footer>
      <span>surface: <code>DialogContent</code></span>
      <span>edge + elevation: <code>overlay-hairline overlay-hairline-elevated</code></span>
    </template>
  </DemoCard>
  <DemoCard title="scroll content">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <Dialog>
          <DialogTrigger as-child>
            <Button emphasis="outline">
              <FontAwesomeIcon :icon="faListCheck" />
              Open long review
            </Button>
          </DialogTrigger>
          <DialogScrollContent>
            <DialogHeader>
              <DialogTitle>Reconciliation review</DialogTitle>
              <DialogDescription>
                Review ledger warnings before accepting the imported bank match.
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-3 text-sm">
              <div
                v-for="item in [
                  'Invoice date is 12 days older than the bank transaction.',
                  'Customer account has one unresolved credit memo.',
                  'Imported memo references a purchase order not found on the invoice.',
                  'Currency conversion uses the daily close rate, not the transaction timestamp.',
                  'Two similar payments were imported in the same batch.',
                  'The matched GL account differs from the customer default.'
                ]"
                :key="item"
                class="rounded-vueda-control bg-muted/40 p-3"
              >
                <div class="flex gap-2">
                  <FontAwesomeIcon :icon="faCircleInfo" class="mt-0.5 text-info" />
                  <p class="m-0 text-muted-foreground">{{ item }}</p>
                </div>
              </div>
            </div>
            <DialogFooter show-close-button>
              <Button tone="primary">Accept match</Button>
            </DialogFooter>
          </DialogScrollContent>
        </Dialog>
      </ClientOnly>
    </div>
    <template #footer>
      <span>surface: <code>DialogScrollContent</code></span>
      <span>overlay scrolls, modal surface keeps its elevated hairline</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Sheet

Sheet is the edge-attached modal surface for focused side work. The surface is
owned by {@api theme-key:SheetContent}; the `side` prop selects the matching
slide motion, edge side, and directional hairline: left sheets paint a right
edge, right sheets paint a left edge, top sheets paint a bottom edge, and
bottom sheets paint a top edge.

Theme keys: {@api theme-key:SheetContent}, {@api theme-key:SheetHeader},
{@api theme-key:SheetTitle}, {@api theme-key:SheetDescription}, and
{@api theme-key:SheetFooter}. Token surface: {@api css-token:background},
{@api css-token:foreground}, {@api css-token:border},
{@api css-token:overlay}, and {@api css-token:vueda-shadow-overlay}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="side sheets">
    <div class="grid gap-3 sm:grid-cols-2">
      <ClientOnly>
        <Sheet>
          <SheetTrigger as-child>
            <Button emphasis="outline">
              <FontAwesomeIcon :icon="faLayerGroup" />
              Right
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Invoice filters</SheetTitle>
              <SheetDescription>Refine the list without leaving the table.</SheetDescription>
            </SheetHeader>
            <div class="grid gap-3 px-4 text-sm">
              <label class="grid gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Status</span>
                <Input default-value="Overdue" />
              </label>
              <label class="grid gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Owner</span>
                <Input default-value="Collections team" />
              </label>
            </div>
            <SheetFooter>
              <SheetClose as-child>
                <Button tone="primary">Apply filters</Button>
              </SheetClose>
              <SheetClose as-child>
                <Button emphasis="ghost">Cancel</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </ClientOnly>
      <ClientOnly>
        <Sheet>
          <SheetTrigger as-child>
            <Button emphasis="outline">
              <FontAwesomeIcon :icon="faBars" />
              Left
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Record navigation</SheetTitle>
              <SheetDescription>Jump between sections in the current customer record.</SheetDescription>
            </SheetHeader>
            <div class="grid gap-2 px-4 text-sm">
              <Button emphasis="ghost" class="justify-start">Overview</Button>
              <Button emphasis="ghost" class="justify-start">Invoices</Button>
              <Button emphasis="ghost" class="justify-start">Contacts</Button>
            </div>
          </SheetContent>
        </Sheet>
      </ClientOnly>
    </div>
    <template #footer>
      <span>right uses <code>border-l-hairline</code></span>
      <span>left uses <code>border-r-hairline</code></span>
    </template>
  </DemoCard>
  <DemoCard title="top and bottom sheets">
    <div class="grid gap-3 sm:grid-cols-2">
      <ClientOnly>
        <Sheet>
          <SheetTrigger as-child>
            <Button emphasis="outline">
              <FontAwesomeIcon :icon="faArrowRight" class="-rotate-90" />
              Top
            </Button>
          </SheetTrigger>
          <SheetContent side="top">
            <SheetHeader>
              <SheetTitle>Sync status</SheetTitle>
              <SheetDescription>Three background jobs are running for this workspace.</SheetDescription>
            </SheetHeader>
            <div class="grid gap-2 px-4 pb-4 text-sm">
              <div class="rounded-vueda-control bg-muted/40 p-3">Stripe import is 82% complete.</div>
              <div class="rounded-vueda-control bg-muted/40 p-3">Ledger export is queued.</div>
            </div>
          </SheetContent>
        </Sheet>
      </ClientOnly>
      <ClientOnly>
        <Sheet>
          <SheetTrigger as-child>
            <Button emphasis="outline">
              <FontAwesomeIcon :icon="faArrowRight" class="rotate-90" />
              Bottom
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Bulk action summary</SheetTitle>
              <SheetDescription>Review the selected invoices before applying the action.</SheetDescription>
            </SheetHeader>
            <div class="grid gap-2 px-4 pb-4 text-sm">
              <div class="rounded-vueda-control bg-muted/40 p-3">12 invoices selected.</div>
              <div class="rounded-vueda-control bg-muted/40 p-3">$48,210.00 total balance.</div>
            </div>
          </SheetContent>
        </Sheet>
      </ClientOnly>
    </div>
    <template #footer>
      <span>top uses <code>border-b-hairline</code></span>
      <span>bottom uses <code>border-t-hairline</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## AlertDialog

AlertDialog is the blocking confirmation surface for consequential choices. It
uses the same centered modal geometry as Dialog, but the title, description,
and actions are optimized for confirmation flows where escape, cancel, and the
primary action must stay visually clear.

Theme keys: {@api theme-key:AlertDialogContent},
{@api theme-key:AlertDialogHeader}, {@api theme-key:AlertDialogTitle},
{@api theme-key:AlertDialogDescription}, {@api theme-key:AlertDialogFooter},
{@api theme-key:AlertDialogCancel}, and {@api theme-key:AlertDialogAction}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="destructive confirmation">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button tone="destructive">
              <FontAwesomeIcon :icon="faTrash" />
              Void invoice
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void INV-2026-0418-A1?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the invoice from ageing reports and records a void event in the audit trail. Payments already posted stay linked for review.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Alert variant="destructive">
              <FontAwesomeIcon :icon="faTriangleExclamation" />
              <AlertDescription>This action cannot be undone from the invoice list.</AlertDescription>
            </Alert>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction tone="destructive">Void invoice</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ClientOnly>
    </div>
    <template #footer>
      <span>surface: <code>AlertDialogContent</code></span>
      <span>same elevated hairline as standard modal Dialog</span>
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
              <Button emphasis="ghost" size="icon" aria-label="Customer tax info">
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
              <Button emphasis="outline">Reconcile</Button>
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
              <Button emphasis="ghost" size="icon" aria-label="Duplicate invoice">
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
              <Button emphasis="ghost" size="icon" aria-label="Archive invoice">
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
              <Button emphasis="outline">Save</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Save invoice
              <Kbd class="ml-1.5">⌘S</Kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ClientOnly>
    </div>
    <template #footer>
      <span><code>Kbd</code>: tooltip content adjusts keycap contrast</span>
    </template>
  </DemoCard>
  <DemoCard title="wrapped · long content">
    <div class="flex justify-center py-4">
      <ClientOnly>
        <TooltipProvider>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Button emphasis="ghost" size="icon" aria-label="Customer risk warning">
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
        <div data-slot="tooltip-content" class="bg-foreground text-background rounded-vueda-control px-3 py-1.5 text-xs whitespace-nowrap">Customer tax ID on file</div>
        <div class="size-2.5 bg-foreground rotate-45 rounded-[2px] -mt-[4px]"></div>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground self-start mb-2">with keyboard shortcut</span>
        <div data-slot="tooltip-content" class="bg-foreground text-background rounded-vueda-control px-3 py-1.5 text-xs inline-flex items-center whitespace-nowrap">
          Save invoice
          <Kbd class="ml-1.5">⌘S</Kbd>
        </div>
        <div class="size-2.5 bg-foreground rotate-45 rounded-[2px] -mt-[4px]"></div>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground self-start mb-2">long content</span>
        <div data-slot="tooltip-content" class="bg-foreground text-background rounded-vueda-control px-3 py-1.5 text-xs max-w-[220px] text-center text-balance">Customer hasn't responded in 14 days. Consider escalating to collections review.</div>
        <div class="size-2.5 bg-foreground rotate-45 rounded-[2px] -mt-[4px]"></div>
      </div>
    </div>
    <template #footer>
      <span>surface: <code>bg-foreground text-background</code> · inverts the shared overlay palette</span>
      <span>radius: same <code>--vueda-control-radius</code> as all overlays</span>
      <span>arrow: rotated square · <code>size-2.5 rotate-45 rounded-[2px]</code> · same fill as surface</span>
      <span><code>Kbd</code>: tooltip contrast variant against the inverted surface</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Customization Surface

The shared floating surface (`--popover`, `--popover-foreground`, `--border`,
`--vueda-shadow-popover`) is the single dial that shifts Popover, HoverCard,
DropdownMenu, ContextMenu, Menubar content, NavigationMenu viewports, Select
lists, Combobox lists, and normal Sonner toasts together. Dialog,
AlertDialog, and Sheet use `--background`, `--foreground`, `--overlay`, and
`--vueda-shadow-overlay` instead. Tooltip's inverted surface uses
`--foreground` and `--background` directly and does not reference `--popover`,
so a popover re-tone does not affect tooltips.

The highest-value theme keys for structural customization are:

- {@api theme-key:PopoverContent}: `root` (surface, padding defaults).
- {@api theme-key:HoverCardContent}: `root` (summary popover surface).
- {@api theme-key:DialogContent} and {@api theme-key:DialogScrollContent}: `root` (modal surface), `overlay` on scroll content.
- {@api theme-key:SheetContent}: `root` (edge-attached surface and side-specific hairline).
- {@api theme-key:AlertDialogContent}: `root` and `overlay` (blocking confirmation surface).
- {@api theme-key:DropdownMenuContent} and {@api theme-key:ContextMenuContent}: `root` (surface), each must remain visually identical.
- {@api theme-key:DropdownMenuItem} and {@api theme-key:ContextMenuItem}: `root` (base), `highlighted` (hover/focus recipe), `destructive` (color-only variant at rest).
- {@api theme-key:TooltipContent}: `root` (inverted surface, arrow, radius).
