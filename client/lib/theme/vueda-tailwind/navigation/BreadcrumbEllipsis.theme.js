/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbEllipsis.theme
 *
 * Per-component theme registration for BreadcrumbEllipsis. Imported as a side effect by
 * BreadcrumbEllipsis.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbEllipsis represents collapsed breadcrumb steps and can become interactive when needed.
     */
    BreadcrumbEllipsis: {
        /** Collapsed-step marker. The `interactive` state turns it into the dropdown trigger shape. */
        root: ({ interactive }) => ({
            class: [
                "flex size-7 items-center justify-center",
                interactive &&
                    "cursor-pointer rounded-vueda-control transition-colors hover:bg-accent hover:text-foreground active:bg-accent-active focus-visible:focus-ring",
            ],
        }),
        /** Screen-reader text for the collapsed-step marker. */
        label: { class: "sr-only" },
    },
});
