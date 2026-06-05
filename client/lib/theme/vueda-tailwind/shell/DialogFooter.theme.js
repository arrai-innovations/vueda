/**
 * @module theme/vueda-tailwind/shell/DialogFooter.theme
 *
 * Per-component theme registration for DialogFooter. Imported as a side effect by
 * DialogFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogFooter arranges dialog actions with responsive stacking.
     */
    DialogFooter: {
        /**
         * The action row for dialog footers. It stacks in reverse order on narrow screens and aligns trailing actions on wider screens.
         */
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
});
