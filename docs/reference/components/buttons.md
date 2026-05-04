---
title: Buttons
status: brainstorming
audience: designer
type: reference
---

<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ButtonGroup from "@vueda/controls/button-group/ButtonGroup.vue";
import ButtonGroupSeparator from "@vueda/controls/button-group/ButtonGroupSeparator.vue";
import ButtonGroupText from "@vueda/controls/button-group/ButtonGroupText.vue";
import Switch from "@vueda/controls/switch/Switch.vue";
import Toggle from "@vueda/controls/toggle/Toggle.vue";
import ToggleGroup from "@vueda/controls/toggle-group/ToggleGroup.vue";
import ToggleGroupItem from "@vueda/controls/toggle-group/ToggleGroupItem.vue";
import Kbd from "@vueda/display/kbd/Kbd.vue";
import KbdGroup from "@vueda/display/kbd/KbdGroup.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faEllipsis, faFileExport, faFloppyDisk, faGear, faTrash } from "@fortawesome/free-solid-svg-icons";
</script>

# Buttons

The button family covers every clickable affordance in vueda: primary buttons,
button groups, toggles, switches, and the keyboard caps that pair with them.
All variants share the same control sizing (32 / 28 / 40, governed by
{@api css-token:vueda-control-height} and its sm / lg companions) and focus
treatment (2 px solid {@api css-token:ring} outline at 2 px offset).

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

## Button: state matrix

Every variant × size × state the default theme renders. The matrix below
exercises the same Tailwind utilities the real component does, with hover and
focus-visible reproduced via the docs harness so every cell is verifiable
without pointer or keyboard.

Theme keys: {@api theme-key:Button}, composing
{@api theme-key:\_ButtonBase} plus one of
{@api theme-key:\_ButtonDefault},
{@api theme-key:\_ButtonSecondary},
{@api theme-key:\_ButtonOutline},
{@api theme-key:\_ButtonGhost},
{@api theme-key:\_ButtonDestructive},
or {@api theme-key:\_ButtonLink} per variant. To restyle every button-shaped
surface in the app (calendar day cells, pagination items, dialog actions),
override the matching `_Button*` meta key rather than `Button` itself.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      default <span class="font-normal normal-case">(primary CTA)</span>
    </header>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div><Button size="sm" variant="default">Save</Button></div>
      <div><Button variant="default">Save</Button></div>
      <div><Button size="lg" variant="default">Save</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div><ForceState state="hover"><Button variant="default">Save</Button></ForceState></div>
      <div><ForceState state="focus"><Button variant="default">Save</Button></ForceState></div>
      <div><Button variant="default" disabled>Save</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-lg</div>
      <div><Button size="icon-sm" variant="default" aria-label="Save"><FontAwesomeIcon :icon="faFloppyDisk" /></Button></div>
      <div><Button size="icon" variant="default" aria-label="Save"><FontAwesomeIcon :icon="faFloppyDisk" /></Button></div>
      <div><Button size="icon-lg" variant="default" aria-label="Save"><FontAwesomeIcon :icon="faFloppyDisk" /></Button></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">bg <code>--primary</code></span>
      <span class="whitespace-nowrap">fg <code>--primary-foreground</code></span>
      <span class="whitespace-nowrap">hover <code>--primary</code>/90</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      secondary
    </header>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div><Button size="sm" variant="secondary">Export</Button></div>
      <div><Button variant="secondary">Export</Button></div>
      <div><Button size="lg" variant="secondary">Export</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div><ForceState state="hover"><Button variant="secondary">Export</Button></ForceState></div>
      <div><ForceState state="focus"><Button variant="secondary">Export</Button></ForceState></div>
      <div><Button variant="secondary" disabled>Export</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-lg</div>
      <div><Button size="icon-sm" variant="secondary" aria-label="Export"><FontAwesomeIcon :icon="faFileExport" /></Button></div>
      <div><Button size="icon" variant="secondary" aria-label="Export"><FontAwesomeIcon :icon="faFileExport" /></Button></div>
      <div><Button size="icon-lg" variant="secondary" aria-label="Export"><FontAwesomeIcon :icon="faFileExport" /></Button></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">bg <code>--secondary</code></span>
      <span class="whitespace-nowrap">fg <code>--secondary-foreground</code></span>
      <span class="whitespace-nowrap">hover <code>--secondary</code>/80</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      outline
    </header>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div><Button size="sm" variant="outline">Cancel</Button></div>
      <div><Button variant="outline">Cancel</Button></div>
      <div><Button size="lg" variant="outline">Cancel</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div><ForceState state="hover"><Button variant="outline">Cancel</Button></ForceState></div>
      <div><ForceState state="focus"><Button variant="outline">Cancel</Button></ForceState></div>
      <div><Button variant="outline" disabled>Cancel</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-lg</div>
      <div><Button size="icon-sm" variant="outline" aria-label="Settings"><FontAwesomeIcon :icon="faGear" /></Button></div>
      <div><Button size="icon" variant="outline" aria-label="Settings"><FontAwesomeIcon :icon="faGear" /></Button></div>
      <div><Button size="icon-lg" variant="outline" aria-label="Settings"><FontAwesomeIcon :icon="faGear" /></Button></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">border <code>--border</code></span>
      <span class="whitespace-nowrap">bg <code>--background</code></span>
      <span class="whitespace-nowrap">hover bg <code>--accent</code></span>
      <span class="whitespace-nowrap">hover fg <code>--accent-foreground</code></span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      ghost
    </header>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div><Button size="sm" variant="ghost">More</Button></div>
      <div><Button variant="ghost">More</Button></div>
      <div><Button size="lg" variant="ghost">More</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div><ForceState state="hover"><Button variant="ghost">More</Button></ForceState></div>
      <div><ForceState state="focus"><Button variant="ghost">More</Button></ForceState></div>
      <div><Button variant="ghost" disabled>More</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-lg</div>
      <div><Button size="icon-sm" variant="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button></div>
      <div><Button size="icon" variant="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button></div>
      <div><Button size="icon-lg" variant="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">bg transparent</span>
      <span class="whitespace-nowrap">hover bg <code>--accent</code></span>
      <span class="whitespace-nowrap">hover fg <code>--accent-foreground</code></span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      destructive
    </header>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div><Button size="sm" variant="destructive">Delete</Button></div>
      <div><Button variant="destructive">Delete</Button></div>
      <div><Button size="lg" variant="destructive">Delete</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div><ForceState state="hover"><Button variant="destructive">Delete</Button></ForceState></div>
      <div><ForceState state="focus"><Button variant="destructive">Delete</Button></ForceState></div>
      <div><Button variant="destructive" disabled>Delete</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">icon-lg</div>
      <div><Button size="icon-sm" variant="destructive" aria-label="Delete"><FontAwesomeIcon :icon="faTrash" /></Button></div>
      <div><Button size="icon" variant="destructive" aria-label="Delete"><FontAwesomeIcon :icon="faTrash" /></Button></div>
      <div><Button size="icon-lg" variant="destructive" aria-label="Delete"><FontAwesomeIcon :icon="faTrash" /></Button></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">bg <code>--destructive</code></span>
      <span class="whitespace-nowrap">fg <code>--destructive-foreground</code></span>
      <span class="whitespace-nowrap">hover <code>--destructive</code>/90</span>
      <span class="whitespace-nowrap">ring <code>--destructive</code></span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      link <span class="font-normal normal-case">(inline only)</span>
    </header>
    <div class="flex flex-wrap items-baseline gap-3">
      <div class="flex flex-col gap-1">
        <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
        <Button variant="link">View audit history</Button>
      </div>
      <div class="flex flex-col gap-1">
        <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
        <ForceState state="hover"><Button variant="link">View audit history</Button></ForceState>
      </div>
      <div class="flex flex-col gap-1">
        <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
        <ForceState state="focus"><Button variant="link">View audit history</Button></ForceState>
      </div>
      <div class="flex flex-col gap-1">
        <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
        <Button variant="link" disabled>View audit history</Button>
      </div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">fg <code>--primary</code></span>
      <span class="whitespace-nowrap">hover underline</span>
      <span class="whitespace-nowrap">use inside running text, not toolbars</span>
    </footer>
  </section>
</div>

## ButtonGroup: composition matrix

ButtonGroup adjusts its children's border radii and shared edges so adjacent
buttons read as a single control. The interesting axis is _composition_:
orientation, child variant, and what kind of children sit inside (buttons,
static text, separators). Child-button state shifts (hover, focus, disabled)
are already covered by the [Button matrix](#button-state-matrix) above.

Theme keys: {@api theme-key:ButtonGroup},
{@api theme-key:ButtonGroupText},
{@api theme-key:ButtonGroupSeparator}. The seam treatment is a child-radius
override applied via the parent's data attributes, so re-skinning the seam
means editing these keys, not the token layer.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      horizontal · outline
    </header>
    <ButtonGroup>
      <Button variant="outline">Prev</Button>
      <Button variant="outline">Next</Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button size="sm" variant="outline">Day</Button>
      <Button size="sm" variant="outline">Week</Button>
      <Button size="sm" variant="outline">Month</Button>
      <Button size="sm" variant="outline">Quarter</Button>
    </ButtonGroup>
    <footer class="text-xs text-muted-foreground">
      adjacent buttons drop inner radius and share a 1 px seam
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      horizontal · secondary
    </header>
    <ButtonGroup>
      <Button size="sm" variant="secondary">$</Button>
      <Button size="sm" variant="secondary">€</Button>
      <Button size="sm" variant="secondary">£</Button>
      <Button size="sm" variant="secondary">¥</Button>
    </ButtonGroup>
    <footer class="text-xs text-muted-foreground">
      same composition rules apply across child variants
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      vertical
    </header>
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Approve</Button>
      <Button variant="outline">Defer</Button>
      <Button variant="outline">Reject</Button>
    </ButtonGroup>
    <footer class="text-xs text-muted-foreground">
      stack actions when the parent layout reads vertically
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      with text label
    </header>
    <ButtonGroup>
      <ButtonGroupText>Currency</ButtonGroupText>
      <Button variant="outline">USD</Button>
      <Button variant="outline">CAD</Button>
      <Button variant="outline">EUR</Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button variant="outline">Sync</Button>
      <ButtonGroupText>3 min ago</ButtonGroupText>
    </ButtonGroup>
    <footer class="text-xs text-muted-foreground">
      static label or status reading sits inside the group's seam
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4 sm:col-span-2">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      with separator
    </header>
    <ButtonGroup>
      <Button variant="outline">Save</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Save and add another</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Save and continue</Button>
    </ButtonGroup>
    <footer class="text-xs text-muted-foreground">
      use a separator when peer actions are co-equal but not interchangeable
    </footer>
  </section>
</div>

## Toggle: state matrix

Toggle adds a `pressed` axis on top of Button's variant × size × state cube.
Each cell shows the size row and state row twice: once unpressed, once
pressed, so the press delta is visible against every other state.

Theme key: {@api theme-key:Toggle}. The pressed surface reads from
{@api css-token:accent} / {@api css-token:accent-foreground}, the same pair
that drives hover on ghost and outline buttons; rebranding the accent shifts
all three in lockstep.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      default
    </header>
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">off</div>
      <div><Toggle size="sm">B</Toggle></div>
      <div><Toggle>B</Toggle></div>
      <div><Toggle size="lg">B</Toggle></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">on</div>
      <div><Toggle size="sm" default-pressed>B</Toggle></div>
      <div><Toggle default-pressed>B</Toggle></div>
      <div><Toggle size="lg" default-pressed>B</Toggle></div>
    </div>
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">off</div>
      <div><ForceState state="hover"><Toggle>B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle>B</Toggle></ForceState></div>
      <div><Toggle disabled>B</Toggle></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">on</div>
      <div><ForceState state="hover"><Toggle default-pressed>B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle default-pressed>B</Toggle></ForceState></div>
      <div><Toggle default-pressed disabled>B</Toggle></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">off bg transparent</span>
      <span class="whitespace-nowrap">on bg <code>--accent</code></span>
      <span class="whitespace-nowrap">on fg <code>--accent-foreground</code></span>
      <span class="whitespace-nowrap">hover bg <code>--muted</code></span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      outline
    </header>
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">sm</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">lg</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">off</div>
      <div><Toggle variant="outline" size="sm">B</Toggle></div>
      <div><Toggle variant="outline">B</Toggle></div>
      <div><Toggle variant="outline" size="lg">B</Toggle></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">on</div>
      <div><Toggle variant="outline" size="sm" default-pressed>B</Toggle></div>
      <div><Toggle variant="outline" default-pressed>B</Toggle></div>
      <div><Toggle variant="outline" size="lg" default-pressed>B</Toggle></div>
    </div>
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">off</div>
      <div><ForceState state="hover"><Toggle variant="outline">B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle variant="outline">B</Toggle></ForceState></div>
      <div><Toggle variant="outline" disabled>B</Toggle></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">on</div>
      <div><ForceState state="hover"><Toggle variant="outline" default-pressed>B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle variant="outline" default-pressed>B</Toggle></ForceState></div>
      <div><Toggle variant="outline" default-pressed disabled>B</Toggle></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">border <code>--border</code></span>
      <span class="whitespace-nowrap">off bg <code>--background</code></span>
      <span class="whitespace-nowrap">on bg <code>--accent</code></span>
      <span class="whitespace-nowrap">on fg <code>--accent-foreground</code></span>
    </footer>
  </section>
</div>

## ToggleGroup: composition matrix

ToggleGroup's interesting axis is composition (selection mode, spacing,
child variant), not state. Per-item states are covered by the
[Toggle matrix](#toggle-state-matrix) above.

Theme keys: {@api theme-key:ToggleGroup},
{@api theme-key:ToggleGroupItem}. Items compose from the Toggle key, so a
restyle of {@api theme-key:Toggle} flows through here automatically.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      single · default spacing
    </header>
    <ToggleGroup type="single" default-value="left">
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
    <footer class="text-xs text-muted-foreground">
      one selected at a time, items keep their own radius
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      single · joined <span class="font-normal normal-case">(spacing="0", variant="outline")</span>
    </header>
    <ToggleGroup type="single" variant="outline" spacing="0" default-value="day">
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
    </ToggleGroup>
    <footer class="text-xs text-muted-foreground">
      adjacent items share a 1 px seam, outer radius preserved
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4 sm:col-span-2">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      multiple
    </header>
    <ToggleGroup type="multiple" :default-value="['bold', 'italic']">
      <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
    </ToggleGroup>
    <footer class="text-xs text-muted-foreground">
      any combination selectable, each item toggles independently
    </footer>
  </section>
</div>

## Switch: state matrix

Switch has no variant or size axis in the current skin, so the matrix
collapses to `off | on` × `default | hover | focus-visible | disabled`.

Theme key: {@api theme-key:Switch}. Token surface: {@api css-token:input}
(off track), {@api css-token:primary} (on track), {@api css-token:background}
(thumb), {@api css-token:ring} (focus). Switch is the one place a brand's
{@api css-token:primary} reads as a _fill_ rather than as a CTA; verify the
on-track contrast against the thumb when retoning primary.

<div class="not-prose">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <div class="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-x-3 gap-y-2">
      <div></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">default</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">hover</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">focus-visible</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">off</div>
      <div><Switch /></div>
      <div><ForceState state="hover"><Switch /></ForceState></div>
      <div><ForceState state="focus"><Switch /></ForceState></div>
      <div><Switch disabled /></div>
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">on</div>
      <div><Switch default-value /></div>
      <div><ForceState state="hover"><Switch default-value /></ForceState></div>
      <div><ForceState state="focus"><Switch default-value /></ForceState></div>
      <div><Switch default-value disabled /></div>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">off bg <code>--input</code></span>
      <span class="whitespace-nowrap">on bg <code>--primary</code></span>
      <span class="whitespace-nowrap">thumb <code>--background</code></span>
      <span class="whitespace-nowrap">ring <code>--ring</code></span>
    </footer>
  </section>
</div>

## Kbd: content & composition

Kbd is a stateless typographic element, so the interesting axes are
_content_ (does a 1-char digit look balanced next to a 3-char word?) and
_composition_ (bare cap, grouped shortcut, embedded in another control).

Cap typography reads from {@api css-token:vueda-text-micro} (11px) and the
mono stack ({@api css-token:vueda-font-mono}); the rounded chiclet shape
follows {@api css-token:vueda-checkbox-radius} so caps match the form-control
language rather than the slab-control language.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      content
    </header>
    <div class="flex flex-wrap items-center gap-2">
      <Kbd>K</Kbd>
      <Kbd>1</Kbd>
      <Kbd>⌘</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>⌥</Kbd>
      <Kbd>⌃</Kbd>
      <Kbd>⌫</Kbd>
      <Kbd>↵</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
      <Kbd>Enter</Kbd>
    </div>
    <footer class="text-xs text-muted-foreground">
      caps share min-width so single glyphs don't collapse next to words
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      grouped shortcut
    </header>
    <div class="flex flex-col gap-2">
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </div>
    <footer class="text-xs text-muted-foreground">
      KbdGroup tightens spacing so caps read as a single chord
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4 sm:col-span-2">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      embedded in a button
    </header>
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline">
        Search
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button variant="ghost" size="sm">
        Save
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
      </Button>
    </div>
    <footer class="text-xs text-muted-foreground">
      pair with a button to surface the keyboard equivalent of the action
    </footer>
  </section>
</div>
