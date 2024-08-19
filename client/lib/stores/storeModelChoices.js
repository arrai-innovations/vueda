import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { FetchError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";

/**
 * An error for use from the model info store.
 * @extends {FetchError}
 */
export class ModelChoicesError extends FetchError {
    /**
     * Creates an instance of ModelChoicesError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "ModelChoicesError";
    }
}

const modelChoicesUrl = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${memoizedSnakeCase(field)}`;

/**
 * A store for lookup choices for a particular model field.
 *
 * @typedef {import('pinia').store<{
 *     choices: {
 *        [appModelDotName: string]: {
 *            [fieldPath: string]: {
 *
 *            },
 *        },
 *     },
 *     promises: {
 *         [appModelDotName: string]: {
 *             [fieldPath: string]: {
 *
 *             },
 *         },
 *     }
 *
 * }>}
 */
export const storeModelChoices = defineStore({
    id: "modelChoices",
    state: () => ({
        choices: {},
        promises: {},
    }),
    actions: {
        async fetchChoices(app, model, field) {
            const key = getAppModelDotName({ app, model });
            // we don't return the choices if they are already being fetched.
            // you probably want to get fresh choices.
            // this just prevents duplicate requests.
            if (!this.promises[key]) {
                this.promises[key] = {};
            }
            if (!this.choices[key]) {
                this.choices[key] = {};
            }
            if (!this.choices[key][field]) {
                this.choices[key][field] = {};
            }
            if (this.promises[key][field]) {
                return this.promises[key][field];
            }
            try {
                return (this.choices[key][field] = await (this.promises[key][field] = fetchHelper(
                    modelChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    `Failed to fetch choices for ${key}.${field}`,
                    ModelChoicesError,
                )));
            } finally {
                delete this.promises[key][field];
            }
        },
        initializeChoice(app, model) {
            const key = getAppModelDotName({ app, model });
            if (!this.choices[key]) {
                this.choices[key] = {};
            }
        },
    },
});
