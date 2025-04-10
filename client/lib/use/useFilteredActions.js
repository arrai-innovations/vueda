import { useProxyLoadingError } from "@arrai-innovations/reactive-helpers";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import isObject from "lodash-es/isObject.js";
import { computed, effectScope, reactive, toRef, watch } from "vue";

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
 * @typedef {import('vue').UnwrapNestedRefs<FilteredActionsRawState | import('@arrai-innovations/reactive-helpers').LoadingErrorStatus>} FilteredActionsState
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
    const es = effectScope();
    const isActive = useIsActive();

    let localModelConfigInstance = null;
    let localUserStore = null;
    let localProxyLoadingError = null;

    /** @type {FilteredActionsInternalState} */
    const internalState = reactive({
        actions: [],
        groups: [],
    });
    /** @type {FilteredActionsState} */
    const returnObject = reactive({
        app: "",
        model: "",
        view: null,
        loading: undefined,
        error: null,
        errored: false,
        clearError: () => {},
        info: {},
        config: {},
        actions: [],
    });

    watch(isActive, (active) => {
        if (active) {
            if (!localModelConfigInstance) {
                localModelConfigInstance = modelConfigInstance || useModelConfig(app, model, view);
                returnObject.app = toRef(localModelConfigInstance, "app");
                returnObject.model = toRef(localModelConfigInstance, "model");
                returnObject.view = toRef(localModelConfigInstance, "view");
                returnObject.info = toRef(localModelConfigInstance, "info");
                returnObject.config = toRef(localModelConfigInstance, "config");
                internalState.actions = toRef(localModelConfigInstance.config, "actions");
            }

            if (!localUserStore) {
                localUserStore = storeUser();
                // Use a computed instead of toRef because `loggedInUser` may be null initially,
                //  and we want reactivity to respond to replacing it, not just its properties.
                es.run(() => {
                    internalState.groups = computed(() => localUserStore.loggedInUser?.groups || []);
                });
            }
            if (localModelConfigInstance && localUserStore && !localProxyLoadingError) {
                localProxyLoadingError = useProxyLoadingError([localUserStore, localModelConfigInstance]);
                returnObject.loading = localProxyLoadingError.loading;
                returnObject.error = localProxyLoadingError.error;
                returnObject.errored = localProxyLoadingError.errored;
                returnObject.clearError = localProxyLoadingError.clearError;
            }
        }
    });

    // watch for our view's actions to change as the model config changes
    watch(
        [() => internalState.actions, () => internalState.groups || []],
        ([actions, groups]) => {
            if (Array.isArray(actions)) {
                // if actions are already a flat list, use directly
                returnObject.actions = actions;
            } else if (isObject(actions)) {
                // get action code by keys, filtering based on requiring at least one of the specified groups in the value
                returnObject.actions = Object.keys(actions).filter((action) => {
                    const allowedGroups = actions[action];
                    return (
                        allowedGroups === true ||
                        (Array.isArray(allowedGroups) && allowedGroups.some((group) => groups.includes(group)))
                    );
                });
            } else {
                returnObject.actions = [];
            }
        },
        { deep: true },
    );

    return returnObject;
}
