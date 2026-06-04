/**
 * @module theme/vueda-tailwind/shell/AccordionContent.theme
 *
 * Per-component theme registration for AccordionContent. Imported as a side effect by
 * AccordionContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AccordionContent slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AccordionContent styles the collapsible region revealed by an accordion trigger.
     */
    AccordionContent: {
        /**
         * The animated collapsible content region. It owns the open and closed height animations and applies body text sizing while leaving padding to {@api theme-key:AccordionContent.inner}.
         */
        root: {
            class: "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-body",
        },
        /**
         * The inner content inset for an accordion panel. It adds only bottom padding so content aligns with the trigger start while leaving the item divider visible.
         */
        inner: {
            class: "pt-0 pb-4",
        },
    },
});
