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

- **Checkbox keeps a stable footprint across checked and unchecked states (Checkbox)**:
    - The checkbox root now centers its indicator in an `inline-flex` box and sits on `align-middle`, so it holds a fixed 24px (`size-6`) box and a constant line-box contribution in every state. The indicator mounts only when checked, so the unchecked root previously fell back to the inherited line-height (rendering a couple of pixels taller), and on the default `baseline` alignment its reported baseline differed between states. Either one shifted the height of the surrounding row when a selection checkbox was toggled, including inside baseline-aligned containers such as the card-layout `ObjectsGrid` grid.
      _No action required; visual fix._
- **Scroll-reveal composable extracted from StickyBar (new `useScrollReveal`)**:
    - `StickyBar`'s hide-on-scroll-down / reveal-on-scroll-up logic now lives in a reusable composable, `useScrollReveal(rootRef, { reveal, scrollRoot, idleDelay })`, which returns a reactive `{ hidden }`. The `reveal` strategy is selectable: `always` (never hides), `scroll-up` (hides until a deliberate scroll up, no idle reveal), and `scroll-up-or-idle` (also reveals when scrolling settles). `reveal` also accepts a boolean (or boolean ref/getter) to hand visibility control to the caller entirely. `scrollRoot` accepts an element, a ref, or a getter, and the scroll listener and idle timer tear down automatically on scope dispose.
    - `StickyBar` is unchanged for consumers: same props, same markup, same default behavior (it uses the `scroll-up-or-idle` strategy). The composable is shared groundwork for the sticky page-chrome work below.
      _No action required. If you want hide-on-scroll behavior on your own chrome, import `useScrollReveal` from `@vueda/use/useScrollReveal.js` rather than reaching into `StickyBar`._
- **Framework-owned sticky page chrome (new `StickyStackProvider`, `StickyChrome`, `useStickyStack`)**:
    - New opt-in layout primitives for pinning page chrome. `StickyStackProvider` wraps the scrolling region (the window keeps scrolling; the provider adds no `overflow`) and lays out an ordered stack of independently-revealing bars pinned to the top and bottom of the viewport. Place the page title in its `top` slot; it becomes the always-pinned first bar. Each bar reveals on its own schedule, so the title can stay pinned while a filter toolbar hides on scroll-down and a form-action bar reveals on idle.
    - `StickyChrome` teleports a view's chrome into a zone (`zone="top"` / `zone="bottom"`) at a given `order`, with its own `reveal` behavior (a `useScrollReveal` strategy or a boolean), degrading to in-place rendering when no provider is present. `useStickyStack` is the underlying context (provider role establishes it; view role registers a bar), mirroring `usePageTitle`. Each bar's sticky offset is the cumulative height of the visible bars between it and the viewport edge, computed internally (via the `resolveStickyStack` utility) and applied as inline style, so no offsets cross the layout boundary; hiding one bar compacts the rest.
    - The provider publishes the visible top-stack height as the `--vueda-sticky-stack-top` custom property for a sticky grid header to offset against, and warns in development when an ancestor's non-visible `overflow` would silently break window-relative `position: sticky`.
      _Opt-in and additive; nothing changes unless you place `StickyStackProvider` in your shell. Existing `StickyBar` usage is unaffected. Integration requirement: keep the provider free of any ancestor that sets `overflow` to a non-visible value (`auto` / `scroll` / `hidden` / `clip`), or window-relative sticky will pin to that ancestor instead of the viewport._
- **List and form chrome migrated onto the sticky stack (ViewList, ViewCreate, ViewUpdate, ViewRead, DetailView, StickyBar; integrator templates)**:
    - `ViewList` now teleports its under-actions toolbar into the top zone (revealing on scroll up), its bulk-actions bar into the bottom zone (always shown, stacked just above pagination), and its pagination footer into the bottom zone (always shown) through `StickyChrome`. The bulk-actions bar moved from above the grid to the bottom zone so selecting the first row grows the document at the bottom (a small scrollbar change) instead of shoving the grid down; its hairline moved from the bottom edge to the top to match the pagination strip's rhythm. With no `StickyStackProvider` present, all three render inline (the bulk-actions bar now below the grid, above pagination), so lists without the provider are unchanged in behavior.
    - `StickyBar` gains a zone-managed mode. New props `zone` (`top` / `bottom`), `order`, and `reveal` let a bar teleport its surface into a `StickyStackProvider` zone and hand positioning and reveal to that zone, so it stacks with the page title and other chrome instead of self-sticking. When `zone` is omitted the bar is standalone and behaves exactly as before (self-sticky to the window or `scrollRoot`, default `scroll-up-or-idle` reveal). The new `reveal` prop also exposes the reveal strategy for standalone bars, which was previously fixed at `scroll-up-or-idle`. In zone-managed mode the bar renders only its inner surface; the `data-qa="sticky-bar-root"` wrapper (which carried the self-sticky positioning) is omitted because the zone provides it.
    - `ViewCreate`, `ViewUpdate`, `ViewRead`, and `DetailView` now render their form-action / detail-action bar with `zone="top"`, so it joins the top stack below the page title and reveals on idle. This removes the long-standing window-scroll assumption in these four views (they previously self-stickied to the window and silently did nothing inside an inner scroll container).
    - The `integrator-monorepo` and `integrator-monorepo-dx` templates now wrap `<RouterView>` in `StickyStackProvider` with `PageTitle` in the `top` slot.
      _If you render `ViewList`, `ViewCreate`, `ViewUpdate`, `ViewRead`, or `DetailView` in a shell without a `StickyStackProvider`, their toolbar, bulk-actions bar, action bar, and pagination now render inline (in normal flow) instead of pinned. To keep them pinned, place a `StickyStackProvider` around your routed content with `PageTitle` (or your own title component) in its `top` slot; see the updated templates. Standalone `<StickyBar>` usage and the `scrollRoot` prop are unchanged._
- **Type-aware list columns (ViewList; new ColumnText / ColumnDateTime / ColumnModelLink, `availableColumns`, `columnMappings`, `resolveColumns`)**:
    - `ViewList` now derives a column renderer from each field's type, the same way `ModelForm` derives a widget. Date, time, and datetime columns render through `DateTimeDisplay`; foreign-key and one-to-one columns render as links to the related object's detail view through `LinkModelView`. Every other column falls back to `ColumnText`, which reproduces the previous plain formatted-text cell, so non-relation, non-date columns are unchanged. Object and array values that reach `ColumnText` (an inlined related object, or a JSON field with no more specific adapter) render as compact JSON, truncated when very large, instead of `[object Object]`.
    - Resolution and injection happen at the `ViewList` layer, so the grid cells stay presentation-neutral. Precedence, highest first: a consumer `#field(<col>)` slot, the `columnComponents` prop on `<ViewList>`, `modelConfig.config.columnComponents[<col>]`, the type default from `columnMappings`, then `ColumnText`. A matching `columnProps` map (prop or model config) supplies extra props to the resolved adapter.
    - New public surface: the `availableColumns` registry (`@vueda/utils/columnLookups.js`), the `columnMappings` table plus `mergeColumnMappings` (`@vueda/utils/columnMappings.js`), and the `resolveColumns` resolver (`@vueda/utils/resolveColumnComponents.js`). New components `ColumnText`, `ColumnDateTime`, `ColumnModelLink`. New `ViewList` props `columnComponents` / `columnProps`, plus new model config keys `columnComponents` / `columnProps` (merged per field, like `fieldComponents` / `fieldProps`).
    - `ColumnModelLink` resolves its link target from the field's own `appLabel` / `model` metadata (provided by model-info for writable relations), falling back to `app` / `model` supplied via `columnProps`, then to plain label text when neither is available or the value has no pk. Many-relations (array values) render as text rather than a single link.
      _Foreign-key list columns now render as links automatically wherever the related model is resolvable; previously they showed the raw value. To keep a column as plain text, set its `columnComponents` entry to `"ColumnText"` (via the prop or model config) or provide your own `#field(<col>)` slot. Per-column slot overrides you already have keep working and take precedence, so hand-written per-column FK link slots can be deleted in favor of the default._
- **Expand descriptor metadata is now camelCased (storeModelInfo, ExpandInfo)**:
    - `storeModelInfo` now camelCases each expand descriptor's own keys (for example `app_label` becomes `appLabel`, `requires_permission` becomes `requiresPermission`), matching how it already camelCases field details. The field-name keys under an expand's `f` map are still preserved verbatim (they are server lookup keys), and each `FieldInfo` value under `f` is still camelCased. This removes a long-standing inconsistency where an expand root kept `snake_case` keys while field details were camelCase.
      _If you read an expand descriptor's related-model identity directly (for example `expandDetail.app_label`), switch to `expandDetail.appLabel`. The `model` key is unchanged. Default `ViewList` and `ModelForm` usage needs no change._
- **Layout-independent sort control in the list toolbar (new SortControl; ViewList; MobileSortComponent deprecated)**:
    - `ViewList` now shows a `Sort` control in the under-actions toolbar next to `Filters` whenever the model has sortable fields, in both table and card layouts. It opens the multi-field sort editor in a popover on desktop and a full-screen dialog on mobile (chosen by viewport at the 768px breakpoint), so desktop users get a first-class multi-column sort entry point instead of only column-header sorting. Column-header sorting still works; both write the same sort order.
    - New `SortControl` component wraps the shared `SortEditor` and teleports its trigger (label + active-sort count badge) into a host zone. `MobileSortComponent` is deprecated in favor of `SortControl`; it remains exported and functional for direct consumers. `useViewList` adds `sort.canShowSorter` (layout-independent) and deprecates `sort.canShowMobileSorter` and `sort.mobileSortDrawerVisible`.
    - The mobile full-screen dialog has a fixed title and close control plus a padded, independently scrolling editor body. Existing sort rows can no longer push `Add Sort` and `Clear all` outside the available viewport. The actions share a row at the `sm` breakpoint and stack on narrower screens. `DialogContent` adds a `fullScreen` prop so the default theme emits full-screen geometry instead of combining conflicting centered-modal and viewport classes. New mobile shell theme keys are `SortControl.dialog`, `SortControl.dialogHeader`, and `SortControl.dialogBody`; `MobileSortComponent` exposes matching keys.
      _No action is required for default `ViewList` usage; the sort control appears automatically. If you rendered `MobileSortComponent` directly, migrate to `SortControl` (props `sortables` / `sorted` / `fieldDetails` / `triggerTarget`, event `update:sorted`); register a `sort` icon (and `sortDown` for the direction toggle) in your `useIcons` registry for the trigger glyphs._
- **Add Sort now opens a field picker instead of appending the first unused field (SortEditor, MobileSortComponent)**:
    - The sort editor's `Add Sort` control is now a menu: it opens a popover listing the fields not yet in the sort, and picking one appends that field (ascending). Previously it appended the first unused field directly, leaving you to change it afterward. This mirrors the add-filter menu and matches the desktop multi-field sort design.
    - The `add-sort-button` slot is now the menu trigger (wrapped so the popover opens from it) and no longer receives an append click handler.
      _No action is required for default usage. If you overrode the `add-sort-button` slot and called its click handler to append a sort, the slot now only needs to render a trigger button; the menu handles appending._
- **Sort editor extracted into a shared, shell-agnostic component (new SortEditor; MobileSortComponent)**:
    - The multi-field sort editor body (reorderable rows, per-row field select, direction toggle, remove, `Add Sort`, `Clear all`) now lives in a new `SortEditor` component. `MobileSortComponent` is now a thin full-screen dialog shell that hosts `SortEditor`, owning only the trigger button, the dialog open/close state, and the applied-sort count badge. `SortControl` reuses the same editor body in its desktop popover. `MobileSortComponent`'s props, events, and slot names are unchanged.
    - The editor's theme keys moved from the `MobileSortComponent` theme namespace to a new `SortEditor` namespace: `drawerInner` is now `SortEditor.root`, and `draggable`, `draggableItem`, `draggableItemInner`, `dragHandle`, `sortOrderText`, `select`, `sortInlineActionBar`, and `actionBar` are now under `SortEditor`. `MobileSortComponent` now owns `dialog`, `dialogHeader`, and `dialogBody`; its former `drawer` key no longer applies because the shell is no longer a drawer.
      _If you override any of those moved keys via `themeOverride`/`setTheme`, re-target them under `SortEditor` (for example, `MobileSortComponent.draggableItem` becomes `SortEditor.draggableItem`). Replace a `MobileSortComponent.drawer` override with the appropriate `dialog`, `dialogHeader`, or `dialogBody` override._
    - The editor no longer ships emoji as the default direction and remove glyphs. The direction toggle now renders the `sortDown` icon from the `useIcons` registry (rotated 180 degrees for ascending), and the remove control renders the registry `close` icon; both fall back to no glyph when the icon is not registered, consistent with the existing drag-handle (`gripVertical`). The `sort-icon`, `toggle-order-button`, and `remove-sort-button` slots still override these.
      _Register a `sortDown` entry in your `useIcons` registry (most apps already register `close` and `gripVertical`) to show the direction glyph, or provide the `sort-icon` slot. If you relied on the emoji defaults, the controls will render without a glyph until you do._
- **List sorting survives reloads and round-trips through the URL (storeListPreference, ViewList)**:
    - `storeListPreference.getSorting` returned the stored sort as a plain object (`{ 0: "-updated", 1: "mrr" }`) instead of an array. On restore, `ViewList` fed that object straight back into `setSorting`, whose array guard rejected it and cleared the saved sort. The net effect was that a saved column sort applied once on the first load, then vanished on the next reload. `getSorting` now returns a fresh array (`["-updated", "mrr"]`), so saved sorts persist across reloads. Multi-field (multi-column) sorts persist correctly too.
    - Active sorting is now written to the list URL as the `o` query parameter, for example `?o=-updated,mrr`, so a sorted list can be bookmarked or shared. A URL sort takes precedence over the viewer's saved preference. Any non-empty incoming query without `o` is also left unsorted, which prevents a shared filtered URL from silently acquiring a local sort.
    - Returning to a list through a route with no query parameters restores saved filters and sorting together. Clearing sorting removes `o` without removing active filters, and changing filters or search preserves `o` without storing it as a filter preference.
      _No action is required. If you read `getSorting` directly, it now returns `string[] | null` (a copy of the stored field list, leading `-` for descending) rather than an index-keyed object._
- **Dark-mode text on portal surfaces (DialogContent, AlertDialogContent, DialogScrollContent, SheetContent)**:
    - Portal surfaces that paint `bg-background` now also set the paired `text-foreground` token. This prevents dark dialogs and sheets from inheriting a light-mode text color from an unrelated page ancestor.
- **Dependency security floor**:
    - The client package now requires `dompurify` 3.4.11 or newer so installs resolve to versions with the published DOMPurify sanitization fixes.
      _No action is required unless your application pins `dompurify` below 3.4.11._
- **Model-backed filter choices render correctly (WidgetModel)**:
    - `WidgetModel` no longer forwards relation `app` and `model` metadata to its internal combobox when rendering fetched choice options. Forwarding those attrs accidentally switched the combobox into direct API-search mode, so model-backed filter widgets could request results successfully but render empty option labels.
      _No action is required for default `ViewList` filters._
- **Choice fetch URLs no longer 301-redirect (storeModelChoices)**:
    - `model_info_choices` and `model_info_filter_choices` fetches now include the trailing slash before the query string (`.../{field}/?ps=200`). Previously the missing slash made Django's `APPEND_SLASH` answer every choice and filter-choice fetch with a 301 redirect, doubling the round-trips.
      _No action is required. If you asserted on the exact request URL (for example, in a mock or proxy), add the trailing slash before `?`._
- **List filters restructured: add-filter menu + chips (FilterGroup, ViewList; new FilterMenu / FilterChip / FilterFieldForm; FilterComponent removed)**:
    - The list view no longer renders one persistent dashed "+ Field" button per filterable. Instead, a single `Filters` control with an active-filter count sits in the under-actions toolbar and opens an add-filter menu listing the fields not yet applied; picking one drills the popover in place to that field's form. Active filters render as removable pill chips in a tinted strip that appears only when filters are present: click a chip to edit it (the same form, anchored to the chip), the dismiss control to remove it, or `Clear all` to reset every filter.
    - `FilterComponent` and its theme entry (`FilterComponent`) have been removed. Its per-field form controller now lives in the new `FilterFieldForm`, the active-filter pill in the new `FilterChip`, and the add-filter trigger/menu in the new `FilterMenu`. New theme entries: `FilterFieldForm`, `FilterChip`, `FilterMenu`. `FilterGroup` is now an orchestrator (it owns the active-filter list, mirrors it to the query params, restores active filters from the URL, and renders the menu + chips).
      _If you imported `FilterComponent` directly, or overrode the `FilterComponent` theme key or the `filter-component` / `filter-dropdown-button*` / `filter-clear-button*` slots, migrate to the new components and their slots / theme keys. Most consumers use these through `ViewList` and need no change._
    - `ViewList`: the filter trigger moved into the under-actions toolbar (teleported from `FilterGroup` into a new `filterTriggerZone`), the mobile sort affordance moved alongside it, and the active-filter chips render in a strip below. The standalone `StickyBar`-wrapped filter strip is gone, so the empty error band it used to reserve no longer appears. Theme keys `ViewList.filterGroupBar`, `ViewList.filterGroupBarEyebrow`, and `ViewList.sortComponentDiv` were removed; `ViewList.filterControls` and `ViewList.filterTriggerZone` were added. Filter errors now surface on the offending chip (destructive tint) and inline in its form rather than in a separate banner.
    - Added `getFilterParams`, `getFilterQueryValue`, and `buildFilterFromQuery` to `@vueda/use/useFilterForm.js` (and exported the `FilterFieldMappings` table) to support central URL→filter restoration.
    - Server-hidden filters are now excluded from the add-filter menu and from chip restoration. The auto-injected `id__in` deep-link filter (from `VuedaFilterSet` / `IdInFilterSet`, whose widget is a `HiddenInput` and which the filter metadata reports as `hidden: true`) has no mapped input widget; opening its filter form previously threw `No field component found for field "id"`. It is now treated as programmatic only, so it never appears in the menu or as an editable chip, while still applying when present in the URL.
    - Choice filters now work inside the add-filter menu and chip edit popovers. A choice widget's dropdown portals out of the popover's DOM, so opening it read as an outside interaction and dismissed the filter popover before a value could be chosen. The filter popovers now ignore outside-interaction dismissals that originate from a nested floating layer, via the new `keepOpenOverNestedPopper` helper (`@vueda/shell/popover/keepOpenOverNestedPopper.js`) wired to their content's `@interact-outside`.
    - Fixed a `cannot run an inactive effect scope` warning emitted when a filter form unmounted (drilling back, closing the popover, applying, or removing). `useReactiveHookRegistry` no longer runs its deferred aggregate update after its effect scope has been disposed, which also hardens any on-demand-mounted form built on `useForm`.
      _No action is required for default `ViewList` usage. Filter behavior (apply, edit, remove, clear, URL round-trip) is unchanged; only the presentation and component structure changed._
- **Sticky chrome fade gradients removed (StickyBar, PageTitle, ViewList)**:
    - The fade gradient beneath pinned chrome has been removed everywhere. `StickyBar` no longer renders its `gradient` element, and `PageTitle` no longer renders a `gradient` cap in `sticky` mode. The default theme treats protection/fade gradients beneath floating UI as disallowed with no exceptions.
    - The `StickyBar.gradient` and `PageTitle.gradient` theme keys (and the `data-qa="sticky-bar-gradient"` marker) no longer exist.
    - `ViewList`'s filter strip no longer double-wraps the bar in a second padded, bordered, tinted surface. The strip chrome (background, bottom hairline, `px-5 py-[10px]` padding) now lives once on `StickyBar.inner`; `ViewList.filterGroupBar` only retints the strip by setting the new `--vueda-sticky-bar-surface` custom property that `StickyBar.inner`'s background reads (defaulting to `--card`). This removes the extra padding and the nested box-in-a-box appearance under the filters.
      _If you override `StickyBar.gradient` or `PageTitle.gradient` via `themeOverride`/`setTheme`, remove those overrides; they no longer resolve. To retint a `StickyBar` from a wrapper, set `--vueda-sticky-bar-surface` (e.g. via an arbitrary `[--vueda-sticky-bar-surface:...]` class on the bar root) instead of painting a competing `bg-*` class on the root._
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
- **`verb` slot prop removed (ActionForm, FieldSetSingularStackedInline, FieldSetStackedInline, FieldSetTabularInline, FieldSetStackedInlineRow, ViewAction, ViewActivate)**:
    - The `verb` slot prop is no longer forwarded to button and icon slots. It was a lookup key for slot-level icon customization, but that role is now covered by `useIcons` and the `iconOverride` prop (`ICON_OVERRIDE_PROPS`).
      _If your slot overrides read the `verb` prop to select an icon or style a button, register the glyph against the component's icon key instead and customize it per instance with `:icon-override="{ <Component>: { <iconName>: { component, props } } }"`._
- **`severity` slot prop removed (MobileSortComponent, FilterGroup, DetailView, ViewRead, ViewUpdate)**:
    - `MobileSortComponent` no longer forwards a `severity` slot prop to its `toggle-drawer-button`, `remove-sort-button`, `add-sort-button`, or `clear-sort-button` slots. The default button renders in the appropriate variant without it.
    - `FilterGroup` no longer forwards a `severity` slot prop to its `clear-filters-button` slot.
    - `DetailView`, `ViewRead`, and `ViewUpdate` no longer pass `severity` to the action and workflow-transition button slots.
    - `severity` was a PrimeVue-specific button styling prop that has no meaning in the current shadcn-style button model.
      _If your slot overrides read `severity` to style a button, switch to the `variant` prop instead (`"secondary"`, `"destructive"`, `"outline"`, etc.)._
- **`iconOverride` prop and `ICON_OVERRIDE_PROPS` (useIcons)**:
    - Components can now accept a per-instance `iconOverride` prop, the icon-registry counterpart to `themeOverride`. Spread `ICON_OVERRIDE_PROPS` (from `@vueda/use/useIcons.js`) into a component's props and pass `props` as the new second argument to `useIcons(componentName, props)`. The component's own icons then resolve against its `iconOverride`, merged over any inherited (ancestor) overrides and the default registry, and the merged set is provided to descendants. This is what makes scoped, slot-free icon customization possible, replacing the role the removed `verb` slot prop was meant to serve. `useIcons` called with only a component name is unchanged.
    - The registry merge no longer deep-clones entries. A `markRaw`'d icon component now survives being merged through an override; previously `useIconsOverride` deep-cloned the base registry, which would have structurally cloned the component definition. That path had no callers until now.
      _Opt a component in by spreading `ICON_OVERRIDE_PROPS` and passing `props` to `useIcons`. Pass overrides as `:icon-override="{ <Component>: { <iconName>: { component, props } } }"`, or use a `Default` bucket to cover every component in the subtree; a `Default` override outranks a component-specific entry in the default registry. `markRaw` any component placed in the prop, since Vue makes the prop reactive before the registry can mark it._
- **`vuedaViteConfig` allow-lists linked vueda source for the dev server (vite.js)**:
    - When vueda is wired in with `pnpm link` / `file:`, its source lives outside the consuming project, and Vite's dev server refused to serve those files ("outside of Vite serving allow list") the moment a view pulled one through the `@vueda` alias (for example a list rendering `ColumnText`). `vuedaViteConfig` now returns a `server.fs.allow` listing the workspace root plus the linked vueda source realpath, so linked source serves without manual configuration. Registry/workspace installs resolve inside `node_modules` and get no `server` fragment, unchanged.
      _No action required if you spread the helper result and do not set your own `server` block (the integrator templates do this). If you declare your own `server`, do not let a plain spread overwrite the helper's: merge instead, e.g. `mergeConfig(vuedaViteConfig(...), { server: { ... } })`, or preserve `fs.allow` inside your `server` block (`fs: { allow: [...(vueda.server?.fs?.allow ?? []), ...yourEntries] }`). Otherwise the linked-source allow-list is dropped and the dev server rejects vueda source again._

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
