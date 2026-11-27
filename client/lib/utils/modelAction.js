/**
 * @module utils/modelAction
 * @description Helpers that the model action views share: the selected primary keys and the model name in their copy.
 */
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";

/**
 * Returns the model's verbose name for copy about one or more objects.
 *
 * The name comes from model info as written. Without model info, it is the model name in lower title case, and the
 * plural form pluralizes that name's last word.
 *
 * @param {{verboseName?: string, verboseNamePlural?: string}|undefined} info - The model's info.
 * @param {string} model - The model name.
 * @param {boolean} plural - Whether the copy is about more than one object.
 * @returns {string} The verbose name.
 */
export function getModelVerboseName(info, model, plural) {
    if (plural) {
        return info?.verboseNamePlural || getLowerTitle(getPluralizedTitle(model));
    }
    return info?.verboseName || getLowerTitle(model);
}

/**
 * Normalizes a scalar, array, or empty primary key value into an array.
 *
 * An array keeps its entries in order, without the `undefined`, `null`, and empty-string ones. A scalar becomes a
 * one-entry array. An empty value becomes an empty array.
 *
 * @param {unknown|unknown[]} value - Raw primary key input.
 * @returns {unknown[]} Normalized primary keys.
 */
export function normalizePks(value) {
    if (Array.isArray(value)) {
        return value.filter((pk) => pk !== undefined && pk !== null && pk !== "");
    }
    if (value === undefined || value === null || value === "") {
        return [];
    }
    return [value];
}
