/**
 * @module use/useModelConfig
 * @description Provides a reactive, view-aware model configuration by combining server model info with client-side config store data.
 */
import { useLoadingError, useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/case.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import { effectScope, reactive, readonly, ref, toRef, watch } from "vue";

/**
 * A view-specific configuration object for making use of a model client-side.
 *
 * @typedef {object} ViewSpecificModelConfig
 * @property {string[]} fields - field names to display
 * @property {string[]} expand - field names to expand
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
 * @property {import('vue').EffectScope} effectScope - The effect scope for the instance.
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
 * @example
 * ```vue
 * <script setup>
 * import { useModelConfig } from '@vueda/use/useModelConfig.js';
 *
 * const modelConfig = useModelConfig('myapp', 'Widget', 'list');
 * // modelConfig.loading, modelConfig.config, modelConfig.info are all reactive
 * </script>
 * <template>
 *   <div v-if="modelConfig.loading">Loading...</div>
 *   <div v-else>{{ modelConfig.config.verboseName }}</div>
 * </template>
 * ```
 */
export function useModelConfig(app, model, view) {
    if (!app || !model) {
        throw new Error("app and model must be provided");
    }
    const es = effectScope();
    return es.run(() => {
        const loadingError = useLoadingError();
        const isActive = useIsActive();
        const modelInfo = useModelInfo(app, model, isActive);
        // Resolve the stores here, while the composable still runs inside its component's setup.
        // Pinia's active instance is a module global that every `app.use(pinia)` overwrites, so a
        // store resolved later, from a callback with no current component to inject from, would come
        // from whichever app booted last. The docs site puts several isolated apps on one page.
        const modelConfigStore = storeModelConfig();
        const userStore = storeUser();
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
            config: ref({
                // populate the expected shape to make deeper references work earlier
                verboseName: "",
                verboseNamePlural: "",
                displayFields: [],
                fetchFields: [],
                submitFields: [],
                expand: [],
                routeActions: [],
                actions: [],
                filterables: [],
                sortables: [],
                sorted: [],
                fieldDetails: {},
                expandDetails: {},
                actionDetails: {},
                filterableDetails: {},
                formProps: {},
                allowColumnHiding: false,
                showTotalRecordNum: true,
                fieldComponents: {},
                fieldProps: {},
                widgetComponents: {},
                widgetProps: {},
                actionRedirects: {},
            }),
            effectScope: es,
        });

        watch(
            [
                isActive,
                toRef(returnObject, "app"),
                toRef(returnObject, "model"),
                toRef(returnObject, "view"),
                // the store drops its built configs when the authenticated user changes, so rebuild
                () => userStore.identityGeneration,
            ],
            ([active, app, model, view]) => {
                if (!active) {
                    return; // we'll pick up again when the component is active
                }
                // we don't need to check if app and model have changed, vue does that checking for us
                //  on immutable primitive values
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
                            if (e instanceof AuthScopeInvalidatedError) {
                                // the authenticated user changed mid-build; the identity watch rebuilds
                                return;
                            }
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
    });
}
