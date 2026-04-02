/**
 * @module use/validation/useFieldValidation
 * @description Dispatches field validation to the appropriate composable based on
 * a validation type string. Used by the generic Field component to apply
 * type-specific validation from fieldMappings configuration.
 */
import { useDateTimeValidation } from "./useDateTimeValidation.js";
import { useNumericValidation } from "./useNumericValidation.js";
import { useTextValidation } from "./useTextValidation.js";
import { useTimeValidation } from "./useTimeValidation.js";

/** @type {{ [key: string]: (fieldContext: import('@vueda/use/useField.js').FieldContext, options: object) => void }} */
const validators = {
    text: useTextValidation,
    numeric: useNumericValidation,
    decimal: (fieldContext, options) => useNumericValidation(fieldContext, options, { coerce: true }),
    date: (fieldContext, options) => useDateTimeValidation(fieldContext, options, { dateOnly: true }),
    datetime: useDateTimeValidation,
    time: useTimeValidation,
};

/**
 * Dispatches to the validation composable matching the given type string.
 * Does nothing when type is undefined or unrecognized.
 *
 * @param {string|undefined} type - The validation type (e.g. "text", "numeric", "decimal", "date", "datetime", "time").
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to validate against.
 * @param {object} options - Constraint configuration (typically the component props object).
 * @returns {void}
 */
export function useFieldValidation(type, fieldContext, options) {
    if (!type) return;
    validators[type]?.(fieldContext, options);
}
