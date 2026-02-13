import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { PAGE_SIZE_PARAM } from "@vueda/utils/constants.js";
import { FetchError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
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
    `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${memoizedSnakeCase(field)}?${PAGE_SIZE_PARAM}=200`;

const modelFilterChoicesUrl = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoFilterChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${field}?${PAGE_SIZE_PARAM}=200`;

/**
 * A store for lookup choices for a particular model field.
 *
 * @typedef {import('pinia').Store<{
 *     choices: { [appModelDotName: string]: { [fieldPath: string]: unknown } },
 *     filterChoices: { [appModelDotName: string]: { [fieldPath: string]: unknown } },
 *     promises: { [appModelDotName: string]: { [fieldPath: string]: Promise<unknown> } },
 *     filterPromises: { [appModelDotName: string]: { [fieldPath: string]: Promise<unknown> } },
 * }, {}, {}>} ModelChoicesStore
 */
export const storeModelChoices = defineStore("modelChoices", {
    state: () => ({
        choices: {},
        filterChoices: {},
        promises: {},
        filterPromises: {},
    }),
    actions: {
        setChoices(app, model, field, choices) {
            const key = getAppModelDotName({ app, model });
            if (!this.choices[key]) {
                this.choices[key] = {};
            }
            this.choices[key][field] = choices;
        },
        setFilterChoices(app, model, field, choices) {
            const key = getAppModelDotName({ app, model });
            if (!this.filterChoices[key]) {
                this.filterChoices[key] = {};
            }
            this.filterChoices[key][field] = choices;
        },
        async fetchFilterChoices(app, model, field) {
            const key = getAppModelDotName({ app, model });
            if (!this.filterPromises[key]) {
                this.filterPromises[key] = {};
            }
            if (!this.filterChoices[key]) {
                this.filterChoices[key] = {};
            }
            if (!this.filterChoices[key][field]) {
                this.filterChoices[key][field] = {};
            }
            if (this.filterPromises[key][field]) {
                return this.filterPromises[key][field];
            }
            try {
                return (this.filterChoices[key][field] = await (this.filterPromises[key][field] = fetchHelper(
                    modelFilterChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    `Failed to fetch choices for ${key}.${field}`,
                    ModelChoicesError,
                )));
            } finally {
                delete this.filterPromises[key][field];
            }
        },
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
        initializeChoice(app, model, isFilter = false) {
            const key = getAppModelDotName({ app, model });
            if (!this.choices[key] && !isFilter) {
                this.choices[key] = {};
            }
            if (!this.filterChoices[key] && isFilter) {
                this.filterChoices[key] = {};
            }
        },
    },
});
