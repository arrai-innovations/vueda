/**
 * @module utils/choiceLabels
 * @description Turns stored choice values into their display labels. Read-only widgets and list columns share this lookup, so a value shows the same label on every page.
 */

/**
 * Get the static options that label a field's stored values.
 *
 * The options are the descriptor's `displayChoices` when it has them. Otherwise they are its `choices` when `choices` is an array.
 * The result is empty for `choices: true`, whose options come from the choices endpoint, and for `choices: false`.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo|undefined} field - The field descriptor from model info.
 * @returns {Array<{[key: string]: unknown}>} The label options for the field.
 */
export function fieldChoiceOptions(field) {
    if (Array.isArray(field?.displayChoices)) {
        return field.displayChoices;
    }
    if (Array.isArray(field?.choices)) {
        return field.choices;
    }
    return [];
}

/**
 * Check whether an option's value matches a stored value.
 *
 * Model info reports static option values as the server's string forms, while a record can store a number,
 * a boolean, or `null`. The two values match when they are equal or when their server string forms are equal.
 * The server string form of `null` is `"None"`, so a static `None` choice matches a `null` value.
 * The strings `"true"` and `"false"` match in any letter case.
 * An `undefined` value matches only another `undefined` value.
 *
 * @param {unknown} optionValue - The value of an option.
 * @param {unknown} fieldValue - The stored value.
 * @returns {boolean} Whether the two values match.
 */
export function choiceValuesMatch(optionValue, fieldValue) {
    if (optionValue === fieldValue) {
        return true;
    }
    if (optionValue === undefined || fieldValue === undefined) {
        return false;
    }
    return serverChoiceString(optionValue) === serverChoiceString(fieldValue);
}

/**
 * The string that the server makes from a choice value, with `"true"` and `"false"` in lower case.
 *
 * @param {unknown} value
 * @returns {string}
 */
function serverChoiceString(value) {
    const stringValue = value === null ? "None" : String(value);
    const lowerValue = stringValue.toLowerCase();
    return lowerValue === "true" || lowerValue === "false" ? lowerValue : stringValue;
}

/**
 * Find the option that matches one stored value.
 *
 * The result is `undefined` when no option matches.
 *
 * @param {unknown} fieldValue - The stored value.
 * @param {Array<{[key: string]: unknown}>} options - The label options.
 * @param {string} [optionValue] - The option key that holds the value. It defaults to `value`.
 * @returns {{[key: string]: unknown}|undefined} The matching option.
 */
export function findChoice(fieldValue, options, optionValue = "value") {
    return options.find((option) => choiceValuesMatch(option?.[optionValue], fieldValue));
}

/**
 * Get the label of the option that matches one stored value.
 *
 * The result is the stored value itself when no option matches or when the matching option has no label.
 *
 * @param {unknown} fieldValue - The stored value.
 * @param {Array<{[key: string]: unknown}>} options - The label options.
 * @param {{optionLabel?: string, optionValue?: string}} [keys] - The option keys that hold the label and the value. They default to `label` and `value`.
 * @returns {unknown} The label for the stored value.
 */
export function choiceLabel(fieldValue, options, { optionLabel = "label", optionValue = "value" } = {}) {
    return findChoice(fieldValue, options, optionValue)?.[optionLabel] ?? fieldValue;
}

/**
 * Get the display text for a stored choice value.
 *
 * A single value shows as its label. An array value shows as the labels of its items, joined with `, `.
 * Each value that matches no option shows as the stored value.
 *
 * @param {unknown} fieldValue - The stored value, or an array of stored values.
 * @param {Array<{[key: string]: unknown}>} options - The label options.
 * @param {{optionLabel?: string, optionValue?: string}} [keys] - The option keys that hold the label and the value. They default to `label` and `value`.
 * @returns {unknown} The label, or the joined labels for an array value.
 */
export function choiceDisplay(fieldValue, options, keys) {
    if (Array.isArray(fieldValue)) {
        return fieldValue.map((value) => choiceLabel(value, options, keys)).join(", ");
    }
    return choiceLabel(fieldValue, options, keys);
}
