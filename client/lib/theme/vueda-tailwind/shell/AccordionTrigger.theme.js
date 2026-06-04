/**
 * @module theme/vueda-tailwind/shell/AccordionTrigger.theme
 *
 * Per-component theme registration for AccordionTrigger. Imported as a side effect by
 * AccordionTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AccordionTrigger slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AccordionTrigger styles the interactive header that opens and closes accordion content.
     */
    AccordionTrigger: {
        /**
         * The clickable accordion header. It uses the container typography rhythm, exposes a focus outline, and rotates direct SVG icons when the item is open.
         */
        root: {
            class: "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-body font-medium transition-all hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
        },
        /**
         * The text wrapper inside the trigger. It stays minimal so custom trigger content can define its own stacking or inline layout.
         */
        header: {
            class: "flex",
        },
        /**
         * The disclosure icon beside the trigger text. It is optically nudged down to align with the first text line and uses muted color until inherited state changes it.
         */
        icon: {
            class: "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200",
        },
    },
});
