import { onActivated, onDeactivated, onMounted, readonly, ref } from "vue";

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
