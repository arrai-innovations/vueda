/**
 * @module stores/storeModelChoices
 * @description Pinia store for fetching and caching field-level choice lists for Django model fields and filters.
 */
import { trimReactiveObject } from "@arrai-innovations/reactive-helpers";
import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { PAGE_SIZE_PARAM } from "@vueda/utils/constants.js";
import { AuthScopeInvalidatedError, FetchError } from "@vueda/utils/errors.js";
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

// The server routes carry a trailing slash; omitting it before the query string
// makes Django's APPEND_SLASH answer with a 301 redirect (an extra round-trip per
// fetch), so build the canonical slash-terminated path directly.
const modelChoicesUrl = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${memoizedSnakeCase(field)}/?${PAGE_SIZE_PARAM}=200`;

const modelFilterChoicesUrl = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoFilterChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${field}/?${PAGE_SIZE_PARAM}=200`;

/**
 * Empty a two-level store container in place, leaves first.
 *
 * `useModelChoices` holds a `toRef` handle into `choices[appModelKey]`, so the field keys are deleted
 * before the key that holds the per-model object. Neither container is ever replaced.
 *
 * @param {{[key: string]: object}} container
 * @returns {void}
 * @private
 */
const clearNestedContainer = (container) => {
    for (const key of Object.keys(container)) {
        trimReactiveObject(container[key], {});
    }
    trimReactiveObject(container, {});
};

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
        /**
         * Incremented by `clearAuthScoped`. Fetches capture it before issuing and discard their
         * response if it changed while the request was in flight.
         *
         * @type {number}
         */
        authScopeGeneration: 0,
    }),
    actions: {
        /**
         * Drops every cached choice list, because choices are row-level filtered for the
         * authenticated user.
         *
         * This includes lists an integrator seeded through `setChoices` or `setFilterChoices`: the
         * state shape does not record where a list came from, so seeded and fetched entries clear
         * together.
         *
         * Keys are deleted in place, leaves first, so `toRef` handles consumers hold keep reading the
         * live containers. Never replace a container here (that is what `$reset` does, and it detaches
         * every held handle).
         *
         * @returns {void}
         */
        clearAuthScoped() {
            this.authScopeGeneration += 1;
            clearNestedContainer(this.choices);
            clearNestedContainer(this.filterChoices);
            clearNestedContainer(this.promises);
            clearNestedContainer(this.filterPromises);
        },
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
            const generation = this.authScopeGeneration;
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
                const data = await (this.filterPromises[key][field] = fetchHelper(
                    modelFilterChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    `Failed to fetch choices for ${key}.${field}`,
                    ModelChoicesError,
                ));
                if (this.authScopeGeneration !== generation) {
                    // the authenticated user changed while this was in flight: these choices were
                    // filtered for the previous principal, so they must not be cached or returned.
                    throw new AuthScopeInvalidatedError("storeModelChoices.fetchFilterChoices", `${key}.${field}`);
                }
                return (this.filterChoices[key][field] = data);
            } finally {
                if (this.authScopeGeneration === generation) {
                    // a changed generation means `clearAuthScoped` already removed the bucket this
                    // entry lived in.
                    delete this.filterPromises[key][field];
                }
            }
        },
        async fetchChoices(app, model, field) {
            const key = getAppModelDotName({ app, model });
            const generation = this.authScopeGeneration;
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
                const data = await (this.promises[key][field] = fetchHelper(
                    modelChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    `Failed to fetch choices for ${key}.${field}`,
                    ModelChoicesError,
                ));
                if (this.authScopeGeneration !== generation) {
                    // the authenticated user changed while this was in flight: these choices were
                    // filtered for the previous principal, so they must not be cached or returned.
                    throw new AuthScopeInvalidatedError("storeModelChoices.fetchChoices", `${key}.${field}`);
                }
                return (this.choices[key][field] = data);
            } finally {
                if (this.authScopeGeneration === generation) {
                    // a changed generation means `clearAuthScoped` already removed the bucket this
                    // entry lived in.
                    delete this.promises[key][field];
                }
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
