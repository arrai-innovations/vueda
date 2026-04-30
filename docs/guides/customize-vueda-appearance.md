---
title: Customize VUEDA Appearance
type: how-to
audience: implementor
status: draft
---

# Customize VUEDA Appearance

This guide shows the concrete recipes for each customization scope: a single instance, all instances of one component, a visual family of components, and brand-level skinning. Pick the section that matches the scope of the change you actually want; reaching for a broader mechanism than the change requires is the most common cause of customizations leaking into screens you did not intend to touch.

For the conceptual model behind these mechanisms — what each scope means and how the layers interact — see [Theming and Customization](../core-concepts/theming-and-customization).

## Pick the right scope

| Goal                                                                                                      | Scope     | Mechanism                  | Section                                                                 |
| --------------------------------------------------------------------------------------------------------- | --------- | -------------------------- | ----------------------------------------------------------------------- |
| Make this one specific element look different.                                                            | Instance  | `themeOverride` prop       | [Override one instance](#override-one-instance)                         |
| Make every Button (or Input, or Dialog, etc.) look different across the app.                              | Component | `setTheme` on a leaf entry | [Restyle one component system-wide](#restyle-one-component-system-wide) |
| Make every button-shaped thing — Button, calendar day cells, pagination, dialog actions — look different. | Family    | `setTheme` on a meta key   | [Restyle a visual family](#restyle-a-visual-family)                     |
| Re-skin the whole app: brand color, control sizes, radius, focus ring, shadows.                           | Brand     | CSS token override         | [Re-skin via tokens](#re-skin-via-tokens)                               |

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

This is the right scope when you want a specific surface to render differently without changing the global default.

## Restyle one component system-wide

Use {@api js:function:@arrai-innovations/vueda/use/useTheme#patchTheme} at app startup to merge an override into the default theme. Every instance of the component picks up the override as its baseline.

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

This is the right scope when you want the change everywhere the component appears, but it should not affect components that merely "look like" the component (calendar day cells, pagination items, etc.). Per-instance overrides still merge on top, so consumers can still customize specific instances.

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

This is the right scope when the change is conceptually about a visual relationship across components, not one component identity. Available family meta keys are documented in the API reference for the component theme entries that compose from them.

## Re-skin via tokens

Most rebrand-level changes — primary color, control radius, control heights, focus ring, shadow stack, sidebar widths, calendar cell sizing — resolve to CSS custom properties defined in `@vueda/theme/vueda-tailwind/base.css`. Override the tokens in your own CSS, after the `base.css` import:

```css
/* main.css */
@import "tailwindcss";
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --primary: oklch(0.6 0.15 180); /* teal */
    --vueda-control-height: 36px; /* taller controls */
    --vueda-control-radius: 6px; /* softer corners */
}

.dark {
    --primary: oklch(0.7 0.13 180); /* lighter teal on dark */
}
```

No JavaScript runs; every Tailwind utility that references the token (`bg-primary`, `h-vueda-control`, `rounded-vueda-control`) automatically picks up the new value across the entire app. Light/dark variants are scoped through the existing `.dark` selector.

Some tokens to know:

- **Color**: `--primary`, `--background`, `--foreground`, `--card`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--info`, `--border`, `--input`, `--ring`. Sidebar variants follow the same pattern under `--sidebar-*`.
- **Control sizing**: `--vueda-control-height`, `--vueda-control-height-sm`, `--vueda-control-height-lg`, `--vueda-control-px-*`.
- **Specialized sizes**: `--vueda-chip-height`, `--vueda-cmd-input-height`, `--vueda-cal-day`, `--vueda-cal-cell`, `--vueda-sidebar-width`.
- **Radius**: `--vueda-control-radius`, `--vueda-card-radius`, `--vueda-modal-radius`, `--vueda-pill-radius`.
- **Shadows**: `--vueda-shadow-control`, `--vueda-shadow-card`, `--vueda-shadow-popover`, `--vueda-shadow-overlay`.
- **Motion**: `--vueda-duration-interaction`, `--vueda-ease-interaction`.

The full set with default values lives in `base.css` itself, with section comments explaining what each token controls.

This is the right scope for skinning. Most adopters customizing for their brand never touch `setTheme`; the customizations they reach for fall here.

## Common pitfalls

**Reaching for `setTheme` to change a value.** If the change is a color, dimension, or duration, it almost certainly belongs in a CSS token. Reaching for `setTheme` produces a customization that does not propagate through composition or to surfaces you forgot to override.

**Reaching for `themeOverride` for a system-wide change.** A `themeOverride` prop on a single component does not affect other instances. If the change should apply everywhere the component appears, use `patchTheme` or `setTheme` at app startup.

**Overriding a leaf entry when the change is family-wide.** Patching `Button` does not affect `CalendarCellTrigger`, `PaginationItem`, or `AlertDialogAction`, even though they look like buttons. If the change is conceptually about button-shaped things, override the relevant meta key (`_ButtonBase`, `_ButtonGhost`, etc.) so all composing leaves pick it up.

**Forgetting that `composes` uses replace semantics.** Declaring `composes` on an override does not append to the default's compose list — it replaces it entirely. If you intend to extend the default's composition, write the full new list.
