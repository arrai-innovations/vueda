import { assignReactiveObject, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { storeModelInfo } from "@vueda/stores/storeModelInfo";
import { useIsActive } from "@vueda/use/useIsActive";
import { reactive, watch } from "vue";

/**
 * The raw state for a model config.
 *
 * @typedef {object} ModelConfigRawState
 * @property {boolean} loading - True if the model config is loading.
 * @property {Error} error - The error that occurred while loading the model config.
 * @property {boolean} errored - True if an error occurred while loading the model config.
 * @property {Function} clearError - Clear the error.
 * @property {import('@vueda/stores/storeModelInfo.js').ModelInfo} info - The model info.
 * @property {import('@vueda/stores/storeModelConfig.js').ModelConfig} config - The model config.
 */

/**
 * The state for a model config.
 *
 * @typedef {import('vue').shallowReactive<ModelConfigRawState>} ModelConfigState
 */

/**
 * Provides a reactive configuration for a given app and model.
 * Uses configuration from storeModelConfig if available, otherwise falls back to model info from storeModelInfo.
 *
 * @param {import('vue').Ref<string>} app - The app name
 * @param {import('vue').Ref<string>} model - The model name
 * @returns {ModelConfigState} An object containing reactive fields and actions for create, update, read, and list views.
 */
export function useModelConfig(app, model) {
    const loadingError = useLoadingError();
    const modelInfoStore = storeModelInfo();
    const modelConfigStore = storeModelConfig();
    const isActive = useIsActive();
    const returnObject = reactive({
        loading: loadingError.loading,
        error: loadingError.error,
        errored: loadingError.errored,
        clearError: loadingError.clearError,
        info: {},
        config: {},
    });

    // Watch for changes in isActive, app, model to update modelInfo and modelConfig
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
                    const modelInfo = await modelInfoStore.fetchModelInfo(app, model);
                    const modelConfig = await modelConfigStore.getConfig(app, model);
                    assignReactiveObject(returnObject.info, modelInfo);
                    assignReactiveObject(returnObject.config, modelConfig);
                } catch (e) {
                    loadingError.setError(e);
                } finally {
                    loadingError.clearLoading();
                }
            }
        },
        { immediate: true },
    );

    return returnObject;
}
