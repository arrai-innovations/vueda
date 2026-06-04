/**
 * @module theme/vueda-tailwind/controls/SelectLabel.theme
 *
 * Per-component theme registration for SelectLabel. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the SelectLabel slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Section heading inside SelectContent (caps, mono micro). Same eyebrow
     * recipe as ComboboxGroup.heading.
     */
    SelectLabel: {
        /** The section heading inside a {@api theme-key:SelectContent.root}. See also: {@api theme-key:ComboboxGroup.heading}; same caps-micro eyebrow on `--muted-foreground` (the rendered class list drops the leading `font-mono`, but Tailwind's default sans / mono cascade leaves the eyebrow visually identical at the micro size). */
        root: {
            class: [
                "text-muted-foreground px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em]",
            ],
        },
    },
});
