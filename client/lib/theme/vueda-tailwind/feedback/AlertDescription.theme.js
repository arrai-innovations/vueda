/**
 * @module theme/vueda-tailwind/feedback/AlertDescription.theme
 *
 * Per-component theme registration for AlertDescription. Imported as a side effect by
 * AlertDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
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
            class: [
                "text-muted-foreground",
                "col-start-2 grid justify-items-start gap-1",
                "text-sm [&_p]:leading-relaxed",
            ],
        },
    },
});
