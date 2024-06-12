import camelCase from "lodash-es/camelCase";
import lowerCase from "lodash-es/lowerCase";
import snakeCase from "lodash-es/snakeCase";
import startCase from "lodash-es/startCase";
import pluralize from "pluralize";

/**
 * Get the server route part in snake_case for a given app and model.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @returns {string} The server route part.
 */
export function getServerRoutePart(app, model) {
    return `${snakeCase(app)}/${snakeCase(model)}`;
}

/**
 * Get the PascalCase name for a given model.
 * This is useful for generating class names or file names in PascalCase format.
 *
 * @param {string} model - The model name.
 * @returns {string} The PascalCase name.
 */
export function getPascalCaseName(model) {
    return `${startCase(model).replace(/ /g, "")}`;
}

/**
 * Get the client route part in snake_case for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The client route part.
 */
export function getClientRoutePart(model) {
    return `${snakeCase(model)}`;
}

/**
 * Get the lower case title for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The lower case title.
 */
export function getLowerTitle(model) {
    return `${lowerCase(model)}`;
}

/**
 * Get the capitalized title for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The capitalized title.
 */
export function getCapitalizedTitle(model) {
    const startCaseTitle = startCase(model);
    return startCaseTitle.charAt(0).toUpperCase() + startCaseTitle.slice(1);
}

/**
 * Get the primary key route part in camelCase for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The primary key route part.
 */
export function getClientPkRoutePart(model) {
    return `${camelCase(model)}`;
}

/**
 * Get the pluralized title for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The pluralized title.
 */
export function getPluralizedTitle(model) {
    const words = model.split(" ");
    words.push(pluralize(words.pop()));
    return words.join(" ");
}

/**
 * Get the permission case (lowercase without spaces) for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The permission case.
 */
export function getPermissionCase(model) {
    return `${lowerCase(model).replace(/ /g, "")}`;
}

/**
 * Get the permission name for a given app, model, and action.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @param {string} action - The action name.
 * @returns {string} The permission name.
 */
export function getPermissionName(app, model, action) {
    return `${getPermissionCase(app)}.${getPermissionCase(action)}_${getPermissionCase(model)}`;
}
