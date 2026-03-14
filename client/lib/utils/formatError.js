/**
 * @module utils/formatError
 * @description Formats one or more error objects into a human-readable string, including stack traces in development.
 */
import { combineErrors } from "@vueda/utils/errors.js";
import inspect from "browser-util-inspect";

/**
 * Format an error object for display. In development, we include the stack trace and if available, the
 *  server stack trace.
 *
 * @param {(
 *   (Error|import('@vueda/utils/errors.js').FetchError)|
 *   (Error|import('@vueda/utils/errors.js').FetchError)[]
 * )} error - the error object to format
 * @returns {string} - the formatted error message
 */
export function formatError(error) {
    const errorArray = combineErrors(error);
    const messages = errorArray.map((error) => {
        const lines = [];

        if (error?.stack && import.meta.env.DEV) {
            // client stacks will already include the name and message
            lines.push(`${error.name}${error.name ? "\u2014" : ""}${error.message}\n${error.stack}`);
        } else {
            if (error?.name && error?.message) {
                lines.push(`${error.name}${error.name ? "\u2014" : ""}${error.message}`);
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
            lines.push(inspect(error));
        }

        return lines.join("\n");
    });
    return messages.join("\n\n");
}
