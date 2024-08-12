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

const modelInfoUrl = ({ app, model }) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfo")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;

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
 * @typedef {[label:string, value:string]} LabelValuePair
 */

/**
 * A filter information object.
 *
 * @typedef {object} FilterInfo
 *
 * Basic filter information.
 * @property {string} label - The label of the filter.
 * @property {string} field_class - The django-filters FilterField class for the filter.
 * @property {string} input_type - The django-filters determined HTML input type for the filter, derived from the widget associated with the field.
 * @property {string} [help_text] - The help text for the filter, may be absent.
 * @property {boolean} hidden - Indicates whether the filter is hidden.
 * @property {boolean} required - Indicates whether the filter is required.
 * @property {boolean|LabelValuePair[]} choices - Indicates whether the filter has choices. If it does, it's an array of label/value pairs.
 *
 * Validation and constraints.
 * @property {number} [max_value] - The maximum value for the filter.
 * @property {number} [min_value] - The minimum value for the filter.
 * @property {number} [max_length] - The maximum length for the filter.
 * @property {number} [min_length] - The minimum length for the filter.
 * @property {number} [max_digits] - The maximum number of digits for the filter.
 * @property {number} [decimal_places] - The number of decimal places for the filter.
 * @property {string[]} [input_formats] - The input formats for the filter.
 * @property {object[]} [validators] - Array of validator objects applied to the filter.
 *
 * Error handling.
 * @property {{[code: string]: string}} error_messages - A map of server-side error codes to their corresponding messages.
 *
 * Lookup expressions.
 * @property {LookupExpr[]} lookup_exprs - The Django filter lookup expressions available for the filter.
 * @property {string[]} [name_suffixes] - The Django filter name suffixes for the filter.
 *
 * Associations and relationships.
 * @property {string} [model] - The model associated with the filter.
 * @property {string} [app_label] - The app label associated with the filter.
 * @property {string} [filter_name] - The Django filter name for the filter.
 * @property {string} [filterset_name] - The Django filter set name for the filter.
 *
 * Labels and special values.
 * @property {boolean} [empty_value] - Indicates whether the filter has an empty value.
 * @property {string} [empty_label] - The empty label for the filter.
 * @property {string} [null_label] - The null label for the filter.
 * @property {string} [null_value] - The null value for the filter.
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
 * @property {{[fieldName:string]: FieldInfo}} fields - The fields of the model.
 * @property {ActionInfo[]} actions - The actions of the model.
 * @property {ExpandInfo[]} expands - The expands of the model.
 * @property {OrderInfo[]} ordering - The ordering of the model.
 * @property {{[filterName: string]: FilterInfo}} filtering - The filtering of the model.
 * @property {PermissionInfo[]} permissions - The permissions of the model.
 */

/**
 * A store for model information.
 *
 * @returns {import('pinia').Store<{
 *     infos: {[key: string]: ModelInfo},
 *     promises: {[key: string]: Promise<ModelInfo>},
 *     fetchModelInfo: (args: {app: string, model: string}) => Promise<ModelInfo>
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
                            )),
                    )
                    .finally(() => {
                        delete this.promises[key];
                    });
            }

            return this.promises[key];
        },
    },
});
