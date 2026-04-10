/**
 * @module use/validation/useDevTypeGuard
 * @description Registers a development-only watcher that warns when a field's value
 * does not match the expected type. This is a no-op in production builds.
 */
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { watchIfDev } from "@vueda/utils/dev.js";

/**
 * @callback TypeCheckFn
 * @param {*} value - The current field value.
 * @returns {string|null} A warning message if the value is invalid, or null if valid.
 */

/**
 * Registers a development-only watcher on the field value that logs a warning
 * when the check function returns a non-null message. By default, null and
 * undefined values are skipped. Set `includeNull` to true when the check
 * function needs to inspect null (e.g. FieldBoolean nullable validation).
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldContext - The field context to watch.
 * @param {TypeCheckFn} check - A function that receives the value and returns a warning message or null.
 * @param {{ includeNull?: boolean }} [config] - Optional configuration.
 * @returns {void}
 */
export function useDevTypeGuard(fieldContext, check, config = {}) {
    const includeNull = config.includeNull ?? false;
    const logger = useDevLogger({ fieldContext });

    watchIfDev(
        () => fieldContext.state.value,
        (value) => {
            if (value === undefined) {
                return;
            }
            if (value === null && !includeNull) {
                return;
            }
            const message = check(value);
            if (message) {
                logger.warn(message, value);
            }
        },
        { immediate: true },
    );
}
