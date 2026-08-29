/**
 * @module utils/errors
 * @description Custom error classes and helpers for classifying fetch, server feedback, form validation, and list filter failures.
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
 * Base class for server responses that can be ingested into form feedback.
 *
 * @extends {Error}
 */
export class ServerFeedbackError extends Error {
    /**
     * Creates an instance of ServerFeedbackError.
     *
     * @param {string} [message="Server feedback error"] - The error message.
     * @param {object} [options] - Server feedback options.
     * @param {Response} [options.response] - The response object associated with the error.
     * @param {object|string} [options.responseData] - The data returned in the response.
     * @param {{[path: string]: string[]}} [options.errors] - Blocking feedback keyed by field path.
     * @param {{[path: string]: string[]}} [options.messages] - Advisory feedback keyed by field path.
     */
    constructor(message = "Server feedback error", options = {}) {
        const { response, responseData, errors = {}, messages = {} } = options ?? {};
        super(message);
        this.name = "ServerFeedbackError";
        /**
         * The response object associated with the error.
         *
         * @type {Response}
         */
        this.response = response;
        /**
         * The data returned in the response. Decoded if JSON, otherwise a string.
         *
         * @type {object|string}
         */
        this.responseData = responseData;
        /**
         * Blocking feedback keyed by field path.
         *
         * @type {{[path: string]: string[]}}
         */
        this.errors = errors;
        /**
         * Advisory feedback keyed by field path.
         *
         * @type {{[path: string]: string[]}}
         */
        this.messages = messages;
    }
}

/**
 * Specific error class for responses interpreted as server form validation errors.
 *
 * @extends {ServerFeedbackError}
 */
export class FormValidationError extends ServerFeedbackError {
    /**
     * Creates an instance of FormValidationError.
     *
     * @param {object|string} responseData - The response data.
     * @param {Response} response - The response
     */
    constructor(responseData, response) {
        super("Form validation error", { response, responseData });
        this.name = "FormValidationError";
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

        const objectErrorPaths = this.extractObjectPaths(paths, ".detail");
        const stringErrorPaths = this.extractStringPaths(paths, objectErrorPaths);

        /**
         * Blocking feedback keyed by field path.
         *
         * @type {{[path: string]: string[]}}
         */
        this.errors = objectErrorPaths.concat(stringErrorPaths).reduce((acc, path) => {
            const normalizedPath = path.split("[").slice(0, -1).join("[");
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
 * @extends {ServerFeedbackError}
 */
export class ConfirmationRequiredError extends ServerFeedbackError {
    /**
     * @param {object} responseData - The decoded 409 body: `{ confirmation_required, digest, warnings }`.
     * @param {Response} response - The response object associated with the error.
     */
    constructor(responseData, response) {
        super("Confirmation required", { response, responseData });
        this.name = "ConfirmationRequiredError";
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
/**
 * Error used to abandon an in-flight authorization-dependent request whose response arrived after
 * the authenticated user changed. The response was fetched under a different principal, so it is
 * discarded instead of being cached, and the awaiting caller is rejected rather than handed
 * `undefined`.
 *
 * This error means "the request was abandoned, retry if you still need the data". It is not a
 * transport or permission failure, so consumers should neither surface it to the user nor cache it.
 *
 * @extends {Error}
 */
export class AuthScopeInvalidatedError extends Error {
    /**
     * Creates an instance of AuthScopeInvalidatedError.
     *
     * @param {string} messagePrefix - Identifies the action that abandoned the request.
     * @param {string} [key] - The cache key the abandoned response would have been written to.
     */
    constructor(messagePrefix, key) {
        super(`${messagePrefix}: abandoned${key ? ` "${key}"` : ""} because the authenticated user changed`);
        this.name = "AuthScopeInvalidatedError";
        /**
         * The cache key the abandoned response would have been written to.
         *
         * @type {string|undefined}
         */
        this.key = key;
    }
}
