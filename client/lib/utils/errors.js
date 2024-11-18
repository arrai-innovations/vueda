import { flattenPaths } from "@arrai-innovations/reactive-helpers";
import get from "lodash-es/get.js";
import isArray from "lodash-es/isArray.js";

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
    if (isArray(errors)) {
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
        const warningsPattern = /\.warnings\[\d+\]$/;
        const withWarnings = [];
        const withoutWarnings = [];

        paths.forEach((path) => {
            if (warningsPattern.test(path)) {
                withWarnings.push(path);
            } else {
                withoutWarnings.push(path);
            }
        });
        /**
         * The messages for the form validation errors.
         *
         * @type {{[path: string]: string}}
         */
        this.errors = withoutWarnings.reduce((acc, path) => {
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
        this.messages = withWarnings.reduce((acc, path) => {
            const normalizedPath = path
                .replace(/\.warnings\[\d+\]$/, "")
                .split("[")
                .slice(0, -1)
                .join("[");

            if (!acc[normalizedPath]) {
                acc[normalizedPath] = [];
            }
            acc[normalizedPath].push(get(data, path));
            return acc;
        }, {});
    }
}
