/**
 * @module theme/vueda-tailwind/shell/FieldLabel.theme
 *
 * Per-component theme registration for FieldLabel. Imported as a side effect by
 * FieldLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldLabel slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldLabel styles the label text and optional control-card wrapper for a field.
     */
    FieldLabel: {
        /**
         * The label text or label-card wrapper for a field. It handles disabled opacity, nested control-card framing, and checked-state tint for label-wrapped choices.
         */
        root: {
            class: [
                "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
                "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
                "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
            ],
        },
    },
});
