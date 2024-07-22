import camelCase from "lodash-es/camelCase.js";
import lowerCase from "lodash-es/lowerCase.js";
import memoize from "lodash-es/memoize.js";
import snakeCase from "lodash-es/snakeCase.js";
import startCase from "lodash-es/startCase.js";
import pluralize from "pluralize";

/**
 * Get the server route app part in snake_case for a given app.
 * This is useful for generating server routes in snake_case format, for use in VUEDA urls.
 *
 * @param {string} appOrModel - The app or model name.
 * @returns {string} The app or model name in lowercase & snake_case.
 */
export const getServerRoutePart = memoize((appOrModel) => {
    return `${snakeCase(appOrModel).toLowerCase()}`;
});

/**
 * Get the PascalCase name for a given model.
 * This is useful for generating class names or file names in PascalCase format.
 *
 * @param {string} model - The model name.
 * @returns {string} The PascalCase name.
 */
export const getPascalCaseName = memoize((model) => {
    return `${startCase(model).replace(/ /g, "")}`;
});

/**
 * Get the client route part in snake_case for a given model.
 *
 * @param {string} appOrModel - The app or model name.
 * @returns {string} The app or model name in lowercase & snake_case.
 */
export const getClientRoutePart = memoize((appOrModel) => {
    return `${snakeCase(appOrModel).toLowerCase()}`;
});

/**
 * Get the lower case title for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The lower case title.
 */
export const getLowerTitle = memoize((model) => {
    return `${lowerCase(model)}`;
});

/**
 * Get the primary key route part in camelCase for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The primary key route part.
 */
export const getClientPkRoutePart = memoize((model) => {
    return `${camelCase(model)}`;
});

/**
 * Get the pluralized title for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The pluralized title.
 */
export const getPluralizedTitle = memoize((model) => {
    const words = model.split(" ");
    words.push(pluralize(words.pop()));
    return words.join(" ");
});

/**
 * Get the permission case (lowercase without spaces) for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The permission case.
 */
export const getPermissionCase = memoize((model) => {
    return `${lowerCase(model).replace(/ /g, "")}`;
});

/**
 * Get the permission name for a given app, model, and action.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @param {string} action - The action name.
 * @returns {string} The permission name.
 */
export const getPermissionName = memoize(({ app, model, action }) => {
    return `${getPermissionCase(app)}.${getPermissionCase(action)}_${getPermissionCase(model)}`;
});

/**
 * Get the app model dot name for a given app and model.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @returns {string} The app model dot name.
 */
export const getAppModelDotName = memoize(({ app, model }) => {
    return `${getPermissionCase(app)}.${getPermissionCase(model)}`;
});

/**
 * Get the CRUD name for a given model and view.
 *
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string} params.view - The view name.
 * @returns {string} The CRUD name.
 */
export const getCRUDName = memoize(({ app, model, view, bulk }) => {
    const name = `${getClientRoutePart(app)}.${getClientRoutePart(model)}-${view}`;
    return bulk ? `${name}-bulk` : name;
});

/**
 * For turning various `dev_strs` or `DevStrs` or `devStrs` into a human-readable titles (`Dev Strs`).
 *
 * @param {string} model - The model name.
 * @returns {string} The human-readable title.
 */
export const memoizedStartCase = memoize(startCase);
