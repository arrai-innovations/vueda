import { useLoadingError, useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { useIsActive } from "@vueda/use/useIsActive";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/case.js";
import { reactive, readonly, toRef, watch } from "vue";

/**
 * A view-specific configuration object for making use of a model client-side.
 *
 * @typedef {object} ViewSpecificModelConfig
 * @property {string[]} fields - field names to display
 * @property {string[]} expands - field names to expand
 * @property {string[]|undefined} filterables - filters to display in list view
 * @property {string[]|undefined} sortables - field names that can be sorted in list view
 * @property {string[]|undefined} sorted - the default sort order for list view
 * @property {string[]|null} actions - allow list of actions to display, otherwise all actions are displayed
 * @property {{[propName: string]: any}|undefined} formProps - extra props to pass the form model
 * @property {{[fieldPath: string]: {[propName: string]: any}}|undefined} fieldProps - extra props to pass a field component in a form model
 * @property {{[fieldPath: string]: {[propName: string]: any}}|undefined} widgetProps - extra props to pass a widget component in a form model
 */

/**
 * The raw state for a model config.
 *
 * @typedef {object} ModelConfigRawState
 * @property {import('vue').Ref<string>|string} app - The app name being used.
 * @property {import('vue').Ref<string>|string} model - The model name being used.
 * @property {import('vue').Ref<string>|string|null} view - The view being used, if any.
 * @property {boolean} loading - True if the model config is loading.
 * @property {Error} error - The error that occurred while loading the model config.
 * @property {boolean} errored - True if an error occurred while loading the model config.
 * @property {()=>void} clearError - Clear the error.
 * @property {import('@vueda/stores/storeModelInfo.js').ModelInfo} info - The model info.
 * @property {import('@vueda/stores/storeModelConfig.js').ModelConfig} config - The model config.
 */

/**
 * The state for a model config.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<ModelConfigRawState>>} ModelConfigState
 */

/**
 * Provides a reactive configuration for a given app and model.
 * Uses configuration from storeModelConfig if available, otherwise falls back to model info from storeModelInfo.
 *
 * @param {import('vue').Ref<string>|string} app - The app name
 * @param {import('vue').Ref<string>|string} model - The model name
 * @param {import('vue').Ref<string>|string} [view] - What you are doing with the model
 * @returns {ModelConfigState} An object containing reactive fields and actions for create, update, read, and list views.
 */
export function useModelConfig(app, model, view) {
    if (!app || !model) {
        throw new Error("app and model must be provided");
    }
    const loadingError = useLoadingError();
    const isActive = useIsActive();
    const modelInfo = useModelInfo(app, model, isActive);
    let modelConfigStore = null;
    const proxyLoadingError = useProxyLoadingError([loadingError, modelInfo]);
    const returnObject = reactive({
        app,
        model,
        view: view || null,
        loading: proxyLoadingError.loading,
        error: proxyLoadingError.error,
        errored: proxyLoadingError.errored,
        clearError: proxyLoadingError.clearError,
        info: toRef(modelInfo, "info"),
        config: {},
    });

    watch(
        [isActive, toRef(returnObject, "app"), toRef(returnObject, "model"), toRef(returnObject, "view")],
        ([active, app, model, view]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            // we don't need to check if app and model have changed, vue does that checking for us
            //  on immutable primitive values
            if (!modelConfigStore) {
                modelConfigStore = storeModelConfig();
            }
            // todo: we could look at implementing cancelling of fetches if the app/model changes while loading
            if (app && model) {
                loadingError.clearError();
                loadingError.setLoading();
                const actionName = getActionName(view);
                const args = { app, model, view: actionName };
                const key = actionName ? getAppModelViewDotName(args) : getAppModelDotName(args);
                modelConfigStore
                    .getConfig(args)
                    .then(() => {
                        // WARNING: by assigning after awaiting, we KNOW the key is there, so there is no
                        //  reactivity issues not working when the key is not there initially
                        returnObject.config = toRef(modelConfigStore.builtConfigs, key);
                    })
                    .catch((e) => {
                        loadingError.setError(e);
                        console.error("useModelConfig: error fetching config", e);
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
