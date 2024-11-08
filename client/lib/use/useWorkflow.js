import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isArray from "lodash-es/isArray.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * The raw instance of a useWorkflow object.
 *
 * @typedef {object} useWorkflowRaw
 * @property {boolean} loading - True if the model choices are loading.
 * @property {Error} error - The error that occurred while loading the model choices.
 * @property {boolean} errored - True if an error occurred while loading the model choices.
 * @property {()=>void} clearError - Clear the error.
 * @property {object} objectTransitions - The list of object transitions.
 */

/**
 * The reactive useModelChoices instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<useWorkflowRaw>>} useWorkflow
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
 * @param {import('vue').Ref<boolean>} intendToFetch - A ref containing the indicator whether the model workflows should be fetched.
 * @returns {useWorkflow} An object containing objectTransitions.
 */
export function useWorkflow(app, model, pks, isActive, intendToFetch) {
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
            objectTransitions: {},
        },
    );

    // update origionalObjectTransitions when app, model, pks, or isActive changes
    watch(
        [isActive, app, model, pks, intendToFetch],
        async ([active, app, model, pks, intendToFetch], [oldActive, oldApp, oldModel, oldPks, oldIntendToFetch]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            if (
                oldActive === active &&
                app === oldApp &&
                model === oldModel &&
                pks === oldPks &&
                intendToFetch === oldIntendToFetch
            ) {
                return; // no change, no need to update
            }
            if (app && model && pks && !returnObject.loading && intendToFetch) {
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    origionalObjectTransitions.value = toRef(workflowStore.objectTransitions[app], model);
                    if (isArray(pks)) {
                        // TODO: back end needs to be able to handle mutiple pks
                        for (const pk of pks) {
                            await workflowStore.fetchObjectTransitions(app, model, pk);
                        }
                    } else {
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
                returnObject.objectTransitions = {};
            } else {
                if (!isEqual(theValue, returnObject.objectTransitions)) {
                    assignReactiveObject(returnObject.objectTransitions, cloneDeep(theValue));
                }
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(returnObject);
}
