/**
 * @module use/useIsActive
 * @description Returns a readonly boolean ref that tracks whether the current component is mounted and active (not deactivated by keep-alive).
 */
import { onActivated, onDeactivated, onMounted, readonly, ref } from "vue";

/**
 * A readonly ref that is `true` when the component is mounted and active.
 *
 * @typedef {import('vue').DeepReadonly<import('vue').Ref<boolean>>} IsActive
 */

/**
 * This composable provides a reactive boolean that is true when the component is active.
 *
 * @returns {IsActive} A readonly ref indicating whether the component is currently active.
 */
export function useIsActive() {
    const isActive = ref(false);
    onMounted(() => {
        isActive.value = true;
    });
    onActivated(() => {
        isActive.value = true;
    });
    onDeactivated(() => {
        isActive.value = false;
    });
    return readonly(isActive);
}
