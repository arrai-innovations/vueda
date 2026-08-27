/**
 * @module use/useWorkflowTransitions
 * @description Fetches and reactively tracks the available workflow transitions for a given app and model.
 */
import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeUser } from "@vueda/stores/storeUser.js";
import { getUsingVuedaWorkflow, storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import { reactive, readonly, ref, toRef, watch } from "vue";

/**
 * @typedef {object} WorkflowTransitionsRawState
 * @property {import('vue').Ref<boolean>} loading - True if loading is in progress.
 * @property {import('vue').Ref<Error|null>} error - The error encountered, if any.
 * @property {import('vue').Ref<boolean>} errored - Whether an error has occurred.
 * @property {() => void} clearError - Clears the error.
 * @property {import('vue').Ref<import('@vueda/stores/storeWorkflow.js').WorkflowTransition[]>} transitions - The list of transitions for the model.
 */

/**
 * The useWorkflowTransitions instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<WorkflowTransitionsRawState>>} WorkflowTransitions
 */

/**
 * Provides a reactive list of workflow transitions for a given app and model.
 *
 * @param {import('vue').Ref<string>} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>} model - A ref containing the model name that is being watched.
 * @param {import('@vueda/use/useIsActive.js').IsActive|undefined} [isActive] - An IsActive instance, if one can be reused.
 * @returns {WorkflowTransitions} An object containing transitions.
 */
export function useWorkflowTransitions(app, model, isActive) {
    if (!getUsingVuedaWorkflow()) {
        // for testing purposes, check at setup time.
        return readonly(
            reactive({
                loading: ref(false),
                error: ref(null),
                errored: ref(false),
                /* v8 ignore next 1 */
                clearError: () => {},
                transitions: ref([]),
            }),
        );
    }
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    const workflowStore = storeWorkflow();
    const userStore = storeUser();
    const internalState = reactive({
        app,
        model,
        lastSetKey: ref(null),
        lastFetchedKey: ref(null),
        lastIdentityGeneration: ref(userStore.identityGeneration),
        workflowTransitions: toRef(workflowStore, "workflowTransitions"),
    });
    const returnObject = reactive(
        /** @type {WorkflowTransitionsRawState} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            transitions: [],
        },
    );
    watch(
        [
            isActive,
            toRef(internalState, "app"),
            toRef(internalState, "model"),
            // the store drops its cache when the authenticated user changes, so refetch under the new one
            () => userStore.identityGeneration,
        ],
        ([isActive, app, model, identityGeneration]) => {
            if (identityGeneration !== internalState.lastIdentityGeneration) {
                // the transitions fetched for the previous user are gone, so neither key still describes
                // anything this instance holds
                internalState.lastIdentityGeneration = identityGeneration;
                internalState.lastFetchedKey = null;
                internalState.lastSetKey = null;
            }
            if (!isActive) {
                return;
            }
            if (!app || !model) {
                return;
            }
            const key = getAppModelDotName({ app, model });
            if (internalState.lastFetchedKey !== key && !returnObject.loading) {
                loadingError.clearError();
                loadingError.setLoading();
                workflowStore
                    .fetchWorkflowTransition(app, model)
                    .then(() => {
                        internalState.lastFetchedKey = key;
                    })
                    .catch((e) => {
                        if (e instanceof AuthScopeInvalidatedError) {
                            // the authenticated user changed mid-fetch; the identity watch refetches
                            return;
                        }
                        loadingError.setError(e);
                    })
                    .finally(() => {
                        loadingError.clearLoading();
                    });
            }
        },
        { immediate: true },
    );

    watch(
        [toRef(internalState, "app"), toRef(internalState, "model"), toRef(internalState, "workflowTransitions")],
        ([app, model]) => {
            if (!app || !model) {
                return;
            }
            const key = getAppModelDotName({ app, model });
            if (key !== internalState.lastSetKey) {
                if (key && internalState.workflowTransitions[key]) {
                    returnObject.transitions = toRef(internalState.workflowTransitions, key);
                    internalState.lastSetKey = key;
                } else {
                    returnObject.transitions = ref([]);
                    internalState.lastSetKey = null;
                }
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(returnObject);
}
