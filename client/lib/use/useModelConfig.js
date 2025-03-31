import { assignReactiveObject, useLoadingError, useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { useIsActive } from "@vueda/use/useIsActive";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/crudSupport.js";
import isEqual from "lodash-es/isEqual.js";
import { isRef, reactive, readonly, ref, toRef, unref, watch } from "vue";

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
    // makes the watch work for view in cases of hardcoded or falsy values
    // work with hardcoded view values
    if (!view) {
        view = ref(null);
    } else {
        if (!isRef(view)) {
            view = ref(view);
        }
    }
    if (!isRef(app)) {
        app = ref(app);
    }
    if (!isRef(model)) {
        model = ref(model);
    }
    const loadingError = useLoadingError();
    const isActive = useIsActive();
    const modelInfo = useModelInfo(app, model, isActive);
    const modelConfigStore = storeModelConfig();
    const proxyLoadingError = useProxyLoadingError([loadingError, modelInfo]);
    /** @type {import('vue').Ref<null|import('vue').Ref<object>>} */
    const originalConfig = ref(null);
    let previousKey;
    const returnObject = reactive({
        app,
        model,
        view,
        loading: proxyLoadingError.loading,
        error: proxyLoadingError.error,
        errored: proxyLoadingError.errored,
        clearError: proxyLoadingError.clearError,
        info: toRef(modelInfo, "info"),
        config: {},
    });

    // update returnObject.config when originalConfig changes
    watch(
        [() => unref(unref(originalConfig)), view],
        ([theValue]) => {
            if (!theValue) {
                assignReactiveObject(returnObject.config, {});
            } else {
                if (!isEqual(theValue, returnObject.config)) {
                    assignReactiveObject(returnObject.config, theValue);
                }
            }
        },
        { deep: true },
    );

    // update originalConfig when app, model, or isActive changes
    watch(
        [isActive, app, model, view],
        async ([newIsActive, newApp, newModel, newView], [oldActive, oldApp, oldModel, oldView]) => {
            if (!newIsActive) {
                return; // we'll pick up again when the component is active
            }
            if (oldActive === newIsActive && newApp === oldApp && newModel === oldModel && newView === oldView) {
                return; // no change, no need to update
            }
            // todo: we could look at implementing cancelling of fetches if the app/model changes while loading
            if (newApp && newModel) {
                loadingError.clearError();
                loadingError.setLoading();
                const actionName = getActionName(newView);
                try {
                    const args = { app: newApp, model: newModel, view: actionName };
                    const key = actionName ? getAppModelViewDotName(args) : getAppModelDotName(args);
                    if (previousKey !== key) {
                        originalConfig.value = toRef(modelConfigStore.builtConfigs, key);
                        previousKey = key;
                    }
                    await modelConfigStore.getConfig(args);
                } catch (e) {
                    loadingError.setError(e);
                    console.error("useModelConfig: error fetching config", e);
                } finally {
                    loadingError.clearLoading();
                }
            }
        },
        { immediate: true },
    );

    return readonly(returnObject);
}
