/**
 * @module use/validation/useTextValidation
 * @description Registers reactive text validation watches on a field context,
 * enforcing maximum length, minimum length, and regex pattern constraints.
 */
import isString from "lodash-es/isString.js";
import { computed, toRef, watch } from "vue";

/**
 * @typedef {object} TextValidationOptions
 * @property {number} [maxLength] - Maximum character count.
 * @property {number} [minLength] - Minimum character count.
 * @property {string} [patternRegex] - Regex the value must match after the field is touched.
 * @property {string} [patternForMessage] - Human-readable description of the expected pattern.
 */

/**
 * Registers reactive text validation watches on a field context.
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to validate against.
 * @param {TextValidationOptions} options - Constraint configuration (typically the component props object).
 * @returns {void}
 */
export function useTextValidation(fieldContext, options) {
    const fieldValueRef = toRef(fieldContext.state, "value");

    watch(
        [toRef(options, "maxLength"), fieldValueRef],
        ([maxLength, value]) => {
            if (maxLength && value?.length > maxLength) {
                fieldContext.updateError("maxLength", `Must be ${maxLength} characters or less.`);
            } else {
                fieldContext.deleteError("maxLength");
            }
        },
        { immediate: true },
    );

    watch(
        [toRef(options, "minLength"), fieldValueRef],
        ([minLength, value]) => {
            if (minLength && value?.length < minLength) {
                fieldContext.updateError("minLength", `Must be ${minLength} characters or more.`);
            } else {
                fieldContext.deleteError("minLength");
            }
        },
        { immediate: true },
    );

    const patternRegex = computed(() => {
        if (options.patternRegex) {
            return new RegExp(options.patternRegex);
        }
        return undefined;
    });

    watch(
        [
            toRef(fieldContext.state, "touched"),
            patternRegex,
            toRef(fieldContext.state, "value"),
            toRef(options, "patternForMessage"),
        ],
        (
            [touched, currentPatternRegex, value, patternForMessage],
            [touchedOld, currentPatternRegexOld, valueOld, patternForMessageOld],
        ) => {
            if (
                touched === touchedOld &&
                currentPatternRegex === currentPatternRegexOld &&
                value === valueOld &&
                patternForMessage === patternForMessageOld
            ) {
                return;
            }
            if (touched && currentPatternRegex && isString(value) && !currentPatternRegex.test(value)) {
                fieldContext.updateError("pattern", `Must match "${patternForMessage || currentPatternRegex}".`);
            } else {
                fieldContext.deleteError("pattern");
            }
        },
        { immediate: true },
    );
}
