import { FetchError } from "@vueda/utils/errors.js";

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
 * @param {import("@vueda/utils/errors.js").FetchError} [errorClass=FetchError] - The error class to throw.
 * @param {Set<number>} [emptyResponseCodes=new Set([204])] - The response codes that are considered empty.
 * @param {*} [emptyResponseValue=undefined] - The value to return if the response is empty.
 * @returns {CancellablePromise<{[key: string]: any}|string|[emptyResponseValue: any]>} The response data.
 * @throws {import("@vueda/utils/errors.js").FetchError} If the fetch fails, in a way that is not an empty response.
 */
export const fetchHelper = (
    url,
    options = {},
    messagePrefix,
    errorClass = FetchError,
    emptyResponseCodes = new Set([204]),
    emptyResponseValue = undefined,
    errorResolver = undefined,
) => {
    const controller = new AbortController();
    if (!errorResolver) {
        errorResolver = (response, data) =>
            errorClass.prototype instanceof Error
                ? new errorClass(messagePrefix, response, data)
                : errorClass(messagePrefix, response, data);
    }

    const promise = new Promise((resolve, reject) => {
        fetch(url, {
            ...options,
            credentials: "include",
            signal: controller.signal,
        })
            .then(async (response) => {
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
                    errorClass.prototype instanceof Error
                        ? new errorClass(messagePrefix, error, {})
                        : errorClass(messagePrefix, error, {}),
                );
            });
    });

    // Attach a cancel method to the returned promise.
    promise.cancel = () => {
        controller.abort();
    };

    return promise;
};
