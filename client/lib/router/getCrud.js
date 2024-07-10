import { getCRUDName } from "../utils/crudSupport.js";

const NON_DETAIL_VIEWS = ["list", "create"];

/**
 * Check if a view is a detail view.
 *
 * @param {string} view - The view name.
 * @returns {boolean} True if the view is a detail view, false otherwise.
 */
export const isDetailView = (view) => !NON_DETAIL_VIEWS.includes(view);

/**
 * Get the route configuration for a CRUD operation.
 *
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string} [params.pk] - The primary key.
 * @param {string} params.view - The view name.
 * @param {boolean} [params.throwOnUndefinedPk=false] - Whether to throw an error if pk is undefined.
 * @returns {import('vue-router').RouteLocationRaw & {
 *     params: {
 *         pk?: string,
 *     },
 * }} The route configuration.
 * @throws {Error} If parentPk or pk is required but not provided.
 */
export function getCRUDForTo({ app, model, pk, view, throwOnUndefinedPk = false }) {
    const returnValue = {
        name: getCRUDName({ app, model, view }),
        params: {},
    };
    if (pk) {
        returnValue.params.pk = pk;
    }
    if (model && !pk && !NON_DETAIL_VIEWS.includes(view) && throwOnUndefinedPk) {
        throw new Error(`pk is required when view is not one of ${NON_DETAIL_VIEWS.join(", ")}`);
    }
    return returnValue;
}
