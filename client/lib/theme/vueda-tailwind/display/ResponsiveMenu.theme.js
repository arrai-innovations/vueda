/**
 * @module theme/vueda-tailwind/display/ResponsiveMenu.theme
 *
 * Per-component theme registration for ResponsiveMenu. Imported as a side effect
 * by ResponsiveMenu.vue, so a route chunk that pulls only that SFC drags only
 * this component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ResponsiveMenu is the shared toolbar-menu shell: a trigger that opens its
     * slotted body as a popover on desktop or a full-screen dialog on mobile. Only
     * the mobile dialog needs chrome; the desktop popover surface is themed by the
     * popover primitive.
     */
    ResponsiveMenu: {
        /** Full-screen mobile dialog surface with a fixed header row and a bounded body row. */
        dialog: {
            class: ["grid-rows-[auto_minmax(0,1fr)] overflow-hidden"],
        },
        /** Visible mobile dialog header; right padding leaves room for the built-in close control. */
        dialogHeader: {
            class: ["border-b px-4 py-4 pr-12"],
        },
        /** Padded scrolling region below the fixed mobile dialog header. */
        dialogBody: {
            class: ["min-h-0 overflow-y-auto overscroll-contain p-4"],
        },
    },
});
