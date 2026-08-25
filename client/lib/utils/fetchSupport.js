/**
 * @module utils/fetchSupport
 * @description Low-level fetch helper that decodes responses and wraps failures in typed errors.
 */
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { ConfirmationRequiredError, FetchError, FormValidationError } from "@vueda/utils/errors.js";

/**
 * Fetches a URL and returns the response.
 *
 * @param {Response} response - The object to convert.
 * @returns {Promise<{[key: string]: any}|string>} Either the JSON data or the text data.
 */
export async function getJsonOrText(response) {
    // we can't double consume the response body, so if we want text after, we need to get it first.
    let data = await response.text();
    try {
        data = JSON.parse(data);
    } catch (e) {
        if (!(e instanceof SyntaxError)) {
            throw e;
        }
    }
    return data;
}

/**
 * Builds the headers every model-action request shares.
 *
 * @param {object} [options={}] - The header options.
 * @param {boolean} [options.dryRun] - When true, sends the request in dry-run mode.
 * @param {string} [options.acknowledgeWarnings] - Warnings digest from a prior 409, sent so the server lets the gated
 *  request proceed.
 * @returns {{[key: string]: string}} The request headers.
 */
export function actionRequestHeaders({ dryRun, acknowledgeWarnings } = {}) {
    const headers = {
        "X-CSRFToken": getCSRFValue(),
        "Content-Type": "application/json",
    };
    if (dryRun) {
        headers["Dry-Run"] = "true";
    }
    if (acknowledgeWarnings) {
        headers["Acknowledge-Warnings"] = acknowledgeWarnings;
    }
    return headers;
}

/**
 * Classifies a model-action response the way every VUEDA action CRUD handler does: a 400 carries field errors, a 409
 * carries warnings the operator has not acknowledged, and anything else outside the success set is a fetch failure.
 *
 * @param {Response} response - The response to classify.
 * @param {object} options - The classification options.
 * @param {string} options.messagePrefix - The message used when the response is a plain failure.
 * @param {Set<number>} [options.successStatuses] - Statuses that count as success. Defaults to every `response.ok`
 *  status; pass a set to hold a handler to specific codes (delete accepts only 204, plus 200 during a dry run).
 * @param {Set<number>} [options.emptyStatuses=new Set([204])] - Success statuses whose body is not read back to the caller.
 * @returns {Promise<{[key: string]: any}|string|undefined>} The decoded response data, or undefined for an empty status.
 * @throws {import("@vueda/utils/errors.js").FormValidationError} On a 400.
 * @throws {import("@vueda/utils/errors.js").ConfirmationRequiredError} On a 409.
 * @throws {import("@vueda/utils/errors.js").FetchError} On any other unsuccessful status.
 */
export async function readActionResponse(response, { messagePrefix, successStatuses, emptyStatuses = new Set([204]) }) {
    const responseData = await getJsonOrText(response);
    if (response.status === 400) {
        throw new FormValidationError(responseData, response);
    }
    if (response.status === 409) {
        throw new ConfirmationRequiredError(responseData, response);
    }
    const succeeded = successStatuses ? successStatuses.has(response.status) : response.ok;
    if (!succeeded) {
        throw new FetchError(messagePrefix, response, responseData);
    }
    return emptyStatuses.has(response.status) ? undefined : responseData;
}

/**
 * A Promise that can be cancelled.
 *
 * @typedef {Promise<any> & { cancel: () => Promise<void>|void }} CancellablePromise
 * future: webstorm doesn't understand import("@arrai-innovations/reactive-helpers/use/cancellableIntent.js").CancellablePromise
 *  so we are copying the type definition here
 */

/**
 * A Promise that might be able to be cancelled.
 *
 * @typedef {Promise<any> & { cancel?: () => Promise<void>|void }} MaybeCancellablePromise
 */

/**
 * Fetches a URL and returns the response.
 *
 * @param {string} url - The URL to fetch.
 * @param {object} [options={}] - The fetch options.
 * @param {string} messagePrefix - The error message prefix.
 * @param {import("@vueda/utils/errors.js").FetchError} [ErrorClass=FetchError] - The error class to throw.
 * @param {Set<number>} [emptyResponseCodes=new Set([204])] - The response codes that are considered empty.
 * @param {*} [emptyResponseValue=undefined] - The value to return if the response is empty.
 * @param {(response: Response, data: any) => Error} [errorResolver] - Custom error factory; defaults to constructing ErrorClass.
 * @returns {CancellablePromise<{[key: string]: any}|string|[emptyResponseValue: any]>} The response data.
 * @throws {import("@vueda/utils/errors.js").FetchError} If the fetch fails, in a way that is not an empty response.
 */
export const fetchHelper = (
    url,
    options = {},
    messagePrefix,
    ErrorClass = FetchError,
    emptyResponseCodes = new Set([204]),
    emptyResponseValue = undefined,
    errorResolver = undefined,
) => {
    const controller = new AbortController();
    if (!errorResolver) {
        errorResolver = (response, data) =>
            ErrorClass.prototype instanceof Error
                ? new ErrorClass(messagePrefix, response, data)
                : ErrorClass(messagePrefix, response, data);
    }

    const promise = new Promise((resolve, reject) => {
        fetch(url, {
            ...options,
            credentials: "include",
            signal: controller.signal,
        })
            .then(async (response) => {
                if (response.ok && emptyResponseCodes.has(response.status)) {
                    resolve(emptyResponseValue);
                    return;
                }

                const responseData = await getJsonOrText(response);
                if (!response.ok) {
                    if (emptyResponseCodes.has(response.status) && emptyResponseValue !== undefined) {
                        resolve(emptyResponseValue);
                    } else {
                        reject(errorResolver(response, responseData));
                    }
                } else {
                    resolve(responseData);
                }
            })
            .catch((error) => {
                // AbortError can be handled separately if desired.
                reject(
                    ErrorClass.prototype instanceof Error
                        ? new ErrorClass(messagePrefix, error, {})
                        : ErrorClass(messagePrefix, error, {}),
                );
            });
    });

    // Attach a cancel method to the returned promise.
    promise.cancel = () => {
        controller.abort();
    };

    return promise;
};
