/**
 * @module utils/actionMap
 * @description Maps view names to their corresponding DRF action names.
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
