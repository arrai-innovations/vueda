const defaultUrls = {
    historyObjectHistory: "/routes/history/object-history/:app/:model/:pk/",
    infoModelInfo: "/routes/vueda.info/model_info/",
    infoModelInfoChoices: "/routes/vueda.info/model_info_choices/",
    modelDetail: "/routes/:app/:model/:pk/",
    modelList: "/routes/:app/:model/",
    modelBulkAction: "/routes/:app/:model/:action_name/",
    userCurrentUser: "/routes/vueda.user/who-is/",
    userLogin: "/routes/vueda.user/login/",
    userLogout: "/routes/vueda.user/logout/",
    workflowList: "/routes/vueda.workflow/workflows/",
    workflowRetrieveTransition: "/routes/vueda.workflow/workflows/",
    workflowExecuteTransition: "/routes/vueda.workflow/workflows/:app/:model/execute-transition/",
    workflowObjectState: "/routes/vueda.workflow/workflows/:app/:model/object-state/:pk/",
    workflowObjectTransitions: "/routes/vueda.workflow/workflows/:app/:model/object-transitions/:pk/",
    workflowStates: "/routes/vueda.workflow/workflows/states/",
};

const customUrls = {};

/**
 * Sets a custom URL for a key.
 *
 * @param {string} key - the key code uses to look up the URL
 * @param {string} url - the routing part of the url, between the hostname and the desired viewset/view
 * @returns {void}
 */
export const setCustomUrl = (key, url) => {
    customUrls[key] = url;
};

/**
 * Gets the URL for a key.
 *
 * @param {string} key - the key code uses to look up the URL
 * @returns {string} - the URL for the key
 */
export const getUrl = (key) => {
    return customUrls[key] || defaultUrls[key];
};

/**
 * Resets all custom URLs.
 *
 * @returns {void}
 */
export const resetCustomUrls = () => {
    for (const key in customUrls) {
        delete customUrls[key];
    }
};
