/**
 * @module stores/storeModelInfo
 * @description Pinia store and supporting types for fetching and caching Django model metadata from the server.
 */
import { trimReactiveObject } from "@arrai-innovations/reactive-helpers";
import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { AuthScopeInvalidatedError, FetchError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
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
 * @param {unknown} obj - The value to convert.
 * @param {string[]} [skipKeys=[]] - An array of keys to skip when converting.
 * @returns {unknown} The value with all snake_case object keys converted to camelCase, except for the specified keys.
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
 * @property {string} typeDb - The database type of the field.
 * @property {string} typeModel - The model type of the field.
 * @property {string} typeSerializer - The serializer type of the field.
 * @property {boolean} many - A boolean indicating whether the field is a `ListField` or relation with multiple entries.
 * @property {boolean} readOnly - A boolean indicating whether the field is read-only.
 * @property {boolean} required - A boolean indicating whether the field is required.
 * @property {string} [helpText] - The help text for the field.
 * @property {number} [maxValue] - The maximum value allowed for the field.
 * @property {number} [minValue] - The minimum value allowed for the field.
 * @property {number} [maxLength] - The maximum length allowed for the field (for strings).
 * @property {number} [minLength] - The minimum length allowed for the field (for strings).
 * @property {number} [maxDigits] - The maximum number of digits allowed for the field (for decimals).
 * @property {number} [decimalPlaces] - The number of decimal places allowed for the field (for decimals).
 * @property {boolean|LabelValuePair[]} [choices] - Indicates whether the field has choices. If it does, it's an array of label/value pairs.
 * @property {LabelValuePair[]} [displayChoices] - Read-only display labels for stored values. Does not affect editable choices.
 * @property {boolean} [pk] - Indicates whether the field is a primary key.
 * @property {boolean} [hidden] - Indicates whether the field is hidden in the UI.
 * @property {string[]} [lookupExprs] - Array of lookup expressions for filtering.
 * @property {string} [inputType] - The input type for the field (e.g., "text", "number").
 * @property {string[]} [inputFormats] - List of acceptable input formats for the field (e.g., date formats).
 * @property {string} [emptyLabel] - Label for an empty choice, if applicable.
 * @property {string|number} [emptyValue] - Value representing an empty selection, if applicable.
 * @property {string} [nullLabel] - Label for a null value, if applicable.
 * @property {string|number} [nullValue] - Value representing null, if applicable.
 * @property {string[]} [suffixes] - Suffixes for query parameters, if applicable.
 * @property {Array<{code: string, message: string}>} [validators] - Array of validators applied to the field.
 * @property {string} [appLabel] - The application label for model-based choices.
 * @property {string} [model] - The model name for model-based choices.
 * @property {string} [description] - A description of the field (useful for actions).
 */

/**
 * An action information item.
 *
 * @typedef {object} ActionInfo
 * @property {string} name - The name of the action.
 * @property {string} description - A detailed description of the action.
 * @property {boolean} detail - A boolean indicating whether the action applies to a detail view.
 * @property {boolean} bulk - A boolean indicating whether the action can be applied in bulk.
 * @property {string[]} methodNames - An array of HTTP methods (e.g., GET, POST) supported by the action.
 * @property {Array<{name: string, type: string, required: boolean, description?: string}>} [parameters] - A list of parameter objects for the action, including type and optional descriptions.
 * @property {string} [appLabel] - The app label associated with the action, if relevant.
 * @property {string} [model] - The model name the action applies to, if relevant.
 * @property {boolean} [confirm] - A boolean indicating if user confirmation is required before performing the action.
 */

/**
 * An expand information item.
 *
 * @typedef {object} ExpandInfo
 * @property {string} name - The name of the expand field.
 * @property {string[]} [fields] - An array of field names that can be expanded.
 * @property {{[fieldName: string]: FieldInfo}} [f] - A mapping of field names to their respective `FieldInfo` objects for the expanded model.
 * @property {string} [appLabel] - The app label of the expanded (related) model.
 * @property {string} [model] - The model name of the expanded (related) model.
 * @property {boolean} [requiresPermission] - Indicates whether expanding this field requires special permissions.
 * @property {string} [description] - A brief description of what the expanded field represents.
 * @property {string[]} [hidden] - Names of child fields to hide in this expansion.
 */

/**
 * An ordering information item.
 *
 * @typedef {object} OrderInfo
 * @property {string} name - The name of the ordering field.
 * @property {string} type - The type of the ordering field (e.g., "alpha", "numeric", "boolean", "date").
 * @property {boolean} [nullable] - Indicates whether the field can have null values.
 * @property {string} [direction] - The default sorting direction, either "asc" or "desc".
 * @property {string} [description] - A brief description of the ordering field.
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
 * @property {string} typeDb - The database type of the field.
 * @property {string} typeModel - The model type of the field.
 * @property {string} typeFilter - The filter type of the field.
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
 * @property {string[]} [suffixes] - The Django filter suffixes for the filter.
 *
 * Associations and relationships.
 * @property {string} [model] - The model associated with the filter.
 * @property {string} [appLabel] - The app label associated with the filter.
 * @property {string} [filterName] - The Django filter name for the filter.
 * @property {string} [filtersetName] - The Django filter set name for the filter.
 *
 * Labels and special values.
 * @property {string|number} [emptyValue] - Indicates whether the filter has an empty value.
 * @property {string} [emptyLabel] - The empty label for the filter.
 * @property {string} [nullLabel] - The null label for the filter.
 * @property {string} [nullValue] - The null value for the filter.
 *
 * Additional metadata.
 * @property {string} [description] - A brief description of the filter's functionality.
 * @property {string[]} [tags] - Optional tags for categorizing or grouping filters.
 * @property {boolean} [nullable] - Indicates whether the filter accepts `null` values.
 */

/**
 * A permission information item.
 *
 * @typedef {object} PermissionInfo
 * @property {string} codename - The codename of the permission.
 * @property {string} name - The human-readable name of the permission.
 * @property {string} [appLabel] - The app label associated with the permission (e.g., "auth").
 * @property {string} [model] - The model associated with the permission, if applicable.
 * @property {string} [description] - A brief description of what the permission allows.
 * @property {boolean} [global] - Indicates whether the permission applies globally or is scoped to specific objects.
 */

/**
 * The information provided on a Django model, including fields, actions, expand, ordering, filtering, and permissions.
 *
 * @typedef {object} ModelInfo
 * @property {string} appLabel - The app label of the model (e.g., "auth").
 * @property {string} model - The Python model class name in lowercase (e.g., "user").
 * @property {string} verboseName - The human-readable, singular name of the model.
 * @property {string} verboseNamePlural - The human-readable, plural name of the model.
 * @property {string} pk - The primary key field of the model.
 * @property {{[fieldName: string]: FieldInfo}} fields - A mapping of field names to their respective `FieldInfo` objects.
 * @property {ActionInfo[]} actions - The actions that can be performed on the model.
 * @property {ExpandInfo[]} expand - The expandable fields of the model.
 * @property {OrderInfo[]} ordering - The fields available for ordering the model.
 * @property {{[filterName: string]: FilterInfo}} filtering - The fields available for filtering the model.
 * @property {PermissionInfo[]} permissions - The permissions available for the model.
 * @property {string[]} [methods] - The HTTP methods supported by the model (e.g., ["GET", "POST"]).
 * @property {string[]} [requiredFields] - A list of field names that are required for creating or updating the model.
 * @property {string} [description] - A brief description of the model's purpose.
 * @property {boolean} [readOnly] - Indicates if the model is read-only.
 * @property {boolean} [abstract] - Indicates if the model is abstract and not directly instantiable.
 * @property {string} [defaultOrdering] - The default ordering for the model (e.g., "name ASC").
 */

/**
 * Fetches the model information for the given app and model.
 * If the information is already cached in `infos`, it returns it directly.
 * Otherwise, it fetches from the server and caches the result.
 *
 * @function FetchModelInfo
 * @param {{ app: string, model: string }} args - The arguments for fetching model info.
 * @returns {import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<ModelInfo>} A promise that resolves to the model information.
 * @throws {ModelInfoError} Throws an error if the fetch operation fails.
 */

/**
 * A store for model information.
 *
 * @returns {import('pinia').Store<{
 *     infos: {[key: string]: ModelInfo},
 *     promises: {[key: string]: import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<ModelInfo>},
 *     fetchModelInfo: FetchModelInfo
 * }>}
 */
export const storeModelInfo = defineStore("modelInfo", {
    state: () => ({
        infos: {},
        promises: {},
        errors: {},
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
         * Drops everything this store caches, because it is all permission-filtered for the
         * previously authenticated user.
         *
         * Keys are deleted in place so `toRef` handles consumers hold into `infos` keep reading the
         * live container. Never replace a container here (that is what `$reset` does, and it detaches
         * every held handle).
         *
         * @returns {void}
         */
        clearAuthScoped() {
            this.authScopeGeneration += 1;
            trimReactiveObject(this.infos, {});
            trimReactiveObject(this.errors, {});
            trimReactiveObject(this.promises, {});
        },
        fetchModelInfo(args) {
            if (!args.app || !args.model) {
                return Promise.reject(new Error("storeModelInfo.fetchModelInfo: app and model must be provided"));
            }
            const key = getAppModelDotName(args);
            const generation = this.authScopeGeneration;
            const isCurrentAuthScope = () => this.authScopeGeneration === generation;
            const existing = this.infos[key];
            const cachedError = this.errors[key];
            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                // prevent us from self-DDoSing the server
                return Promise.reject(cachedError);
            }
            if (!this.promises[key]) {
                const params = {
                    [FIELDS_PARAM]: [
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
                    [EXPAND_PARAM]: [
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
                    modelInfoUrl(args) + `?${new URLSearchParams(params).toString()}`,
                    {
                        method: "GET",
                    },
                    "Failed to fetch model info",
                    ModelInfoError,
                )
                    // server is serving all the expanded fields as model_ to avoid server side conflicts
                    // that is just noise client side, so we'll clean it up here
                    .then((data) => {
                        // Process the data
                        data = Object.fromEntries(
                            Object.entries(data).map(([k, v]) => {
                                let key = k;
                                if (key.startsWith("model_")) {
                                    key = k.slice(6);
                                }
                                // In client code, we consistently use `expand` (not `expands`), matching `omit` not `omits`
                                if (key === "expands") {
                                    key = "expand";
                                }
                                // Only camelCase nested objects, leave root keys unchanged
                                if (key === "fields" || key === "filtering") {
                                    return [
                                        key,
                                        Object.fromEntries(Object.entries(v).map(([k, v]) => [k, camelCaseObject(v)])),
                                    ];
                                }
                                if (key === "expand") {
                                    // camelCase each expand descriptor's own keys
                                    // (e.g. app_label -> appLabel) so they match
                                    // field details. `f` is a mapping of field
                                    // names to FieldInfo objects: preserve its
                                    // field-name keys (server lookup keys) while
                                    // camelCasing each FieldInfo value.
                                    return [
                                        key,
                                        v.map((expand) => {
                                            const { [FIELDS_PARAM]: f, ...rest } = expand;
                                            return {
                                                ...camelCaseObject(rest),
                                                [FIELDS_PARAM]: f
                                                    ? Object.fromEntries(
                                                          Object.entries(f).map(([k, v]) => [k, camelCaseObject(v)]),
                                                      )
                                                    : undefined,
                                            };
                                        }),
                                    ];
                                }
                                return [key, camelCaseObject(v)];
                            }),
                        );

                        const pkEntry = Object.entries(data.fields).find(([, v]) => v.pk);
                        if (pkEntry) {
                            data.pk = pkEntry[0];
                        }
                        if (!data.pk) {
                            throw new Error(`storeModelInfo.fetchModelInfo: no pk field found for ${key}`);
                        }

                        if (!isCurrentAuthScope()) {
                            // the authenticated user changed while this was in flight: this payload was
                            // filtered for the previous principal, so it must not be cached or returned.
                            throw new AuthScopeInvalidatedError("storeModelInfo.fetchModelInfo", key);
                        }
                        this.infos[key] = data;

                        return data;
                    })
                    .catch((e) => {
                        if (isCurrentAuthScope()) {
                            this.errors[key] = e;
                        }
                        throw e;
                    })
                    .finally(() => {
                        if (isCurrentAuthScope()) {
                            // a changed generation means `clearAuthScoped` already removed this entry,
                            // and anything now at this key belongs to a newer fetch.
                            delete this.promises[key];
                        }
                    });
            }

            return this.promises[key];
        },
    },
});
