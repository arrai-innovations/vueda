/**
 * @module utils/errors
 * @description Custom error classes and helpers for classifying fetch, form validation, and list filter failures.
 */
import { flattenPaths } from "@arrai-innovations/reactive-helpers";
import get from "lodash-es/get.js";

/**
 * Combine errors into a single array of errors.
 *
 * @param {(
 *   (Error|import('@vueda/utils/errors.js').FetchError)|
 *   (Error|import('@vueda/utils/errors.js').FetchError)[]
 * )} errors - an error or an array of errors
 * @returns {(
 *   (Error|import('@vueda/utils/errors.js').FetchError)[]
 * )} - a single array of errors
 */
export function combineErrors(errors) {
    // errors could be an Error or an array of Errors, or an array of arrays of Errors
    // return a single array of Errors
    if (Array.isArray(errors)) {
        return errors.flat();
    }
    if (!errors) {
        return [];
    }
    return [errors];
}

/**
 * Generic error class for fetch errors.
 *
 * @extends {Error}
 */
export class FetchError extends Error {
    /**
     * Creates an instance of FetchError.
     *
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        const message = [];
        message.push(messagePrefix);
        if (response?.status || response?.statusText) {
            message.push(": ");
            if (response?.status) {
                message.push(response.status);
            }
            if (response?.statusText) {
                if (response?.status) {
                    message.push(" ");
                }
                message.push(response.statusText);
            }
        }
        super(message.join(""));
        this.name = "FetchError";
        /**
         * The response object associated with the error.
         *
         * @type {Response}
         */
        this.response = response;
        /**
         * The data returned in the response. Decoded if JSON, otherwise a string.
         * @type {object|string}
         */
        this.responseData = responseData;
    }
}

/**
 * Specific error class for responses interpreted as server form validation errors.
 *
 * @extends {Error}
 */
export class FormValidationError extends Error {
    /**
     * Creates an instance of FormValidationError.
     *
     * @param {object|string} responseData - The response data.
     * @param {Response} response - The response
     */
    constructor(responseData, response) {
        super("Form validation error");
        this.name = "FormValidationError";
        /**
         * The response object associated with the error.
         *
         * @type {Response}
         */
        this.response = response;
        /**
         * The data returned in the response. Decoded if JSON, otherwise a string.
         * @type {object|string}
         */
        this.responseData = responseData;
        const data = { ...responseData };
        if ("serverStack" in data) {
            /**
             * The server stack trace, if available.
             *
             * @type {string}
             */
            this.serverStack = data.serverStack;
            delete data.serverStack;
        }
        const paths = flattenPaths(data);
        const warningsPattern = /\.warnings(\[\d+\])?/;
        const withWarnings = [];
        const withoutWarnings = [];

        paths.forEach((path) => {
            if (warningsPattern.test(path)) {
                withWarnings.push(path);
            } else {
                withoutWarnings.push(path);
            }
        });

        const objectErrorPaths = this.extractObjectPaths(withoutWarnings, ".detail");
        const stringErrorPaths = this.extractStringPaths(withoutWarnings, objectErrorPaths);

        const objectWarningPaths = this.extractObjectPaths(withWarnings, ".detail");
        const stringWarningPaths = this.extractStringPaths(withWarnings, objectWarningPaths);

        /**
         * The messages for the form validation errors.
         *
         * @type {{[path: string]: string}}
         */
        this.errors = objectErrorPaths.concat(stringErrorPaths).reduce((acc, path) => {
            const normalizedPath = path.split("[").slice(0, -1).join("[");
            if (!acc[normalizedPath]) {
                acc[normalizedPath] = [];
            }
            acc[normalizedPath].push(get(data, path));
            return acc;
        }, {});

        /**
         * The messages for the form validation warnings.
         *
         * @type {{[path: string]: string}}
         */
        this.messages = objectWarningPaths.concat(stringWarningPaths).reduce((acc, path) => {
            const normalizedPath = path.replace(warningsPattern, "").split("[").slice(0, -1).join("[");

            if (!acc[normalizedPath]) {
                acc[normalizedPath] = [];
            }
            acc[normalizedPath].push(get(data, path));
            return acc;
        }, {});
    }

    /**
     * Extracts object paths (those ending with a specific suffix, like `.detail`).
     * @param {string[]} paths - Paths to process.
     * @param {string} suffix - The suffix to look for.
     * @returns {string[]} Array of object paths.
     */
    extractObjectPaths(paths, suffix) {
        return paths.map((path) => (path.endsWith(suffix) ? path.slice(0, -suffix.length) : null)).filter(Boolean);
    }

    /**
     * Extracts string paths (those that don't start with object paths).
     * @param {string[]} paths - Paths to process.
     * @param {string[]} objectPaths - Paths already identified as object errors/warnings.
     * @returns {string[]} Array of string paths.
     */
    extractStringPaths(paths, objectPaths) {
        return paths.filter((path) => !objectPaths.some((objectPath) => path.startsWith(objectPath)));
    }
}
/**
 * Error thrown when the server responds 409 to a create/update because the change is valid but
 * carries advisory warnings that have not been acknowledged. The form should surface the warnings,
 * let the user confirm, and resubmit echoing `digest` so the server lets the write proceed.
 *
 * @extends {Error}
 */
export class ConfirmationRequiredError extends Error {
    /**
     * @param {object} responseData - The decoded 409 body: `{ confirmation_required, digest, warnings }`.
     * @param {Response} response - The response object associated with the error.
     */
    constructor(responseData, response) {
        super("Confirmation required");
        this.name = "ConfirmationRequiredError";
        /**
         * The response object associated with the error.
         * @type {Response}
         */
        this.response = response;
        /**
         * The decoded response body.
         * @type {object}
         */
        this.responseData = responseData;
        /**
         * Digest of the warning set, echoed back to acknowledge it on resubmission.
         * @type {string}
         */
        this.digest = responseData?.digest;
        /**
         * Warnings keyed by field path (with `non_field_errors` for form-level), shaped to feed
         * `handleServerFormValidationError` so they render via `state.messages`.
         * @type {{[path: string]: string[]}}
         */
        this.messages = responseData?.warnings ?? {};
        /**
         * A confirmation request carries no blocking errors.
         * @type {{[path: string]: string[]}}
         */
        this.errors = {};
    }
}
/**
 * Specific error class for responses interpreted as list filter errors from the server.
 *
 * @extends {Error}
 */
export class ListFilterError extends Error {
    /**
     * Creates an instance of FetchError.
     *
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(response, responseData) {
        super("ListFilterError");
        this.name = "ListFilterError";
        /**
         * The response object associated with the error.
         *
         * @type {Response}
         */
        this.response = response;
        /**
         * The data returned in the response. Decoded if JSON, otherwise a string.
         * @type {object|string}
         */
        this.responseData = responseData;

        const data = { ...responseData };
        if ("serverStack" in data) {
            /**
             * The server stack trace, if available.
             *
             * @type {string}
             */
            this.serverStack = data.serverStack;
            delete data.serverStack;
        }

        /**
         * The messages for the error
         *
         * @type {string}
         */
        this.message = "Invalid filter values.";

        /**
         * An object containing the details of the errors.
         * @type {object}
         */
        this.errorDetails = data;

        /**
         * The list of errored filter names.
         * @type {string[]}
         */
        this.erroredFilters = Object.keys(data);
    }
}
