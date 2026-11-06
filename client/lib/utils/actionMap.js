/**
 * @module utils/actionMap
 * @description Maps view names, which are the action segments of client routes, to their corresponding DRF action
 * names and back.
 */

export const viewToActionNameMap = {
    read: "retrieve",
};

/**
 * Maps a view name to its corresponding DRF action name, defaulting to the view name itself.
 *
 * @param {string} action - The view name (e.g. "read", "list", "create").
 * @returns {string} The corresponding DRF action name.
 */
export const getActionName = (action) => {
    return viewToActionNameMap[action] || action;
};

const actionToViewNameMap = Object.fromEntries(Object.entries(viewToActionNameMap).map(([view, name]) => [name, view]));

/**
 * The DRF action names that have no client route. The `update` route serves `partial_update`.
 *
 * @type {Set<string>}
 */
export const unroutedActionNames = new Set(["partial_update"]);

/**
 * Maps a DRF action name to its corresponding view name, defaulting to the action name itself.
 *
 * @param {string} actionName - The DRF action name (e.g. "retrieve", "list", "create").
 * @returns {string} The corresponding view name.
 */
export const getViewName = (actionName) => {
    return actionToViewNameMap[actionName] || actionName;
};
