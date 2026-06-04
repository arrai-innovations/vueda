/**
 * @module theme/vueda-tailwind/navigation/MenubarTrigger.theme
 *
 * Per-component theme registration for MenubarTrigger. Imported as a side effect by
 * MenubarTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the MenubarTrigger slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarTrigger styles a top-level menubar item that opens menu content.
     */
    MenubarTrigger: {
        /** Top-level menubar trigger. Uses compact rounded corners and neutral accent open/focus states. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none",
        },
    },
});
