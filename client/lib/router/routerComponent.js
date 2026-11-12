/**
 * @module router/routerComponent
 * @description Defines and exports the CRUD view component map with support for consumer overrides.
 */

/**
 * The route target that `ViewActionRouter` passes to a view loader.
 *
 * @typedef {object} ViewTarget
 * @property {string} app - Django app label from the route.
 * @property {string} model - Django model name from the route.
 * @property {string} action - Action segment from the route.
 * @property {string|number|(string|number)[]} pk - Primary key or keys from the route.
 */

/**
 * The helpers that `ViewActionRouter` passes to a view loader.
 *
 * @typedef {object} ViewLoaderContext
 * @property {(name: string, fallback: () => (object|Promise<object>)) => Promise<object>} findProjectView - Imports
 *   `@/views/View<Name><App><Model>.vue` for the route's app and model, then `@/views/View<Name>.vue`. It returns
 *   the first file that exists. When neither file exists, it returns the result of `fallback`.
 */

/**
 * Loads the view component for one action.
 *
 * @typedef {(target: ViewTarget, context: ViewLoaderContext) => Promise<object>} ViewLoader
 */

/**
 * @param {string} name
 * @param {() => Promise<object>} loadVuedaView
 * @returns {ViewLoader}
 */
const projectOrVuedaView =
    (name, loadVuedaView) =>
    (target, { findProjectView }) =>
        findProjectView(name, loadVuedaView);

const defaultCrudComponents = {
    list: projectOrVuedaView("List", async () => (await import("@vueda/views/ViewList.vue")).default),
    create: projectOrVuedaView("Create", async () => (await import("@vueda/views/ViewCreate.vue")).default),
    update: projectOrVuedaView("Update", async () => (await import("@vueda/views/ViewUpdate.vue")).default),
    read: projectOrVuedaView("Read", async () => (await import("@vueda/views/ViewRead.vue")).default),
    destroy: projectOrVuedaView("Destroy", async () => (await import("@vueda/views/ViewDestroy.vue")).default),
    activate: projectOrVuedaView("Activate", async () => (await import("@vueda/views/ViewActivate.vue")).default),
    deactivate: projectOrVuedaView("Deactivate", async () => (await import("@vueda/views/ViewDeactivate.vue")).default),
    "history-list": projectOrVuedaView(
        "HistoryList",
        async () => (await import("@vueda/views/ViewHistoryList.vue")).default,
    ),
};

/**
 * The view loaders for built-in actions, keyed by route action segment. Each default loader returns
 * `@/views/View<Name><App><Model>.vue` when that file exists, then `@/views/View<Name>.vue`, then the VUEDA view.
 * For example, the `list` loader returns `ViewListShopOrder.vue`, then `ViewList.vue`, then VUEDA's `ViewList`.
 *
 * @type {{[actionName: string]: ViewLoader}}
 */
export const crudComponents = { ...defaultCrudComponents };

/**
 * Merges custom view loaders into the global registry. A merged loader replaces the default loader for its key,
 * including its lookup of project files. A loader can call `findProjectView` from its second argument to keep
 * that lookup.
 *
 * @param {{[actionName: string]: ViewLoader}} customComponents - A map of action names to lazy component loaders.
 */
export function setCrudComponents(customComponents) {
    Object.assign(crudComponents, customComponents);
}
