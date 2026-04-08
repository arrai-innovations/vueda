/**
 * @module theme/vueda-tailwind/shell
 * @description Tailwind CSS theme configuration for VUEDA Client shell primitives.
 */
import { BUTTON_BASE, BUTTON_VARIANT_DEFAULT, BUTTON_VARIANT_OUTLINE } from "@vueda/theme/vueda-tailwind/_shared.js";

export default {
    ShellAlertDialogAction: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_DEFAULT],
        },
    },
    ShellAlertDialogCancel: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_OUTLINE, "mt-2 sm:mt-0"],
        },
    },
};
