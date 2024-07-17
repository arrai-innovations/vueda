import { onUnmounted, readonly, ref } from "vue";

export function usePrinting() {
    const mediaQueryList = window.matchMedia("print");
    const printing = ref(mediaQueryList.matches);
    const onPrintChange = (e) => {
        printing.value = e.matches;
    };
    mediaQueryList.addEventListener("change", onPrintChange);
    onUnmounted(() => {
        mediaQueryList.removeEventListener("change", onPrintChange);
    });
    return readonly(printing);
}
