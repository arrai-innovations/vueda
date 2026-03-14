/**
 * @module use/usePrinting
 * @description Returns a readonly boolean ref that is true when the browser is in print mode, updated via the print media query.
 */
import { onUnmounted, readonly, ref } from "vue";

/**
 * @typedef {import('vue').DeepReadonly<import('vue').Ref<boolean>>} PrintingState
 */

/**
 * Returns a readonly ref that is `true` when the browser is rendering for print.
 *
 * @returns {PrintingState} A readonly ref tracking the print media query state.
 */
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
