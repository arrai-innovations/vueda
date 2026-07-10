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
All members share the same control sizing (32 / 28 / 40, governed by
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

Every tone × emphasis × size × state the default theme renders. The matrix below
exercises the same Tailwind utilities the real component does, with hover and
focus-visible reproduced via the docs harness so every cell is verifiable
without pointer or keyboard.

Theme keys: {@api theme-key:Button}, composing
{@api theme-key:\_ButtonBase} plus the `_Button*` primitive for the resolved
(tone, emphasis) cell (see [Tone × emphasis](#button-tone-emphasis) below). To
restyle every button-shaped surface in the app (calendar day cells, pagination
items, dialog actions), override the matching `_Button*` meta key rather than
`Button` itself.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default" description="(primary CTA)">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <div><Button size="sm" tone="primary">Save</Button></div>
      <div><Button tone="primary">Save</Button></div>
      <div><Button size="lg" tone="primary">Save</Button></div>
    </div>
    <div class="grid grid-cols-4 gap-x-3 gap-y-1">
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <div><ForceState state="hover"><Button tone="primary">Save</Button></ForceState></div>
      <div><ForceState state="focus"><Button tone="primary">Save</Button></ForceState></div>
      <div><ForceState state="active"><Button tone="primary">Save</Button></ForceState></div>
      <div><Button tone="primary" disabled>Save</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>icon-sm</StateLabel>
      <StateLabel>icon</StateLabel>
      <StateLabel>icon-lg</StateLabel>
      <div><Button size="icon-sm" tone="primary" aria-label="Save"><FontAwesomeIcon :icon="faFloppyDisk" /></Button></div>
      <div><Button size="icon" tone="primary" aria-label="Save"><FontAwesomeIcon :icon="faFloppyDisk" /></Button></div>
      <div><Button size="icon-lg" tone="primary" aria-label="Save"><FontAwesomeIcon :icon="faFloppyDisk" /></Button></div>
    </div>
    <template #footer>
      <span>bg <code>--primary</code></span>
      <span>fg <code>--primary-foreground</code></span>
      <span>hover <code>--primary-hover</code></span>
      <span>active <code>--primary-active</code></span>
    </template>
  </DemoCard>
  <DemoCard title="secondary">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <div><Button size="sm" tone="neutral" emphasis="fill">Export</Button></div>
      <div><Button tone="neutral" emphasis="fill">Export</Button></div>
      <div><Button size="lg" tone="neutral" emphasis="fill">Export</Button></div>
    </div>
    <div class="grid grid-cols-4 gap-x-3 gap-y-1">
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <div><ForceState state="hover"><Button tone="neutral" emphasis="fill">Export</Button></ForceState></div>
      <div><ForceState state="focus"><Button tone="neutral" emphasis="fill">Export</Button></ForceState></div>
      <div><ForceState state="active"><Button tone="neutral" emphasis="fill">Export</Button></ForceState></div>
      <div><Button tone="neutral" emphasis="fill" disabled>Export</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>icon-sm</StateLabel>
      <StateLabel>icon</StateLabel>
      <StateLabel>icon-lg</StateLabel>
      <div><Button size="icon-sm" tone="neutral" emphasis="fill" aria-label="Export"><FontAwesomeIcon :icon="faFileExport" /></Button></div>
      <div><Button size="icon" tone="neutral" emphasis="fill" aria-label="Export"><FontAwesomeIcon :icon="faFileExport" /></Button></div>
      <div><Button size="icon-lg" tone="neutral" emphasis="fill" aria-label="Export"><FontAwesomeIcon :icon="faFileExport" /></Button></div>
    </div>
    <template #footer>
      <span>bg <code>--secondary</code></span>
      <span>fg <code>--secondary-foreground</code></span>
      <span>hover <code>--secondary-hover</code></span>
      <span>active <code>--secondary-active</code></span>
    </template>
  </DemoCard>
  <DemoCard title="outline">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <div><Button size="sm" emphasis="outline">Cancel</Button></div>
      <div><Button emphasis="outline">Cancel</Button></div>
      <div><Button size="lg" emphasis="outline">Cancel</Button></div>
    </div>
    <div class="grid grid-cols-4 gap-x-3 gap-y-1">
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <div><ForceState state="hover"><Button emphasis="outline">Cancel</Button></ForceState></div>
      <div><ForceState state="focus"><Button emphasis="outline">Cancel</Button></ForceState></div>
      <div><ForceState state="active"><Button emphasis="outline">Cancel</Button></ForceState></div>
      <div><Button emphasis="outline" disabled>Cancel</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>icon-sm</StateLabel>
      <StateLabel>icon</StateLabel>
      <StateLabel>icon-lg</StateLabel>
      <div><Button size="icon-sm" emphasis="outline" aria-label="Settings"><FontAwesomeIcon :icon="faGear" /></Button></div>
      <div><Button size="icon" emphasis="outline" aria-label="Settings"><FontAwesomeIcon :icon="faGear" /></Button></div>
      <div><Button size="icon-lg" emphasis="outline" aria-label="Settings"><FontAwesomeIcon :icon="faGear" /></Button></div>
    </div>
    <template #footer>
      <span>hairline <code>--foreground</code></span>
      <span>bg <code>--background</code></span>
      <span>hover bg <code>--accent</code></span>
      <span>hover fg <code>--accent-foreground</code></span>
    </template>
  </DemoCard>
  <DemoCard title="ghost">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <div><Button size="sm" emphasis="ghost">More</Button></div>
      <div><Button emphasis="ghost">More</Button></div>
      <div><Button size="lg" emphasis="ghost">More</Button></div>
    </div>
    <div class="grid grid-cols-4 gap-x-3 gap-y-1">
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <div><ForceState state="hover"><Button emphasis="ghost">More</Button></ForceState></div>
      <div><ForceState state="focus"><Button emphasis="ghost">More</Button></ForceState></div>
      <div><ForceState state="active"><Button emphasis="ghost">More</Button></ForceState></div>
      <div><Button emphasis="ghost" disabled>More</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>icon-sm</StateLabel>
      <StateLabel>icon</StateLabel>
      <StateLabel>icon-lg</StateLabel>
      <div><Button size="icon-sm" emphasis="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button></div>
      <div><Button size="icon" emphasis="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button></div>
      <div><Button size="icon-lg" emphasis="ghost" aria-label="More"><FontAwesomeIcon :icon="faEllipsis" /></Button></div>
    </div>
    <template #footer>
      <span>bg transparent</span>
      <span>hover bg <code>--accent</code></span>
      <span>hover fg <code>--accent-foreground</code></span>
    </template>
  </DemoCard>
  <DemoCard title="destructive">
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <div><Button size="sm" tone="destructive">Delete</Button></div>
      <div><Button tone="destructive">Delete</Button></div>
      <div><Button size="lg" tone="destructive">Delete</Button></div>
    </div>
    <div class="grid grid-cols-4 gap-x-3 gap-y-1">
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <div><ForceState state="hover"><Button tone="destructive">Delete</Button></ForceState></div>
      <div><ForceState state="focus"><Button tone="destructive">Delete</Button></ForceState></div>
      <div><ForceState state="active"><Button tone="destructive">Delete</Button></ForceState></div>
      <div><Button tone="destructive" disabled>Delete</Button></div>
    </div>
    <div class="grid grid-cols-3 gap-x-3 gap-y-1">
      <StateLabel>icon-sm</StateLabel>
      <StateLabel>icon</StateLabel>
      <StateLabel>icon-lg</StateLabel>
      <div><Button size="icon-sm" tone="destructive" aria-label="Delete"><FontAwesomeIcon :icon="faTrash" /></Button></div>
      <div><Button size="icon" tone="destructive" aria-label="Delete"><FontAwesomeIcon :icon="faTrash" /></Button></div>
      <div><Button size="icon-lg" tone="destructive" aria-label="Delete"><FontAwesomeIcon :icon="faTrash" /></Button></div>
    </div>
    <template #footer>
      <span>bg <code>--destructive</code></span>
      <span>fg <code>--destructive-foreground</code></span>
      <span>hover <code>--destructive-hover</code></span>
      <span>active <code>--destructive-active</code></span>
      <span>ring <code>--destructive</code></span>
    </template>
  </DemoCard>
  <DemoCard title="link" description="(inline only)">
    <div class="flex flex-wrap items-baseline gap-3">
      <div class="flex flex-col gap-1">
        <StateLabel>default</StateLabel>
        <Button tone="primary" emphasis="link">View audit history</Button>
      </div>
      <div class="flex flex-col gap-1">
        <StateLabel>hover</StateLabel>
        <ForceState state="hover"><Button tone="primary" emphasis="link">View audit history</Button></ForceState>
      </div>
      <div class="flex flex-col gap-1">
        <StateLabel>focus-visible</StateLabel>
        <ForceState state="focus"><Button tone="primary" emphasis="link">View audit history</Button></ForceState>
      </div>
      <div class="flex flex-col gap-1">
        <StateLabel>active</StateLabel>
        <ForceState state="active"><Button tone="primary" emphasis="link">View audit history</Button></ForceState>
      </div>
      <div class="flex flex-col gap-1">
        <StateLabel>disabled</StateLabel>
        <Button tone="primary" emphasis="link" disabled>View audit history</Button>
      </div>
    </div>
    <template #footer>
      <span>fg <code>--primary</code></span>
      <span>hover underline</span>
      <span>use inside running text, not toolbars</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Button: tone × emphasis

Button resolves on two axes: **tone**
(`neutral` · `primary` · `destructive`, the color) and **emphasis**
(`fill` · `outline` · `ghost` · `link`, the structure). A bare `<Button>` is
neutral fill. The primary CTA is explicit with `tone="primary"`, and secondary
structure is explicit with `emphasis`. The grid below drives each cell from the
two-axis props directly.

Theme keys: each cell composes {@api theme-key:\_ButtonBase} plus its tone
primitive: fills are {@api theme-key:\_ButtonDefault} /
{@api theme-key:\_ButtonSecondary} / {@api theme-key:\_ButtonDestructive};
outlines {@api theme-key:\_ButtonOutline} /
{@api theme-key:\_ButtonPrimaryOutline} /
{@api theme-key:\_ButtonDestructiveOutline}; ghosts
{@api theme-key:\_ButtonGhost} / {@api theme-key:\_ButtonPrimaryGhost} /
{@api theme-key:\_ButtonDestructiveGhost}; links
{@api theme-key:\_ButtonNeutralLink} / {@api theme-key:\_ButtonLink} /
{@api theme-key:\_ButtonDestructiveLink}.

<VuedaDemo>
  <DemoCard title="tone × emphasis" class="sm:col-span-2">
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-4 gap-y-3">
      <div></div>
      <StateLabel>neutral</StateLabel>
      <StateLabel>primary</StateLabel>
      <StateLabel>destructive</StateLabel>
      <StateLabel>fill</StateLabel>
      <div><Button tone="neutral" emphasis="fill">Save</Button></div>
      <div><Button tone="primary" emphasis="fill">Save</Button></div>
      <div><Button tone="destructive" emphasis="fill">Delete</Button></div>
      <StateLabel>outline</StateLabel>
      <div><Button tone="neutral" emphasis="outline">Save</Button></div>
      <div><Button tone="primary" emphasis="outline">Save</Button></div>
      <div><Button tone="destructive" emphasis="outline">Delete</Button></div>
      <StateLabel>ghost</StateLabel>
      <div><Button tone="neutral" emphasis="ghost">Save</Button></div>
      <div><Button tone="primary" emphasis="ghost">Save</Button></div>
      <div><Button tone="destructive" emphasis="ghost">Delete</Button></div>
      <StateLabel>link</StateLabel>
      <div><Button tone="neutral" emphasis="link">Save</Button></div>
      <div><Button tone="primary" emphasis="link">Save</Button></div>
      <div><Button tone="destructive" emphasis="link">Delete</Button></div>
    </div>
    <template #footer>
      <span>columns are tone (color); rows are emphasis (structure)</span>
      <span>the filled diagonal corner (primary fill) is the one earned CTA per context</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Choosing tone and emphasis

The two axes answer two independent questions, and the default theme keeps
them independent. Decide each separately:

- **emphasis is placement.** How loud the control is and what chrome it sits
  in. It does not depend on what the action does.
- **tone is meaning.** What the action is. A delete reads `destructive`
  whether it is a page hero or a quiet row glyph; the tone is set once and does
  not change as the same action moves between contexts.
- **`primary` is "the one action here."** Exactly one control per context
  earns a `fill`. Promotion sets `emphasis` to `fill` and lifts a neutral
  action's tone to `primary`; a promoted destructive action stays a
  `destructive` fill.

### Pick emphasis by placement

- **`fill`** is the single earned action in a context: the form submit, the
  confirm in a dialog, the hero action in a page title. One per context.
- **`outline`** is a genuine alternative that still deserves a chip: a
  secondary form action, a page-title secondary action, a toolbar trigger,
  pagination, an error-recovery retry.
- **`ghost`** is a dismiss or a dense-strip action: cancel, clear, the actions
  in a bulk-selection bar, an inline tertiary affordance.
- **`link`** is inline within running prose only. Never in a toolbar or an
  action strip, where it breaks the control rhythm.

### Pick tone by meaning

- **`neutral`** is the resting default. A bare `<Button>` is a neutral fill,
  not a CTA.
- **`primary`** is the earned accent. Reach for it only on the one promoted
  action per context (or set it explicitly for a deliberate CTA). Spreading
  `primary` across a cluster spends the accent that signals "the" action.
- **`destructive`** marks an action that deletes data or is otherwise
  irreversible. Set the tone, not a `text-destructive` class: a destructive
  ghost (`tone="destructive" emphasis="ghost"`) is a quiet red row action, a
  destructive fill is a confirm hero. The tone composes the right
  `_ButtonDestructive*` primitive for whatever emphasis the placement chose.

### Size by chrome density

Size is a third, independent placement axis: `sm` in dense chrome (titles,
toolbars, dialogs, bulk bars), `default` (32px) in form footers, `lg` for auth
and full-page CTAs, `icon-sm` for pagination.

### Placement reference

| Placement              | Primary action     | Alternative                | Dismiss    | Destructive             |
| ---------------------- | ------------------ | -------------------------- | ---------- | ----------------------- |
| Page-title action zone | `primary` fill, sm | `neutral` outline, sm      | `ghost` sm | `destructive` fill, sm  |
| Form / dialog footer   | `primary` fill     | `neutral` outline          | `ghost`    | `destructive` fill      |
| Toolbar                |                    | `neutral` outline, sm      |            |                         |
| Bulk-selection bar     |                    | `ghost` sm                 |            | `destructive` ghost, sm |
| Pagination             |                    | `neutral` outline, icon-sm |            |                         |
| Empty state            | `primary` fill, sm | `neutral` outline, sm      | `ghost` sm |                         |
| Inline (running prose) | `primary` link     | `neutral` link             |            | `destructive` link      |

For buttons that navigate to a model action, this resolution happens
automatically: every action button renders through
{@api theme-key:Button} via `LinkModelView`, which reads the action's intrinsic
tone (a delete / destroy action is `destructive`, everything else `neutral`),
applies the placement `emphasis` chosen by the surrounding view, and promotes
the view's hero action to a fill. Authoring a `<Button>` by hand should follow
the same table so hand-placed and resolved buttons read identically.

## ButtonGroup: composition matrix

ButtonGroup adjusts its children's radii and shared edges so adjacent
buttons read as a single control. The interesting axis is _composition_:
orientation, child variant, and what kind of children sit inside (buttons,
static text, separators). Child-button state shifts (hover, focus, disabled)
are already covered by the [Button matrix](#button-state-matrix) above.

Theme keys: {@api theme-key:ButtonGroup},
{@api theme-key:ButtonGroupText},
{@api theme-key:ButtonGroupSeparator}. The seam treatment is a child-radius
and hairline-overlap override applied via the parent's data attributes, so re-skinning the seam
means editing these keys, not the token layer.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="horizontal · outline">
    <ButtonGroup>
      <Button emphasis="outline">Prev</Button>
      <Button emphasis="outline">Next</Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button size="sm" emphasis="outline">Day</Button>
      <Button size="sm" emphasis="outline">Week</Button>
      <Button size="sm" emphasis="outline">Month</Button>
      <Button size="sm" emphasis="outline">Quarter</Button>
    </ButtonGroup>
    <template #footer>adjacent buttons drop inner radius and share one hairline seam</template>
  </DemoCard>
  <DemoCard title="horizontal · secondary">
    <ButtonGroup>
      <Button size="sm" tone="neutral" emphasis="fill">$</Button>
      <Button size="sm" tone="neutral" emphasis="fill">€</Button>
      <Button size="sm" tone="neutral" emphasis="fill">£</Button>
      <Button size="sm" tone="neutral" emphasis="fill">¥</Button>
    </ButtonGroup>
    <template #footer>same composition rules apply across child variants</template>
  </DemoCard>
  <DemoCard title="vertical">
    <ButtonGroup orientation="vertical">
      <Button emphasis="outline">Approve</Button>
      <Button emphasis="outline">Defer</Button>
      <Button emphasis="outline">Reject</Button>
    </ButtonGroup>
    <template #footer>stack actions when the parent layout reads vertically</template>
  </DemoCard>
  <DemoCard title="with text label">
    <ButtonGroup>
      <ButtonGroupText>Currency</ButtonGroupText>
      <Button emphasis="outline">USD</Button>
      <Button emphasis="outline">CAD</Button>
      <Button emphasis="outline">EUR</Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button emphasis="outline">Sync</Button>
      <ButtonGroupText>3 min ago</ButtonGroupText>
    </ButtonGroup>
    <template #footer>static label or status reading sits inside the group's seam</template>
  </DemoCard>
  <DemoCard title="with separator" class="sm:col-span-2">
    <ButtonGroup>
      <Button emphasis="outline">Save</Button>
      <ButtonGroupSeparator />
      <Button emphasis="outline">Save and add another</Button>
      <ButtonGroupSeparator />
      <Button emphasis="outline">Save and continue</Button>
    </ButtonGroup>
    <template #footer>use a separator when peer actions are co-equal but not interchangeable</template>
  </DemoCard>
</VuedaDemo>

## Toggle: state matrix

Toggle adds a `pressed` axis on top of Button's tone × emphasis × size × state cube.
Each cell shows the size row and state row twice: once unpressed, once
pressed, so the press delta is visible against every other state.

Theme key: {@api theme-key:Toggle}. The pressed surface reads from
{@api css-token:accent} / {@api css-token:accent-foreground}, the same pair
that drives hover on ghost and outline buttons; rebranding the accent shifts
all three in lockstep.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default">
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <StateLabel>off</StateLabel>
      <div><Toggle size="sm">B</Toggle></div>
      <div><Toggle>B</Toggle></div>
      <div><Toggle size="lg">B</Toggle></div>
      <StateLabel>on</StateLabel>
      <div><Toggle size="sm" default-pressed>B</Toggle></div>
      <div><Toggle default-pressed>B</Toggle></div>
      <div><Toggle size="lg" default-pressed>B</Toggle></div>
    </div>
    <div class="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <StateLabel>off</StateLabel>
      <div><ForceState state="hover"><Toggle>B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle>B</Toggle></ForceState></div>
      <div><ForceState state="active"><Toggle>B</Toggle></ForceState></div>
      <div><Toggle disabled>B</Toggle></div>
      <StateLabel>on</StateLabel>
      <div><ForceState state="hover"><Toggle default-pressed>B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle default-pressed>B</Toggle></ForceState></div>
      <div><ForceState state="active"><Toggle default-pressed>B</Toggle></ForceState></div>
      <div><Toggle default-pressed disabled>B</Toggle></div>
    </div>
    <template #footer>
      <span>off bg transparent</span>
      <span>on bg <code>--accent</code></span>
      <span>on fg <code>--accent-foreground</code></span>
      <span>hover bg <code>--muted</code></span>
    </template>
  </DemoCard>
  <DemoCard title="outline">
    <div class="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <StateLabel>sm</StateLabel>
      <StateLabel>default</StateLabel>
      <StateLabel>lg</StateLabel>
      <StateLabel>off</StateLabel>
      <div><Toggle variant="outline" size="sm">B</Toggle></div>
      <div><Toggle variant="outline">B</Toggle></div>
      <div><Toggle variant="outline" size="lg">B</Toggle></div>
      <StateLabel>on</StateLabel>
      <div><Toggle variant="outline" size="sm" default-pressed>B</Toggle></div>
      <div><Toggle variant="outline" default-pressed>B</Toggle></div>
      <div><Toggle variant="outline" size="lg" default-pressed>B</Toggle></div>
    </div>
    <div class="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-x-3 gap-y-1">
      <div></div>
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>active</StateLabel>
      <StateLabel>disabled</StateLabel>
      <StateLabel>off</StateLabel>
      <div><ForceState state="hover"><Toggle variant="outline">B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle variant="outline">B</Toggle></ForceState></div>
      <div><ForceState state="active"><Toggle variant="outline">B</Toggle></ForceState></div>
      <div><Toggle variant="outline" disabled>B</Toggle></div>
      <StateLabel>on</StateLabel>
      <div><ForceState state="hover"><Toggle variant="outline" default-pressed>B</Toggle></ForceState></div>
      <div><ForceState state="focus"><Toggle variant="outline" default-pressed>B</Toggle></ForceState></div>
      <div><ForceState state="active"><Toggle variant="outline" default-pressed>B</Toggle></ForceState></div>
      <div><Toggle variant="outline" default-pressed disabled>B</Toggle></div>
    </div>
    <template #footer>
      <span>border <code>--foreground</code></span>
      <span>off bg <code>--background</code></span>
      <span>on bg <code>--accent</code></span>
      <span>on fg <code>--accent-foreground</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## ToggleGroup: composition matrix

ToggleGroup's interesting axis is composition (selection mode, spacing,
child variant), not state. Per-item states are covered by the
[Toggle matrix](#toggle-state-matrix) above.

Theme keys: {@api theme-key:ToggleGroup},
{@api theme-key:ToggleGroupItem}. Items compose from the Toggle key, so a
restyle of {@api theme-key:Toggle} flows through here automatically.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="single · default spacing">
    <ToggleGroup type="single" default-value="left">
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
    <template #footer>one selected at a time, items keep their own radius</template>
  </DemoCard>
  <DemoCard title="single · joined" description='(spacing="0", variant="outline")'>
    <ToggleGroup type="single" variant="outline" spacing="0" default-value="day">
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
    </ToggleGroup>
    <template #footer>adjacent items share a 1 px seam, outer radius preserved</template>
  </DemoCard>
  <DemoCard title="multiple" class="sm:col-span-2">
    <ToggleGroup type="multiple" :default-value="['bold', 'italic']">
      <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
    </ToggleGroup>
    <template #footer>any combination selectable, each item toggles independently</template>
  </DemoCard>
</VuedaDemo>

## Switch: state matrix

Switch has no variant or size axis in the current skin, so the matrix
collapses to `off | on` × `default | hover | focus-visible | disabled`.

Theme key: {@api theme-key:Switch}. Token surface: {@api css-token:input}
(off track), {@api css-token:primary} (on track), {@api css-token:background}
(thumb), {@api css-token:ring} (focus). Switch is the one place a brand's
{@api css-token:primary} reads as a _fill_ rather than as a CTA; verify the
on-track contrast against the thumb when retoning primary.

<VuedaDemo>
  <DemoCard>
    <div class="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] items-center gap-x-3 gap-y-2">
      <div></div>
      <StateLabel>default</StateLabel>
      <StateLabel>hover</StateLabel>
      <StateLabel>focus-visible</StateLabel>
      <StateLabel>disabled</StateLabel>
      <StateLabel>off</StateLabel>
      <div><Switch /></div>
      <div><ForceState state="hover"><Switch /></ForceState></div>
      <div><ForceState state="focus"><Switch /></ForceState></div>
      <div><Switch disabled /></div>
      <StateLabel>on</StateLabel>
      <div><Switch default-value /></div>
      <div><ForceState state="hover"><Switch default-value /></ForceState></div>
      <div><ForceState state="focus"><Switch default-value /></ForceState></div>
      <div><Switch default-value disabled /></div>
    </div>
    <template #footer>
      <span>off bg <code>--input</code></span>
      <span>on bg <code>--primary</code></span>
      <span>thumb <code>--background</code></span>
      <span>ring <code>--ring</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## Kbd: content & composition

Kbd is a stateless typographic element, so the interesting axes are
_content_ (does a 1-char digit look balanced next to a 3-char word?) and
_composition_ (bare cap, grouped shortcut, embedded in another control).

Cap typography reads from {@api css-token:vueda-text-micro} (11px) and the
mono stack ({@api css-token:vueda-font-mono}); the rounded chiclet shape
follows {@api css-token:vueda-checkbox-radius} so caps match the form-control
language rather than the slab-control language.
The keycap edge uses the `hairline` box-shadow contract, the same
DPR-tracked edge as buttons and inputs.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="content">
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
    <template #footer>caps share min-width so single glyphs don't collapse next to words</template>
  </DemoCard>
  <DemoCard title="grouped shortcut">
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
    <template #footer>KbdGroup tightens spacing so caps read as a single chord</template>
  </DemoCard>
  <DemoCard title="embedded in a button" class="sm:col-span-2">
    <div class="flex flex-wrap items-center gap-3">
      <Button emphasis="outline">
        Search
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button emphasis="ghost" size="sm">
        Save
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
      </Button>
    </div>
    <template #footer>pair with a button to surface the keyboard equivalent of the action</template>
  </DemoCard>
</VuedaDemo>
