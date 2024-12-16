export const viewToActionNameMap = {
    read: "retrieve",
};

export const getActionName = (action) => {
    return viewToActionNameMap[action] || action;
};
