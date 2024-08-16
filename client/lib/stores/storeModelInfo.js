import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { FetchError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";

/**
 * An error for use in the model info store.
 * Extends the FetchError class to include additional context for model information errors.
 *
 * @extends {FetchError}
 */
export class ModelInfoError extends FetchError {
    /**
     * Creates an instance of ModelInfoError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response, could be an object or a string.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "ModelInfoError";
    }
}

const modelInfoUrl = ({ app, model }) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfo")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;

/**
 * A function to convert snake_case properties deeply on an object to be camelCase.
 *
 * @param {object} obj - The object to convert.
 * @param {string[]} [skipKeys=[]] - An array of keys to skip when converting.
 * @returns {object} The object with all snake_case properties converted to camelCase, except for the specified keys.
 * @private
 */
const camelCaseObject = (obj, skipKeys = []) => {
    if (typeof obj !== "object" || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => camelCaseObject(item, skipKeys));
    }
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => {
            // Skip conversion if the key is in skipKeys
            if (skipKeys.includes(k)) {
                return [k, v];
            }

            const newKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            return [newKey, camelCaseObject(v, skipKeys)];
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
 * @property {number} [maxValue] - The maximum value for the field.
 * @property {number} [minValue] - The minimum value for the field.
 * @property {number} [maxLength] - The maximum length for the field.
 * @property {number} [minLength] - The minimum length for the field.
 * @property {number} [maxDigits] - The maximum number of digits for the field.
 * @property {number} [decimalPlaces] - The number of decimal places for the field.
 * @property {boolean|LabelValuePair[]} [choices] - Indicates whether the field has choices. If it does, it's an array of label/value pairs.
 * @property {boolean} [pk] - Indicates whether the field is a primary key.
 */

/**
 * An action information item.
 *
 * @typedef {object} ActionInfo
 * @property {string} name - The name of the action.
 * @property {string} description - The description of the action.
 * @property {boolean} detail - A boolean indicating whether the action is a detail view.
 * @property {boolean} bulk - A boolean indicating whether the action is a bulk action.
 * @property {string[]} methodNames - An array of HTTP methods (e.g., GET, POST) for the action.
 * @property {string[]} [parameters] - An optional array of string parameters required for the action, typically primary keys.
 */

/**
 * An expand information item.
 *
 * @typedef {object} ExpandInfo
 * @property {string} name - The name of the expand field.
 * @property {string[]} [fields] - An optional array of fields that can be expanded.
 * @property {{[fieldName: string]: FieldInfo}} [f] - A mapping of field names to FieldInfo objects for the expanded model.
 */

/**
 * An ordering information item.
 *
 * @typedef {object} OrderInfo
 * @property {string} name - The name of the ordering field.
 * @property {string} type - The type of the ordering field (e.g., "alpha", "numeric", "boolean", "date").
 */

/**
 * @typedef {(
 *     "exact"|"iexact"|"contains"|"icontains"|"gt"|"gte"|"lt"|"lte"|"in"|"startswith"|
 *     "istartswith"|"endswith"|"iendswith"|"range"|"isnull"|"search"|"regex"|"iregex"
 * )} LookupExpr
 */

/**
 * @typedef {[label:string, value:string]} LabelValuePair
 */

/**
 * A filter information object.
 *
 * @typedef {object} FilterInfo
 *
 * Basic filter information.
 * @property {string} label - The label of the filter.
 * @property {string} fieldClass - The django-filters FilterField class for the filter.
 * @property {string} inputType - The django-filters determined HTML input type for the filter, derived from the widget associated with the field.
 * @property {string} [helpText] - The help text for the filter, may be absent.
 * @property {boolean} hidden - Indicates whether the filter is hidden.
 * @property {boolean} required - Indicates whether the filter is required.
 * @property {boolean|LabelValuePair[]} [choices] - Indicates whether the filter has choices. If it does, it's an array of label/value pairs.
 *
 * Validation and constraints.
 * @property {number} [maxValue] - The maximum value for the filter.
 * @property {number} [minValue] - The minimum value for the filter.
 * @property {number} [maxLength] - The maximum length for the filter.
 * @property {number} [minLength] - The minimum length for the filter.
 * @property {number} [maxDigits] - The maximum number of digits for the filter.
 * @property {number} [decimalPlaces] - The number of decimal places for the filter.
 * @property {string[]} [inputFormats] - The input formats for the filter, such as date formats, if applicable.
 * @property {object[]} [validators] - Array of validator objects applied to the filter.
 *
 * Error handling.
 * @property {{[code: string]: string}} errorMessages - A map of server-side error codes to their corresponding messages.
 *
 * Lookup expressions.
 * @property {LookupExpr[]} lookupExprs - The Django filter lookup expressions available for the filter.
 * @property {string[]} [nameSuffixes] - The Django filter name suffixes for the filter.
 *
 * Associations and relationships.
 * @property {string} [model] - The model associated with the filter.
 * @property {string} [appLabel] - The app label associated with the filter.
 * @property {string} [filterName] - The Django filter name for the filter.
 * @property {string} [filtersetName] - The Django filter set name for the filter.
 *
 * Labels and special values.
 * @property {boolean} [emptyValue] - Indicates whether the filter has an empty value.
 * @property {string} [emptyLabel] - The empty label for the filter.
 * @property {string} [nullLabel] - The null label for the filter.
 * @property {string} [nullValue] - The null value for the filter.
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
 * @property {string} verboseName - The verbose name of the model.
 * @property {string} verboseNamePlural - The verbose name plural of the model.
 * @property {string} pk - The primary key field of the model.
 * @property {{[fieldName:string]: FieldInfo}} fields - The fields of the model, with the field name as the key.
 * @property {ActionInfo[]} actions - The actions of the model.
 * @property {ExpandInfo[]} expands - The expands of the model.
 * @property {OrderInfo[]} ordering - The ordering of the model.
 * @property {{[filterName: string]: FilterInfo}} filtering - The filtering of the model.
 * @property {PermissionInfo[]} permissions - The permissions of the model.
 */

/**
 * Fetches the model information for the given app and model.
 * If the information is already cached in `infos`, it returns it directly.
 * Otherwise, it fetches from the server and caches the result.
 *
 * @function FetchModelInfo
 * @param {object} args - The arguments for fetching model info.
 * @param {string} args.app - The app label for the model.
 * @param {string} args.model - The model name.
 * @returns {Promise<ModelInfo>} A promise that resolves to the model information.
 * @throws {ModelInfoError} Throws an error if the fetch operation fails.
 */

/**
 * A store for model information.
 *
 * @returns {import('pinia').Store<{
 *     infos: {[key: string]: ModelInfo},
 *     promises: {[key: string]: Promise<ModelInfo>},
 *     fetchModelInfo: FetchModelInfo
 * }>}
 */
export const storeModelInfo = defineStore({
    id: "modelInfo",
    state: () => ({
        infos: {},
        promises: {},
    }),
    actions: {
        async fetchModelInfo(args) {
            if (!args.app || !args.model) {
                throw new Error("storeModelInfo.fetchModelInfo: app and model must be provided");
            }
            const key = getAppModelDotName(args);
            const existing = this.infos[key];
            if (existing) {
                return existing;
            }
            if (!this.promises[key]) {
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
                this.promises[key] = fetchHelper(
                    // @ts-ignore - URLSearchParams is fine with object with a values of an array of strings.
                    //  it includes the key multiple times, as we intend.
                    modelInfoUrl(args) + `?${new URLSearchParams(retrieveArgs).toString()}`,
                    {
                        method: "GET",
                    },
                    "Failed to fetch model info",
                    ModelInfoError,
                )
                    // server is serving all the expands as model_ to avoid server side conflicts
                    // that is just noise client side, so we'll clean it up here
                    .then(
                        (data) =>
                            (this.infos[key] = Object.fromEntries(
                                Object.entries(data).map(([k, v]) => {
                                    let key = k;
                                    if (key.startsWith("model_")) {
                                        key = k.slice(6);
                                    }
                                    // don't mash up key names, skip a level
                                    if (key === "fields" || key === "filtering") {
                                        return [
                                            key,
                                            Object.fromEntries(
                                                Object.entries(v).map(([k, v]) => [k, camelCaseObject(v)]),
                                            ),
                                        ];
                                    }
                                    if (key === "expands") {
                                        // expands.f is also a mapping of field names to FieldInfo objects
                                        return [
                                            key,
                                            v.map((expand) => ({
                                                ...expand,
                                                f: expand.f
                                                    ? Object.fromEntries(
                                                          Object.entries(expand.f).map(([k, v]) => [
                                                              k,
                                                              camelCaseObject(v),
                                                          ]),
                                                      )
                                                    : undefined,
                                            })),
                                        ];
                                    }
                                    return [key, camelCaseObject(v)];
                                }),
                            )),
                    )
                    .then((data) => {
                        // another piece of cleanup, find the pk field and add its name to the top level
                        Object.entries(data.fields).some(([k, v]) => {
                            if (v.pk) {
                                data.pk = k;
                                return true;
                            }
                        });
                        if (!data.pk) {
                            throw new Error(`storeModelInfo.fetchModelInfo: no pk field found for ${key}`);
                        }
                        return data;
                    })
                    .finally(() => {
                        delete this.promises[key];
                    });
            }

            return this.promises[key];
        },
    },
});
