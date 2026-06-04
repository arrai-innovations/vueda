/**
 * @module utils/constants
 * @description Application-wide constants for cookie names, query-string parameters, and internal CRUD identifiers.
 */

/**
 * Name of the CSRF cookie, usually injected by the backend into a meta tag or cookie.
 * Used by `getCSRFToken()` for safe POST/PUT/PATCH/DELETE requests.
 */
export const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME;

/**
 * Current version of the frontend package, injected via Vite env.
 * Used for runtime version display, telemetry, or cache-busting.
 */
export const VITE_PACKAGE_VERSION = import.meta.env.VITE_PACKAGE_VERSION;

/**
 * Standard key used by Django REST Framework for non-field form errors.
 * Used in `FormValidationError` parsing and form error display.
 */
export const NON_FIELD_ERRORS_KEY = "non_field_errors";

/**
 * Query string param used to specify which fields should be included in object/list responses.
 * e.g., `?f=id,name`
 */
export const FIELDS_PARAM = "f";

/**
 * Query string param used to specify related objects to expand (embed) in the response.
 * e.g., `?e=owner,category`
 */
export const EXPAND_PARAM = "e";

/**
 * Query string param used to omit specific fields from the response.
 * Used for optimization in large object structures.
 * e.g., `?om=metadata,history`
 */
export const OMIT_PARAM = "om";

/**
 * Query string param for ordering results in a list view.
 * e.g., `?o=-created_at,name`
 */
export const ORDERING_PARAM = "o";

/**
 * Query string param used to apply a backend-side search filter.
 * e.g., `?s=widget`
 */
export const SEARCH_PARAM = "s";

/**
 * Query string param used to control the page number for paginated list views.
 * e.g., `?p=3`
 */
export const PAGE_PARAM = "p";

/**
 * Query string param used to specify how many items should be returned per page.
 * e.g., `?ps=50`
 */
export const PAGE_SIZE_PARAM = "ps";

/**
 * Internal CRUD identifier used to match detail view requests.
 */
export const DETAIL_VIEW_CRUD_NAME = "actionrouter.detailview";

/**
 * Internal CRUD identifier used to match list view requests.
 */
export const LIST_VIEW_CRUD_NAME = "actionrouter.listview";

// ---------------------------------------------------------------------------
// Sidebar constants
// Based on the shadcn-vue sidebar implementation.
// ---------------------------------------------------------------------------

/**
 * Name of the cookie used to persist the sidebar open/collapsed state across page loads.
 * Read by `SidebarProvider` on mount to restore previous state.
 */
export const SIDEBAR_COOKIE_NAME = "sidebar_state";

/**
 * Max-age in seconds for the sidebar state cookie. Defaults to 7 days.
 */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Keyboard shortcut key that, combined with Ctrl/Cmd, toggles the sidebar.
 * Listened for in `SidebarProvider`.
 */
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";
