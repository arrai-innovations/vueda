const defaultUrls = {
    historyObjectHistory: "/routes/history/object-history/:app/:model/:pk/",
    infoModelInfo: "/routes/vueda.info/model_info/",
    modelDetail: "/routes/:app/:model/:pk/",
    modelList: "/routes/:app/:model/",
    userCurrentUser: "/routes/vueda.user/who-is/",
    userLogin: "/routes/vueda.user/login/",
    userLogout: "/routes/vueda.user/logout/",
    workflowList: "/routes/workflow/workflow/",
    workflowRetrieveTransition: "/routes/workflow/workflow/:app/:model/",
    workflowExecuteTransition: "/routes/workflow/workflow/:app/:model/execute-transition/:pk/",
    workflowObjectState: "/routes/workflow/workflow/:app/:model/object-state/:pk/",
    workflowObjectTransitions: "/routes/workflow/workflow/:app/:model/object-transitions/:pk/",
    workflowStates: "/routes/workflow/workflow/states/",
};

const customUrls = {};

/**
 * setCustomUrl - set a custom URL-part for a key
 * @param {string} key - the key code uses to look up the URL
 * @param {string} url - the routing part of the url, between the hostname and the desired viewset/view
 * @returns {void}
 */
export const setCustomUrl = (key, url) => {
    customUrls[key] = url;
};

/**
 * getUrl - get the URL for a key
 * @param {string} key - the key code uses to look up the URL
 * @returns {string} - the URL for the key
 */
export const getUrl = (key) => {
    return customUrls[key] || defaultUrls[key];
};

/**
 * resetCustomUrls - clear all custom URLs
 * @returns {void}
 */
export const resetCustomUrls = () => {
    for (const key in customUrls) {
        delete customUrls[key];
    }
};
