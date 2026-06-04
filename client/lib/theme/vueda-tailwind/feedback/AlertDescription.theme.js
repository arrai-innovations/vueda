/**
 * @module theme/vueda-tailwind/feedback/AlertDescription.theme
 *
 * Per-component theme registration for AlertDescription. Imported as a side effect by
 * AlertDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDescription slice of
 * feedback/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDescription renders supporting alert copy. It aligns with the alert title and keeps nested paragraph text readable.
     */
    AlertDescription: {
        /**
         * The supporting message copy beneath the alert title. It inherits variant-specific description tint from {@api theme-key:Alert.root} while keeping nested paragraphs readable for short remediation text.
         */
        root: {
            class: "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        },
    },
});
