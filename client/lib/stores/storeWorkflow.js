import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { FetchError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";
import { unref } from "vue";

let usingVuedaWorkFlow = true;

/**
 * Set the usingVuedaWorkFlow value.
 *
 * @param {boolean} value - The value to set usingVuedaWorkFlow to.
 */
export function setUsingVuedaWorkFlow(value) {
    usingVuedaWorkFlow = value;
}

export function getUsingVuedaWorkFlow() {
    return usingVuedaWorkFlow;
}

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
    const key = getAppModelDotName({ app: source.app, model: source.model });
    if (!target[key]) {
        return;
    }

    if (target[key][source.pk]) {
        assignReactiveObject(target[key][source.pk], source);
    }
};

const makeResultObject = (app, model, pk) => ({
    app: unref(app),
    model: unref(model),
    pk: unref(pk),
});
const workflowListTransitionUrl = (app, model) =>
    `${httpOrHttpsHostname}${getUrl("workflowList")}?app_label=${memoizedSnakeCase(app)}&model=${memoizedSnakeCase(model)}&e=transitions`;
const modelStatesUrl = (app, model) =>
    `${httpOrHttpsHostname}${getUrl("workflowStates")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/`;
const objectStatesUrl = (result) =>
    `${httpOrHttpsHostname}${getUrl("workflowObjectState")}${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.pk}/`;
const objectTransitionsUrl = (result) => {
    const routeTemplate = getUrl("workflowObjectTransitions");
    // Replace placeholders with actual values from the result object
    const urlWithVariables = routeTemplate
        .replace(":app", memoizedSnakeCase(result.app))
        .replace(":model", memoizedSnakeCase(result.model))
        .replace(":pk", result.pk);
    return `${httpOrHttpsHostname}${urlWithVariables}`;
};
const objectHistoriesUrl = (result) =>
    `${httpOrHttpsHostname}${getUrl("workflowObjectHistory")}${memoizedSnakeCase(result.app)}/${memoizedSnakeCase(result.model)}/${result.pk}/`;
const executeTransitionUrl = (result) => {
    const routeTemplate = getUrl("workflowExecuteTransition");
    // Replace placeholders with actual values from the result object
    let urlWithVariables = routeTemplate
        .replace(":app", memoizedSnakeCase(result.app))
        .replace(":model", memoizedSnakeCase(result.model));
    if (!Array.isArray(result.pk)) {
        urlWithVariables = urlWithVariables + `${result.pk}/`;
    }
    return `${httpOrHttpsHostname}${urlWithVariables}`;
};
/**
 * @typedef {import('pinia').Store<
 *     'workflow',
 *     {
 *         objectStates: {app: string, model: string, pk: string, state: object}[],
 *         objectTransitions: {app: string, model: string, pk: string, transitions: object[]}[],
 *         objectHistories: {app: string, model: string, pk: string, history: object[]}[],
 *         modelStates: {[key: string]: object[]},
 *     },
 *     {},
 *     {
 *         fetchModelStates: (app: string, model: string) => import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<object[]>
 *         fetchObjectState: (app: string, model: string, objectPk: string) => import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<{app: string, model: string, pk: string, state: object}>,
 *         fetchObjectTransitions: (app: string, model: string, objectPk: string) => import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<{app: string, model: string, pk: string, transitions: object[]}>,
 *         fetchObjectHistory: (app: string, model: string, objectPk: string) => import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<{app: string, model: string, pk: string, history: object[]}>,
 *         executeTransition: (app: string, model: string, objectPk: string, transition_code: string, router: import('vue-router').Router, stateToRoute: object) => import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<{app: string, model: string, pk: string}>,
 *     }
 * >} WorkflowStore
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
 *     workflowStore.objectStates; // array of objects with app, model, pk, and state
 *     workflowStore.objectTransitions; // array of objects with app, model, pk, and transitions
 *     workflowStore.objectHistories; // array of objects with app, model, pk, and history
 *     workflowStore.modelStates; // object with keys of app.model and values of array of states
 *
 *     // examples of reactively looking at a particular object's state, transitions, and history
 *     const myApp = ref("myApp"); // reactive will work
 *     const myModel = ref("myModel"); // reactive will work
 *     const objectPk = ref("myObjectPk"); // reactive will work
 *     const objectState = useArrayFind(workflowStore.objectStates, (state) => state.app === myApp && state.model === myModel && state.pk === objectPk);
 *     const objectTransitions = useArrayFind(workflowStore.objectTransitions, (transition) => transition.app === myApp && transition.model === myModel && transition.pk === objectPk);
 *     const objectHistory = useArrayFind(workflowStore.objectHistories, (history) => history.app === myApp && history.model === myModel && history.pk === objectPk);
 *     const modelStates = computed(() => workflowStore.modelStates[`${unref(myApp)}.${unref(myModel)}`]);
 *
 *     await workflowStore.fetchModelStates(app, model);
 *     await workflowStore.fetchObjectState(app, model, objectPk);
 *     await workflowStore.fetchObjectTransitions(app, model, objectPk);
 *     await workflowStore.fetchObjectHistory(app, model, objectPk);
 *     await workflowStore.executeTransition(app, model, objectPk, transition_code);
 * ```
 * @returns {WorkflowStore} The store for workflow.
 */
export const storeWorkflow = defineStore("workflow", {
    state: () => {
        const createErrorPromiseStructure = () => ({
            objectStates: {},
            objectTransitions: {},
            objectHistories: {},
            modelStates: {},
            workflowTransitions: {},
        });

        return {
            errors: createErrorPromiseStructure(),
            promises: createErrorPromiseStructure(),
            objectStates: {},
            objectTransitions: {},
            objectHistories: {},
            modelStates: {},
            workflowTransitions: {},
        };
    },
    actions: {
        fetchWorkflowTransition(app, model) {
            if (!app || !model) {
                return Promise.reject(
                    new Error("storeWorkflow.fetchWorkflowTransition: app and model must be provided"),
                );
            }
            if (!usingVuedaWorkFlow) {
                return Promise.resolve([]);
            }
            const key = getAppModelDotName({ app, model });
            const existing = this.workflowTransitions[key];
            const cachedError = this.errors.workflowTransitions[key];

            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                return Promise.reject(cachedError);
            }
            if (!this.promises.workflowTransitions[key]) {
                this.promises.workflowTransitions[key] = fetchHelper(
                    workflowListTransitionUrl(app, model),
                    {
                        method: "GET",
                    },
                    "Failed to fetch workflow transitions for model",
                    WorkflowError,
                    undefined,
                    "marker",
                )
                    .then((data) => {
                        if (data !== "marker") {
                            if (!data.results.length) {
                                this.workflowTransitions[key] = [];
                                return [];
                            }
                            this.workflowTransitions[key] = data.results[0].transitions;
                            return this.workflowTransitions[key];
                        }
                    })
                    .catch((e) => {
                        this.errors.workflowTransitions[key] = e;
                        throw e;
                    })
                    .finally(() => {
                        delete this.promises.workflowTransitions[key];
                    });
            }
            return this.promises.workflowTransitions[key];
        },
        fetchModelStates(app, model) {
            if (!app || !model) {
                return Promise.reject(new Error("storeWorkflow.fetchModelStates: app and model must be provided"));
            }
            if (!usingVuedaWorkFlow) {
                return Promise.resolve([]);
            }
            const key = getAppModelDotName({ app, model });
            const existing = this.modelStates[key];
            const cachedError = this.errors.modelStates[key];

            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                return Promise.reject(cachedError);
            }
            if (!this.promises.modelStates[key]) {
                this.promises.modelStates[key] = fetchHelper(
                    modelStatesUrl(app, model),
                    {
                        method: "GET",
                    },
                    "Failed to fetch states for model",
                    WorkflowError,
                    undefined,
                    "marker",
                )
                    .then((data) => {
                        if (data !== "marker") {
                            this.modelStates[key] = data;
                            return this.modelStates[key];
                        }
                    })
                    .catch((e) => {
                        this.errors.modelStates[key] = e;
                        throw e;
                    })
                    .finally(() => {
                        delete this.promises.modelStates[key];
                    });
            }
            return this.promises.modelStates[key];
        },
        fetchObjectState(app, model, objectPk) {
            if (!app || !model || !objectPk) {
                return Promise.reject(
                    new Error("storeWorkflow.fetchObjectState: app,model and objectPk must all be provided"),
                );
            }
            if (!usingVuedaWorkFlow) {
                return Promise.resolve([]);
            }
            const key = getAppModelDotName({ app, model });
            const existing = this.objectStates[key][objectPk];
            const cachedError = this.errors.objectStates[key]?.[objectPk];
            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                return Promise.reject(cachedError);
            }
            if (!this.promises.objectStates[key][objectPk]) {
                const result = makeResultObject(app, model, objectPk);
                this.promises.objectStates[key][objectPk] = fetchHelper(
                    objectStatesUrl(result),
                    {
                        method: "GET",
                    },
                    "Failed to fetch object state",
                    WorkflowError,
                    undefined,
                    "marker",
                )
                    .then((data) => {
                        if (data === "Object does not have a workflow.") {
                            return result;
                        }
                        this.objectStates[key][objectPk] = data;
                    })
                    .catch((e) => {
                        this.errors.objectStates[key][objectPk] = e;
                        throw e;
                    })
                    .finally(() => {
                        delete this.promises.objectStates[key][objectPk];
                    });
            }
            return this.promises.objectStates[key][objectPk];
        },
        fetchObjectTransitions(app, model, objectPk) {
            if (!app || !model || !objectPk) {
                return Promise.reject(
                    new Error("storeWorkflow.fetchObjectState: app,model and objectPk must all be provided"),
                );
            }
            if (!usingVuedaWorkFlow) {
                return Promise.resolve([]);
            }

            const key = getAppModelDotName({ app, model });
            const existing = this.objectTransitions[key][objectPk];
            const cachedError = this.errors.objectTransitions[key]?.[objectPk];
            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                return Promise.reject(cachedError);
            }
            if (!this.promises.objectTransitions[key][objectPk]) {
                const result = makeResultObject(app, model, objectPk);
                this.promises.objectTransitions[key][objectPk] = fetchHelper(
                    objectTransitionsUrl(result),
                    {
                        method: "GET",
                    },
                    "Failed to fetch object transitions",
                    WorkflowError,
                    undefined,
                    "marker",
                )
                    .then((data) => {
                        if (data === "Object does not have a workflow.") {
                            return result;
                        }
                        this.objectTransitions[key][objectPk] = data;
                    })
                    .catch((e) => {
                        this.errors.objectTransitions[key][objectPk] = e;
                        throw e;
                    })
                    .finally(() => {
                        delete this.promises.objectStates[key][objectPk];
                    });
            }
            return this.promises.objectTransitions[key][objectPk];
        },
        fetchObjectHistory(app, model, objectPk) {
            if (!app || !model || !objectPk) {
                return Promise.reject(
                    new Error("storeWorkflow.fetchObjectState: app,model and objectPk must all be provided"),
                );
            }
            if (!usingVuedaWorkFlow) {
                return Promise.resolve([]);
            }
            const key = getAppModelDotName({ app, model });
            const existing = this.objectHistories[key][objectPk];
            const cachedError = this.errors.objectHistories[key]?.[objectPk];
            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                // prevent us from self-ddosing the server
                return Promise.reject(cachedError);
            }
            if (!this.promises.objectHistories[key][objectPk]) {
                const result = makeResultObject(app, model, objectPk);

                this.promises.objectHistories[key][objectPk] = fetchHelper(
                    objectHistoriesUrl(result),
                    {
                        method: "GET",
                    },
                    "Failed to fetch object histories",
                    WorkflowError,
                    undefined,
                    "marker",
                )
                    .then((data) => {
                        if (data === "Object does not have a workflow.") {
                            return result;
                        }
                        this.objectHistories[key][objectPk] = data;
                    })
                    .catch((e) => {
                        this.errors.objectHistories[key][objectPk] = e;
                        throw e;
                    })
                    .finally(() => {
                        delete this.promises.objectHistories[key][objectPk];
                    });
            }
            return this.promises.objectHistories[key][objectPk];
        },
        executeTransition(app, model, objectPk, transition_code, router, stateToRoute = undefined) {
            if (!app || !model || !objectPk || !transition_code) {
                return Promise.reject(
                    new Error(
                        "storeWorkflow.fetchObjectState: app, model,objectPk and transition_code must all be provided",
                    ),
                );
            }
            if (!usingVuedaWorkFlow) {
                return Promise.resolve([]);
            }
            let body = { transition_code };
            const result = makeResultObject(app, model, objectPk);
            if (Array.isArray(objectPk)) {
                body = { ...body, object_ids: objectPk };
            }
            let responseData;

            const returningPromise = fetchHelper(
                executeTransitionUrl(result),
                {
                    method: "PATCH",
                    body: JSON.stringify(body),
                },
                "Failed to execute transition",
                WorkflowError,
            )
                .then((data) => {
                    responseData = data;
                    updateState(this.objectStates, { ...result, ...data.new_state });
                    updateState(this.objectTransitions, { ...result, transitions: data.new_transitions });
                })
                .finally(() => {
                    if (router && stateToRoute && responseData?.new_state?.state?.code in stateToRoute) {
                        router.push(stateToRoute[responseData.new_state.state.code]);
                    }
                });

            return returningPromise;
        },
        initializeObjectTransitions(app, model) {
            const key = getAppModelDotName({ app, model });
            this.objectTransitions[key] = {};
            this.promises.objectTransitions[key] = {};
            this.errors.objectTransitions[key] = {};
        },
    },
});
