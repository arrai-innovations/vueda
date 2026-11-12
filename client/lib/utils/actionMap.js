/**
 * @module utils/actionMap
 * @description Maps view names, which are the action segments of client routes, to their corresponding DRF action
 * names and back. Also chooses the HTTP method that the action views send for an action.
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

/**
 * The HTTP methods that write data, in lowercase as model info reports them.
 *
 * @type {Set<string>}
 */
const writeMethodNames = new Set(["post", "put", "patch", "delete"]);

/**
 * Chooses the HTTP method that the action views send for an action.
 *
 * The action views send only a write method that `methodNames` lists. When `preferredMethod` is given, the result is
 * that method if `methodNames` lists it as a write method. Without `preferredMethod`, the result is `"PUT"` when
 * `methodNames` lists `put`. Otherwise, it is the first write method in `methodNames`. The result is `null` when no
 * method qualifies.
 *
 * @param {string[]} [methodNames] - The action's `methodNames` from model info, such as `["get", "post"]`.
 * @param {string} [preferredMethod] - The method that the caller asks for, such as `"PATCH"`.
 * @returns {string|null} The uppercase HTTP method, such as `"POST"`. The result is `null` when there is no method
 *  to send.
 */
export const getActionRequestMethod = (methodNames = [], preferredMethod) => {
    const writeMethods = methodNames.filter((methodName) => writeMethodNames.has(methodName));
    if (preferredMethod) {
        return writeMethods.includes(preferredMethod.toLowerCase()) ? preferredMethod.toUpperCase() : null;
    }
    if (writeMethods.includes("put")) {
        return "PUT";
    }
    return writeMethods[0]?.toUpperCase() ?? null;
};
