/**
 * @module theme/vueda-tailwind/controls/Textarea.theme
 *
 * Per-component theme registration for Textarea. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the Textarea slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Multi-line text input. Shares the input-shell treatment with Input but
     * expands vertically via `field-sizing: content`.
     */
    Textarea: {
        /** The multi-line counterpart to {@api theme-key:Input.root}. Same hairline + focus + `aria-invalid` recipe; grows vertically via `field-sizing: content` so the field expands with the typed text rather than holding a fixed `min-height`. Horizontal padding moves to `px-3 py-2` (both axes) because a textarea's content box is two-dimensional. */
        root: {
            class: [
                "placeholder:text-muted-foreground dark:bg-input/30 hairline flex field-sizing-content min-h-16 w-full rounded-vueda-control bg-transparent px-3 py-2 text-base shadow-vueda-control transition-shadow disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:hairline-ring focus-visible:focus-ring-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },
});
