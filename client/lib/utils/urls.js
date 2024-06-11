const defaultUrls = {
    infoModelInfo: "/api/info/model-info/",
    userCurrentUser: "/api/user/current-user/",
    userLogin: "/api/user/login/",
    userLogout: "/api/user/logout/",
    workflowExecuteTransition: "/api/workflow/workflow/execute-transition/",
    workflowObjectHistory: "/api/workflow/workflow/object-history/",
    workflowObjectState: "/api/workflow/workflow/object-state/",
    workflowObjectTransitions: "/api/workflow/workflow/object-transitions/",
    workflowStates: "/api/workflow/workflow/states/",
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
