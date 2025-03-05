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
 * @param {Function} hookFn - A function returning a boolean, suitable for use in a computed value.
 * @returns {string} A unique registration ID.
 */
/**
 * Registers a hook for a given group name.
 *
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: Function}>} registryFns - The registry of hook functions.
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: string}>} registryGroups - The registry of group names.
 * @param {Function} scheduleUpdate - A function to schedule an update of the computed values.
 * @param {string} group - The key linking like hooks.
 * @param {Function} hookFn - A function returning a boolean, suitable for use in a computed value.
 * @returns {string} A unique registration ID.
 */
const registerHook = (registryFns, registryGroups, scheduleUpdate, group, hookFn) => {
    const id = getFakePk(registryFns);
    registryFns[id] = hookFn;
    registryGroups[id] = group;
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
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: Function}>} registryFns - The registry of hook functions.
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: string}>} registryGroups - The registry of group names.
 * @param {Function} scheduleUpdate - A function to schedule an update of the computed values.
 * @param {string} registryId - The ID returned at registration.
 * @returns {boolean} True if successfully unregistered.
 */
const unregisterHook = (registryFns, registryGroups, scheduleUpdate, registryId) => {
    if (registryFns[registryId]) {
        delete registryFns[registryId];
        delete registryGroups[registryId];
        scheduleUpdate();
        return true;
    }
    return false;
};

/**
 * Updates the computed aggregates based on the current registry.
 *
 * @private
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: Function}>} registryFns - The registry of hook functions.
 * @param {import('vue').UnwrapNestedRefs<{[key: string]: string}>} registryGroups - The registry of group names.
 * @param {ComputedAggregates} computedAggregates - The computed aggregate values.
 * @param {{[key: string]: import('vue').EffectScope}} effectScopes - The effect scopes for each group.
 * @param {import('vue').EffectScope} mainEffectScope - The main effect scope, that contains the other effect scopes.
 */
const updateAggregates = (registryFns, registryGroups, computedAggregates, effectScopes, mainEffectScope) => {
    const { addedKeys: addedGroups, removedKeys: removedGroups } = keyDiff(
        Object.values(registryGroups),
        Object.keys(computedAggregates),
    );

    mainEffectScope.run(() => {
        for (const group of addedGroups) {
            const scope = effectScope();
            scope.run(() => {
                computedAggregates[group] = computed(() => {
                    const registryPathEntries = Object.entries(registryGroups).filter(([, path]) => path === group);
                    const ids = registryPathEntries.map(([id]) => id);
                    const hooks = ids.map((id) => registryFns[id]);
                    let returnValue = hooks.map((fn) => {
                        try {
                            return fn();
                        } catch (err) {
                            console.error("HookFn throw in group", group, registryFns, ids, hooks, fn, err);
                            return false;
                        }
                    });
                    returnValue = returnValue.some(identity);
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
 * @typedef {import('vue').UnwrapNestedRefs<{[key: string]: import('vue').ComputedRef<boolean>}>} ComputedAggregates
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
 * @returns {ReactiveHookRegistry} The reactive hook registry.
 */
export function useReactiveHookRegistry() {
    const registryFns = reactive({});
    const registryGroups = reactive({});
    /** @type {ComputedAggregates} */
    const computedAggregates = reactive({});
    const effectScopes = {};
    const mainEffectScope = effectScope();
    let pendingUpdate = false;

    const scheduleUpdate = () => {
        if (!pendingUpdate) {
            pendingUpdate = true;
            nextTick(() => {
                pendingUpdate = false;
                updateAggregates(registryFns, registryGroups, computedAggregates, effectScopes, mainEffectScope);
            });
        }
    };

    return {
        computedAggregates,
        registerHook: registerHook.bind(null, registryFns, registryGroups, scheduleUpdate),
        unregisterHook: unregisterHook.bind(null, registryFns, registryGroups, scheduleUpdate),
        stop: mainEffectScope.stop,
    };
}
