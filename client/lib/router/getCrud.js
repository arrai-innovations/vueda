/**
 * @module router/getCrud
 * @description Provides a helper to build a Vue Router location object for a CRUD action route given app, model, and pk.
 */

/**
 * Get the route configuration for a CRUD operation.
 *
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string|string[]} [params.pk] - The primary key.
 * @param {string} params.view - The view name.
 * @returns {Promise<import('vue-router').RouteLocationRaw & {
 *     params: {
 *         pk?: string[] | string,
 *     },
 *     meta: {
 *         pks?: string[],
 *     },
 * }>} The route configuration.
 */
export async function getCRUDForTo({ app, model, pk, view, query = undefined }) {
    const returnValue = {
        name: "actionrouter.listview",
        params: {
            app,
            model,
            action: view,
        },
        query,
    };
    if (pk) {
        if (Array.isArray(pk)) {
            returnValue.query = { pk: pk.join(","), ...(query ?? {}) };
        } else {
            returnValue.params.pk = pk;
            returnValue.name = "actionrouter.detailview";
        }
    }
    return returnValue;
}
