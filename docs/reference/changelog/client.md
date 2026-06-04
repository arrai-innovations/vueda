---
title: Client
type: reference
audience: integrator
status: draft
---

# Client Changelog

Integrator-facing changes for the `@arrai-innovations/vueda` npm package.

Use this page for changes that affect client package consumers: public Vue components, composables, routes,
stores, theme behavior, build integration, dependency expectations, and migration notes.

## vNext (unreleased)

- **Theme registration and lazy loading**:
    - The built-in `vueda-tailwind` theme is now authored as per-component `*.theme.js` modules. Components can register only the theme entries they need, while the existing global `setTheme(vuedaTailwind)` path remains supported.
    - Three loading paths are supported: global eager theme registration, per-family side-effect imports, and fully lazy component-level registration.
      _No action is required if your application already calls `setTheme(vuedaTailwind)`. To reduce bundle size, remove the global `setTheme(vuedaTailwind)` call and let components register their own theme entries as they render. Keep importing `@vueda/theme/vueda-tailwind/base.css`._

## Public Baseline

Earlier VUEDA client versions existed for internal or private use. The v3 prerelease series is the first
public-facing documentation baseline.

## v3.0.0-alpha.1 (2026-05-27)

This release only bumped the package version to exercise the alpha publication flow.

## v3.0.0-alpha.0 (2026-05-27)

### Migration Summary

This is the first public-facing v3 client baseline. The major migration is the move from the old PrimeVue-based
surface to VUEDA's own Reka UI / shadcn-vue-style controls, theme registry, and generated component reference.

Expect to review custom field mappings, theme overrides, direct component imports, route setup, and any code that
relied on PrimeVue-era widgets or field-type components.

### Breaking Changes

- **PrimeVue-era control and widget surface**:
    - The client now ships VUEDA-owned control primitives and widgets built around Reka UI / shadcn-vue patterns. PrimeVue residue was removed from the library surface.
      _Review direct imports of old widgets or PrimeVue-oriented components and migrate to the new controls, widgets, and default theme entries._
- **Field type components**:
    - Type-specific `Field<Type>` components were removed from `availableFields`. `FormField` is now the generic field renderer.
      _Replace direct imports or string references such as `FieldString`, `FieldNumber`, or `FieldDate` with `FormField` plus the appropriate validation mode._
- **`makeCRUDRoutes`**:
    - `makeCRUDRoutes` now requires an explicit `actionRedirect` route for missing model/action guard paths.
      _Pass a redirect route that is not itself gated by `requireModelInfo`, for example `{ name: "not-found" }`._
- **`ViewRead` attribute forwarding**:
    - `ViewRead` no longer delegates its full shell to `DetailView`. Arbitrary HTML attributes now land on the inner content wrapper instead of the previous inner form element.
      _If you passed `class`, `style`, or `data-*` attributes to style the previous form node, retarget those selectors._
- **`DetailedView`**:
    - `DetailView` is now the canonical detail base component. `DetailedView` is deprecated.
      _Import `@vueda/components/DetailView.vue` instead of `@vueda/components/DetailedView.vue`._

### Features

- **Controls, shell, navigation, grid, and feedback primitives**:
    - Added VUEDA-owned primitives for buttons, inputs, date/time controls, command and select controls, dialogs, drawers, sheets, sidebars, tables, alerts, progress, skeletons, and related UI building blocks.
- **Default theme registry**:
    - Added `@vueda/theme/vueda-tailwind` as the default theme registry with CSS tokens, theme keys, family indexes, and generated reference docs.
    - Added icon resolution through `useIcons`, allowing components to render registered glyphs without hardcoding an icon library.
- **View composables**:
    - Added `useViewList`, `useViewUpdate`, and `useDetailView` so custom shells can reuse VUEDA's default list and detail behavior without copying default view components.
- **View and form safety components**:
    - Added `TypedConfirmField`, `ConsequencesBullets`, and `confirmText` support on destructive action flows.
    - Added `UserAvatar` and `SidebarUserBlock` for account and audit UI.
- **History and grid presentation**:
    - Improved `ViewHistoryList` with user avatars, history-type pills, a meta strip, filter slot support, and table/card layout controls.
    - Improved `ObjectsGrid` card mode, empty states, marked-destroy rows, and embedded-grid border behavior.
- **Vite integration**:
    - Added VUEDA Vite configuration support for exposing the client package version at runtime.

### Fixes

- **Form required-field timing**:
    - Required-field errors are now delayed for empty unchanged fields until submission or modification, reducing noise when users tab through empty forms.
- **`ViewUpdate` redirects**:
    - `redirectAfter` now redirects after a successful update.
- **`ViewRead` events**:
    - `ViewRead` now emits declared `related-object` and `calculated-object` events.
- **`FieldSetSingularStackedInline` initial values**:
    - Singular stacked inline rows now wait for `fieldObjects` before auto-creating the row and loading initial values.
- **`SidebarTrigger` icon behavior**:
    - The sidebar toggle glyph now resolves through the icon registry instead of rendering the old placeholder character.
      _Register a `SidebarTrigger.toggle` icon or provide the `icon` slot to show a visible glyph._
