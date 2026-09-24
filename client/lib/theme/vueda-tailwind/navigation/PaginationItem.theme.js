/**
 * @module theme/vueda-tailwind/navigation/PaginationItem.theme
 *
 * Per-component theme registration for PaginationItem. Imported as a side effect by
 * PaginationItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import "@vueda/theme/vueda-tailwind/controls/_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationItem styles a numbered pagination control and its active state.
     */
    PaginationItem: {
        /** Numbered page control. Composes the Button base and switches between outline active and ghost inactive variants, with Button size tiers (defaulting to an icon square). The active item keeps a foreground-colored edge at rest so the current page stands apart from the lighter navigation buttons. */
        root: ({ isActive, size }) => ({
            composes: ["_ButtonBase.root", isActive ? "_ButtonOutline.root" : "_ButtonGhost.root"],
            class: [
                {
                    "h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm": size === "default",
                    "h-vueda-control-sm gap-1.5 px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg has-[>svg]:px-vueda-control-px": size === "lg",
                    "size-vueda-control": !size || size === "icon",
                    "size-vueda-control-sm": size === "icon-sm",
                    "size-vueda-control-lg": size === "icon-lg",
                },
                isActive && "!hairline-foreground",
            ],
        }),
    },
});
