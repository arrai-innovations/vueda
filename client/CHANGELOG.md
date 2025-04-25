# Changelog

_Actions potentially required by implementers are marked with italics._

## v2.0.0-alpha.7 (2025-04-25)

### Breaking Changes

- **`expands` vs `expand` consistency:**
    - _All internal uses of `expands` or `*Expands` (in model info, model config, and component props including form, field, and widget props) have been renamed to `expand` for consistency._
    - _Check your `modelConfigStore.setConfig` calls and any customized views for references to `expands`._

### Fixes

- **useLookupContext**:
    - Corrected `runRequestBatch` to properly compare and apply `expand` parameters (not mistakenly comparing `expand` to `fields`).
    - Ensures object lookups respect requested expansions when batching or reusing managers.
- **storeModelInfo**:
    - Client-side normalization now maps server `"model_expands"` to `"expand"` internally.
    - _Client code should consistently reference `expand`, avoiding mismatched `expands`._

## v2.0.0-alpha.6 (2025-04-25)

### Fixes

- **useLookupContext**: prevent race when cancelling and immediately re-requesting the same lookup by deferring cleanup of `consumerPromises` and `inflightPromises`, and ignoring unchanged watch triggers in `useResolvedLookupObject`.
- **useResolvedLookupObject**: ignore watch triggers where fields and expand haven't changed, preventing unnecessary cancellation and re-requesting of the same lookup.

### Refactors

- **WidgetSearchableSelect**: extract complex search, scroller, and lookup logic into a dedicated `useSearchableSelect` composable; improve loading handling by combining loading states, preventing a flash of the PK while label is loading, smoothing scroller resets on query/param changes, and fine-tuning debounce behavior.

## v2.0.0-alpha.5 (2025-04-24)

### Fixes

- **Peer Dependency Update**:
    - Bumped `@arrai-innovations/reactive-helpers` to `^20.0.1`.
    - _Ensure your project updates to this version to avoid breaking prop validation or unexpected behavior._
- Use `deepUnref` from `@arrai-innovations/reactive-helpers` for better types support of `vue-deepUnref`
- `readonly` calculated dependency values in `useFieldDependencyValuesRegistry`

## v2.0.0-alpha.4 (2025-04-24)

### TL;DR

- Unified CRUD prop names across all composables and components.
- Aligned with `@arrai-innovations/reactive-helpers@^20.0.0`, which introduced new expectations for prop naming and handler structure.
- **This is a breaking change for consumers passing `crudArgs`, `retrieveArgs`, or `listArgs` directly into `useList` or `useObject`-based props.**

### Breaking Changes

- **Prop Renames for CRUD Operations**:

    - Replaced `crudArgs` with `target` across all usage of `useList`, `useObject`, and related view/component integrations.
    - Replaced both `listArgs` and `retrieveArgs` with `params`, simplifying how query parameters are passed.
    - Renamed `functions` to `handlers` for injected implementations of `list`, `retrieve`, etc.
    - _Update any custom or third-party integrations using `useList`/`useObject`/`useLookupContext`/etc. to match the new naming._
    - _For example:_
        ```js
        useObject({
            props: {
                target: { app, model },
                pk,
                params: { f: ["id", "name"] },
            },
            handlers: {
                retrieve: myCustomRetrieve,
            },
        });
        ```
    - _Component props such as `<ViewList :params="..." />` and `<WidgetSearchableSelect :extraParams="..." />` now align with these names._

- **Peer Dependency Update**:
    - Bumped `@arrai-innovations/reactive-helpers` to `^20.0.0`.
    - _Ensure your project updates to this version to avoid breaking prop validation or unexpected behavior._

### Features

- **Slot Context Enhancements** (`ObjectsGrid`):
    - All slot contexts for `ObjectsGridBodyCell`, `ObjectsGridCardCell`, and `ObjectsGridTableHeader` now include:
        - `rowCount`, `columnCount`, `isTableLayout`, `isCardLayout`
    - Enables fine-grained control over layout-aware rendering in slot content.
    - _Use these values in scoped slots to conditionally adjust rendering based on grid size or mode._
        ```vue
        <template #field="{ rowCount, columnCount, isCardLayout }">
            <div :class="{ 'mobile-layout': isCardLayout }">{{ columnCount }} columns, {{ rowCount }} rows</div>
        </template>
        ```

## v2.0.0-alpha.3 (2025-04-23)

### TL;DR

- Introduced skeleton loading states and lazy rendering for fields and grids.
- Refactored memoization and case utilities for better reactive safety and consistency.
- Improved cancellation and reactivity in lookup batching.
- Requires `@arrai-innovations/reactive-helpers@^19.0.0` due to internal API updates.

### Breaking Changes

- **Peer Dependency Update**:

    - Bumped `@arrai-innovations/reactive-helpers` to `^19.0.0` to support internal improvements in `cancellableFetch`, `CancellablePromise`, reactivity guards, and value unwrapping.
    - _Ensure your project dependency is updated to `^19.0.0` to maintain compatibility._

- **Case Utility Refactor**:
    - Moved all CRUD name and case conversion helpers from `crudSupport.js` into a unified `case.js` file.
    - Moved constants like `DETAIL_VIEW_CRUD_NAME` and `LIST_VIEW_CRUD_NAME` to `constants.js`.
    - _Update any imports of `getAppModelDotName`, `getAppModelViewDotName`, `getCRUDName`, etc., to use `@vueda/utils/case.js`._
    - _Update any usage of `DETAIL_VIEW_CRUD_NAME`, `LIST_VIEW_CRUD_NAME` to import from `@vueda/utils/constants.js`._

### Features

#### Utility & Memoization Improvements

- **Reactive-Safe Memoization Keys**:
    - Updated all `memoize` helpers (e.g., `getCRUDName`, `getAppModelDotName`) to use `unwrapNested` to safely support refs/reactive objects as arguments.
    - Prevents subtle bugs when reactive props are passed directly to memoized utilities.

### Fixes

#### Object CRUD Utilities

- **Consistent Cancellable Fetches**:
    - Replaced inline `fetch` + `AbortController` logic in `objectCrud` and `listCrud` with the standardized `cancellableFetch` utility from `@arrai-innovations/reactive-helpers`.
    - Ensures compatibility with other `CancellablePromise`-based async flows and improves maintainability.

#### Forms & Validation

- **Safe Default for `dependencyValues`** (`useField`):
    - Fixed an issue where `field.state.dependencyValues` could be `undefined` if no validation dependencies were declared.
    - Now always returns an object (defaulting to `{}`) to prevent access errors in templates or computed consumers.

#### Object Lookup & Batching

- **Robust Cancellation and Reactivity Handling**:
    - Resolved race conditions in debounced batched lookups by immediately cloning and clearing `requestsMap`.
    - Reordered and normalized `requestObject` arguments; ensures `pk` precedes other params.
    - Used `CancellablePromise` and `toRaw()` to ensure proper cancellation, reduce proxy bugs, and avoid stale state.
    - Applied defensive updates in `runRequestBatch` to maintain consistency with reactivity system.

#### Lookup Lifecycle Management

- **Safe Teardown of Inflight Requests** (`useResolvedLookupObject`):
    - Ensures cancellation of inflight lookups when component scope is disposed.
    - Prevents resolution of stale promises after unmount.
    - Added internal guard against race conditions between cancellation and re-resolution.

### Developer Recommendations

- **Loading Placeholders**:
    - _Customize `ObjectsGrid` per-field skeleton appearance by adding a `skeleton` config to your `fieldDetails`._
    - _Use `<LazyRender>` directly to wrap components that should defer rendering until in-view, using `default` and `placeholder` slots._

## v2.0.0-alpha.2 (2025-04-21)

### TL;DR

- **Widget and Field Rendering**: Improved widget and field rendering performance by optimizing the `useField` and `useWidget` composables. This includes better handling of dependencies and reactivity, especially in large forms or complex components.
- **Object Lookups**: Introduced a new `useLookupContext` composable for efficient object lookups, reducing the need for individual `useObject` instances in components. This change enhances performance and simplifies the codebase.
- **Form Internals**: Refactored form internals to improve performance and reduce unnecessary reactivity. This includes changes to how dependencies are tracked and how values are passed between components.
- **Validation**: Confusing `requiredFn` and `validateRequired` functions have been **renamed** to `shouldRequireFn` and `isRequiredViolation`, becoming more intuitive and consistent with their purpose.
- **FormModel Integration**: Removed `valueDetails` and `valueDetail` from the `useForm`/`useField`/`useWidget` composables, streamlining the API and improving performance. This change simplifies the validation process and reduces unnecessary complexity in form handling.

### Breaking Changes

- **`useTheme` Refactor**:
    - Improved theme merging performance and consistency.
    - _Externalized `ThemeOverrideSymbol` to `@vueda/utils/symbols.js` (previously in `useTheme.js`)._
- **Removed `valueDetails` & `valueDetail`**:
    - Validation dependencies now rely solely on `formValues`.
    - _Update custom validation logic to use `formValues` directly._
- **Accessibility & Required Field Markup**:
    - Required field indicator (`*`) moved from feedback buttons to labels.
    - Labels now include semantic markup (`aria-required`).
    - _If your UI relied on required icons in feedback buttons, migrate logic to custom label slots or override `WidgetLabel`._
- **WidgetTextArea**: Switched editor from `tiptap` to `quill` via `primevue`.

### Features

#### Widgets & Fields

- **Contextless Widget Props** (`useWidget`):

    - Added `readOnly`, `invalid`, and `warning` props for widgets used outside field context.
    - `WidgetLabel` now respects `readOnly` and hides required indicator when appropriate.

- **Tabular Inline Fieldsets** (`FieldSetTabularInline`):
    - Introduced `<WidgetLabelContextByProps>` for header rendering consistency outside normal widget hierarchies.
    - New composable `useFieldSetTabularHeaderProps` centralizes field header state.

#### Object Lookup & Batching

- **`useLookupContext` Composable**:
    - Centralized batched object retrieval across components.
    - Automatically provided by all primary views (`ViewRead`, `ViewUpdate`, `ViewList`, etc.).
    - _Replace individual `useObject` calls for foreign key lookups with `useResolvedLookupObject`._
- **`useResolvedLookupObject`**:
    - Simplifies auto-lookups with reactive loading state and cancellation support.
    - _Use this for foreign object lookups:_
        ```js
        const resolved = useResolvedLookupObject(app, model, pk, fields, expand);
        // reactive: resolved.object, resolved.loading
        ```

#### Developer Ergonomics

- **Named Constants**:
    - Introduced constants for common query params (`FIELDS_PARAM`, `EXPAND_PARAM`, `PAGE_PARAM`, etc.).
    - _Replace hardcoded params (`f`, `e`, `s`) with imported constants from `@vueda/utils/constants.js`._
- **Slot Grouping** (`useSlotNameGrouper`):
    - Simplified resolution of grouped slots by prefix (e.g., `field(...)`, `widget(...)`, etc.).
    - _Example usage:_
        ```js
        const { grouped, remaining } = useSlotNameGrouper(slots, fieldName, ["field", "widget", "header"]);
        ```
- **Reactive Hooks Custom Aggregation** (`useReactiveHookRegistry`):
    - Customizable aggregation logic (e.g., `every`, custom scoring).

### Fixes

#### Forms & Validation

- **Unified `readOnly` Logic**:
    - Consistent handling across fields and widgets.
    - Explicit `readOnly: false` correctly overrides defaults.
- **Dependency Tracking Efficiency** (`useForm` & `useField`):
    - Centralized `dependencyValues` tracking at form-level with granular reactivity.
    - Avoids redundant recomputation and excessive dereferencing.
- **Error State Mutability** (`useField`):
    - Prevented silent deep mutations to errors and messages state.
- **Filtered Actions Reactivity** (`useFilteredActions`):
    - Improved reactivity to changes in user groups.
- **`WidgetSearchableSelect`**:
    - Selected option rendering fixed when item isn't in current page.
- **`FormHiddenFeedback`**:
    - Fixed crash when `help` prop is missing.

#### Grid & Fieldset UI

- **`ObjectsGrid`**:
    - Improved header slot context (`rowIndex`) and consistent theming in card mode.
    - Fixed incorrect default card header alignment.
- **`FieldSetTabularInline`**:
    - Refactored to reuse shared inline state, reducing redundancy.

#### Performance & Internals

- **Theme Merging Optimization** (`useTheme`):
    - Extracted internal merging logic into efficient helper (`mergeThemeReduce`).
- **Reactive Hooks Registry Performance** (`useReactiveHookRegistry`):
    - Introduced internal `groupToIds` index for faster hook lookups.
- **Reduced CORS Preflight Requests** (`fetchHelper`):
    - Avoided unnecessary `Content-Type` and CSRF headers on safe methods (`GET`).
- **Memory Leak Prevention** (`useSlotNameResolver`):
    - Ensured watchers are cleaned up properly with `effectScope()` and returned `stop()` method.
- **Lodash Imports & Array Checks**:
    - Replaced lodash-es `isArray` with native `Array.isArray()` for better IDE inference and smaller bundle size.
- **Parameterized String Handling** (`makeSearchParamsString`):
    - Gracefully handles missing params (`f`) with defaults, avoiding errors.

### Developer Recommendations

- **Constants Usage**:
    - _Prefer constants from `@vueda/utils/constants.js` instead of magic strings for server query params._
- **Memory & Scope Management** (`useSlotNameResolver`):
    - _When using dynamically, always call `resolver.stop()` to prevent reactive leaks._
- **Array Checks**:
    - _Prefer native `Array.isArray()` for clarity, IDE inference, and bundle efficiency._

## v2.0.0-alpha.1 (2025-04-10)

### TL;DR

- Significant composable API changes (`useForm`, `useField`, `useWidget`).
- Router view mapping renamed from `"retrieve"` to `"read"`.
- Major peer dependency upgrades (`pinia`, `@vueuse/core`, etc.).
- Improved widgets required indicators now via labels, no longer in feedback buttons.

### Breaking Changes

- **Composable APIs** (`useForm`, `useField`, `useWidget`):
    - Renamed `dependencies` ? `validationDependencies`, and `dependents` ? `clearServerErrorDependents`.
      _Update all `<field>` props using these names accordingly._
    - Removed automatic server error clearing on `blur()`.
      _If your validation relied on this behavior, explicitly call `formContext.clearServerErrors(fieldName, dependents)` during blur or validation._
    - `reset()` on `useForm` now skips error/message/touched clearing on the initial call.
      _If you depend on that clearing behavior, call `clearAllTouched()` and `clearErrors()` manually after reset._
    - `contextless` mode added/improved for `useField` and `useWidget`, allowing widgets to operate without a parent field or form context.
      _Update tests or standalone components to use `contextless: true` where necessary._
    - `requiredFn` and `validateRequired` are now `shouldRequireFn` and `isRequiredViolation`.
      _Update any custom logic using those hooks to match the new naming._
- **Router View Mappings**:
    - View type `"retrieve"` has been renamed to `"read"` for clarity.
      _Update your router config and component logic if referencing `"retrieve"`._
- **Peer Dependency Updates**:

    - Updated peer ranges:

        - `pinia` ? `^3.0.1`
        - `@vueuse/core` ? `^13.0.0`
        - `@sentry/vue` ? `^9.5.0`
        - `@arrai-innovations/reactive-helpers` ? `^18.0.0`
        - `vue` ? `^3.5.13`

        _Ensure your project installs compatible versions to prevent runtime or resolution issues._

- **File & Export Renaming**:
    - `@vueda/use/useActionMap` moved to `@vueda/utils/actionMap`.
      _Update your imports if you reference this file directly._
- **Widget Required Indicator**:
    - The required icon (`*`) has been removed from feedback buttons and is now shown in labels.
      _Update any custom UIs that relied on the feedback button indicator. Use the `required` slot in `WidgetLabel` for customization._

### Features

- `useFilteredAttrs`: Now supports `Set` for `pickList` and `omitList`.
- **Widgets**:
    - Required state indicated via labels (`*`), customizable through slot or theming.

### Fixes & Improvements

- **Imports & Performance**:
    - Prefer direct `lodash-es` imports for tree-shaking.
    - Replaced lodash `isArray` with native `Array.isArray()`.
- **Composable Improvements**:
    - Clarified logic in `useLinkModelView`.
    - Lazy-loaded stores (`useModelChoices`, `useModelConfig`, `useModelInfo`, `useFilteredActions`) for SSR/Vite compatibility.
    - Simplified reactivity with fewer nested `ref`s and explicit `toRef` usage.
- **Reactive Logic Enhancements**:
    - Ensured reactivity of `groups` in `useFilteredActions`.
    - Unwrapped props in `useLeaveUnload` composable correctly.
- **Component-Specific Fixes**:
    - `ViewHistoryList`: Respected theming root class and standardized v-model bindings.
    - `DetailedView`: Corrected application of `submitFields` only for submission.
    - `FieldSetInline`: Now respects user-defined field ordering in expanded inline fields.

### Developer Recommendations

- **Import Best Practices**:
    - _Prefer direct lodash imports like `lodash-es/merge.js` for better tree-shaking._
    - _Use file extensions (`.js`) in ESM module imports to avoid Vite or Node resolution issues._
    - _Use `Array.isArray(...)` instead of `isArray()` from lodash for better type inference and smaller builds._
- **Composable Design Patterns**:
    - _Normalize prop inputs using internal `reactive()` or `computed()` wrappers if your composables accept both refs and raw values._
- **Reactivity Simplification**:
    - _Avoid deeply nested `ref(ref(...))` patterns - prefer `toRef(...)` or direct binding._
    - _Avoid using `cloneDeep` or `assignReactiveObject` to synchronize state - if the target already exists, use `toRef()` or a `computed()` wrapper._
    - _Don't duplicate "same value" checks in watchers unless comparing deep objects - Vue already skips updates for primitive equality._
    - _See commit [`6e03333`](https://github.com/arrai-innovations/vueda-client/commit/6e03333) for a practical example of reactive cleanup in `useModelChoices`._
