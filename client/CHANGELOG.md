# Changelog

_Actions potentially required by implementers are marked with italics._

## v2.0.5 (unreleased)

### Breaking Changes

- **availableFields / Field type components**:
    - Removed all type-specific `Field<Type>` components (`FieldString`, `FieldNumber`, `FieldBoolean`, `FieldDate`, `FieldDateTime`, `FieldTime`, `FieldDecimal`, `FieldDuration`, `FieldRange`, `FieldArray`, `FieldObject`, `FieldEmail`, `FieldURL`, `FieldUUID`, `FieldIP`, `FieldFile`, `FieldImage`) and their entries in `availableFields`. `FormField` is now the sole generic field component.
    - Also removed `useDevTypeGuard` (was only used internally by the removed components).
      _If you referenced these components by string name (e.g. in `fieldComponents` model config) or imported them directly, replace them with `FormField` and pass the appropriate `validation` prop (e.g. `validation: "text"`, `"numeric"`, `"decimal"`, `"date"`, `"datetime"`, or `"time"`)._

- **makeCrud**:
    - `makeCRUDRoutes` now requires `actionRedirect` (e.g. `{ name: "not-found" }`) so missing model/action guard paths cannot attempt to resolve a null redirect.
      _If you were relying on the previous default, pass an explicit redirect route that is not gated by `requireModelInfo` to avoid redirect loops._

### Features

- **useViewList**:
    - New composable that extracts all list-view logic from `ViewList.vue`. Custom shell components can call `useViewList(props)` to get the same sub-grouped reactive state (`modelConfig`, `list`, `actions`, `search`, `sort`, `columns`, `pagination`) without copying the default component.
    - `ViewList.vue` is now a thin wrapper around this composable and retains its existing props, emits, and slots unchanged.

- **DetailView**:
    - Added `DetailView` as the canonical base component for `read` and `update` detail flows.
    - `DetailedView` is now deprecated and will be removed in the next major release.
      _If you import `@vueda/components/DetailedView.vue`, switch to `@vueda/components/DetailView.vue`._

### Fixes

- **useField / useForm**: Required-field errors are now suppressed on blur for fields that started empty and remain empty, until the form has had a submission attempt (via `setAllTouched`) or the field has been modified. This prevents a wall of required errors when a user tabs through an empty form without typing anything. Fields without a form context retain the previous behavior (errors fire on blur immediately).
    - _No action required for most forms. If you relied on required errors firing on blur for fields that have never been touched and were always empty (e.g. contextless fields), behavior is unchanged. For fields inside a form context, errors now require either user modification or a submission attempt before appearing._

- **FieldSetSingularStackedInline**: Wait for fieldObjects to be ready before auto-creating inline row and loading initial values in FieldSetSingularStackedInline

## v2.0.3 (2026-01-27)

### Fixes

- **ActionForm**: Split error tracking into fetchState and actionState, and stop showing handled submit errors.

## v2.0.2 (2026-01-19)

### Fixes

- **storeUser**: `_handle_error` only deals with parsing pendingFlows from returned response data now. Methods including `setupTOTPDevice`, `activateTOTPDevice` `generateRecoveryCode` and `getRecoveryCodes` stopped swallowing `UnauthorizedError`

## v2.0.1 (2025-12-24)

### Fixes

- **storeUser**: resetPassword and forgotPassword now treats 400 responses as FormValidationError

## v2.0.0 (2025-12-23)

### Fixes

- **WidgetPreviewableTemplate**: fixed expected preview_tags_data format

### Features

- **ModelActionForm**: Added support for dry-run actions
    - run actions in dry-run mode by default now.
    - A prop `enableDryRun` can be set to false to disable dry run.
    - A dictionary containing formValues and a dryRun boolean flag is now passed to the runAction function instead of just formValues.

## v2.0.0-beta.14 (2025-12-10)

### Features

- **ViewList**: Hide the paginator when no records are returned.
- **Field Mappings**: Allow consuming projects to merge in custom field mappings.

## v2.0.0-beta.13 (2025-12-02)

### Features

- **Field Mappings**: Fall back to the first available mapping when `typeModel` is missing.

## v2.0.0-beta.12 (2025-11-25)

### Fixes

- **ActionForm**: Slot click handlers now pass the function directly to `onClick`.
- **FilterGroup**: Defaults filterables to `null` so empty filter props are allowed.

## v2.0.0-beta.11 (2025-11-21)

### Fixes

- **ViewSetupDevice/ViewTwoFactorAuth**: Fixed a typo in the device method field.

## v2.0.0-beta.10 (2025-11-19)

### Breaking Changes

upgraded reactive-helpers to v21.0.0

### Features

- **AuthForm**:
    - Base form for authorization-related views. Handles submission error and redirecting user to reauthenticate when required.
- **ViewRecoveryCodes**:
    - Fetches and displays valid recovery codes with multiple save options. Automatically generates new set if none exist. User can also generate new set of recovery codes in the view.
- **ViewSetupDevice**:
    - Allows adding new 2FA device. Shows TOTP QR code and secret for apps, or calls backend to send SMS/email.
- **AuthorizingForm**:
    - Handles automatic redirecting after login or 2FA auth. Base form for pre-authorization views for example `login`, `forgotPassword` and `twoFactorAuth`.
- **ViewTwoFactorAuth**:
    - Allows user to choose which configured 2FA method to use for authorization.
- **PaginationComponent**:
    - Added ability to display total record counts and a "Show All Pages" option.
- **ViewList**:
    - Supports displaying column totals when returned.
    - Added column hiding and persisted list preferences.
    - Allows list preference configuration for column visibility and pagination options.
- **ClickToCopyText**:
    - Component for displaying text with a copy-to-clipboard button.
- **MobileSortComponent**:
    - Added a mobile-friendly sorting UI and ViewList integration.
- **Templated Text Widgets**:
    - Added `WidgetPreviewableTemplate` to edit templated text and show a live preview using tag data.
    - Added `WidgetTemplateLegend` that displays available template tags; each tag can be copied via `ClickToCopyText`.
    - Registered in `availableWidgets` and `fieldMappings` (`TemplatedTextField`, `TemplateTagsDataField`) and added associated theme entries.
- **Dependency Tracking**:
    - `useField` and `useWidget` now support registering/unregistering dependency values so widgets can react to external field data.
- **ModelActionForm**:
    - Contains model-related functionality previously in ActionForm. ActionForm kept minimal for AuthForm, AuthorizingForm, and ModelActionForm reuse.
- **storeUser**:

### Refactors

- **storeUser**:
    - Converted all functions to return Promises instead of async.
- **listCrud**:
    - pagination is manually done using calls to pushObjects() and clearObjects in CrudAdaptors
    - adaptors handles and update the pagination information and columns total from the responseData

### Fixes

- **WidgetHtml**: Editor now uses automatic height instead of a fixed 320 px.
- **WidgetLabel**: `required` state pulled directly from field context, avoiding mismatch with props.
- **PaginationComponent**: Slot click now mirrors the default click behavior.
- **WidgetPreviewableTemplate**: Sanitizes templated content before rendering.
- **ViewDeactivate/WidgetGenericAutoComplete**: Deduped list params for deactivate/generic autocomplete flows.
- **FieldSetStackedInline/FieldSetTabularInline**: Avoided undefined logger usage during fieldset operations.

## v2.0.0-beta.9 (2025-08-01)

### Breaking Changes

downgrade quill to @2.0.2 to resolve [this](https://github.com/slab/quill/issues/4535) issue:
_consuming projects should update their `package.json` to pin quill to `@2.0.2` as well._

### Features

### Fixes

## v2.0.0-beta.8 (2025-07-25)

### Breaking Changes

- **Dependencies**:
    - Updated peer dependency from `@primevue/themes` to `@primeuix/themes` following PrimeVue's migration path
    - `@primevue/themes` 4.3.6+ is now a thin wrapper around `@primeuix/themes`, making the direct dependency more appropriate
    - _Update peer dependency to `"@primeuix/themes": "~1.2.1"` and remove `@primevue/themes` from consuming projects_
    - _Update tailwind.config.js content paths from `@primevue/themes` to `@primeuix/themes` (e.g., `./node_modules/@primeuix/themes/lara/**/*.{vue,js,ts,jsx,tsx}`)_

### Features

### Fixes

- **useFilter/FilterGroup**:
    - Improved developer experience for invalid filter configurations by replacing crashes with helpful console warnings
    - Invalid filterables (missing details or typeFilter) are now skipped during rendering instead of breaking the entire list view
    - _Malformed filter configurations will now log warnings instead of preventing page loads_
- **Developer Experience**:
    - Converted `$slots` usage to `useSlots()` in `ViewList`, `DetailedView`, `ViewAction`, and `FormModel` components
      for better debugging visibility in Vue DevTools

## v2.0.0-beta.7 (2025-07-21)

### Breaking Changes

- **Dependencies**:
    - Updated PrimeVue peer dependency to ~4.3.6 to prevent theming issues from minor version updates
    - Added `@primevue/themes` as peer dependency with ~4.3.6 constraint to ensure theme compatibility
    - _Update both `"primevue": "~4.3.6"` and `"@primevue/themes": "~4.3.6"` in consuming projects_

### Features

### Fixes

- **ViewActionRouter**:
    - Fixed conditional logic to prevent overwriting ViewActionNotFound component when action/transition not found.

## v2.0.0-beta.6 (2025-07-09)

### Breaking Changes

### Features

- **TypeScript Declaration Generation**:
    - Added `tsconfig.json` and `build:types` script to generate TypeScript declarations from JSDoc comments.
    - Package now includes `types/` directory with `.d.ts` files for improved TypeScript support.
    - Automatically builds types before publishing via `prepublishOnly` script.
    - _TypeScript projects can now get proper type inference and IDE support for vueda-client._
- **FieldSetStackedInLineRow**:
    - defaultObjectsDelete throws `FormValidationError` for responses with `statusCode` 400.

### Fixes

- **FieldSetStackedInLineRow**:
    - corrected the slot name for destroy button
    - hide feedback buttons for row level destroy checkboxes

- **useSearchableSelect**:
    - fixed an issue where search results were not loading correctly because previously loaded options were not being cleared.
    - addressed a case where the options list is always empty when a valid selection existed.

## v2.0.0-beta.5 (2025-06-26)

### Features

- **useWarnings**:
    - Introduced `setUsingWarnings` which allows you to toggle the usage of warnings in the application. Defaults to `true`.
- **fetchHelper**:
    - Enhanced fetchHelper to accept either a class constructor or a factory function for `errorClass`.

### Fixes

- **StoreWorkflow**:
    - Only return permitted workflow transitions for the current user via new `permitted_transitions` endpoint
- **ViewHistoryList**:
    - hide unused history fields not present in model config; simplify display with raw values and friendlier date formatting.
- **ActionForm**:
    - made sure the value of `formContext.state.anyErrors` was updated before checking it, prevent the form to submit when there are errors in the form.
- **DetailedView**:
    - prevented `retrieve` action being displayed when the read view is already the current view.
- **buildForm**:
    - fixed an issue where an exception will be thrown complaining about missing fieldDetail if `fields` are getting passed through props.

## v2.0.0-beta.4 (2025-06-17)

### Fixes

- mergedFormModelProps.fields and mergedFormModelProps.expand was not reactive when parentFormModel.fields changes.
- DetailedView now accept `expand` and `expandDetail` as props.
- FormModel now accepts `expandDetail` as props.

## v2.0.0-beta.3 (2025-06-09)

### Features

- **storeUser**
    - added new methods `forgotPassword`, `resetPassword` and `checkResetLinkIsValid`
    - _Note that there isn't a default Url set for these methods, so you wish to use these functions you will need to set `resetPassword`, `forgotPassword` or `isResetLinkValid` to the url corresponding to your backend implementation for the specific project,
      for example_:

    ```js
    import { setCustomUrl } from "@vueda/utils/urls.js";

    setCustomUrl("forgotPassword", "/routes/forgot-password/");
    setCustomUrl("isResetLinkValid", "/routes/reset-password/?pk={pk}&token={token}"); // isResetLinkValid url assumes the backend expects a `pk` and `token` query parameter
    ```

- **WidgetInput**
    - Uses primevue `Password` component for type 'password'

### Fixes

## v2.0.0-beta.2 (2025-06-03)

### Breaking Changes

- **ActionForm**
    - `ModelConfig.defaultView` has been replaced by `actionRedirects`.
      _Update any custom model config overrides to define `actionRedirects.default`._
- **FilterComponent**
    - Removed and stopped using `filterFormValues`.
    - Automatically renders fields and widgets based on `filterableDetails.typeFilter`.

## Features

- **ViewList**:
    - Ignores `ListFilterError` and passes it down to `FilterGroup` for handling.

- **FilterGroup**:
    - Displays proper error messages when `ListFilterError` is thrown.
    - Uses the `useFilter` helper function to retrieve combined `filterables` and `filterableDetails`, instead of relying solely on props.

- **FilterForm**:
    - Introduced new `FilterForm` component. Fields and widgets can be provided through slots named `filter-field(fieldname)` and `filter-widget(fieldname)`.
    - Submit button exposes `disabled` and `modified` as slot props.
    - Uses `fieldRenderer` to render fields and widgets. A `FilterModel` is passed into `fieldRenderer` as `formModel`.

- **FilterComponent**:
    - Theme: The component outlines itself in red when an error occurs.
    - Uses `useModelChoices` to display filter labels.
    - Automatically applies or removes filters when route query values change.

- **FieldSetRange**:
    - Refactored to use `fieldRenderer` for rendering boundary components.
    - Instead of using `boundaryComponents` props, field mapping now supports `boundaryComponent`, `boundaryComponentProps`, `boundaryWidget`, and `boundaryWidgetProps`.

- **useFieldRenderer**:
    - Accepts either a `FilterModel` or `FormModel` via the `formModel` prop.
    - Added a new boolean prop `isFilter` to indicate if the model is a `FilterModel`. Defaults to `false`.

- **listCrud**:
    - Introduced new error type: `ListFilterError`.
    - Both `singlePagePaginatedListCrudAdaptor` and `allPagePaginatedListCrudAdaptor` now throw `ListFilterError` when `responseData` includes filter parameters.

- **useFilter**:
    - New helper function that returns a reactive state object similar to `FormModel`, designed for rendering filter fields and widgets.

- **useFilterField**:
    - New helper function returning a reactive state object containing:
        - A filter field's initial value
        - Field configuration (e.g., whether it's an array or range field)
    - Automatically resets the field’s initial value when route query values change.

## Fixes

- **WidgetDatePicker**:
    - `modelValue` now returns `null` until the component becomes active. This ensures that PrimeVue’s DatePicker watcher on `modelValue` is properly triggered, displaying any non-null initial values in the input.

## v2.0.0-beta.1 (2025-05-26)

### Breaking Changes

- **ActionForm**
    - The `handleActionCompletion` prop has been **removed**.
      Redirection after action completion now follows the model-config `defaultView`
      order (`update` ? `read` ? `list`).
      _Update your model config if you previously passed a custom redirect._

### Fixes

- **useLookupContext**
    - `pkKey` is now fetched from `storeModelInfo.fetchModelInfo`, not from
      `storeModelConfig`, so models with non-standard primary keys resolve
      correctly.
    - Internal managers rename `props` ? `config` to reduce confusion with
      Vue component props. _(No public API impact.)_
    - Console warnings now share a consistent `[useLookupContext.*]` prefix, making
      them easier to filter.

- **useFormModel**
    - `state.computedFields` is fully reactive.
    - `contextless` defaults to `true` for `computedFields` items, matching docs.

- **Widgets**
    - **WidgetReadOnly** - `pkKey` reactivity restored.
    - **WidgetModel** - now calls the updated `useModelChoices` API.
    - Other select/image widgets updated to fetch `formatted_name` or choice data
      correctly.

### Internal / Tooling

- **Test & Coverage**
    - Extensive new unit tests raise overall coverage to **~78%**.

## v2.0.0-alpha.14 (2025-05-02)

### Fixes

- **WidgetSearchableSelect**:
    - Fixed double-resolving of `groupBy` key when grouping options, which caused rendering issues with dot-separated keys like `"category.name"`.
    - Simplified implementation by removing unnecessary `optiongroup` slot override. Group labels are now rendered using PrimeVue's built-in `optionGroupLabel` prop.

## v2.0.0-alpha.13 (2025-05-01)

### Fixes

- **WidgetSearchableSelect**:
    - Fixed search result contamination from prior queries due to stale pagination state.
    - Increased perPage to 200 in non-lazy mode to minimize request volume.

## v2.0.0-alpha.12 (2025-04-29)

### Breaking Changes

- **useModelChoices**:
    - `useModelChoices(app, model, field, isActive?, intendToFetch?, isFilter?)` has been replaced with
      `useModelChoices(fields, isActive?)`.
    - Now supports multiple fields at once, each field getting its own `intendToFetch` and `isFilter` control.
    - Existing single-field usages **must** be updated to the new structure:
        ```diff
        - const modelChoices = useModelChoices(app, model, field, isActive, intendToFetch, isFilter);
        + const modelChoices = useModelChoices({ fieldName: { app, model, intendToFetch, isFilter } }, isActive);
        ```
    - **Developer Note**: The `choices` object on the returned instance is now keyed by field name rather than representing the full model's choices.
    - **Motivation**: This change improves concurrent fetching, deep reactivity per-field, and corrects structural assumptions around choice batching.

### Features

- **ViewList**:
    - Add `additional-errors` slot above the list's own call to `ErrorDisplay`

## v2.0.0-alpha.11 (2025-04-28)

### Features

- **ViewCreate**:
    - Added `redirectAfter` prop (`'list'`|`'update'`|`'read'`) to control where users are redirected after a successful create action.
    - Defaults to `'update'` for a smoother UX when creating complex objects.
- **ViewUpdate**:
    - Added `redirectAfter` prop (`'list'`|`'read'`|`null`) to control where users are redirected (or not) after a successful update action.
    - Defaults to `null` for no redirection.
- **useObjectForm**:
    - `state` now includes `object`, `pk`, and `pkKey` for easier access to the created or updated object data in event hooks.
    - `onSubmissionSuccess` now redirects based on `redirectAfter` prop.
- **Toasts**:
    - Default toast life raised to 15000ms for better visibility.

### Fixes

- Ensure `pkKey` is always requested in `FIELDS_PARAM` for `ViewCreate` and `ViewUpdate` to avoid missing PKs in the response.

## v2.0.0-alpha.10 (2025-04-28)

### Fixes

- **FieldBoolean**:
    - Don't require all boolean fields

## v2.0.0-alpha.9 (2025-04-28)

### Fixes

handle dynamic lookup mode, add default fields/expands, and prevent incorrect link rendering

- **WidgetReadOnly**:
    - Fixed `fields` and `expands` not defaulting to the model config
    - Fixed `useResolvedLookupObject` getting initilized for widgets without app && model props

## v2.0.0-alpha.8 (2025-04-28)

### TL;DR

- **Field Coercion Removed**: Fields now **store raw values** without auto-converting types; UI value adaptation is handled in widgets.
- **New DevLogger**: Fields will now **warn in development** if values are the wrong type - making issues visible early.
- **Widget Adaptation**: Widgets like `WidgetDatePicker` and `WidgetInputNumber` **adapt form values** for UI-friendly display and editing.
- **FormChores Slots Updated**: Switched to `feedback(fieldName)*` slot naming for more flexible message customization.
- **Expanded Virtual Scrolling**: `WidgetSearchableSelect` improvements: no more scroll jumps, better loading handling.
- **Minor Breaking Changes**: Removed legacy slot names; adjusted expand handling for `storeModelConfig`.

### Breaking Changes

- **`storeModelConfig`**:
    - We no longer expand all available expands by default. This wasn't really working as most expands are not available
      when listing objects, causing the defaults to be useless.
    - _You should check your `expand` keys if they are based on or override `modelConfig.config.expand`_
- **FormChores**:
    - Old slots `field(fieldName)error`, `field-error`, `field(fieldName)message`, and `field-message` are **removed**.
    - _Update your overrides to use the new `feedback(fieldName)error`, `feedback-error`, `feedback(fieldName)message`, and `feedback-message` slots._
- **Field Component Behavior**:
    - Removed implicit value coercion at the field level (`useField`) for nearly all field types.
    - Fields now **store raw values** directly (e.g., strings, numbers, dates, arrays, objects) without trying to parse or transform them automatically.
    - UI-specific value conversion (e.g., date parsing, numeric precision) is now handled **inside widgets** via `fieldToWidget` and `widgetToField` adapters.
    - **Developer Note**: If you were relying on automatic value coercion inside a field, ensure your widgets or usage patterns handle the correct types.
    - _Most fields now expect and validate their shape but no longer fix invalid input silently._
    - **Field behavior changes**:

        | Field                         | Previous                              | New                             | Expected Shape                    | Coercion Removed |
        | :---------------------------- | :------------------------------------ | :------------------------------ | :-------------------------------- | :--------------- |
        | FieldArray                    | Split/join array to/from string       | Store array directly            | Array<any> \| null \| undefined   | ?                |
        | FieldBoolean                  | Auto-coerce with `!!`                 | Store boolean directly          | boolean \| null                   | ?                |
        | FieldDate                     | Parse JS Date from string             | Store ISO string (`YYYY-MM-DD`) | string                            | ?                |
        | FieldDateTime                 | Parse JS Date from ISO string         | Store ISO string (ISO datetime) | string                            | ?                |
        | FieldDuration                 | Parse duration string into object     | Store object directly           | { days, hours, minutes, seconds } | ?                |
        | FieldEmail                    | Accept string without parsing         | Store string directly           | string                            | ?                |
        | FieldIP                       | Coerce value to string                | Store string directly           | string                            | ?                |
        | FieldNumber                   | Coerce to `+number` with fraction fix | Store number directly           | number                            | ?                |
        | FieldObject                   | Accept any object                     | Store object directly           | object                            | ?                |
        | FieldRange                    | Convert object/array                  | Store object `{lower, upper}`   | object                            | ?                |
        | FieldSetMany                  | Coerce single to array                | Store array directly            | Array<any>                        | ?                |
        | FieldSetRange                 | Validate array form                   | Store array `[lower, upper]`    | Array<any>                        | ?                |
        | FieldSetSingularStackedInline | Expected object                       | Still expects object            | object                            | ?                |
        | FieldSetStackedInline         | Expected array                        | Still expects array             | Array<object>                     | ?                |
        | FieldSetTabularInline         | Expected array                        | Still expects array             | Array<object>                     | ?                |
        | FieldString                   | Coerce with `.toString()` and trim    | Store string directly           | string                            | ?                |
        | FieldTime                     | Parse into Date                       | Store string `HH:mm:ss`         | string                            | ?                |
        | FieldURL                      | Accept string                         | Store string directly           | string                            | ?                |
        | FieldUUID                     | Accept string                         | Store string directly           | string                            | ?                |

    - _If you depended on field-level parsing (e.g., turning numbers into strings), you may need to adjust your widget configurations or usage._

### Features

- **`FormFeedback`**:
    - Added a new `content` slot inside the feedback message component for fine-grained message customization per line.
- **`FormChores`**:
    - Introduced dynamic `feedback(fieldName)*` slot resolution, allowing external overrides for:
        - `feedback(${fieldName})` or `feedback` to override or wrap FormFeedback per message type.
        - `feedback(${fieldName})error`, `feedback-error`, `feedback(${fieldName})message`, `feedback-message` to override the default slot to FormFeedback, allowing the wrapping or replacement of the primevue message component.
        - `feedback(${fieldName})error-content`, `feedback-error-content`, `feedback(${fieldName})message-content`, `feedback-message-content` to override the new content slot to FormFeedback.
- **`FormModel`**:
    - Push down slots from outside the form into the non-field form chores and feedback components. This allows access to slots the slots above from outside the form for `NON_FIELD_ERRORS_KEY`.
- **Dev Logging for Fields**:
    - Introduced `useDevLogger` to all field components.
    - In development mode (`import.meta.env.DEV`), fields now log warnings if their bound value has the wrong shape (e.g., setting a number where a string is expected).
    - In production builds, `useDevLogger` is a no-op with no performance overhead.
    - Makes debugging field value issues much easier without silently fixing invalid data at runtime.
- **Value Adapters in Widgets**:
    - `WidgetDatePicker`, `WidgetInputNumber`, and others now support `fieldToWidget` and `widgetToField` adapters.
    - Allows clean separation of form values (backend-safe) and UI values (widget-friendly), including custom date parsing, decimal precision, and more.
    - _This ensures that form values remain normalized while widgets can display/accept richer inputs._

### Fixes

- **useModelConfig / useModelInfo**:
    - Always initialize `info` and `config` fields with a full default structure, preventing issues where making refs before props existed would not react to their later introduction.
- **Guard Validations**:
    - Standardized `validAndActive` checks to `modelConfig.loading === false` across all views and composables. No longer uses `modelConfig.info.pk` as a stand-in for "is the config loaded?".
- **useFilteredActions**:
    - Simplified reactivity: no delayed store resolution, purely computed action list. Fixes action button visibility on list and detail views.
- **WidgetSearchableSelect**:
    - Virtual scrolling now works reliably even without lazy loading.
    - Default `isLazy` is now `false` to avoid PrimeVue VirtualScroller scroll jumps.
    - Developers can opt into lazy mode if they require maximum performance.
    - Added `emptyMessage` support to improve messaging for loading, no query, and no match states.
    - Improved virtual scrolling debounce behavior by enabling leading debounce, ensuring faster visible updates on user typing.
    - Minor fix: `keepOldPages` now correctly reflects lazy mode rather than inverting it unnecessarily.
      _This fix relies on `@arrai-innovations/reactive-helpers@^20.1.2`, please update your peer dependency._

### Developer Recommendations

- **Expect to validate values earlier**:
    - Fields now trust their inputs more. Bad data won't be automatically "fixed"  you will see dev warnings if types mismatch.
- **Use Adapters**:
    - Customize `fieldToWidget` and `widgetToField` props on widgets to adapt how values are displayed or edited, without polluting field-level logic.
- **Debugging with `useDevLogger`**:
    - In development, watch the console for structured warnings if a field receives an unexpected type.

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
        const { grouped, remaining } = useSlotNameGrouper(["field", "widget", "header"], fieldName, slots);
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
