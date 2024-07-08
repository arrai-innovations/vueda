import { combineErrors } from "./errors.js";
import inspect from "browser-util-inspect";

/**
 * Format an error object for display. In development, we include the stack trace and if available, the
 *  server stack trace.
 *
 * @param {Error|Error[]} error - the error object to format
 * @returns {string} - the formatted error message
 */
export function formatError(error) {
    const errorArray = combineErrors(error);
    const messages = errorArray.map((error) => {
        const lines = [];

        if (error?.stack && import.meta.env.DEV) {
            // client stacks will already include the name and message
            lines.push(error.stack);
        } else {
            if (error?.name && error?.message) {
                lines.push(`${error.name}\u2014${error.message}`);
            } else {
                if (error?.name) {
                    lines.push(error.name);
                }
                if (error?.message) {
                    lines.push(error.message);
                }
            }
        }
        if (error?.response?.status || error?.response?.statusText) {
            lines.push(`${error.response.status}: ${error.response.statusText}`);
        }
        if (error?.responseData?.detail) {
            lines.push(error.responseData.detail);
        }

        if (error?.response?.stack) {
            lines.push(error.response.stack);
        }
        if (error?.responseData?.serverStack) {
            lines.push(error.responseData.serverStack);
        }
        if (!lines.length) {
            // last resort, just inspect the error
            lines.push(inspect(error));
        }
        return lines.join("\n");
    });
    return messages.join("\n");
}
