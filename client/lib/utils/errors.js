import { flattenPaths } from "@arrai-innovations/reactive-helpers";
import get from "lodash-es/get.js";
import isArray from "lodash-es/isArray.js";
import zipObject from "lodash-es/zipObject.js";

/**
 * FormValidationError - error class for form validation errors
 * @param responseData - response data
 * @param response - fetch response
 * @constructor
 * @extends {Error}
 * @property {Response} response - fetch response
 * @property {Object} responseData - response data
 * @property {Object} messages - error messages
 * @property {Object} serverStack - server stack trace
 */
export class FormValidationError extends Error {
    constructor(responseData, response) {
        super("Form validation error");
        this.name = "FormValidationError";
        this.response = response;
        this.responseData = responseData;
        const data = { ...responseData };
        if ("serverStack" in data) {
            this.serverStack = data.serverStack;
            delete data.serverStack;
        }
        const paths = flattenPaths(data);
        this.messages = zipObject(
            paths.map((path) => path.split("[").slice(0, -1).join("[")),
            paths.map((path) => get(data, path)),
        );
    }
}

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

export class UnhandledResponseError extends Error {
    constructor(messagePrefix, response, responseData) {
        const message = `${messagePrefix}: ${response.status} ${response.statusText}`;
        super(message);
        this.name = "UnhandledResponseError";
        this.response = response;
        this.responseData = responseData;
    }
}
