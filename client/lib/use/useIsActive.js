import { onActivated, onDeactivated, onMounted, ref, toRef } from "vue";

export function useIsActive() {
    let isActive = ref(false);
    onMounted(() => {
        isActive.value = true;
    });
    onActivated(() => {
        isActive.value = true;
    });
    onDeactivated(() => {
        isActive.value = false;
    });
    // readonly ref
    return toRef(() => isActive);
}
