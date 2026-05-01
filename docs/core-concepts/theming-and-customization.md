---
title: Theming and Customization
type: explanation
audience: integrator
status: draft
---

# Theming and Customization

VUEDA's components carry no hardcoded styles in their templates. Every class on every rendered element comes from the active theme: a JavaScript object that maps each component's slots to class strings, resolved at render time and merged with any overrides in scope. The theme is registered at app startup via {@api js:function:@arrai-innovations/vueda/use/useTheme#setTheme}, and consumers customize it through a small set of mechanisms with sharply different reach.

This page explains what those mechanisms are, what each one is for, and why they map to four distinct scopes. The integrator's pilot is "find the smallest scope that covers the change you actually want."

## The four scopes

Customization concerns sort into four scopes, ordered from narrowest to broadest:

| Scope     | Mechanism                                                                                                              | Affects                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Instance  | {@api js:function:@arrai-innovations/vueda/use/useTheme#useThemeOverride} (via `themeOverride` prop or provide/inject) | One subtree                         |
| Component | {@api js:function:@arrai-innovations/vueda/use/useTheme#setTheme} on a leaf entry                                      | All instances of that component     |
| Family    | `setTheme` on a meta key (`_ButtonBase`, etc.)                                                                         | All components that compose from it |
| Brand     | CSS token override (`--vueda-*`, `--primary`, etc.)                                                                    | Every consumer of the token         |

Each scope up is "broader cross-cut, less component-specific." Instance customizations are local DOM scope; component customizations are one component identity; family customizations are a visual relationship across multiple components; brand customizations are the design language itself.

The progression also matches the "least surprising change" principle: a narrower scope changes the smallest part of the system that achieves the goal. Reaching for a broader mechanism than the change requires risks affecting screens the consumer never inspected.

## Instance: `useThemeOverride`

A component wired with `THEME_OVERRIDE_PROPS` accepts a `themeOverride` prop. The override is merged with that component's default theme, scoped to the subtree rooted at the receiving component, and propagated through provide/inject so descendants pick it up automatically.

```vue
<Button :theme-override="{ Button: { root: { class: 'bg-amber-500' } } }">
    Save
</Button>
```

This is the right scope when one specific instance, in one specific surface, needs to look different. It does not affect any other Button elsewhere in the app.

The provide/inject behavior is significant: a parent that sets an override propagates it to every descendant `useTheme` call without the intermediate components needing to know. A field that needs its inputs to render without borders can override the Input theme on the field itself; the Input components inside it pick up the override without prop-threading.

## Component: `setTheme` on a leaf entry

Calling `setTheme({ Button: { root: { class: 'bg-amber-500' } } })` at app startup reshapes the default theme: every Button rendered anywhere in the app picks up the override as its baseline. Per-instance overrides still merge on top.

This is the right scope when a consumer wants to change how one component renders system-wide — a different focus treatment, a different default size, a custom data attribute, anything that should be true everywhere the component appears. The change is component-specific; it does not affect anything that "looks like" a Button (calendar day cells, pagination items, dialog actions) without explicit configuration.

## Family: meta keys

Meta keys are theme entries with an underscore-prefixed name (`_ButtonBase`, `_ButtonGhost`, `_ButtonOutline`, etc.) that exist as composition primitives rather than as components. Leaf entries declare `composes: ['_ButtonBase.root', '_ButtonGhost.root']`, and the resolver walks those references at render time, prepending the meta entries' classes before the leaf's own.

```js
// Default theme excerpt
{
    _ButtonBase: { root: { class: ["inline-flex items-center ...", "..."] } },
    _ButtonGhost: { root: { class: "hover:bg-accent ..." } },
    Button: {
        root: ({ variant }) => ({
            composes: ["_ButtonBase.root", `_Button${variant}.root`],
            class: [/* per-component sizing */],
        }),
    },
    CalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: [/* calendar-specific classes */],
        },
    },
}
```

Overriding `_ButtonBase` via `setTheme` propagates through every leaf that composes from it: Buttons, calendar day triggers, pagination items, dialog actions, and any other entry that explicitly opts into the family. Overrides for `composes` use replace semantics — declaring a new compose list on an override replaces the default's list entirely — while own `class` values from default and override still combine as in non-composing entries.

Composition is opt-in. A leaf entry that does not declare `composes` is unaffected by meta-key overrides. This is intentional: family relationships are explicit in the default theme, not implicit by name. A third-party component bundled with a VUEDA-using app does not pick up `_ButtonBase` overrides unless its theme entries opt in.

## Brand: CSS token overrides

Most brand-level concerns — primary color, accent color, control radius, control heights, focus ring, shadow stack, sidebar widths, calendar cell sizing — resolve to CSS custom properties (`--primary`, `--vueda-control-height`, `--vueda-cal-day`, `--ring`, etc.) defined in `@vueda/theme/vueda-tailwind/base.css`. The default theme's class strings reference those tokens through Tailwind utilities (`h-vueda-control`, `bg-primary`) or arbitrary-value escapes (`h-[var(--vueda-control-height)]`).

A consumer rebrands by overriding the tokens in their own CSS, after the `base.css` import:

```css
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --primary: oklch(0.6 0.15 180); /* teal */
    --vueda-control-height: 36px; /* taller controls */
    --vueda-control-radius: 6px; /* softer corners */
}
```

Every consumer of the token picks up the change instantly. No `setTheme` call is involved; no JavaScript runs. This is the right scope for skinning — the customizations adopters most often reach for fall here.

The token layer is broader than the JavaScript theme system in a specific sense: it cascades through CSS, so a single override affects every class that references the token, regardless of which component rendered it. The trade-off is that token overrides cannot express composition or per-component logic — those concerns belong in the JavaScript theme.

## How the layers interact

At render time, a `useTheme` call for a given component slot resolves classes in this order:

1. Walk `composes` references (recursively) through the merged override theme. For each referenced slot, the default and override classes are appended.
2. Append the slot's own default class.
3. Append the slot's own override class.
4. Pass the resulting list to `combineClasses`, which produces a single class string.

The resulting string contains Tailwind utilities. Those utilities resolve their values from the active CSS tokens. So a consumer who overrides `--primary` does not need any JavaScript change — the existing class strings (`bg-primary`, `text-primary`) automatically reflect the new value.

The merged override theme used in step 1 is the result of merging:

- The component's own per-instance override (`themeOverride` prop), at the deepest level.
- Ancestor overrides provided by `useThemeOverride` calls higher in the tree.
- The component's `themeOverride` config (a per-component contribution defined in the theme entry).

`setTheme` mutates the global default theme that those overrides merge against; it does not participate in the per-instance merge directly. The result is layered customization: brand at the bottom (CSS tokens), defaults next (`setTheme`), provide/inject next (`useThemeOverride`), per-instance at the top.

## When the answer is a token, not the theme

Many customization stories that read like "change the theme" are really "rebrand via tokens." Color, radius, control heights, focus rings, shadows, and spacing are all token-routed; reaching for `setTheme` to change any of them is reaching for the wrong layer.

The rule of thumb: if a customization is a value (color, dimension, duration), it is a token. If it is a composition (a different class arrangement, a different structural recipe, a new state behavior), it is the theme. Mixing the two in code is a sign the boundary is being crossed for the wrong reason — values that change between brands belong in tokens, even if the immediate use case is one component.

The token layer is also where the design system ships its defaults. A consumer who never touches `setTheme` but overrides a few tokens has a re-skinned VUEDA. That is the supported, normal path for adopters customizing their brand.

## Relationship to shadcn-vue

VUEDA's component library is built on shadcn-vue's component vocabulary, which in turn wraps Reka UI primitives. shadcn-vue uses `cva` + `cn()` for variant selection and class merging, with consumer customization at the call site through a `class` prop. VUEDA replaces that with `useTheme`: the same variant logic still runs, but it lives inside the theme entry rather than in the component template, and override flows through provide/inject instead of prop-threading.

The trade-off is that VUEDA components are not a drop-in substitute for shadcn-vue components; consumers who want to layer in a shadcn-vue block as-is have to translate it to the VUEDA theme model. The payoff is that customization composes through the tree without manual prop wiring, and the four-scope model is uniform across the entire component surface.
