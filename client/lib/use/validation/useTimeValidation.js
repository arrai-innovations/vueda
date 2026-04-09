/**
 * @module use/validation/useTimeValidation
 * @description Registers reactive time validation watches on a field context,
 * enforcing minimum value, maximum value, and step constraints. Time values
 * are expected in HH:mm:ss format and are converted to seconds for comparison.
 */
import { DateTime } from "luxon";
import { computed, toRef, watch } from "vue";

/**
 * @typedef {object} TimeValidationOptions
 * @property {Date|string} [maxValue] - The latest time allowed; accepts a Date object or an HH:mm:ss string.
 * @property {Date|string} [minValue] - The earliest time allowed; accepts a Date object or an HH:mm:ss string.
 * @property {number} [step] - The increment step in seconds; the time value must be a multiple of this step.
 */

/**
 * Convert a time string (HH:mm:ss) or Date object to total seconds since midnight.
 *
 * @param {string|Date|null|undefined} time
 * @returns {number|null}
 */
function timeToComparableValue(time) {
    if (!time) {
        return null;
    }
    if (typeof time === "string") {
        const parsed = DateTime.fromFormat(time, "HH:mm:ss");
        if (parsed.isValid) {
            return parsed.hour * 3600 + parsed.minute * 60 + parsed.second;
        }
        return null;
    }
    if (time instanceof Date) {
        return time.getUTCHours() * 3600 + time.getUTCMinutes() * 60 + time.getUTCSeconds();
    }
    return null;
}

/**
 * Registers reactive time validation watches on a field context.
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to validate against.
 * @param {TimeValidationOptions} options - Constraint configuration (typically the component props object).
 * @returns {void}
 */
export function useTimeValidation(fieldContext, options) {
    /** @type {import('vue').ComputedRef<number|null>} */
    const valueAsTime = computed(() => {
        const value = fieldContext.state.value;
        return value ? timeToComparableValue(value) : null;
    });

    watch(
        [toRef(options, "maxValue"), valueAsTime],
        ([maxValue, value]) => {
            const maxTimeValue = timeToComparableValue(maxValue);
            if (maxTimeValue !== null && value !== null && value > maxTimeValue) {
                fieldContext.updateError("maxValue", `Must be ${maxValue} or less.`);
            } else {
                fieldContext.deleteError("maxValue");
            }
        },
        { immediate: true },
    );

    watch(
        [toRef(options, "minValue"), valueAsTime],
        ([minValue, value]) => {
            const minTimeValue = timeToComparableValue(minValue);
            if (minTimeValue !== null && value !== null && value < minTimeValue) {
                fieldContext.updateError("minValue", `Must be ${minValue} or more.`);
            } else {
                fieldContext.deleteError("minValue");
            }
        },
        { immediate: true },
    );

    watch(
        [toRef(options, "step"), valueAsTime],
        ([step, value]) => {
            if (step) {
                if (value !== null && value % step !== 0) {
                    fieldContext.updateError("step", `Must be a multiple of ${step}.`);
                } else {
                    fieldContext.deleteError("step");
                }
            }
        },
        { immediate: true },
    );
}
