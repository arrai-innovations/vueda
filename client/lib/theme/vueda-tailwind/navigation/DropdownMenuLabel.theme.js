/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuLabel.theme
 *
 * Per-component theme registration for DropdownMenuLabel. Imported as a side effect by
 * DropdownMenuLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the DropdownMenuLabel slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuLabel styles a non-interactive label for a group of dropdown menu items.
     */
    DropdownMenuLabel: {
        /** Non-interactive group label using the mono micro uppercase recipe. */
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
});
