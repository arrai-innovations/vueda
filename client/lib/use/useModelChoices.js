import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelChoices } from "@vueda/stores/storeModelChoices.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { reactive, readonly, toRef, watch } from "vue";

/**
 * The raw instance of a useModelChoices object.
 *
 * @typedef {object} UseModelChoicesRaw
 * @property {boolean} loading - True if the model choices are loading.
 * @property {Error} error - The error that occurred while loading the model choices.
 * @property {boolean} errored - True if an error occurred while loading the model choices.
 * @property {()=>void} clearError - Clear the error.
 * @property {object} choices - The choices for the model field.
 */

/**
 * The reactive useModelChoices instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseModelChoicesRaw>>} UseModelChoices
 */

/**
 * Provides a reactive object for a given app, model, and field. This composition function is designed to preserve deep references
 * within the `choices` object, preventing them from breaking when the app, model, or field changes.
 *
 * This function deeply mirrors (watches and clones) the model choices, which assumes that the choices data has low churn.
 * Frequent updates could have performance implications due to the deep cloning process.
 *
 * @param {import('vue').Ref<string>} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>} model - A ref containing the model name that is being watched.
 * @param {import('vue').Ref<string>} field - A ref containing the field name that is being watched.
 * @param {import('@vueda/use/useIsActive.js').IsActive|undefined} [isActive] - An IsActive instance, if one can be reused.
 * @param {import('vue').Ref<boolean>} intendToFetch - A ref containing the indicator whether the model choices should be fetched.
 * @param {import('vue').Ref<boolean>} isFilter - A ref containing the indicator whether we are fetching filter choices.
 * @returns {UseModelChoices} An object containing reactive fields and actions for model choices.
 */
export function useModelChoices(app, model, field, isActive, intendToFetch, isFilter = false) {
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    let modelChoicesStore = null;
    const internalState = reactive({
        app,
        model,
        field,
        intendToFetch,
        isFilter,
    });
    const returnObject = reactive(
        /** @type {UseModelChoicesRaw} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            choices: {},
        },
    );

    // update originalChoices when app, model, field, or isActive changes
    watch(
        [
            isActive,
            toRef(internalState, "app"),
            toRef(internalState, "model"),
            toRef(internalState, "field"),
            toRef(internalState, "intendToFetch"),
            toRef(internalState, "isFilter"),
        ],
        async ([active, app, model, field, intendToFetch, isFilter]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            // we don't need to check if active, app, model, field, intendToFetch, or isFilter have changed, vue
            //  does that checking for us because they are refs to immutable primitive values
            if (!modelChoicesStore) {
                modelChoicesStore = storeModelChoices();
                modelChoicesStore.initializeChoice(app.value, model.value, isFilter.value);
            }
            // todo: we could look at implementing cancelling of fetches if the app/model/field changes while loading
            if (app && model && field && !returnObject.loading && intendToFetch) {
                const key = getAppModelDotName({ app, model });
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    if (isFilter) {
                        await modelChoicesStore.fetchFilterChoices(app, model, field);
                        // WARNING: by assigning after awaiting, we KNOW the key is there, so there is no
                        //  reactivity issues not working when the key is not there initially
                        returnObject.choices = toRef(modelChoicesStore.filterChoices, key);
                    } else {
                        await modelChoicesStore.fetchChoices(app, model, field);
                        // WARNING: by assigning after awaiting, we KNOW the key is there, so there is no
                        //  reactivity issues not working when the key is not there initially
                        returnObject.choices = toRef(modelChoicesStore.choices, key);
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

    return readonly(returnObject);
}
