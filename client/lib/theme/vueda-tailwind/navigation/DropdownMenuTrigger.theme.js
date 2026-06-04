/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuTrigger.theme
 *
 * Per-component theme registration for DropdownMenuTrigger. Imported as a side effect by
 * DropdownMenuTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the DropdownMenuTrigger slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuTrigger provides the activation target for a dropdown menu.
     */
    DropdownMenuTrigger: {
        /** Unstyled trigger pass-through so callers can compose Button or custom trigger chrome. */
        root: { class: "" },
    },
});
