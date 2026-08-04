/**
 * @module theme/vueda-tailwind/shell/SheetFooter.theme
 *
 * Per-component theme registration for SheetFooter. Imported as a side effect by
 * SheetFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetFooter arranges trailing sheet actions.
     */
    SheetFooter: {
        /**
         * The trailing action area inside a sheet. It sits after the body content and stacks actions with the standard inset.
         */
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
});
