/**
 * @module theme/vueda-tailwind/navigation
 * @description Tailwind CSS theme configuration for VUEDA Client navigation primitives.
 */
import { BUTTON_BASE, BUTTON_VARIANT_GHOST, BUTTON_VARIANT_OUTLINE } from "@vueda/theme/vueda-tailwind/_shared.js";

export default {
    NavigationPaginationItem: {
        root: ({ isActive }) => ({
            class: [
                ...BUTTON_BASE,
                {
                    [BUTTON_VARIANT_OUTLINE]: isActive,
                    [BUTTON_VARIANT_GHOST]: !isActive,
                },
            ],
        }),
    },
    NavigationPaginationNavButton: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_GHOST, "gap-1 px-2.5 sm:pr-2.5"],
        },
    },
};
