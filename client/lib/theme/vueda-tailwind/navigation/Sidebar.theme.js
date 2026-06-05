/**
 * @module theme/vueda-tailwind/navigation/Sidebar.theme
 *
 * Per-component theme registration for Sidebar. Imported as a side effect by
 * Sidebar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Sidebar styles the primary collapsible navigation region and its responsive panel structure.
     */
    Sidebar: {
        /** Uncollapsed sidebar body for the `none` collapsible mode. */
        rootNone: {
            class: "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
        },
        /** Layout spacer that preserves desktop content offset while the fixed panel transitions. */
        spacer: ({ variant }) => ({
            class: [
                "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
                "group-data-[collapsible=offcanvas]:w-0",
                "group-data-[side=right]:rotate-180",
                {
                    "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]":
                        variant === "floating" || variant === "inset",
                    "group-data-[collapsible=icon]:w-(--sidebar-width-icon)":
                        variant !== "floating" && variant !== "inset",
                },
            ],
        }),
        /** Fixed desktop panel. Width and offcanvas transitions are driven by SidebarProvider CSS variables. */
        panel: ({ side, variant }) => ({
            class: [
                "fixed inset-y-0 z-40 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
                {
                    "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]": side === "left",
                    "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]":
                        side === "right",
                },
                {
                    "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]":
                        variant === "floating" || variant === "inset",
                    "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l":
                        variant !== "floating" && variant !== "inset",
                },
            ],
        }),
    },
});
