# Changelog

_Actions potentially required by implementers are marked with italics._

## v2.0.0-alpha.3 (2025-04-xx)

### TL;DR

### Breaking Changes

- **Peer Dependency Update**:
    - Bumped `@arrai-innovations/reactive-helpers` to `^18.1.0` to use shared `cancellableFetch`.
    - _Ensure your project updates its peer dependency to match._

### Features

### Fixes

#### Object CRUD Utilities

- **Consistent Cancellable Fetches**:
    - Replaced inline `fetch` + `AbortController` logic in `objectCrud` and `listCrud` with the standardized `cancellableFetch` utility from `@arrai-innovations/reactive-helpers`.
    - Ensures compatibility with other `CancellablePromise`-based async flows and improves maintainability.
    - _Requires reactive-helpers v18.1.0 or higher._

#### Object Lookup Batching

- **Resolved Debounced Race Conditions** (`useLookupContext`):
    - Fixed race condition in batched foreign key lookups by:
        - Cloning and clearing `requestsMap` immediately to avoid overlap.
        - Deferring `.cancel()` assignment until after manager acquisition.
        - Ensuring all `inflightPromises` and `consumerPromises` are cleaned up reliably.
    - Prevented mutation of shared lookup state during overlapping debounce executions.
    - Improved internal tracing and error reporting for consumer rejection paths.

#### Lookup Lifecycle Management

- **Safe Teardown of Inflight Requests** (`useResolvedLookupObject`):
    - Ensures cancellation of inflight lookups when component scope is disposed.
    - Prevents resolution of stale promises after unmount.
    - Added internal guard against race conditions between cancellation and re-resolution.

### Developer Recommendations

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
        const resolved = useResolvedLookupObject(app, model, pk, fields, expands);
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

---

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
