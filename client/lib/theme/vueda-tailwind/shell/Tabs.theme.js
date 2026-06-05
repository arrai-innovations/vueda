/**
 * @module theme/vueda-tailwind/shell/Tabs.theme
 *
 * Per-component theme registration for Tabs. Imported as a side effect by
 * Tabs.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Tabs styles the root layout for tabbed content.
     */
    Tabs: {
        /**
         * The root stack for tabbed content. It keeps the tab list and active panel separated by a compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-2",
        },
    },
});
