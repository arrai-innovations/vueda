---
title: Theming and Customization
type: explanation
audience: integrator
status: draft
---

# Theming and Customization

Each VUEDA component takes its styling from the active theme. The theme is a JavaScript object that maps each component's [theme slots]{@term Theme Slot} to class strings. At render time, [`useTheme`]{@api js:function:@arrai-innovations/vueda/use/useTheme#useTheme} resolves the classes for a slot and merges them with any overrides in scope. A component such as [`Button`]{@api vue:component:Button} also accepts a [`class`]{@api vue:component:Button:prop:class} prop, which it adds after its theme classes.

Each themed component registers its own default theme entry when its module loads. [How the theme is registered](#how-the-theme-is-registered) describes the loading paths and the order in which project changes must run.

## The four scopes

Theme changes sort into four [customization scopes]{@term Customization Scope}, ordered from narrowest to broadest:

| Scope     | Mechanism                                                                                                                                 | Affects                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Instance  | [`useThemeOverride`]{@api js:function:@arrai-innovations/vueda/use/useTheme#useThemeOverride}, through a component's `themeOverride` prop | One component and its descendants             |
| Component | [`patchTheme`]{@api js:function:@arrai-innovations/vueda/use/themeRegistry#patchTheme} on a component's {@term Theme Key}                 | Every instance of that component              |
| Family    | `patchTheme` on a {@term Composition Primitive}, such as `_ButtonBase`                                                                    | Every theme slot that composes that primitive |
| Brand     | A {@term Theme Token} override, such as `--primary` or a `--vueda-*` token                                                                | Every class that reads that token             |

Instance changes reach one part of the page. Component changes reach one component everywhere it appears. Family changes reach a set of components that share a visual recipe. Brand changes reach the design language as a whole. A narrower scope changes fewer rendered elements, so fewer screens need a check after the change.

## Instance: `useThemeOverride`

A component that spreads [`THEME_OVERRIDE_PROPS`]{@api js:property:@arrai-innovations/vueda/use/useTheme#THEME_OVERRIDE_PROPS} into its props accepts a `themeOverride` prop, which holds a {@term Theme Override}. The component merges the override over its own theme and provides the merged result to its descendants.

```vue
<Button :theme-override="{ Button: { root: { class: 'w-full' } } }">
    Save
</Button>
```

This Button fills the width of its container. Every other Button in the app keeps its default width.

The provided override reaches every `useTheme` call below the component, and the components in between do not need to pass it along. For example, an override for the `Input` key, set on a container component, reaches every `Input` inside that container.

## Component: `patchTheme` on a theme key

A `patchTheme` call merges a partial theme into the registered defaults. A patch for one component's theme key changes every instance of that component:

```js
import { patchTheme } from "@vueda/use/useTheme.js";

patchTheme({ Button: { root: { class: "uppercase tracking-wide" } } });
```

Per-instance overrides still merge on top of the patched defaults. The patch also reaches components that render through `Button`, such as [`AlertDialogAction`]{@api vue:component:AlertDialogAction} and [`AlertDialogCancel`]{@api vue:component:AlertDialogCancel}. Calendar day cells and pagination items look like buttons but have their own theme keys, so they keep their styling. A patch must run after the default that it customizes has registered; [How the theme is registered](#how-the-theme-is-registered) explains why.

## Family: meta keys

A family change targets a {@term Composition Primitive}, such as `_ButtonBase`, `_ButtonGhost`, or `_ButtonOutline`. Its underscore-prefixed key is also called a meta key. A theme slot opts into a primitive by listing it in its `composes` array. When `useTheme` resolves the slot, it resolves each listed slot first and puts those classes before the slot's own classes.

```js
// Simplified from the default theme
{
    _ButtonBase: { root: { class: [/* layout, type, focus ring */] } },
    _ButtonGhost: { root: { class: [/* hover and active fills */] } },
    Button: {
        root: ({ tone, emphasis, size }) => ({
            // resolveButtonVariant maps tone and emphasis to a primitive key.
            composes: ["_ButtonBase.root", `${resolveButtonVariant({ tone, emphasis }).primitive}.root`],
            class: [/* size classes */],
        }),
    },
    CalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: [/* day cell classes */],
        },
    },
}
```

A patch to `_ButtonBase` reaches every slot that composes it: `Button`, calendar day and navigation buttons, pagination items, and the [`FileUpload`]{@api vue:component:FileUpload} trigger. It also reaches the alert dialog actions, which render through `Button`. When a patch or override sets `composes`, its list replaces the default list. The `class` values from the default and the patch or override combine, as they do in slots without `composes`.

Composition is opt-in. A slot without `composes` takes no classes from a primitive, even when its name resembles one. A third-party component in the same app changes with a `_ButtonBase` patch only when its theme entry lists `_ButtonBase.root` in `composes`.

## Brand: CSS token overrides

Brand values, such as colors, control radius, control heights, the focus ring, shadows, sidebar widths, and calendar cell size, are [theme tokens]{@term Theme Token}. The file `@vueda/theme/vueda-tailwind/base.css` defines them. Theme classes read the tokens through Tailwind utilities, such as `h-vueda-control` and `bg-primary`, or through arbitrary values, such as `size-[var(--vueda-cal-day)]`.

An application overrides a token in its own stylesheet, after the `base.css` import:

```css
@import "@vueda/theme/vueda-tailwind/base.css";

:root {
    --primary: oklch(0.6 0.15 180); /* teal */
    --vueda-control-height: 36px; /* taller controls */
    --vueda-control-radius: 6px; /* softer corners */
}
```

Every class that reads [`--primary`]{@api css-token:primary}, [`--vueda-control-height`]{@api css-token:vueda-control-height}, or [`--vueda-control-radius`]{@api css-token:vueda-control-radius} picks up the new value. No JavaScript runs, and no `patchTheme` call is involved.

The font tokens, [`--vueda-font-sans`]{@api css-token:vueda-font-sans} and [`--vueda-font-mono`]{@api css-token:vueda-font-mono}, hold font family names. `base.css` ships no font files. The application loads the fonts. The project templates load the variable builds of IBM Plex Sans and JetBrains Mono in `client/src/index.css`, next to the `base.css` import. [Load or replace the fonts](../guides/customize-vueda-appearance#load-or-replace-the-fonts) shows how to load these fonts or replace them.

## Tokens and theme entries

The token layer and the JavaScript theme divide the work by the kind of change. A value, such as a color, a dimension, or a duration, is a token. A composition, such as a different class arrangement, a different structure, or a new state behavior, belongs in a theme entry.

A token override cascades through CSS. It reaches every class that reads the token, whichever component rendered that class. A token cannot express composition or per-component logic; those changes need a theme entry. A value that changes between brands belongs in a token, even when only one component uses it today.

The default look comes from the token values, so a set of token overrides [re-skins]{@term Skin} VUEDA with no change to any theme entry.

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

## Reserved z-index bands

Application chrome, such as a custom header, a banner, a sticky toolbar, or an overlay, shares one stacking order with VUEDA's components. VUEDA publishes no z-index tokens. The default theme sets z-index with Tailwind `z-*` utilities and reserves these bands:

| Band         | Concern                  | What sits there                                                                                                                                                               |
| ------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `< 10`       | Component-local stacking | Ordering inside one component's own stacking context. These values take no part in page-level layering.                                                                       |
| `10`         | Focus promotion          | A focused control in a group, lifted above its neighbours so that its focus ring is not clipped.                                                                              |
| `20`         | Focus-within and rails   | A focused calendar day, and the [`SidebarRail`]{@api vue:component:SidebarRail}.                                                                                              |
| `30` to `39` | Sticky page chrome       | [`PageTitle`]{@api vue:component:PageTitle}, [`StickyBar`]{@api vue:component:StickyBar}, and every bar in a [`StickyStackProvider`]{@api vue:component:StickyStackProvider}. |
| `40`         | Fixed shell chrome       | The [`Sidebar`]{@api vue:component:Sidebar} desktop panel.                                                                                                                    |
| `50`         | Floating overlays        | Dialogs, sheets, drawers, popovers, dropdowns, tooltips, menus, selects, comboboxes, and hover cards.                                                                         |
| `> 50`       | Toasts                   | [`Sonner`]{@api vue:component:Sonner}. The `vue-sonner` package sets this value; VUEDA does not.                                                                              |

The bands order the layers as follows:

- The sticky stack owns `30` to `39`. `StickyStackProvider` sets each bar's z-index to 30 plus the bar's position in the stack, so a stack of _N_ bars spans `31` to `30 + N`. A bar placed inside a `StickyStackProvider` joins the stack and takes its z-index from the provider. Other chrome given a z-index in this band interleaves with the stack's bars.
- The `Sidebar` at `40` sits above the sticky stack, so a pinned toolbar does not cover the navigation. It sits below every overlay, so a dialog covers the navigation. On mobile, the Sidebar renders as a sheet in the `50` band.
- An overlay at `50` sits above the sticky chrome and the Sidebar, in the same band as VUEDA's dialogs and popovers.
- Toasts stack above every band, including an overlay band that an application raises.

The default theme's design canon (`client/lib/theme/vueda-tailwind/README.md`, section 5.1) lists the components in each band and the reason for each band.

## How the theme is registered

The four scopes describe which rendered elements a change reaches. Registration decides which default entries the {@term Theme Registry} holds, and which theme modules ship in the bundle.

The {@api js:module:@arrai-innovations/vueda/use/themeRegistry} module defines two registration functions, and {@api js:module:@arrai-innovations/vueda/use/useTheme} re-exports both:

- [`setTheme(theme)`]{@api js:function:@arrai-innovations/vueda/use/themeRegistry#setTheme} replaces the whole registry, including earlier patches. A component whose module loaded before the call keeps a default entry only when `theme` contains one. A component module that loads after the call adds its default entry to the new registry.
- `patchTheme(partial)` merges entries into the registry and leaves other entries in place. Each default theme module calls it to register its own entry.

The built-in `vueda-tailwind` theme has one module per component, at `@vueda/theme/vueda-tailwind/<family>/<Component>.theme.js`. Each themed component imports its theme module for that module's side effect. A component therefore registers its default entry when its own code loads, with no global setup.

An application uses one of three registration paths. They differ in the theme import in `main.js`:

| Path            | Setup                                                     | What registers                                                                   |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Eager (default) | `import "@vueda/theme/vueda-tailwind/index.js";`          | All built-in defaults when the module loads                                      |
| Per-family      | `import "@vueda/theme/vueda-tailwind/<family>/index.js";` | That family's defaults and their shared dependencies when the module loads       |
| Per-component   | No aggregate or family theme import                       | Each imported component's defaults and shared dependencies when its module loads |

The project templates use the eager path. ES module imports run before the body of `main.js`, so every built-in default has registered before a `patchTheme` call in that body runs. The aggregate module's default export is a snapshot of the registry at import time. A `setTheme` call with that export reinstalls the snapshot and discards every patch made after the import.

On the per-family path, `main.js` imports family modules in place of the aggregate module. Components from other families still register their own defaults when their modules load.

On the per-component path, the application imports neither the aggregate module nor a family module. Each component registers its default when its module loads, for example when `@vueda/controls/button/Button.vue` loads. Theme modules for components that nothing imports stay out of the bundle. Registration happens when a component module loads, which includes the moment a lazy route loads its code. A component's first render does not trigger registration.

::: warning Project patch ordering
A project patch must run after the defaults that it customizes have registered. When a default registers after a patch, the default's value wins on each key that both set, including `composes`. The exception is `class`: the registry keeps the `class` values from both. On the per-family and per-component paths, a `patchTheme` call in `main.js` can run before a lazy route loads the component that it customizes. When `main.js` imports that component or its theme module before the call, the default registers first. [#378](https://github.com/arrai-innovations/vueda/issues/378) tracks overrides that apply regardless of load order.
:::

All three paths need the application stylesheet to import Tailwind and `@vueda/theme/vueda-tailwind/base.css`. The JavaScript registration path does not change the CSS setup.

Built-in components import their defaults before their setup runs. An application can also register a loader function as a component's entry, such as `patchTheme({ Button: () => import("./buttonTheme.js") })`, where the loaded module calls `patchTheme` with the real entry. While that loader is pending, `useTheme` reports [`loading`]{@api js:type:@arrai-innovations/vueda/use/useTheme#UseThemeReturnFunction}, and themed roots apply a hide style until the loader settles.

## Relationship to shadcn-vue

VUEDA's control layer is built on shadcn-vue, which wraps Reka UI headless primitives. Where a VUEDA component corresponds to a shadcn-vue component, it has the same name: `Button`, `Dialog`, `Alert`, `Pagination`, and `Sonner`, for example. Components with no shadcn-vue counterpart, such as `PageTitle`, `StickyBar`, and the `View*` family, have VUEDA names.

VUEDA's source is JavaScript. Each component is a single-file component that an application imports by its path, such as `@vueda/controls/button/Button.vue` or `@vueda/shell/dialog/Dialog.vue`. No barrel module exports a group of components.

The VUEDA theme starts from shadcn-vue's defaults. Where the two differ, such as in control radius, control height, and motion, the VUEDA theme sets its own values.

A shadcn-vue component selects its variant classes with `cva` and merges them with `cn()` in the component file. A VUEDA component takes its classes from its theme entry, which can compute them from the component's props. Overrides reach descendants through `useThemeOverride`, so the components in between need no extra props. VUEDA components also accept a `class` prop at the call site.

A shadcn-vue block therefore does not run unchanged in a VUEDA project. Its imports point to `@/components/ui/...`, and it calls `cn()`, which VUEDA does not provide. [Port a shadcn-vue block](../guides/customize-vueda-appearance#port-a-shadcn-vue-block) describes how to adapt one.
