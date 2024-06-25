import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";

/**
 * ModelInfoError - error class for model info errors
 * @param messagePrefix - prefix for error messages
 * @param response - fetch response
 * @param responseData - response data
 * @constructor
 * @extends {Error}
 * @property {Response} response - fetch response
 * @property {Object} responseData - response data
 */
class ModelInfoError extends Error {
    constructor(messagePrefix, response, responseData) {
        const message = `${messagePrefix}: ${response.status} ${response.statusText}`;
        super(message);
        this.name = "ModelInfoError";
        this.response = response;
        this.responseData = responseData;
    }
}

/**
 * fetchHelper - fetch helper function to handle common fetch tasks
 * @param url - the url to fetch
 * @param options - fetch options
 * @param messagePrefix - prefix for error messages
 * @returns {Promise<*>}
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

/**
 * storeModelInfo - store for model info
 * Usage:
 * ```js
 *   import { ref, unref, computed } from "vue";
 *   import storeModelInfo from "vueda-client";
 *   const modelInfoStore = storeModelInfo();
 *
 *   // retrieve model info
 *   const fetchPromise = modelInfoStore.fetchModelInfo("app", "model");
 *
 *   const myApp = ref("myApp");
 *   const myModel = ref("myModel");
 *
 *   // reactive model info
 *   const modelInfo = computed(() => modelInfoStore.modelInfos[`${unref(myApp)}.${unref(myModel)}`]);
 *
 *   modelInfo.app_label // The app label of the model.
 *   modelInfo.model // The python model class name (lowercase).
 *   modelInfo.verbose_name // The verbose name of the model.
 *   modelInfo.verbose_name_plural // The verbose name plural of the model.
 *
 *   // model info properties
 *   const fields = computed(() => unref(modelInfo)?.fields);
 *
 *   const field = computed(() => unref(fields)?.[0]);
 *   // a field has the following properties always:
 *   field.name // The name of the field.
 *   field.label // The label of the field.
 *   field.type // The type of the field.
 *   field.many // A boolean indicating whether the field is a `ListField`.
 *   field.readOnly // A boolean indicating whether the field is read-only.
 *   field.required // A boolean indicating whether the field is required.
 *   // a field may optionally have the following properties:
 *   field.helpText // The help text for the field.
 *   field.maxValue // The maximum value for the field.
 *   field.minValue // The minimum value for the field.
 *   field.maxLength // The maximum length for the field.
 *   field.minLength // The minimum length for the field.
 *   field.maxDigits // The maximum number of digits for the field.
 *   field.decimalPlaces // The number of decimal places for the field.
 *   field.choices // The choices for the field.
 *
 *   const actions = computed(() => unref(modelInfo)?.actions);
 *   const action = computed(() => unref(actions)?.[0]);
 *   // an action has the following properties:
 *   action.name // The name of the action.
 *   action.description // The description of the action.
 *   action.detail // A boolean indicating whether the action is a detail view.
 *   action.methodNames // An array of HTTP methods (e.g., GET, POST) for the action.
 *   action.parameters // An optional array of parameters required for the action.
 *
 *   const expands = computed(() => unref(modelInfo)?.expands);
 *   const expand = computed(() => unref(expands)?.[0]);
 *   // an expand has the following properties:
 *   expand.name // The name of the expand field.
 *   expand.fields // An optional array of fields that can be expanded.
 *
 *   const ordering = computed(() => unref(modelInfo)?.ordering);
 *   const order = computed(() => unref(ordering)?.[0]);
 *   // an order information for a field has the following properties:
 *   order.name // The name of the ordering field.
 *   order.type // The type of the ordering field (e.g., "alpha", "numeric").
 *
 *   const filtering = computed(() => unref(modelInfo)?.filtering);
 *   const filter = computed(() => unref(filtering)?.[0]);
 *   // a filter information for a field has the following properties:
 *   filter.name // The name of the filtering field.
 *   filter.type // The type of the filtering field (e.g., "alpha", "numeric").
 *   filter.filters // An array of available filters for the field.
 *   // an available filter has the following properties:
 *   filter.filters.label // The label of the filter.
 *   filter.filters.required // A boolean indicating whether the filter is required.
 *   filter.filters.lookupExprs // An array of lookup expressions for the filter.
 *
 *   const permissions = computed(() => unref(modelInfo)?.permissions);
 *   const permission = computed(() => unref(permissions)?.[0]);
 *   // a permission has the following properties:
 *   permission.codename // The codename of the permission.
 *   permission.name // The name of the permission.
 * ```
 */
export default defineStore({
    id: "modelInfo",
    state: () => ({
        modelInfos: {},
        existingPromises: {},
    }),
    actions: {
        async fetchModelInfo(app, model) {
            const key = `${memoizedSnakeCase(app)}.${memoizedSnakeCase(model)}`;
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
                                if (k.startsWith("model_")) {
                                    return [k.slice(6), v];
                                }
                                return [k, v];
                            }),
                        );
                        return data;
                    })
                    .finally(() => {
                        delete this.existingPromises[key];
                    });
            }

            return this.existingPromises[key];
        },
    },
});
