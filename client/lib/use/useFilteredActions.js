import { useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import IsObject from "lodash-es/isObject.js";
import { computed, readonly, toRef } from "vue";

/**
 * @typedef {object} FilteredActionsInternalRawState
 * @property {string[]|import('vue').Ref<string[]>} actions - The actions that the user can perform.
 * @property {string[]|import('vue').ComputedRef<string[]>} groups - The groups that the user belongs to.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FilteredActionsInternalRawState>} FilteredActionsInternalState
 */

/**
 * The raw return object for useFilteredActions.
 *
 * @typedef {object} FilteredActionsRawState
 * @property {import('vue').Ref<string>|string} app - The app name being used.
 * @property {import('vue').Ref<string>|string} model - The model name being used.
 * @property {import('vue').Ref<string>|string|null} view - The view being used, if any.
 * @property {import('vue').Ref<import('@vueda/stores/storeModelInfo.js').ModelInfo>|object} info - The model info.
 * @property {import('vue').Ref<import('@vueda/stores/storeModelConfig.js').ModelConfig>|object} config - The model config.
 * @property {string[]} actions - The actions that the user can perform.
 */

/**
 * The return object for useFilteredActions.
 *
 * @typedef {import('vue').UnwrapNestedRefs<FilteredActionsRawState & import('@arrai-innovations/reactive-helpers').LoadingErrorStatus>} FilteredActionsState
 */

/**
 * The useFilteredActions return object.
 *
 * @typedef {import('vue').DeepReadonly<FilteredActionsState>} FilteredActionsInstance
 */

/**
 * The parameters for useFilteredActions.
 *
 * @typedef {object} UseFilteredActionsParams
 * @property {import('vue').Ref<string>|string} app - The app name, required if not using an existing model config
 *  instance
 * @property {import('vue').Ref<string>|string} model - The model name, required if not using an existing model config
 *  instance
 * @property {import('vue').Ref<string>|string|null} [view] - What you are doing with the model, if any
 * @property {import('@vueda/use/useModelConfig.js')|null} [modelConfigInstance] - An optional existing instance of the
 *  model config to use instead of creating a new one
 */

/**
 * Provides a reactive list of actions filtered based on the user's groups.
 *
 * @param {UseFilteredActionsParams} params - The parameters for the function
 * @returns {FilteredActionsInstance} An object containing reactive state for filtered actions and related metadata.
 */
export function useFilteredActions({ app, model, view = null, modelConfigInstance = null }) {
    const userStore = storeUser();
    const modelConfig = modelConfigInstance || useModelConfig(app, model, view);
    const proxyLoadingError = useProxyLoadingError([userStore, modelConfig]);

    const filteredActions = computed(() => {
        const actions = modelConfig.config.actions;
        const groups = userStore.loggedInUser?.groups || [];

        if (!actions) {
            return [];
        }
        if (Array.isArray(actions)) {
            return actions;
        }
        if (IsObject(actions)) {
            return Object.keys(actions).filter((actionName) => {
                const allowedGroups = actions[actionName];
                return (
                    allowedGroups === true ||
                    (Array.isArray(allowedGroups) && allowedGroups.some((group) => groups.includes(group)))
                );
            });
        }
        return [];
    });

    return readonly({
        app: toRef(modelConfig, "app"),
        model: toRef(modelConfig, "model"),
        view: toRef(modelConfig, "view"),
        loading: proxyLoadingError.loading,
        error: proxyLoadingError.error,
        errored: proxyLoadingError.errored,
        clearError: proxyLoadingError.clearError,
        info: toRef(modelConfig, "info"),
        config: toRef(modelConfig, "config"),
        actions: filteredActions,
    });
}
