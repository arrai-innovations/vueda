/**
 * @module use/useForwardPropsEmits
 * @description A fixed wrapper around reka-ui's useForwardPropsEmits that correctly handles
 * both the array form and the object form of defineEmits. reka-ui's built-in useEmitAsProps
 * reads vm.type.emits and calls forEach on it, which fails when defineEmits is called with
 * the object validator form (e.g. { 'update:open': null }) because that produces an object,
 * not an array. This module handles both forms.
 */
import { useForwardProps } from "reka-ui";
import { camelize, computed, getCurrentInstance, toHandlerKey } from "vue";

/**
 * @param {Function} emit
 * @returns {{ [key: string]: Function }}
 */
function useEmitAsProps(emit) {
    const vm = getCurrentInstance();
    const emitsDefinition = vm?.type.emits;
    const events = Array.isArray(emitsDefinition)
        ? emitsDefinition
        : emitsDefinition
          ? Object.keys(emitsDefinition)
          : [];

    if (!events.length) {
        console.warn(`No emitted event found. Please check component: ${vm?.type.__name}`);
    }

    const result = {};
    events.forEach((ev) => {
        result[toHandlerKey(camelize(ev))] = (...args) => emit(ev, ...args);
    });
    return result;
}

/**
 * Combines forwarded props with emit handlers. Drop-in replacement for reka-ui's
 * useForwardPropsEmits that supports both the array form and the object validator form
 * of defineEmits.
 *
 * @param {import('vue').MaybeRefOrGetter<Record<string, any>>} props
 * @param {Function} [emit]
 * @returns {import('vue').ComputedRef<Record<string, any>>}
 */
export function useForwardPropsEmits(props, emit) {
    const parsedProps = useForwardProps(props);
    const emitsAsProps = emit ? useEmitAsProps(emit) : {};

    return computed(() => ({
        ...parsedProps.value,
        ...emitsAsProps,
    }));
}
