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

- **CRUD view default themes (form body gutter)**:
    - `ViewCreate`, `ViewRead`, and `ViewUpdate` now register their own theme entries, each with `root` and `body` slots. The `body` slot applies a default `px-5 py-5` gutter to the form/body region (the wrapper around the error display and the generated form), aligning its left edge with the StickyBar controls and PageTitle above it. Previously these regions had no padding, so fields rendered flush against the surrounding layout.
    - `ViewCreate`'s root and body wrappers now carry `data-qa="create-form-root"` and `data-qa="create-form"`, matching the `read-form-root`/`read-form` and `update-form-root`/`update-form` markers already present on `ViewRead` and `ViewUpdate`.
    - The submit/action button cluster's `data-qa` is now plural across all three views, since the element is a container that wraps multiple buttons: `create-action-buttons`, `read-action-buttons`, and `update-action-buttons`. This renames the previous singular `read-action-button` and `update-action-button` markers (and fixes `ViewCreate`, which was mislabeled `update-action-buttons`).
      _If you target these clusters by `data-qa` in tests or selectors, update `read-action-button` to `read-action-buttons` and `update-action-button` to `update-action-buttons`._
      _No action is required. Existing styling hooks still apply and merge with the theme slots: `ViewUpdate`'s `class`/`outerClass` props, `ViewCreate`'s `class` prop, and `ViewRead`'s forwarded `$attrs` class. Override the `body` slot of any of these via `themeOverride` (or `setTheme`) to change the gutter._
- **Submit-time warning confirmation (FormConfirmDialog, useObjectForm)**:
    - Create/update submissions that the server answers with `409 Conflict` (valid, but carrying advisory warnings) now prompt the user to confirm instead of failing. `useObjectForm` exposes a `confirmation` controller and a `onSubmissionWarningsRequireConfirmation` hook; on confirm it resubmits once, acknowledging the warnings, and on cancel it leaves the form unsaved with the warnings displayed. `ViewCreate` and `ViewUpdate` render the new `FormConfirmDialog` wired to that controller.
    - Added `ConfirmationRequiredError` (`@vueda/utils/errors.js`), thrown by `defaultObjectCreate`/`defaultObjectUpdate` on a 409; both adaptors also accept an `acknowledgeWarnings` digest and send it as the `Acknowledge-Warnings` header.
    - The `confirmation` controller fails closed when no dialog is bound: if a 409 arrives while no consumer is registered, the save resolves as cancelled (the form stays unsaved with the warnings rendered on the fields) and a console warning identifies the missing dialog, instead of leaving the submit pending forever. `FormConfirmDialog` registers itself on mount; a custom dialog must call `confirmation.register()` and `confirmation.unregister()`.
      _No action is required for the default `ViewCreate` and `ViewUpdate` flows. Custom create or update shells that call `useObjectForm` directly should render a `FormConfirmDialog` (or their own dialog that registers itself) bound to `objectForm.confirmation`, otherwise warned saves are cancelled with a console warning. Requires a server release that implements the `get_warnings` confirmation gate._
- **Action and bulk-delete warning confirmation (ActionForm, useActionForm, useViewDestroy)**:
    - Action submissions that the server answers with `409 Conflict` (valid, but carrying advisory warnings) now prompt the user to confirm instead of surfacing an opaque failure. `useActionForm` exposes the same `confirmation` controller and `onSubmissionWarningsRequireConfirmation` hook as `useObjectForm`; on confirm it reruns the action once with the warnings acknowledged, on cancel the action does not run and no failure toast or banner is shown. A changed warning set yields a new digest and re-prompts.
    - `ActionForm` mounts the `FormConfirmDialog` itself, so `ViewAction`, `ViewDestroy`, and custom shells built on `ActionForm` get confirmation without extra markup. This differs from object forms, where the view shell renders the dialog.
    - `ModelActionForm`'s `defaultRunAction` and `defaultObjectsDelete` (`@vueda/utils/listCrud.js`) now throw `ConfirmationRequiredError` on a 409, and both accept an `acknowledgeWarnings` digest that they send as the `Acknowledge-Warnings` header. `useViewDestroy`'s `handleDelete` forwards `acknowledgeWarnings` and clears a `ConfirmationRequiredError` out of the list state before rethrowing, so a gated delete never renders as a fetch-failure banner behind the dialog.
    - Added `useConfirmationController` (`@vueda/use/useConfirmationController.js`), the shared factory behind the `confirmation` controllers of `useObjectForm` and `useActionForm`. Registration (`register()`/`unregister()`) and fail-closed semantics are unchanged.
      _No action is required for `ViewAction`, `ViewDestroy`, or shells built on `ActionForm`. Callers that use `useActionForm` without the `ActionForm` shell should render a `FormConfirmDialog` bound to the returned `confirmation` controller, otherwise warned actions resolve as cancelled with a console warning. Requires a server release with the action and bulk warning gate (viewset `get_warnings(action, objs)`, `gate_warnings`, `@action(confirm=True)`)._
- **useWarnings (removed)**:
    - The proactive warning fetch has been removed. The `useWarnings` composable, its `setUsingWarnings` toggle, and the `onRetrieveErrorHandler` helper are gone, along with the automatic `GET /routes/<app>/<model>/<pk>/warnings/` (and the bulk `?pks=...&action=...` variant) that update and action views issued on load. No server release ever implemented that endpoint, so the request always 404'd.
    - Submission-time warnings are unaffected: a serializer that raises `VuedaValidationError(detail, is_warning=True)` still returns warnings in its 400 response, and `FormValidationError`, `handleServerFormValidationError`, and `FormMessage` (`type="message"`) still route and render them into `state.messages`.
      _If you relied on the proactive fetch (no shipped server provided it, so this is unlikely), surface the advisory data yourself: include it in the model config or detail payload your view already loads, or add a project-specific route and fetch it from a custom view. Remove any `setUsingWarnings(...)` calls, which no longer exist._
- **Page title (PageTitle, usePageTitle, PageActions)**:
    - The page `<h1>` is no longer rendered inside each view. Views contribute their title and loading state through the new `usePageTitle` composable, and `PageTitle` is now a layout-level display that the integrator places above `<RouterView>`. Page-level action buttons are wrapped in the new `PageActions` component, which teleports them into the title bar's action zone (with an inline fallback when no zone exists).
    - `PageTitle` no longer accepts the `title` or `loading` props, nor the `eyebrow`, `title-suffix`, `subtitle`, `under-actions`, `footer`, or `button` slots. It reads the title and loading state from `usePageTitle` and exposes a `title` slot plus the action zone. `ViewList`'s search and column controls now render in the view body instead of the title bar. `AuthForm` renders its own heading markup rather than embedding `PageTitle`.
      _Establish the context once in your root layout: call `usePageTitle()` in `TheApp.vue`'s `<script setup>`, then render `<PageTitle />` where the page title should appear (above `<RouterView>`). The Copier client templates do this by default. A custom title display reads the same context by calling `usePageTitle()`._
- **Theme registration and lazy loading**:
    - The built-in `vueda-tailwind` theme is now authored as per-component `*.theme.js` modules. Components can register only the theme entries they need, while the existing global `setTheme(vuedaTailwind)` path remains supported.
    - Three loading paths are supported: global eager theme registration, per-family side-effect imports, and fully lazy component-level registration.
      _No action is required if your application already calls `setTheme(vuedaTailwind)`. To reduce bundle size, remove the global `setTheme(vuedaTailwind)` call and let components register their own theme entries as they render. Keep importing `@vueda/theme/vueda-tailwind/base.css`._
- **Toast dependencies**:
    - `vue-sonner` is now a peer dependency of `@arrai-innovations/vueda`, and the Copier client templates install it directly.
      _Add `vue-sonner` to consuming applications so direct `toast` imports and VUEDA's toaster resolve the same package instance._
- **Field shell layout**:
    - Horizontal `Field` labels now use a shrinkable, capped column, and `FieldContent` can shrink inside flex rows. This prevents controls and helper text from overflowing narrow horizontal field containers.
- **SidebarRail**:
    - The default theme now uses a pointer cursor for the sidebar rail because the rail toggles collapse state on click. It no longer advertises unsupported width resizing through resize cursors.
- **SidebarUserBlock**:
    - The default theme now fits the user block inside icon-collapsed sidebars by reducing the root to the 32 px avatar target and hiding identity text plus the kebab slot.
- **StickyBar**:
    - Added a `scrollRoot` prop. When the bar lives inside a scrollable region rather than scrolling the whole page, pass that region's element so the bar pins to and reacts to it. The hide/reveal threshold and the scroll listener bind to `scrollRoot` instead of the window.
      _No action is required. The prop defaults to `null`, which preserves the existing window-based behavior._
- **WidgetImage, WidgetFile**:
    - Both widgets now consume the `{name, url}` representation produced by the server `FileField` and `ImageField` serializer fields. `WidgetImage` unwraps `url` for the preview image and distinguishes a freshly picked `File` (kept in the submission) from a persisted `{name, url}` reference (excluded from the submission, so the existing file is not re-uploaded). `WidgetFile`'s download link now reads `url` instead of the previously unpopulated `objectURL`.
    - `WidgetImage` now shows a live preview of a freshly picked image before it is saved, using a local object URL that is revoked when the selection changes or the widget unmounts.
    - `WidgetFile`'s file-name link now opens a freshly picked (unsaved) `File` in a new tab via a local object URL, revoked when the selection changes or the widget unmounts. Previously the link pointed the `File` object at its `href`, which navigated to `[object Object]`. Persisted `{name, url}` references continue to link to their `url` in the same tab.
      _Ensure file and image model columns serialize to the `{name, url}` shape. VUEDA serializers do this by default once the matching server release maps `models.FileField` and `models.ImageField` to VUEDA's serializer fields._
- **Redundant `*Class` props removed (LinkModelView, DetailView, InputOTP)**:
    - `LinkModelView` no longer accepts a `buttonClass` prop. The component renders a single root (the `Button`) and inherits attributes, so a `class` set on `<LinkModelView>` already falls through to the underlying button and merges with its theme classes.
      _Replace `:button-class="…"` with `:class="…"` (or a plain `class="…"`). To restyle deeper button slots, forward `themeOverride` instead._
    - `DetailView` no longer accepts the `headerClass`, `titleClass`, `bodyClass`, or `loadingClass` props. These targeted a header/title region that `DetailView` no longer renders (the page title now lives in the layout-level `PageTitle`), so the props had no effect.
      _Remove these props from `<DetailView>` usage. Style the page title via `PageTitle`'s `themeOverride`; `DetailView`'s `class` (root) and `outerClass` (form wrapper) props are unchanged._
    - `InputOTP` no longer accepts a `containerClass` prop. It was always overridden internally by the computed container class (`theme('root')` plus the `class` prop).
      _Use the `class` prop to add classes to the OTP container, or `themeOverride` against `InputOTP.root`._
- **`*Class` props folded into `themeOverride` (PageTitle, ViewUpdate, DetailView)**:
    - `PageTitle` no longer accepts a `headerClass` prop. The class it added is now supplied through the theme: target the `root` slot via `themeOverride` (or `setTheme`).
      _Replace `:header-class="…"` on `<PageTitle>` with `:theme-override="{ PageTitle: { root: { class: '…' } } }"`._
    - `ViewUpdate` no longer accepts an `outerClass` prop, and now accepts `themeOverride`. The form-body wrapper's classes come from the `body` theme slot; merge extra classes by overriding that slot.
      _Replace `:outer-class="…"` on `<ViewUpdate>` with `:theme-override="{ ViewUpdate: { body: { class: '…' } } }"`._
    - `DetailView` now registers its own theme entry with `root` and `body` slots (matching `ViewCreate`/`ViewRead`/`ViewUpdate`) and accepts `themeOverride`; its `outerClass` prop is removed. The `body` slot applies the same `px-5 py-5` content gutter as the other CRUD views, so the form region now aligns with the StickyBar controls and page title above it. Previously this region had no padding.
      _Replace `:outer-class="…"` on `<DetailView>` with `:theme-override="{ DetailView: { body: { class: '…' } } }"`. If you relied on the previous flush (no-gutter) body, override the `body` slot to reset the padding._
- **`themeOverride` now accepted by all themed components**:
    - A set of themed components did not expose the `themeOverride` prop, so per-instance overrides passed to them were ignored even though they resolve their classes through the theme system. They now accept `themeOverride` consistently with the rest of the library: `ClickToCopyText`, `FieldRenderer`, `FilterForm`, `FilterGroup`, `MobileSortComponent`, `ModelActionForm`, `FieldSetStackedInline`, `FieldSetSingularStackedInline`, `ViewCreate`, `ViewRead`, `ViewHistoryList`, `ViewSetupDevice`, `ViewRecoveryCodes`, `ViewTwoFactorAuth`, and `WidgetPreviewableTemplate`.
      _No action is required. To restyle one of these per instance, pass `:theme-override="{ <Component>: { <slot>: { class: '…' } } }"` instead of relying on a global `setTheme`/`patchTheme`. `FieldRenderer` resolves the `FormModel` theme key._

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
