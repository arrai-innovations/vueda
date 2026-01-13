import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { getUsingVuedaWorkFlow, storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, ref, toRef, unref, watch } from "vue";

const usingVuedaWorkFlow = getUsingVuedaWorkFlow();

/**
 * The raw instance of a useObjectsWorkflowTransitionsRaw object.
 *
 * @typedef {object} useObjectsWorkflowTransitionsRaw
 * @property {boolean} loading - True if the model choices are loading.
 * @property {Error} error - The error that occurred while loading the model choices.
 * @property {boolean} errored - True if an error occurred while loading the model choices.
 * @property {()=>void} clearError - Clear the error.
 * @property {object} transitions - The list of object transitions.
 */

/**
 * The reactive useModelChoices instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<useObjectsWorkflowTransitionsRaw>>} useObjectsWorkflowTransitions
 */

/**
 * Provides a reactive object for a given app, model, and pks. This composition function is designed to preserve deep references
 * within the `objectTransitions` object, preventing them from breaking when the app, model, or field changes.
 *
 *
 * @param {import('vue').Ref<string>} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>} model - A ref containing the model name that is being watched.
 * @param {import('vue').Ref<string|string[]>} pks - A ref containing the list of primary keys that is being watched.
 * @param {import('@vueda/use/useIsActive.js').IsActive|undefined} [isActive] - An IsActive instance, if one can be reused.
 * @returns {useWorkflowRaw} An object containing objectTransitions.
 */
export function useObjectsWorkflowTransitions(app, model, pks, isActive) {
    if (!usingVuedaWorkFlow) {
        return {
            loading: ref(false),
            error: ref(null),
            errored: ref(false),
            clearError: () => {},
            transitions: undefined,
        };
    }
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    const workflowStore = storeWorkflow();
    const origionalObjectTransitions = ref(null);
    const returnObject = reactive(
        /** @type {useWorkflowRaw} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            transitions: [],
        },
    );

    // update origionalObjectTransitions when app, model, pks, or isActive changes
    watch(
        [isActive, app, model, pks],
        async ([active, app, model, pks], [oldActive, oldApp, oldModel, oldPks]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            if (oldActive === active && app === oldApp && model === oldModel && pks === oldPks) {
                return; // no change, no need to update
            }
            if (app && model && !returnObject.loading) {
                const transitions = await workflowStore.fetchWorkflowTransition(app, model);
                if (!transitions || transitions.length < 1) {
                    return;
                }
            }
            if (app && model && pks && !returnObject.loading) {
                workflowStore.initializeObjectTransitions(app, model);
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    const key = getAppModelDotName({ app, model });
                    if (Array.isArray(pks)) {
                        // TODO: back end needs to be able to handle mutiple pks
                        for (const pk of pks) {
                            await workflowStore.fetchObjectTransitions(app, model, pk);
                        }
                    } else {
                        origionalObjectTransitions.value = toRef(workflowStore.objectTransitions[key], pks);
                        await workflowStore.fetchObjectTransitions(app, model, pks);
                    }
                } catch (e) {
                    loadingError.setError(e);
                } finally {
                    loadingError.clearLoading();
                }
            }
        },
        { immediate: true },
    );

    watch(
        () => unref(unref(origionalObjectTransitions)),
        (theValue) => {
            if (!theValue) {
                returnObject.transitions = [];
            } else {
                if (!isEqual(theValue, returnObject.transitions)) {
                    assignReactiveObject(returnObject.transitions, cloneDeep(theValue));
                }
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(returnObject);
}
