/**
 * @module use/usePrinting
 * @description Returns a readonly boolean ref that is true when the browser is in print mode, updated via the print media query.
 */
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
