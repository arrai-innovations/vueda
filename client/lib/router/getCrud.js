import { storeViewInfo } from "@vueda/stores/storeViewInfo.js";

/**
 * Check if a view is a detail view.
 *
 * @param {String} view - The name of the view.
 * @returns {boolean} True if the view is a detail view, false otherwise.
 */
export const isDetailView = (view) => {
    return storeViewInfo().isDetailView(view);
};

/**
 * Check if a view is a bulk view.
 *
 * @param {object} view - The view.
 * @returns {boolean} True if the view is a detail view, false otherwise.
 */
export const isBulkView = (view) => {
    return storeViewInfo().isBulkView(view);
};

/**
 * Get the route configuration for a CRUD operation.
 *
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string|string[]} [params.pk] - The primary key.
 * @param {string} params.view - The view name.
 * @param {boolean} [params.throwOnUndefinedPk=false] - Whether to throw an error if pk is undefined.
 * @returns {import('vue-router').RouteLocationRaw & {
 *     params: {
 *         pk?: string[] | string,
 *     },
 *     meta: {
 *         pks?: string[],
 *     },
 * }} The route configuration.
 * @throws {Error} If parentPk or pk is required but not provided.
 */
export function getCRUDForTo({ app, model, pk, view, throwOnUndefinedPk = false }) {
    const viewStore = storeViewInfo();
    const returnValue = {
        name: "actionrouter.listview",
        params: {
            app,
            model,
            action: view,
        },
    };
    if (pk) {
        if (Array.isArray(pk)) {
            returnValue.query = { pk: pk.join(",") };
        } else {
            returnValue.params.pk = pk;
            returnValue.name = "actionrouter.detailview";
        }
    }

    if (model && !pk && !viewStore.detail.includes(view) && throwOnUndefinedPk) {
        throw new Error(`pk is required when view is not one of ${viewStore.detail.join(", ")}`);
    }
    return returnValue;
}
