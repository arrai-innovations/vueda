---
title: Theming
audience: implementor
status: draft
type: reference
---

# Theming

VUEDA's appearance is defined by two layered surfaces: a JavaScript theme object that maps each component's slots to class strings, and a set of CSS custom properties that those classes resolve against. The default theme ships from `@vueda/theme/vueda-tailwind`; the tokens ship from `@vueda/theme/vueda-tailwind/base.css`. This page lists both.

For the conceptual model behind these surfaces (instance, component, family, brand scopes; how the layers interact), see [Theming and Customization](../core-concepts/theming-and-customization). For step-by-step recipes, see [Customize VUEDA Appearance](../guides/customize-vueda-appearance).

## Theme keys

Theme entries shipped by `@vueda/theme/vueda-tailwind`. Each entry exposes one or more named slots. Leaf entries correspond to a component identity (`Button`, `Input`, `CalendarCellTrigger`); meta entries (underscore-prefixed: `_ButtonBase`, `_ButtonGhost`) are composition primitives consumed by leaf entries via `composes`.

Override leaf entries with `setTheme` / `patchTheme` to restyle one component system-wide. Override meta entries to restyle a visual family across every leaf that composes from it. Override semantics for `composes` are replace; own `class` values combine default + override.

- [Full theme keys reference](./theming/keys.md)

## Theme tokens

CSS custom properties shipped by `@vueda/theme/vueda-tailwind/base.css`, grouped by purpose with values for both light (`:root`) and dark (`.dark`) scopes. Tokens cover color palette, semantic radius, semantic shadows, semantic spacing, control sizing, sidebar geometry, typography, and motion.

Override tokens in your own CSS after the `base.css` import to re-skin without touching JavaScript. Most rebrand-level concerns (primary color, control radius, control heights, focus ring, shadows) belong here.

- [Full theme tokens reference](./theming/tokens.md)

## Choosing between the two

If a customization is a value (color, dimension, duration), it is a token. If it is a composition (a different class arrangement, a different structural recipe, a new state behavior), it is a theme key. Mixing the two in code is a sign the boundary is being crossed for the wrong reason.
