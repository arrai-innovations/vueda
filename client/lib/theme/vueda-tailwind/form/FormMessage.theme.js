/**
 * @module theme/vueda-tailwind/form/FormMessage.theme
 *
 * Per-component theme registration for FormMessage. Imported as a side effect by
 * FormMessage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Form-level message block for non-field errors or warnings. Wraps the
     * alert body and optional list used when several messages are present.
     */
    FormMessage: {
        /** Outer spacing for form-scope feedback. */
        root: {
            class: ["my-2"],
        },
        /** Disc list used when a form-level message expands into multiple entries. */
        list: {
            class: ["list-disc list-inside"],
        },
    },
});
