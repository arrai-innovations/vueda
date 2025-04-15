import { getFakePk, keyDiff } from "@arrai-innovations/reactive-helpers";
import identity from "lodash-es/identity.js";
import { computed, effectScope, nextTick, reactive } from "vue";

/**
 * @module use/useReactiveHookRegistry.js - A composable function that allows you to register boolean hooks for specific
 * named groups, aggregating hooks for the same group into a single OR-computed value.
 */

/**
 * @callback BoundRegisterHook
 * @param {string} group - The key linking like hooks.
 * @param {() => boolean} hookFn - A function returning a boolean, suitable for use in a computed value.
 * @returns {string} A unique registration ID.
 */
/**
 * Registers a hook for a given group name.
 *
 * @param {{[group: string]: [id:string][]}} groupToIds - A map of group names to their corresponding IDs.
 * @param {{[key: string]: Function}} registryFns - The registry of hook functions.
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: string}>} registryGroups - The registry of group names.
 * @param {() => void} scheduleUpdate - A function to schedule an update of the computed values.
 * @param {string} group - The key linking like hooks.
 * @param {() => boolean} hookFn - A function returning a boolean, suitable for use in a computed value.
 * @returns {string} A unique registration ID.
 */
const registerHook = (groupToIds, registryFns, registryGroups, scheduleUpdate, group, hookFn) => {
    const id = getFakePk(registryFns);
    registryFns[id] = hookFn;
    registryGroups[id] = group;
    if (!groupToIds[group]) {
        groupToIds[group] = [];
    }
    groupToIds[group].push(id);
    scheduleUpdate();
    return id;
};

/**
 * @callback BoundUnregisterHook
 * @param {string} id - The registration ID.
 * @returns {boolean} True if successfully unregistered.
 */
/**
 * Unregisters a hook given its unique ID.
 *
 * @param {{[group: string]: [id:string][]}} groupToIds - A map of group names to their corresponding IDs.
 * @param {{[key: string]: Function}} registryFns - The registry of hook functions.
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: string}>} registryGroups - The registry of group names.
 * @param {() => void} scheduleUpdate - A function to schedule an update of the computed values.
 * @param {string} registryId - The ID returned at registration.
 * @returns {boolean} True if successfully unregistered.
 */
const unregisterHook = (groupToIds, registryFns, registryGroups, scheduleUpdate, registryId) => {
    if (registryFns[registryId]) {
        const group = registryGroups[registryId];
        groupToIds[group] = groupToIds[group]?.filter((gid) => gid !== registryId);
        if (groupToIds[group]?.length === 0) {
            delete groupToIds[group];
        }
        delete registryFns[registryId];
        delete registryGroups[registryId];
        scheduleUpdate();
        return true;
    }
    return false;
};

/**
 * @typedef {(values: any[], group: string) => any} AggregatorFn
 */

/**
 * Updates the computed aggregates based on the current registry.
 *
 * @private
 * @param {{[group: string]: [id:string][]}} groupToIds - A map of group names to their corresponding IDs.
 * @param {{[key: string]: Function}} registryFns - The registry of hook functions.
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: string}>} registryGroups - The registry of group names.
 * @param {ComputedAggregates} computedAggregates - The computed aggregate values.
 * @param {{[key: string]: import('vue').EffectScope}} effectScopes - The effect scopes for each group.
 * @param {import('vue').EffectScope} mainEffectScope - The main effect scope, that contains the other effect scopes.
 * @param {AggregatorFn} aggregatorFn - The function to aggregate the values of the hooks.
 */
const updateAggregates = (
    groupToIds,
    registryFns,
    registryGroups,
    computedAggregates,
    effectScopes,
    mainEffectScope,
    aggregatorFn,
) => {
    const { addedKeys: addedGroups, removedKeys: removedGroups } = keyDiff(
        Object.values(registryGroups),
        Object.keys(computedAggregates),
    );

    mainEffectScope.run(() => {
        for (const group of addedGroups) {
            const scope = effectScope();
            scope.run(() => {
                computedAggregates[group] = computed(() => {
                    const ids = groupToIds[group] || [];
                    const hooks = ids.map((id) => registryFns[id]);
                    let returnValue = hooks.map((fn) => {
                        try {
                            return fn();
                        } catch (err) {
                            console.error("HookFn throw in group", group, registryFns, ids, hooks, fn, err);
                            return false;
                        }
                    });
                    returnValue = aggregatorFn(returnValue, group);
                    return returnValue;
                });
            });
            effectScopes[group] = scope;
        }
    });

    // For removed field paths, stop their effect scopes and remove them (instead of waiting for unmount).
    for (const group of removedGroups) {
        if (effectScopes[group]) {
            effectScopes[group].stop();
            delete effectScopes[group];
        }
        delete computedAggregates[group];
    }
};

/**
 * @typedef {import('vue').Reactive<{[key: string]: import('vue').ComputedRef<boolean>}>} ComputedAggregates
 */

/**
 * @typedef {object} ReactiveHookRegistry
 * @property {BoundRegisterHook} registerHook - Registers a hook for a given field path.
 * @property {BoundUnregisterHook} unregisterHook - Unregisters a hook given its unique ID.
 * @property {ComputedAggregates} computedAggregates - A map of field paths to computed values indicating whether any of the hooks
 */

/**
 * useReactiveHookRegistry is a composable function that allows you to register hooks for specific field paths.
 *
 * It aggregates these hooks and provides a computed value for each field path, indicating whether any of the hooks
 *  return true.
 *
 * @param {AggregatorFn} aggregatorFn - A function that aggregates the values of the hooks.
 * @returns {ReactiveHookRegistry} The reactive hook registry.
 */
export function useReactiveHookRegistry(aggregatorFn) {
    if (!aggregatorFn) {
        aggregatorFn = (values) => values.some(identity);
    }
    const groupToIds = {};
    const registryFns = {};
    const registryGroups = reactive({});
    /** @type {ComputedAggregates} */
    const computedAggregates = reactive({});
    const effectScopes = {};
    const mainEffectScope = effectScope();
    let pendingUpdate = false;

    const scheduleUpdate = () => {
        if (!pendingUpdate) {
            pendingUpdate = true;
            // noinspection JSIgnoredPromiseFromCall
            nextTick(() => {
                pendingUpdate = false;
                updateAggregates(
                    groupToIds,
                    registryFns,
                    registryGroups,
                    computedAggregates,
                    effectScopes,
                    mainEffectScope,
                    aggregatorFn,
                );
            });
        }
    };

    return {
        computedAggregates,
        registerHook: registerHook.bind(null, groupToIds, registryFns, registryGroups, scheduleUpdate),
        unregisterHook: unregisterHook.bind(null, groupToIds, registryFns, registryGroups, scheduleUpdate),
        stop: mainEffectScope.stop,
    };
}
