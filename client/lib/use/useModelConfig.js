import { assignReactiveObject, useLoadingError, useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { useIsActive } from "@vueda/use/useIsActive";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * A view-specific configuration object for making use of a model client-side.
 *
 * @typedef {object} ViewSpecificModelConfig
 * @property {string[]} fields - field names to display
 * @property {string[]} expands - field names to expand
 * @property {string[]|undefined} filterable - filters to display in list view
 * @property {string[]|undefined} sortable - field names that can be sorted in list view
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
 * @param {import('vue').Ref<string>} app - The app name
 * @param {import('vue').Ref<string>} model - The model name
 * @param {import('vue').Ref<string>} view - What you are doing with the model
 * @returns {ModelConfigState} An object containing reactive fields and actions for create, update, read, and list views.
 */
export function useModelConfig(app, model, view) {
    const loadingError = useLoadingError();
    const isActive = useIsActive();
    const modelInfo = useModelInfo(app, model, isActive);
    const modelConfigStore = storeModelConfig();
    const proxyLoadingError = useProxyLoadingError([loadingError, modelInfo]);
    /** @type {import('vue').Ref<null|import('vue').Ref<object>>} */
    const originalConfig = ref(null);
    const returnObject = reactive({
        loading: proxyLoadingError.loading,
        error: proxyLoadingError.error,
        errored: proxyLoadingError.errored,
        clearError: proxyLoadingError.clearError,
        info: toRef(modelInfo, "info"),
        config: {},
    });

    // update originalConfig when app, model, or isActive changes
    watch(
        [isActive, app, model],
        async ([active, app, model], [oldActive, oldApp, oldModel]) => {
            if (!active) {
                return; // we'll pick up again when the component is active
            }
            if (oldActive === active && app === oldApp && model === oldModel) {
                return; // no change, no need to update
            }
            // todo: we could look at implementing cancelling of fetches if the app/model changes while loading
            if (app && model && !returnObject.loading) {
                loadingError.clearError();
                loadingError.setLoading();
                try {
                    originalConfig.value = toRef(modelConfigStore.configs, getAppModelDotName(app, model));
                    await modelConfigStore.getConfig(app, model);
                } catch (e) {
                    loadingError.setError(e);
                } finally {
                    loadingError.clearLoading();
                }
            }
        },
        { immediate: true },
    );

    // update returnObject.config when originalConfig changes
    watch(
        [originalConfig, view],
        () => {
            const theRef = unref(originalConfig);
            const theValue = unref(theRef);
            if (!theRef || !theValue) {
                returnObject.config = {};
            } else {
                if (!isEqual(theValue, returnObject.config)) {
                    assignReactiveObject(returnObject.config, cloneDeep(theValue));
                }
            }
        },
        { immediate: true },
    );

    return readonly(returnObject);
}
