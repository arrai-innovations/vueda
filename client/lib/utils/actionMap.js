/**
 * @module utils/actionMap
 * @description Maps view names to their corresponding DRF action names.
 */

export const viewToActionNameMap = {
    read: "retrieve",
};

export const getActionName = (action) => {
    return viewToActionNameMap[action] || action;
};
