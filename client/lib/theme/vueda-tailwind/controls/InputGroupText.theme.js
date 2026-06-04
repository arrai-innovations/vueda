/**
 * @module theme/vueda-tailwind/controls/InputGroupText.theme
 *
 * Per-component theme registration for InputGroupText. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the InputGroupText slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Inline text addon (helper text, prefix / suffix label) inside an
     * InputGroup.
     */
    InputGroupText: {
        /** The inline-text addon inside an {@api theme-key:InputGroup.root}: helper labels, prefix / suffix copy, unit markers. Renders at sm size on `--muted-foreground` with 16px icons so the addon reads as chrome rather than as input content. */
        root: {
            class: [
                "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
