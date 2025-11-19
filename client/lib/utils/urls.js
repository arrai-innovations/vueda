import { unwrapNested } from "@arrai-innovations/reactive-helpers";
import { getServerActionName, getServerRoutePart } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";

const defaultUrls = {
    historyObjectHistory: "/routes/history/object-history/:app/:model/:pk/",
    infoModelInfo: "/routes/vueda.info/model_info/",
    infoModelInfoChoices: "/routes/vueda.info/model_info_choices/",
    infoServer: "/routes/vueda.info/server_info/",
    infoModelInfoFilterChoices: "/routes/vueda.info/model_info_filter_choices/",
    modelDetail: "/routes/:app/:model/:pk/",
    modelDetailAction: "/routes/:app/:model/:pk/:action_name/",
    modelList: "/routes/:app/:model/",
    modelAction: "/routes/:app/:model/:action_name/",
    userCurrentUser: "/routes/vueda.user/who-is/",
    userLogin: "/routes/vueda.user/login/",
    userLogout: "/routes/vueda.user/logout/",
    workflowList: "/routes/vueda.workflow/workflows/",
    workflowUserPermittedTransitions: "/routes/vueda.workflow/workflows/:app/:model/permitted_transitions/",
    workflowRetrieveTransition: "/routes/vueda.workflow/workflows/",
    workflowExecuteTransition: "/routes/vueda.workflow/workflows/:app/:model/execute-transition/",
    workflowObjectState: "/routes/vueda.workflow/workflows/:app/:model/object-state/:pk/",
    workflowObjectTransitions: "/routes/vueda.workflow/workflows/:app/:model/object-transitions/:pk/",
    workflowStates: "/routes/vueda.workflow/workflows/states/",
    setupTOTPDevice: "/routes/vueda.user/totpdevice/setup/",
    checkReauthentication: "/routes/vueda.user/totpdevice/check_reauthentication/",
    activateTOTPDevice: "/routes/vueda.user/totpdevice/activate/",
    reauthenticate: "/routes/vueda.user/reauthenticate/",
    getTOTPCode: "/routes/vueda.user/totp_code/",
    twoFactorAuthenticate: "/routes/vueda.user/2fa/authenticate/",
    recoveryCodes: "/routes/vueda.user/_allauth/browser/v1/account/authenticators/recovery-codes",
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

/**
 * Get a VUEDA list or list action URL.
 *
 * @param app {string} - The app name.
 * @param model {string} - The model name.
 * @param [action] {string} - The action name, if any.
 * @param [query] {string} - The query string, if any. If provided, it should start with a "?".
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
 * @param app {string} - The app name.
 * @param model {string} - The model name.
 * @param pk {string} - The primary key.
 * @param [action] {string} - The action name, if any.
 * @param [query] {string} - The query string, if any. If provided, it should start with a "?".
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
