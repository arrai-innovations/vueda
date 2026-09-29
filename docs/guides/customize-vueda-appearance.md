---
title: Customize VUEDA Appearance
type: how-to
audience: integrator
status: draft
---

# Customize VUEDA Appearance

The default theme gives every view a working look. Most views keep it. This guide covers the views and brands that need a change, from one element up to the whole app. [Theming and Customization](../core-concepts/theming-and-customization) describes the four scopes and how their layers combine. [Style Unovis Charts](style-unovis-charts.md) covers charts. Icons come from the {@term Icon Registry}, which is separate from the theme; [Register the Icons](client-plugin-prerequisites.md#register-the-icons) sets it up.

## Pick the right scope

Use the smallest scope that covers the change. A broader scope changes screens that you did not check.

| Goal                                                                                          | Scope     | Mechanism                                 | Section                                                                 |
| --------------------------------------------------------------------------------------------- | --------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Make one element, or one part of a page, look different.                                      | Instance  | `themeOverride` prop                      | [Override one instance](#override-one-instance)                         |
| Make every Button (or Input, or Dialog) look different across the app.                        | Component | `patchTheme` on the component's theme key | [Restyle one component system-wide](#restyle-one-component-system-wide) |
| Make every button-shaped thing (Button, calendar day cells, pagination items) look different. | Family    | `patchTheme` on a composition primitive   | [Restyle a visual family](#restyle-a-visual-family)                     |
| Re-skin the whole app: brand color, control sizes, radius, focus ring, shadows.               | Brand     | CSS token override                        | [Re-skin via tokens](#re-skin-via-tokens)                               |

A change to a value, such as a color, a size, or a duration, belongs in a token. A change to which classes a component receives belongs in the JavaScript theme.

## Override one instance

Pass a {@term Theme Override} to the component's [`themeOverride`]{@api js:property:@arrai-innovations/vueda/use/useTheme#THEME_OVERRIDE_PROPS} prop. The override is an object keyed by component name. It merges over the registered default for this component and for every component rendered inside it.

```vue
<template>
    <Button :theme-override="amberOverride">Save</Button>
</template>

<script setup>
import Button from "@vueda/controls/button/Button.vue";

const amberOverride = {
    Button: {
        root: {
            class: [
                {
                    "bg-secondary text-secondary-foreground": false,
                    "hover:bg-secondary-hover active:bg-secondary-active": false,
                },
                "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
            ],
        },
    },
};
</script>
```

Other Buttons in the app keep their default theme.

The classes in an override are added to the default classes. An override class and a default class can set the same CSS property. The order of the two utilities in Tailwind's generated stylesheet then decides which one applies. The order in the class list does not matter, so the default can win. To make an override win, use one of these methods:

- Remove each conflicting default class with a key set to `false`, as the example does. A bare `Button` composes {@api theme-key:\_ButtonSecondary}, whose theme key page lists the classes to remove.
- Pick a built-in look with props instead. On a Button, these are [`tone`]{@api vue:component:Button:prop:tone} and [`emphasis`]{@api vue:component:Button:prop:emphasis}.
- Use only utilities that set properties that the defaults leave alone.

A component passes its merged override to every descendant component. An override on a container therefore restyles components inside it, and the components in between need no extra props:

```vue
<template>
    <!-- Every Input inside this card uses the monospace font. -->
    <Card :theme-override="monoInputs">
        <slot />
    </Card>
</template>

<script setup>
import Card from "@vueda/shell/card/Card.vue";

const monoInputs = {
    Input: {
        root: { class: "font-mono" },
    },
};
</script>
```

## Restyle one component system-wide

Call {@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme} in `main.js`, after the theme import. `patchTheme` merges your entry into the registered default, so every instance of the component starts from the patched version. The patch must run after the defaults that it changes have registered. [How the theme is registered](../core-concepts/theming-and-customization#how-the-theme-is-registered) describes the loading order for each registration path.

```js
// main.js
import "@vueda/theme/vueda-tailwind/index.js";
import { patchTheme } from "@vueda/use/useTheme.js";

patchTheme({
    Button: {
        root: { class: "uppercase tracking-wide" },
    },
});
```

The existing Button classes stay, and the patch adds its own. {@api js:function:@arrai-innovations/vueda/use/themeRegistry#setTheme} replaces the whole registry, including earlier patches. Reserve it for installing a complete theme object.

A `themeOverride` on one instance still merges on top of the patched default. The patch reaches every component that renders a `Button`, such as `AlertDialogAction`. Calendar day cells and pagination items have their own theme keys, so the patch does not reach them. To change them with Button, restyle the family.

## Restyle a visual family

To change Button, calendar day cells, pagination items, and other button-shaped components together, patch the {@term Composition Primitive} that they share, such as `_ButtonBase` or `_ButtonGhost`:

```js
// main.js
import "@vueda/theme/vueda-tailwind/index.js";
import { patchTheme } from "@vueda/use/useTheme.js";

patchTheme({
    _ButtonGhost: {
        root: {
            class: "hover:bg-blue-100 dark:hover:bg-blue-900",
        },
    },
});
```

Every theme slot that lists `_ButtonGhost.root` in its `composes` array picks up the change: ghost Buttons, calendar day cells, and inactive pagination items. The patch does not reach slots that do not list it.

A `composes` array in a patch replaces the default array. To make a component build on a different primitive, patch its `composes` array. This patch makes the active pagination item use the primary fill:

```js
patchTheme({
    PaginationItem: {
        root: ({ isActive }) => ({
            // The default composes _ButtonOutline for the active item and
            // _ButtonGhost for the others. This list replaces it.
            composes: ["_ButtonBase.root", isActive ? "_ButtonDefault.root" : "_ButtonGhost.root"],
        }),
    },
});
```

Patch a primitive when the change is about how related components look together. Patch a component's own key when the change is about that one component. The [theme keys reference]{@api theming:keys} lists every primitive and the components that compose it.

## Re-skin via tokens

Colors, radius, control heights, focus ring, shadows, sidebar widths, and calendar cell sizes come from [theme tokens]{@term Theme Token}. These are CSS custom properties that `@vueda/theme/vueda-tailwind/base.css` defines. Override the tokens in your own stylesheet, after the `base.css` import:

```css
/* src/index.css */
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --primary: oklch(0.6 0.15 180); /* teal fill in both modes */
    --vueda-control-height: 36px; /* taller controls */
    --vueda-control-radius: 6px; /* softer corners */
}
```

You change no JavaScript. Every Tailwind utility that reads an overridden token (`bg-primary`, `h-vueda-control`, `rounded-vueda-control`) uses the new value across the app. `base.css` sets the dark mode values under the `.dark` selector.

The primary color has several roles, each with its own token:

- {@api css-token:primary}: the fill of primary actions. The default is the same in light and dark mode.
- {@api css-token:primary-foreground}: dark labels on primary fills. Use `text-primary-foreground` for them.
- {@api css-token:primary-text}: primary-colored text, such as links, on the page, cards, and lightly tinted surfaces. Use `text-primary-text` for it.
- {@api css-token:primary-text-active}: the text of a pressed link.
- {@api css-token:ring} and {@api css-token:info}: the focus ring and informational color. By default both use `--primary-text`.

`base.css` computes the hover, pressed, and text colors from `--primary`, so they follow a new brand color. Check their contrast against the new color, and override any role that falls short.

{@api css-token:vueda-brand-blue}, {@api css-token:vueda-brand-navy}, and {@api css-token:vueda-brand-grey} define the identity palette. `base.css` computes the colors of supporting surfaces and body text by mixing navy and grey with white or black. Override the identity tokens to change the palette as a whole, or override single tokens to change one surface.

A selection of tokens, by group:

- **Color**: `--primary`, `--background`, `--foreground`, `--card`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--info`, `--border`, `--input`, `--ring`. The sidebar has its own set under `--sidebar-*`.
- **Control sizing**: `--vueda-control-height`, `--vueda-control-height-sm`, `--vueda-control-height-lg`, `--vueda-control-px-*`.
- **Specialized sizes**: `--vueda-chip-height`, `--vueda-cmd-input-height`, `--vueda-cal-day`, `--vueda-cal-cell`, `--vueda-sidebar-width`.
- **Radius**: `--vueda-control-radius`, `--vueda-card-radius`, `--vueda-modal-radius`, `--vueda-pill-radius`.
- **Shadows**: `--vueda-shadow-control`, `--vueda-shadow-card`, `--vueda-shadow-popover`, `--vueda-shadow-overlay`.
- **Motion**: `--vueda-duration-interaction`, `--vueda-ease-interaction`.
- **Fonts**: {@api css-token:vueda-font-sans} and {@api css-token:vueda-font-mono}. See [Load or replace the fonts](#load-or-replace-the-fonts).

The [theme tokens reference]{@api theming:tokens} lists every token with its light and dark values.

### Load or replace the fonts

`base.css` names fonts but ships no font files. The default stacks ask for IBM Plex Sans for interface text and JetBrains Mono for machine-generated, positional, and digit-stable values. The theme uses weights 400 for body text, 500 for controls ({@api css-token:vueda-font-weight-ui}), and 600 for labels ({@api css-token:vueda-font-weight-label}). The application loads the fonts, so that it can use fonts that it already loads for its own pages.

When no loaded face matches a family name, the browser uses a system font without an error. Text widths then change: column headers wrap, chips grow, and dense layouts no longer match the component reference.

A project generated from the VUEDA templates loads both families in `src/index.css`. The [Fontsource](https://fontsource.org/) variable packages `@fontsource-variable/ibm-plex-sans` and `@fontsource-variable/jetbrains-mono` register the families as `IBM Plex Sans Variable` and `JetBrains Mono Variable`, so the stylesheet puts those names first in each stack:

```css
/* src/index.css */
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";
@import "@fontsource-variable/ibm-plex-sans";
@import "@fontsource-variable/jetbrains-mono";

:root {
    --vueda-font-sans: "IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
    --vueda-font-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

In another project, install both packages as dependencies and add the same lines. If you replace the default theme, remove the font imports and the `:root` rule along with the `base.css` import.

To use other fonts, load them and override the two stacks after the `base.css` import. Name each family exactly as its `@font-face` rule registers it:

```css
:root {
    --vueda-font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
    --vueda-font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
}
```

A different font has different text widths, so screens no longer match the component reference exactly. Keep the default fonts when a close match to the reference matters more than the brand.

To confirm that a family loaded, run `await document.fonts.load('600 16px "IBM Plex Sans Variable"')` in the browser console, with your family name in place of `IBM Plex Sans Variable`. The result is an empty array when no loaded font face has that name.

## Port a shadcn-vue block

[shadcn-vue](https://www.shadcn-vue.com/) blocks, such as sidebar layouts and dashboard shells, do not install into a VUEDA project. A block imports components from `@/components/ui/...` paths and uses the `cn()` helper, and VUEDA provides neither. Most VUEDA components carry the shadcn-vue names (`Button`, `Dialog`, `Alert`, `Pagination`), so a block's markup needs few changes.

To port a block:

1. Copy the block's markup and script into a component in your project.
2. Replace each `@/components/ui/...` import with an import of the VUEDA component file. The Source section of the component's API page gives the file path under `client/lib/`; replace that prefix with `@vueda/`. For example, `Button` is `@vueda/controls/button/Button.vue`.
3. Check each component's props on its API page. For example, a VUEDA `Button` takes `tone` and `emphasis`, and a shadcn-vue `Button` takes `variant`.
4. Remove the `cn()` calls. Move each class that restyles a VUEDA component into a theme override, a patch, or a token, as described in the sections above.

## Common pitfalls

**Reaching for `setTheme` to change a value.** If the change is a color, dimension, or duration, it almost certainly belongs in a CSS token. Reaching for `setTheme` produces a customization that does not propagate through composition or to surfaces you forgot to override.

**Reaching for `themeOverride` for a system-wide change.** A `themeOverride` prop on a single component does not affect other instances. If the change should apply everywhere the component appears, use `patchTheme` after the defaults have registered.

**Overriding a leaf entry when the change is family-wide.** Patching `Button` does not affect `CalendarCellTrigger`, `PaginationItem`, or `AlertDialogAction`, even though they look like buttons. If the change is conceptually about button-shaped things, override the relevant meta key (`_ButtonBase`, `_ButtonGhost`, etc.) so all composing leaves pick it up.

**Drawing app chrome with a plain `border`.** VUEDA's edges step from 2px at a device pixel ratio of 1 down to 1px at a ratio of 2. That scale avoids colour fringing on common office displays. A Tailwind `border` or `border-b` stays at 1px, so a header drawn with it looks thinner than the VUEDA surfaces beside it. Use the matching utilities from `base.css` instead:

- `border-b-hairline` (or `-t`, `-l`, `-r`, `-x`, `-y`) for one edge.
- `border-hairline` for four real border sides.
- `hairline hairline-border` for a four-sided edge on an element with no other box-shadow.

**Naming a font the page never loads.** The token stacks name families; they do not load them. A stack whose first family has no loaded face falls back to a system font without any warning. Load the fonts or override the stacks, as in [Load or replace the fonts](#load-or-replace-the-fonts).

**Forgetting that `composes` uses replace semantics.** Declaring `composes` on an override does not append to the default's compose list; it replaces it entirely. If you intend to extend the default's composition, write the full new list.
