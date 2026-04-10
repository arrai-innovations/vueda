/**
 * @module grid/table/grid-utils
 * @description Utility functions for VUEDA grid table components, including TanStack Table integration helpers.
 */
import { isFunction } from "@tanstack/vue-table";

/**
 * Applies an updater function or value directly to a Vue ref.
 *
 * @param {import('@tanstack/vue-table').Updater<T>} updaterOrValue - A new value or a function that receives the current value and returns the next value.
 * @param {import('vue').Ref<T>} ref - The Vue ref to update.
 * @returns {void}
 * @template T
 */
export function valueUpdater(updaterOrValue, ref) {
    ref.value = isFunction(updaterOrValue) ? updaterOrValue(ref.value) : updaterOrValue;
}
