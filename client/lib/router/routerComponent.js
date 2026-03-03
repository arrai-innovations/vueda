/**
 * @module router/routerComponent
 * @description Defines and exports the default CRUD view component map with support for consumer overrides.
 */

const defaultCrudComponents = {
    list: async () => (await import("@vueda/views/ViewList.vue")).default,
    create: async () => (await import("@vueda/views/ViewCreate.vue")).default,
    update: async () => (await import("@vueda/views/ViewUpdate.vue")).default,
    read: async () => (await import("@vueda/views/ViewRead.vue")).default,
    destroy: async () => (await import("@vueda/views/ViewDestroy.vue")).default,
    activate: async () => (await import("@vueda/views/ViewActivate.vue")).default,
    deactivate: async () => (await import("@vueda/views/ViewDeactivate.vue")).default,
    "history-list": async () => (await import("@vueda/views/ViewHistoryList.vue")).default,
};

export const crudComponents = { ...defaultCrudComponents };

/**
 * Merges custom CRUD view components into the global registry, overriding defaults.
 *
 * @param {{[actionName: string]: () => Promise<object>}} customComponents - A map of action names to lazy component importers.
 */
export function setCrudComponents(customComponents) {
    Object.assign(crudComponents, customComponents);
}
