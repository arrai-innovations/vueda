---
title: Selection + Command
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Select from "@vueda/controls/select/Select.vue";
import SelectContent from "@vueda/controls/select/SelectContent.vue";
import SelectGroup from "@vueda/controls/select/SelectGroup.vue";
import SelectItem from "@vueda/controls/select/SelectItem.vue";
import SelectLabel from "@vueda/controls/select/SelectLabel.vue";
import SelectSeparator from "@vueda/controls/select/SelectSeparator.vue";
import SelectTrigger from "@vueda/controls/select/SelectTrigger.vue";
import SelectValue from "@vueda/controls/select/SelectValue.vue";
import Combobox from "@vueda/controls/combobox/Combobox.vue";
import ComboboxAnchor from "@vueda/controls/combobox/ComboboxAnchor.vue";
import ComboboxEmpty from "@vueda/controls/combobox/ComboboxEmpty.vue";
import ComboboxGroup from "@vueda/controls/combobox/ComboboxGroup.vue";
import ComboboxInput from "@vueda/controls/combobox/ComboboxInput.vue";
import ComboboxItem from "@vueda/controls/combobox/ComboboxItem.vue";
import ComboboxItemIndicator from "@vueda/controls/combobox/ComboboxItemIndicator.vue";
import ComboboxList from "@vueda/controls/combobox/ComboboxList.vue";
import ComboboxSeparator from "@vueda/controls/combobox/ComboboxSeparator.vue";
import ComboboxTrigger from "@vueda/controls/combobox/ComboboxTrigger.vue";
import ComboboxViewport from "@vueda/controls/combobox/ComboboxViewport.vue";
import Command from "@vueda/controls/command/Command.vue";
import CommandDialog from "@vueda/controls/command/CommandDialog.vue";
import CommandEmpty from "@vueda/controls/command/CommandEmpty.vue";
import CommandGroup from "@vueda/controls/command/CommandGroup.vue";
import CommandInput from "@vueda/controls/command/CommandInput.vue";
import CommandItem from "@vueda/controls/command/CommandItem.vue";
import CommandList from "@vueda/controls/command/CommandList.vue";
import CommandSeparator from "@vueda/controls/command/CommandSeparator.vue";
import CommandShortcut from "@vueda/controls/command/CommandShortcut.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faBuilding, faCheck, faChartBar, faChevronDown, faFileLines, faMagnifyingGlass, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { ref } from "vue";

const commandOpen = ref(false);
</script>

# Selection + Command

The selection family covers portal-based choice controls and in-page command
palettes: Select, Combobox, and Command. Select and Combobox share the same
control sizing and focus treatment as buttons and inputs
({@api css-token:vueda-control-height}, 2 px focus ring at 2 px offset).
Command is an inline surface with no portal and sizes itself to its content.

This page is the visual contract the default theme guarantees. Use it as the
target spec when you re-skin: every cell shown here should still read as the
same control after a customization, even if its color, radius, or density
shifts. If a cell breaks, the change has crossed from skin into design
language.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). In
brief: values (color, dimension, duration) belong in
[CSS tokens](../theming/tokens.md); compositions (class arrangements,
state recipes) belong in [theme keys](../theming/keys.md).

The select and combobox "open content" cells below are static anatomy panels
rendered with the same Tailwind classes the theme keys produce. This avoids
the portal-positioning problem that would arise from forcing a real dropdown
open inside the docs grid. The closed trigger cells are all live components.

## Select: state matrix

Select is a portal-based choice control backed by Reka UI's SelectRoot state
machine. The trigger is the only visible element in the closed state; it
inherits the same hairline border, control height, and focus treatment as
buttons and inputs. The content panel renders in a portal.

Theme keys: {@api theme-key:SelectTrigger}, {@api theme-key:SelectContent},
{@api theme-key:SelectItem}, {@api theme-key:SelectLabel},
{@api theme-key:SelectSeparator}.
Token surface: {@api css-token:border} (trigger stroke),
{@api css-token:ring} (focus outline),
{@api css-token:destructive} (invalid outline),
{@api css-token:popover} (content fill),
{@api css-token:accent} (highlighted item fill).

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="trigger states">
    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
      <StateLabel>placeholder</StateLabel>
      <StateLabel>filled</StateLabel>
      <div>
        <Select>
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Select terms..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
            <SelectItem value="net60">Net 60</SelectItem>
            <SelectItem value="net90">Net 90</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select default-value="net30">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
            <SelectItem value="net60">Net 60</SelectItem>
            <SelectItem value="net90">Net 90</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>invalid</StateLabel>
      <div>
        <ForceState state="focus" as="block">
          <Select default-value="net30">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="net30">Net 30</SelectItem>
            </SelectContent>
          </Select>
        </ForceState>
      </div>
      <div>
        <Select>
          <SelectTrigger class="w-full" aria-invalid="true">
            <SelectValue placeholder="Required" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
      <StateLabel>disabled</StateLabel>
      <div></div>
      <div>
        <Select default-value="net30">
          <SelectTrigger class="w-full" disabled>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <template #footer>
      <span>border <code>--border</code></span>
      <span>placeholder fg <code>--muted-foreground</code></span>
      <span>focus outline <code>--ring</code></span>
      <span>invalid outline <code>--destructive</code></span>
      <span>disabled opacity-50</span>
    </template>
  </DemoCard>
  <DemoCard title="trigger sizes">
    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
      <StateLabel>sm · 28px</StateLabel>
      <StateLabel>default · 32px <span class="font-normal normal-case">(canon)</span></StateLabel>
      <div>
        <Select default-value="net30">
          <SelectTrigger size="sm" class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
            <SelectItem value="net60">Net 60</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select default-value="net30">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net30">Net 30</SelectItem>
            <SelectItem value="net60">Net 60</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <template #footer>
      <span><code>size="sm"</code> → 28px via <code>--vueda-control-height-sm</code></span>
      <span><code>size="default"</code> → 32px (canon)</span>
      <span>no lg variant on SelectTrigger</span>
    </template>
  </DemoCard>
  <DemoCard title="open content anatomy — groups, labels, separator, indicator, highlighted, disabled" class="sm:col-span-2">
    <div class="flex gap-8 flex-wrap items-start">
      <div class="flex flex-col gap-2">
        <StateLabel>trigger · open (interactive)</StateLabel>
        <Select default-value="net30">
          <SelectTrigger class="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Standard</SelectLabel>
              <SelectItem value="net30">Net 30</SelectItem>
              <SelectItem value="net60">Net 60</SelectItem>
              <SelectItem value="net90">Net 90</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Custom</SelectLabel>
              <SelectItem value="receipt">Due on receipt</SelectItem>
              <SelectItem value="contract" disabled>Contract terms</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div class="flex flex-col gap-2">
        <StateLabel>content panel · static anatomy</StateLabel>
        <div class="bg-popover text-popover-foreground rounded-vueda-control border shadow-vueda-popover p-1 w-52 text-sm">
          <div class="text-muted-foreground px-2 py-1.5 text-xs">Standard</div>
          <div class="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 bg-accent text-accent-foreground">
            Net 30
            <span class="absolute right-2 flex size-3.5 items-center justify-center">
              <FontAwesomeIcon :icon="faCheck" class="size-3" />
            </span>
          </div>
          <div class="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2">
            Net 60
          </div>
          <div class="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2">
            Net 90
          </div>
          <div class="bg-border -mx-1 h-px my-1"></div>
          <div class="text-muted-foreground px-2 py-1.5 text-xs">Custom</div>
          <div class="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 hover:bg-accent hover:text-accent-foreground">
            Due on receipt
          </div>
          <div class="relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 opacity-50 pointer-events-none">
            Contract terms
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <span>content bg <code>--popover</code></span>
      <span>label fg <code>--muted-foreground</code>, text-xs</span>
      <span>highlighted bg <code>--accent</code>, fg <code>--accent-foreground</code></span>
      <span>check indicator absolute right-2</span>
      <span>separator <code>--border</code></span>
      <span>disabled opacity-50 pointer-events-none</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Combobox

Combobox is a "Select with search" backed by Reka UI's ComboboxRoot state
machine. The anchor shows the selected value (or placeholder) as a
button-shaped trigger; clicking opens a portal-rendered
{@api theme-key:ComboboxList} with a {@api theme-key:ComboboxInput} search
row at the top, followed by filtered {@api theme-key:ComboboxItem} options.
The item filtering is built in and updates as the user types.

The practical implementation is {@api vue:component:WidgetCombobox}, which
wires up the full trigger/list/search/items composition and connects to a
VUEDA field context. The raw primitives shown here are the building blocks it
composes from.

Theme keys: {@api theme-key:ComboboxList}, {@api theme-key:ComboboxInput},
{@api theme-key:ComboboxItem}, {@api theme-key:ComboboxGroup},
{@api theme-key:ComboboxEmpty}, {@api theme-key:ComboboxSeparator},
{@api theme-key:ComboboxItemIndicator}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="anchor + trigger — live; click to open list">
    <div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">placeholder</div>
      <Combobox>
        <ComboboxAnchor class="w-full">
          <ComboboxTrigger
            class="hairline flex w-full h-vueda-control items-center justify-between gap-2 rounded-vueda-control bg-transparent px-vueda-control-px text-sm whitespace-nowrap shadow-vueda-control focus-visible:hairline-ring focus-visible:focus-ring-shadow disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <span class="text-muted-foreground">Select customer...</span>
            <FontAwesomeIcon :icon="faChevronDown" class="size-4 opacity-50" />
          </ComboboxTrigger>
        </ComboboxAnchor>
        <ComboboxList class="w-[var(--reka-combobox-trigger-width)]">
          <ComboboxInput placeholder="Search..." />
          <ComboboxViewport>
            <ComboboxEmpty>No customers found.</ComboboxEmpty>
            <ComboboxGroup heading="Customers">
              <ComboboxItem value="acme-corp">
                <FontAwesomeIcon :icon="faBuilding" />
                Acme Corp.
                <ComboboxItemIndicator>
                  <FontAwesomeIcon :icon="faCheck" />
                </ComboboxItemIndicator>
              </ComboboxItem>
              <ComboboxItem value="acme-industrial">
                <FontAwesomeIcon :icon="faBuilding" />
                Acme Industrial
                <ComboboxItemIndicator>
                  <FontAwesomeIcon :icon="faCheck" />
                </ComboboxItemIndicator>
              </ComboboxItem>
              <ComboboxItem value="acme-logistics">
                <FontAwesomeIcon :icon="faBuilding" />
                Acme Logistics
                <ComboboxItemIndicator>
                  <FontAwesomeIcon :icon="faCheck" />
                </ComboboxItemIndicator>
              </ComboboxItem>
            </ComboboxGroup>
          </ComboboxViewport>
        </ComboboxList>
      </Combobox>
    </div>
    <template #footer>
      <span>trigger uses hairline border + shadow-vueda-control</span>
      <span>list width tracks trigger via <code>--reka-combobox-trigger-width</code></span>
      <span>check indicator from ComboboxItemIndicator</span>
    </template>
  </DemoCard>
  <DemoCard title="open list anatomy — search input, grouped items, empty state">
    <div class="flex flex-col gap-4">
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">filtered results</div>
        <div class="bg-popover text-popover-foreground rounded-vueda-control border shadow-vueda-popover overflow-hidden w-64">
          <div class="flex h-9 items-center gap-2 border-b px-3">
            <FontAwesomeIcon :icon="faMagnifyingGlass" class="size-4 opacity-50 shrink-0" />
            <input class="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" value="acme" readonly />
          </div>
          <div class="max-h-[300px] overflow-y-auto p-1">
            <div class="overflow-hidden p-1 text-foreground">
              <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Customers</div>
              <div class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm bg-accent text-accent-foreground">
                <FontAwesomeIcon :icon="faBuilding" class="size-4" />
                Acme Corp.
              </div>
              <div class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                <FontAwesomeIcon :icon="faBuilding" class="size-4" />
                Acme Industrial
              </div>
              <div class="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                <FontAwesomeIcon :icon="faBuilding" class="size-4" />
                Acme Logistics
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">empty state</div>
        <div class="bg-popover text-popover-foreground rounded-vueda-control border shadow-vueda-popover overflow-hidden w-64">
          <div class="flex h-9 items-center gap-2 border-b px-3">
            <FontAwesomeIcon :icon="faMagnifyingGlass" class="size-4 opacity-50 shrink-0" />
            <input class="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" value="zzqq" readonly />
          </div>
          <div class="py-6 text-center text-sm text-muted-foreground">No results.</div>
        </div>
      </div>
    </div>
    <template #footer>
      <span>list bg <code>--popover</code></span>
      <span>search row <code>h-9 border-b</code> separates from items</span>
      <span>highlighted bg <code>--accent</code></span>
      <span>empty <code>py-6 text-center text-sm</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## Command

Command is an inline command palette that renders its full tree in-place with
no portal. It is built on Reka UI's ListboxRoot + ListboxFilter primitives and
provides its own filter context
({@api js:function:@arrai-innovations/vueda/use/useCommand#useCommand}) so
groups and items can self-hide based on the current search term. Items disappear when
their text content does not match the filter; groups disappear when all their
items do.

For a modal variant, wrap Command in {@api theme-key:CommandDialog}, which
opens it inside a Dialog. The dialog header is `sr-only` so the
`title` and `description` props are accessible without visual duplication.

Theme keys: {@api theme-key:Command}, {@api theme-key:CommandInput},
{@api theme-key:CommandList}, {@api theme-key:CommandGroup},
{@api theme-key:CommandItem}, {@api theme-key:CommandShortcut},
{@api theme-key:CommandEmpty}, {@api theme-key:CommandSeparator},
{@api theme-key:CommandDialog}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="inline palette — groups, shortcuts, separator; type to filter live">
    <div class="rounded-md border bg-popover text-popover-foreground overflow-hidden">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandGroup heading="Suggestions">
            <CommandItem value="new-invoice">
              <FontAwesomeIcon :icon="faFileLines" />
              New invoice
              <CommandShortcut>⌘ N</CommandShortcut>
            </CommandItem>
            <CommandItem value="send-statement">
              <FontAwesomeIcon :icon="faPaperPlane" />
              Send statement
              <CommandShortcut>⌘ ⇧ S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem value="go-receivables">
              <FontAwesomeIcon :icon="faChartBar" />
              Go to receivables
              <CommandShortcut>G R</CommandShortcut>
            </CommandItem>
            <CommandItem value="find-customer">
              <FontAwesomeIcon :icon="faBuilding" />
              Find customer
              <CommandShortcut>⌘ K</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
    <template #footer>
      <span>command bg <code>--popover</code></span>
      <span>highlighted bg <code>--accent</code></span>
      <span>shortcut fg <code>--muted-foreground</code>, text-xs tracking-widest</span>
      <span>separator <code>--border</code>, -mx-1</span>
    </template>
  </DemoCard>
  <DemoCard title="empty state — no items match; disabled item">
    <div class="rounded-md border bg-popover text-popover-foreground overflow-hidden">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem value="new-invoice-b">
              <FontAwesomeIcon :icon="faFileLines" />
              New invoice
            </CommandItem>
            <CommandItem value="send-statement-b" disabled>
              <FontAwesomeIcon :icon="faPaperPlane" />
              Send statement
              <CommandShortcut>⌘ ⇧ S</CommandShortcut>
            </CommandItem>
            <CommandItem value="find-customer-b">
              <FontAwesomeIcon :icon="faBuilding" />
              Find customer
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
    <p class="text-xs text-muted-foreground m-0">
      Type something that does not match any item label to trigger the empty
      state. Disabled items are excluded from selection and keyboard navigation.
    </p>
    <template #footer>
      <span>CommandEmpty renders only when <code>filtered.count === 0</code></span>
      <span><code>py-6 text-center text-sm</code></span>
      <span>disabled opacity-50 pointer-events-none</span>
    </template>
  </DemoCard>
  <DemoCard title="CommandDialog — Command wrapped in a modal; click to open live demo" class="sm:col-span-2">
    <div class="flex items-start gap-6 flex-wrap">
      <div class="flex flex-col gap-2">
        <StateLabel>trigger pattern</StateLabel>
        <button
          class="hairline flex h-vueda-control items-center gap-2 rounded-vueda-control bg-transparent px-vueda-control-px text-sm text-muted-foreground shadow-vueda-control hover:text-foreground focus-visible:hairline-ring focus-visible:focus-ring-shadow"
          @click="commandOpen = true"
        >
          <FontAwesomeIcon :icon="faMagnifyingGlass" />
          Search or run a command
          <span class="ml-auto font-mono text-xs opacity-70">⌘ K</span>
        </button>
        <CommandDialog
          v-model:open="commandOpen"
          title="Command Palette"
          description="Search for a command to run"
        >
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem value="cdlg-new-invoice" @select="commandOpen = false">
                <FontAwesomeIcon :icon="faFileLines" />
                New invoice
                <CommandShortcut>⌘ N</CommandShortcut>
              </CommandItem>
              <CommandItem value="cdlg-send-statement" @select="commandOpen = false">
                <FontAwesomeIcon :icon="faPaperPlane" />
                Send statement
              </CommandItem>
              <CommandItem value="cdlg-find-customer" @select="commandOpen = false">
                <FontAwesomeIcon :icon="faBuilding" />
                Find customer
                <CommandShortcut>⌘ K</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
      <div class="flex-1 min-w-0 text-xs text-muted-foreground flex flex-col gap-2">
        <p class="m-0">
          CommandDialog wraps Command inside a Dialog. The slot content goes
          directly into the Command root — no extra wrapping needed. The dialog
          header (<code>DialogTitle</code>, <code>DialogDescription</code>) is
          <code>sr-only</code>: accessible to screen readers, not visible.
        </p>
        <p class="m-0">
          Theme key <code>CommandDialog.content</code> strips the default dialog
          padding (<code>overflow-hidden p-0</code>) so the Command's own input
          border and rounded corners sit flush. <code>CommandDialog.header</code>
          applies <code>sr-only</code>.
        </p>
      </div>
    </div>
    <template #footer>
      <span>dialog bg <code>--background</code></span>
      <span>scrim <code>oklch(0.12 0.015 250 / 0.6)</code></span>
      <span>slot content goes directly into Command root</span>
    </template>
  </DemoCard>
</VuedaDemo>
