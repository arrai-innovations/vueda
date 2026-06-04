/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuSubTrigger.theme
 *
 * Per-component theme registration for DropdownMenuSubTrigger. Imported as a side effect by
 * DropdownMenuSubTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the DropdownMenuSubTrigger slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuSubTrigger styles a dropdown menu item that opens a nested submenu.
     */
    DropdownMenuSubTrigger: {
        /** Menu row that opens a child surface. Open and focused states share the same neutral accent fill. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground",
        },
        /** Trailing chevron wrapper that reserves submenu affordance space at the row edge. */
        iconWrapper: { class: "ml-auto size-4" },
    },
});
