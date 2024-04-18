import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { defineStore } from "pinia";
import { unref } from "vue";

/**
 * WorkflowError - error class for workflow errors
 * @param messagePrefix - prefix for error messages
 * @param response - fetch response
 * @param responseData - response data
 * @constructor
 * @extends {Error}
 * @property {Response} response - fetch response
 * @property {Object} responseData - response data
 */
class WorkflowError extends Error {
    constructor(messagePrefix, response, responseData) {
        const message = `${messagePrefix}: ${response.status} ${response.statusText}`;
        super(message);
        this.name = "WorkflowError";
        this.response = response;
        this.responseData = responseData;
    }
}

/**
 * updateState - update the target array with the source object, or add the source object to the target array
 * @param target - array of objects
 * @param source - object to update or add
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
 * fetchHelper - fetch helper function to handle common fetch tasks
 * - adds CSRF token and Content-Type of application/json to headers if not a GET request
 * - always includes credentials: "include", use credentials: undefined to not include
 * - throws a WorkflowError if the response is not ok
 * @param url - the url to fetch
 * @param options - fetch options
 * @param messagePrefix - prefix for error messages
 * @param emptyResponseValue - value to return if the response is 403
 * @returns {Promise<*>}
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
    `${httpOrHttpsHostname}/routes/workflows/states/${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;
const objectStatesUrl = (result) =>
    `${httpOrHttpsHostname}/routes/workflows/object-state/${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;
const objectTransitionsUrl = (result) =>
    `${httpOrHttpsHostname}/routes/workflows/object-transitions/${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;
const objectHistoriesUrl = (result) =>
    `${httpOrHttpsHostname}/routes/workflows/object-history/${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;
const executeTransitionUrl = (result) =>
    `${httpOrHttpsHostname}/routes/workflows/execute-transition/${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.id}/`;

/**
 * storeWorkflow - pinia store for current workflow states, available transitions, and workflow histories for objects
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
 */
export default defineStore({
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
