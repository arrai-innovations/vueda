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
 * @param {string|string[]} [params.pk] - One primary key, which targets the detail route, or an array
 *     of keys, which targets the list route with one repeated `pk` query value per key. An empty array
 *     is no selection.
 * @param {string} params.view - The view name.
 * @param {object} [params.query] - Other query values for the target. Pass keys through `pk`; a
 *     `pk` entry here throws.
 * @returns {Promise<import('vue-router').RouteLocationRaw & {
 *     params: {
 *         pk?: string,
 *     },
 *     query?: {
 *         pk?: string[],
 *     },
 * }>} The route configuration.
 * @throws {Error} When `query` has a `pk` entry.
 */
export async function getCRUDForTo({ app, model, pk, view, query = undefined }) {
    if (query && Object.hasOwn(query, "pk")) {
        throw new Error(
            "getCRUDForTo: query must not have a pk entry. Pass the selected keys as pk, and omit pk when forwarding another route's query.",
        );
    }
    const returnValue = {
        name: "actionrouter.listview",
        params: {
            app,
            model,
            action: view,
        },
        query,
    };
    if (Array.isArray(pk)) {
        if (pk.length) {
            // Copy the selection, so a later change to the caller's array does not change this target.
            returnValue.query = { ...query, pk: [...pk] };
        }
    } else if (pk) {
        returnValue.params.pk = pk;
        returnValue.name = "actionrouter.detailview";
    }
    return returnValue;
}
