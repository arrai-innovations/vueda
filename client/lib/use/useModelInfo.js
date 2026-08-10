/**
 * @module use/useModelInfo
 * @description Provides a reactive, deep-referenced model info object that updates when the app or model changes without breaking existing reactive references.
 */
import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { reactive, readonly, ref, toRef, watch } from "vue";

/**
 * The raw instance of a useModelInfo object.
 *
 * @typedef {object} UseModelInfoRaw
 * @property {import('vue').Ref<import('@vueda/stores/storeModelInfo.js').ModelInfo>} info - The model info.
 */

/**
 * The reactive useModelInfo instance.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<
 *     UseModelInfoRaw & import('@arrai-innovations/reactive-helpers').LoadingErrorStatus
 * >>} UseModelInfo
 */

/**
 * Provides a reactive object for a given app and model. This composition function is designed to preserve deep references
 * within the `info` object, preventing them from breaking when the app or model changes. If `info` were simply a ref,
 * deep references would not update automatically with changes to the app or model.
 *
 * This function deeply mirrors (watches and clones) the model information, which assumes that the model info has low churn.
 * Frequent updates could have performance implications due to the deep cloning process.
 *
 * @param {import('vue').Ref<string>|string} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>|string} model - A ref containing the model name that is being watched.
 * @param {import('@vueda/use/useIsActive.js').IsActive|undefined} [isActive] - An IsActive instance, if one can be
 *  reused.
 * @returns {UseModelInfo} An object containing reactive fields and actions for model info.
 */
export function useModelInfo(app, model, isActive) {
    const loadingError = useLoadingError();
    if (!isActive) {
        isActive = useIsActive();
    }
    let modelInfoStore = null;
    const internalState = reactive({
        app,
        model,
        lastFetchKey: null,
    });
    const returnObject = reactive(
        /** @type {UseModelInfoRaw} */ {
            loading: loadingError.loading,
            error: loadingError.error,
            errored: loadingError.errored,
            clearError: loadingError.clearError,
            info: ref({
                // populate the expected shape to make deeper references work earlier
                appLabel: "",
                model: "",
                verboseName: "",
                verboseNamePlural: "",
                pk: null,
                fields: {},
                actions: [],
                expand: [],
                ordering: { default: [], fields: [] },
                filtering: {},
                permissions: [],
            }),
        },
    );

    // update originalInfo when app, model, or isActive changes
    watch(
        [isActive, toRef(internalState, "app"), toRef(internalState, "model")],
        ([newActive, app, model]) => {
            if (!newActive) {
                return; // we'll pick up again when the component is active
            }
            if (!app || !model) {
                returnObject.info = {};
                return;
            }
            if (!modelInfoStore) {
                modelInfoStore = storeModelInfo();
            }
            // we don't need to check if app and model have changed, vue does that checking for us
            //  on immutable primitive values
            // todo: we could look at implementing cancelling of fetches if the app/model changes while loading
            if (app && model && !returnObject.loading) {
                loadingError.clearError();
                loadingError.setLoading();
                const args = { app, model };
                modelInfoStore
                    .fetchModelInfo(args)
                    .then(() => {
                        // WARNING: by assigning after awaiting, we KNOW the key is there, so there is no
                        //  reactivity issues not working when the key is not there initially
                        returnObject.info = toRef(modelInfoStore.infos, getAppModelDotName(args));
                    })
                    .catch((e) => {
                        loadingError.setError(e);
                    })
                    .finally(() => {
                        loadingError.clearLoading();
                    });
            }
        },
        { immediate: true },
    );
    return readonly(returnObject);
}
