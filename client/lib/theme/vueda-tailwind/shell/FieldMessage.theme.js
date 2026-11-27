/**
 * @module theme/vueda-tailwind/shell/FieldMessage.theme
 *
 * Per-component theme registration for FieldMessage. Imported as a side effect by
 * FieldMessage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * FieldMessage styles validation or warning feedback attached to a field.
     */
    FieldMessage: {
        /**
         * The validation, warning, or information message attached to a field. It maps error severity to destructive
         * text, info severity to info text, and warning severity to warning text.
         */
        root: ({ severity }) => ({
            class: [
                "text-[length:var(--vueda-text-supporting)] leading-[1.4] font-medium",
                { error: "text-destructive", info: "text-info" }[severity] ?? "text-warning",
            ],
        }),
        /**
         * The list wrapper for multiple field messages. It keeps grouped validation details compact and indented under
         * the field message block.
         */
        list: {
            class: "ml-4 flex list-disc flex-col gap-1",
        },
    },
});
