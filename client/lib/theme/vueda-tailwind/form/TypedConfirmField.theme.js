/**
 * @module theme/vueda-tailwind/form/TypedConfirmField.theme
 *
 * Per-component theme registration for TypedConfirmField. Imported as a side effect by
 * TypedConfirmField.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Anti-mistake confirmation field used before destructive actions. Styles
     * the muted confirmation box, inline expected-value chip, and mono input.
     */
    TypedConfirmField: {
        /** Muted confirmation box that groups the label and input before a destructive action. */
        root: {
            class: [
                "flex flex-col gap-1.5 px-3.5 py-3 rounded-vueda-card border",
                "bg-[color-mix(in_oklab,var(--muted)_40%,var(--background))]",
            ],
        },
        /** Instruction label for the expected typed confirmation value. */
        label: {
            class: ["text-[12px] font-medium leading-tight text-foreground"],
        },
        /** Inline mono chip that echoes the exact expected value. */
        expectedChip: {
            class: [
                "inline-flex items-center px-1.5 py-0.5 mx-0.5",
                "rounded-[3px] border bg-background",
                "font-mono text-[12px] font-semibold leading-none text-foreground",
            ],
        },
        /** Mono input for the typed confirmation value, using the shared input focus-ring contract. */
        input: {
            class: [
                "h-8 px-2.5 w-full min-w-0",
                "rounded-vueda-control hairline bg-background",
                "font-mono text-[12.5px] font-medium leading-none text-foreground",
                "placeholder:text-muted-foreground placeholder:font-normal",
                "shadow-vueda-control transition-shadow",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow focus-visible:outline-none",
            ],
        },
    },
});
