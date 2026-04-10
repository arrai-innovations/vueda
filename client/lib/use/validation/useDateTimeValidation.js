/**
 * @module use/validation/useDateTimeValidation
 * @description Registers reactive date/datetime validation watches on a field context,
 * enforcing minimum and maximum bounds using Luxon for parsing and formatting.
 * Covers both date-only (YYYY-MM-DD) and full datetime (ISO 8601) fields.
 */
import { DateTime } from "luxon";
import { computed, watch } from "vue";

/**
 * @typedef {object} DateTimeValidationOptions
 * @property {Date|string} [maxValue] - The latest date/datetime allowed.
 * @property {Date|string} [minValue] - The earliest date/datetime allowed.
 */

/**
 * @typedef {object} DateTimeValidationConfig
 * @property {boolean} [dateOnly] - When true, formats error messages as YYYY-MM-DD instead of full ISO datetime.
 */

/**
 * Parse a Date object or ISO string to a JS Date.
 *
 * @param {Date|string|null|undefined} value
 * @returns {Date|null}
 */
function parseToDate(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    const dt = DateTime.fromISO(value, { zone: "local" });
    return dt.isValid ? dt.toJSDate() : null;
}

/**
 * Format a JS Date for error messages.
 *
 * @param {Date|null} date
 * @param {boolean} dateOnly
 * @returns {string}
 */
function formatForMessage(date, dateOnly) {
    if (!date) {
        return "";
    }
    if (dateOnly) {
        return DateTime.fromJSDate(date, { zone: "local" }).toISODate();
    }
    return DateTime.fromJSDate(date).toISO({ suppressMilliseconds: true });
}

/**
 * Registers reactive date/datetime validation watches on a field context.
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to validate against.
 * @param {DateTimeValidationOptions} options - Constraint configuration (typically the component props object).
 * @param {DateTimeValidationConfig} [config] - Static configuration for the validation behavior.
 * @returns {void}
 */
export function useDateTimeValidation(fieldContext, options, config = {}) {
    const dateOnly = config.dateOnly ?? false;

    const valueAsDate = computed(() => parseToDate(fieldContext.state.value));
    const maxValueAsDate = computed(() => parseToDate(options.maxValue));
    const minValueAsDate = computed(() => parseToDate(options.minValue));

    watch(
        [maxValueAsDate, valueAsDate],
        ([maxValue, value]) => {
            if (maxValue && value && value > maxValue) {
                fieldContext.updateError("maxValue", `Must be ${formatForMessage(maxValue, dateOnly)} or less.`);
            } else {
                fieldContext.deleteError("maxValue");
            }
        },
        { immediate: true },
    );

    watch(
        [minValueAsDate, valueAsDate],
        ([minValue, value]) => {
            if (minValue && value && value < minValue) {
                fieldContext.updateError("minValue", `Must be ${formatForMessage(minValue, dateOnly)} or more.`);
            } else {
                fieldContext.deleteError("minValue");
            }
        },
        { immediate: true },
    );
}
