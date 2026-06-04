/**
 * @module theme/vueda-tailwind/feedback/Skeleton.theme
 *
 * Per-component theme registration for Skeleton. Imported as a side effect by
 * Skeleton.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 *
 * Prototype-phase duplication: this entry mirrors the Skeleton slice of
 * feedback/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Skeleton renders a neutral loading placeholder. It uses a pulsing muted primary tint for inline and block loading states.
     */
    Skeleton: {
        /**
         * The loading placeholder block. The primary tint stays neutral enough for rows, cards, and inline placeholders.
         */
        root: {
            class: "animate-pulse rounded-md bg-primary/10",
        },
    },
});
