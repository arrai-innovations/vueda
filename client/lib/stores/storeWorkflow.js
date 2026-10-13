/**
 * @module stores/storeWorkflow
 * @description Pinia store for fetching and caching the workflow transitions a user may run on a model and the workflow state history of objects, and for executing transitions on objects.
 */
import { trimReactiveObject } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import {
    AuthScopeInvalidatedError,
    ConfirmationRequiredError,
    FetchError,
    FormValidationError,
} from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";
import { unref } from "vue";

let usingVuedaWorkflow = true;

/**
 * Ensure the per-object history maps exist for a particular app.model key.
 *
 * Object histories, their errors, and their promises are stored under a two-level key:
 * `bucket[appModelKey][objectPk]`. These containers must exist before indexing.
 *
 * @param {any} store
 * @param {string} key
 * @private
 */
const ensureObjectHistoryBucket = (store, key) => {
    if (!store.objectHistories[key]) {
        store.objectHistories[key] = {};
    }
    if (!store.promises.objectHistories[key]) {
        store.promises.objectHistories[key] = {};
    }
    if (!store.errors.objectHistories[key]) {
        store.errors.objectHistories[key] = {};
    }
};

/**
 * Empty a two-level store container in place, leaves first.
 *
 * A consumer can hold a `toRef` handle into the inner object (for example the per-object history map
 * for one `app.model`), so the leaf keys are deleted before the key that holds the inner object.
 * Neither container is ever replaced.
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
 * Decide whether a workflow fetch for this model goes to the server.
 *
 * The server serves workflow endpoints only for a model whose model info reports `workflowEnabled`.
 * When that model info is already cached, this answers synchronously. Otherwise it fetches the model
 * info and then runs `retry`, which calls the same fetch again and finds the model info cached.
 *
 * @template T
 * @param {string} app
 * @param {string} model
 * @param {T} disabledValue - What the fetch resolves to for a model without workflow.
 * @param {() => Promise<any>} retry - Calls the fetch again once the model info is cached.
 * @returns {Promise<T|any>|undefined} `undefined` when the fetch should proceed, otherwise the promise to return.
 * @private
 */
const gateOnWorkflowEnabled = (app, model, disabledValue, retry) => {
    const modelInfoStore = storeModelInfo();
    const info = modelInfoStore.infos[getAppModelDotName({ app, model })];
    if (!info) {
        return modelInfoStore.fetchModelInfo({ app, model }).then(retry);
    }
    if (!info.workflowEnabled) {
        return Promise.resolve(disabledValue);
    }
    return undefined;
};

/**
 * Set the usingVuedaWorkflow value.
 *
 * @param {boolean} value - The value to set usingVuedaWorkflow to.
 */
export function setUsingVuedaWorkflow(value) {
    usingVuedaWorkflow = value;
}

/**
 * Returns whether the vueda workflow module is active.
 *
 * @returns {boolean} True if workflow is active.
 */
export function getUsingVuedaWorkflow() {
    return usingVuedaWorkflow;
}

/**
 * @typedef {object} WorkflowTransition
 * @property {string} code - The transition code.
 * @property {string} name - The transition display name.
 */

/**
 * @typedef {object} WorkflowState
 * @property {string} code - The state code.
 * @property {string} name - The state display name.
 */

/**
 * One recorded workflow state of an object, as the workflow state history endpoint returns it.
 *
 * @typedef {object} WorkflowHistoryEntry
 * @property {string} id - The event identifier, in the form `vueda_workflow.ObjectState:<event id>`.
 *  It matches the `object_state_revision` that the server reports after a transition.
 * @property {string|null} state - The code of the state the object moved to. It is `null` when that
 *  state has since been deleted.
 * @property {string} recorded_at - When the state was recorded, as an ISO 8601 timestamp.
 * @property {number|null} actor - The primary key of the user who caused the change. It is `null` when
 *  no user was recorded.
 */

/**
 * An error for use from the model info store.
 * @extends {FetchError}
 */
export class WorkflowError extends FetchError {
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
 * A `WorkflowError` for a request the server denied with a 403: the authenticated user is not
 * permitted to discover or act on this model's workflow.
 *
 * @extends {WorkflowError}
 */
export class WorkflowPermissionDeniedError extends WorkflowError {
    /**
     * Creates an instance of WorkflowPermissionDeniedError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "WorkflowPermissionDeniedError";
    }
}

/**
 * @param {import('vue').Ref<string>|string} app
 * @param {import('vue').Ref<string>|string} model
 * @param {import('vue').Ref<string>|string} pk
 * @returns {{ app: string, model: string, pk: string }}
 * @private
 */
const makeResultObject = (app, model, pk) => ({
    app: unref(app),
    model: unref(model),
    pk: unref(pk),
});
const workflowUserPermittedTransitionsUrl = (result) => {
    const routeTemplate = getUrl("workflowUserPermittedTransitions");
    // Replace placeholders with actual values from the result object
    const urlWithVariables = routeTemplate
        .replace(":app", memoizedSnakeCase(result.app))
        .replace(":model", memoizedSnakeCase(result.model))
        .replace(":pk", result.pk);
    return `${httpOrHttpsHostname}${urlWithVariables}`;
};
const objectHistoriesUrl = (result) => {
    const routeTemplate = getUrl("historyWorkflowStateHistory");
    // Replace placeholders with actual values from the result object
    const urlWithVariables = routeTemplate
        .replace(":app", memoizedSnakeCase(result.app))
        .replace(":model", memoizedSnakeCase(result.model))
        .replace(":pk", result.pk);
    return `${httpOrHttpsHostname}${urlWithVariables}`;
};
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
 * @typedef {ReturnType<typeof storeWorkflow>} WorkflowStore
 */

/**
 * A pinia store for the workflow transitions a user may run on each model and the workflow state
 * history of each object. It also executes transitions.
 *
 * An object's current state and the transitions available on it are fields of the object itself:
 * `workflow_state_code`, `workflow_state_name`, and `valid_transitions`.
 *
 * @example
 * ```js
 *     import { computed, ref } from "vue";
 *     import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
 *     import { getAppModelDotName } from "@vueda/utils/case.js";
 *     const workflowStore = storeWorkflow();
 *
 *     const app = ref("myApp");
 *     const model = ref("myModel");
 *     const objectPk = ref("myObjectPk");
 *
 *     // the transitions the user may run on the model, and one object's state history
 *     await workflowStore.fetchWorkflowTransition(app.value, model.value);
 *     const history = await workflowStore.fetchObjectHistory(app.value, model.value, objectPk.value);
 *
 *     // the same history, read reactively from the cache
 *     const cachedHistory = computed(
 *         () => workflowStore.objectHistories[getAppModelDotName({ app: app.value, model: model.value })]?.[objectPk.value],
 *     );
 *
 *     await workflowStore.executeTransition(app.value, model.value, objectPk.value, "approve");
 * ```
 */
export const storeWorkflow = defineStore("workflow", {
    state: () => {
        const createErrorPromiseStructure = () => ({
            objectHistories: {},
            workflowTransitions: {},
        });

        return {
            /**
             * The error from each failed fetch, in one bucket per cache. Later calls for the same key
             * reject with this error instead of asking the server again.
             *
             * @type {{
             *     objectHistories: {[appModelDotName: string]: {[objectPk: string]: Error}},
             *     workflowTransitions: {[appModelDotName: string]: Error},
             * }}
             */
            errors: createErrorPromiseStructure(),
            /**
             * The in-flight fetches, in one bucket per cache. Each object bucket is keyed by app and model
             * dot name, then by object primary key. Each model bucket is keyed by app and model dot name. A
             * fetch removes its entry when it settles.
             *
             * @type {{
             *     objectHistories: {[appModelDotName: string]: {[objectPk: string]: Promise<WorkflowHistoryEntry[]>}},
             *     workflowTransitions: {[appModelDotName: string]: Promise<WorkflowTransition[]|undefined>},
             * }}
             */
            promises: createErrorPromiseStructure(),
            /**
             * The recorded workflow states of each fetched object, oldest first, keyed by app and model
             * dot name, then by object primary key.
             *
             * @type {{[appModelDotName: string]: {[objectPk: string]: WorkflowHistoryEntry[]}}}
             */
            objectHistories: {},
            /**
             * The transitions the authenticated user is permitted to run on each fetched model, keyed by
             * app and model dot name. The server does not check any particular object for this list.
             *
             * @type {{[appModelDotName: string]: WorkflowTransition[]}}
             */
            workflowTransitions: {},
            /**
             * Incremented by `clearAuthScoped`. Fetches capture it before issuing and discard their
             * response if it changed while the request was in flight.
             *
             * @type {number}
             */
            authScopeGeneration: 0,
        };
    },
    actions: {
        /**
         * Drops every cached workflow response, because permitted transitions and state histories
         * are both filtered for the authenticated user.
         *
         * The module-level `usingVuedaWorkflow` flag is integrator configuration, not user data, so
         * it is untouched. Keys are deleted in place, deepest level first, so `toRef` handles
         * consumers hold keep reading the live containers. Never replace a container here (that is
         * what `$reset` does, and it detaches every held handle).
         *
         * @returns {void}
         */
        clearAuthScoped() {
            this.authScopeGeneration += 1;
            clearNestedContainer(this.objectHistories);
            clearNestedContainer(this.errors.objectHistories);
            clearNestedContainer(this.promises.objectHistories);
            trimReactiveObject(this.workflowTransitions, {});
            trimReactiveObject(this.errors.workflowTransitions, {});
            trimReactiveObject(this.promises.workflowTransitions, {});
        },
        /**
         * Fetches the transitions the authenticated user is permitted to run on a model and caches them
         * in `workflowTransitions`.
         *
         * A cached list resolves at once, and a cached error rejects at once. A request already in flight
         * for the same model is shared. The list is empty when workflow is off or the model does not
         * enable it.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @returns {Promise<WorkflowTransition[]|undefined>} A promise for the permitted transitions, or
         *  `undefined` when the server sends an empty response. It rejects with
         *  `WorkflowPermissionDeniedError` on a 403, and with `WorkflowError` for other failures.
         */
        fetchWorkflowTransition(app, model) {
            if (!app || !model) {
                return Promise.reject(
                    new Error("storeWorkflow.fetchWorkflowTransition: app and model must be provided"),
                );
            }
            if (!usingVuedaWorkflow) {
                /** @type {Promise<WorkflowTransition[]>} */
                return Promise.resolve([]);
            }
            const gated = gateOnWorkflowEnabled(app, model, [], () => this.fetchWorkflowTransition(app, model));
            if (gated) {
                return gated;
            }
            const key = getAppModelDotName({ app, model });
            const generation = this.authScopeGeneration;
            const isCurrentAuthScope = () => this.authScopeGeneration === generation;
            const existing = this.workflowTransitions[key];
            const cachedError = this.errors.workflowTransitions[key];

            if (existing) {
                /** @type {Promise<WorkflowTransition[]>} */
                return Promise.resolve(existing);
            }
            if (cachedError) {
                return Promise.reject(cachedError);
            }
            if (!this.promises.workflowTransitions[key]) {
                this.promises.workflowTransitions[key] = fetchHelper(
                    workflowUserPermittedTransitionsUrl({ app, model }),
                    {
                        method: "GET",
                    },
                    "Failed to fetch workflow transitions for model",
                    WorkflowError,
                    undefined,
                    "marker",
                    (response, data) =>
                        response.status === 403
                            ? new WorkflowPermissionDeniedError(
                                  "Failed to fetch workflow transitions for model",
                                  response,
                                  data,
                              )
                            : new WorkflowError("Failed to fetch workflow transitions for model", response, data),
                )
                    .then((data) => {
                        if (!isCurrentAuthScope()) {
                            // the authenticated user changed while this was in flight: this response was
                            // filtered for the previous principal, so it must not be cached or returned.
                            throw new AuthScopeInvalidatedError("storeWorkflow.fetchWorkflowTransition", key);
                        }
                        if (data !== "marker") {
                            if (!data.length) {
                                this.workflowTransitions[key] = [];
                                return [];
                            }
                            this.workflowTransitions[key] = data;
                            return this.workflowTransitions[key];
                        }
                    })
                    .catch((e) => {
                        if (!isCurrentAuthScope()) {
                            // the authenticated user changed while this was in flight: this rejection, denial
                            // or otherwise, was determined for the previous principal, so it must not decide
                            // anything for the currently authenticated user, the same as a stale success above.
                            throw new AuthScopeInvalidatedError("storeWorkflow.fetchWorkflowTransition", key);
                        }
                        this.errors.workflowTransitions[key] = e;
                        throw e;
                    })
                    .finally(() => {
                        if (isCurrentAuthScope()) {
                            // a changed generation means `clearAuthScoped` already removed this entry,
                            // and anything now at this key belongs to a newer fetch.
                            delete this.promises.workflowTransitions[key];
                        }
                    });
            }
            /** @type {Promise<WorkflowTransition[]>} */
            return this.promises.workflowTransitions[key];
        },
        /**
         * Fetches the recorded workflow states of one object and caches them in `objectHistories`.
         *
         * A cached history resolves at once, and a cached error rejects at once. A request already in
         * flight for the same object is shared. A transition that `executeTransition` runs on the object
         * drops its cached history, so the next call fetches it again.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string} objectPk - The object's primary key.
         * @returns {Promise<WorkflowHistoryEntry[]>} A promise for the object's history, oldest first. It
         *  resolves to an empty array when workflow is off or the model does not enable it. It rejects
         *  with `WorkflowError` when the request fails. The server answers with a 404 for an object that
         *  has no workflow state, so the history of that object also rejects with `WorkflowError`.
         */
        fetchObjectHistory(app, model, objectPk) {
            if (!app || !model || !objectPk) {
                return Promise.reject(
                    new Error("storeWorkflow.fetchObjectHistory: app, model and objectPk must all be provided"),
                );
            }
            if (!usingVuedaWorkflow) {
                return Promise.resolve([]);
            }
            const gated = gateOnWorkflowEnabled(app, model, [], () => this.fetchObjectHistory(app, model, objectPk));
            if (gated) {
                return gated;
            }
            const key = getAppModelDotName({ app, model });
            const generation = this.authScopeGeneration;
            const isCurrentAuthScope = () => this.authScopeGeneration === generation;
            ensureObjectHistoryBucket(this, key);
            const existing = this.objectHistories[key][objectPk];
            const cachedError = this.errors.objectHistories[key][objectPk];
            if (existing) {
                return Promise.resolve(existing);
            }
            if (cachedError) {
                // prevent us from self-ddosing the server
                return Promise.reject(cachedError);
            }
            if (!this.promises.objectHistories[key][objectPk]) {
                this.promises.objectHistories[key][objectPk] = fetchHelper(
                    objectHistoriesUrl(makeResultObject(app, model, objectPk)),
                    {
                        method: "GET",
                    },
                    "Failed to fetch object histories",
                    WorkflowError,
                )
                    .then((data) => {
                        if (!isCurrentAuthScope()) {
                            // the authenticated user changed while this was in flight: this response was
                            // filtered for the previous principal, so it must not be cached or returned.
                            throw new AuthScopeInvalidatedError(
                                "storeWorkflow.fetchObjectHistory",
                                `${key}.${objectPk}`,
                            );
                        }
                        this.objectHistories[key][objectPk] = data;
                        return this.objectHistories[key][objectPk];
                    })
                    .catch((e) => {
                        if (isCurrentAuthScope()) {
                            this.errors.objectHistories[key][objectPk] = e;
                        }
                        throw e;
                    })
                    .finally(() => {
                        if (isCurrentAuthScope()) {
                            // a changed generation means `clearAuthScoped` already removed the bucket
                            // this entry lived in.
                            delete this.promises.objectHistories[key][objectPk];
                        }
                    });
            }
            return this.promises.objectHistories[key][objectPk];
        },
        /**
         * Runs a workflow transition on one object or on several objects in one request.
         *
         * A run that is not a dry run drops the cached workflow state history of each object it ran on.
         * When `router` and `stateToRoute` are given and the new state code is a key of `stateToRoute`,
         * the router then navigates to that route.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string|string[]} objectPk - The object's primary key, or an array of keys for a bulk run.
         * @param {string} transitionCode - The code of the transition to run.
         * @param {import('vue-router').Router} [router] - The router to navigate with after the run.
         * @param {{[stateCode: string]: import('vue-router').RouteLocationRaw}} [stateToRoute] - The route
         *  to navigate to for each new state code.
         * @param {boolean} [dryRun=false] - Whether the server validates the transition and rolls it back.
         * @param {string} [acknowledgeWarnings] - The warning digest the user acknowledged, sent in the
         *  `Acknowledge-Warnings` header.
         * @returns {Promise<
         *     {new_state: WorkflowState, new_transitions: WorkflowTransition[]}|
         *     {[objectPk: string]: {new_state: WorkflowState, new_transitions: WorkflowTransition[]}}|
         *     Array
         * >} A promise for the server response. A bulk run resolves to one result per primary key. It
         *  resolves to an empty array when workflow is off. It rejects with `FormValidationError` on a
         *  400, `ConfirmationRequiredError` on a 409, and `WorkflowError` for other failures.
         */
        executeTransition(
            app,
            model,
            objectPk,
            transitionCode,
            router,
            stateToRoute = undefined,
            dryRun = false,
            acknowledgeWarnings = undefined,
        ) {
            if (!app || !model || !objectPk || !transitionCode) {
                return Promise.reject(
                    new Error(
                        "storeWorkflow.executeTransition: app, model, objectPk and transitionCode must all be provided",
                    ),
                );
            }
            if (!usingVuedaWorkflow) {
                return Promise.resolve([]);
            }
            let body = { transition_code: transitionCode };
            const result = makeResultObject(app, model, objectPk);
            if (Array.isArray(objectPk)) {
                body = { ...body, object_ids: objectPk };
            }
            let responseData;

            const returningPromise = fetchHelper(
                executeTransitionUrl(result),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFValue(),
                        ...(dryRun ? { "Dry-Run": "true" } : {}),
                        ...(acknowledgeWarnings ? { "Acknowledge-Warnings": acknowledgeWarnings } : {}),
                    },
                    method: "PATCH",
                    body: JSON.stringify(body),
                },
                "Failed to execute transition",
                WorkflowError,
                undefined,
                undefined,
                (response, data) => {
                    if (response.status === 400) {
                        return new FormValidationError(data, response);
                    }
                    if (response.status === 409) {
                        return new ConfirmationRequiredError(data, response, { bulk: Array.isArray(objectPk) });
                    }
                    return new WorkflowError("Failed to execute transition", response, data);
                },
            )
                .then((data) => {
                    if (dryRun) {
                        // The server rolled a dry run back, so its `new_state` never took effect.
                        return data;
                    }
                    responseData = data;
                    // The transition recorded a new state for each object, so their cached histories are stale.
                    const key = getAppModelDotName({ app: result.app, model: result.model });
                    for (const pk of Array.isArray(result.pk) ? result.pk : [result.pk]) {
                        delete this.objectHistories[key]?.[pk];
                        delete this.errors.objectHistories[key]?.[pk];
                    }
                    return data;
                })
                .finally(() => {
                    const stateCode = responseData?.new_state?.code ?? responseData?.new_state?.state?.code;
                    if (router && stateToRoute && stateCode && stateCode in stateToRoute) {
                        router.push(stateToRoute[stateCode]);
                    }
                });

            return returningPromise;
        },
    },
});
