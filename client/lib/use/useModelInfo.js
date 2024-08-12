import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * The raw instance of a useModelInfo object.
 *
 * @typedef {object} UseModelInfoRaw
 * @property {boolean} loading - True if the model config is loading.
 * @property {Error} error - The error that occurred while loading the model info.
 * @property {boolean} errored - True if an error occurred while loading the model info.
 * @property {()=>void} clearError - Clear the error.
 * @property {import('@vueda/stores/storeModelInfo.js').ModelInfo} info - The model info.
 */

/**
 * The reactive useModelInfo instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseModelInfoRaw>>} UseModelInfo
 */

/**
 * Provides a reactive object for a given app and model. This composition function is designed to preserve deep references
 * within the `info` object, preventing them from breaking when the app or model changes. If `info` were simply a ref,
 * deep references would not update automatically with changes to the app or model.
 *
 * This function deeply mirrors (watches and clones) the model information, which assumes that the model info has low churn.
 * Frequent updates could have performance implications due to the deep cloning process.
 *
 * @param {import('vue').Ref<string>} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>} model - A ref containing the model name that is being watched.
 * @param {import('@vueda/use/useIsActive.js').IsActive|undefined} [isActive] - An IsActive instance, if one can be
 *  reused.
 * @returns {UseModelInfo} An object containing reactive fields and actions for model info.
 */
export function useModelInfo(app, model, isActive) {
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    const modelInfoStore = storeModelInfo();
    /** @tupe {import('vue').Ref<null|import('vue').Ref<object>>}>} */
    const originalInfo = ref(null);
    const returnObject = reactive(
        /** @type {UseModelInfoRaw} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            info: {},
        },
    );

    // update originalInfo when app, model, or isActive changes
    watch(
        [isActive, app, model],
        async ([newActive, newApp, newModel], [oldActive, oldApp, oldModel]) => {
            if (!newActive) {
                return; // we'll pick up again when the component is active
            }
            if (oldActive === newActive && newApp === oldApp && newModel === oldModel) {
                return; // no change, no need to update
            }
            // todo: we could look at implementing cancelling of fetches if the app/model changes while loading
            if (newApp && newModel && !returnObject.loading) {
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    originalInfo.value = toRef(
                        modelInfoStore.modelInfos,
                        getAppModelDotName({
                            app: newApp,
                            model: newModel,
                        }),
                    );
                    await modelInfoStore.fetchModelInfo(newApp, newModel);
                } catch (e) {
                    loadingError.setError(e);
                } finally {
                    loadingError.clearLoading();
                }
            }
        },
        { immediate: true },
    );

    // update returnObject.info when originalInfo changes
    watch(
        // ref of ref to object we want to watch deeply
        () => unref(unref(originalInfo)),
        (theValue) => {
            if (!theValue) {
                returnObject.info = {};
            } else {
                if (!isEqual(theValue, returnObject.info)) {
                    assignReactiveObject(returnObject.info, cloneDeep(theValue));
                }
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(returnObject);
}
