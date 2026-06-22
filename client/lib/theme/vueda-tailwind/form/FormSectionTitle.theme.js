/**
 * @module theme/vueda-tailwind/form/FormSectionTitle.theme
 *
 * Per-component theme registration for FormSectionTitle. Imported as a side effect by
 * FormSectionTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Eyebrow heading used inside a `FormSection` title slot. Applies the
     * compact uppercase treatment shared by form section labels.
     */
    FormSectionTitle: {
        /** Eyebrow heading text for a form section. */
        root: {
            class: [
                "m-0",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none",
                "text-muted-foreground",
            ],
        },
    },
});
