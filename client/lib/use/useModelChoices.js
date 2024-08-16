import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelChoices } from "@vueda/stores/storeModelChoices.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, ref, toRef, unref, watch } from "vue";

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
 * @returns {UseModelChoices} An object containing reactive fields and actions for model choices.
 */
export function useModelChoices(app, model, field, isActive) {
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    const modelChoicesStore = storeModelChoices();
    /** @type {import('vue').Ref<null|import('vue').Ref<object>>} */
    const originalChoices = ref(null);
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
        [isActive, app, model, field],
        async ([active, app, model, field], [oldActive, oldApp, oldModel, oldField]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            if (oldActive === active && app === oldApp && model === oldModel && field === oldField) {
                return; // no change, no need to update
            }
            // todo: we could look at implementing cancelling of fetches if the app/model/field changes while loading
            if (app && model && field && !returnObject.loading) {
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    originalChoices.value = toRef(modelChoicesStore.choices, getAppModelDotName({ app, model }));
                    // await modelChoicesStore.fetchChoices(app, model, field);
                } catch (e) {
                    loadingError.setError(e);
                } finally {
                    loadingError.clearLoading();
                }
            }
        },
        { immediate: true },
    );

    // update returnObject.choices when originalChoices changes
    watch(
        () => unref(unref(originalChoices)),
        (theValue) => {
            if (!theValue) {
                returnObject.choices = {};
            } else {
                if (!isEqual(theValue, returnObject.choices)) {
                    assignReactiveObject(returnObject.choices, cloneDeep(theValue));
                }
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(returnObject);
}
