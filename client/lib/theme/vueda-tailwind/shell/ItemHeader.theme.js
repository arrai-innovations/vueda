/**
 * @module theme/vueda-tailwind/shell/ItemHeader.theme
 *
 * Per-component theme registration for ItemHeader. Imported as a side effect by
 * ItemHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemHeader styles low-emphasis header metadata inside an item.
     */
    ItemHeader: {
        /**
         * The low-emphasis metadata row above item content. It mirrors {@api theme-key:ItemFooter.root} for compact mono metadata before the title.
         */
        root: {
            class: "flex basis-full items-center justify-between gap-2 font-mono text-[length:var(--vueda-text-supporting)] text-muted-foreground",
        },
    },
});
