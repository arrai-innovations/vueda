/**
 * @module theme/vueda-tailwind/form/FormSection.theme
 *
 * Per-component theme registration for FormSection. Imported as a side effect by
 * FormSection.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Lightweight grouping section for long forms. Styles the section root,
     * title row, and trailing aside metadata above a slotted body.
     */
    FormSection: {
        /** Section stack for a long-form group. */
        root: {
            class: "flex flex-col gap-3 [&+&]:mt-2",
        },
        /** Header row that pairs the title slot with optional aside metadata. */
        head: {
            class: "flex items-baseline justify-between gap-2 pb-1.5 border-b border-border",
        },
        /** Mono trailing metadata such as required or optional hints. */
        aside: {
            class: "font-mono text-[length:var(--vueda-text-micro)] leading-none text-muted-foreground",
        },
    },
});
