/**
 * @module theme/vueda-tailwind/navigation/SidebarGroupLabel.theme
 *
 * Per-component theme registration for SidebarGroupLabel. Imported as a side effect by
 * SidebarGroupLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarGroupLabel styles the heading text for a sidebar group.
     */
    SidebarGroupLabel: {
        /** Sidebar group heading using the page-level eyebrow recipe. */
        root: {
            class: [
                // Layout and color.
                "text-muted-foreground flex h-6 shrink-0 items-center px-2",

                // Type.
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.08em]",

                // Motion and focus.
                "transition-[margin,opacity] duration-200 ease-linear focus-visible:focus-ring focus-visible:focus-ring-sidebar",

                // Icons and child elements.
                "[&>svg]:size-4 [&>svg]:shrink-0",

                // Collapsed state.
                "group-data-[collapsible=icon]:-mt-6 group-data-[collapsible=icon]:opacity-0",
            ],
        },
    },
});
