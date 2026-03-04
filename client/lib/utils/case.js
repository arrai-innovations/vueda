/**
 * @module utils/case
 * @description Memoized case-conversion utilities for deriving route parts, CRUD names, and display titles from app and model names.
 */
import { unwrapNested } from "@arrai-innovations/reactive-helpers";
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
}, unwrapNested);

/**
 * Get the PascalCase name for a given model.
 * This is useful for generating class names or file names in PascalCase format.
 *
 * @param {string} model - The model name.
 * @returns {string} The PascalCase name.
 */
export const getPascalCaseName = memoize((model) => {
    return `${startCase(model).replace(/ /g, "")}`;
}, unwrapNested);

/**
 * Get the client route part in snake_case for a given model.
 *
 * @param {string} appOrModel - The app or model name.
 * @returns {string} The app or model name in lowercase & snake_case.
 */
export const getClientRoutePart = memoize((appOrModel) => {
    return `${snakeCase(appOrModel).toLowerCase()}`;
}, unwrapNested);

/**
 * Get the lower case title for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The lower case title.
 */
export const getLowerTitle = memoize((model) => {
    return `${lowerCase(model)}`;
}, unwrapNested);

/**
 * Get the primary key route part in camelCase for a given model.
 *
 * @param {string} model - The model name.
 * @returns {string} The primary key route part.
 */
export const getClientPkRoutePart = memoize((model) => {
    return `${camelCase(model)}`;
}, unwrapNested);

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
}, unwrapNested);

/**
 * Get the normalized key (lowercase without spaces) for a given app, model or view identifier.
 *
 * @param {string} idx - The identifier.
 * @returns {string} The normalized key.
 */
export const getNormalizedKey = memoize((idx) => {
    return `${lowerCase(idx).replace(/ /g, "")}`;
}, unwrapNested);

/**
 * Get the app model dot name for a given app and model.
 *
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @returns {string} The app model dot name.
 */
export const getAppModelDotName = memoize(
    ({ app, model }) => {
        return `${getNormalizedKey(app)}.${getNormalizedKey(model)}`;
    },
    ({ app, model }) => {
        return unwrapNested(app) + "." + unwrapNested(model);
    },
);

/**
 * Get the app model view dot name for a given app, model, and view.
 * We rely on startsWith() on the resulting key to filter them using getAppModelDotName().
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string} params.view - The view name.
 * @returns {string} The app model view dot name.
 */
export const getAppModelViewDotName = memoize(
    ({ app, model, view }) => {
        return `${getAppModelDotName({ app, model })}-${getNormalizedKey(view)}`;
    },
    ({ app, model, view }) => unwrapNested(app) + "." + unwrapNested(model) + "-" + unwrapNested(view),
);

/**
 * Get the CRUD name for a given model and view.
 *
 * @param {object} params - The parameters.
 * @param {string} params.app - The app name.
 * @param {string} params.model - The model name.
 * @param {string} params.view - The view name.
 * @returns {string} The CRUD name.
 */
export const getCRUDName = memoize(
    ({ app, model, view, bulk }) => {
        const name = `${getClientRoutePart(app)}.${getClientRoutePart(model)}-${view}`;
        return bulk ? `${name}-bulk` : name;
    },
    ({ app, model, view, bulk }) =>
        unwrapNested(app) + "." + unwrapNested(model) + "-" + unwrapNested(view) + (bulk ? "-bulk" : ""),
);

/**
 * Converts a dashed URL name to an underscored action name and returns it.
 *
 * @param {string} params - The url name.
 * @returns {string} The action name.
 */
export const getServerActionName = memoize((urlName) => urlName?.replace?.(/-/g, "_") || "", unwrapNested);

/**
 * For turning various `dev_strs` or `DevStrs` or `devStrs` into a human-readable titles (`Dev Strs`).
 *
 * @param {string} model - The model name.
 * @returns {string} The human-readable title.
 */
export const memoizedStartCase = memoize(startCase, unwrapNested);
/**
 * For turning various `dev_strs` or `DevStrs` or `devStrs` into a human-readable titles (`Dev Strs`).
 *
 * @param {string} model - The model name.
 * @returns {string} The human-readable title.
 */
export const memoizedSnakeCase = memoize(snakeCase, unwrapNested);
