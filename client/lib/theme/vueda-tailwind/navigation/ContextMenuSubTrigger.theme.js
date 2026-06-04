/**
 * @module theme/vueda-tailwind/navigation/ContextMenuSubTrigger.theme
 *
 * Per-component theme registration for ContextMenuSubTrigger. Imported as a side effect by
 * ContextMenuSubTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the ContextMenuSubTrigger slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuSubTrigger styles a context menu item that opens a nested submenu.
     */
    ContextMenuSubTrigger: {
        /** Context-menu row that opens a child surface. See also: {@api theme-key:DropdownMenuSubTrigger.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Trailing chevron wrapper for submenu affordance space. */
        iconWrapper: { class: "ml-auto" },
    },
});
