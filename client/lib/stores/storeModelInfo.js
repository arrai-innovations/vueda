import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
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
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
    });
    const responseData = await getJsonOrText(response);
    if (!response.ok) {
        throw new ModelInfoError(messagePrefix, response, responseData);
    }
    return responseData;
};

const modelInfoUrl = (app, model) =>
    `${httpOrHttpsHostname}/routes/info/model_info/${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;

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
 *   const expands = computed(() => unref(modelInfo)?.expands);
 *   const ordering = computed(() => unref(modelInfo)?.ordering);
 *   const filtering = computed(() => unref(modelInfo)?.filtering);
 *   const permissions = computed(() => unref(modelInfo)?.permissions);
 * ```
 */
export default defineStore({
    id: "modelInfo",
    state: () => ({
        modelInfos: {},
    }),
    actions: {
        async fetchModelInfo(app, model) {
            const key = `${memoizedSnakeCase(app)}.${memoizedSnakeCase(model)}`;
            const existing = this.modelInfos[key];
            if (existing) {
                return existing;
            }
            this.modelInfos[key] = await fetchHelper(
                modelInfoUrl(app, model),
                {
                    method: "GET",
                },
                "Failed to fetch model info",
            );
            return this.modelInfos[key];
        },
    },
});
