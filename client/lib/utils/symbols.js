/**
 * @module utils/symbols
 * @description Vue injection-key symbols used to share context between ancestor and descendant components.
 */

/** @type {symbol} Injection key for the field context provided by a field component. */
export const FieldContextSymbol = Symbol("fieldContext");

/** @type {symbol} Injection key for the form context provided by a form composable. */
export const FormContextSymbol = Symbol("formContext");

/** @type {symbol} Injection key for the reactive form model. */
export const FormModelSymbol = Symbol("formModel");

/** @type {symbol} Injection key for the reactive filter model. */
export const FilterModelSymbol = Symbol("filterModel");

/** @type {symbol} Injection key for the page-title context shared between a layout display and the active view. */
export const PageTitleContextSymbol = Symbol("pageTitleContext");

/** @type {symbol} Injection key for the sticky-stack context shared between the provider and the active view's chrome. */
export const StickyStackContextSymbol = Symbol("stickyStackContext");

/** @type {symbol} Injection key for the lookup (searchable-select) context. */
export const LookupContextSymbol = Symbol("lookupContext");

/** @type {symbol} Injection key for a component-level icon registry override. */
export const IconOverrideSymbol = Symbol("iconOverride");

/** @type {symbol} Injection key for a component-level theme override. */
export const ThemeOverrideSymbol = Symbol("themeOverride");

/** @type {symbol} Injection key for the server version string. */
export const VersionSymbol = Symbol("version");

/** @type {symbol} Injection key for the widget context provided by a widget component. */
export const WidgetContextSymbol = Symbol("widgetContext");
