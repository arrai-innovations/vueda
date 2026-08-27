/**
 * @module utils/urls
 * @description Provides URL templates and builder functions for all VUEDA API endpoints.
 */
import { unwrapNested } from "@arrai-innovations/reactive-helpers";
import { getServerActionName, getServerRoutePart } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";

const defaultUrls = {
    activateTOTPDevice: "/routes/vueda.user/totpdevice/activate/",
    changePassword: "/routes/vueda.user/change_password/",
    checkReauthentication: "/routes/vueda.user/totpdevice/check_reauthentication/",
    getTOTPCode: "/routes/vueda.user/totp_code/",
    historyObjectHistory: "/routes/history/object-history/:app/:model/:pk/",
    infoModelInfo: "/routes/vueda.info/model_info/",
    infoModelInfoChoices: "/routes/vueda.info/model_info_choices/",
    infoModelInfoFilterChoices: "/routes/vueda.info/model_info_filter_choices/",
    infoServer: "/routes/vueda.info/server_info/",
    modelAction: "/routes/:app/:model/:action_name/",
    modelDetail: "/routes/:app/:model/:pk/",
    modelDetailAction: "/routes/:app/:model/:pk/:action_name/",
    modelList: "/routes/:app/:model/",
    reauthenticate: "/routes/vueda.user/reauthenticate/",
    recoveryCodes: "/routes/vueda.user/_allauth/browser/v1/account/authenticators/recovery-codes",
    setupTOTPDevice: "/routes/vueda.user/totpdevice/setup/",
    twoFactorAuthenticate: "/routes/vueda.user/2fa/authenticate/",
    userCurrentUser: "/routes/vueda.user/who-is/",
    userLogin: "/routes/vueda.user/login/",
    userLogout: "/routes/vueda.user/logout/",
    workflowExecuteTransition: "/routes/vueda.workflow/workflows/:app/:model/execute-transition/",
    workflowList: "/routes/vueda.workflow/workflows/",
    workflowObjectState: "/routes/vueda.workflow/workflows/:app/:model/object-state/:pk/",
    workflowObjectTransitions: "/routes/vueda.workflow/workflows/:app/:model/object-transitions/:pk/",
    workflowRetrieveTransition: "/routes/vueda.workflow/workflows/",
    workflowStates: "/routes/vueda.workflow/workflows/states/",
    workflowUserPermittedTransitions: "/routes/vueda.workflow/workflows/:app/:model/permitted_transitions/",
};

const customUrls = {};

/**
 * Sets a custom URL for a key.
 *
 * @param {string} key - the key code uses to look up the URL
 * @param {string} url - the routing part of the url, between the hostname and the desired viewset/view
 * @returns {void}
 * @example
 * ```js
 * setCustomUrl('modelList', '/api/v2/:app/:model/');
 * ```
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

/**
 * Get a VUEDA list or list action URL.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @param {string} [action] - The action name, if any.
 * @param {string} [query] - The query string, if any. If provided, it should start with a "?".
 * @returns {string} - The URL.
 */
export const getListUrl = ({ app, model, action, query = "" }) => {
    const urlTemplate = getUrl(action ? "modelAction" : "modelList");
    let url = urlTemplate.replace(":app", app.toLowerCase()).replace(":model", getServerRoutePart(model));
    if (action) {
        url = url.replace(":action_name", getServerActionName(action));
    }
    return `${httpOrHttpsHostname}${url}${query}`;
};

/**
 * Get a VUEDA detail or detail action URL.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @param {string} pk - The primary key.
 * @param {string} [action] - The action name, if any.
 * @param {string} [query] - The query string, if any. If provided, it should start with a "?".
 * @returns {string} - The URL.
 */
export const getDetailUrl = ({ app, model, pk, action, query = "" }) => {
    const urlTemplate = getUrl(action ? "modelDetailAction" : "modelDetail");
    const appStr = app.toLowerCase();
    const modelStr = getServerRoutePart(model);
    const pkStr = unwrapNested(pk);
    const actionStr = getServerActionName(action);
    let url = urlTemplate.replace(":app", appStr).replace(":model", modelStr).replace(":pk", pkStr);
    if (actionStr) {
        url = url.replace(":action_name", actionStr);
    }
    return `${httpOrHttpsHostname}${url}${unwrapNested(query)}`;
};
