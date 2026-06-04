/**
 * @module theme/vueda-tailwind/shell/FieldMessage.theme
 *
 * Per-component theme registration for FieldMessage. Imported as a side effect by
 * FieldMessage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldMessage slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldMessage styles validation or warning feedback attached to a field.
     */
    FieldMessage: {
        /**
         * The validation or warning message attached to a field. It maps error severity to destructive text and all other severities to warning text.
         */
        root: ({ severity }) => ({
            class: [
                "text-[length:var(--vueda-text-supporting)] leading-[1.4] font-medium",
                severity === "error" ? "text-destructive" : "text-warning",
            ],
        }),
        /**
         * The list wrapper for multiple field messages. It keeps grouped validation details compact and indented under the field message block.
         */
        list: {
            class: "ml-4 flex list-disc flex-col gap-1",
        },
    },
});
