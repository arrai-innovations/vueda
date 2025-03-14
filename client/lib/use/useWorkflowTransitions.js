import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { getUsingVuedaWorkFlow, storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, ref, toRef, unref, watch } from "vue";

const usingVuedaWorkFlow = getUsingVuedaWorkFlow();

/**
 * The raw instance of a useWorkflowTransitions object.
 *
 * @typedef {object} useWorkflowTransitionsRaw
 * @property {boolean} loading - True if the model choices are loading.
 * @property {Error} error - The error that occurred while loading the model choices.
 * @property {boolean} errored - True if an error occurred while loading the model choices.
 * @property {()=>void} clearError - Clear the error.
 * @property {array} transitions - The list of workflow transitions.
 */

/**
 * The reactive useModelChoices instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<useWorkflowTransitionsRaw>>} useWorkflowTransitions
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
 * @returns {useWorkflowTransitions} An object containing transitions.
 */
export function useWorkflowTransitions(app, model, isActive) {
    if (!usingVuedaWorkFlow) {
        return {
            loading: ref(false),
            error: ref(null),
            errored: ref(false),
            clearError: () => {},
            transitions: ref([]),
        };
    }
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    const workflowStore = storeWorkflow();
    const origionalWorkflowTransitions = ref(null);
    const returnObject = reactive(
        /** @type {useWorkflowRaw} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            transitions: [],
        },
    );

    watch(
        [isActive, app, model],
        async ([active, app, model], [oldActive, oldApp, oldModel]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            if (oldActive === active && app === oldApp && model === oldModel) {
                return; // no change, no need to update
            }
            if (app && model && !returnObject.loading) {
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    const key = getAppModelDotName({ app, model });
                    origionalWorkflowTransitions.value = toRef(workflowStore.workflowTransitions, key);
                    await workflowStore.fetchWorkflowTransition(app, model);
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
        () => unref(unref(origionalWorkflowTransitions)),
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
