import { onActivated, onDeactivated, onMounted, ref, toRef } from "vue";

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
    // readonly ref
    return toRef(() => isActive);
}
