import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import { getUrl } from "@vueda/utils/urls.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { defineStore } from "pinia";
import { unref } from "vue";

/**
 * An error for use from the model info store.
 * @extends {FetchError}
 */
class WorkflowError extends FetchError {
    /**
     * Creates an instance of WorkflowError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "WorkflowError";
    }
}

/**
 * Update the target array with the source object, or add the source object to the target array.
 *
 * @param {object[]} target - The array to update or add to.
 * @param {object} source - The object to update or add.
 * @private
 */
const updateState = (target, source) => {
    const index = target.findIndex(
        (state) => state.id === source.id && state.app === source.app && state.model === source.model,
    );
    if (index === -1) {
        target.push(source);
    } else {
        assignReactiveObject(target[index], source);
    }
};

/**
 * A Fetch helper function to handle common fetch tasks, including setting headers and handling errors.
 *
 * @param {string} url - The url to fetch.
 * @param {object} [options] - The fetch options.
 * @param {string} [messagePrefix] - The prefix for error messages.
 * @param {object|string} [emptyResponseValue] - The value to return if the response is 403.
 * @returns {Promise<object|string>} The response data.
 * @private
 */
const fetchHelper = async (url, options = {}, messagePrefix, emptyResponseValue) => {
    const nonGetDefaultHeaders = {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFValue(),
    };
    const headers = { ...(options.method !== "GET" ? nonGetDefaultHeaders : {}), ...options.headers };
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
    });
    const responseData = await getJsonOrText(response);
    if (!response.ok) {
        // if the user is not logged in, or is and does not have permission to transition the object, the response will be 403
        if (response.status === 403 && emptyResponseValue) {
            return emptyResponseValue;
        }
        throw new WorkflowError(messagePrefix, response, responseData);
    }

    // Return the response data
    return responseData;
};

const makeModelKey = (app, model) => `${memoizedSnakeCase(app)}.${memoizedSnakeCase(model)}`;
const makeResultObject = (app, model, id) => ({
    app: unref(app),
    model: unref(model),
    id: unref(id),
});
const modelStatesUrl = (app, model) =>
    `${httpOrHttpsHostname}${getUrl("workflowStates")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;
const objectStatesUrl = (result) =>
    `${httpOrHttpsHostname}${getUrl("workflowObjectState")}${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;
const objectTransitionsUrl = (result) =>
    `${httpOrHttpsHostname}${getUrl("workflowObjectTransitions")}${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;
const objectHistoriesUrl = (result) =>
    `${httpOrHttpsHostname}${getUrl("workflowObjectHistory")}${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;
const executeTransitionUrl = (result) =>
    `${httpOrHttpsHostname}${getUrl("workflowExecuteTransition")}${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;

/**
 * @typedef {import('pinia').Store<{
 *     state:{
 *         objectStates: {app: string, model: string, id: string, state: object}[],
 *         objectTransitions: {app: string, model: string, id: string, transitions: object[]}[],
 *         objectHistories: {app: string, model: string, id: string, history: object[]}[],
 *         modelStates: {[key: string]: object[]},
 *     },
 *     actions: {
 *         fetchModelStates: (app: string, model: string) => Promise<object[]>,
 *         fetchObjectState: (app: string, model: string, objectId: string) => Promise<{app: string, model: string, id: string, state: object}>,
 *         fetchObjectTransitions: (app: string, model: string, objectId: string) => Promise<{app: string, model: string, id: string, transitions: object[]}>,
 *         fetchObjectHistory: (app: string, model: string, objectId: string) => Promise<{app: string, model: string, id: string, history: object[]}>,
 *         executeTransition: (app: string, model: string, objectId: string, transition_code: string, router: Router, stateToRoute: object) => Promise<{app: string, model: string, id: string}>,
 *     }
 * }>} WorkflowStore
 */

/**
 * A pinia store for current workflow states, available transitions, and workflow histories for objects
 *  or possible states for models
 * Usage:
 * ```js
 *     import { ref, unref, computed } from "vue";
 *     import { storeWorkflowStore } from "vueda-client";
 *     import { useArrayFind } from "@vueuse/core";
 *     const workflowStore = storeWorkflowStore();
 *
 *     workflowStore.objectStates; // array of objects with app, model, id, and state
 *     workflowStore.objectTransitions; // array of objects with app, model, id, and transitions
 *     workflowStore.objectHistories; // array of objects with app, model, id, and history
 *     workflowStore.modelStates; // object with keys of app.model and values of array of states
 *
 *     // examples of reactively looking at a particular object's state, transitions, and history
 *     const myApp = ref("myApp"); // reactive will work
 *     const myModel = ref("myModel"); // reactive will work
 *     const objectId = ref("myObjectId"); // reactive will work
 *     const objectState = useArrayFind(workflowStore.objectStates, (state) => state.app === myApp && state.model === myModel && state.id === objectId);
 *     const objectTransitions = useArrayFind(workflowStore.objectTransitions, (transition) => transition.app === myApp && transition.model === myModel && transition.id === objectId);
 *     const objectHistory = useArrayFind(workflowStore.objectHistories, (history) => history.app === myApp && history.model === myModel && history.id === objectId);
 *     const modelStates = computed(() => workflowStore.modelStates[`${unref(myApp)}.${unref(myModel)}`]);
 *
 *     await workflowStore.fetchModelStates(app, model);
 *     await workflowStore.fetchObjectState(app, model, objectId);
 *     await workflowStore.fetchObjectTransitions(app, model, objectId);
 *     await workflowStore.fetchObjectHistory(app, model, objectId);
 *     await workflowStore.executeTransition(app, model, objectId, transition_code);
 * ```
 * @returns {WorkflowStore} The store for workflow.
 */
export const storeWorkflow = defineStore({
    id: "workflow",
    state: () => ({
        objectStates: [],
        objectTransitions: [],
        objectHistories: [],
        modelStates: {},
    }),
    actions: {
        async fetchModelStates(app, model) {
            const key = makeModelKey(app, model);
            const existing = get(this.modelStates, key);
            if (existing) {
                return existing;
            }
            const data = await fetchHelper(
                modelStatesUrl(key),
                {
                    method: "GET",
                },
                "Failed to fetch states for model",
                "marker",
            );
            if (data !== "marker") {
                set(this.modelStates, key, data);
            }
        },
        async fetchObjectState(app, model, objectId) {
            const result = makeResultObject(app, model, objectId);
            const data = await fetchHelper(
                objectStatesUrl(result),
                {
                    method: "GET",
                },
                "Failed to fetch object state",
            );
            if (data === "Object does not have a workflow.") {
                return result;
            }
            updateState(this.objectStates, { ...result, ...data });
        },
        async fetchObjectTransitions(app, model, objectId) {
            const result = makeResultObject(app, model, objectId);
            const data = await fetchHelper(
                objectTransitionsUrl(result),
                {
                    method: "GET",
                },
                "Failed to fetch object transitions",
                [],
            );
            if (data === "Object does not have a workflow.") {
                return result;
            }
            updateState(this.objectTransitions, { ...result, transitions: data });
        },
        async fetchObjectHistory(app, model, objectId) {
            const result = makeResultObject(app, model, objectId);
            const data = await fetchHelper(
                objectHistoriesUrl(result),
                {
                    method: "GET",
                },
                "Failed to fetch object transitions",
                [],
            );
            if (data === "Object does not have a workflow.") {
                return result;
            }
            updateState(this.objectHistories, { ...result, history: data });
        },
        async executeTransition(app, model, objectId, transition_code, router, stateToRoute) {
            const result = makeResultObject(app, model, objectId);
            const data = await fetchHelper(
                executeTransitionUrl(result),
                {
                    method: "PATCH",
                    body: JSON.stringify({ transition_code }),
                },
                "Failed to execute transition",
            );
            updateState(this.objectStates, { ...result, ...data.new_state });
            updateState(this.objectTransitions, { ...result, transitions: data.new_transitions });
            if (router && stateToRoute && data.new_state.state.code in stateToRoute) {
                router.push(stateToRoute[data.new_state.state.code]);
            }
            // I don't remember why I was returning result here
            // return result;
        },
    },
});
