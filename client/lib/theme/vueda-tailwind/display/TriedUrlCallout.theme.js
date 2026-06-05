/**
 * @module theme/vueda-tailwind/display/TriedUrlCallout.theme
 *
 * Per-component theme registration for TriedUrlCallout. Imported as a side effect by
 * TriedUrlCallout.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * TriedUrlCallout renders the attempted URL as a compact system callout. It separates the label, value, and faded non-error path segments so the bad segment can stand out.
     */
    TriedUrlCallout: {
        /** Two-column callout wrapper for the attempted URL. */
        root: {
            class: [
                "grid grid-cols-[88px_1fr] items-center gap-x-2",
                "rounded-vueda-card border border-border",
                "px-3 py-2",
                "overflow-hidden",
            ],
        },
        /** Uppercase label column for the attempted URL. */
        label: {
            class: [
                "text-[10px] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none shrink-0",
            ],
        },
        /** Mono value column for URL segments; individual spans own their signal color. */
        value: {
            class: ["font-mono text-[12.5px] font-normal leading-none min-w-0 truncate"],
        },
        /** Muted treatment for non-error URL segments so the bad segment remains the signal. */
        fade: {
            class: ["text-muted-foreground"],
        },
    },
});
