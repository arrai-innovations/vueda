/**
 * @module use/validation/useNumericValidation
 * @description Registers reactive numeric validation watches on a field context,
 * enforcing maximum value, minimum value, and step constraints. Supports optional
 * string-to-number coercion for decimal fields that store values as strings.
 */
import { computed, toRef, watch } from "vue";

/**
 * @typedef {object} NumericValidationOptions
 * @property {number} [maxValue] - Maximum numeric value allowed.
 * @property {number} [minValue] - Minimum numeric value allowed.
 * @property {number} [step] - The value must be a multiple of this step.
 */

/**
 * @typedef {object} NumericValidationConfig
 * @property {boolean} [coerce] - When true, attempt to coerce string values to numbers before validating.
 */

/**
 * Coerce a value to a number if it is a numeric string.
 *
 * @param {*} value
 * @returns {*} The original value, or a number if the value was a numeric string.
 */
function toNumeric(value) {
    if (typeof value === "string" && !isNaN(Number(value))) {
        return Number(value);
    }
    return value;
}

/**
 * Registers reactive numeric validation watches on a field context.
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to validate against.
 * @param {NumericValidationOptions} options - Constraint configuration (typically the component props object).
 * @param {NumericValidationConfig} [config] - Static configuration for the validation behavior.
 * @returns {void}
 */
export function useNumericValidation(fieldContext, options, config = {}) {
    const fieldValueRef = toRef(fieldContext.state, "value");
    const coerce = config.coerce ?? false;

    /**
     * @param {*} value
     * @returns {*}
     */
    const resolve = (value) => (coerce ? toNumeric(value) : value);

    watch(
        [toRef(options, "maxValue"), fieldValueRef],
        ([maxValue, value]) => {
            const numericValue = resolve(value);
            if (numericValue !== null && maxValue !== undefined && numericValue > maxValue) {
                fieldContext.updateError("maxValue", `Must be ${maxValue} or less.`);
            } else {
                fieldContext.deleteError("maxValue");
            }
        },
        { immediate: true },
    );

    watch(
        [toRef(options, "minValue"), fieldValueRef],
        ([minValue, value]) => {
            const numericValue = resolve(value);
            if (numericValue !== null && minValue !== undefined && numericValue < minValue) {
                fieldContext.updateError("minValue", `Must be ${minValue} or more.`);
            } else {
                fieldContext.deleteError("minValue");
            }
        },
        { immediate: true },
    );

    const stepScaleFactor = computed(() => {
        const step = options.step;
        if (step) {
            const stepStr = step.toString();
            const decimalIndex = stepStr.indexOf(".");
            if (decimalIndex !== -1) {
                return Math.pow(10, stepStr.length - decimalIndex - 1);
            }
        }
        return 1;
    });

    watch(
        [toRef(options, "step"), fieldValueRef],
        ([step, value]) => {
            const numericValue = resolve(value);
            if (step && numericValue !== null) {
                const factor = stepScaleFactor.value;
                const stepScaled = step * factor;
                const valueScaled = numericValue * factor;
                if (valueScaled % stepScaled !== 0) {
                    fieldContext.updateError("step", `Must be a multiple of ${step}.`);
                } else {
                    fieldContext.deleteError("step");
                }
            } else {
                fieldContext.deleteError("step");
            }
        },
        { immediate: true },
    );
}
