import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";

/**
 * An error for use from the model info store.
 * @extends {FetchError}
 */
export class ModelInfoError extends FetchError {
    /**
     * Creates an instance of ModelInfoError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "ModelInfoError";
    }
}

/**
 * Fetch an url with options and handle.
 *
 * @param {string} url - The url to fetch.
 * @param {object} [options] - The fetch
 * @param {string} [messagePrefix] - The prefix for error messages.
 * @returns {Promise<object>} The response data.
 * @private
 */
const fetchHelper = async (url, options = {}, messagePrefix) => {
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
        throw new ModelInfoError(messagePrefix, error, {});
    }
    const responseData = await getJsonOrText(response);
    if (!response.ok) {
        throw new ModelInfoError(messagePrefix, response, responseData);
    }
    return responseData;
};

const modelInfoUrl = (app, model) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfo")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;

const modelInfoChoicesUrl = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${memoizedSnakeCase(field)}`;

/**
 * A function to convert snake_case properties deeply on an object to be camelCase.
 *
 * @param {object} obj - The object to convert.
 * @returns {object} The object with all snake_case properties converted to camelCase.
 * @private
 */
const camelCaseObject = (obj) => {
    if (typeof obj !== "object" || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(camelCaseObject);
    }
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => {
            const newKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            return [newKey, camelCaseObject(v)];
        }),
    );
};

/**
 * An information item on a field.
 *
 * @typedef {object} FieldInfo
 * @property {string} name - The name of the field.
 * @property {string} label - The label of the field.
 * @property {string} type - The type of the field.
 * @property {boolean} many - A boolean indicating whether the field is a `ListField`.
 * @property {boolean} readOnly - A boolean indicating whether the field is read-only.
 * @property {boolean} required - A boolean indicating whether the field is required.
 * @property {string} helpText - The help text for the field.
 * @property {number} maxValue - The maximum value for the field.
 * @property {number} minValue - The minimum value for the field.
 * @property {number} maxLength - The maximum length for the field.
 * @property {number} minLength - The minimum length for the field.
 * @property {number} maxDigits - The maximum number of digits for the field.
 * @property {number} decimalPlaces - The number of decimal places for the field.
 * @property {{label: string, value: string}[]} choices - The choices for the field.
 */

/**
 * An action information item.
 *
 * @typedef {object} ActionInfo
 * @property {string} name - The name of the action.
 * @property {string} description - The description of the action.
 * @property {boolean} detail - A boolean indicating whether the action is a detail view.
 * @property {string[]} methodNames - An array of HTTP methods (e.g., GET, POST) for the action.
 * @property {{name: string, type: string}[]} parameters - An optional array of parameters required for the action.
 */

/**
 * An expand information item.
 *
 * @typedef {object} ExpandInfo
 * @property {string} name - The name of the expand field.
 * @property {string[]} fields - An optional array of fields that can be expanded.
 */

/**
 * An ordering information item.
 *
 * @typedef {object} OrderInfo
 * @property {string} name - The name of the ordering field.
 * @property {string} type - The type of the ordering field (e.g., "alpha", "numeric").
 */

/**
 * @typedef {(
 *     "exact"|"iexact"|"contains"|"icontains"|"gt"|"gte"|"lt"|"lte"|"in"|"startswith"|
 *     "istartswith"|"endswith"|"iendswith"|"range"|"isnull"|"search"|"regex"|"iregex"
 * )} LookupExpr
 */

/**
 * A filter information item.
 *
 * @typedef {object} FilterInfoItem
 * @property {string} label - The label of the filter.
 * @property {boolean} required - A boolean indicating whether the filter is required.
 * @property {LookupExpr[]} lookupExprs - An array of django lookup expressions for the filter.
 */

/**
 * A filter information.
 *
 * @typedef {object} FilterInfo
 * @property {string} name - The name of the filtering field.
 * @property {(
 *     'alpha'|'boolean'|'date'|'datetime'|'numeric'|'time'
 * )} type - The type of the filtering field (e.g., "alpha", "numeric").
 * @property {FilterInfoItem[]} filters - An array of available filters for the field.
 */

/**
 * A permission information item.
 *
 * @typedef {object} PermissionInfo
 * @property {string} codename - The codename of the permission.
 * @property {string} name - The name of the permission.
 */

/**
 * The information provided on a django model, including fields, actions, expands, ordering, filtering, and permissions.
 *
 * @typedef {object} ModelInfo
 * @property {string} app_label - The app label of the model.
 * @property {string} model - The python model class name (lower case).
 * @property {string} verbose_name - The verbose name of the model.
 * @property {string} verbose_name_plural - The verbose name plural of the model.
 * @property {FieldInfo[]} fields - The fields of the model.
 * @property {ActionInfo[]} actions - The actions of the model.
 * @property {ExpandInfo[]} expands - The expands of the model.
 * @property {OrderInfo[]} ordering - The ordering of the model.
 * @property {FilterInfo[]} filtering - The filtering of the model.
 * @property {PermissionInfo[]} permissions - The permissions of the model.
 */

/**
 * A store for model information.
 *
 * @returns {import('pinia').Store<{
 *     modelInfos: {[key: string]: ModelInfo},
 *     existingPromises: {[key: string]: Promise<ModelInfo>},
 *     fetchModelInfo: (app: string, model: string) => Promise<ModelInfo>
 * }>}
 */
export const storeModelInfo = defineStore({
    id: "modelInfo",
    state: () => ({
        modelInfos: {},
        existingPromises: {},
        fieldChoices: {},
        fieldChoicePromises: {},
    }),
    actions: {
        async fetchModelInfo(app, model) {
            const key = getAppModelDotName({ app, model });
            const existing = this.modelInfos[key];
            if (existing) {
                return existing;
            }
            if (!this.existingPromises[key]) {
                const retrieveArgs = {
                    f: [
                        "app_label",
                        "model",
                        "verbose_name",
                        "verbose_name_plural",
                        "model_fields",
                        "model_actions",
                        "model_expands",
                        "model_ordering",
                        "model_filtering",
                        "model_permissions",
                    ],
                    e: [
                        "model_fields",
                        "model_actions",
                        "model_expands",
                        "model_ordering",
                        "model_filtering",
                        "model_permissions",
                    ],
                };
                this.existingPromises[key] = fetchHelper(
                    // @ts-ignore - URLSearchParams is fine with object with a values of an array of strings.
                    //  it includes the key multiple times, as we intend.
                    modelInfoUrl(app, model) + `?${new URLSearchParams(retrieveArgs).toString()}`,
                    {
                        method: "GET",
                    },
                    "Failed to fetch model info",
                )
                    .then((data) => {
                        // server is serving all the expands as model_ to avoid server side conflicts
                        // that is just noise client side, so we'll clean it up here
                        this.modelInfos[key] = Object.fromEntries(
                            Object.entries(data).map(([k, v]) => {
                                const cV = camelCaseObject(v);
                                let key = k;
                                if (key.startsWith("model_")) {
                                    key = k.slice(6);
                                }
                                if (key === "fields") {
                                    return [key, v];
                                }
                                return [key, cV];
                            }),
                        );
                        return this.modelInfos[key];
                    })
                    .finally(() => {
                        delete this.existingPromises[key];
                    });
            }

            return this.existingPromises[key];
        },
        async fetchFieldChoices(app, model, field) {
            const key = getAppModelDotName({ app, model });

            if (!this.fieldChoicePromises[key]) {
                this.fieldChoicePromises[key] = {};
            }

            if (!this.fieldChoicePromises[key][field]) {
                if (!this.fieldChoices[key]) {
                    this.fieldChoices[key] = {};
                }

                this.fieldChoicePromises[key][field] = fetchHelper(
                    modelInfoChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    "Failed to fetch field choices",
                )
                    .then((data) => {
                        this.fieldChoices[key][field] = data;
                    })
                    .finally(() => {
                        delete this.fieldChoicePromises[key][field];
                    });
            }

            return this.fieldChoicePromises[key][field];
        },
    },
});
