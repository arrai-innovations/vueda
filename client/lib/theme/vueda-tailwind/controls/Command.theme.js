/**
 * @module theme/vueda-tailwind/controls/Command.theme
 *
 * Per-component theme registration for Command. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the Command slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Command palette surface (a search + categorised result list). Often
     * hosted inside a CommandDialog; can also render inline. Uses card radius
     * (4px), not control radius (2px), because Command is a shell surface,
     * not a slab control.
     */
    Command: {
        /** The outer Command surface (a search + categorised result list). 4px card radius rather than the 2px control radius the rest of the picker family wears, because Command is a shell surface, not a slab control. The flex-column layout stacks {@api theme-key:CommandInput.root}, {@api theme-key:CommandList.root}, and optional {@api theme-key:CommandFooter.root} into one chip, and `overflow-hidden` lets the inner list scroll without escaping the rounded corners. Used inline or hosted inside a {@api theme-key:CommandDialog.content}. */
        root: {
            class: [
                "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-vueda-card",
            ],
        },
    },
});
