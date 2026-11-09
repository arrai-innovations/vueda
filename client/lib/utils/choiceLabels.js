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
 * Model info reports option values as strings, while a record can store a number or a boolean.
 * The two values match when they are equal or when their string forms are equal.
 * The strings `"true"` and `"false"` match in any letter case.
 *
 * @param {unknown} optionValue - The value of an option.
 * @param {unknown} fieldValue - The stored value.
 * @returns {boolean} Whether the two values match.
 */
export function choiceValuesMatch(optionValue, fieldValue) {
    if (optionValue === fieldValue) {
        return true;
    }
    if (optionValue === null || optionValue === undefined || fieldValue === null || fieldValue === undefined) {
        return false;
    }
    const normalizeBooleanString = (value) => {
        const lowerValue = value.toLowerCase();
        return lowerValue === "true" || lowerValue === "false" ? lowerValue : value;
    };
    return normalizeBooleanString(String(optionValue)) === normalizeBooleanString(String(fieldValue));
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
    const choice = options.find((option) => choiceValuesMatch(option?.[optionValue], fieldValue));
    return choice?.[optionLabel] ?? fieldValue;
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
