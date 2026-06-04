/**
 * @module theme/vueda-tailwind/shell/FieldSeparator.theme
 *
 * Per-component theme registration for FieldSeparator. Imported as a side effect by
 * FieldSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldSeparator slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldSeparator creates a labeled divider between field groups.
     */
    FieldSeparator: {
        /**
         * The positioned wrapper for a labelled field divider. It reserves the line height and variant-specific vertical offset used inside field groups.
         */
        root: {
            class: "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        },
        /**
         * The horizontal rule behind a field separator label. It fills the separator wrapper and aligns through the vertical center.
         */
        line: {
            class: "absolute inset-0 top-1/2",
        },
        /**
         * The label content laid over the separator line. It uses the page background as a mask so the text remains readable over the rule.
         */
        content: {
            class: "bg-background text-muted-foreground relative mx-auto block w-fit px-2",
        },
    },
});
