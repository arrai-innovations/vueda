import { onActivated, onDeactivated, onMounted, readonly, ref } from "vue";

/**
 * This composable provides a reactive boolean that is true when the component is active.
 *
 * @return {import('vue').Readonly<import('vue').Ref<boolean>>} A ref pointing to a boolean indicating whether the
 *  component is active.
 */
export default function useIsActive() {
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
