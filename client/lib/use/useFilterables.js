/**
 * @module use/useFilterables
 * @description Resolves a model's filterable field list and per-field details by merging a model config instance with caller-supplied overrides.
 */
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, unref, watch } from "vue";

/**
 * @typedef {object} UseFilterablesOverrides
 * @property {import('vue').Ref<string[]|undefined>|string[]|undefined} filterables - Field names to display; overrides the model config's declared list when set.
 * @property {import('vue').Ref<object|undefined>|object|undefined} filterableDetails - Per-field detail overrides merged with the model config's declared details.
 */

/**
 * @typedef {object} UseFilterablesRawState
 * @property {string[]} filterables - The filters to display, either passed in or from config.
 * @property {{[filterName:string]:import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - The merged filterableDetails, either passed in, from config or from server info.
 */

/**
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseFilterablesRawState>>} UseFilterablesState
 */

/**
 * Merges a model config's declared filterable field list and per-field details
 * with caller-supplied overrides (props take priority). Standalone so a caller
 * that only needs the resolved filterable field set — not field/widget component
 * resolution or the `FilterModelSymbol` provide that {@link useFilter} also
 * does — can reuse an existing {@link useModelConfig} instance instead of
 * creating a second one.
 *
 * @param {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - An existing model config instance.
 * @param {UseFilterablesOverrides} props - Overrides for the model config's declared filterables/details.
 * @param {import('vue').UnwrapNestedRefs<UseFilterablesRawState>} [state] - Target object to write `filterables`/`filterableDetails` into. Pass a caller-owned object (e.g. one already consumed by a downstream `deep` watch) to write in place, rather than bridging through a second wrapped object. Defaults to a fresh one.
 * @returns {UseFilterablesState} The merged, reactive filterable field list and details.
 */
export function useFilterables(
    modelConfig,
    props,
    state = reactive(/** @type {UseFilterablesRawState} */ ({ filterables: [], filterableDetails: {} })),
) {
    watch(
        [
            () => modelConfig.config?.filterables,
            () => modelConfig.config?.filterableDetails,
            () => unref(props.filterables),
            () => unref(props.filterableDetails),
        ],
        () => {
            if (!Object.keys(modelConfig.config?.filterableDetails || {}).length) {
                return;
            }
            const propFilterables = unref(props.filterables);
            const propFilterableDetails = unref(props.filterableDetails);
            const desired = propFilterables || modelConfig.config?.filterables || [];
            const desiredDetails = {};
            for (const d of desired) {
                if (modelConfig.config?.filterableDetails?.[d] || propFilterableDetails?.[d]) {
                    desiredDetails[d] = {
                        ...modelConfig.config?.filterableDetails?.[d],
                        ...propFilterableDetails?.[d],
                    };
                }
            }
            if (!isEqual(state.filterables, desired)) {
                state.filterables = desired;
            }
            if (!isEqual(state.filterableDetails, desiredDetails)) {
                assignReactiveObject(state.filterableDetails, desiredDetails);
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(state);
}
