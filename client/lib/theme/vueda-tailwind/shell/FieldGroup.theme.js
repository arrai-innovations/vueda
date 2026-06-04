/**
 * @module theme/vueda-tailwind/shell/FieldGroup.theme
 *
 * Per-component theme registration for FieldGroup. Imported as a side effect by
 * FieldGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldGroup slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldGroup stacks related fields and nested field groups.
     */
    FieldGroup: {
        /**
         * The stack for related fields and nested field groups. It establishes the field-group container query used by responsive fields and tightens spacing for checkbox and radio groups.
         */
        root: {
            class: "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        },
    },
});
