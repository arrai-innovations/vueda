/**
 * @module theme/vueda-tailwind/controls/CommandGroup.theme
 *
 * Per-component theme registration for CommandGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CommandGroup slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Section of related items inside CommandList, with a heading row.
     */
    CommandGroup: {
        /** A section of related {@api theme-key:CommandItem.root} rows inside {@api theme-key:CommandList.root}. See also: {@api theme-key:ComboboxGroup.root}; identical recipe. */
        root: {
            class: ["text-foreground overflow-hidden p-1"],
        },
        /** The optional heading row above a group's items. See also: {@api theme-key:ComboboxGroup.heading}; identical caps-mono-micro eyebrow on `--muted-foreground`. The class-order difference (no leading `font-mono`) is incidental: the rendered recipe matches because `font-mono` is restated later in the list. */
        heading: {
            class: "px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
        },
    },
});
