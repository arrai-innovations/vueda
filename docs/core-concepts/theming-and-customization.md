---
title: Theming and Customization
type: explanation
audience: integrator
status: draft
---

# Theming and Customization

VUEDA's components carry no hardcoded styles in their templates. Every class on every rendered element comes from the active theme: a JavaScript object that maps each component's slots to class strings, resolved at render time and merged with any overrides in scope. The default setup imports the built-in theme for its registration side effects; consumers customize the registered defaults through the mechanisms below.

Those mechanisms map to four scopes with sharply different reach. The guiding principle: find the smallest scope that covers the change you need.

## The four scopes

Customization concerns sort into four scopes, ordered from narrowest to broadest:

| Scope     | Mechanism                                                                                                              | Affects                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Instance  | {@api js:function:@arrai-innovations/vueda/use/useTheme#useThemeOverride} (via `themeOverride` prop or provide/inject) | One subtree                         |
| Component | {@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme} on a leaf entry                               | All instances of that component     |
| Family    | `patchTheme` on a meta key (`_ButtonBase`, etc.)                                                                       | All components that compose from it |
| Brand     | CSS token override (`--vueda-*`, `--primary`, etc.)                                                                    | Every consumer of the token         |

Each scope up is "broader cross-cut, less component-specific." Instance customizations are local DOM scope; component customizations are one component identity; family customizations are a visual relationship across multiple components; brand customizations are the design language itself.

The progression also matches the "least surprising change" principle: a narrower scope changes the smallest part of the system that achieves the goal. Reaching for a broader mechanism than necessary risks affecting screens the consumer never inspected.

## Instance: `useThemeOverride`

A component wired with `THEME_OVERRIDE_PROPS` accepts a `themeOverride` prop. The override is merged with that component's default theme, scoped to the subtree rooted at the receiving component, and propagated through provide/inject so descendants pick it up automatically.

```vue
<Button :theme-override="{ Button: { root: { class: 'bg-amber-500' } } }">
    Save
</Button>
```

Use it when one specific instance, in one specific surface, needs to look different; it does not affect any other Button in the app.

The provide/inject behavior is significant: a parent that sets an override propagates it to every descendant `useTheme` call without the intermediate components needing to know. A field that needs its inputs to render without borders can override the Input theme on the field itself; the Input components inside it pick up the override without prop-threading.

## Component: `patchTheme` on a leaf entry

Calling `patchTheme({ Button: { root: { class: 'uppercase tracking-wide' } } })` after the Button defaults have registered adds classes to every Button in the app. Per-instance overrides still merge on top. See [How the theme is registered](#how-the-theme-is-registered) for the required loading order.

Use it to change how one component renders system-wide: a different focus treatment, default size, or data attribute that should be true everywhere the component appears. The change is component-specific; it does not affect anything that merely looks like a Button (calendar day cells, pagination items, dialog actions) without explicit configuration.

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

Patching `_ButtonBase` after its defaults have registered propagates through every leaf that composes from it: Buttons, calendar day triggers, pagination items, dialog actions, and any other entry that explicitly opts into the family. Overrides for `composes` use replace semantics (declaring a new compose list on an override replaces the default's list entirely), while own `class` values from default and override still combine as in non-composing entries.

Composition is opt-in. A leaf entry that does not declare `composes` is unaffected by meta-key overrides. This is intentional: family relationships are explicit in the default theme, not implicit by name. A third-party component bundled with a VUEDA-using app does not pick up `_ButtonBase` overrides unless its theme entries opt in.

## Brand: CSS token overrides

Most brand-level concerns (primary color, accent color, control radius, control heights, focus ring, shadow stack, sidebar widths, calendar cell sizing) resolve to CSS custom properties (`--primary`, `--vueda-control-height`, `--vueda-cal-day`, `--ring`, etc.) defined in `@vueda/theme/vueda-tailwind/base.css`. The default theme's class strings reference those tokens through Tailwind utilities (`h-vueda-control`, `bg-primary`) or arbitrary-value escapes (`h-[var(--vueda-control-height)]`).

A consumer rebrands by overriding the tokens in their own CSS, after the `base.css` import:

```css
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --primary: oklch(0.6 0.15 180); /* teal */
    --vueda-control-height: 36px; /* taller controls */
    --vueda-control-radius: 6px; /* softer corners */
}
```

Every consumer of the token picks up the change instantly. No `setTheme` call is involved; no JavaScript runs.

Fonts follow the same split, with one difference. The font tokens name families, but `base.css` ships no font files, so loading them is the application's job. An app either loads the default families or overrides the stacks with fonts it already loads. [Load or replace the fonts](../guides/customize-vueda-appearance#load-or-replace-the-fonts) has the recipe.

The token layer is broader than the JavaScript theme system in a specific sense: it cascades through CSS, so a single override affects every class that references the token, regardless of which component rendered it. The trade-off is that token overrides cannot express composition or per-component logic; those concerns belong in the JavaScript theme.

## How the layers interact

At render time, a `useTheme` call for a given component slot resolves classes in this order:

1. Walk `composes` references (recursively) through the merged override theme. For each referenced slot, the default and override classes are appended.
2. Append the slot's own default class.
3. Append the slot's own override class.
4. Pass the resulting list to `combineClasses`, which produces a single class string.

The resulting string contains Tailwind utilities. Those utilities resolve their values from the active CSS tokens. So a consumer who overrides `--primary` does not need any JavaScript change; the existing class strings (`bg-primary`, `text-primary`) automatically reflect the new value.

The merged override theme used in step 1 is the result of merging:

- The component's own per-instance override (`themeOverride` prop), at the deepest level.
- Ancestor overrides provided by `useThemeOverride` calls higher in the tree.
- The component's `themeOverride` config (a per-component contribution defined in the theme entry).

`patchTheme` updates the registered defaults that per-instance overrides merge against. `setTheme` replaces those defaults wholesale. The result is layered customization: brand at the bottom (CSS tokens), registered defaults next, provide/inject next (`useThemeOverride`), per-instance at the top.

## When the answer is a token, not the theme

Many customization stories that read like "change the theme" are really "rebrand via tokens." Color, radius, control heights, focus rings, shadows, and spacing are all token-routed; reaching for `setTheme` to change any of them is reaching for the wrong layer.

The rule of thumb: if a customization is a value (color, dimension, duration), it is a token. If it is a composition (a different class arrangement, a different structural recipe, a new state behavior), it is the theme. Mixing the two in code is a sign the boundary is being crossed for the wrong reason; values that change between brands belong in tokens, even if the immediate use case is one component.

The token layer is also where the design system ships its defaults: overriding a few tokens, with no `setTheme` call, re-skins VUEDA.

## Reserved z-index bands

When your shell adds chrome of its own (a custom header, a banner, a sticky toolbar, an overlay), it shares one stacking axis with VUEDA's components. VUEDA does not publish z-index as tokens, but it does claim bands, and placing your chrome at the wrong value is how a custom header ends up behind a dialog, or a sticky toolbar covers the nav. The bands:

| Band         | Concern                  | What sits there                                                                       |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------- |
| `< 10`       | Component-local stacking | Internal ordering inside a single component; not page-level. Do not target this band. |
| `10` to `20` | Focus promotion          | A focused control lifting above its neighbours so the focus ring is not clipped.      |
| `30` to `39` | Sticky page chrome       | `PageTitle`, `StickyBar`, and every bar in a `StickyStackProvider`. Reserved.         |
| `40`         | Fixed shell chrome       | The `Sidebar` desktop panel.                                                          |
| `50`         | Floating overlays        | Dialogs, sheets, drawers, popovers, dropdowns, tooltips, menus, select, combobox.     |
| `> 50`       | Toasts                   | Sonner. Set by `vue-sonner` itself; VUEDA does not control it.                        |

Practical consequences for shell customization:

- **Keep custom sticky chrome out of `30` to `39`.** That band belongs to the sticky stack, which sizes itself dynamically (a stack of _N_ bars spans `31` through `30 + N`). If you pin your own bar there it will interleave unpredictably with VUEDA's. Prefer placing your chrome _inside_ a `StickyStackProvider` (so it joins the stack and is ordered for you) over hand-rolling a sticky element at a competing z-index.
- **Custom overlays go at `50`** to sit alongside VUEDA's dialogs and popovers, not above the sticky chrome but below them.
- **Toasts always win.** Sonner stacks above everything. If you raise the overlay band for a bespoke surface, remember confirmations still appear on top.

The authoritative scale, the per-component members, and the rationale for each band live in the default theme's design canon (`client/lib/theme/vueda-tailwind/README.md`, § 5.1).

## How the theme is registered

The four scopes above are about reach: which rendered elements a customization affects. Registration is a separate concern: which component defaults are present in the active theme at all, and what ships in the bundle. The active theme is a registry that registration calls build up.

Two registration functions back it, both exported from {@api js:module:@arrai-innovations/vueda/use/useTheme} (which re-exports them from the underlying `@vueda/use/themeRegistry.js`):

- `setTheme(theme)` replaces the registry wholesale, including earlier patches. Use it to install your own complete theme object after the defaults you intend to replace have registered.
- `patchTheme(partial)` registers entries additively, without disturbing the rest of the registry. It is how each component contributes its own default.

The built-in `vueda-tailwind` theme is authored as one small module per component, co-located by family at `@vueda/theme/vueda-tailwind/<family>/<Component>.theme.js`. Each module calls `patchTheme` with its own entry, and each themed component imports its theme module as a side effect. So a component registers its own default the moment its code loads, independent of any global setup.

That yields three registration paths an integrator chooses between in `main.js`:

| Path            | Setup                                                     | What registers                                                                   |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Eager (default) | `import "@vueda/theme/vueda-tailwind/index.js";`          | All built-in defaults when the module loads                                      |
| Per-family      | `import "@vueda/theme/vueda-tailwind/<family>/index.js";` | That family's defaults and their shared dependencies when the module loads       |
| Per-component   | No aggregate or family theme import                       | Each imported component's defaults and shared dependencies when its module loads |

The eager import is the default for new projects. It registers all built-in defaults before the body of `main.js` runs, so project `patchTheme` calls there run after registration. No `setTheme` call is needed. The aggregate module's default export is a snapshot of the registry; calling `setTheme(vuedaTailwind)` reinstalls that snapshot and can discard patches made after the import.

For per-family loading, replace the aggregate import with imports of the family modules you need. Apply project patches after those imports have registered the relevant defaults. Components from other families still register their own defaults when their modules load.

For per-component loading, remove both the aggregate theme import and any `setTheme(vuedaTailwind)` call. Components already import their own `*.theme.js` modules. Import the components your app uses, for example `@vueda/controls/button/Button.vue`; unused components' theme modules stay out of the bundle unless another import brings them in. Registration happens when component modules load, including when a lazy route loads, rather than when a component first renders.

::: warning Project patch ordering
Defaults must register before project patches that customize them. With per-component loading, import the relevant component or theme module before calling `patchTheme`. A patch in `main.js` can otherwise run before a lazy route imports its defaults, and the later registration can overwrite the patch. Removing the aggregate import does not make early global patches reliable; load-order-independent overrides are tracked in [#378](https://github.com/arrai-innovations/vueda/issues/378).
:::

All three paths require the application stylesheet to import Tailwind and `@vueda/theme/vueda-tailwind/base.css`. Changing JavaScript registration does not replace the CSS setup.

Built-in components import their defaults before their setup runs. If an application explicitly registers an asynchronous theme loader, the resolver reports `loading` while that loader is pending, and themed roots use a hide style until it settles.

## Relationship to shadcn-vue

VUEDA's component library is built on shadcn-vue's component vocabulary, which in turn wraps Reka UI primitives. shadcn-vue uses `cva` + `cn()` for variant selection and class merging, with consumer customization at the call site through a `class` prop. VUEDA replaces that with `useTheme`: the same variant logic still runs, but it lives inside the theme entry rather than in the component template, and override flows through provide/inject instead of prop-threading.

The trade-off is that VUEDA components are not a drop-in substitute for shadcn-vue components; consumers who want to layer in a shadcn-vue block as-is have to translate it to the VUEDA theme model. The payoff is that customization composes through the tree without manual prop wiring, and the four-scope model is uniform across the entire component surface.
