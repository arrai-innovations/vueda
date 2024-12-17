import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";

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
export async function getCRUDForTo({ app, model, pk, view, throwOnUndefinedPk = false, query = undefined }) {
    // ############################################################################################
    // # don't use useModelInfo here to avoid creating reactive effects outside a component scope #
    // ############################################################################################
    const infoStore = storeModelInfo();
    const modelInfo = await infoStore.fetchModelInfo({ app, model });
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
    const isDetail = modelInfo.actions?.find((action) => action.name === view)?.detail;
    if (model && !pk && !isDetail && throwOnUndefinedPk) {
        throw new Error("pk is required for detail views");
    }
    return returnValue;
}
