/**
 * @module theme/vueda-tailwind/display/ErrorDisplay.theme
 *
 * Per-component theme registration for ErrorDisplay. Imported as a side effect by
 * ErrorDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ErrorDisplay renders error text and optional diagnostic code in a scroll-safe block. It keeps links and code content readable in narrow layouts.
     */
    ErrorDisplay: {
        /** Full-width error block wrapper for message, code, and links. */
        root: {
            class: "w-full",
        },
        /** Scroll-safe column container for long diagnostic text. */
        container: {
            class: "max-w-full overflow-x-auto p-1 2xs:p-2 2xl:p-4 flex flex-col gap-2",
        },
        /** Primary error message area; inherits typography from the surrounding surface. */
        message: {
            class: [],
        },
        /** Code block surface for stack traces or machine diagnostics. */
        codeBlock: {
            class: "bg-neutral-100 dark:bg-neutral-800 p-1 2xs:p-2 2xl:p-4 rounded", // Styling for the code block
        },
        /** Underlined recovery or detail link inside the error message. */
        link: {
            class: "underline",
        },
    },
});
