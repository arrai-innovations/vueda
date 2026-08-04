/**
 * @module theme/vueda-tailwind/controls/NumberField.theme
 *
 * Per-component theme registration for NumberField. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Numeric input with optional increment / decrement steppers. The stepper
     * slots can be hidden, allowing a plain numeric Input.
     */
    NumberField: {
        /** The outer grid wrapper for a numeric input with optional increment / decrement steppers. Pure layout (`grid gap-1.5`) so a label, the input, and any messaging stack at the standard form rhythm. The visible input chrome lives on {@api theme-key:NumberFieldInput.root}; the absolute-positioned steppers are anchored by {@api theme-key:NumberFieldContent.root}. */
        root: {
            class: ["grid gap-1.5"],
        },
    },
});
