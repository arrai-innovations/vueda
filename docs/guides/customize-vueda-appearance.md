---
title: Customize VUEDA Appearance
type: how-to
audience: integrator
status: draft
---

# Customize VUEDA Appearance

For charts, see [Style Unovis Charts](style-unovis-charts.md) for the optional Unovis stylesheet and independent categorical palette.

This guide shows the concrete recipes for each customization scope: a single instance, all instances of one component, a visual family of components, and brand-level skinning. Pick the section that matches the scope of your change. Reaching for a broader mechanism than you need is the most common way customizations leak into screens you did not mean to touch.

For the conceptual model behind these mechanisms (what each scope means and how the layers interact), see [Theming and Customization](../core-concepts/theming-and-customization).

## Pick the right scope

| Goal                                                                                                    | Scope     | Mechanism                  | Section                                                                 |
| ------------------------------------------------------------------------------------------------------- | --------- | -------------------------- | ----------------------------------------------------------------------- |
| Make this one specific element look different.                                                          | Instance  | `themeOverride` prop       | [Override one instance](#override-one-instance)                         |
| Make every Button (or Input, or Dialog, etc.) look different across the app.                            | Component | `setTheme` on a leaf entry | [Restyle one component system-wide](#restyle-one-component-system-wide) |
| Make every button-shaped thing (Button, calendar day cells, pagination, dialog actions) look different. | Family    | `setTheme` on a meta key   | [Restyle a visual family](#restyle-a-visual-family)                     |
| Re-skin the whole app: brand color, control sizes, radius, focus ring, shadows.                         | Brand     | CSS token override         | [Re-skin via tokens](#re-skin-via-tokens)                               |

If a customization touches values (colors, dimensions, durations), it almost always belongs in tokens. If it touches composition (a different class arrangement, a different state recipe), it belongs in the JavaScript theme.

## Override one instance

Use the `themeOverride` prop on the component you want to customize. The override merges with that component's default theme and is scoped to the receiving subtree.

```vue
<template>
    <Button :theme-override="amberOverride">Save</Button>
</template>

<script setup>
const amberOverride = {
    Button: {
        root: { class: "bg-amber-500 hover:bg-amber-600 text-white" },
    },
};
</script>
```

The override stays scoped to this Button. Other Buttons elsewhere in the app render with their default theme.

The `themeOverride` mechanism propagates through provide/inject. Setting an override on a parent component affects every descendant `useTheme` call within its subtree, without intermediate components needing to thread props:

```vue
<template>
    <!-- All Inputs anywhere inside this surface render without borders. -->
    <PageContainer :theme-override="borderlessInputs">
        <slot />
    </PageContainer>
</template>

<script setup>
const borderlessInputs = {
    Input: {
        root: { class: "border-0" },
    },
};
</script>
```

## Restyle one component system-wide

Use {@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme} at app startup to merge an override into the default theme. Every instance of the component picks up the override as its baseline.

```js
// main.js
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { patchTheme, setTheme } from "@vueda/use/useTheme.js";

setTheme(vuedaTailwind);

patchTheme({
    Button: {
        root: { class: "uppercase tracking-wide" },
    },
});
```

`patchTheme` merges the override; existing Button classes are preserved. To replace the entry entirely, use `setTheme` with a complete theme object.

Per-instance overrides still merge on top, so specific instances stay customizable. Patching a leaf entry does not reach components that merely look like it (calendar day cells, pagination items); restyle the family for those.

## Restyle a visual family

When the change should affect Button, calendar day triggers, pagination items, dialog actions, and anything else that composes from the button family, override the meta key (`_ButtonBase`, `_ButtonGhost`, etc.) instead of the leaf entries.

```js
// main.js
patchTheme({
    _ButtonGhost: {
        root: {
            class: "hover:bg-blue-100 dark:hover:bg-blue-900",
        },
    },
});
```

Every leaf entry whose default theme declares `composes: ['_ButtonGhost.root', ...]` picks up the change. Leaf entries that do not compose from `_ButtonGhost` are unaffected.

The replace semantics on `composes` are also useful. To redirect a leaf entry to compose from a different meta key:

```js
patchTheme({
    PaginationItem: {
        root: ({ isActive }) => ({
            // Default composed from _ButtonOutline / _ButtonGhost; replace
            // entirely so active state composes from the default variant instead.
            composes: ["_ButtonBase.root", isActive ? "_ButtonDefault.root" : "_ButtonGhost.root"],
        }),
    },
});
```

Override a meta key when the change is about a visual relationship shared across components rather than one component's identity. Available family meta keys are documented in the API reference for the component theme entries that compose from them.

## Re-skin via tokens

Most rebrand-level changes (primary color, control radius, control heights, focus ring, shadow stack, sidebar widths, calendar cell sizing) resolve to CSS custom properties defined in `@vueda/theme/vueda-tailwind/base.css`. Override the tokens in your own CSS, after the `base.css` import:

```css
/* main.css */
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --primary: oklch(0.6 0.15 180); /* teal fill in both modes */
    --vueda-control-height: 36px; /* taller controls */
    --vueda-control-radius: 6px; /* softer corners */
}
```

No JavaScript runs; every Tailwind utility that references the token (`bg-primary`, `h-vueda-control`, `rounded-vueda-control`) automatically picks up the new value across the entire app. Light/dark variants are scoped through the existing `.dark` selector.

The default theme keeps its primary fill unchanged between modes. `--primary-foreground` supplies dark labels on solid fills; `--primary-text` supplies a shade in light mode and a tint in dark mode for links and tinted labels. `--primary-text-active` serves pressed links. The text and hover/active colors derive from `--primary`, but check their contrast when choosing a different brand color and override each role as needed. Use `text-primary-text` for blue text on page or lightly tinted surfaces and `text-primary-foreground` for labels on solid primary fills. `--ring` and `--info` follow the readable text color by default.

`--vueda-brand-blue`, `--vueda-brand-navy`, and `--vueda-brand-grey` define the identity palette. Supporting surfaces and body text derive from navy and grey with white or black. Override those identity tokens for a coordinated palette change, or individual semantic tokens to retune a particular surface.

Some tokens to know:

- **Color**: `--primary`, `--background`, `--foreground`, `--card`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--info`, `--border`, `--input`, `--ring`. Sidebar variants follow the same pattern under `--sidebar-*`.
- **Control sizing**: `--vueda-control-height`, `--vueda-control-height-sm`, `--vueda-control-height-lg`, `--vueda-control-px-*`.
- **Specialized sizes**: `--vueda-chip-height`, `--vueda-cmd-input-height`, `--vueda-cal-day`, `--vueda-cal-cell`, `--vueda-sidebar-width`.
- **Radius**: `--vueda-control-radius`, `--vueda-card-radius`, `--vueda-modal-radius`, `--vueda-pill-radius`.
- **Shadows**: `--vueda-shadow-control`, `--vueda-shadow-card`, `--vueda-shadow-popover`, `--vueda-shadow-overlay`.
- **Motion**: `--vueda-duration-interaction`, `--vueda-ease-interaction`.
- **Fonts**: {@api css-token:vueda-font-sans} and {@api css-token:vueda-font-mono}. See [Load or replace the fonts](#load-or-replace-the-fonts).

The full set with default values lives in `base.css` itself, with section comments explaining what each token controls.

### Load or replace the fonts

`base.css` names fonts but does not ship them. The default stacks ask for IBM Plex Sans for interface text and JetBrains Mono for machine-generated, positional, and digit-stable values. If the page never loads a face with that exact family name, the browser silently falls back to a system font. Nothing errors, but text widths change, so column headers wrap, chips grow, and dense layouts stop matching the component reference.

VUEDA leaves font loading to the application, because the application usually loads fonts for its own chrome already. A bundled copy would download the same family twice, or a family the app replaces anyway.

To keep the default look, load both families at the three weights the theme uses. Body text uses 400, controls use 500 ({@api css-token:vueda-font-weight-ui}), and labels use 600 ({@api css-token:vueda-font-weight-label}). The static [Fontsource](https://fontsource.org/) packages register the exact family names the stacks expect:

```js
// main.js
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
```

To use different fonts, or fonts your app already loads under another name, override the stacks after the `base.css` import. Name the family exactly as its `@font-face` rule registers it. Variable builds often use a different name from the static ones: `@fontsource-variable/ibm-plex-sans` registers `IBM Plex Sans Variable`, not `IBM Plex Sans`.

```css
/* main.css */
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --vueda-font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
    --vueda-font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
}
```

A replacement font is a customization like any other token change. It changes text metrics, so screens drift from the component reference by the width difference between the fonts. Keep the default fonts when matching the reference closely matters more than the brand.

To confirm the fonts loaded, run `document.fonts.check('600 16px "IBM Plex Sans"')` in the browser console with your family name. It returns `false` when no matching face is available.

## Common pitfalls

**Reaching for `setTheme` to change a value.** If the change is a color, dimension, or duration, it almost certainly belongs in a CSS token. Reaching for `setTheme` produces a customization that does not propagate through composition or to surfaces you forgot to override.

**Reaching for `themeOverride` for a system-wide change.** A `themeOverride` prop on a single component does not affect other instances. If the change should apply everywhere the component appears, use `patchTheme` or `setTheme` at app startup.

**Overriding a leaf entry when the change is family-wide.** Patching `Button` does not affect `CalendarCellTrigger`, `PaginationItem`, or `AlertDialogAction`, even though they look like buttons. If the change is conceptually about button-shaped things, override the relevant meta key (`_ButtonBase`, `_ButtonGhost`, etc.) so all composing leaves pick it up.

**Drawing app chrome with a plain `border`.** VUEDA's edges step from 2px at a device pixel ratio of 1 down to 1px at a ratio of 2. That scale avoids colour fringing on common office displays. A Tailwind `border` or `border-b` stays at 1px, so a header drawn with it looks thinner than the VUEDA surfaces beside it. Use the matching utilities from `base.css` instead:

- `border-b-hairline` (or `-t`, `-l`, `-r`, `-x`, `-y`) for one edge.
- `border-hairline` for four real border sides.
- `hairline hairline-border` for a four-sided edge on an element with no other box-shadow.

**Naming a font the page never loads.** The token stacks name families; they do not load them. A stack whose first family has no loaded face falls back to a system font without any warning. Load the fonts or override the stacks, as in [Load or replace the fonts](#load-or-replace-the-fonts).

**Forgetting that `composes` uses replace semantics.** Declaring `composes` on an override does not append to the default's compose list; it replaces it entirely. If you intend to extend the default's composition, write the full new list.
