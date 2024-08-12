import { getCSRFValue } from "@vueda/utils/csrf.js";
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
 * Fetches a URL and returns the response.
 *
 * @param {string} url - The URL to fetch.
 * @param {object} [options={}] - The fetch options.
 * @param {string} messagePrefix - The error message prefix.
 * @param {import("@vueda/utils/errors.js").FetchError} [errorClass=FetchError] - The error class to throw.
 * @param {Set<number>} [emptyResponseCodes=new Set([204])] - The response codes that are considered empty.
 * @param {*} [emptyResponseValue=undefined] - The value to return if the response is empty.
 * @returns {Promise<{[key: string]: any}|string|[emptyResponseValue: any]>} The response data.
 * @throws {import("@vueda/utils/errors.js").FetchError} If the fetch fails, in a way that is not an empty response.
 */
export const fetchHelper = async (
    url,
    options = {},
    messagePrefix,
    errorClass = FetchError,
    emptyResponseCodes = new Set([204]),
    emptyResponseValue = undefined,
) => {
    const defaultHeaders = {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFValue(),
    };
    const headers = { ...defaultHeaders, ...options.headers };
    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
        });
    } catch (error) {
        throw new errorClass(messagePrefix, error, {});
    }
    const responseData = await getJsonOrText(response);
    if (!response.ok) {
        if (emptyResponseCodes.has(response.status) && emptyResponseValue !== undefined) {
            return emptyResponseValue;
        }
        throw new errorClass(messagePrefix, response, responseData);
    }
    return responseData;
};
