/**
 * @module theme/vueda-tailwind/controls/NumberFieldContent.theme
 *
 * Per-component theme registration for NumberFieldContent. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the NumberFieldContent slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Inner wrapper around NumberFieldInput; reserves horizontal space for
     * the increment / decrement slots when they are present.
     */
    NumberFieldContent: {
        /** The inner wrapper that hosts {@api theme-key:NumberFieldInput.root} plus the optional stepper buttons. Reserves horizontal pad on the input (`pl-5` / `pr-5`) only when {@api theme-key:NumberFieldDecrement} / {@api theme-key:NumberFieldIncrement} are actually rendered, so a stepperless number field keeps the standard control padding and a stepper-bearing one never crashes a digit string into the glyphs. `relative` is the anchor for the absolute-positioned steppers. */
        root: {
            class: [
                "relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5",
            ],
        },
    },
});
